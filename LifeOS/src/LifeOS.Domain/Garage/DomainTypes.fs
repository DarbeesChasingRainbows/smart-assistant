namespace LifeOS.Domain.Garage

open System
open LifeOS.Domain.Common

// Value Objects for Vehicle domain
type VIN = private VIN of string
type LicensePlate = private LicensePlate of string option
type Mileage = Mileage of decimal
type Make = Make of string
type Model = Model of string
type Year = Year of int

// VIN validation and creation
module VIN =
    let create (value: string) =
        if String.IsNullOrEmpty(value) then
            Error (ValidationError "VIN cannot be empty")
        elif value.Length <> 17 then
            Error (ValidationError "VIN must be 17 characters")
        else
            Ok (VIN value)
    
    let value (VIN vin) = vin

// LicensePlate validation and creation
module LicensePlate =
    let create (value: string option) =
        match value with
        | Some plate when String.IsNullOrEmpty(plate) -> 
            Error (ValidationError "License plate cannot be empty when provided")
        | _ -> Ok (LicensePlate value)
    
    let value (LicensePlate plate) = plate

// Mileage utilities
module Mileage =
    let create (value: decimal) =
        if value < 0m then
            Error (ValidationError "Mileage cannot be negative")
        else
            Ok (Mileage value)
    
    let value (Mileage m) = m
    let zero = Mileage 0m

// Vehicle type discriminated union (Polymorphism)
type VehicleType =
    | Truck of payloadCapacity: decimal
    | RV of length: decimal * slideOuts: int
    | Car of bodyStyle: string
    | Motorcycle of engineCC: int

// Component location discriminated union (State pattern)
type ComponentLocation =
    | InStorage of storageLocation: string option
    | InstalledOn of vehicleId: VehicleId * installedDate: DateTime

// Component category
type ComponentCategory =
    | Engine
    | Transmission
    | Brake
    | Electrical
    | Tire
    | Fluid
    | Filter
    | Battery
    | Other of string

// Maintenance record type
type MaintenanceRecord = {
    Id: Guid
    ComponentId: ComponentId
    VehicleId: VehicleId option
    Date: DateTime
    Mileage: Mileage option
    Description: string
    Cost: decimal option
    PerformedBy: string option
}

// Edge types for Graph Database modeling
module EdgeTypes =
    let SERVICED = "SERVICED"
    let INSTALLED_ON = "INSTALLED_ON"
