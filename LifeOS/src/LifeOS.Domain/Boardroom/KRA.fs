namespace LifeOS.Domain.Boardroom

open LifeOS.Domain.Common
open System

// KRA (Key Result Area) Aggregate - Strategic focus areas
type KRA = {
    Id: KRAId
    VisionId: VisionId
    Title: string
    Description: string
    Category: KRACategory
    OwnerId: UserId
    Status: KRAStatus
    Weight: Weight // Relative importance within vision
    TargetCompletionDate: DateTime option
    ActualCompletionDate: DateTime option
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.Start () =
        match this.Status with
        | NotStarted ->
            Ok { this with 
                Status = InProgress
                UpdatedAt = DateTime.utcNow()
            }
        | _ -> Error (BusinessRuleViolation "Only not started KRAs can be started")
    
    member this.MarkAtRisk (reason: string) =
        match this.Status with
        | InProgress ->
            Ok { this with 
                Status = AtRisk
                UpdatedAt = DateTime.utcNow()
            }
        | _ -> Error (BusinessRuleViolation "Only in-progress KRAs can be marked as at risk")
    
    member this.Complete (completionDate: DateTime) =
        match this.Status with
        | InProgress | AtRisk ->
            Ok { this with 
                Status = Completed
                ActualCompletionDate = Some completionDate
                UpdatedAt = completionDate
            }
        | _ -> Error (BusinessRuleViolation "Only in-progress or at-risk KRAs can be completed")
    
    member this.Cancel (reason: string) =
        match this.Status with
        | status when status <> Completed && status <> Cancelled ->
            Ok { this with 
                Status = Cancelled
                UpdatedAt = DateTime.utcNow()
            }
        | _ -> Error (BusinessRuleViolation "Cannot cancel completed KRAs")
    
    member this.UpdateWeight (newWeight: Weight) =
        Ok { this with 
            Weight = newWeight
            UpdatedAt = DateTime.utcNow()
        }
    
    member this.SetTargetDate (targetDate: DateTime) =
        if targetDate < DateTime.utcNow() then
            Error (ValidationError "Target date cannot be in the past")
        else
            Ok { this with 
                TargetCompletionDate = Some targetDate
                UpdatedAt = DateTime.utcNow()
            }
    
    member this.IsOverdue (currentDate: DateTime) =
        match this.TargetCompletionDate, this.Status with
        | Some targetDate, status when status <> Completed && status <> Cancelled ->
            currentDate > targetDate
        | _ -> false
    
    member this.GetDaysUntilTarget (currentDate: DateTime) =
        match this.TargetCompletionDate with
        | Some targetDate -> (targetDate - currentDate).Days
        | None -> 0
    
    member this.GetProgressPercentage (kpis: KPI seq) =
        let kraKPIs = kpis |> Seq.filter (fun k -> k.KRAId = this.Id)
        if Seq.isEmpty kraKPIs then 0m
        else
            let totalWeight = kraKPIs |> Seq.sumBy (fun k -> Weight.value k.Weight)
            if totalWeight = 0m then 0m
            else
                let weightedProgress = 
                    kraKPIs
                    |> Seq.sumBy (fun kpi ->
                        let progress = kpi.GetProgressPercentage()
                        Weight.value kpi.Weight * progress)
                
                weightedProgress / totalWeight

// KRA Module for factory methods
module KRA =
    let create visionId title description category ownerId weight targetDate =
        result {
            if String.IsNullOrEmpty(title) then
                return! Error (ValidationError "KRA title is required")
            
            let! validatedWeight = Weight.create weight
            
            return {
                Id = BoardroomId.createKRAId()
                VisionId = visionId
                Title = title
                Description = description
                Category = category
                OwnerId = ownerId
                Status = NotStarted
                Weight = validatedWeight
                TargetCompletionDate = targetDate
                ActualCompletionDate = None
                CreatedAt = DateTime.utcNow()
                UpdatedAt = DateTime.utcNow()
            }
        }
    
    // Business rules
    let canAddKPIs (kra: KRA) =
        match kra.Status with
        | NotStarted | InProgress | AtRisk -> true
        | Completed | Cancelled -> false
    
    let validateWeightDistribution (kras: KRA seq) =
        let totalWeight = kras |> Seq.sumBy (fun k -> Weight.value k.Weight)
        if totalWeight > 1m then
            Error (BusinessRuleViolation "Total KRA weights cannot exceed 100%")
        elif totalWeight < 0.95m then
            Error (BusinessRuleViolation "Total KRA weights should be at least 95%")
        else
            Ok ()
    
    let getFinancialImpact (kra: KRA) (transactions: FinancialTransaction seq) =
        transactions
        |> Seq.filter (fun t -> t.KRAId = Some kra.Id)
        |> Seq.sumBy (fun t -> 
            match t.Type with
            | Income | Investment -> t.Amount
            | Expense -> -t.Amount
            | Transfer | Adjustment -> 0m)
    
    let getOwnerWorkload (userId: UserId) (kras: KRA seq) =
        kras
        |> Seq.filter (fun k -> k.OwnerId = userId && k.Status = InProgress)
        |> Seq.length
    
    let getRiskFactors (kra: KRA) (kpis: KPI seq) =
        let kraKPIs = kpis |> Seq.filter (fun k -> k.KRAId = kra.Id)
        let riskKPIs = kraKPIs |> Seq.filter (fun k -> k.Status = BelowTarget)
        
        if Seq.isEmpty riskKPIs then []
        else
            riskKPIs
            |> Seq.map (fun (kpi: KPI) -> 
                {
                    KPIId = kpi.Id
                    KPIName = kpi.Name
                    RiskLevel = 
                        if kpi.GetProgressPercentage() < 25m then "Critical"
                        elif kpi.GetProgressPercentage() < 50m then "High"
                        elif kpi.GetProgressPercentage() < 75m then "Medium"
                        else "Low"
                    CurrentValue = kpi.CurrentValue
                    TargetValue = kpi.TargetValue
                } : RiskFactor)
            |> Seq.toList
