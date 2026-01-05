using LifeOS.API.DTOs;
using LifeOS.Domain.Garage;
using LifeOS.Domain.Common;
using Microsoft.FSharp.Core;
using Microsoft.AspNetCore.Mvc;

namespace LifeOS.API.Endpoints;

/// <summary>
/// Vehicle API endpoints - Primary Adapter (Hexagonal Architecture)
/// </summary>
public static class VehicleEndpoints
{
    public static void MapVehicleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/vehicles")
            .WithTags("Vehicles");

        group.MapGet("/", GetAllVehicles)
            .WithName("GetAllVehicles")
            .WithDescription("Get all vehicles");

        group.MapGet("/{id:guid}", GetVehicleById)
            .WithName("GetVehicleById")
            .WithDescription("Get a vehicle by ID");

        group.MapGet("/active", GetActiveVehicles)
            .WithName("GetActiveVehicles")
            .WithDescription("Get all active vehicles");

        group.MapPost("/", CreateVehicle)
            .WithName("CreateVehicle")
            .WithDescription("Create a new vehicle");

        group.MapPut("/{id:guid}", UpdateVehicle)
            .WithName("UpdateVehicle")
            .WithDescription("Update an existing vehicle");

        group.MapDelete("/{id:guid}", DeleteVehicle)
            .WithName("DeleteVehicle")
            .WithDescription("Delete a vehicle");

        group.MapGet("/search", SearchVehicles)
            .WithName("SearchVehicles")
            .WithDescription("Search vehicles by term");

