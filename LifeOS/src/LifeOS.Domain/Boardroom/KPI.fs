namespace LifeOS.Domain.Boardroom

open LifeOS.Domain.Common
open System

// KPI (Key Performance Indicator) Aggregate - Specific metrics
type KPI = {
    Id: KPIId
    KRAId: KRAId
    Name: string
    Description: string
    Type: KPIType
    MeasurementFrequency: MeasurementFrequency
    Weight: Weight // Relative importance within KRA
    TargetValue: TargetValue
    CurrentValue: CurrentValue
    Unit: string option // e.g., "$", "%", "units", "hours"
    Status: KPIStatus
    OwnerId: UserId
    BaselineValue: decimal option
    StretchTarget: decimal option
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.UpdateValue (newValue: decimal) (measuredDate: DateTime) (measuredBy: UserId) =
        let validatedValue = 
            match CurrentValue.create newValue with
            | Ok v -> v
            | Error _ -> CurrentValue newValue
        
        let newStatus = 
            if newValue > decimal (TargetValue.value this.TargetValue) then
                if this.StretchTarget |> Option.exists (fun stretch -> newValue >= stretch) then
                    Exceeded
                else
                    AboveTarget
            elif newValue = decimal (TargetValue.value this.TargetValue) then
                OnTrack
            elif newValue > decimal (TargetValue.value this.TargetValue) * 0.8m then
                OnTrack
            else
                BelowTarget
        
        Ok
            { this with
                CurrentValue = validatedValue
                Status = newStatus
                UpdatedAt = measuredDate
            }
    
    member this.SetTarget (newTarget: decimal) =
        let validatedTarget = 
            match TargetValue.create newTarget with
            | Ok v -> v
            | Error _ -> TargetValue newTarget
        Ok
            { this with
                TargetValue = validatedTarget
                UpdatedAt = DateTime.utcNow()
            }
    
    member this.SetStretchTarget (stretchTarget: decimal) =
        if stretchTarget <= decimal (TargetValue.value this.TargetValue) then
            Error (ValidationError "Stretch target must be greater than target")
        else
            Ok
                { this with
                    StretchTarget = Some stretchTarget
                    UpdatedAt = DateTime.utcNow()
                }
    
    member this.SetBaseline (baseline: decimal) =
        Ok
            { this with
                BaselineValue = Some baseline
                UpdatedAt = DateTime.utcNow()
            }
    
    member this.GetProgressPercentage () =
        let target = decimal (TargetValue.value this.TargetValue)
        if target = 0m then 0m
        else
            let current = decimal (CurrentValue.value this.CurrentValue)
            min 100m (current / target * 100m)
    
    member this.GetVariance () =
        let target = decimal (TargetValue.value this.TargetValue)
        let current = decimal (CurrentValue.value this.CurrentValue)
        current - target
    
    member this.IsOnTrack () =
        match this.Status with
        | OnTrack | AboveTarget | Exceeded -> true
        | _ -> false
    
    member this.GetTrend (measurements: KPIMeasurement seq) =
        let recentMeasurements = 
            measurements
            |> Seq.sortByDescending (fun m -> m.MeasuredAt)
            |> Seq.take 3
            |> Seq.toList
        
        if List.length recentMeasurements < 2 then
            "Insufficient data"
        else
            let values = recentMeasurements |> List.map (fun m -> m.Value)
            let first = values.[0]
            let last = values.[List.length values - 1]
            
            if first > last then "Decreasing"
            elif first < last then "Increasing"
            else "Stable"

// KPI Module for factory methods
module KPI =
    let create kraId name description kpiType measurementFrequency weight targetValue unit ownerId baselineValue stretchTarget =
        result {
            if String.IsNullOrEmpty(name) then
                return! Error (ValidationError "KPI name is required")
            
            let! validatedWeight = Weight.create weight
            let! validatedTarget = TargetValue.create targetValue
            let! validatedCurrent = CurrentValue.create 0m
            
            return {
                Id = BoardroomId.createKPIId()
                KRAId = kraId
                Name = name
                Description = description
                Type = kpiType
                MeasurementFrequency = measurementFrequency
                Weight = validatedWeight
                TargetValue = validatedTarget
                CurrentValue = validatedCurrent
                Unit = unit
                Status = NotMeasured
                OwnerId = ownerId
                BaselineValue = baselineValue
                StretchTarget = stretchTarget
                CreatedAt = DateTime.utcNow()
                UpdatedAt = DateTime.utcNow()
            }
        }
    
    // Business rules
    let canMeasure (kpi: KPI) =
        kpi.Type <> Qualitative
    
    let getRecommendedFrequency (kpiType: KPIType) =
        match kpiType with
        | Financial -> Monthly
        | Operational -> Weekly
        | Customer -> Monthly
        | Leading -> Weekly
        | Lagging -> Monthly
        | Qualitative -> Quarterly
        | Quantitative -> Monthly
    
    let calculateScore (kpi: KPI) =
        match kpi.Status with
        | Exceeded -> 1.5m
        | AboveTarget -> 1.25m
        | OnTrack -> 1.0m
        | BelowTarget -> 0.5m
        | NotMeasured -> 0m
    
    let getFinancialKPIs (kpis: KPI seq) =
        kpis
        |> Seq.filter (fun k -> k.Type = Financial)
        |> Seq.toList
    
    let getOperationalKPIs (kpis: KPI seq) =
        kpis
        |> Seq.filter (fun k -> k.Type = Operational)
        |> Seq.toList
    
    let getCustomerKPIs (kpis: KPI seq) =
        kpis
        |> Seq.filter (fun k -> k.Type = Customer)
        |> Seq.toList
    
    let getKPIsByOwner (kpis: KPI seq) (ownerId: UserId) =
        kpis
        |> Seq.filter (fun k -> k.OwnerId = ownerId)
        |> Seq.toList
    
    let getRedFlags (kpis: KPI seq) =
        kpis
        |> Seq.filter (fun k -> k.Status = BelowTarget)
        |> Seq.filter (fun k -> k.GetProgressPercentage() < 50m)
        |> Seq.map (fun (k: KPI) -> 
            {
                KPIId = k.Id
                Name = k.Name
                CurrentValue = CurrentValue.value k.CurrentValue
                TargetValue = TargetValue.value k.TargetValue
                Variance = k.GetVariance()
            } : RedFlag)
        |> Seq.toList

// KPI performance summary
type KPIPerformanceSummary = {
    KPIId: KPIId
    Name: string
    Type: KPIType
    CurrentValue: decimal
    TargetValue: decimal
    ProgressPercentage: decimal
    Status: KPIStatus
    Trend: string
    LastMeasured: DateTime option
    Score: decimal
}

// KPI performance module
module KPIPerformanceSummary =
    let fromKPI (kpi: KPI) (measurements: KPIMeasurement seq) =
        let lastMeasured = 
            measurements
            |> Seq.tryHead
            |> Option.map (fun m -> m.MeasuredAt)
        
        {
            KPIId = kpi.Id
            Name = kpi.Name
            Type = kpi.Type
            CurrentValue = decimal (CurrentValue.value kpi.CurrentValue)
            TargetValue = decimal (TargetValue.value kpi.TargetValue)
            ProgressPercentage = kpi.GetProgressPercentage()
            Status = kpi.Status
            Trend = kpi.GetTrend measurements
            LastMeasured = lastMeasured
            Score = KPI.calculateScore kpi
        }
