using System.Text.Json.Serialization;

namespace LifeOS.Infrastructure.Persistence.Documents;

public class FinancialAccountDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty; // Checking, Savings, CreditCard, Cash, Loan, Investment

    [JsonPropertyName("institution")]
    public string? Institution { get; set; }

    [JsonPropertyName("accountNumber")]
    public string? AccountNumber { get; set; } // Last 4 digits only

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "USD";

    [JsonPropertyName("openingBalance")]
    public decimal OpeningBalance { get; set; }

    [JsonPropertyName("currentBalance")]
    public decimal CurrentBalance { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class FinancialMerchantDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("defaultCategoryKey")]
    public string? DefaultCategoryKey { get; set; }

    [JsonPropertyName("address")]
    public string? Address { get; set; }

    [JsonPropertyName("city")]
    public string? City { get; set; }

    [JsonPropertyName("state")]
    public string? State { get; set; }

    [JsonPropertyName("postalCode")]
    public string? PostalCode { get; set; }

    [JsonPropertyName("phone")]
    public string? Phone { get; set; }

    [JsonPropertyName("website")]
    public string? Website { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class FinancialCategoryDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty; // Income, Expense, Transfer

    [JsonPropertyName("parentKey")]
    public string? ParentKey { get; set; }

    [JsonPropertyName("icon")]
    public string? Icon { get; set; }

    [JsonPropertyName("color")]
    public string? Color { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class FinancialTransactionDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("accountKey")]
    public string AccountKey { get; set; } = string.Empty;

    [JsonPropertyName("merchantKey")]
    public string? MerchantKey { get; set; }

    [JsonPropertyName("categoryKey")]
    public string? CategoryKey { get; set; }

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; } // Positive = credit/deposit, Negative = debit/withdrawal

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("memo")]
    public string? Memo { get; set; }

    [JsonPropertyName("postedAt")]
    public DateTime PostedAt { get; set; }

    [JsonPropertyName("authorizedAt")]
    public DateTime? AuthorizedAt { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "Posted"; // Pending, Posted, Cleared, Reconciled, Void

    [JsonPropertyName("externalId")]
    public string? ExternalId { get; set; } // For bank import deduplication

    [JsonPropertyName("checkNumber")]
    public string? CheckNumber { get; set; }

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = new();

    [JsonPropertyName("receiptKey")]
    public string? ReceiptKey { get; set; }

    [JsonPropertyName("reconciliationKey")]
    public string? ReconciliationKey { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class FinancialJournalEntryDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("transactionKey")]
    public string TransactionKey { get; set; } = string.Empty;

    [JsonPropertyName("accountKey")]
    public string AccountKey { get; set; } = string.Empty;

    [JsonPropertyName("debit")]
    public decimal Debit { get; set; }

    [JsonPropertyName("credit")]
    public decimal Credit { get; set; }

    [JsonPropertyName("entryDate")]
    public DateTime EntryDate { get; set; }

    [JsonPropertyName("memo")]
    public string? Memo { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

public class FinancialReceiptDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("transactionKey")]
    public string? TransactionKey { get; set; }

    [JsonPropertyName("merchantKey")]
    public string? MerchantKey { get; set; }

    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("contentType")]
    public string ContentType { get; set; } = string.Empty;

    [JsonPropertyName("fileSize")]
    public long FileSize { get; set; }

    [JsonPropertyName("storageKey")]
    public string StorageKey { get; set; } = string.Empty; // MinIO object key

    [JsonPropertyName("receiptDate")]
    public DateTime? ReceiptDate { get; set; }

    [JsonPropertyName("totalAmount")]
    public decimal? TotalAmount { get; set; }

    [JsonPropertyName("taxAmount")]
    public decimal? TaxAmount { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("ocrText")]
    public string? OcrText { get; set; } // For future OCR integration

    [JsonPropertyName("uploadedAt")]
    public DateTime UploadedAt { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class FinancialReconciliationDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("accountKey")]
    public string AccountKey { get; set; } = string.Empty;

    [JsonPropertyName("statementDate")]
    public DateTime StatementDate { get; set; }

    [JsonPropertyName("statementBalance")]
    public decimal StatementBalance { get; set; }

    [JsonPropertyName("clearedBalance")]
    public decimal ClearedBalance { get; set; }

    [JsonPropertyName("difference")]
    public decimal Difference { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "InProgress"; // InProgress, Completed, Abandoned

    [JsonPropertyName("matchedTransactionKeys")]
    public List<string> MatchedTransactionKeys { get; set; } = new();

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("completedAt")]
    public DateTime? CompletedAt { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class FinancialBudgetDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    // Legacy month-based fields (kept for backward compatibility)
    [JsonPropertyName("year")]
    public int Year { get; set; }

    [JsonPropertyName("month")]
    public int Month { get; set; }

    // New flexible period fields
    [JsonPropertyName("periodType")]
    public string PeriodType { get; set; } = "Monthly"; // Monthly, Weekly, BiWeekly, SemiMonthly, Custom, PayPeriod

    [JsonPropertyName("startDate")]
    public DateTime? StartDate { get; set; }

    [JsonPropertyName("endDate")]
    public DateTime? EndDate { get; set; }

    [JsonPropertyName("periodKey")]
    public string? PeriodKey { get; set; } // Unique key for the period (e.g., "2025-01" or "pp-2025-01-03")

    [JsonPropertyName("categoryKey")]
    public string CategoryKey { get; set; } = string.Empty;

    [JsonPropertyName("budgetedAmount")]
    public decimal BudgetedAmount { get; set; }

    [JsonPropertyName("spentAmount")]
    public decimal SpentAmount { get; set; }

    [JsonPropertyName("rolloverAmount")]
    public decimal RolloverAmount { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Stores user's pay-period configuration (anchor date, period length in days)
/// </summary>
public class PayPeriodConfigDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = "default";

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("anchorDate")]
    public DateTime AnchorDate { get; set; } // Known pay date to anchor calculations

    [JsonPropertyName("periodLengthDays")]
    public int PeriodLengthDays { get; set; } = 14; // Default bi-weekly

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
