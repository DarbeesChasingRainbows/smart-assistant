namespace LifeOS.RulesEngine.Adapters

open System
open System.Threading.Tasks
open LifeOS.RulesEngine.Contracts
open LifeOS.RulesEngine.Internal
open FsToolkit.ErrorHandling

/// F# implementation of IAllowanceRulesEngine
/// This is the BOUNDARY ADAPTER - implements C# interface, handles all interop
/// No F# types (Option, Result, DU) leak past this class
[<Sealed>]
type AllowanceRulesEngine() =
    
    interface IAllowanceRulesEngine with
        
        member _.CalculateWeeklyAllowanceAsync(request: AllowanceCalculationRequest) : Task<RulesResult<AllowanceCalculationResponse>> =
            task {
                // Step 1: Validate input (F# Result internally)
                let validationResult = 
                    ValidationRules.validateAllowanceRequest 
                        request.ChildId 
                        request.Age 
                        request.ChoresCompleted 
                        request.TotalChoresAssigned 
                        request.BehaviorScore
                
                // Step 2: Execute business logic if valid
                let result =
                    validationResult
                    |> Result.map (fun (age, completed, total, behavior) ->
                        // Pure domain logic
                        BusinessRules.calculateAllowance 
                            request.ChildId 
                            age 
                            completed 
                            total 
                            behavior
                    )
                    |> Result.map Mappers.allowanceToDto
                
                // Step 3: Convert F# Result to C# RulesResult at the boundary
                return Mappers.resultToRulesResult result
            }
        
        member _.CheckBonusEligibilityAsync(childId: Guid, weekEndingDate: DateTime) : Task<RulesResult<BonusEligibilityResponse>> =
            task {
                // For demo purposes, using default values
                // In real implementation, this would fetch from a repository
                let result = result {
                    let! age = Age.create 10
                    let! completed = ChoreCount.create 5
                    let! total = ChoreCount.create 5
                    let! behavior = BehaviorScore.create 95
                    
                    let category = Age.toCategory age
                    let completionRate = ChoreCount.completionRate completed total
                    let behaviorRating = BehaviorScore.toRating behavior
                    
                    let (isEligible, reason, amount) = 
                        BusinessRules.checkBonusEligibility completionRate behaviorRating category
                    
                    return Mappers.bonusEligibilityToDto (isEligible, reason, amount)
                }
                
                return Mappers.resultToRulesResult result
            }
