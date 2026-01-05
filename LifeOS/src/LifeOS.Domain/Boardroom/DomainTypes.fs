namespace LifeOS.Domain.Boardroom

open LifeOS.Domain.Common
open System

// Value Objects for Boardroom domain
type VisionId = VisionId of Guid
type KRAId = KRAId of Guid
type KPIId = KPIId of Guid
type FinancialTransactionId = FinancialTransactionId of Guid

// Module for creating IDs
module BoardroomId =
    let createVisionId () = VisionId (Guid.NewGuid())
    let createKRAId () = KRAId (Guid.NewGuid())
    let createKPIId () = KPIId (Guid.NewGuid())
    let createFinancialTransactionId () = FinancialTransactionId (Guid.NewGuid())
    
    let visionIdValue (VisionId id) = id
    let kraIdValue (KRAId id) = id
    let kpiIdValue (KPIId id) = id
    let transactionIdValue (FinancialTransactionId id) = id

// Measurement and tracking value objects
type TargetValue = TargetValue of decimal
type CurrentValue = CurrentValue of decimal
type Percentage = Percentage of decimal
type Weight = Weight of decimal

// Target value utilities
module TargetValue =
    let create (value: decimal) =
        Ok (TargetValue value)
    
    let value (TargetValue tv) = tv

// Current value utilities
module CurrentValue =
    let create (value: decimal) =
        Ok (CurrentValue value)
    
    let value (CurrentValue cv) = cv

// Percentage utilities
module Percentage =
    let create (value: decimal) =
        if value < 0m || value > 100m then
            Error (ValidationError "Percentage must be between 0 and 100")
        else
            Ok (Percentage value)
    
    let value (Percentage p) = p
    let zero = Percentage 0m
    let oneHundred = Percentage 100m

// Weight utilities
module Weight =
    let create (value: decimal) =
        if value < 0m || value > 1m then
            Error (ValidationError "Weight must be between 0 and 1")
        else
            Ok (Weight value)
    
    let value (Weight w) = w

// Vision timeframes
type Timeframe =
    | Quarterly
    | Annually
    | ThreeYear
    | FiveYear
    | TenYear

// KRA categories
type KRACategory =
    | Financial
    | Customer
    | Operational
    | Growth
    | People
    | Innovation
    | Other of string

// KPI types
type KPIType =
    | Financial
    | Operational
    | Customer
    | Leading // Leading indicator
    | Lagging // Lagging indicator
    | Qualitative
    | Quantitative

// KPI measurement frequency
type MeasurementFrequency =
    | Daily
    | Weekly
    | Monthly
    | Quarterly
    | Annually

// Financial transaction types
type TransactionType =
    | Income
    | Expense
    | Investment
    | Transfer
    | Adjustment

// Transaction categories
type TransactionCategory =
    | Revenue
    | CostOfGoodsSold
    | OperatingExpense
    | CapitalExpenditure
    | Debt
    | Equity
    | Other of string

// Vision status
type VisionStatus =
    | Draft
    | Active
    | OnHold
    | Completed
    | Archived

// KRA status
type KRAStatus =
    | NotStarted
    | InProgress
    | AtRisk
    | Completed
    | Cancelled

// KPI status
type KPIStatus =
    | NotMeasured
    | BelowTarget
    | OnTrack
    | AboveTarget
    | Exceeded

// Financial transaction
type FinancialTransaction = {
    Id: FinancialTransactionId
    Type: TransactionType
    Category: TransactionCategory
    Amount: decimal
    Description: string
    Date: DateTime
    KRAId: KRAId option
    RelatedEntityId: Guid option
    CreatedAt: DateTime
    UpdatedAt: DateTime
}

// KPI measurement entry
type KPIMeasurement = {
    Id: Guid
    KPIId: KPIId
    Value: decimal
    MeasuredAt: DateTime
    MeasuredBy: UserId
    Notes: string option
    CreatedAt: DateTime
}

// Strategic initiative
type StrategicInitiative = {
    Id: Guid
    Name: string
    Description: string
    KRAId: KRAId
    OwnerId: UserId
    StartDate: DateTime
    EndDate: DateTime option
    Status: string
    Progress: decimal
    CreatedAt: DateTime
    UpdatedAt: DateTime
}

// Executive dashboard type
type ExecutiveDashboard = {
    UserId: UserId
    ActiveVisions: int
    ActiveKRAs: int
    TotalKPIs: int
    OnTrackKPIs: int
    TotalRevenue: decimal
    TotalProfit: decimal
    TopPerformingKRAs: KRASummary list
    CriticalKPIs: RedFlag list
}

// KRA summary for dashboard
and KRASummary = {
    KRAId: KRAId
    Title: string
    Progress: decimal
    Status: KRAStatus
}

// Red flag for critical KPIs
and RedFlag = {
    KPIId: KPIId
    Name: string
    CurrentValue: decimal
    TargetValue: decimal
    Variance: decimal
}

// Annual plan type
type AnnualPlan = {
    VisionId: VisionId
    Year: int
    VisionTitle: string
    StrategicPriorities: string list
    QuarterlyBreakdown: QuarterlyPlan list
    RequiredResources: string list
    RiskFactors: string list
    SuccessMetrics: int
}

// Quarterly plan breakdown
and QuarterlyPlan = {
    Quarter: int
    TargetKRAs: KRATarget list
    ExpectedOutcomes: string list
    RequiredInvestment: decimal
}

// KRA target for planning
and KRATarget = {
    KRAId: KRAId
    Title: string
    TargetDate: DateTime option
}

// Validation result type
type ValidationResult = {
    IsValid: bool
    Issues: string list
    Recommendations: string list
}

// KRA breakdown for financial reporting
type KRABreakdown = {
    KRAId: KRAId
    KRATitle: string
    FinancialImpact: decimal
    Percentage: decimal
}

// Financial performance summary (for vision-level)
type VisionFinancialPerformance = {
    VisionId: VisionId
    TotalRevenue: decimal
    TotalExpenses: decimal
    NetProfit: decimal
    KRABreakdown: KRABreakdown list
}

// Financial performance summary (for KRA-level)
type FinancialPerformance = {
    KRAId: KRAId
    TotalRevenue: decimal
    TotalExpenses: decimal
    NetProfit: decimal
    ROI: decimal
}

// KPI dashboard summary
type KPIDashboardSummary = {
    UserId: UserId
    TotalKPIs: int
    OnTrackKPIs: int
    AverageScore: decimal
    RedFlags: RedFlag list
    TopPerformers: KPISummary list
    NeedsAttention: KPISummary list
}

// KPI summary for dashboard
and KPISummary = {
    KPIId: KPIId
    Name: string
    CurrentValue: decimal
    TargetValue: decimal
    Progress: decimal
}

// Risk factor for KRA analysis
type RiskFactor = {
    KPIId: KPIId
    KPIName: string
    RiskLevel: string
    CurrentValue: CurrentValue
    TargetValue: TargetValue
}
