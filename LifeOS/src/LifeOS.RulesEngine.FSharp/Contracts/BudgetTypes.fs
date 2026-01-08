namespace LifeOS.RulesEngine.Contracts.Budget

open System
open System.Threading.Tasks

// ============================================
// Budget Domain - F# Types with C# Interop
// Zero-Based Budgeting: Every dollar has a job
// Pay-Period Centric: Budget per paycheck, not monthly
// ============================================

// ============================================
// Domain Types (Internal - F# only)
// ============================================

/// Discriminated union for account types
type AccountType =
    | Checking
    | Savings
    | CreditCard
    | Cash
    | Investment
    | Loan

/// Discriminated union for bill frequencies
type BillFrequency =
    | Weekly
    | BiWeekly
    | Monthly
    | Quarterly
    | Annually
    | OneTime

/// Discriminated union for transaction types
type TransactionType =
    | Inflow
    | Outflow
    | Transfer

/// Value object for money (prevents negative amounts in wrong places)
type Money = private Money of decimal
    with
        static member Create(value) = 
            if value >= 0m then Money(value)
            else failwith "Money cannot be negative"
        member this.Value = 
            match this with
            | Money(v) -> v

// ============================================
// C#-Friendly DTOs (Public API)
// ============================================

/// Pay Period - The fundamental time unit for budgeting
[<Sealed>]
type PayPeriodDto(key: string, familyId: string, name: string, startDate: DateTime, endDate: DateTime, isActive: bool) =
    member _.Key = key
    member _.FamilyId = familyId
    member _.Name = name
    member _.StartDate = startDate
    member _.EndDate = endDate
    member _.IsActive = isActive
    member _.TotalIncome = 0m // Will be calculated
    member _.TotalAssigned = 0m // Will be calculated
    member _.Unassigned = 0m // Will be calculated

/// Category Group - Groups related categories (e.g., "Living Expenses")
[<Sealed>]
type CategoryGroupDto(key: string, familyId: string, name: string, sortOrder: int) =
    member _.Key = key
    member _.FamilyId = familyId
    member _.Name = name
    member _.SortOrder = sortOrder

/// Budget Category - Where money is assigned
[<Sealed>]
type BudgetCategoryDto(key: string, groupKey: string, name: string, sortOrder: int, isExpense: bool) =
    member _.Key = key
    member _.GroupKey = groupKey
    member _.Name = name
    member _.SortOrder = sortOrder
    member _.IsExpense = isExpense

/// Budget Assignment - Money assigned to a category for a pay period
[<Sealed>]
type BudgetAssignmentDto(key: string, payPeriodKey: string, categoryKey: string, assignedAmount: decimal) =
    member _.Key = key
    member _.PayPeriodKey = payPeriodKey
    member _.CategoryKey = categoryKey
    member _.AssignedAmount = assignedAmount

/// Income Entry - Money received during a pay period
[<Sealed>]
type IncomeEntryDto(key: string, payPeriodKey: string, source: string, amount: decimal, receivedDate: DateTime) =
    member _.Key = key
    member _.PayPeriodKey = payPeriodKey
    member _.Source = source
    member _.Amount = amount
    member _.ReceivedDate = receivedDate

/// Bank Account
[<Sealed>]
type BudgetAccountDto(key: string, familyId: string, name: string, accountType: string, balance: decimal, isIncludedInBudget: bool) =
    member _.Key = key
    member _.FamilyId = familyId
    member _.Name = name
    member _.AccountType = accountType
    member _.Balance = balance
    member _.IsIncludedInBudget = isIncludedInBudget

/// Recurring Bill
[<Sealed>]
type BudgetBillDto(key: string, familyId: string, name: string, amount: decimal, frequency: string, nextDueDate: DateTime, categoryKey: string, accountKey: string, isAutoPay: bool) =
    member _.Key = key
    member _.FamilyId = familyId
    member _.Name = name
    member _.Amount = amount
    member _.Frequency = frequency
    member _.NextDueDate = nextDueDate
    member _.CategoryKey = categoryKey
    member _.AccountKey = accountKey
    member _.IsAutoPay = isAutoPay

/// Savings Goal
[<Sealed>]
type BudgetGoalDto(key: string, familyId: string, name: string, targetAmount: decimal, currentAmount: decimal, targetDate: DateTime, categoryKey: string) =
    member _.Key = key
    member _.FamilyId = familyId
    member _.Name = name
    member _.TargetAmount = targetAmount
    member _.CurrentAmount = currentAmount
    member _.TargetDate = targetDate
    member _.CategoryKey = categoryKey
    member _.PercentageComplete = if targetAmount > 0m then currentAmount / targetAmount * 100m else 0m

/// Transaction - Individual income/expense transaction
[<Sealed>]
type BudgetTransactionDto(key: string, familyId: string, accountKey: string, categoryKey: string, payPeriodKey: string, amount: decimal, description: string, transactionDate: DateTime, isCleared: bool) =
    member _.Key = key
    member _.FamilyId = familyId
    member _.AccountKey = accountKey
    member _.CategoryKey = categoryKey
    member _.PayPeriodKey = payPeriodKey
    member _.Amount = amount
    member _.Description = description
    member _.TransactionDate = transactionDate
    member _.IsCleared = isCleared

/// Budget Summary - Aggregated view for a pay period
[<Sealed>]
type BudgetSummaryDto(payPeriodKey: string, totalIncome: decimal, totalAssigned: decimal, unassigned: decimal, assignedPercentage: decimal) =
    member _.PayPeriodKey = payPeriodKey
    member _.TotalIncome = totalIncome
    member _.TotalAssigned = totalAssigned
    member _.Unassigned = unassigned
    member _.AssignedPercentage = assignedPercentage

