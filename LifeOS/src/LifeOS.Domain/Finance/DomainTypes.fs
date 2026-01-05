namespace LifeOS.Domain.Finance

open System
open LifeOS.Domain.Common

// ==================== VALUE OBJECTS ====================

/// Monetary amount with validation
type Money = private Money of decimal

module Money =
    let create (value: decimal) = Money value
    let value (Money m) = m
    let zero = Money 0m
    let add (Money a) (Money b) = Money (a + b)
    let subtract (Money a) (Money b) = Money (a - b)
    let negate (Money m) = Money (-m)
    let abs (Money m) = Money (System.Math.Abs m)
    let isNegative (Money m) = m < 0m
    let isPositive (Money m) = m > 0m
    let isZero (Money m) = m = 0m

/// Currency code (ISO 4217)
type Currency = private Currency of string

module Currency =
    let create (code: string) =
        if String.IsNullOrWhiteSpace(code) then
            Error (ValidationError "Currency code cannot be empty")
        elif code.Length <> 3 then
            Error (ValidationError "Currency code must be 3 characters (ISO 4217)")
        else
            Ok (Currency (code.ToUpperInvariant()))
    
    let value (Currency c) = c
    let usd = Currency "USD"

/// Account types following standard accounting
type AccountType =
    | Checking
    | Savings
    | CreditCard
    | Cash
    | Loan
    | Investment
    | Asset
    | Liability

module AccountType =
    let fromString (s: string) =
        match s.ToLowerInvariant() with
        | "checking" -> Ok Checking
        | "savings" -> Ok Savings
        | "creditcard" | "credit_card" -> Ok CreditCard
        | "cash" -> Ok Cash
        | "loan" -> Ok Loan
        | "investment" -> Ok Investment
        | "asset" -> Ok Asset
        | "liability" -> Ok Liability
        | _ -> Error (ValidationError $"Unknown account type: {s}")
    
    let toString = function
        | Checking -> "Checking"
        | Savings -> "Savings"
        | CreditCard -> "CreditCard"
        | Cash -> "Cash"
        | Loan -> "Loan"
        | Investment -> "Investment"
        | Asset -> "Asset"
        | Liability -> "Liability"

/// Transaction status lifecycle
type TransactionStatus =
    | Pending
    | Posted
    | Cleared
    | Reconciled
    | Void

module TransactionStatus =
    let fromString (s: string) =
        match s.ToLowerInvariant() with
        | "pending" -> Ok Pending
        | "posted" -> Ok Posted
        | "cleared" -> Ok Cleared
        | "reconciled" -> Ok Reconciled
        | "void" -> Ok Void
        | _ -> Error (ValidationError $"Unknown transaction status: {s}")
    
    let toString = function
        | Pending -> "Pending"
        | Posted -> "Posted"
        | Cleared -> "Cleared"
        | Reconciled -> "Reconciled"
        | Void -> "Void"
    
    /// Business rule: Valid status transitions
    let canTransitionTo (current: TransactionStatus) (next: TransactionStatus) =
        match current, next with
        | Pending, Posted -> true
        | Pending, Void -> true
        | Posted, Cleared -> true
        | Posted, Void -> true
        | Cleared, Reconciled -> true
        | Cleared, Void -> true
        | _, _ -> false

/// Category type for income/expense classification
type CategoryType =
    | Income
    | Expense
    | Transfer

module CategoryType =
    let fromString (s: string) =
        match s.ToLowerInvariant() with
        | "income" -> Ok Income
        | "expense" -> Ok Expense
        | "transfer" -> Ok Transfer
        | _ -> Error (ValidationError $"Unknown category type: {s}")
    
    let toString = function
        | Income -> "Income"
        | Expense -> "Expense"
        | Transfer -> "Transfer"

/// Budget period types
type BudgetPeriodType =
    | Monthly
    | Weekly
    | BiWeekly
    | SemiMonthly
    | Custom
    | PayPeriod

module BudgetPeriodType =
    let fromString (s: string) =
        match s.ToLowerInvariant() with
        | "monthly" -> Ok Monthly
        | "weekly" -> Ok Weekly
        | "biweekly" | "bi-weekly" -> Ok BiWeekly
        | "semimonthly" | "semi-monthly" -> Ok SemiMonthly
        | "custom" -> Ok Custom
        | "payperiod" | "pay-period" -> Ok PayPeriod
        | _ -> Error (ValidationError $"Unknown budget period type: {s}")
    
    let toString = function
        | Monthly -> "Monthly"
        | Weekly -> "Weekly"
        | BiWeekly -> "BiWeekly"
        | SemiMonthly -> "SemiMonthly"
        | Custom -> "Custom"
        | PayPeriod -> "PayPeriod"

