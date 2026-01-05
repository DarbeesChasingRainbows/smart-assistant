using LifeOS.Domain.Common;
using LifeOS.Domain.Garage;
using LifeOS.Infrastructure.Persistence.Documents;

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
            LicensePlate = GarageInterop.GetLicensePlateValue(vehicle.LicensePlate),
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

    public static Vehicle ToDomain(VehicleDocument doc)
    {
        if (doc == null)
            return null;

        // Use the new C#-friendly GarageResult API
        var vinResult = GarageInterop.CreateVIN(doc.VIN);
        var plateResult = GarageInterop.CreateLicensePlate(doc.LicensePlate);
        var mileageResult = GarageInterop.CreateMileage(doc.CurrentMileage);

        // Check for failures using IsFailure (no more FSharpResult)
        if (vinResult.IsFailure || plateResult.IsFailure || mileageResult.IsFailure)
            return null;

        return new Vehicle(
            id: Id.createVehicleIdFrom(Guid.Parse(doc.Key)),
            vIN: vinResult.Value,
            licensePlate: plateResult.Value,
            make: GarageInterop.CreateMake(doc.Make),
            model: GarageInterop.CreateModel(doc.Model),
            year: GarageInterop.CreateYear(doc.Year),
            vehicleType: MapVehicleTypeToDomain(doc.VehicleType),
            currentMileage: mileageResult.Value,
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
