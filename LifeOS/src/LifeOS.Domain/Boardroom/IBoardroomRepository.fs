namespace LifeOS.Domain.Boardroom

open LifeOS.Domain.Common
open System
open System.Threading.Tasks

// IVisionRepository - Port for Vision persistence
type IVisionRepository =
    abstract member GetByIdAsync : VisionId -> Task<Vision option>
    abstract member GetAllAsync : unit -> Task<Vision seq>
    abstract member AddAsync : Vision -> Task<Vision>
    abstract member UpdateAsync : Vision -> Task<Vision>
    abstract member DeleteAsync : VisionId -> Task<bool>
    abstract member GetByOwnerIdAsync : UserId -> Task<Vision seq>
    abstract member GetByStatusAsync : VisionStatus -> Task<Vision seq>
    abstract member GetActiveVisionsAsync : unit -> Task<Vision seq>
    abstract member SearchAsync : string -> Task<Vision seq>

// IKRARepository - Port for KRA persistence
type IKRARepository =
    abstract member GetByIdAsync : KRAId -> Task<KRA option>
    abstract member GetAllAsync : unit -> Task<KRA seq>
    abstract member AddAsync : KRA -> Task<KRA>
    abstract member UpdateAsync : KRA -> Task<KRA>
    abstract member DeleteAsync : KRAId -> Task<bool>
    abstract member GetByVisionIdAsync : VisionId -> Task<KRA seq>
    abstract member GetByOwnerIdAsync : UserId -> Task<KRA seq>
    abstract member GetByCategoryAsync : KRACategory -> Task<KRA seq>
    abstract member GetByStatusAsync : KRAStatus -> Task<KRA seq>
    abstract member GetOverdueKRAsAsync : DateTime -> Task<KRA seq>

// IKPIRepository - Port for KPI persistence
type IKPIRepository =
    abstract member GetByIdAsync : KPIId -> Task<KPI option>
    abstract member GetAllAsync : unit -> Task<KPI seq>
    abstract member AddAsync : KPI -> Task<KPI>
    abstract member UpdateAsync : KPI -> Task<KPI>
    abstract member DeleteAsync : KPIId -> Task<bool>
    abstract member GetByKRAIdAsync : KRAId -> Task<KPI seq>
    abstract member GetByOwnerIdAsync : UserId -> Task<KPI seq>
    abstract member GetByTypeAsync : KPIType -> Task<KPI seq>
    abstract member GetByStatusAsync : KPIStatus -> Task<KPI seq>
    abstract member GetNeedingMeasurementAsync : DateTime -> Task<KPI seq>

// IFinancialRepository - Port for Financial transaction persistence
type IFinancialRepository =
    abstract member GetByIdAsync : FinancialTransactionId -> Task<FinancialTransaction option>
    abstract member AddAsync : FinancialTransaction -> Task<FinancialTransaction>
    abstract member UpdateAsync : FinancialTransaction -> Task<FinancialTransaction>
    abstract member DeleteAsync : FinancialTransactionId -> Task<bool>
    abstract member GetByKRAIdAsync : KRAId -> Task<FinancialTransaction seq>
    abstract member GetByDateRangeAsync : DateTime -> DateTime -> Task<FinancialTransaction seq>
    abstract member GetByTypeAsync : TransactionType -> Task<FinancialTransaction seq>
    abstract member GetByCategoryAsync : TransactionCategory -> Task<FinancialTransaction seq>
    abstract member GetTotalByKRAAsync : KRAId -> Task<decimal>

// IKPIMeasurementRepository - Port for KPI measurements
type IKPIMeasurementRepository =
    abstract member GetByIdAsync : Guid -> Task<KPIMeasurement option>
    abstract member AddAsync : KPIMeasurement -> Task<KPIMeasurement>
    abstract member GetByKPIIdAsync : KPIId -> Task<KPIMeasurement seq>
    abstract member GetByDateRangeAsync : KPIId -> DateTime -> DateTime -> Task<KPIMeasurement seq>
    abstract member GetLatestByKPIIdAsync : KPIId -> Task<KPIMeasurement option>

