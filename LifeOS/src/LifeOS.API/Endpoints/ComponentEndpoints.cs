using LifeOS.API.DTOs;
using LifeOS.Domain.Common;
using LifeOS.Domain.Garage;
using Microsoft.FSharp.Core;
using Microsoft.AspNetCore.Mvc;

namespace LifeOS.API.Endpoints;

public static class ComponentEndpoints
{
    public static void MapComponentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/components")
            .WithTags("Components");

        group.MapGet("/", GetAll)
            .WithName("GetAllComponents");

        group.MapGet("/{id:guid}", GetById)
            .WithName("GetComponentById");

        group.MapGet("/vehicle/{vehicleId:guid}", GetByVehicle)
            .WithName("GetComponentsByVehicle");

        group.MapPost("/", Create)
            .WithName("CreateComponent");

        group.MapPost("/{id:guid}/install", Install)
            .WithName("InstallComponent");

        group.MapPut("/{id:guid}", Update)
            .WithName("UpdateComponent");

        group.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteComponent");

        group.MapPost("/{id:guid}/uninstall", Uninstall)
            .WithName("UninstallComponent");
    }

    private static async Task<IResult> GetAll([FromServices] IComponentRepository repository)
    {
        var components = await repository.GetAllAsync();
        return Results.Ok(components.Select(MapToDto));
    }

    private static async Task<IResult> GetById(Guid id, [FromServices] IComponentRepository repository)
    {
        var componentId = Id.createComponentIdFrom(id);
        var componentOption = await repository.GetByIdAsync(componentId);

        if (FSharpOption<Component>.get_IsNone(componentOption))
            return Results.NotFound(new ApiErrorResponse { Error = "Component not found" });

        return Results.Ok(MapToDto(componentOption.Value));
    }

    private static async Task<IResult> GetByVehicle(Guid vehicleId, [FromServices] IComponentRepository repository)
    {
        var vid = Id.createVehicleIdFrom(vehicleId);
        var components = await repository.GetByVehicleIdAsync(vid);
        return Results.Ok(components.Select(MapToDto));
    }

    private static async Task<IResult> Create(CreateComponentRequest request, [FromServices] IComponentRepository repository)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new ApiErrorResponse { Error = "Name is required" });

        var category = GarageInterop.CreateComponentCategory(request.Category);

        var result = GarageInterop.CreateComponent(
            request.Name,
            string.IsNullOrWhiteSpace(request.PartNumber) ? FSharpOption<string>.None : FSharpOption<string>.Some(request.PartNumber),
            category,
            request.PurchaseDate.HasValue ? FSharpOption<global::System.DateTime>.Some(request.PurchaseDate.Value) : FSharpOption<global::System.DateTime>.None,
            request.PurchaseCost.HasValue ? FSharpOption<decimal>.Some(request.PurchaseCost.Value) : FSharpOption<decimal>.None,
            request.WarrantyExpiry.HasValue ? FSharpOption<global::System.DateTime>.Some(request.WarrantyExpiry.Value) : FSharpOption<global::System.DateTime>.None,
            string.IsNullOrWhiteSpace(request.Notes) ? FSharpOption<string>.None : FSharpOption<string>.Some(request.Notes));

        if (result.IsError)
        {
            var error = result.ErrorValue;
            var errorMessage = error switch
            {
                DomainError.ValidationError ve => ve.Item,
                DomainError.BusinessRuleViolation br => br.Item,
                _ => "Unknown error"
            };
            return Results.BadRequest(new ApiErrorResponse { Error = errorMessage });
        }

        var created = await repository.AddAsync(result.ResultValue);
        return Results.Created($"/api/v1/components/{Id.componentIdValue(created.Id)}", MapToDto(created));
    }

    private static async Task<IResult> Install(Guid id, InstallComponentRequest request, [FromServices] IComponentRepository repository)
    {
        var componentId = Id.createComponentIdFrom(id);
        var componentOption = await repository.GetByIdAsync(componentId);

        if (FSharpOption<Component>.get_IsNone(componentOption))
            return Results.NotFound(new ApiErrorResponse { Error = "Component not found" });

        var component = componentOption.Value!;
        var vid = Id.createVehicleIdFrom(request.VehicleId);
        var result = component.InstallOnVehicle(vid);
        if (result.IsError)
        {
            var error = result.ErrorValue;
            var errorMessage = error switch
            {
                DomainError.ValidationError ve => ve.Item,
                DomainError.BusinessRuleViolation br => br.Item,
                _ => "Unknown error"
            };
            return Results.BadRequest(new ApiErrorResponse { Error = errorMessage });
        }

        var updated = await repository.UpdateAsync(result.ResultValue);
        return Results.Ok(MapToDto(updated));
    }

    private static async Task<IResult> Update(Guid id, UpdateComponentRequest request, [FromServices] IComponentRepository repository)
    {
        var componentId = Id.createComponentIdFrom(id);
        var componentOption = await repository.GetByIdAsync(componentId);

        if (FSharpOption<Component>.get_IsNone(componentOption))
            return Results.NotFound(new ApiErrorResponse { Error = "Component not found" });

        var component = componentOption.Value!;

        // Create updated component with new values
        var updatedComponent = new Component(
            id: component.Id,
            name: request.Name ?? component.Name,
            partNumber: request.PartNumber != null
                ? FSharpOption<string>.Some(request.PartNumber)
                : component.PartNumber,
            category: request.Category != null
                ? GarageInterop.CreateComponentCategory(request.Category)
                : component.Category,
            location: component.Location,
            purchaseDate: request.PurchaseDate.HasValue
                ? FSharpOption<global::System.DateTime>.Some(request.PurchaseDate.Value)
                : component.PurchaseDate,
            purchaseCost: request.PurchaseCost.HasValue
                ? FSharpOption<decimal>.Some(request.PurchaseCost.Value)
                : component.PurchaseCost,
            warrantyExpiry: request.WarrantyExpiry.HasValue
                ? FSharpOption<global::System.DateTime>.Some(request.WarrantyExpiry.Value)
                : component.WarrantyExpiry,
            notes: request.Notes != null
                ? FSharpOption<string>.Some(request.Notes)
                : component.Notes,
            createdAt: component.CreatedAt,
            updatedAt: global::System.DateTime.UtcNow
        );

        var saved = await repository.UpdateAsync(updatedComponent);
        return Results.Ok(MapToDto(saved));
    }

    private static async Task<IResult> Delete(Guid id, [FromServices] IComponentRepository repository)
    {
        var componentId = Id.createComponentIdFrom(id);
        var success = await repository.DeleteAsync(componentId);

        return success
            ? Results.NoContent()
            : Results.NotFound(new ApiErrorResponse { Error = "Component not found" });
    }

    private static async Task<IResult> Uninstall(Guid id, [FromServices] IComponentRepository repository)
    {
        var componentId = Id.createComponentIdFrom(id);
        var componentOption = await repository.GetByIdAsync(componentId);

        if (FSharpOption<Component>.get_IsNone(componentOption))
            return Results.NotFound(new ApiErrorResponse { Error = "Component not found" });

        var component = componentOption.Value!;
        var result = component.RemoveFromVehicle(FSharpOption<string>.None);

        if (result.IsError)
        {
            var error = result.ErrorValue;
            var errorMessage = error switch
            {
                DomainError.ValidationError ve => ve.Item,
                DomainError.BusinessRuleViolation br => br.Item,
                _ => "Unknown error"
            };
            return Results.BadRequest(new ApiErrorResponse { Error = errorMessage });
        }

        var updated = await repository.UpdateAsync(result.ResultValue);
        return Results.Ok(MapToDto(updated));
    }

    private static ComponentDto MapToDto(Component component)
    {
        var location = MapLocation(component.Location);

        return new ComponentDto
        {
            Id = Id.componentIdValue(component.Id),
            Name = component.Name,
            PartNumber = FSharpOption<string>.get_IsSome(component.PartNumber) ? component.PartNumber.Value! : null,
            Category = GarageInterop.ComponentCategoryToString(component.Category),
            Location = location,
            PurchaseDate = FSharpOption<global::System.DateTime>.get_IsSome(component.PurchaseDate) ? component.PurchaseDate.Value : null,
            PurchaseCost = FSharpOption<decimal>.get_IsSome(component.PurchaseCost) ? component.PurchaseCost.Value : null,
            WarrantyExpiry = FSharpOption<global::System.DateTime>.get_IsSome(component.WarrantyExpiry) ? component.WarrantyExpiry.Value : null,
            Notes = FSharpOption<string>.get_IsSome(component.Notes) ? component.Notes.Value! : null,
            CreatedAt = component.CreatedAt,
            UpdatedAt = component.UpdatedAt
        };
    }

    private static ComponentLocationDto MapLocation(ComponentLocation location)
    {
        return location switch
        {
            ComponentLocation.InStorage storage => new ComponentLocationDto
            {
                Type = "InStorage",
                StorageLocation = FSharpOption<string>.get_IsSome(storage.storageLocation) ? storage.storageLocation.Value! : null,
                VehicleId = null,
                InstalledDate = null
            },
            ComponentLocation.InstalledOn installed => new ComponentLocationDto
            {
                Type = "InstalledOn",
                StorageLocation = null,
                VehicleId = Id.vehicleIdValue(installed.vehicleId),
                InstalledDate = installed.installedDate
            },
            _ => new ComponentLocationDto()
        };
    }
}
