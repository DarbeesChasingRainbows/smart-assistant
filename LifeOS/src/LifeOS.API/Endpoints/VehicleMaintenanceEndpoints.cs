using LifeOS.API.DTOs;
using LifeOS.Domain.Common;
using LifeOS.Domain.Garage;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;
using Microsoft.AspNetCore.Mvc;

namespace LifeOS.API.Endpoints;

public static class VehicleMaintenanceEndpoints
{
    public static void MapVehicleMaintenanceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/vehicles/{vehicleId:guid}/maintenance")
            .WithTags("VehicleMaintenance");

        group.MapGet("/", GetByVehicle)
            .WithName("GetVehicleMaintenance")
            .WithDescription("Get maintenance log entries for a vehicle (newest first)");

        group.MapPost("/", Create)
            .WithName("CreateVehicleMaintenance")
            .WithDescription("Create a maintenance log entry for a vehicle");

        group.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteVehicleMaintenance")
            .WithDescription("Delete a maintenance log entry");
    }

    private static async Task<IResult> GetByVehicle(Guid vehicleId, [FromServices] IVehicleMaintenanceRepository repository)
    {
        var vid = Id.createVehicleIdFrom(vehicleId);
        var records = await repository.GetByVehicleIdAsync(vid);
        return Results.Ok(records.Select(MapToDto));
    }

    private static async Task<IResult> Create(
        Guid vehicleId,
        CreateVehicleMaintenanceRequest request,
        [FromServices] IVehicleMaintenanceRepository repository,
        HttpContext httpContext)
    {
        var idempotencyKey = httpContext.Request.Headers["Idempotency-Key"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            return Results.BadRequest(new ApiErrorResponse { Error = "Idempotency-Key header is required" });

        if (string.IsNullOrWhiteSpace(request.Description))
            return Results.BadRequest(new ApiErrorResponse { Error = "Description is required" });

        var vid = Id.createVehicleIdFrom(vehicleId);
        var existing = await repository.GetByVehicleIdAndIdempotencyKeyAsync(vid, idempotencyKey);
        if (FSharpOption<VehicleMaintenanceRecord>.get_IsSome(existing))
            return Results.Ok(MapToDto(existing.Value!));

        var items = request.Items
            .Select(i => VehicleMaintenanceInterop.CreateMaintenanceItem(
                i.Type,
                i.Name,
                string.IsNullOrWhiteSpace(i.Url) ? FSharpOption<string>.None : FSharpOption<string>.Some(i.Url),
                i.Quantity.HasValue ? new decimal?(i.Quantity.Value) : default,
                string.IsNullOrWhiteSpace(i.Unit) ? FSharpOption<string>.None : FSharpOption<string>.Some(i.Unit)))
            .ToList();

        var record = VehicleMaintenanceInterop.CreateVehicleMaintenanceRecord(
            id: Guid.NewGuid(),
            vehicleId: vehicleId,
            date: request.Date,
            mileage: request.Mileage.HasValue ? new decimal?(request.Mileage.Value) : default,
            description: request.Description,
            cost: request.Cost.HasValue ? new decimal?(request.Cost.Value) : default,
            performedBy: string.IsNullOrWhiteSpace(request.PerformedBy)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(request.PerformedBy),
            items: ListModule.OfSeq(items));

        var created = await repository.AddAsync(record, idempotencyKey);
        return Results.Created($"/api/v1/vehicles/{vehicleId}/maintenance/{created.Id}", MapToDto(created));
    }

    private static async Task<IResult> Delete(Guid vehicleId, Guid id, [FromServices] IVehicleMaintenanceRepository repository)
    {
        var success = await repository.DeleteAsync(id);
        return success
            ? Results.NoContent()
            : Results.NotFound(new ApiErrorResponse { Error = "Maintenance record not found" });
    }

    private static VehicleMaintenanceDto MapToDto(VehicleMaintenanceRecord record)
    {
        return new VehicleMaintenanceDto
        {
            Id = record.Id,
            VehicleId = Id.vehicleIdValue(record.VehicleId),
            Date = record.Date,
            Mileage = FSharpOption<Mileage>.get_IsSome(record.Mileage) ? GarageInterop.GetMileageValue(record.Mileage.Value!) : null,
            Description = record.Description,
            Cost = FSharpOption<decimal>.get_IsSome(record.Cost) ? record.Cost.Value : (decimal?)null,
            PerformedBy = FSharpOption<string>.get_IsSome(record.PerformedBy) ? record.PerformedBy.Value! : null,
            Items = record.Items.Select(i => new MaintenanceItemDto
            {
                Type = i.ItemType,
                Name = i.Name,
                Url = FSharpOption<string>.get_IsSome(i.Url) ? i.Url.Value! : null,
                Quantity = FSharpOption<decimal>.get_IsSome(i.Quantity) ? i.Quantity.Value : (decimal?)null,
                Unit = FSharpOption<string>.get_IsSome(i.Unit) ? i.Unit.Value! : null
            })
        };
    }
}
