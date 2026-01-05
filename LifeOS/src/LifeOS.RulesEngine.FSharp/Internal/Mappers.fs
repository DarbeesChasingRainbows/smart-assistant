namespace LifeOS.RulesEngine.Internal

open System
open LifeOS.RulesEngine.Contracts

/// Mappers that convert between internal F# types and external C# DTOs
/// This is the BOUNDARY - all F# types are converted here
[<RequireQualifiedAccess>]
module internal Mappers =

    // ============================================
    // Error Mapping (F# RulesError → C# RulesResult)
    // ============================================
    
    /// Convert internal F# error to C#-friendly error code and message
    let errorToCodeAndMessage (error: RulesError) : string * string =
        match error with
        | ValidationFailed (field, msg) -> 
            (ErrorCodes.ValidationError, sprintf "%s: %s" field msg)
        | BusinessRuleViolation (rule, msg) -> 
            (ErrorCodes.BusinessRuleViolation, sprintf "%s: %s" rule msg)
        | NotFound (entity, id) -> 
            (ErrorCodes.NotFound, sprintf "%s with ID %O not found" entity id)
        | InvalidAge age -> 
            (ErrorCodes.InvalidAge, sprintf "Invalid age: %d. Must be between 0 and 150." age)
        | InvalidMileage mileage -> 
            (ErrorCodes.InvalidMileage, sprintf "Invalid mileage: %M. Cannot be negative." mileage)
        | InvalidScore score -> 
            (ErrorCodes.InvalidScore, sprintf "Invalid score: %d. Must be between 0 and 100." score)
    
    /// Convert F# Result to C# RulesResult
    let resultToRulesResult<'T> (result: Result<'T, RulesError>) : RulesResult<'T> =
        match result with
        | Ok value -> RulesResult<'T>.Success(value)
        | Error err ->
            let (code, msg) = errorToCodeAndMessage err
            RulesResult<'T>.Failure(code, msg)
    
    // ============================================
    // Allowance Mapping
    // ============================================
    
    /// Convert internal AllowanceCalculation to C# DTO
    let allowanceToDto (calc: AllowanceCalculation) : AllowanceCalculationResponse =
        AllowanceCalculationResponse(
            Money.value calc.BaseAmount,
            Money.value calc.BonusAmount,
            Money.value calc.Deductions,
            Money.value calc.FinalAmount,
            calc.Breakdown |> List.toArray
        )
    
    /// Convert bonus eligibility result to C# DTO
    let bonusEligibilityToDto (isEligible: bool, reason: string, amount: Money) : BonusEligibilityResponse =
        BonusEligibilityResponse(isEligible, reason, Money.value amount)
    
    // ============================================
    // Maintenance Mapping
    // ============================================
    
    /// Convert internal MaintenanceCategory to string for C#
    let categoryToString = function
        | OilChange -> "Oil Change"
        | TireRotation -> "Tire Rotation"
        | BrakeInspection -> "Brake Inspection"
        | FluidCheck -> "Fluid Check"
        | FilterReplacement -> "Filter Replacement"
        | BatteryCheck -> "Battery Check"
        | GeneralInspection -> "General Inspection"
        | Other name -> name
    
    /// Convert internal MaintenanceUrgency to priority int
    let urgencyToPriority = function
        | Critical -> 10
        | High -> 8
        | Medium -> 5
        | Low -> 2
    
    /// Convert internal MaintenanceItemInternal to C# DTO
    let maintenanceItemToDto (item: MaintenanceItemInternal) : MaintenanceItem =
        MaintenanceItem(
            item.Name,
            categoryToString item.Category,
            urgencyToPriority item.Urgency,
            Money.value item.EstimatedCost
        )
    
    /// Convert internal MaintenanceCheck to C# DTO
    let maintenanceCheckToDto (check: MaintenanceCheck) : MaintenanceCheckResponse =
        let isDue = not (List.isEmpty check.DueItems)
        let dueItems = check.DueItems |> List.map maintenanceItemToDto |> List.toArray
        let nextMileage = Mileage.value check.NextServiceMileage
        MaintenanceCheckResponse(isDue, dueItems, nextMileage, check.NextServiceDate)