// Extension methods for boardroom repository operations
[<RequireQualifiedAccess>]
module BoardroomRepository =
    
    // Get vision with KRAs and KPIs
    let GetVisionWithKRAsAndKPIsAsync (visionRepo: IVisionRepository) (kraRepo: IKRARepository) (kpiRepo: IKPIRepository) (visionId: VisionId) =
        async {
            let! vision = visionRepo.GetByIdAsync visionId |> Async.AwaitTask
            match vision with
            | Some v ->
                let! kras = kraRepo.GetByVisionIdAsync visionId |> Async.AwaitTask
                
                let! allKPIs = 
                    kras
                    |> Seq.map (fun kra -> kpiRepo.GetByKRAIdAsync kra.Id |> Async.AwaitTask)
                    |> Async.Sequential
                    |> AsyncHelpers.map (Seq.concat)
                
                return Some (v, Seq.toList kras, Seq.toList allKPIs)
            | None ->
                return None
        }
    
    // Calculate vision financial performance
    let GetVisionFinancialPerformanceAsync (kraRepo: IKRARepository) (financialRepo: IFinancialRepository) (visionId: VisionId) =
        async {
            let! kras = kraRepo.GetByVisionIdAsync visionId |> Async.AwaitTask
            
            let! kraFinancials = 
                kras
                |> Seq.map (fun kra -> async {
                    let! total = financialRepo.GetTotalByKRAAsync kra.Id |> Async.AwaitTask
                    return (kra, total)
                })
                |> Async.Sequential
            
            let totalRevenue = 
                kraFinancials
                |> Seq.sumBy (fun (kra, total) -> 
                    if total > 0m then total else 0m)
            
            let totalExpenses = 
                kraFinancials
                |> Seq.sumBy (fun (kra, total) -> 
                    if total < 0m then abs total else 0m)
            
            return {
                VisionId = visionId
                TotalRevenue = totalRevenue
                TotalExpenses = totalExpenses
                NetProfit = totalRevenue - totalExpenses
                KRABreakdown = kraFinancials |> Seq.map (fun (kra, total) -> 
                    {
                        KRAId = kra.Id
                        KRATitle = kra.Title
                        FinancialImpact = total
                        Percentage = if totalRevenue > 0m then total / totalRevenue * 100m else 0m
                    } : KRABreakdown) |> Seq.toList
            } : VisionFinancialPerformance
        }
    
    // Get KPI performance dashboard
    let GetKPIDashboardAsync (kpiRepo: IKPIRepository) (measurementRepo: IKPIMeasurementRepository) (userId: UserId) =
        async {
            let! kpis = kpiRepo.GetByOwnerIdAsync userId |> Async.AwaitTask
            
            let! kpiPerformances = 
                kpis
                |> Seq.map (fun kpi -> async {
                    let! measurements = measurementRepo.GetByKPIIdAsync kpi.Id |> Async.AwaitTask
                    return KPIPerformanceSummary.fromKPI kpi measurements
                })
                |> Async.Sequential
            
            let totalKPIs = Seq.length kpis
            let onTrackCount = kpiPerformances |> Seq.filter (fun p -> p.Status = OnTrack || p.Status = AboveTarget) |> Seq.length
            let averageScore = 
                if totalKPIs > 0 then
                    kpiPerformances |> Seq.averageBy (fun p -> p.Score)
                else 0m
            
            return {
                UserId = userId
                TotalKPIs = totalKPIs
                OnTrackKPIs = onTrackCount
                AverageScore = averageScore
                RedFlags = KPI.getRedFlags (Seq.toList kpis)
                TopPerformers = 
                    kpiPerformances
                    |> Seq.sortByDescending (fun p -> p.ProgressPercentage)
                    |> Seq.take 5
                    |> Seq.map (fun p -> { KPIId = p.KPIId; Name = p.Name; CurrentValue = p.CurrentValue; TargetValue = p.TargetValue; Progress = p.ProgressPercentage } : KPISummary)
                    |> Seq.toList
                NeedsAttention = 
                    kpiPerformances
                    |> Seq.filter (fun p -> p.Status = BelowTarget)
                    |> Seq.sortBy (fun p -> p.ProgressPercentage)
                    |> Seq.take 5
                    |> Seq.map (fun p -> { KPIId = p.KPIId; Name = p.Name; CurrentValue = p.CurrentValue; TargetValue = p.TargetValue; Progress = p.ProgressPercentage } : KPISummary)
                    |> Seq.toList
            }
        }
