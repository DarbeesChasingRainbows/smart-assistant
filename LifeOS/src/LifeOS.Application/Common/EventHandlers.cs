using MediatR;
using Microsoft.Extensions.Logging;
using SystemDateTime = System.DateTime;

namespace LifeOS.Application.Common;

/// Simple event publisher for domain events
public class SimpleEventPublisher
{
    private readonly IMediator _mediator;
    private readonly ILogger<SimpleEventPublisher> _logger;

    public SimpleEventPublisher(IMediator mediator, ILogger<SimpleEventPublisher> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    public async Task PublishEventAsync(ISimpleDomainEvent domainEvent, string context)
    {
        try
        {
            _logger.LogInformation("Publishing event {EventType} for aggregate {AggregateId}",
                domainEvent.EventType, domainEvent.AggregateId);

            // Create the appropriate notification based on event type
            INotification notification = domainEvent switch
            {
                CropBatchCreatedEvent e => new CropBatchCreatedNotification(e),
                CropBatchHarvestedEvent e => new CropBatchHarvestedNotification(e),
                VehicleCreatedEvent e => new VehicleCreatedNotification(e),
                VehicleMaintainedEvent e => new VehicleMaintainedNotification(e),
                ComponentInstalledEvent e => new ComponentInstalledNotification(e),
                ExpenseRecordedEvent e => new ExpenseRecordedNotification(e),
                TransactionCreatedEvent e => new TransactionCreatedNotification(e),
                _ => throw new ArgumentException($"Unknown event type: {domainEvent.EventType}")
            };

            await _mediator.Publish(notification);

            _logger.LogDebug("Successfully published event {EventType}", domainEvent.EventType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish event {EventType}", domainEvent.EventType);
            throw;
        }
    }
}

/// Cross-domain event handlers

// Garden to Finance handler
public class GardenToFinanceHandler : INotificationHandler<CropBatchHarvestedNotification>
{
    private readonly ILogger<GardenToFinanceHandler> _logger;
    private readonly IMediator _mediator;

    public GardenToFinanceHandler(ILogger<GardenToFinanceHandler> logger, IMediator mediator)
    {
        _logger = logger;
        _mediator = mediator;
    }

    public async Task Handle(CropBatchHarvestedNotification notification, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing harvest event for batch {BatchId}",
                notification.DomainEvent.AggregateId);

            // Create a revenue transaction based on the harvest
            var revenueEvent = new TransactionCreatedEvent
            {
                AggregateId = Guid.NewGuid(),
                Amount = notification.DomainEvent.ActualYield * 10.50m, // $10.50 per unit
                Type = "Revenue",
                Description = $"Harvest revenue for batch {notification.DomainEvent.AggregateId}",
                Date = notification.DomainEvent.HarvestDate,
                SourceEventId = notification.DomainEvent.EventId
            };

            await _mediator.Publish(new TransactionCreatedNotification(revenueEvent));

            _logger.LogInformation("Created revenue transaction of {Amount:C}", revenueEvent.Amount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process harvest event");
            throw;
        }
    }
}

// Garage to Finance handler
public class GarageToFinanceHandler : INotificationHandler<VehicleMaintainedNotification>,
                                     INotificationHandler<ComponentInstalledNotification>
{
    private readonly ILogger<GarageToFinanceHandler> _logger;
    private readonly IMediator _mediator;

    public GarageToFinanceHandler(ILogger<GarageToFinanceHandler> logger, IMediator mediator)
    {
        _logger = logger;
        _mediator = mediator;
    }

    public async Task Handle(VehicleMaintainedNotification notification, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing maintenance event for vehicle {VehicleId}",
                notification.DomainEvent.AggregateId);

            // Create an expense for the maintenance
            var expenseEvent = new ExpenseRecordedEvent
            {
                AggregateId = Guid.NewGuid(),
                Amount = notification.DomainEvent.Cost,
                Category = "Maintenance",
                Description = notification.DomainEvent.Description,
                Date = notification.DomainEvent.Date,
                SourceEventId = notification.DomainEvent.EventId
            };

            await _mediator.Publish(new ExpenseRecordedNotification(expenseEvent));

            _logger.LogInformation("Created maintenance expense of {Amount:C}", expenseEvent.Amount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process maintenance event");
            throw;
        }
    }

    public async Task Handle(ComponentInstalledNotification notification, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing component installation for vehicle {VehicleId}",
                notification.DomainEvent.AggregateId);

            // Create an expense for the parts
            var expenseEvent = new ExpenseRecordedEvent
            {
                AggregateId = Guid.NewGuid(),
                Amount = notification.DomainEvent.PartCost,
                Category = "Parts",
                Description = $"Installed {notification.DomainEvent.ComponentName}",
                Date = notification.DomainEvent.InstallDate,
                SourceEventId = notification.DomainEvent.EventId
            };

            await _mediator.Publish(new ExpenseRecordedNotification(expenseEvent));

            _logger.LogInformation("Created parts expense of {Amount:C}", expenseEvent.Amount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process component installation");
            throw;
        }
    }
}

// Finance audit handler
public class FinanceAuditHandler : INotificationHandler<ExpenseRecordedNotification>,
                                   INotificationHandler<TransactionCreatedNotification>
{
    private readonly ILogger<FinanceAuditHandler> _logger;

    public FinanceAuditHandler(ILogger<FinanceAuditHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(ExpenseRecordedNotification notification, CancellationToken cancellationToken)
    {
        _logger.LogInformation("AUDIT: Expense recorded - Amount: {Amount:C}, Category: {Category}, Description: {Description}",
            notification.DomainEvent.Amount,
            notification.DomainEvent.Category,
            notification.DomainEvent.Description);

        // In a real implementation, this would:
        // - Store in audit log
        // - Check for policy violations
        // - Trigger alerts if needed
        // - Update financial reports

        return Task.CompletedTask;
    }

    public Task Handle(TransactionCreatedNotification notification, CancellationToken cancellationToken)
    {
        _logger.LogInformation("AUDIT: Transaction created - Amount: {Amount:C}, Type: {Type}, Description: {Description}",
            notification.DomainEvent.Amount,
            notification.DomainEvent.Type,
            notification.DomainEvent.Description);

        // Similar audit logic for transactions

        return Task.CompletedTask;
    }
}
