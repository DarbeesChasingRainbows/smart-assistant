namespace LifeOS.API.DTOs;

// Account DTOs
public record FinancialAccountDto
{
    public string Key { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string? Institution { get; init; }
    public string? AccountNumber { get; init; }
    public string Currency { get; init; } = "USD";
    public decimal OpeningBalance { get; init; }
    public decimal CurrentBalance { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateFinancialAccountRequest
{
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string? Institution { get; init; }
    public string? AccountNumber { get; init; }
    public string Currency { get; init; } = "USD";
    public decimal OpeningBalance { get; init; }
}

public record UpdateFinancialAccountRequest
{
    public string? Name { get; init; }
    public string? Institution { get; init; }
    public string? AccountNumber { get; init; }
    public bool? IsActive { get; init; }
}

// Merchant DTOs
public record FinancialMerchantDto
{
    public string Key { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? DefaultCategoryKey { get; init; }
    public string? Address { get; init; }
    public string? City { get; init; }
    public string? State { get; init; }
    public string? PostalCode { get; init; }
    public string? Phone { get; init; }
    public string? Website { get; init; }
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateFinancialMerchantRequest
{
    public string Name { get; init; } = string.Empty;
    public string? DefaultCategoryKey { get; init; }
    public string? Address { get; init; }
    public string? City { get; init; }
    public string? State { get; init; }
    public string? PostalCode { get; init; }
    public string? Phone { get; init; }
    public string? Website { get; init; }
    public string? Notes { get; init; }
}

// Category DTOs
public record FinancialCategoryDto
{
    public string Key { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string? ParentKey { get; init; }
    public string? Icon { get; init; }
    public string? Color { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateFinancialCategoryRequest
{
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string? ParentKey { get; init; }
    public string? Icon { get; init; }
    public string? Color { get; init; }
}

// Transaction DTOs
public record FinancialTransactionDto
{
    public string Key { get; init; } = string.Empty;
    public string AccountKey { get; init; } = string.Empty;
    public string? MerchantKey { get; init; }
    public string? CategoryKey { get; init; }
    public decimal Amount { get; init; }
    public string Description { get; init; } = string.Empty;
    public string? Memo { get; init; }
    public DateTime PostedAt { get; init; }
    public DateTime? AuthorizedAt { get; init; }
    public string Status { get; init; } = string.Empty;
    public string? ExternalId { get; init; }
    public string? CheckNumber { get; init; }
    public List<string> Tags { get; init; } = new();
    public string? ReceiptKey { get; init; }
    public string? ReconciliationKey { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateFinancialTransactionRequest
{
    public string AccountKey { get; init; } = string.Empty;
    public string? MerchantKey { get; init; }
    public string? CategoryKey { get; init; }
    public decimal Amount { get; init; }
    public string Description { get; init; } = string.Empty;
    public string? Memo { get; init; }
    public DateTime? PostedAt { get; init; }
    public DateTime? AuthorizedAt { get; init; }
    public string? CheckNumber { get; init; }
    public List<string>? Tags { get; init; }
}

public record UpdateFinancialTransactionRequest
{
    public string? MerchantKey { get; init; }
    public string? CategoryKey { get; init; }
    public decimal? Amount { get; init; }
    public string? Description { get; init; }
    public string? Memo { get; init; }
    public DateTime? PostedAt { get; init; }
    public string? Status { get; init; }
    public string? CheckNumber { get; init; }
    public List<string>? Tags { get; init; }
}

// Transfer request (creates two transactions + journal entries)
public record CreateFinancialTransferRequest
{
    public string FromAccountKey { get; init; } = string.Empty;
    public string ToAccountKey { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public string? Description { get; init; }
    public DateTime? PostedAt { get; init; }
}

// Journal Entry DTOs (for double-entry)
public record FinancialJournalEntryDto
{
    public string Key { get; init; } = string.Empty;
    public string TransactionKey { get; init; } = string.Empty;
    public string AccountKey { get; init; } = string.Empty;
    public decimal Debit { get; init; }
    public decimal Credit { get; init; }
    public DateTime EntryDate { get; init; }
    public string? Memo { get; init; }
    public DateTime CreatedAt { get; init; }
}

// Receipt DTOs
public record FinancialReceiptDto
{
    public string Key { get; init; } = string.Empty;
    public string? TransactionKey { get; init; }
    public string? MerchantKey { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public long FileSize { get; init; }
    public string StorageKey { get; init; } = string.Empty;
    public DateTime? ReceiptDate { get; init; }
    public decimal? TotalAmount { get; init; }
    public decimal? TaxAmount { get; init; }
    public string? Notes { get; init; }
    public DateTime UploadedAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateFinancialReceiptRequest
{
    public string? TransactionKey { get; init; }
    public string? MerchantKey { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public long FileSize { get; init; }
    public DateTime? ReceiptDate { get; init; }
    public decimal? TotalAmount { get; init; }
    public decimal? TaxAmount { get; init; }
    public string? Notes { get; init; }
}

public record AttachReceiptToTransactionRequest
{
    public string ReceiptKey { get; init; } = string.Empty;
}

public record ReceiptUploadUrlResponse
{
    public string ReceiptKey { get; init; } = string.Empty;
    public string UploadUrl { get; init; } = string.Empty;
    public string StorageKey { get; init; } = string.Empty;
    public int ExpiresInSeconds { get; init; }
}

// Reconciliation DTOs
public record FinancialReconciliationDto
{
    public string Key { get; init; } = string.Empty;
    public string AccountKey { get; init; } = string.Empty;
    public DateTime StatementDate { get; init; }
    public decimal StatementBalance { get; init; }
    public decimal ClearedBalance { get; init; }
    public decimal Difference { get; init; }
    public string Status { get; init; } = string.Empty;
    public List<string> MatchedTransactionKeys { get; init; } = new();
    public string? Notes { get; init; }
    public DateTime? CompletedAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateFinancialReconciliationRequest
{
    public string AccountKey { get; init; } = string.Empty;
    public DateTime StatementDate { get; init; }
    public decimal StatementBalance { get; init; }
}

public record MatchTransactionsRequest
{
    public List<string> TransactionKeys { get; init; } = new();
}

public record CompleteReconciliationRequest
{
    public string? Notes { get; init; }
}

// Budget DTOs
public record FinancialBudgetDto
{
    public string Key { get; init; } = string.Empty;
    // Legacy month-based fields (kept for backward compatibility)
    public int Year { get; init; }
    public int Month { get; init; }
    // New flexible period fields
    public string PeriodType { get; init; } = "Monthly"; // Monthly, Weekly, BiWeekly, SemiMonthly, Custom, PayPeriod
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public string? PeriodKey { get; init; }
    public string CategoryKey { get; init; } = string.Empty;
    public decimal BudgetedAmount { get; init; }
    public decimal SpentAmount { get; init; }
    public decimal RolloverAmount { get; init; }
    public decimal AvailableAmount => BudgetedAmount + RolloverAmount - SpentAmount;
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

// Legacy request (kept for backward compatibility with year/month endpoints)
public record CreateOrUpdateBudgetRequest
{
    public string CategoryKey { get; init; } = string.Empty;
    public decimal BudgetedAmount { get; init; }
    public decimal? RolloverAmount { get; init; }
    public string? Notes { get; init; }
}

// New flexible period budget request
public record CreateOrUpdatePeriodBudgetRequest
{
    public string PeriodType { get; init; } = "Monthly"; // Monthly, Weekly, BiWeekly, SemiMonthly, Custom, PayPeriod
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public string CategoryKey { get; init; } = string.Empty;
    public decimal BudgetedAmount { get; init; }
    public decimal? RolloverAmount { get; init; }
    public string? Notes { get; init; }
}

// Legacy summary (kept for backward compatibility)
public record BudgetSummaryDto
{
    public int Year { get; init; }
    public int Month { get; init; }
    public decimal TotalBudgeted { get; init; }
    public decimal TotalSpent { get; init; }
    public decimal TotalAvailable { get; init; }
    public List<FinancialBudgetDto> Categories { get; init; } = new();
}

// New flexible period summary
public record PeriodBudgetSummaryDto
{
    public string PeriodType { get; init; } = "Monthly";
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public string? PeriodKey { get; init; }
    public decimal TotalBudgeted { get; init; }
    public decimal TotalSpent { get; init; }
    public decimal TotalAvailable { get; init; }
    public List<FinancialBudgetDto> Categories { get; init; } = new();
}

// Pay period configuration
public record PayPeriodConfigDto
{
    public string Key { get; init; } = "default";
    public DateTime AnchorDate { get; init; }
    public int PeriodLengthDays { get; init; } = 14;
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateOrUpdatePayPeriodConfigRequest
{
    public DateTime AnchorDate { get; init; }
    public int PeriodLengthDays { get; init; } = 14;
}
