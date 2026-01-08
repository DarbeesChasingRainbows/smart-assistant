namespace LifeOS.RulesEngine.Contracts

open System
open System.Threading.Tasks

// ============================================
// DTOs - Defined FIRST (F# requires forward declaration)
// ============================================

/// <summary>
/// Request DTO for allowance calculation.
/// Pure C# record - no F# types.
/// </summary>
[<Sealed>]
type AllowanceCalculationRequest(childId: Guid, age: int, choresCompleted: int, totalChoresAssigned: int, behaviorScore: int) =
    member _.ChildId = childId
    member _.Age = age
    member _.ChoresCompleted = choresCompleted
    member _.TotalChoresAssigned = totalChoresAssigned
    member _.BehaviorScore = behaviorScore

/// <summary>
/// Response DTO for allowance calculation.
/// </summary>
[<Sealed>]
type AllowanceCalculationResponse(baseAmount: decimal, bonusAmount: decimal, deductions: decimal, finalAmount: decimal, breakdown: string array) =
    member _.BaseAmount = baseAmount
    member _.BonusAmount = bonusAmount
    member _.Deductions = deductions
    member _.FinalAmount = finalAmount
    member _.Breakdown = breakdown

/// <summary>
/// Response DTO for bonus eligibility check.
/// </summary>
[<Sealed>]
type BonusEligibilityResponse(isEligible: bool, reason: string, potentialBonusAmount: decimal) =
    member _.IsEligible = isEligible
    member _.Reason = reason
    member _.PotentialBonusAmount = potentialBonusAmount

/// <summary>
/// A single maintenance item.
/// </summary>
[<Sealed>]
type MaintenanceItem(name: string, category: string, priority: int, estimatedCost: decimal) =
    member _.Name = name
    member _.Category = category
    member _.Priority = priority
    member _.EstimatedCost = estimatedCost

/// <summary>
/// Request DTO for maintenance check.
/// </summary>
[<Sealed>]
type MaintenanceCheckRequest(vehicleId: Guid, currentMileage: decimal, lastServiceDate: DateTime) =
    member _.VehicleId = vehicleId
    member _.CurrentMileage = currentMileage
    member _.LastServiceDate = lastServiceDate

/// <summary>
/// Response DTO for maintenance check.
/// </summary>
[<Sealed>]
type MaintenanceCheckResponse(isDue: bool, dueItems: MaintenanceItem array, nextServiceMileage: decimal, nextServiceDate: DateTime) =
    member _.IsDue = isDue
    member _.DueItems = dueItems
    member _.NextServiceMileage = nextServiceMileage
    member _.NextServiceDate = nextServiceDate

/// <summary>
/// Request DTO for maintenance priority calculation.
/// </summary>
[<Sealed>]
type MaintenancePriorityRequest(itemName: string, mileageOverdue: decimal, daysOverdue: int, isSafetyRelated: bool) =
    member _.ItemName = itemName
    member _.MileageOverdue = mileageOverdue
    member _.DaysOverdue = daysOverdue
    member _.IsSafetyRelated = isSafetyRelated

// ============================================
// Result Type - C#-friendly wrapper
// ============================================

/// <summary>
/// Result of a rules engine operation.
/// This is a C#-friendly class - no F# types exposed.
/// </summary>
[<Sealed>]
type RulesResult<'T> private (success: bool, value: 'T, errorCode: string, errorMessage: string) =
    
    member _.IsSuccess = success
    member _.IsFailure = not success
    member _.Value = value
    member _.ErrorCode = errorCode
    member _.ErrorMessage = errorMessage
    
    static member Success(value: 'T) = 
        RulesResult<'T>(true, value, null, null)
    
    static member Failure(errorCode: string, errorMessage: string) = 
        RulesResult<'T>(false, Unchecked.defaultof<'T>, errorCode, errorMessage)

// ============================================
// Interfaces - Defined AFTER DTOs they reference
// ============================================

/// <summary>
/// Interface for calculating child allowances based on business rules.
/// Implement this in F# but expose only C# primitives.
/// </summary>
type IAllowanceRulesEngine =
    
    /// <summary>
    /// Calculate weekly allowance for a child based on age, chores completed, and behavior score.
    /// </summary>
    abstract member CalculateWeeklyAllowanceAsync: request: AllowanceCalculationRequest -> Task<RulesResult<AllowanceCalculationResponse>>
    
    /// <summary>
    /// Determine if a child is eligible for bonus allowance.
    /// </summary>
    abstract member CheckBonusEligibilityAsync: childId: Guid * weekEndingDate: DateTime -> Task<RulesResult<BonusEligibilityResponse>>

/// <summary>
/// Interface for vehicle maintenance rules.
/// </summary>
type IMaintenanceRulesEngine =
    
    /// <summary>
    /// Determine what maintenance is due for a vehicle based on mileage and time.
    /// </summary>
    abstract member GetDueMaintenanceAsync: request: MaintenanceCheckRequest -> Task<RulesResult<MaintenanceCheckResponse>>
    
    /// <summary>
    /// Calculate priority score for a maintenance item.
    /// </summary>
    abstract member CalculateMaintenancePriorityAsync: request: MaintenancePriorityRequest -> Task<RulesResult<int>>
