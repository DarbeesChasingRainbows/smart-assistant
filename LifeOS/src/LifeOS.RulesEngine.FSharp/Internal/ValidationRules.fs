namespace LifeOS.RulesEngine.Internal

open System
open FsToolkit.ErrorHandling

/// Internal validation rules using F# Result and computation expressions
[<RequireQualifiedAccess>]
module internal ValidationRules =

    /// Validate an allowance calculation request
    let validateAllowanceRequest 
        (childId: Guid) 
        (age: int) 
        (choresCompleted: int) 
        (totalChores: int) 
        (behaviorScore: int) 
        : Result<Age * ChoreCount * ChoreCount * BehaviorScore, RulesError> =
        result {
            let! validAge = Age.create age
            let! validCompleted = ChoreCount.create choresCompleted
            let! validTotal = ChoreCount.create totalChores
            let! validBehavior = BehaviorScore.create behaviorScore
            
            // Business rule: completed cannot exceed total
            do! if choresCompleted > totalChores then
                    Error (BusinessRuleViolation ("ChoreCompletion", "Completed chores cannot exceed total assigned"))
                else
                    Ok ()
            
            return (validAge, validCompleted, validTotal, validBehavior)
        }

    /// Validate a maintenance check request
    let validateMaintenanceRequest 
        (vehicleId: Guid) 
        (currentMileage: decimal) 
        (lastServiceDate: DateTime) 
        : Result<Mileage * DateTime, RulesError> =
        result {
            let! validMileage = Mileage.create currentMileage
            
            // Business rule: last service date cannot be in the future
            do! if lastServiceDate > DateTime.UtcNow then
                    Error (BusinessRuleViolation ("ServiceDate", "Last service date cannot be in the future"))
                else
                    Ok ()
            
            return (validMileage, lastServiceDate)
        }

    /// Validate maintenance priority request
    let validatePriorityRequest 
        (itemName: string) 
        (mileageOverdue: decimal) 
        (daysOverdue: int) 
        : Result<string * decimal * int, RulesError> =
        result {
            do! if String.IsNullOrWhiteSpace itemName then
                    Error (ValidationFailed ("ItemName", "Item name cannot be empty"))
                else
                    Ok ()
            
            do! if mileageOverdue < 0m then
                    Error (ValidationFailed ("MileageOverdue", "Mileage overdue cannot be negative"))
                else
                    Ok ()
            
            do! if daysOverdue < 0 then
                    Error (ValidationFailed ("DaysOverdue", "Days overdue cannot be negative"))
                else
                    Ok ()
            
            return (itemName, mileageOverdue, daysOverdue)
        }
