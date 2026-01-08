using LifeOS.API.DTOs;
using LifeOS.Domain.Common;
using LifeOS.Domain.Garage;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FSharp.Core;

namespace LifeOS.API.Endpoints;

public static class ComponentEndpoints
{
    public static void MapComponentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/components").WithTags("Components");

        group.MapGet("/", GetAll).WithName("GetAllComponents");

        group.MapGet("/{id:guid}", GetById).WithName("GetComponentById");

        group.MapGet("/vehicle/{vehicleId:guid}", GetByVehicle).WithName("GetComponentsByVehicle");

        group.MapPost("/", Create).WithName("CreateComponent");

        group.MapPost("/{id:guid}/install", Install).WithName("InstallComponent");

        group.MapPut("/{id:guid}", Update).WithName("UpdateComponent");

        group.MapDelete("/{id:guid}", Delete).WithName("DeleteComponent");

        group.MapPost("/{id:guid}/uninstall", Uninstall).WithName("UninstallComponent");
    }

    private static async Task<IResult> GetAll([FromServices] IComponentRepository repository)
    {
        var components = await repository.GetAllAsync();
        return Results.Ok(components.Select(MapToDto));
    }

    private static async Task<IResult> GetById(
        Guid id,
        [FromServices] IComponentRepository repository
    )
    {
        var componentId = Id.createComponentIdFrom(id);
        var componentOption = await repository.GetByIdAsync(componentId);

        if (FSharpOption<Component>.get_IsNone(componentOption))
            return Results.NotFound(new ApiErrorResponse { Error = "Component not found" });

        return Results.Ok(MapToDto(componentOption.Value));
    }

    private static async Task<IResult> GetByVehicle(
        Guid vehicleId,
        [FromServices] IComponentRepository repository
    )
    {
        var vid = Id.createVehicleIdFrom(vehicleId);
        var components = await repository.GetByVehicleIdAsync(vid);
        return Results.Ok(components.Select(MapToDto));
    }

    private static async Task<IResult> Create(
        CreateComponentRequest request,
        [FromServices] IComponentRepository repository
    )
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new ApiErrorResponse { Error = "Name is required" });

        var category = GarageInterop.CreateComponentCategory(request.Category);

        // Use new C#-friendly API - pass nulls and Nullable<T> directly
        var result = GarageInterop.CreateComponent(
            request.Name,
            request.PartNumber, // Pass null directly
            category,
            request.PurchaseDate, // Nullable<DateTime> works directly
            request.PurchaseCost, // Nullable<decimal> works directly
            request.WarrantyExpiry,
            request.Notes
        );

        if (result.IsFailure)
            return Results.BadRequest(new ApiErrorResponse { Error = result.ErrorMessage });

        var created = await repository.AddAsync(result.Value);
        return Results.Created(
            $"/api/v1/components/{Id.componentIdValue(created.Id)}",
            MapToDto(created)
        );
    }

    private static async Task<IResult> Install(
        Guid id,
        InstallComponentRequest request,
        [FromServices] IComponentRepository repository
    )
    {
        var componentId = Id.createComponentIdFrom(id);
        var componentOption = await repository.GetByIdAsync(componentId);

        if (FSharpOption<Component>.get_IsNone(componentOption))
            return Results.NotFound(new ApiErrorResponse { Error = "Component not found" });

        var component = componentOption.Value!;
        var vid = Id.createVehicleIdFrom(request.VehicleId);
        var result = GarageInterop.InstallComponentOnVehicle(component, vid);
        if (result.IsFailure)
            return Results.BadRequest(new ApiErrorResponse { Error = result.ErrorMessage });

        var updated = await repository.UpdateAsync(result.Value);
        return Results.Ok(MapToDto(updated));
    }

    private static async Task<IResult> Update(
        Guid id,
        UpdateComponentRequest request,
        [FromServices] IComponentRepository repository
    )
    {
        var componentId = Id.createComponentIdFrom(id);
        var componentOption = await repository.GetByIdAsync(componentId);

        if (FSharpOption<Component>.get_IsNone(componentOption))
            return Results.NotFound(new ApiErrorResponse { Error = "Component not found" });

        var component = componentOption.Value!;

        // Use new C#-friendly API - pass nulls and Nullable<T> directly
        var updateResult = GarageInterop.UpdateComponent(
            component,
            request.Name ?? component.Name,
            request.PartNumber, // Pass null directly to keep existing value
            request.Category != null
                ? GarageInterop.CreateComponentCategory(request.Category)
                : component.Category,
            request.PurchaseDate, // Nullable<DateTime> works directly
            request.PurchaseCost, // Nullable<decimal> works directly
            request.WarrantyExpiry,
            request.Notes
        ); // Pass null directly to keep existing value

        if (updateResult.IsFailure)
            return Results.BadRequest(new ApiErrorResponse { Error = updateResult.ErrorMessage });

        var saved = await repository.UpdateAsync(updateResult.Value);
        return Results.Ok(MapToDto(saved));
    }

    private static async Task<IResult> Delete(
        Guid id,
        [FromServices] IComponentRepository repository
    )
    {
        var componentId = Id.createComponentIdFrom(id);
        var success = await repository.DeleteAsync(componentId);

        return success
            ? Results.NoContent()
            : Results.NotFound(new ApiErrorResponse { Error = "Component not found" });
    }

    private static async Task<IResult> Uninstall(
        Guid id,
        [FromServices] IComponentRepository repository
    )
    {
        var componentId = Id.createComponentIdFrom(id);
        var componentOption = await repository.GetByIdAsync(componentId);

        if (FSharpOption<Component>.get_IsNone(componentOption))
            return Results.NotFound(new ApiErrorResponse { Error = "Component not found" });

        var component = componentOption.Value!;
        var result = GarageInterop.RemoveComponentFromVehicle(component, null);

        if (result.IsFailure)
            return Results.BadRequest(new ApiErrorResponse { Error = result.ErrorMessage });

        var updated = await repository.UpdateAsync(result.Value);
        return Results.Ok(MapToDto(updated));
    }

    private static ComponentDto MapToDto(Component component)
    {
        var location = MapLocation(component.Location);

        return new ComponentDto
        {
            Id = Id.componentIdValue(component.Id),
            Name = component.Name,
            PartNumber = GarageInterop.GetComponentPartNumber(component),
            Category = GarageInterop.ComponentCategoryToString(component.Category),
            Location = location,
            PurchaseDate = GarageInterop.GetComponentPurchaseDate(component),
            PurchaseCost = GarageInterop.GetComponentPurchaseCost(component),
            WarrantyExpiry = GarageInterop.GetComponentWarrantyExpiry(component),
            Notes = GarageInterop.GetComponentNotes(component),
            CreatedAt = component.CreatedAt,
            UpdatedAt = component.UpdatedAt,
        };
    }

    private static ComponentLocationDto MapLocation(ComponentLocation location)
    {
        return location switch
        {
            ComponentLocation.InStorage storage => new ComponentLocationDto
            {
                Type = "InStorage",
                StorageLocation = GarageInterop.GetStorageLocation(location),
                VehicleId = null,
                InstalledDate = null,
            },
            ComponentLocation.InstalledOn installed => new ComponentLocationDto
            {
                Type = "InstalledOn",
                StorageLocation = null,
                VehicleId = Id.vehicleIdValue(installed.vehicleId),
                InstalledDate = installed.installedDate,
            },
            _ => new ComponentLocationDto(),
        };
    }
}
