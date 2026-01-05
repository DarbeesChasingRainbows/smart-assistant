namespace LifeOS.Domain.Finance

open System
open LifeOS.Domain.Common

/// Result type for transfer operations
type TransferResult = {
    Transfer: Transfer
    JournalEntries: JournalEntrySet
    UpdatedFromAccount: Account
    UpdatedToAccount: Account
}

/// Result type for transaction operations
type TransactionResult = {
    Transaction: Transaction
    JournalEntries: JournalEntrySet
    UpdatedAccount: Account
}

/// Result type for void operations
type VoidResult = {
    Transaction: Transaction
    UpdatedAccount: Account
}

/// Result type for reconciliation completion
type ReconciliationResult = {
    Reconciliation: Reconciliation
    ReconciledTransactions: Transaction list
}

/// Domain services for Finance bounded context
module FinanceServices =
    
    /// Service for handling account balance operations
    module AccountBalanceService =
        /// Apply a transaction to an account's balance
        let applyTransaction (account: Account) (transaction: Transaction) =
            if Transaction.affectsBalance transaction then
                account.ApplyAmount transaction.Amount
            else
                Ok account
        
        /// Reverse a transaction from an account's balance (for voids/corrections)
        let reverseTransaction (account: Account) (transaction: Transaction) =
            if Transaction.affectsBalance transaction then
                account.ReverseAmount transaction.Amount
            else
                Ok account
        
        /// Recalculate account balance from all transactions
        let recalculateBalance (account: Account) (transactions: Transaction list) =
            let totalFromTransactions =
                transactions
                |> Seq.filter Transaction.affectsBalance
                |> Seq.sumBy (fun tx -> Money.value tx.Amount)
                |> Money.create
            
            let expectedBalance = Money.add account.OpeningBalance totalFromTransactions
            Ok { account with 
                    CurrentBalance = expectedBalance
                    UpdatedAt = DateTime.utcNow() }
    
    /// Service for handling transfers between accounts
    module TransferService =
        /// Execute a transfer between two accounts
        let executeTransfer fromAccount toAccount amount description postedAt =
            result {
                do! Account.canAcceptTransactions fromAccount
                do! Account.canAcceptTransactions toAccount
                let! transfer = Transfer.create fromAccount.Id toAccount.Id amount description postedAt
                let! journalEntries = Transfer.getJournalEntries transfer
                let! updatedFromAccount = fromAccount.ApplyAmount (Money.negate (Money.abs amount))
                let! updatedToAccount = toAccount.ApplyAmount (Money.abs amount)
                return { Transfer = transfer
                         JournalEntries = journalEntries
                         UpdatedFromAccount = updatedFromAccount
                         UpdatedToAccount = updatedToAccount }
            }
    
    /// Service for handling transaction creation with double-entry bookkeeping
    module TransactionService =
        /// Create a transaction with journal entries
        let createTransaction account merchantId categoryId amount description memo postedAt authorizedAt checkNumber tags =
            result {
                do! Account.canAcceptTransactions account
                let! transaction = 
                    Transaction.createFull account.Id merchantId categoryId amount description memo postedAt authorizedAt checkNumber tags
                let! journalEntries = 
                    JournalEntrySet.forSimpleTransaction transaction.Id account.Id amount postedAt
                let! updatedAccount = account.ApplyAmount amount
                return { Transaction = transaction
                         JournalEntries = journalEntries
                         UpdatedAccount = updatedAccount }
            }
        
        /// Void a transaction and reverse its effects
        let voidTransaction (account: Account) (transaction: Transaction) =
            result {
                let! voidedTransaction = transaction.Void()
                let! updatedAccount = AccountBalanceService.reverseTransaction account transaction
                return { Transaction = voidedTransaction
                         UpdatedAccount = updatedAccount }
            }
        
        /// Update transaction amount (only for pending transactions)
        let updateTransactionAmount (account: Account) (transaction: Transaction) newAmount =
            result {
                let oldAmount = transaction.Amount
                let! updatedTransaction = transaction.UpdateAmount newAmount
                let diff = Money.subtract newAmount oldAmount
                let! updatedAccount = account.ApplyAmount diff
                return { Transaction = updatedTransaction
                         UpdatedAccount = updatedAccount }
            }
    
    /// Service for budget calculations
    module BudgetService =
        /// Calculate spent amounts for all budgets in a period
        let calculateSpentAmounts (budgets: Budget list) (transactions: Transaction list) =
            budgets
            |> Seq.map (fun budget ->
                let spent = Budget.calculateSpentFromTransactions transactions budget.CategoryId budget.Period
                budget.UpdateSpentAmount spent)
            |> Seq.toList
            |> List.sequenceResultM
        
        /// Create or update a budget for a category in a period
        let upsertBudget period categoryId budgetedAmount existingBudget =
            Budget.upsert period categoryId budgetedAmount existingBudget
        
        /// Calculate rollover from previous period
        let calculateRollover (previousBudget: Budget option) =
            match previousBudget with
            | Some budget -> budget.RemainingAmount
            | None -> Money.zero
        
        /// Get budget summary for a period
        let getBudgetSummary period budgets transactions =
            result {
                let! updatedBudgets = calculateSpentAmounts budgets transactions
                return BudgetSummary.create period updatedBudgets
            }
    
    /// Service for reconciliation operations
    module ReconciliationService =
        /// Start a new reconciliation
        let startReconciliation accountId statementDate statementBalance =
            Reconciliation.create accountId statementDate statementBalance
        
        /// Match a transaction to a reconciliation
        let matchTransaction (reconciliation: Reconciliation) (transaction: Transaction) =
            reconciliation.MatchTransaction transaction.Id transaction.Amount
        
        /// Match multiple transactions
        let matchTransactions (reconciliation: Reconciliation) (transactions: Transaction list) =
            transactions
            |> Seq.fold (fun (reconcResult: Result<Reconciliation, DomainError>) (tx: Transaction) ->
                match reconcResult with
                | Error e -> Error e
                | Ok recon -> recon.MatchTransaction tx.Id tx.Amount
            ) (Ok reconciliation)
        
        /// Complete reconciliation and mark transactions as reconciled
        let completeReconciliation (reconciliation: Reconciliation) (transactions: Transaction list) =
            result {
                let! completedRecon = reconciliation.Complete()
                let! reconciledTransactions =
                    transactions
                    |> Seq.filter (fun tx -> Seq.contains tx.Id reconciliation.MatchedTransactionIds)
                    |> Seq.map (fun tx -> tx.Reconcile completedRecon.Id)
                    |> Seq.toList
                    |> List.sequenceResultM
                return { Reconciliation = completedRecon
                         ReconciledTransactions = reconciledTransactions }
            }
    
    /// Service for pay period calculations
    module PayPeriodService =
        /// Get the current pay period
        let getCurrentPayPeriod config =
            PayPeriodConfig.getPeriodContaining config (DateTime.utcNow())
        
        /// Get a budget period spanning multiple pay periods from today
        let getMultiPayPeriod config periodCount =
            PayPeriodConfig.getMultiPeriod config (DateTime.utcNow()) periodCount
        
        /// Calculate the next pay date
        let getNextPayDate config =
            match getCurrentPayPeriod config with
            | Ok period -> Ok (period.EndDate.AddDays(1.0))
            | Error e -> Error e
        
        /// Get all pay periods in a date range
        let getPayPeriodsInRange config startDate endDate =
            let rec loop currentDate periods =
                if currentDate > endDate then
                    periods |> Seq.rev |> Seq.toList
                else
                    match PayPeriodConfig.getPeriodContaining config currentDate with
                    | Ok period ->
                        let nextStart = period.EndDate.AddDays(1.0)
                        loop nextStart (Seq.append (Seq.singleton period) periods)
                    | Error _ -> periods |> Seq.rev |> Seq.toList
            loop startDate Seq.empty