        group.MapGet("/paged", GetPagedVehicles)
            .WithName("GetPagedVehicles")
            .WithDescription("Get vehicles with pagination");
    }

    private static async Task<IResult> GetAllVehicles([FromServices] IVehicleRepository repository)
    {
        var vehicles = await repository.GetAllAsync();
        var dtos = vehicles.Select(MapToDto);
        return Results.Ok(dtos);
    }

    private static async Task<IResult> GetVehicleById(Guid id, [FromServices] IVehicleRepository repository)
    {
        var vehicleId = Id.createVehicleIdFrom(id);
        var vehicleOption = await repository.GetByIdAsync(vehicleId);

        if (FSharpOption<Vehicle>.get_IsNone(vehicleOption))
            return Results.NotFound(new ApiErrorResponse { Error = "Vehicle not found" });

        return Results.Ok(MapToDto(vehicleOption.Value!));
    }

    private static async Task<IResult> GetActiveVehicles([FromServices] IVehicleRepository repository)
    {
        var vehicles = await repository.GetActiveVehiclesAsync();
        var dtos = vehicles.Select(MapToDto);
        return Results.Ok(dtos);
    }

    private static async Task<IResult> CreateVehicle(
        CreateVehicleRequest request,
        [FromServices] IVehicleRepository repository)
    {
        // Map VehicleType from DTO
        var vehicleType = MapVehicleType(request.VehicleType);

        // Create vehicle using F# domain factory via Interop
        var result = GarageInterop.CreateVehicle(
            request.VIN,
            string.IsNullOrEmpty(request.LicensePlate)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(request.LicensePlate),
            request.Make,
            request.Model,
            request.Year,
            vehicleType);

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

        // Check VIN uniqueness
        var isUnique = await repository.IsVINUniqueAsync(
            result.ResultValue.VIN,
            FSharpOption<VehicleId>.None);

        if (!isUnique)
            return Results.Conflict(new ApiErrorResponse { Error = "VIN already exists" });

        var vehicle = await repository.AddAsync(result.ResultValue);
        return Results.Created($"/api/v1/vehicles/{Id.vehicleIdValue(vehicle.Id)}", MapToDto(vehicle));
    }

    private static async Task<IResult> UpdateVehicle(
        Guid id,
        UpdateVehicleRequest request,
        [FromServices] IVehicleRepository repository)
    {
        var vehicleId = Id.createVehicleIdFrom(id);
        var vehicleOption = await repository.GetByIdAsync(vehicleId);

        if (FSharpOption<Vehicle>.get_IsNone(vehicleOption))
            return Results.NotFound(new ApiErrorResponse { Error = "Vehicle not found" });

        var vehicle = vehicleOption.Value!;

        // Apply updates
        if (request.CurrentMileage.HasValue)
        {
            var mileageResult = GarageInterop.CreateMileage(request.CurrentMileage.Value);
            if (mileageResult.IsError)
                return Results.BadRequest(new ApiErrorResponse { Error = "Invalid mileage value" });

            var updateResult = vehicle.UpdateMileage(mileageResult.ResultValue);
            if (updateResult.IsError)
            {
                var error = updateResult.ErrorValue;
                var errorMessage = error switch
                {
                    DomainError.BusinessRuleViolation br => br.Item,
                    _ => "Update failed"
                };
                return Results.BadRequest(new ApiErrorResponse { Error = errorMessage });
            }
            vehicle = updateResult.ResultValue;
        }

        if (request.LicensePlate != null)
        {
            var plateResult = GarageInterop.CreateLicensePlate(
                FSharpOption<string>.Some(request.LicensePlate));
            if (plateResult.IsError)
                return Results.BadRequest(new ApiErrorResponse { Error = "Invalid license plate" });

            var updateResult = GarageInterop.UpdateVehicleLicensePlate(vehicle, plateResult.ResultValue);
            if (updateResult.IsOk)
                vehicle = updateResult.ResultValue;
        }

        if (request.IsActive.HasValue)
        {
            var updateResult = request.IsActive.Value
                ? GarageInterop.ActivateVehicle(vehicle)
                : GarageInterop.DeactivateVehicle(vehicle);
            if (updateResult.IsOk)
                vehicle = updateResult.ResultValue;
        }

        // Update Make/Model/Year/VehicleType by recreating the vehicle with new values
        if (request.Make != null || request.Model != null || request.Year.HasValue || request.VehicleType != null)
        {
            var newMake = request.Make ?? GarageInterop.GetVehicleMake(vehicle);
            var newModel = request.Model ?? GarageInterop.GetVehicleModel(vehicle);
            var newYear = request.Year ?? GarageInterop.GetVehicleYear(vehicle);
            var newVehicleType = request.VehicleType != null
                ? MapVehicleType(request.VehicleType)
                : vehicle.VehicleType;

            vehicle = GarageInterop.UpdateVehicleDetails(vehicle, newMake, newModel, newYear, newVehicleType);
        }

        var updated = await repository.UpdateAsync(vehicle);
        return Results.Ok(MapToDto(updated));
    }

    private static async Task<IResult> DeleteVehicle(Guid id, [FromServices] IVehicleRepository repository)
    {
        var vehicleId = Id.createVehicleIdFrom(id);
        var success = await repository.DeleteAsync(vehicleId);

        return success
            ? Results.NoContent()
            : Results.NotFound(new ApiErrorResponse { Error = "Vehicle not found" });
    }

    private static async Task<IResult> SearchVehicles(string term, [FromServices] IVehicleRepository repository)
    {
        var vehicles = await repository.SearchAsync(term);
        var dtos = vehicles.Select(MapToDto);
        return Results.Ok(dtos);
    }

    private static async Task<IResult> GetPagedVehicles(
        int page,
        int pageSize,
        [FromServices] IVehicleRepository repository)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var (vehicles, totalCount) = await repository.GetPagedAsync(page, pageSize);

        return Results.Ok(new VehicleListResponse
        {
            Vehicles = vehicles.Select(MapToDto),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    // Mapping helpers
    private static VehicleDto MapToDto(Vehicle vehicle)
    {
        return new VehicleDto
        {
            Id = Id.vehicleIdValue(vehicle.Id),
            VIN = GarageInterop.GetVINValue(vehicle.VIN),
            LicensePlate = GetLicensePlateString(vehicle.LicensePlate),
            Make = GarageInterop.GetMakeValue(vehicle.Make),
            Model = GarageInterop.GetModelValue(vehicle.Model),
            Year = GarageInterop.GetYearValue(vehicle.Year),
            VehicleType = MapVehicleTypeToDto(vehicle.VehicleType),
            CurrentMileage = GarageInterop.GetMileageValue(vehicle.CurrentMileage),
            IsActive = vehicle.IsActive,
            CreatedAt = vehicle.CreatedAt,
            UpdatedAt = vehicle.UpdatedAt
        };
    }

    private static string? GetLicensePlateString(LicensePlate plate)
    {
        var option = GarageInterop.GetLicensePlateValue(plate);
        return FSharpOption<string>.get_IsSome(option) ? option.Value : null;
    }

    private static VehicleTypeDto MapVehicleTypeToDto(VehicleType vehicleType)
    {
        return vehicleType switch
        {
            VehicleType.Truck truck => new VehicleTypeDto
            {
                Type = "Truck",
                PayloadCapacity = truck.payloadCapacity
            },
            VehicleType.RV rv => new VehicleTypeDto
            {
                Type = "RV",
                Length = rv.length,
                SlideOuts = rv.slideOuts
            },
            VehicleType.Car car => new VehicleTypeDto
            {
                Type = "Car",
                BodyStyle = car.bodyStyle
            },
            VehicleType.Motorcycle motorcycle => new VehicleTypeDto
            {
                Type = "Motorcycle",
                EngineCC = motorcycle.engineCC
            },
            _ => new VehicleTypeDto { Type = "Unknown" }
        };
    }

    private static VehicleType MapVehicleType(VehicleTypeDto dto)
    {
        return dto.Type switch
        {
            "Truck" => GarageInterop.CreateTruck(dto.PayloadCapacity ?? 0m),
            "RV" => GarageInterop.CreateRV(dto.Length ?? 0m, dto.SlideOuts ?? 0),
            "Car" => GarageInterop.CreateCar(dto.BodyStyle ?? "Sedan"),
            "Motorcycle" => GarageInterop.CreateMotorcycle(dto.EngineCC ?? 0),
            _ => GarageInterop.CreateCar("Unknown")
        };
    }
}
