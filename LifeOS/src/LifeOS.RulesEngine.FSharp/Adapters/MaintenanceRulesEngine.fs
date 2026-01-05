namespace LifeOS.RulesEngine.Adapters

open System
open System.Threading.Tasks
open LifeOS.RulesEngine.Contracts
open LifeOS.RulesEngine.Internal
open FsToolkit.ErrorHandling

/// F# implementation of IMaintenanceRulesEngine
/// This is the BOUNDARY ADAPTER - implements C# interface, handles all interop
/// No F# types (Option, Result, DU) leak past this class
[<Sealed>]
type MaintenanceRulesEngine() =
    
    interface IMaintenanceRulesEngine with
        
        member _.GetDueMaintenanceAsync(request: MaintenanceCheckRequest) : Task<RulesResult<MaintenanceCheckResponse>> =
            task {
                // Step 1: Validate input (F# Result internally)
                let validationResult = 
                    ValidationRules.validateMaintenanceRequest 
                        request.VehicleId 
                        request.CurrentMileage 
                        request.LastServiceDate
                
                // Step 2: Execute business logic if valid
                let result =
                    validationResult
                    |> Result.map (fun (mileage, lastDate) ->
                        // Pure domain logic - no side effects
                        BusinessRules.checkDueMaintenance 
                            request.VehicleId 
                            mileage 
                            lastDate 
                            None  // lastServiceMileage would come from repository
                    )
                    |> Result.map Mappers.maintenanceCheckToDto
                
                // Step 3: Convert F# Result to C# RulesResult at the boundary
                return Mappers.resultToRulesResult result
            }
        
        member _.CalculateMaintenancePriorityAsync(request: MaintenancePriorityRequest) : Task<RulesResult<int>> =
            task {
                // Step 1: Validate input
                let validationResult = 
                    ValidationRules.validatePriorityRequest 
                        request.ItemName 
                        request.MileageOverdue 
                        request.DaysOverdue
                
                // Step 2: Execute business logic if valid
                let result =
                    validationResult
                    |> Result.map (fun (_, mileageOverdue, daysOverdue) ->
                        BusinessRules.calculateMaintenancePriority 
                            mileageOverdue 
                            daysOverdue 
                            request.IsSafetyRelated
                    )
                
                // Step 3: Convert F# Result to C# RulesResult at the boundary
                return Mappers.resultToRulesResult result
            }
