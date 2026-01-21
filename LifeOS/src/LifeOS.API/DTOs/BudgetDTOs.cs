namespace LifeOS.API.DTOs;

// ============================================
// Budget Domain DTOs
// Zero-Based Budgeting: Every dollar has a job
// Pay-Period Centric: Budget per paycheck, not monthly
// ============================================

// Pay Period DTOs
public record BudgetPayPeriodDto
{
    public string Key { get; init; } = string.Empty;
    public string FamilyId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public bool IsActive { get; init; }
    public bool IsClosed { get; init; }
    public decimal ExpectedIncome { get; init; }
    public decimal TotalIncome { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreatePayPeriodRequest
{
    public string FamilyId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public decimal ExpectedIncome { get; init; }
}

public record UpdatePayPeriodRequest
{
    public string? Name { get; init; }
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public bool? IsActive { get; init; }
    public bool? IsClosed { get; init; }
    public decimal? ExpectedIncome { get; init; }
}

// Category Group DTOs
public record BudgetCategoryGroupDto
{
    public string Key { get; init; } = string.Empty;
    public string FamilyId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public int SortOrder { get; init; }
    public bool IsSystem { get; init; }
    public DateTime CreatedAt { get; init; }
    public List<BudgetCategoryDto> Categories { get; init; } = [];
}

public record CreateCategoryGroupRequest
{
    public string FamilyId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public int SortOrder { get; init; }
}

// Category DTOs
public record BudgetCategoryDto
{
    public string Key { get; init; } = string.Empty;
    public string GroupKey { get; init; } = string.Empty;
    public string FamilyId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public decimal TargetAmount { get; init; }
    public int SortOrder { get; init; }
    public bool IsHidden { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record CreateBudgetCategoryRequest
{
    public string GroupKey { get; init; } = string.Empty;
    public string FamilyId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public decimal TargetAmount { get; init; }
}

public record UpdateBudgetCategoryRequest
{
    public string? Name { get; init; }
    public string? GroupKey { get; init; }
    public decimal? TargetAmount { get; init; }
    public int? SortOrder { get; init; }
    public bool? IsHidden { get; init; }
}

// Budget Assignment DTOs (Zero-Based Budgeting Core)
public record BudgetAssignmentDto
{
    public string Key { get; init; } = string.Empty;
    public string PayPeriodKey { get; init; } = string.Empty;
    public string CategoryKey { get; init; } = string.Empty;
    public decimal AssignedAmount { get; init; }
    public string? CreatedByUserKey { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record AssignMoneyRequest
{
    public string PayPeriodKey { get; init; } = string.Empty;
    public string CategoryKey { get; init; } = string.Empty;
    public decimal Amount { get; init; }
}

// Income Entry DTOs
public record BudgetIncomeEntryDto
{
    public string Key { get; init; } = string.Empty;
    public string PayPeriodKey { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public DateTime? ReceivedDate { get; init; }
    public string? CreatedByUserKey { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record AddIncomeRequest
{
    public string PayPeriodKey { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public DateTime? ReceivedDate { get; init; }
}

// Budget Account DTOs
public record BudgetAccountDto
{
    public string Key { get; init; } = string.Empty;
    public string FamilyId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string AccountType { get; init; } = string.Empty;
    public decimal Balance { get; init; }
    public decimal ClearedBalance { get; init; }
    public bool IsActive { get; init; }
    public bool IsClosed { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateBudgetAccountRequest
{
    public string FamilyId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string AccountType { get; init; } = string.Empty;
    public decimal OpeningBalance { get; init; }
}

public record UpdateBudgetAccountRequest
{
    public string? Name { get; init; }
    public bool? IsActive { get; init; }
    public bool? IsClosed { get; init; }
}

// Budget Bill DTOs
public record BudgetBillDto
{
    public string Key { get; init; } = string.Empty;
    public string FamilyId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string CategoryKey { get; init; } = string.Empty;
    public string AccountKey { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public int DueDay { get; init; }
    public string Frequency { get; init; } = string.Empty;
    public bool IsAutoPay { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record CreateBudgetBillRequest
{
    public string FamilyId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string CategoryKey { get; init; } = string.Empty;
    public string AccountKey { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public int DueDay { get; init; }
    public string Frequency { get; init; } = string.Empty;
    public bool IsAutoPay { get; init; }
}

public record UpdateBudgetBillRequest
{
    public string? Name { get; init; }
    public string? CategoryKey { get; init; }
    public string? AccountKey { get; init; }
    public decimal? Amount { get; init; }
    public int? DueDay { get; init; }
    public string? Frequency { get; init; }
    public bool? IsAutoPay { get; init; }
    public bool? IsActive { get; init; }
}

public record MarkBillPaidRequest
{
    public DateTime PaidDate { get; init; }
    public decimal? ActualAmount { get; init; } // Optional: if paid amount differs from bill amount
    public string? Memo { get; init; } // Optional: additional notes for this payment
}

// Budget Goal DTOs
public record BudgetGoalDto
{
    public string Key { get; init; } = string.Empty;
    public string FamilyId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string CategoryKey { get; init; } = string.Empty;
    public decimal TargetAmount { get; init; }
    public decimal CurrentAmount { get; init; }
    public DateTime? TargetDate { get; init; }
    public bool IsCompleted { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateBudgetGoalRequest
{
    public string FamilyId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string CategoryKey { get; init; } = string.Empty;
    public decimal TargetAmount { get; init; }
    public DateTime? TargetDate { get; init; }
}

public record UpdateBudgetGoalProgressRequest
{
    public decimal Amount { get; init; }
}

// Budget Transaction DTOs
public record BudgetTransactionDto
{
    public string Key { get; init; } = string.Empty;
    public string AccountKey { get; init; } = string.Empty;
    public string? CategoryKey { get; init; }
    public string? PayPeriodKey { get; init; }
    public string Payee { get; init; } = string.Empty;
    public string? Memo { get; init; }
    public decimal Amount { get; init; }
    public List<SplitItem>? Splits { get; init; }
    public DateTime TransactionDate { get; init; }
    public bool IsCleared { get; init; }
    public bool IsReconciled { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record CreateBudgetTransactionRequest
{
    public string AccountKey { get; init; } = string.Empty;
    public string? CategoryKey { get; init; }
    public string Payee { get; init; } = string.Empty;
    public string? Memo { get; init; }
    public decimal Amount { get; init; }
    public DateTime TransactionDate { get; init; }
}

public record CreateBudgetTransferRequest
{
    public string FromAccountKey { get; init; } = string.Empty;
    public string ToAccountKey { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public DateTime TransactionDate { get; init; }
    public string? Memo { get; init; }
}

public record UpdateBudgetTransactionRequest
{
    public string? CategoryKey { get; init; }
    public string? Payee { get; init; }
    public string? Memo { get; init; }
    public decimal? Amount { get; init; }
    public DateTime? TransactionDate { get; init; }
    public bool? IsCleared { get; init; }
}

// CQRS Query Response DTOs
public record PayPeriodBudgetSummaryDto
{
    public string PayPeriodKey { get; init; } = string.Empty;
    public string PayPeriodName { get; init; } = string.Empty;
    public decimal TotalIncome { get; init; }
    public decimal TotalAssigned { get; init; }
    public decimal Unassigned { get; init; }
    public bool IsFullyAllocated => Unassigned == 0;
}

public record CategoryBalanceDto
{
    public string CategoryKey { get; init; } = string.Empty;
    public string CategoryName { get; init; } = string.Empty;
    public string GroupName { get; init; } = string.Empty;
    public decimal Carryover { get; init; }
    public decimal Assigned { get; init; }
    public decimal Spent { get; init; }
    public decimal Available => Carryover + Assigned - Spent;
}

public record AccountSummaryDto
{
    public string AccountKey { get; init; } = string.Empty;
    public string AccountName { get; init; } = string.Empty;
    public string AccountType { get; init; } = string.Empty;
    public decimal Balance { get; init; }
    public decimal ClearedBalance { get; init; }
    public int UnclearedCount { get; init; }
}

public record UpcomingBillDto
{
    public string BillKey { get; init; } = string.Empty;
    public string BillName { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public DateTime DueDate { get; init; }
    public string CategoryName { get; init; } = string.Empty;
    public string AccountName { get; init; } = string.Empty;
    public bool IsAutoPay { get; init; }
}

// Split transaction DTOs
public record SplitItem
{
    public string? CategoryKey { get; init; }
    public decimal Amount { get; init; }
    public string? Memo { get; init; }
}

public record ReplaceSplitsRequest
{
    public List<SplitItem> Splits { get; init; } = [];
}

// Dashboard DTO (aggregated view)
public record BudgetDashboardDto
{
    public BudgetPayPeriodDto? CurrentPayPeriod { get; init; }
    public PayPeriodBudgetSummaryDto? BudgetSummary { get; init; }
    public List<AccountSummaryDto> Accounts { get; init; } = [];
    public List<UpcomingBillDto> UpcomingBills { get; init; } = [];
    public List<BudgetGoalDto> Goals { get; init; } = [];
    public List<CategoryBalanceDto> CategoryBalances { get; init; } = [];
}