/// Category Balance - Shows assigned vs spent for a category
[<Sealed>]
type CategoryBalanceDto(categoryKey: string, categoryName: string, assignedAmount: decimal, spentAmount: decimal, availableAmount: decimal, remainingPercentage: decimal) =
    member _.CategoryKey = categoryKey
    member _.CategoryName = categoryName
    member _.AssignedAmount = assignedAmount
    member _.SpentAmount = spentAmount
    member _.AvailableAmount = availableAmount
    member _.RemainingPercentage = remainingPercentage

/// Upcoming Bill - Bill due in date range
[<Sealed>]
type UpcomingBillDto(billKey: string, billName: string, amount: decimal, dueDate: DateTime, categoryName: string, accountName: string, isAutoPay: bool) =
    member _.BillKey = billKey
    member _.BillName = billName
    member _.Amount = amount
    member _.DueDate = dueDate
    member _.CategoryName = categoryName
    member _.AccountName = accountName
    member _.IsAutoPay = isAutoPay

// ============================================
// CQRS Commands (Write Operations)
// ============================================

/// Command to assign money to a category (upsert operation)
[<Sealed>]
type AssignMoneyCommand(payPeriodKey: string, categoryKey: string, assignedAmount: decimal) =
    member _.PayPeriodKey = payPeriodKey
    member _.CategoryKey = categoryKey
    member _.AssignedAmount = assignedAmount

/// Command to add income entry
[<Sealed>]
type AddIncomeCommand(payPeriodKey: string, source: string, amount: decimal, receivedDate: DateTime) =
    member _.PayPeriodKey = payPeriodKey
    member _.Source = source
    member _.Amount = amount
    member _.ReceivedDate = receivedDate

/// Command to create a pay period
[<Sealed>]
type CreatePayPeriodCommand(familyId: string, name: string, startDate: DateTime, endDate: DateTime) =
    member _.FamilyId = familyId
    member _.Name = name
    member _.StartDate = startDate
    member _.EndDate = endDate

/// Command to record a transaction
[<Sealed>]
type RecordTransactionCommand(familyId: string, accountKey: string, categoryKey: string, payPeriodKey: string, amount: decimal, description: string, transactionDate: DateTime) =
    member _.FamilyId = familyId
    member _.AccountKey = accountKey
    member _.CategoryKey = categoryKey
    member _.PayPeriodKey = payPeriodKey
    member _.Amount = amount
    member _.Description = description
    member _.TransactionDate = transactionDate

/// Command to create a goal
[<Sealed>]
type CreateGoalCommand(familyId: string, name: string, targetAmount: decimal, targetDate: DateTime, categoryKey: string) =
    member _.FamilyId = familyId
    member _.Name = name
    member _.TargetAmount = targetAmount
    member _.TargetDate = targetDate
    member _.CategoryKey = categoryKey

// ============================================
// CQRS Queries (Read Operations)
// ============================================

/// Query for dashboard data
[<Sealed>]
type GetDashboardQuery(familyId: string, payPeriodKey: string option) =
    member _.FamilyId = familyId
    member _.PayPeriodKey = defaultArg payPeriodKey ""

/// Query for budget summary
[<Sealed>]
type GetBudgetSummaryQuery(payPeriodKey: string) =
    member _.PayPeriodKey = payPeriodKey

/// Query for category balances
[<Sealed>]
type GetCategoryBalancesQuery(payPeriodKey: string) =
    member _.PayPeriodKey = payPeriodKey

/// Query for upcoming bills
[<Sealed>]
type GetUpcomingBillsQuery(familyId: string, fromDate: DateTime, toDate: DateTime) =
    member _.FamilyId = familyId
    member _.FromDate = fromDate
    member _.ToDate = toDate

// ============================================
// Result Type for Error Handling
// ============================================

/// Result type for operations that can fail
[<Sealed>]
type BudgetResult<'T> private (success: bool, value: 'T, errorCode: string, errorMessage: string) =
    member _.IsSuccess = success
    member _.Value = value
    member _.ErrorCode = errorCode
    member _.ErrorMessage = errorMessage
    
    static member Success(value: 'T) = BudgetResult<'T>(true, value, "", "")
    static member Failure(errorCode: string, errorMessage: string) = 
        BudgetResult<'T>(false, Unchecked.defaultof<'T>, errorCode, errorMessage)

// ============================================
// Interface - Budget Rules Engine
// ============================================

/// Interface for budget rules and calculations
type IBudgetRulesEngine =
    abstract member CalculateBudgetSummaryAsync: payPeriodKey: string * totalIncome: decimal * assignments: BudgetAssignmentDto array -> Task<BudgetResult<BudgetSummaryDto>>
    abstract member CalculateCategoryBalancesAsync: categories: BudgetCategoryDto array * groups: CategoryGroupDto array * assignments: BudgetAssignmentDto array * transactions: BudgetTransactionDto array -> Task<BudgetResult<CategoryBalanceDto array>>
    abstract member ValidateAssignmentAsync: command: AssignMoneyCommand * currentSummary: BudgetSummaryDto -> Task<BudgetResult<bool>>
    abstract member CalculateUpcomingBillsAsync: bills: BudgetBillDto array * categories: BudgetCategoryDto array * accounts: BudgetAccountDto array * fromDate: DateTime * toDate: DateTime -> Task<BudgetResult<UpcomingBillDto array>>
    abstract member FindPayPeriodForDateAsync: payPeriods: PayPeriodDto array * targetDate: DateTime -> Task<BudgetResult<PayPeriodDto>>
