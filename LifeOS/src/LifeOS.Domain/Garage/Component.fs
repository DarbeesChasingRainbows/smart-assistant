namespace LifeOS.Domain.Garage

open LifeOS.Domain.Common
open System

// Component Aggregate Root
type Component = {
    Id: ComponentId
    Name: string
    PartNumber: string option
    Category: ComponentCategory
    Location: ComponentLocation
    PurchaseDate: DateTime option
    PurchaseCost: decimal option
    WarrantyExpiry: DateTime option
    Notes: string option
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    // Business logic methods for state transitions
    member this.InstallOnVehicle (vehicleId: VehicleId) =
        match this.Location with
        | InStorage _ ->
            Ok { this with 
                Location = InstalledOn (vehicleId, DateTime.utcNow())
                UpdatedAt = DateTime.utcNow()
            }
        | InstalledOn (currentVehicleId, _) ->
            if currentVehicleId = vehicleId then
                Error (BusinessRuleViolation "Component is already installed on this vehicle")
            else
                Error (BusinessRuleViolation "Component must be removed from current vehicle before installing on another")
    
    member this.RemoveFromVehicle (storageLocation: string option) =
        match this.Location with
        | InstalledOn (vehicleId, installDate) ->
            Ok { this with 
                Location = InStorage storageLocation
                UpdatedAt = DateTime.utcNow()
            }
        | InStorage _ ->
            Error (BusinessRuleViolation "Component is already in storage")
    
    member this.UpdateStorageLocation (newLocation: string option) =
        match this.Location with
        | InStorage _ ->
            Ok { this with 
                Location = InStorage newLocation
                UpdatedAt = DateTime.utcNow()
            }
        | InstalledOn _ ->
            Error (BusinessRuleViolation "Cannot change storage location while component is installed")
    
    member this.IsInstalled =
        match this.Location with
        | InstalledOn _ -> true
        | InStorage _ -> false
    
    member this.GetInstalledVehicleId () =
        match this.Location with
        | InstalledOn (vehicleId, _) -> Some vehicleId
        | InStorage _ -> None

// Component Module for factory methods and operations
module Component =
    let create name partNumber category purchaseDate purchaseCost warrantyExpiry notes =
        if String.IsNullOrEmpty(name) then
            Error (ValidationError "Component name is required")
        else
            Ok {
                Id = Id.createComponentId()
                Name = name
                PartNumber = partNumber
                Category = category
                Location = InStorage None // New components start in storage
                PurchaseDate = purchaseDate
                PurchaseCost = purchaseCost
                WarrantyExpiry = warrantyExpiry
                Notes = notes
                CreatedAt = DateTime.utcNow()
                UpdatedAt = DateTime.utcNow()
            }
    
    // Domain service to check if component can be installed
    let canInstallOnVehicle (component: Component) (vehicleId: VehicleId) =
        match component.Location with
        | InStorage _ -> Ok ()
        | InstalledOn (installedVehicleId, _) ->
            if installedVehicleId = vehicleId then
                Error (BusinessRuleViolation "Component is already installed on this vehicle")
            else
                Error (BusinessRuleViolation "Component is installed on a different vehicle")
    
    // Check if component is under warranty
    let isUnderWarranty (component: Component) (currentDate: DateTime) =
        match component.WarrantyExpiry with
        | Some expiry -> currentDate < expiry
        | None -> false
    
    // Calculate component age in days
    let getAgeInDays (component: Component) (currentDate: DateTime) =
        match component.PurchaseDate with
        | Some purchaseDate -> (currentDate - purchaseDate).Days
        | None -> 0
