namespace LifeOS.Domain.Garage

open LifeOS.Domain.Common
open System
open System.Threading.Tasks

// Domain Services for operations that span multiple aggregates
// These services orchestrate business rules that involve multiple entities

type IVehicleDomainService =
    abstract member InstallComponentAsync : Vehicle -> Component -> Task<Result<Vehicle * Component, DomainError>>
    abstract member RemoveComponentAsync : Vehicle -> Component -> string option -> Task<Result<Vehicle * Component, DomainError>>
    abstract member TransferComponentAsync : Vehicle -> Vehicle -> Component -> Task<Result<Vehicle * Vehicle * Component, DomainError>>

type VehicleDomainService(vehicleRepo: IVehicleRepository, componentRepo: IComponentRepository) =
    
    interface IVehicleDomainService with
        
        member _.InstallComponentAsync vehicle component =
            async {
                // Validate component can be installed
                match Component.canInstallOnVehicle component vehicle.Id with
                | Ok () ->
                    // Update component state
                    match component.InstallOnVehicle vehicle.Id with
                    | Ok updatedComponent ->
                        // Save changes
                        let! savedComponent = componentRepo.UpdateAsync updatedComponent |> Async.AwaitTask
                        
                        // Return updated entities
                        return Ok (vehicle, savedComponent)
                    | Error e -> return Error e
                | Error e -> return Error e
            } |> Async.StartAsTask
        
        member _.RemoveComponentAsync vehicle component storageLocation =
            async {
                // Validate component is installed on this vehicle
                match component.GetInstalledVehicleId() with
                | Some vehicleId when vehicleId = vehicle.Id ->
                    // Remove component
                    match component.RemoveFromVehicle storageLocation with
                    | Ok updatedComponent ->
                        let! savedComponent = componentRepo.UpdateAsync updatedComponent |> Async.AwaitTask
                        return Ok (vehicle, savedComponent)
                    | Error e -> return Error e
                | Some _ -> return Error (BusinessRuleViolation "Component is installed on a different vehicle")
                | None -> return Error (BusinessRuleViolation "Component is not installed on any vehicle")
            } |> Async.StartAsTask
        
        member _.TransferComponentAsync fromVehicle toVehicle component =
            async {
                // Validate component is installed on fromVehicle
                match component.GetInstalledVehicleId() with
                | Some vehicleId when vehicleId = fromVehicle.Id ->
                    // Remove from current vehicle
                    match component.RemoveFromVehicle None with
                    | Ok removedComponent ->
                        // Install on new vehicle
                        match removedComponent.InstallOnVehicle toVehicle.Id with
                        | Ok transferredComponent ->
                            let! savedComponent = componentRepo.UpdateAsync transferredComponent |> Async.AwaitTask
                            return Ok (fromVehicle, toVehicle, savedComponent)
                        | Error e -> return Error e
                    | Error e -> return Error e
                | Some _ -> return Error (BusinessRuleViolation "Component is installed on a different vehicle")
                | None -> return Error (BusinessRuleViolation "Component is not installed on any vehicle")
            } |> Async.StartAsTask

// Additional domain services for component management
type IComponentDomainService =
    abstract member ValidateComponentUniquenessAsync : string -> ComponentId option -> Task<bool>
    abstract member GetMaintenanceScheduleAsync : Component -> DateTime -> Task<MaintenanceRecord list>

type ComponentDomainService(componentRepo: IComponentRepository) =
    
    interface IComponentDomainService with
        
        member _.ValidateComponentUniquenessAsync partNumber excludeId =
            async {
                if String.IsNullOrEmpty(partNumber) then
                    return true // No part number means no uniqueness constraint
                else
                    let! existing = componentRepo.GetByPartNumberAsync partNumber |> Async.AwaitTask
                    let isUnique =
                        existing
                        |> Seq.forall (fun c -> 
                            match excludeId with
                            | Some excludeId when c.Id = excludeId -> true
                            | _ -> false)
                    return isUnique
            } |> Async.StartAsTask
        
        member _.GetMaintenanceScheduleAsync component currentDate =
            async {
                // This would typically query maintenance records
                // For now, return empty list - implementation would be in infrastructure
                return []
            } |> Async.StartAsTask

// Factory for creating domain services
module DomainServiceFactory =
    let createVehicleDomainService (vehicleRepo: IVehicleRepository) (componentRepo: IComponentRepository) =
        VehicleDomainService(vehicleRepo, componentRepo) :> IVehicleDomainService
    
    let createComponentDomainService (componentRepo: IComponentRepository) =
        ComponentDomainService(componentRepo) :> IComponentDomainService
