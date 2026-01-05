namespace LifeOS.Domain.Garage

open LifeOS.Domain.Common
open System
open System.Threading.Tasks

// IVehicleRepository - Port for Vehicle persistence (Hexagonal Architecture)
// This interface lives in the Domain but is implemented by Infrastructure
type IVehicleRepository =
    
    // CRUD operations
    abstract member GetByIdAsync : VehicleId -> Task<Vehicle option>
    abstract member GetAllAsync : unit -> Task<Vehicle seq>
    abstract member AddAsync : Vehicle -> Task<Vehicle>
    abstract member UpdateAsync : Vehicle -> Task<Vehicle>
    abstract member DeleteAsync : VehicleId -> Task<bool>
    
    // Domain-specific queries
    abstract member GetByVINAsync : VIN -> Task<Vehicle option>
    abstract member GetActiveVehiclesAsync : unit -> Task<Vehicle seq>
    abstract member GetByVehicleTypeAsync : VehicleType -> Task<Vehicle seq>
    
    // Business rule validations
    abstract member IsVINUniqueAsync : VIN -> VehicleId option -> Task<bool>
    
    // Pagination support
    abstract member GetPagedAsync : int -> int -> Task<Vehicle seq * int>
    
    // Search functionality
    abstract member SearchAsync : string -> Task<Vehicle seq>

// Extension methods for common repository patterns
[<RequireQualifiedAccess>]
module VehicleRepository =
    
    // Helper for getting vehicles with components
    let GetVehicleWithComponentsAsync (vehicleRepo: IVehicleRepository) (componentRepo: IComponentRepository) (vehicleId: VehicleId) =
        async {
            let! vehicle = vehicleRepo.GetByIdAsync vehicleId |> Async.AwaitTask
            match vehicle with
            | Some v ->
                let! components = componentRepo.GetByVehicleIdAsync vehicleId |> Async.AwaitTask
                return Some (v, components)
            | None ->
                return None
        }
    
    // Helper for checking if vehicle can be deleted (no installed components)
    let CanDeleteVehicleAsync (vehicleRepo: IVehicleRepository) (componentRepo: IComponentRepository) (vehicleId: VehicleId) =
        async {
            let! installedComponents = componentRepo.GetByVehicleIdAsync vehicleId |> Async.AwaitTask
            let hasInstalledComponents = 
                installedComponents 
                |> Seq.exists (fun c -> c.IsInstalled)
            
            return not hasInstalledComponents
        }