/// Reconciliation status
type ReconciliationStatus =
    | InProgress
    | Completed
    | Abandoned

module ReconciliationStatus =
    let fromString (s: string) =
        match s.ToLowerInvariant() with
        | "inprogress" | "in_progress" -> Ok InProgress
        | "completed" -> Ok Completed
        | "abandoned" -> Ok Abandoned
        | _ -> Error (ValidationError $"Unknown reconciliation status: {s}")
    
    let toString = function
        | InProgress -> "InProgress"
        | Completed -> "Completed"
        | Abandoned -> "Abandoned"

// ==================== ENTITY IDS ====================

type AccountId = AccountId of string
type MerchantId = MerchantId of string
type CategoryId = CategoryId of string
type TransactionId = TransactionId of string
type JournalEntryId = JournalEntryId of string
type ReceiptId = ReceiptId of string
type ReconciliationId = ReconciliationId of string
type BudgetId = BudgetId of string

module AccountId =
    let create () = AccountId (Guid.NewGuid().ToString("N")[..11])
    let fromString s = AccountId s
    let value (AccountId id) = id

module MerchantId =
    let create () = MerchantId (Guid.NewGuid().ToString("N")[..11])
    let fromString s = MerchantId s
    let value (MerchantId id) = id

module CategoryId =
    let create () = CategoryId (Guid.NewGuid().ToString("N")[..11])
    let fromString s = CategoryId s
    let value (CategoryId id) = id

module TransactionId =
    let create () = TransactionId (Guid.NewGuid().ToString("N")[..11])
    let fromString s = TransactionId s
    let value (TransactionId id) = id

module JournalEntryId =
    let create () = JournalEntryId (Guid.NewGuid().ToString("N")[..11])
    let fromString s = JournalEntryId s
    let value (JournalEntryId id) = id

module ReceiptId =
    let create () = ReceiptId (Guid.NewGuid().ToString("N")[..11])
    let fromString s = ReceiptId s
    let value (ReceiptId id) = id

module ReconciliationId =
    let create () = ReconciliationId (Guid.NewGuid().ToString("N")[..11])
    let fromString s = ReconciliationId s
    let value (ReconciliationId id) = id

module BudgetId =
    let create () = BudgetId (Guid.NewGuid().ToString("N")[..11])
    let fromString s = BudgetId s
    let value (BudgetId id) = id

// ==================== BUDGET PERIOD ====================

/// Represents a budget period with start and end dates
type BudgetPeriod = {
    PeriodType: BudgetPeriodType
    StartDate: DateTime
    EndDate: DateTime
    PeriodKey: string
}

module BudgetPeriod =
    /// Generate a unique key for a period
    let generateKey (periodType: BudgetPeriodType) (startDate: DateTime) =
        match periodType with
        | Monthly -> startDate.ToString("yyyy-MM")
        | Weekly -> "w-" + startDate.ToString("yyyy-MM-dd")
        | BiWeekly -> "bw-" + startDate.ToString("yyyy-MM-dd")
        | SemiMonthly -> "sm-" + startDate.ToString("yyyy-MM-dd")
        | Custom -> "c-" + startDate.ToString("yyyy-MM-dd")
        | PayPeriod -> "pp-" + startDate.ToString("yyyy-MM-dd")
    
    /// Create a budget period
    let create periodType startDate endDate =
        if endDate <= startDate then
            Error (ValidationError "End date must be after start date")
        else
            Ok {
                PeriodType = periodType
                StartDate = startDate
                EndDate = endDate
                PeriodKey = generateKey periodType startDate
            }
    
    /// Check if a date falls within the period
    let containsDate (date: DateTime) (period: BudgetPeriod) =
        date >= period.StartDate && date <= period.EndDate
    
    /// Calculate monthly period for a given year/month
    let forMonth (year: int) (month: int) =
        let startDate = DateTime(year, month, 1)
        let endDate = startDate.AddMonths(1).AddDays(-1.0)
        create Monthly startDate endDate

// ==================== PAY PERIOD CONFIG ====================

/// Configuration for pay period calculations
type PayPeriodConfig = {
    AnchorDate: DateTime
    PeriodLengthDays: int
}

