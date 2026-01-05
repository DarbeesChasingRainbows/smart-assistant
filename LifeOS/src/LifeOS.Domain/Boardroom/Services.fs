namespace LifeOS.Domain.Boardroom

open LifeOS.Domain.Common
open System
open System.Threading.Tasks

// Domain Services for Boardroom operations
type IBoardroomDomainService =
    abstract member UpdateKPIValueAsync : KPI -> decimal -> DateTime -> UserId -> Task<Result<KPI * KPIMeasurement, DomainError>>
    abstract member GetExecutiveDashboardAsync : UserId -> Task<ExecutiveDashboard>
    abstract member CalculateROIAsync : KRA -> DateTime -> DateTime -> Task<decimal>

type BoardroomDomainService(
    visionRepo: IVisionRepository,
    kraRepo: IKRARepository,
    kpiRepo: IKPIRepository,
    financialRepo: IFinancialRepository,
    measurementRepo: IKPIMeasurementRepository) =
    
    interface IBoardroomDomainService with
        
        member _.UpdateKPIValueAsync kpi newValue measuredDate measuredBy =
            async {
                // Update KPI value
                match kpi.UpdateValue newValue measuredDate measuredBy with
                | Ok updatedKPI ->
                    // Create measurement record
                    let measurement = {
                        Id = Guid.NewGuid()
                        KPIId = kpi.Id
                        Value = newValue
                        MeasuredAt = measuredDate
                        MeasuredBy = measuredBy
                        Notes = None
                        CreatedAt = measuredDate
                    }
                    
                    // Save changes
                    let! savedKPI = kpiRepo.UpdateAsync updatedKPI |> Async.AwaitTask
                    let! savedMeasurement = measurementRepo.AddAsync measurement |> Async.AwaitTask
                    
                    return Ok (savedKPI, savedMeasurement)
                | Error e -> return Error e
            } |> Async.StartAsTask
        
        member _.GetExecutiveDashboardAsync userId =
            async {
                let! visions = visionRepo.GetByOwnerIdAsync userId |> Async.AwaitTask
                let! kras = kraRepo.GetByOwnerIdAsync userId |> Async.AwaitTask
                let! kpis = kpiRepo.GetByOwnerIdAsync userId |> Async.AwaitTask
                
                let activeVisions = visions |> Seq.filter (fun v -> v.Status = Active)
                let activeKRAs = kras |> Seq.filter (fun k -> k.Status = InProgress)
                let totalKPIs = Seq.length kpis
                let onTrackKPIs = kpis |> Seq.filter (fun k -> k.IsOnTrack()) |> Seq.length
                
                let! financialPerformances = 
                    activeVisions
                    |> Seq.map (fun vision -> 
                        BoardroomRepository.GetVisionFinancialPerformanceAsync kraRepo financialRepo vision.Id)
                    |> Async.Sequential
                
                let totalRevenue = financialPerformances |> Seq.sumBy (fun f -> f.TotalRevenue)
                let totalProfit = financialPerformances |> Seq.sumBy (fun f -> f.NetProfit)
                
                return {
                    UserId = userId
                    ActiveVisions = Seq.length activeVisions
                    ActiveKRAs = Seq.length activeKRAs
                    TotalKPIs = totalKPIs
                    OnTrackKPIs = onTrackKPIs
                    TotalRevenue = totalRevenue
                    TotalProfit = totalProfit
                    TopPerformingKRAs = 
                        activeKRAs
                        |> Seq.sortByDescending (fun k -> k.GetProgressPercentage kpis)
                        |> Seq.take 5
                        |> Seq.map (fun k -> {
                            KRAId = k.Id
                            Title = k.Title
                            Progress = k.GetProgressPercentage kpis
                            Status = k.Status
                        })
                        |> Seq.toList
                    CriticalKPIs = KPI.getRedFlags (Seq.toList kpis)
                }
            } |> Async.StartAsTask
        
        member _.CalculateROIAsync kra startDate endDate =
            async {
                let! investments = financialRepo.GetByDateRangeAsync startDate endDate |> Async.AwaitTask
                let! kraInvestments = financialRepo.GetByKRAIdAsync kra.Id |> Async.AwaitTask
                
                let totalInvestment = 
                    kraInvestments
                    |> Seq.filter (fun t -> 
                        t.Type = Expense &&
                        t.Date >= startDate && t.Date <= endDate)
                    |> Seq.sumBy (fun t -> abs t.Amount)
                
                let returns = 
                    kraInvestments
                    |> Seq.filter (fun t -> 
                        t.Type = Income && 
                        t.Date >= startDate && t.Date <= endDate)
                    |> Seq.sumBy (fun t -> t.Amount)
                
                if totalInvestment > 0m then
                    return (returns - totalInvestment) / totalInvestment * 100m
                else
                    return 0m
            } |> Async.StartAsTask

