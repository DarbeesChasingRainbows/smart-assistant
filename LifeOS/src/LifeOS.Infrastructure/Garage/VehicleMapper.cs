using LifeOS.Domain.Common;
using LifeOS.Domain.Garage;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Garage;

/// <summary>
/// Maps between F# domain types and ArangoDB documents
/// Handles the translation layer between the Hexagon and the Database
/// </summary>
public static class VehicleMapper
{
    public static VehicleDocument ToDocument(Vehicle vehicle)
    {
        return new VehicleDocument
        {
            Key = Id.vehicleIdValue(vehicle.Id).ToString(),
            VIN = GarageInterop.GetVINValue(vehicle.VIN),
            LicensePlate = GetLicensePlateValue(vehicle.LicensePlate),
            Make = GarageInterop.GetMakeValue(vehicle.Make),
            Model = GarageInterop.GetModelValue(vehicle.Model),
            Year = GarageInterop.GetYearValue(vehicle.Year),
            VehicleType = MapVehicleType(vehicle.VehicleType),
            CurrentMileage = GarageInterop.GetMileageValue(vehicle.CurrentMileage),
            IsActive = vehicle.IsActive,
            CreatedAt = vehicle.CreatedAt,
            UpdatedAt = vehicle.UpdatedAt,
        };
    }

    private static string GetLicensePlateValue(LicensePlate plate)
    {
        var optionValue = GarageInterop.GetLicensePlateValue(plate);
        return FSharpOption<string>.get_IsSome(optionValue) ? optionValue.Value : null;
    }

    public static Vehicle ToDomain(VehicleDocument doc)
    {
        if (doc == null)
            return null;

        var vinResult = GarageInterop.CreateVIN(doc.VIN);
        var plateResult = GarageInterop.CreateLicensePlate(
            string.IsNullOrEmpty(doc.LicensePlate)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.LicensePlate)
        );
        var mileageResult = GarageInterop.CreateMileage(doc.CurrentMileage);

        if (vinResult.IsError || plateResult.IsError || mileageResult.IsError)
            return null;

        return new Vehicle(
            id: Id.createVehicleIdFrom(Guid.Parse(doc.Key)),
            vIN: vinResult.ResultValue,
            licensePlate: plateResult.ResultValue,
            make: GarageInterop.CreateMake(doc.Make),
            model: GarageInterop.CreateModel(doc.Model),
            year: GarageInterop.CreateYear(doc.Year),
            vehicleType: MapVehicleTypeToDomain(doc.VehicleType),
            currentMileage: mileageResult.ResultValue,
            isActive: doc.IsActive,
            createdAt: doc.CreatedAt,
            updatedAt: doc.UpdatedAt
        );
    }

    private static VehicleTypeDocument MapVehicleType(VehicleType vehicleType)
    {
        return vehicleType switch
        {
            VehicleType.Truck truck => new VehicleTypeDocument
            {
                Type = "Truck",
                PayloadCapacity = truck.payloadCapacity,
            },
            VehicleType.RV rv => new VehicleTypeDocument
            {
                Type = "RV",
                Length = rv.length,
                SlideOuts = rv.slideOuts,
            },
            VehicleType.Car car => new VehicleTypeDocument
            {
                Type = "Car",
                BodyStyle = car.bodyStyle,
            },
            VehicleType.Motorcycle motorcycle => new VehicleTypeDocument
            {
                Type = "Motorcycle",
                EngineCC = motorcycle.engineCC,
            },
            _ => new VehicleTypeDocument { Type = "Unknown" },
        };
    }

    private static VehicleType MapVehicleTypeToDomain(VehicleTypeDocument doc)
    {
        return doc.Type switch
        {
            "Truck" => VehicleType.NewTruck(doc.PayloadCapacity ?? 0m),
            "RV" => VehicleType.NewRV(doc.Length ?? 0m, doc.SlideOuts ?? 0),
            "Car" => VehicleType.NewCar(doc.BodyStyle ?? "Sedan"),
            "Motorcycle" => VehicleType.NewMotorcycle(doc.EngineCC ?? 0),
            _ => VehicleType.NewCar("Unknown"),
        };
    }
}