module PayPeriodConfig =
    let create anchorDate periodLengthDays =
        if periodLengthDays <= 0 then
            Error (ValidationError "Period length must be positive")
        elif periodLengthDays > 31 then
            Error (ValidationError "Period length cannot exceed 31 days")
        else
            Ok { AnchorDate = anchorDate; PeriodLengthDays = periodLengthDays }
    
    let defaultBiWeekly anchorDate =
        { AnchorDate = anchorDate; PeriodLengthDays = 14 }
    
    /// Calculate the pay period containing a given date
    let getPeriodContaining (config: PayPeriodConfig) (date: DateTime) =
        let daysDiff = (date - config.AnchorDate).TotalDays |> int
        let periodsElapsed = daysDiff / config.PeriodLengthDays
        let periodStart = config.AnchorDate.AddDays(float (periodsElapsed * config.PeriodLengthDays))
        let periodStart = 
            if periodStart > date then 
                periodStart.AddDays(float -config.PeriodLengthDays)
            else 
                periodStart
        let periodEnd = periodStart.AddDays(float config.PeriodLengthDays - 1.0)
        BudgetPeriod.create PayPeriod periodStart periodEnd
    
    /// Calculate a budget period spanning multiple pay periods
    let getMultiPeriod (config: PayPeriodConfig) (date: DateTime) (periodCount: int) =
        match getPeriodContaining config date with
        | Error e -> Error e
        | Ok firstPeriod ->
            let endDate = firstPeriod.StartDate.AddDays(float (config.PeriodLengthDays * periodCount) - 1.0)
            BudgetPeriod.create PayPeriod firstPeriod.StartDate endDate

// ==================== JOURNAL ENTRY (Double-Entry Accounting) ====================

/// Represents one side of a double-entry journal entry
type JournalEntry = {
    Id: JournalEntryId
    TransactionId: TransactionId
    AccountId: AccountId
    Debit: Money
    Credit: Money
    EntryDate: DateTime
    Memo: string option
    CreatedAt: DateTime
}

module JournalEntry =
    /// Business rule: A journal entry must have either debit or credit, not both
    let create transactionId accountId debit credit entryDate memo =
        let debitVal = Money.value debit
        let creditVal = Money.value credit
        if debitVal > 0m && creditVal > 0m then
            Error (BusinessRuleViolation "Journal entry cannot have both debit and credit")
        elif debitVal = 0m && creditVal = 0m then
            Error (BusinessRuleViolation "Journal entry must have either debit or credit")
        elif debitVal < 0m || creditVal < 0m then
            Error (ValidationError "Debit and credit amounts must be non-negative")
        else
            let now = DateTime.utcNow()
            Ok {
                Id = JournalEntryId.create()
                TransactionId = transactionId
                AccountId = accountId
                Debit = debit
                Credit = credit
                EntryDate = entryDate
                Memo = memo
                CreatedAt = now
            }
    
    /// Create a debit entry
    let createDebit transactionId accountId amount entryDate memo =
        create transactionId accountId amount Money.zero entryDate memo
    
    /// Create a credit entry
    let createCredit transactionId accountId amount entryDate memo =
        create transactionId accountId Money.zero amount entryDate memo

/// A balanced set of journal entries for a transaction
type JournalEntrySet = {
    Entries: JournalEntry list
}

module JournalEntrySet =
    /// Business rule: Total debits must equal total credits
    let create (entries: JournalEntry list) =
        let totalDebits = entries |> List.sumBy (fun e -> Money.value e.Debit)
        let totalCredits = entries |> List.sumBy (fun e -> Money.value e.Credit)
        if totalDebits <> totalCredits then
            Error (BusinessRuleViolation $"Journal entries must balance: debits ({totalDebits}) != credits ({totalCredits})")
        elif entries.IsEmpty then
            Error (ValidationError "Journal entry set cannot be empty")
        else
            Ok { Entries = entries }
    
    /// Create journal entries for a simple transaction (single account)
    let forSimpleTransaction transactionId accountId (amount: Money) entryDate =
        let absAmount = Money.abs amount
        if Money.isNegative amount then
            // Withdrawal/expense: debit from account
            match JournalEntry.createDebit transactionId accountId absAmount entryDate None with
            | Ok entry -> create [entry]
            | Error e -> Error e
        else
            // Deposit/income: credit to account
            match JournalEntry.createCredit transactionId accountId absAmount entryDate None with
            | Ok entry -> create [entry]
            | Error e -> Error e
    
    /// Create journal entries for a transfer between accounts
    let forTransfer withdrawalTxId depositTxId fromAccountId toAccountId (amount: Money) entryDate =
        let absAmount = Money.abs amount
        result {
            let! debitEntry = JournalEntry.createDebit withdrawalTxId fromAccountId absAmount entryDate None
            let! creditEntry = JournalEntry.createCredit depositTxId toAccountId absAmount entryDate None
            return! create [debitEntry; creditEntry]
        }
