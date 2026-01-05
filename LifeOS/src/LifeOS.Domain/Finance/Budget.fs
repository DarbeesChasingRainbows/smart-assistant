namespace LifeOS.Domain.Finance

open System
open LifeOS.Domain.Common

/// Budget line item for a category within a period
type Budget = {
    Id: BudgetId
    Period: BudgetPeriod
    CategoryId: CategoryId
    BudgetedAmount: Money
    SpentAmount: Money
    RolloverAmount: Money
    Notes: string option
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    /// Calculate remaining budget
    member this.RemainingAmount =
        let total = Money.add this.BudgetedAmount this.RolloverAmount
        Money.subtract total this.SpentAmount
    
    /// Calculate percentage spent
    member this.PercentSpent =
        let budgeted = Money.value (Money.add this.BudgetedAmount this.RolloverAmount)
        if budgeted = 0m then 0m
        else (Money.value this.SpentAmount / budgeted) * 100m
    
    /// Check if over budget
    member this.IsOverBudget =
        Money.isNegative this.RemainingAmount
    
    /// Update spent amount
    member this.UpdateSpentAmount (newSpentAmount: Money) =
        Ok
            { this with
                SpentAmount = newSpentAmount
                UpdatedAt = DateTime.utcNow()
            }
    
    /// Update budgeted amount
    member this.UpdateBudgetedAmount (newBudgetedAmount: Money) =
        if Money.isNegative newBudgetedAmount then
            Error (ValidationError "Budgeted amount cannot be negative")
        else
            Ok
                { this with
                    BudgetedAmount = newBudgetedAmount
                    UpdatedAt = DateTime.utcNow()
                }
    
    /// Set rollover from previous period
    member this.SetRollover (rolloverAmount: Money) =
        Ok
            { this with
                RolloverAmount = rolloverAmount
                UpdatedAt = DateTime.utcNow()
            }

module Budget =
    /// Create a new budget line
    let create period categoryId budgetedAmount =
        if Money.isNegative budgetedAmount then
            Error (ValidationError "Budgeted amount cannot be negative")
        else
            let now = DateTime.utcNow()
            Ok {
                Id = BudgetId.create()
                Period = period
                CategoryId = categoryId
                BudgetedAmount = budgetedAmount
                SpentAmount = Money.zero
                RolloverAmount = Money.zero
                Notes = None
                CreatedAt = now
                UpdatedAt = now
            }
    
    /// Create or update a budget line
    let upsert period categoryId budgetedAmount (existingBudget: Budget option) =
        match existingBudget with
        | Some budget -> budget.UpdateBudgetedAmount budgetedAmount
        | None -> create period categoryId budgetedAmount
    
    /// Calculate spent amount from transactions
    let calculateSpentFromTransactions (transactions: Transaction list) (categoryId: CategoryId) (period: BudgetPeriod) =
        transactions
        |> List.filter (fun tx -> 
            Transaction.hasCategory categoryId tx &&
            Transaction.isInDateRange period.StartDate period.EndDate tx &&
            Transaction.affectsBalance tx &&
            Money.isNegative tx.Amount)  // Only expenses (negative amounts)
        |> List.sumBy (fun tx -> Money.value (Money.abs tx.Amount))
        |> Money.create

/// Budget summary for a period
type BudgetSummary = {
    Period: BudgetPeriod
    Budgets: Budget list
    TotalBudgeted: Money
    TotalSpent: Money
    TotalRemaining: Money
}

module BudgetSummary =
    /// Create a budget summary from a list of budgets
    let create period budgets =
        let totalBudgeted = 
            budgets 
            |> List.sumBy (fun b -> Money.value (Money.add b.BudgetedAmount b.RolloverAmount))
            |> Money.create
        let totalSpent = 
            budgets 
            |> List.sumBy (fun b -> Money.value b.SpentAmount)
            |> Money.create
        let totalRemaining = Money.subtract totalBudgeted totalSpent
        {
            Period = period
            Budgets = budgets
            TotalBudgeted = totalBudgeted
            TotalSpent = totalSpent
            TotalRemaining = totalRemaining
        }

/// Reconciliation aggregate for matching bank statements
type Reconciliation = {
    Id: ReconciliationId
    AccountId: AccountId
    StatementDate: DateTime
    StatementBalance: Money
    ClearedBalance: Money
    Difference: Money
    Status: ReconciliationStatus
    MatchedTransactionIds: TransactionId list
    Notes: string option
    CompletedAt: DateTime option
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    /// Add a transaction to the reconciliation
    member this.MatchTransaction (transactionId: TransactionId) (transactionAmount: Money) =
        if this.Status <> InProgress then
            Error (BusinessRuleViolation "Cannot modify a completed or abandoned reconciliation")
        elif List.contains transactionId this.MatchedTransactionIds then
            Error (BusinessRuleViolation "Transaction is already matched")
        else
            let newClearedBalance = Money.add this.ClearedBalance transactionAmount
            let newDifference = Money.subtract this.StatementBalance newClearedBalance
            Ok
                { this with
                    MatchedTransactionIds = transactionId :: this.MatchedTransactionIds
                    ClearedBalance = newClearedBalance
                    Difference = newDifference
                    UpdatedAt = DateTime.utcNow()
                }
    
    /// Remove a transaction from the reconciliation
    member this.UnmatchTransaction (transactionId: TransactionId) (transactionAmount: Money) =
        if this.Status <> InProgress then
            Error (BusinessRuleViolation "Cannot modify a completed or abandoned reconciliation")
        elif not (List.contains transactionId this.MatchedTransactionIds) then
            Error (BusinessRuleViolation "Transaction is not matched")
        else
            let newClearedBalance = Money.subtract this.ClearedBalance transactionAmount
            let newDifference = Money.subtract this.StatementBalance newClearedBalance
            Ok
                { this with
                    MatchedTransactionIds = List.filter ((<>) transactionId) this.MatchedTransactionIds
                    ClearedBalance = newClearedBalance
                    Difference = newDifference
                    UpdatedAt = DateTime.utcNow()
                }
    
    /// Complete the reconciliation
    member this.Complete () =
        if this.Status <> InProgress then
            Error (BusinessRuleViolation "Reconciliation is not in progress")
        elif not (Money.isZero this.Difference) then
            Error (BusinessRuleViolation $"Cannot complete reconciliation with non-zero difference: {Money.value this.Difference}")
        else
            Ok
                { this with
                    Status = Completed
                    CompletedAt = Some (DateTime.utcNow())
                    UpdatedAt = DateTime.utcNow()
                }
    
    /// Abandon the reconciliation
    member this.Abandon () =
        if this.Status <> InProgress then
            Error (BusinessRuleViolation "Reconciliation is not in progress")
        else
            Ok
                { this with
                    Status = Abandoned
                    UpdatedAt = DateTime.utcNow()
                }

module Reconciliation =
    /// Create a new reconciliation
    let create accountId statementDate statementBalance =
        let now = DateTime.utcNow()
        Ok {
            Id = ReconciliationId.create()
            AccountId = accountId
            StatementDate = statementDate
            StatementBalance = statementBalance
            ClearedBalance = Money.zero
            Difference = statementBalance
            Status = InProgress
            MatchedTransactionIds = []
            Notes = None
            CompletedAt = None
            CreatedAt = now
            UpdatedAt = now
        }
    
    /// Calculate cleared balance from matched transactions
    let calculateClearedBalance (transactions: Transaction list) =
        transactions
        |> List.sumBy (fun tx -> Money.value tx.Amount)
        |> Money.create

/// Receipt entity for storing receipt images/documents
type Receipt = {
    Id: ReceiptId
    TransactionId: TransactionId option
    MerchantId: MerchantId option
    FileName: string
    ContentType: string
    FileSize: int64
    StorageKey: string
    ReceiptDate: DateTime option
    TotalAmount: Money option
    TaxAmount: Money option
    Notes: string option
    UploadedAt: DateTime
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    /// Link to a transaction
    member this.LinkToTransaction (transactionId: TransactionId) =
        Ok
            { this with
                TransactionId = Some transactionId
                UpdatedAt = DateTime.utcNow()
            }
    
    /// Update receipt metadata
    member this.UpdateMetadata merchantId receiptDate totalAmount taxAmount notes =
        Ok
            { this with
                MerchantId = merchantId
                ReceiptDate = receiptDate
                TotalAmount = totalAmount
                TaxAmount = taxAmount
                Notes = notes
                UpdatedAt = DateTime.utcNow()
            }

module Receipt =
    /// Create a new receipt
    let create fileName contentType fileSize storageKey =
        let now = DateTime.utcNow()
        Ok {
            Id = ReceiptId.create()
            TransactionId = None
            MerchantId = None
            FileName = fileName
            ContentType = contentType
            FileSize = fileSize
            StorageKey = storageKey
            ReceiptDate = None
            TotalAmount = None
            TaxAmount = None
            Notes = None
            UploadedAt = now
            CreatedAt = now
            UpdatedAt = now
        }
    
    /// Generate storage key for a receipt
    let generateStorageKey (receiptId: ReceiptId) (fileName: string) =
        let now = DateTime.utcNow()
        sprintf "%s/%s/%s" (now.ToString("yyyy/MM")) (ReceiptId.value receiptId) fileName
