namespace LifeOS.Domain.Garage

open LifeOS.Domain.Common
open System
open System.Threading.Tasks

// IComponentRepository - Port for Component persistence (Hexagonal Architecture)
type IComponentRepository =
    
    // CRUD operations
    abstract member GetByIdAsync : ComponentId -> Task<Component option>
    abstract member GetAllAsync : unit -> Task<Component seq>
    abstract member AddAsync : Component -> Task<Component>
    abstract member UpdateAsync : Component -> Task<Component>
    abstract member DeleteAsync : ComponentId -> Task<bool>
    
    // Domain-specific queries
    abstract member GetByVehicleIdAsync : VehicleId -> Task<Component seq>
    abstract member GetInStorageAsync : unit -> Task<Component seq>
    abstract member GetByCategoryAsync : ComponentCategory -> Task<Component seq>
    abstract member GetByPartNumberAsync : string -> Task<Component seq>
    
    // Warranty and maintenance queries
    abstract member GetUnderWarrantyAsync : DateTime -> Task<Component seq>
    abstract member GetNeedingMaintenanceAsync : DateTime -> Task<Component seq>
    
    // Pagination support
    abstract member GetPagedAsync : int -> int -> Task<Component seq * int>
    
    // Search functionality
    abstract member SearchAsync : string -> Task<Component seq>

// Extension methods for component repository operations
[<RequireQualifiedAccess>]
module ComponentRepository =
    
    // Get components that can be installed (currently in storage)
    let GetAvailableForInstallationAsync (repository: IComponentRepository) () =
        async {
            let! storageComponents = repository.GetInStorageAsync() |> Async.AwaitTask
            return storageComponents |> Seq.toList
        }
    
    // Get components installed on a specific vehicle
    let GetInstalledComponentsAsync (repository: IComponentRepository) (vehicleId: VehicleId) =
        async {
            let! allVehicleComponents = repository.GetByVehicleIdAsync vehicleId |> Async.AwaitTask
            return 
                allVehicleComponents 
                |> Seq.filter (fun c -> c.IsInstalled)
                |> Seq.toList
        }
    
    // Check if component exists with given part number
    let ComponentExistsByPartNumberAsync (repository: IComponentRepository) (partNumber: string) =
        async {
            let! components = repository.GetByPartNumberAsync partNumber |> Async.AwaitTask
            return not (Seq.isEmpty components)
        }