// Additional domain services
type IStrategicPlanningService =
    abstract member GenerateAnnualPlanAsync : VisionId -> Task<AnnualPlan>
    abstract member ValidateStrategicAlignmentAsync : Vision -> Task<ValidationResult>

type StrategicPlanningService(
    visionRepo: IVisionRepository,
    kraRepo: IKRARepository,
    kpiRepo: IKPIRepository) =
    
    interface IStrategicPlanningService with
        
        member _.GenerateAnnualPlanAsync visionId =
            async {
                let! vision = visionRepo.GetByIdAsync visionId |> Async.AwaitTask
                let! kras = kraRepo.GetByVisionIdAsync visionId |> Async.AwaitTask
                let! kpis = 
                    kras
                    |> Seq.map (fun kra -> kpiRepo.GetByKRAIdAsync kra.Id |> Async.AwaitTask)
                    |> Async.Sequential
                    |> AsyncHelpers.map Seq.concat
                
                match vision with
                | Some v ->
                    let quarterlyBreakdown = 
                        [1..4]
                        |> List.map (fun quarter -> {
                            Quarter = quarter
                            TargetKRAs = 
                                kras
                                |> Seq.filter (fun k -> 
                                    match k.TargetCompletionDate with
                                    | Some date -> 
                                        let quarterNum = (date.Month - 1) / 3 + 1
                                        quarterNum = quarter
                                    | None -> false)
                                |> Seq.map (fun k -> {
                                    KRAId = k.Id
                                    Title = k.Title
                                    TargetDate = k.TargetCompletionDate
                                })
                                |> Seq.toList
                            ExpectedOutcomes = []
                            RequiredInvestment = 0m
                        })
                    
                    return {
                        VisionId = visionId
                        Year = DateTime.utcNow().Year
                        VisionTitle = v.Title
                        StrategicPriorities = v.StrategicPriorities
                        QuarterlyBreakdown = quarterlyBreakdown
                        RequiredResources = []
                        RiskFactors = []
                        SuccessMetrics = Seq.length kpis
                    }
                | None -> 
                    return {
                        VisionId = visionId
                        Year = DateTime.utcNow().Year
                        VisionTitle = ""
                        StrategicPriorities = []
                        QuarterlyBreakdown = []
                        RequiredResources = []
                        RiskFactors = []
                        SuccessMetrics = 0
                    }
            } |> Async.StartAsTask
        
        member _.ValidateStrategicAlignmentAsync vision =
            async {
                let! kras = kraRepo.GetByVisionIdAsync vision.Id |> Async.AwaitTask
                let! kpis = 
                    kras
                    |> Seq.map (fun kra -> kpiRepo.GetByKRAIdAsync kra.Id |> Async.AwaitTask)
                    |> Async.Sequential
                    |> AsyncHelpers.map Seq.concat
                
                let mutable issues = []
                
                // Check KRA weight distribution
                match KRA.validateWeightDistribution (Seq.toList kras) with
                | Error (BusinessRuleViolation msg) -> issues <- msg :: issues
                | Error (ValidationError msg) -> issues <- msg :: issues
                | Error (NotFoundError msg) -> issues <- msg :: issues
                | Error (ConcurrencyError msg) -> issues <- msg :: issues
                | Ok () -> ()
                
                // Check if KRAs align with strategic priorities
                let alignedKRAs = 
                    kras
                    |> Seq.filter (fun kra -> 
                        vision.StrategicPriorities
                        |> List.exists (fun priority -> 
                            kra.Title.ToLower().Contains(priority.ToLower()) ||
                            kra.Description.ToLower().Contains(priority.ToLower())))
                    |> Seq.length
                
                if alignedKRAs < List.length vision.StrategicPriorities then
                    issues <- "Some strategic priorities lack corresponding KRAs" :: issues
                
                return {
                    IsValid = List.isEmpty issues
                    Issues = issues
                    Recommendations = [] // Recommendations generated separately
                }
            } |> Async.StartAsTask

// Factory for creating boardroom domain services
module BoardroomServiceFactory =
    let createBoardroomDomainService visionRepo kraRepo kpiRepo financialRepo measurementRepo =
        BoardroomDomainService(visionRepo, kraRepo, kpiRepo, financialRepo, measurementRepo) :> IBoardroomDomainService
    
    let createStrategicPlanningService visionRepo kraRepo kpiRepo =
        StrategicPlanningService(visionRepo, kraRepo, kpiRepo) :> IStrategicPlanningService
