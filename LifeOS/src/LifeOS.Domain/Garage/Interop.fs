namespace LifeOS.Domain.Garage

open System
open LifeOS.Domain.Common
open Microsoft.FSharp.Core

// ============================================
// C#-Friendly Result Type (No F# types exposed)
// ============================================

/// <summary>
/// Result wrapper for Garage domain operations.
/// C# consumers see IsSuccess, Value, ErrorMessage - no FSharpResult.
/// </summary>
[<Sealed>]
type GarageResult<'T> private (success: bool, value: 'T, errorMessage: string) =
    member _.IsSuccess = success
    member _.IsFailure = not success
    member _.Value = value
    member _.ErrorMessage = errorMessage
    
    static member Success(value: 'T) = GarageResult<'T>(true, value, null)
    static member Failure(message: string) = GarageResult<'T>(false, Unchecked.defaultof<'T>, message)
    
    static member internal FromResult(result: Result<'T, DomainError>) =
        match result with
        | Ok v -> GarageResult<'T>.Success(v)
        | Error e -> GarageResult<'T>.Failure(DomainError.message e)

// ============================================
// C# Interop - Garage Domain
// Pattern: All F# types (Option, Result, DU) converted at boundary
// ============================================

/// <summary>
/// C# Interop for Garage domain types.
/// All methods return C#-friendly types (no FSharpOption, FSharpResult).
/// </summary>
[<AbstractClass; Sealed>]
type GarageInterop private () =
    
    // ============================================
    // VIN Operations (C#-friendly boundary)
    // ============================================
    
    /// <summary>Creates a VIN from string. Returns GarageResult for C# consumption.</summary>
    static member CreateVIN(value: string) : GarageResult<VIN> = 
        VIN.create value |> GarageResult.FromResult
    
    /// <summary>Gets the string value from a VIN.</summary>
    static member GetVINValue(vin: VIN) : string = 
        VIN.value vin
    
    // ============================================
    // LicensePlate Operations
    // ============================================
    
    /// <summary>Creates a LicensePlate. Pass null for no plate.</summary>
    static member CreateLicensePlate(value: string) : GarageResult<LicensePlate> = 
        let optValue = if isNull value then None else Some value
        LicensePlate.create optValue |> GarageResult.FromResult
    
    /// <summary>Gets the string value from a LicensePlate. Returns null if none.</summary>
    static member GetLicensePlateValue(plate: LicensePlate) : string = 
        LicensePlate.value plate |> Option.defaultValue null
    
    // ============================================
    // Mileage Operations
    // ============================================
    
    /// <summary>Creates a Mileage value object.</summary>
    static member CreateMileage(value: decimal) : GarageResult<Mileage> = 
        Mileage.create value |> GarageResult.FromResult
    
    /// <summary>Gets the decimal value from a Mileage.</summary>
    static member GetMileageValue(mileage: Mileage) : decimal = 
        Mileage.value mileage
    
    // ============================================
    // Simple Value Objects (no validation needed)
    // ============================================
    
    static member CreateMake(value: string) : Make = Make value
    static member GetMakeValue(make: Make) : string = let (Make m) = make in m
    
    static member CreateModel(value: string) : Model = Model value
    static member GetModelValue(model: Model) : string = let (Model m) = model in m
    
    static member CreateYear(value: int) : Year = Year value
    static member GetYearValue(year: Year) : int = let (Year y) = year in y
    
    // ============================================
    // VehicleType Factory Methods
    // ============================================
    
    static member CreateTruck(payloadCapacity: decimal) : VehicleType = Truck payloadCapacity
    static member CreateRV(length: decimal, slideOuts: int) : VehicleType = RV (length, slideOuts)
    static member CreateCar(bodyStyle: string) : VehicleType = Car bodyStyle
    static member CreateMotorcycle(engineCC: int) : VehicleType = Motorcycle engineCC
    
    /// <summary>Gets the vehicle type as a string for C# display.</summary>
    static member VehicleTypeToString(vehicleType: VehicleType) : string =
        match vehicleType with
        | Truck capacity -> sprintf "Truck (%.0f lbs)" capacity
        | RV (length, slides) -> sprintf "RV (%.0f ft, %d slides)" length slides
        | Car style -> sprintf "Car (%s)" style
        | Motorcycle cc -> sprintf "Motorcycle (%d cc)" cc
    
    // ============================================
    // Vehicle Factory & Operations
    // ============================================
    
    /// <summary>Creates a new Vehicle. Pass null for licensePlate if none.</summary>
    static member CreateVehicle(
        vin: string, 
        licensePlate: string, 
        make: string, 
        model: string, 
        year: int, 
        vehicleType: VehicleType
    ) : GarageResult<Vehicle> =
        let optPlate = if isNull licensePlate then None else Some licensePlate
        Vehicle.create vin optPlate make model year vehicleType |> GarageResult.FromResult
    
    /// <summary>Updates vehicle mileage. Validates that new mileage >= current.</summary>
    static member UpdateVehicleMileage(vehicle: Vehicle, newMileage: Mileage) : GarageResult<Vehicle> =
        vehicle.UpdateMileage(newMileage) |> GarageResult.FromResult
    
    /// <summary>Updates vehicle license plate.</summary>
    static member UpdateVehicleLicensePlate(vehicle: Vehicle, newPlate: LicensePlate) : GarageResult<Vehicle> =
        vehicle.UpdateLicensePlate(newPlate) |> GarageResult.FromResult
    
    /// <summary>Activates a vehicle.</summary>
    static member ActivateVehicle(vehicle: Vehicle) : GarageResult<Vehicle> =
        vehicle.Activate() |> GarageResult.FromResult
    
    /// <summary>Deactivates a vehicle.</summary>
    static member DeactivateVehicle(vehicle: Vehicle) : GarageResult<Vehicle> =
        vehicle.Deactivate() |> GarageResult.FromResult

    /// <summary>Gets the make string from a vehicle.</summary>
    static member GetVehicleMake(vehicle: Vehicle) : string =
        let (Make m) = vehicle.Make in m

    /// <summary>Gets the model string from a vehicle.</summary>
    static member GetVehicleModel(vehicle: Vehicle) : string =
        let (Model m) = vehicle.Model in m

    /// <summary>Gets the year int from a vehicle.</summary>
    static member GetVehicleYear(vehicle: Vehicle) : int =
        let (Year y) = vehicle.Year in y

    /// <summary>Updates vehicle details (immutable update).</summary>
    static member UpdateVehicleDetails(
        vehicle: Vehicle, 
        make: string, 
        model: string, 
        year: int, 
        vehicleType: VehicleType
    ) : Vehicle =
        { vehicle with
            Make = Make make
            Model = Model model
            Year = Year year
            VehicleType = vehicleType
            UpdatedAt = DateTime.UtcNow }

    // ============================================
    // ComponentCategory Helpers
    // ============================================
    
    /// <summary>Parses a string to ComponentCategory.</summary>
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

    /// <summary>Converts ComponentCategory to string.</summary>
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

    // ============================================
    // Component Factory & Operations
    // ============================================
    
    /// <summary>Creates a new Component. Pass null for optional parameters.</summary>
    static member CreateComponent(
        name: string,
        partNumber: string,
        category: ComponentCategory,
        purchaseDate: Nullable<DateTime>,
        purchaseCost: Nullable<decimal>,
        warrantyExpiry: Nullable<DateTime>,
        notes: string
    ) : GarageResult<Component> =
        let optPartNumber = if isNull partNumber then None else Some partNumber
        let optPurchaseDate = if purchaseDate.HasValue then Some purchaseDate.Value else None
        let optPurchaseCost = if purchaseCost.HasValue then Some purchaseCost.Value else None
        let optWarrantyExpiry = if warrantyExpiry.HasValue then Some warrantyExpiry.Value else None
        let optNotes = if isNull notes then None else Some notes
        
        Component.create name optPartNumber category optPurchaseDate optPurchaseCost optWarrantyExpiry optNotes 
        |> GarageResult.FromResult
    
    /// <summary>Installs a component on a vehicle.</summary>
    static member InstallComponentOnVehicle(comp: Component, vehicleId: VehicleId) : GarageResult<Component> =
        comp.InstallOnVehicle(vehicleId) |> GarageResult.FromResult
    
    /// <summary>Removes a component from a vehicle to storage.</summary>
    static member RemoveComponentFromVehicle(comp: Component, storageLocation: string) : GarageResult<Component> =
        let optLocation = if isNull storageLocation then None else Some storageLocation
        comp.RemoveFromVehicle(optLocation) |> GarageResult.FromResult
    
    /// <summary>Checks if a component is installed.</summary>
    static member IsComponentInstalled(comp: Component) : bool =
        comp.IsInstalled
    
    /// <summary>Gets the vehicle ID where component is installed. Returns null GUID if not installed.</summary>
    static member GetInstalledVehicleId(comp: Component) : Guid =
        match comp.GetInstalledVehicleId() with
        | Some (VehicleId id) -> id
        | None -> Guid.Empty
    
    /// <summary>Checks if component is under warranty.</summary>
    static member IsUnderWarranty(comp: Component, currentDate: DateTime) : bool =
        Component.isUnderWarranty comp currentDate
    
    /// <summary>Gets component age in days.</summary>
    static member GetComponentAgeInDays(comp: Component, currentDate: DateTime) : int =
        Component.getAgeInDays comp currentDate
