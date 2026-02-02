using Microsoft.AspNetCore.SignalR;

namespace LifeOS.API.Hubs;

/// <summary>
/// SignalR Hub for real-time budget updates.
/// Clients can subscribe to family-specific budget events.
/// </summary>
public class BudgetHub : Hub
{
    private readonly ILogger<BudgetHub> _logger;

    public BudgetHub(ILogger<BudgetHub> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Join a family group to receive budget updates for that family.
    /// </summary>
    public async Task JoinFamily(string familyId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"family:{familyId}");
        _logger.LogInformation("Client {ConnectionId} joined family group {FamilyId}", 
            Context.ConnectionId, familyId);
    }

    /// <summary>
    /// Leave a family group.
    /// </summary>
    public async Task LeaveFamily(string familyId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"family:{familyId}");
        _logger.LogInformation("Client {ConnectionId} left family group {FamilyId}", 
            Context.ConnectionId, familyId);
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}

/// <summary>
/// Event types that can be broadcast to clients.
/// </summary>
public static class BudgetEvents
{
    public const string AssignmentUpdated = "AssignmentUpdated";
    public const string TransactionCreated = "TransactionCreated";
    public const string TransactionUpdated = "TransactionUpdated";
    public const string TransactionDeleted = "TransactionDeleted";
    public const string CategoryBalanceChanged = "CategoryBalanceChanged";
    public const string BillPaid = "BillPaid";
    public const string BillDueSoon = "BillDueSoon";
    public const string GoalProgressUpdated = "GoalProgressUpdated";
    public const string AccountBalanceChanged = "AccountBalanceChanged";
    public const string PayPeriodChanged = "PayPeriodChanged";
    public const string CarryoverRecalculated = "CarryoverRecalculated";
    // Debt-specific events
    public const string DebtPaymentMade = "DebtPaymentMade";
    public const string DebtPaidOff = "DebtPaidOff";
    public const string HighInterestAlert = "HighInterestAlert";
    public const string DebtMilestone = "DebtMilestone";
}

/// <summary>
/// DTOs for SignalR events
/// </summary>
public record BudgetEventPayload(
    string EventType,
    string FamilyId,
    object Data,
    DateTime Timestamp
);

public record AssignmentUpdatedPayload(
    string CategoryKey,
    string PayPeriodKey,
    decimal AssignedAmount,
    decimal Available
);

public record TransactionEventPayload(
    string TransactionKey,
    string CategoryKey,
    string AccountKey,
    decimal Amount,
    string? Description
);

public record CategoryBalancePayload(
    string CategoryKey,
    string CategoryName,
    decimal Carryover,
    decimal Assigned,
    decimal Spent,
    decimal Available
);

public record AccountBalancePayload(
    string AccountKey,
    string AccountName,
    decimal Balance,
    decimal ClearedBalance
);

public record BillAlertPayload(
    string BillKey,
    string BillName,
    decimal Amount,
    DateTime DueDate,
    bool IsOverdue
);

public record GoalProgressPayload(
    string GoalKey,
    string GoalName,
    decimal CurrentAmount,
    decimal TargetAmount,
    decimal PercentComplete
);

// Debt-specific payloads
public record DebtPaymentPayload(
    string BillKey,
    string BillName,
    decimal PaymentAmount,
    decimal NewBalance,
    decimal PreviousBalance
);

public record DebtPaidOffPayload(
    string BillKey,
    string BillName,
    decimal TotalPaid,
    decimal InterestPaid
);

public record HighInterestAlertPayload(
    string BillKey,
    string BillName,
    decimal InterestRate,
    decimal MonthlyInterest
);

public record DebtMilestonePayload(
    string BillKey,
    string BillName,
    int PercentPaidOff,
    decimal RemainingBalance,
    decimal OriginalAmount
);
