namespace LifeOS.Domain.Finance

open System
open LifeOS.Domain.Common

/// Financial Transaction Aggregate Root
type Transaction = {
    Id: TransactionId
    AccountId: AccountId
    MerchantId: MerchantId option
    CategoryId: CategoryId option
    Amount: Money
    Description: string
    Memo: string option
    PostedAt: DateTime
    AuthorizedAt: DateTime option
    Status: TransactionStatus
    ExternalId: string option  // For bank import deduplication
    CheckNumber: string option
    Tags: string list
    ReceiptId: ReceiptId option
    ReconciliationId: ReconciliationId option
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    /// Update transaction status with business rule validation
    member this.UpdateStatus (newStatus: TransactionStatus) =
        if not (TransactionStatus.canTransitionTo this.Status newStatus) then
            Error (BusinessRuleViolation $"Cannot transition from {TransactionStatus.toString this.Status} to {TransactionStatus.toString newStatus}")
        else
            Ok { this with 
                Status = newStatus
                UpdatedAt = DateTime.utcNow()
            }
    
    /// Void the transaction
    member this.Void () =
        match this.Status with
        | Reconciled -> 
            Error (BusinessRuleViolation "Cannot void a reconciled transaction")
        | TransactionStatus.Void -> 
            Error (BusinessRuleViolation "Transaction is already void")
        | _ ->
            Ok { this with Status = TransactionStatus.Void; UpdatedAt = DateTime.utcNow() }
    
    /// Update transaction details
    member this.UpdateDetails merchantId categoryId description memo tags : Result<Transaction, DomainError> =
        Ok { this with
            MerchantId = merchantId
            CategoryId = categoryId
            Description = description
            Memo = memo
            Tags = tags
            UpdatedAt = DateTime.utcNow()
        }
    
    /// Update posted date
    member this.UpdatePostedAt (postedAt: DateTime) : Result<Transaction, DomainError> =
        Ok { this with
            PostedAt = postedAt
            UpdatedAt = DateTime.utcNow()
        }
    
    /// Update check number
    member this.UpdateCheckNumber (checkNumber: string option) : Result<Transaction, DomainError> =
        Ok { this with
            CheckNumber = checkNumber
            UpdatedAt = DateTime.utcNow()
        }
    
    /// Update amount (only allowed for pending transactions)
    member this.UpdateAmount (newAmount: Money) =
        match this.Status with
        | Pending ->
            Ok { this with
                Amount = newAmount
                UpdatedAt = DateTime.utcNow()
            }
        | _ ->
            Error (BusinessRuleViolation "Can only update amount for pending transactions")
    
    /// Attach a receipt
    member this.AttachReceipt (receiptId: ReceiptId) =
        Ok { this with
            ReceiptId = Some receiptId
            UpdatedAt = DateTime.utcNow()
        }
    
    /// Mark as reconciled
    member this.Reconcile (reconciliationId: ReconciliationId) =
        match this.Status with
        | Cleared ->
            Ok { this with
                Status = Reconciled
                ReconciliationId = Some reconciliationId
                UpdatedAt = DateTime.utcNow()
            }
        | Reconciled ->
            Error (BusinessRuleViolation "Transaction is already reconciled")
        | _ ->
            Error (BusinessRuleViolation "Transaction must be cleared before reconciliation")

module Transaction =
    /// Create a new transaction
    let create accountId amount description postedAt =
        let now = DateTime.utcNow()
        Ok {
            Id = TransactionId.create()
            AccountId = accountId
            MerchantId = None
            CategoryId = None
            Amount = amount
            Description = description
            Memo = None
            PostedAt = postedAt
            AuthorizedAt = None
            Status = Posted
            ExternalId = None
            CheckNumber = None
            Tags = []
            ReceiptId = None
            ReconciliationId = None
            CreatedAt = now
            UpdatedAt = now
        }
    
    /// Create a transaction with full details
    let createFull accountId merchantId categoryId amount description memo postedAt authorizedAt checkNumber tags =
        let now = DateTime.utcNow()
        Ok {
            Id = TransactionId.create()
            AccountId = accountId
            MerchantId = merchantId
            CategoryId = categoryId
            Amount = amount
            Description = description
            Memo = memo
            PostedAt = postedAt
            AuthorizedAt = authorizedAt
            Status = Posted
            ExternalId = None
            CheckNumber = checkNumber
            Tags = tags
            ReceiptId = None
            ReconciliationId = None
            CreatedAt = now
            UpdatedAt = now
        }
    
    /// Business rule: Check if transaction affects account balance
    let affectsBalance (tx: Transaction) =
        tx.Status <> TransactionStatus.Void
    
    /// Get the balance impact of a transaction
    let balanceImpact (tx: Transaction) =
        if affectsBalance tx then tx.Amount
        else Money.zero
    
    /// Check if transaction is within a date range
    let isInDateRange (startDate: DateTime) (endDate: DateTime) (tx: Transaction) =
        tx.PostedAt >= startDate && tx.PostedAt <= endDate
    
    /// Check if transaction matches a category
    let hasCategory (categoryId: CategoryId) (tx: Transaction) =
        tx.CategoryId = Some categoryId

/// Transfer between accounts (domain concept, not persisted directly)
type Transfer = {
    TransferId: string
    FromAccountId: AccountId
    ToAccountId: AccountId
    Amount: Money
    Description: string
    PostedAt: DateTime
    WithdrawalTransaction: Transaction
    DepositTransaction: Transaction
}

module Transfer =
    /// Create a transfer between two accounts
    let create fromAccountId toAccountId amount description postedAt =
        if Money.isZero amount then
            Error (ValidationError "Transfer amount cannot be zero")
        elif Money.isNegative amount then
            Error (ValidationError "Transfer amount must be positive")
        else
            let transferId = Guid.NewGuid().ToString("N")[..7]
            let absAmount = Money.abs amount
            let now = DateTime.utcNow()
            
            // Create withdrawal transaction (negative amount)
            let withdrawalTx = {
                Id = TransactionId.create()
                AccountId = fromAccountId
                MerchantId = None
                CategoryId = None
                Amount = Money.negate absAmount
                Description = $"{description} (transfer out)"
                Memo = None
                PostedAt = postedAt
                AuthorizedAt = None
                Status = Posted
                ExternalId = None
                CheckNumber = None
                Tags = ["transfer"; $"transfer:{transferId}"]
                ReceiptId = None
                ReconciliationId = None
                CreatedAt = now
                UpdatedAt = now
            }
            
            // Create deposit transaction (positive amount)
            let depositTx = {
                Id = TransactionId.create()
                AccountId = toAccountId
                MerchantId = None
                CategoryId = None
                Amount = absAmount
                Description = $"{description} (transfer in)"
                Memo = None
                PostedAt = postedAt
                AuthorizedAt = None
                Status = Posted
                ExternalId = None
                CheckNumber = None
                Tags = ["transfer"; $"transfer:{transferId}"]
                ReceiptId = None
                ReconciliationId = None
                CreatedAt = now
                UpdatedAt = now
            }
            
            Ok {
                TransferId = transferId
                FromAccountId = fromAccountId
                ToAccountId = toAccountId
                Amount = absAmount
                Description = description
                PostedAt = postedAt
                WithdrawalTransaction = withdrawalTx
                DepositTransaction = depositTx
            }
    
    /// Get journal entries for a transfer
    let getJournalEntries (transfer: Transfer) =
        JournalEntrySet.forTransfer 
            transfer.WithdrawalTransaction.Id 
            transfer.DepositTransaction.Id
            transfer.FromAccountId 
            transfer.ToAccountId 
            transfer.Amount 
            transfer.PostedAt
