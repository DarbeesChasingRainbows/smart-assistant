namespace LifeOS.Domain.Garage

open LifeOS.Domain.Common
open System

// Vehicle Aggregate Root
type Vehicle = {
    Id: VehicleId
    VIN: VIN
    LicensePlate: LicensePlate
    Make: Make
    Model: Model
    Year: Year
    VehicleType: VehicleType
    CurrentMileage: Mileage
    IsActive: bool
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    // Business logic methods
    member this.UpdateMileage (newMileage: Mileage) =
        match Mileage.value newMileage with
        | m when m < Mileage.value this.CurrentMileage -> 
            Error (BusinessRuleViolation "Mileage cannot be decreased")
        | _ -> 
            Ok { this with 
                CurrentMileage = newMileage
                UpdatedAt = DateTime.utcNow ()
            }
    
    member this.UpdateLicensePlate (newPlate: LicensePlate) =
        Ok { this with 
            LicensePlate = newPlate
            UpdatedAt = DateTime.utcNow ()
        }
    
    member this.Deactivate () =
        Ok { this with 
            IsActive = false
            UpdatedAt = DateTime.utcNow ()
        }
    
    member this.Activate () =
        Ok { this with 
            IsActive = true
            UpdatedAt = DateTime.utcNow ()
        }

// Vehicle Module for factory methods and operations
module Vehicle =
    let create vin licensePlate make model year vehicleType =
        result {
            let! validatedVin = VIN.create vin
            let! validatedPlate = LicensePlate.create licensePlate
            let! initialMileage = Mileage.create 0m
            
            return {
                Id = Id.createVehicleId()
                VIN = validatedVin
                LicensePlate = validatedPlate
                Make = Make make
                Model = Model model
                Year = Year year
                VehicleType = vehicleType
                CurrentMileage = initialMileage
                IsActive = true
                CreatedAt = DateTime.utcNow()
                UpdatedAt = DateTime.utcNow()
            }
        }
    
    // Business rules
    let canInstallComponent (vehicle: Vehicle) (component: Component) =
        match component.Location with
        | InStorage _ -> Ok ()
        | InstalledOn (vehicleId, _) ->
            if vehicleId = vehicle.Id then
                Ok ()
            else
                Error (BusinessRuleViolation "Component is already installed on another vehicle")
