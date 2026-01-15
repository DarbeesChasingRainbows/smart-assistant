using LifeOS.Infrastructure.Persistence.ArangoDB;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LifeOS.API.BackgroundServices;

/// <summary>
/// Background service that automatically generates bill instances as transactions.
/// Runs daily to check for bills that need to be instantiated.
/// </summary>
public class RecurringBillService : BackgroundService
{
    private readonly ILogger<RecurringBillService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private Timer? _timer;

    public RecurringBillService(
        ILogger<RecurringBillService> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Recurring Bill Service is starting.");

        // Run immediately on startup
        await GenerateBillInstances(stoppingToken);

        // Then run daily at midnight (or every 24 hours from start)
        _timer = new Timer(
            async _ => await GenerateBillInstances(stoppingToken),
            null,
            TimeSpan.FromHours(24),
            TimeSpan.FromHours(24)
        );

        // Keep service alive
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    public async Task GenerateBillInstances(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Recurring Bill Service: Generating bill instances at {Time}", DateTime.UtcNow);

            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ArangoDbContext>();

            // Query for active bills that need instances created
            var query = @"
                FOR bill IN budget_bills
                FILTER bill.isActive == true
                FILTER bill.nextDueDate == null OR bill.nextDueDate <= @futureDate
                RETURN bill
            ";

            var bindVars = new Dictionary<string, object>
            {
                ["futureDate"] = DateTime.UtcNow.AddDays(7) // Look ahead 7 days
            };

            var bills = await db.Client.Cursor.PostCursorAsync<dynamic>(
                query,
                bindVars: bindVars
            );

            int createdCount = 0;
            int skippedCount = 0;

            foreach (var bill in bills.Result)
            {
                if (cancellationToken.IsCancellationRequested) break;

                try
                {
                    var billKey = bill._key?.ToString();
                    var isAutoPay = bill.isAutoPay ?? false;
                    var accountKey = bill.accountKey?.ToString();
                    var categoryKey = bill.categoryKey?.ToString();
                    var billName = bill.name?.ToString() ?? "Unknown Bill";
                    var amount = Convert.ToDecimal(bill.amount ?? 0);
                    var frequency = bill.frequency?.ToString() ?? "monthly";
                    var dueDay = Convert.ToInt32(bill.dueDay ?? 1);
                    var nextDueDate = bill.nextDueDate != null
                        ? DateTime.Parse(bill.nextDueDate.ToString())
                        : DateTime.UtcNow.Date;

                    // Skip if no account assigned
                    if (string.IsNullOrWhiteSpace(accountKey))
                    {
                        _logger.LogWarning($"Bill {billName} ({billKey}) has no account assigned, skipping");
                        skippedCount++;
                        continue;
                    }

                    // Only create instance if due date is in the past or today
                    if (nextDueDate.Date > DateTime.UtcNow.Date)
                    {
                        skippedCount++;
                        continue;
                    }

                    // Create transaction for bill
                    var transactionDoc = new
                    {
                        _key = Guid.NewGuid().ToString("N")[..12],
                        accountKey = accountKey,
                        categoryKey = categoryKey,
                        payPeriodKey = (string?)null,
                        payee = billName,
                        memo = isAutoPay
                            ? $"Auto-pay: {billName}"
                            : $"Bill due: {billName}",
                        amount = -Math.Abs(amount), // Negative for expense
                        transactionDate = nextDueDate,
                        isCleared = isAutoPay, // Auto-pay bills are cleared, manual bills are pending
                        isReconciled = false,
                        billKey = billKey,
                        createdAt = DateTime.UtcNow
                    };

                    await db.Client.Document.PostDocumentAsync("budget_transactions", transactionDoc);

                    // Calculate next due date
                    var newNextDueDate = CalculateNextDueDate(nextDueDate, frequency, dueDay);

                    // Update bill with new nextDueDate
                    var billUpdates = new Dictionary<string, object>
                    {
                        ["nextDueDate"] = newNextDueDate,
                        ["lastPaidDate"] = isAutoPay ? nextDueDate : bill.lastPaidDate
                    };

                    await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(
                        "budget_bills",
                        billKey,
                        billUpdates
                    );

                    createdCount++;
                    _logger.LogInformation(
                        $"Created bill instance for {billName}: {amount:C} on {nextDueDate.ToShortDateString()}, Next due: {newNextDueDate.ToShortDateString()}"
                    );
                }
                catch (Exception ex)
                {
                    var errorBillKey = bill._key?.ToString() ?? "unknown";
                    _logger.LogError(ex, $"Error generating instance for bill {errorBillKey}");
                    skippedCount++;
                }
            }

            _logger.LogInformation(
                "Recurring Bill Service: Generated {Created} bill instances, skipped {Skipped}",
                createdCount,
                skippedCount
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Recurring Bill Service while generating bill instances");
        }
    }

    private DateTime CalculateNextDueDate(DateTime lastDate, string frequency, int dueDay)
    {
        DateTime nextDate = lastDate;

        switch (frequency.ToLower())
        {
            case "weekly":
                nextDate = lastDate.AddDays(7);
                break;

            case "biweekly":
                nextDate = lastDate.AddDays(14);
                break;

            case "monthly":
                nextDate = lastDate.AddMonths(1);
                nextDate = new DateTime(
                    nextDate.Year,
                    nextDate.Month,
                    Math.Min(dueDay, DateTime.DaysInMonth(nextDate.Year, nextDate.Month))
                );
                break;

            case "quarterly":
                nextDate = lastDate.AddMonths(3);
                nextDate = new DateTime(
                    nextDate.Year,
                    nextDate.Month,
                    Math.Min(dueDay, DateTime.DaysInMonth(nextDate.Year, nextDate.Month))
                );
                break;

            case "yearly":
                nextDate = lastDate.AddYears(1);
                nextDate = new DateTime(
                    nextDate.Year,
                    nextDate.Month,
                    Math.Min(dueDay, DateTime.DaysInMonth(nextDate.Year, nextDate.Month))
                );
                break;

            default:
                // Default to monthly
                nextDate = lastDate.AddMonths(1);
                nextDate = new DateTime(
                    nextDate.Year,
                    nextDate.Month,
                    Math.Min(dueDay, DateTime.DaysInMonth(nextDate.Year, nextDate.Month))
                );
                break;
        }

        return nextDate;
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Recurring Bill Service is stopping.");
        _timer?.Change(Timeout.Infinite, 0);
        await base.StopAsync(cancellationToken);
    }

    public override void Dispose()
    {
        _timer?.Dispose();
        base.Dispose();
    }
}
