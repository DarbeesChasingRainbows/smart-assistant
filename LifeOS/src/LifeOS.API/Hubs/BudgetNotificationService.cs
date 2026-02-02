using Microsoft.AspNetCore.SignalR;

namespace LifeOS.API.Hubs;

/// <summary>
/// Service for broadcasting budget events to connected SignalR clients.
/// Inject this into endpoints to send real-time updates.
/// </summary>
public class BudgetNotificationService
{
    private readonly IHubContext<BudgetHub> _hubContext;
    private readonly ILogger<BudgetNotificationService> _logger;

    public BudgetNotificationService(
        IHubContext<BudgetHub> hubContext,
        ILogger<BudgetNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    private async Task BroadcastToFamily(string familyId, string eventType, object data)
    {
        var payload = new BudgetEventPayload(eventType, familyId, data, DateTime.UtcNow);
        await _hubContext.Clients.Group($"family:{familyId}").SendAsync(eventType, payload);
        _logger.LogDebug("Broadcast {EventType} to family {FamilyId}", eventType, familyId);
    }

    public async Task NotifyAssignmentUpdated(
        string familyId,
        string categoryKey,
        string payPeriodKey,
        decimal assignedAmount,
        decimal available)
    {
        var payload = new AssignmentUpdatedPayload(categoryKey, payPeriodKey, assignedAmount, available);
        await BroadcastToFamily(familyId, BudgetEvents.AssignmentUpdated, payload);
    }

    public async Task NotifyTransactionCreated(
        string familyId,
        string transactionKey,
        string categoryKey,
        string accountKey,
        decimal amount,
        string? description)
    {
        var payload = new TransactionEventPayload(transactionKey, categoryKey, accountKey, amount, description);
        await BroadcastToFamily(familyId, BudgetEvents.TransactionCreated, payload);
    }

    public async Task NotifyTransactionUpdated(
        string familyId,
        string transactionKey,
        string categoryKey,
        string accountKey,
        decimal amount,
        string? description)
    {
        var payload = new TransactionEventPayload(transactionKey, categoryKey, accountKey, amount, description);
        await BroadcastToFamily(familyId, BudgetEvents.TransactionUpdated, payload);
    }

    public async Task NotifyTransactionDeleted(
        string familyId,
        string transactionKey,
        string categoryKey,
        string accountKey,
        decimal amount,
        string? description)
    {
        var payload = new TransactionEventPayload(transactionKey, categoryKey, accountKey, amount, description);
        await BroadcastToFamily(familyId, BudgetEvents.TransactionDeleted, payload);
    }

    public async Task NotifyCategoryBalanceChanged(
        string familyId,
        string categoryKey,
        string categoryName,
        decimal carryover,
        decimal assigned,
        decimal spent,
        decimal available)
    {
        var payload = new CategoryBalancePayload(categoryKey, categoryName, carryover, assigned, spent, available);
        await BroadcastToFamily(familyId, BudgetEvents.CategoryBalanceChanged, payload);
    }

    public async Task NotifyAccountBalanceChanged(
        string familyId,
        string accountKey,
        string accountName,
        decimal balance,
        decimal clearedBalance)
    {
        var payload = new AccountBalancePayload(accountKey, accountName, balance, clearedBalance);
        await BroadcastToFamily(familyId, BudgetEvents.AccountBalanceChanged, payload);
    }

    public async Task NotifyBillPaid(
        string familyId,
        string billKey,
        string billName,
        decimal amount,
        DateTime dueDate)
    {
        var payload = new BillAlertPayload(billKey, billName, amount, dueDate, false);
        await BroadcastToFamily(familyId, BudgetEvents.BillPaid, payload);
    }

    public async Task NotifyBillDueSoon(
        string familyId,
        string billKey,
        string billName,
        decimal amount,
        DateTime dueDate,
        bool isOverdue)
    {
        var payload = new BillAlertPayload(billKey, billName, amount, dueDate, isOverdue);
        await BroadcastToFamily(familyId, BudgetEvents.BillDueSoon, payload);
    }

    public async Task NotifyGoalProgressUpdated(
        string familyId,
        string goalKey,
        string goalName,
        decimal currentAmount,
        decimal targetAmount)
    {
        var percentComplete = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
        var payload = new GoalProgressPayload(goalKey, goalName, currentAmount, targetAmount, percentComplete);
        await BroadcastToFamily(familyId, BudgetEvents.GoalProgressUpdated, payload);
    }

    public async Task NotifyCarryoverRecalculated(string familyId, string payPeriodKey)
    {
        await BroadcastToFamily(familyId, BudgetEvents.CarryoverRecalculated, new { PayPeriodKey = payPeriodKey });
    }

    public async Task NotifyPayPeriodChanged(string familyId, string payPeriodKey, string periodName)
    {
        await BroadcastToFamily(familyId, BudgetEvents.PayPeriodChanged, new { PayPeriodKey = payPeriodKey, PeriodName = periodName });
    }

    // Debt-specific notifications
    public async Task NotifyDebtPaymentMade(
        string familyId,
        string billKey,
        string billName,
        decimal paymentAmount,
        decimal newBalance,
        decimal previousBalance)
    {
        var payload = new DebtPaymentPayload(billKey, billName, paymentAmount, newBalance, previousBalance);
        await BroadcastToFamily(familyId, BudgetEvents.DebtPaymentMade, payload);
    }

    public async Task NotifyDebtPaidOff(
        string familyId,
        string billKey,
        string billName,
        decimal totalPaid,
        decimal interestPaid)
    {
        var payload = new DebtPaidOffPayload(billKey, billName, totalPaid, interestPaid);
        await BroadcastToFamily(familyId, BudgetEvents.DebtPaidOff, payload);
    }

    public async Task NotifyHighInterestAlert(
        string familyId,
        string billKey,
        string billName,
        decimal interestRate,
        decimal monthlyInterest)
    {
        var payload = new HighInterestAlertPayload(billKey, billName, interestRate, monthlyInterest);
        await BroadcastToFamily(familyId, BudgetEvents.HighInterestAlert, payload);
    }

    public async Task NotifyDebtMilestone(
        string familyId,
        string billKey,
        string billName,
        int percentPaidOff,
        decimal remainingBalance,
        decimal originalAmount)
    {
        var payload = new DebtMilestonePayload(billKey, billName, percentPaidOff, remainingBalance, originalAmount);
        await BroadcastToFamily(familyId, BudgetEvents.DebtMilestone, payload);
    }
}
