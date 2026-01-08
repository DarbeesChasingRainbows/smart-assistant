namespace LifeOS.RulesEngine.Internal

open System

/// Internal F# domain types - NEVER exposed to C#
/// These types use F# idioms: DUs, Options, Results
[<AutoOpen>]
module internal DomainTypes =

    // ============================================
    // Single-Case Unions for Type Safety
    // ============================================
    
    type Age = private Age of int
    type BehaviorScore = private BehaviorScore of int
    type ChoreCount = private ChoreCount of int
    type Mileage = private Mileage of decimal
    type Money = private Money of decimal
    type Priority = private Priority of int
    
    // ============================================
    // Discriminated Unions for Domain Concepts
    // ============================================
    
    type AllowanceCategory =
        | Toddler       // 0-4: No allowance
        | YoungChild    // 5-7: Small allowance
        | Child         // 8-12: Standard allowance
        | Teenager      // 13-17: Higher allowance
        | Adult         // 18+: No longer eligible
    
    type BehaviorRating =
        | Excellent     // 90-100
        | Good          // 70-89
        | NeedsWork     // 50-69
        | Poor          // 0-49
    
    type ChoreCompletionRate =
        | Perfect       // 100%
        | Excellent     // 90-99%
        | Good          // 70-89%
        | Partial       // 50-69%
        | Poor          // <50%
    
    type MaintenanceCategory =
        | OilChange
        | TireRotation
        | BrakeInspection
        | FluidCheck
        | FilterReplacement
        | BatteryCheck
        | GeneralInspection
        | Other of string
    
    type MaintenanceUrgency =
        | Critical      // Safety issue, do immediately
        | High          // Overdue, schedule soon
        | Medium        // Coming due
        | Low           // Preventive, can wait
    
    // ============================================
    // Domain Error Types (Internal)
    // ============================================
    
    type RulesError =
        | ValidationFailed of field: string * message: string
        | BusinessRuleViolation of rule: string * message: string
        | NotFound of entity: string * id: Guid
        | InvalidAge of age: int
        | InvalidMileage of mileage: decimal
        | InvalidScore of score: int
    
    // ============================================
    // Smart Constructors with Validation
    // ============================================
    
    module Age =
        let create (value: int) : Result<Age, RulesError> =
            if value < 0 then Error (InvalidAge value)
            elif value > 150 then Error (InvalidAge value)
            else Ok (Age value)
        
        let value (Age a) = a
        
        let toCategory (Age a) : AllowanceCategory =
            match a with
            | x when x < 5 -> Toddler
            | x when x < 8 -> YoungChild
            | x when x < 13 -> Child
            | x when x < 18 -> Teenager
            | _ -> Adult
    
    module BehaviorScore =
        let create (value: int) : Result<BehaviorScore, RulesError> =
            if value < 0 || value > 100 then Error (InvalidScore value)
            else Ok (BehaviorScore value)
        
        let value (BehaviorScore s) = s
        
        let toRating (BehaviorScore s) : BehaviorRating =
            match s with
            | x when x >= 90 -> BehaviorRating.Excellent
            | x when x >= 70 -> BehaviorRating.Good
            | x when x >= 50 -> BehaviorRating.NeedsWork
            | _ -> BehaviorRating.Poor
    
    module ChoreCount =
        let create (value: int) : Result<ChoreCount, RulesError> =
            if value < 0 then 
                Error (ValidationFailed ("ChoreCount", "Cannot be negative"))
            else 
                Ok (ChoreCount value)
        
        let value (ChoreCount c) = c
        
        let completionRate (completed: ChoreCount) (total: ChoreCount) : ChoreCompletionRate =
            let (ChoreCount c) = completed
            let (ChoreCount t) = total
            if t = 0 then Perfect
            else
                let rate = (float c / float t) * 100.0
                match rate with
                | r when r >= 100.0 -> Perfect
                | r when r >= 90.0 -> ChoreCompletionRate.Excellent
                | r when r >= 70.0 -> ChoreCompletionRate.Good
                | r when r >= 50.0 -> Partial
                | _ -> ChoreCompletionRate.Poor
    
    module Mileage =
        let create (value: decimal) : Result<Mileage, RulesError> =
            if value < 0m then Error (InvalidMileage value)
            else Ok (Mileage value)
        
        let value (Mileage m) = m
        
        let difference (Mileage current) (Mileage last) = current - last
    
    module Money =
        let create (value: decimal) : Result<Money, RulesError> =
            if value < 0m then 
                Error (ValidationFailed ("Money", "Cannot be negative"))
            else 
                Ok (Money value)
        
        let zero = Money 0m
        let value (Money m) = m
        let add (Money a) (Money b) = Money (a + b)
        let subtract (Money a) (Money b) = Money (max 0m (a - b))
        let multiply (Money m) (factor: decimal) = Money (m * factor)
    
    module Priority =
        let create (value: int) : Result<Priority, RulesError> =
            if value < 1 || value > 10 then 
                Error (ValidationFailed ("Priority", "Must be between 1 and 10"))
            else 
                Ok (Priority value)
        
        let value (Priority p) = p
        let critical = Priority 10
        let high = Priority 8
        let medium = Priority 5
        let low = Priority 2
    
    // ============================================
    // Domain Aggregates (Internal Records)
    // ============================================
    
    type AllowanceCalculation = {
        ChildId: Guid
        Age: Age
        Category: AllowanceCategory
        ChoresCompleted: ChoreCount
        TotalChores: ChoreCount
        CompletionRate: ChoreCompletionRate
        BehaviorScore: BehaviorScore
        BehaviorRating: BehaviorRating
        BaseAmount: Money
        BonusAmount: Money
        Deductions: Money
        FinalAmount: Money
        Breakdown: string list
    }
    
    type MaintenanceCheck = {
        VehicleId: Guid
        CurrentMileage: Mileage
        LastServiceDate: DateTime
        DueItems: MaintenanceItemInternal list
        NextServiceMileage: Mileage
        NextServiceDate: DateTime
    }
    
    and MaintenanceItemInternal = {
        Name: string
        Category: MaintenanceCategory
        Urgency: MaintenanceUrgency
        EstimatedCost: Money
    }
