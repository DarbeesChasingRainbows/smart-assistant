namespace LifeOS.RulesEngine.Internal

open System

/// Pure business rules - no side effects, no I/O
/// All logic uses internal F# types (DUs, Options, Results)
[<RequireQualifiedAccess>]
module internal BusinessRules =

    // ============================================
    // Allowance Calculation Rules
    // ============================================
    
    /// Base allowance amounts by age category
    let private baseAllowanceByCategory = function
        | Toddler -> Money.zero
        | YoungChild -> Money.create 3.00m |> Result.defaultValue Money.zero
        | Child -> Money.create 5.00m |> Result.defaultValue Money.zero
        | Teenager -> Money.create 10.00m |> Result.defaultValue Money.zero
        | Adult -> Money.zero
    
    /// Bonus multiplier based on chore completion rate
    let private choreBonus (rate: ChoreCompletionRate) (baseAmount: Money) : Money =
        let multiplier =
            match rate with
            | Perfect -> 0.25m           // 25% bonus for perfect
            | ChoreCompletionRate.Excellent -> 0.15m  // 15% bonus
            | ChoreCompletionRate.Good -> 0.05m       // 5% bonus
            | Partial -> 0.0m            // No bonus
            | ChoreCompletionRate.Poor -> 0.0m        // No bonus
        Money.multiply baseAmount multiplier
    
    /// Deduction based on behavior rating
    let private behaviorDeduction (rating: BehaviorRating) (baseAmount: Money) : Money =
        let deductionRate =
            match rating with
            | BehaviorRating.Excellent -> 0.0m   // No deduction
            | BehaviorRating.Good -> 0.0m        // No deduction
            | BehaviorRating.NeedsWork -> 0.10m  // 10% deduction
            | BehaviorRating.Poor -> 0.25m       // 25% deduction
        Money.multiply baseAmount deductionRate
    
    /// Calculate full allowance with breakdown
    let calculateAllowance 
        (childId: Guid)
        (age: Age) 
        (choresCompleted: ChoreCount) 
        (totalChores: ChoreCount) 
        (behaviorScore: BehaviorScore) 
        : AllowanceCalculation =
        
        let category = Age.toCategory age
        let completionRate = ChoreCount.completionRate choresCompleted totalChores
        let behaviorRating = BehaviorScore.toRating behaviorScore
        
        let baseAmount = baseAllowanceByCategory category
        let bonus = choreBonus completionRate baseAmount
        let deduction = behaviorDeduction behaviorRating baseAmount
        
        let finalAmount = 
            baseAmount 
            |> Money.add bonus 
            |> fun m -> Money.subtract m deduction
        
        let breakdown = [
            sprintf "Age %d → Category: %A → Base: $%.2f" (Age.value age) category (Money.value baseAmount)
            sprintf "Chores: %d/%d → Rate: %A → Bonus: $%.2f" 
                (ChoreCount.value choresCompleted) 
                (ChoreCount.value totalChores) 
                completionRate 
                (Money.value bonus)
            sprintf "Behavior: %d → Rating: %A → Deduction: $%.2f" 
                (BehaviorScore.value behaviorScore) 
                behaviorRating 
                (Money.value deduction)
            sprintf "Final Amount: $%.2f" (Money.value finalAmount)
        ]
        
        {
            ChildId = childId
            Age = age
            Category = category
            ChoresCompleted = choresCompleted
            TotalChores = totalChores
            CompletionRate = completionRate
            BehaviorScore = behaviorScore
            BehaviorRating = behaviorRating
            BaseAmount = baseAmount
            BonusAmount = bonus
            Deductions = deduction
            FinalAmount = finalAmount
            Breakdown = breakdown
        }
    
    /// Check if child is eligible for bonus
    let checkBonusEligibility 
        (completionRate: ChoreCompletionRate) 
        (behaviorRating: BehaviorRating) 
        (category: AllowanceCategory) 
        : bool * string * Money =
        
        match category with
        | Toddler | Adult -> 
            (false, "Not eligible for allowance program", Money.zero)
        | _ ->
            match completionRate, behaviorRating with
            | Perfect, BehaviorRating.Excellent -> 
                let bonus = Money.create 2.00m |> Result.defaultValue Money.zero
                (true, "Perfect chores and excellent behavior!", bonus)
            | Perfect, BehaviorRating.Good ->
                let bonus = Money.create 1.00m |> Result.defaultValue Money.zero
                (true, "Perfect chore completion", bonus)
            | ChoreCompletionRate.Excellent, BehaviorRating.Excellent ->
                let bonus = Money.create 1.00m |> Result.defaultValue Money.zero
                (true, "Excellent performance overall", bonus)
            | _ ->
                (false, "Keep up the good work to earn bonuses!", Money.zero)
    
    // ============================================
    // Maintenance Rules
    // ============================================
    
    /// Standard maintenance intervals (in miles)
    let private maintenanceIntervals = [
        ("Oil Change", OilChange, 5000m, 90)
        ("Tire Rotation", TireRotation, 7500m, 180)
        ("Brake Inspection", BrakeInspection, 15000m, 365)
        ("Fluid Check", FluidCheck, 10000m, 180)
        ("Air Filter", FilterReplacement, 15000m, 365)
        ("Battery Check", BatteryCheck, 25000m, 365)
    ]
    
    /// Estimated costs by category
    let private estimatedCost = function
        | OilChange -> Money.create 50m |> Result.defaultValue Money.zero
        | TireRotation -> Money.create 30m |> Result.defaultValue Money.zero
        | BrakeInspection -> Money.create 100m |> Result.defaultValue Money.zero
        | FluidCheck -> Money.create 25m |> Result.defaultValue Money.zero
        | FilterReplacement -> Money.create 40m |> Result.defaultValue Money.zero
        | BatteryCheck -> Money.create 20m |> Result.defaultValue Money.zero
        | GeneralInspection -> Money.create 75m |> Result.defaultValue Money.zero
        | Other _ -> Money.create 50m |> Result.defaultValue Money.zero
    
    /// Determine urgency based on how overdue
    let private determineUrgency (mileageOverdue: decimal) (daysOverdue: int) (isSafety: bool) : MaintenanceUrgency =
        if isSafety && (mileageOverdue > 1000m || daysOverdue > 30) then Critical
        elif mileageOverdue > 2000m || daysOverdue > 60 then High
        elif mileageOverdue > 0m || daysOverdue > 0 then Medium
        else Low
    
    /// Check what maintenance is due
    let checkDueMaintenance 
        (vehicleId: Guid)
        (currentMileage: Mileage) 
        (lastServiceDate: DateTime) 
        (lastServiceMileage: Mileage option)
        : MaintenanceCheck =
        
        let mileageSinceLast = 
            lastServiceMileage 
            |> Option.map (fun lsm -> Mileage.difference currentMileage lsm)
            |> Option.defaultValue (Mileage.value currentMileage)
        
        let daysSinceLast = (DateTime.UtcNow - lastServiceDate).Days
        
        let dueItems =
            maintenanceIntervals
            |> List.choose (fun (name, category, mileageInterval, dayInterval) ->
                let mileageOverdue = mileageSinceLast - mileageInterval
                let daysOverdue = daysSinceLast - dayInterval
                
                if mileageOverdue > 0m || daysOverdue > 0 then
                    let isSafety = 
                        match category with
                        | BrakeInspection | TireRotation -> true
                        | _ -> false
                    
                    Some {
                        Name = name
                        Category = category
                        Urgency = determineUrgency mileageOverdue daysOverdue isSafety
                        EstimatedCost = estimatedCost category
                    }
                else
                    None
            )
        
        // Calculate next service (earliest upcoming)
        let nextMileage = 
            Mileage.create ((Mileage.value currentMileage) + 5000m) 
            |> Result.defaultValue currentMileage
        
        let nextDate = DateTime.UtcNow.AddDays(90.0)
        
        {
            VehicleId = vehicleId
            CurrentMileage = currentMileage
            LastServiceDate = lastServiceDate
            DueItems = dueItems
            NextServiceMileage = nextMileage
            NextServiceDate = nextDate
        }
    
    /// Calculate priority score (1-10)
    let calculateMaintenancePriority 
        (mileageOverdue: decimal) 
        (daysOverdue: int) 
        (isSafetyRelated: bool) 
        : int =
        
        let basePriority =
            if isSafetyRelated then 7
            elif mileageOverdue > 5000m || daysOverdue > 180 then 6
            elif mileageOverdue > 2000m || daysOverdue > 90 then 4
            elif mileageOverdue > 0m || daysOverdue > 0 then 2
            else 1
        
        let safetyBonus = if isSafetyRelated && (mileageOverdue > 1000m || daysOverdue > 30) then 3 else 0
        
        min 10 (basePriority + safetyBonus)
