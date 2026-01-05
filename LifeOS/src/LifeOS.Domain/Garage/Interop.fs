namespace LifeOS.Domain.Garage

open System
open LifeOS.Domain.Common
open Microsoft.FSharp.Core

/// C# Interop module for Garage domain types
/// Provides static methods accessible from C# for F# value object operations
[<AbstractClass; Sealed>]
type GarageInterop private () =
    
    // VIN operations
    static member CreateVIN(value: string) = VIN.create value
    static member GetVINValue(vin: VIN) = VIN.value vin
    
    // LicensePlate operations
    static member CreateLicensePlate(value: string option) = LicensePlate.create value
    static member GetLicensePlateValue(plate: LicensePlate) = LicensePlate.value plate
    
    // Mileage operations
    static member CreateMileage(value: decimal) = Mileage.create value
    static member GetMileageValue(mileage: Mileage) = Mileage.value mileage
    
    // Make operations
    static member CreateMake(value: string) = Make value
    static member GetMakeValue(make: Make) = 
        let (Make m) = make
        m
    
    // Model operations
    static member CreateModel(value: string) = Model value
    static member GetModelValue(model: Model) = 
        let (Model m) = model
        m
    
    // Year operations
    static member CreateYear(value: int) = Year value
    static member GetYearValue(year: Year) = 
        let (Year y) = year
        y
    
    // VehicleType factory methods
    static member CreateTruck(payloadCapacity: decimal) = Truck payloadCapacity
    static member CreateRV(length: decimal, slideOuts: int) = RV (length, slideOuts)
    static member CreateCar(bodyStyle: string) = Car bodyStyle
    static member CreateMotorcycle(engineCC: int) = Motorcycle engineCC
    
    // Vehicle factory method
    static member CreateVehicle(vin: string, licensePlate: string option, make: string, model: string, year: int, vehicleType: VehicleType) =
        Vehicle.create vin licensePlate make model year vehicleType
    
    // Vehicle update methods - explicitly typed for C# interop
    static member UpdateVehicleMileage(vehicle: Vehicle, newMileage: Mileage) : Result<Vehicle, DomainError> =
        vehicle.UpdateMileage(newMileage)
    
    static member UpdateVehicleLicensePlate(vehicle: Vehicle, newPlate: LicensePlate) : Result<Vehicle, DomainError> =
        vehicle.UpdateLicensePlate(newPlate)
    
    static member ActivateVehicle(vehicle: Vehicle) : Result<Vehicle, DomainError> =
        vehicle.Activate()
    
    static member DeactivateVehicle(vehicle: Vehicle) : Result<Vehicle, DomainError> =
        vehicle.Deactivate()

    // Vehicle property getters for C# interop
    static member GetVehicleMake(vehicle: Vehicle) : string =
        let (Make m) = vehicle.Make
        m

    static member GetVehicleModel(vehicle: Vehicle) : string =
        let (Model m) = vehicle.Model
        m

    static member GetVehicleYear(vehicle: Vehicle) : int =
        let (Year y) = vehicle.Year
        y

    // Update vehicle details (creates new vehicle with updated properties)
    static member UpdateVehicleDetails(vehicle: Vehicle, make: string, model: string, year: int, vehicleType: VehicleType) : Vehicle =
        { vehicle with
            Make = Make make
            Model = Model model
            Year = Year year
            VehicleType = vehicleType
            UpdatedAt = DateTime.UtcNow }

    // ComponentCategory helpers
    static member CreateComponentCategory(value: string) : ComponentCategory =
        match value with
        | null -> Other "Other"
        | v when v.Equals("Engine", StringComparison.OrdinalIgnoreCase) -> Engine
        | v when v.Equals("Transmission", StringComparison.OrdinalIgnoreCase) -> Transmission
        | v when v.Equals("Brake", StringComparison.OrdinalIgnoreCase) -> Brake
        | v when v.Equals("Electrical", StringComparison.OrdinalIgnoreCase) -> Electrical
        | v when v.Equals("Tire", StringComparison.OrdinalIgnoreCase) -> Tire
        | v when v.Equals("Fluid", StringComparison.OrdinalIgnoreCase) -> Fluid
        | v when v.Equals("Filter", StringComparison.OrdinalIgnoreCase) -> Filter
        | v when v.Equals("Battery", StringComparison.OrdinalIgnoreCase) -> Battery
        | v -> Other v

    static member ComponentCategoryToString(category: ComponentCategory) : string =
        match category with
        | Engine -> "Engine"
        | Transmission -> "Transmission"
        | Brake -> "Brake"
        | Electrical -> "Electrical"
        | Tire -> "Tire"
        | Fluid -> "Fluid"
        | Filter -> "Filter"
        | Battery -> "Battery"
        | Other v -> v

    // Component factory method
    static member CreateComponent(
        name: string,
        partNumber: string option,
        category: ComponentCategory,
        purchaseDate: DateTime option,
        purchaseCost: decimal option,
        warrantyExpiry: DateTime option,
        notes: string option
    ) =
        Component.create name partNumber category purchaseDate purchaseCost warrantyExpiry notes
