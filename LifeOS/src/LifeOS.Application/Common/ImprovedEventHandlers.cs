using MediatR;
using Microsoft.Extensions.Logging;
using SystemDateTime = System.DateTime;

namespace LifeOS.Application.Common;

/// <summary>
/// Improved cross-domain event handlers with proper error handling and logging
/// </summary>

// Base class for financial event handlers
public abstract class FinanceEventHandlerBase<TNotification> : DomainEventHandlerBase<TNotification>
    where TNotification : INotification
{
    protected FinanceEventHandlerBase(
        ILogger logger,
        IMediator mediator) : base(logger, mediator)
    {
    }

    protected async Task CreateRevenueEvent(decimal amount, string description, SystemDateTime date, Guid sourceId, CancellationToken cancellationToken)
    {
        var revenueEvent = new TransactionCreatedEvent
        {
            AggregateId = Guid.NewGuid(),
            Amount = amount,
            Type = "Revenue",
            Description = description,
            Date = date,
            SourceEventId = sourceId
        };

        await PublishFollowUpEvent(new TransactionCreatedNotification(revenueEvent), cancellationToken);
    }

    protected async Task CreateExpenseEvent(decimal amount, string category, string description, SystemDateTime date, Guid sourceId, CancellationToken cancellationToken)
    {
        var expenseEvent = new ExpenseRecordedEvent
        {
            AggregateId = Guid.NewGuid(),
            Amount = amount,
            Category = category,
            Description = description,
            Date = date,
            SourceEventId = sourceId
        };

        await PublishFollowUpEvent(new ExpenseRecordedNotification(expenseEvent), cancellationToken);
    }
}

// Garden to Finance handler with improved error handling
public class ImprovedGardenToFinanceHandler : FinanceEventHandlerBase<CropBatchHarvestedNotification>
{
    public ImprovedGardenToFinanceHandler(
        ILogger<ImprovedGardenToFinanceHandler> logger,
        IMediator mediator) : base(logger, mediator)
    {
    }

    public override async Task Handle(CropBatchHarvestedNotification notification, CancellationToken cancellationToken)
    {
        try
        {
            Logger.LogInformation("Processing harvest event for batch {BatchId}",
                notification.DomainEvent.AggregateId);

            // Calculate revenue based on actual yield and market price
            var yield = notification.DomainEvent.ActualYield;
            var marketPrice = await GetMarketPrice(notification.DomainEvent.AggregateId, cancellationToken);
            var revenue = yield * marketPrice;

            await CreateRevenueEvent(
                revenue,
                $"Harvest revenue for batch {notification.DomainEvent.AggregateId}",
                notification.DomainEvent.HarvestDate,
                notification.DomainEvent.AggregateId,
                cancellationToken);

            Logger.LogInformation("Created revenue event of {Amount:C} for harvest batch {BatchId}",
                revenue, notification.DomainEvent.AggregateId);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to process harvest event for batch {BatchId}",
                notification.DomainEvent.AggregateId);

            // Publish failure event
            await PublishFollowUpEvent(new DomainEventProcessingFailed
            {
                EventType = nameof(CropBatchHarvestedNotification),
                Error = ex.Message,
                HandlerName = nameof(ImprovedGardenToFinanceHandler)
            }, cancellationToken);

            throw;
        }
    }

    private async Task<decimal> GetMarketPrice(Guid batchId, CancellationToken cancellationToken)
    {
        // In a real implementation, this would call a pricing service
        // For now, return a fixed price
        await Task.CompletedTask;
        return 10.50m; // $10.50 per unit
    }
}

// Garage to Finance handler with component tracking
public class ImprovedGarageToFinanceHandler : FinanceEventHandlerBase<VehicleMaintainedNotification>,
                                               INotificationHandler<ComponentInstalledNotification>
{
    public ImprovedGarageToFinanceHandler(
        ILogger<ImprovedGarageToFinanceHandler> logger,
        IMediator mediator) : base(logger, mediator)
    {
    }

    public override async Task Handle(VehicleMaintainedNotification notification, CancellationToken cancellationToken)
    {
        try
        {
            Logger.LogInformation("Processing maintenance event for vehicle {VehicleId}",
                notification.DomainEvent.AggregateId);

            await CreateExpenseEvent(
                notification.DomainEvent.Cost,
                "Maintenance",
                notification.DomainEvent.Description,
                notification.DomainEvent.Date,
                notification.DomainEvent.AggregateId,
                cancellationToken);

            // Check if maintenance exceeds threshold for warranty claim
            if (notification.DomainEvent.Cost > 1000)
            {
                await PublishFollowUpEvent(new HighValueMaintenanceAlert
                {
                    VehicleId = notification.DomainEvent.AggregateId,
                    Cost = notification.DomainEvent.Cost,
                    Description = notification.DomainEvent.Description
                }, cancellationToken);
            }

            Logger.LogInformation("Created maintenance expense of {Amount:C}",
                notification.DomainEvent.Cost);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to process maintenance event for vehicle {VehicleId}",
                notification.DomainEvent.AggregateId);
            throw;
        }
    }

    public async Task Handle(ComponentInstalledNotification notification, CancellationToken cancellationToken)
    {
        try
        {
            Logger.LogInformation("Processing component installation for vehicle {VehicleId}",
                notification.DomainEvent.AggregateId);

            await CreateExpenseEvent(
                notification.DomainEvent.PartCost,
                "Parts",
                $"Installed {notification.DomainEvent.ComponentName}",
                notification.DomainEvent.InstallDate,
                notification.DomainEvent.AggregateId,
                cancellationToken);

            // Track component for warranty purposes
            await PublishFollowUpEvent(new ComponentWarrantyTrackingEvent
            {
                VehicleId = notification.DomainEvent.AggregateId,
                ComponentName = notification.DomainEvent.ComponentName,
                InstallDate = notification.DomainEvent.InstallDate,
                WarrantyPeriod = TimeSpan.FromDays(365) // 1 year warranty
            }, cancellationToken);

            Logger.LogInformation("Created parts expense of {Amount:C} for {Component}",
                notification.DomainEvent.PartCost, notification.DomainEvent.ComponentName);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to process component installation for vehicle {VehicleId}",
                notification.DomainEvent.AggregateId);
            throw;
        }
    }
}

// Additional domain events for improved tracking
public class HighValueMaintenanceAlert : INotification
{
    public Guid VehicleId { get; set; }
    public decimal Cost { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class ComponentWarrantyTrackingEvent : INotification
{
    public Guid VehicleId { get; set; }
    public string ComponentName { get; set; } = string.Empty;
    public SystemDateTime InstallDate { get; set; }
    public TimeSpan WarrantyPeriod { get; set; }
}

// Handler for high-value maintenance alerts
public class HighValueMaintenanceHandler : INotificationHandler<HighValueMaintenanceAlert>
{
    private readonly ILogger<HighValueMaintenanceHandler> _logger;

    public HighValueMaintenanceHandler(ILogger<HighValueMaintenanceHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(HighValueMaintenanceAlert notification, CancellationToken cancellationToken)
    {
        _logger.LogWarning(
            "High-value maintenance alert - Vehicle: {VehicleId}, Cost: {Cost:C}, Description: {Description}",
            notification.VehicleId,
            notification.Cost,
            notification.Description);

        // Here you could:
        // - Send notification to fleet manager
        // - Check if under warranty
        // - Schedule follow-up inspection
        // - Update budget forecasts

        return Task.CompletedTask;
    }
}

// Handler for component warranty tracking
public class ComponentWarrantyHandler : INotificationHandler<ComponentWarrantyTrackingEvent>
{
    private readonly ILogger<ComponentWarrantyHandler> _logger;

    public ComponentWarrantyHandler(ILogger<ComponentWarrantyHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(ComponentWarrantyTrackingEvent notification, CancellationToken cancellationToken)
    {
        var warrantyExpiry = notification.InstallDate.Add(notification.WarrantyPeriod);

        _logger.LogInformation(
            "Tracking component warranty - Vehicle: {VehicleId}, Component: {Component}, Installed: {InstallDate}, Warranty until: {WarrantyExpiry}",
            notification.VehicleId,
            notification.ComponentName,
            notification.InstallDate,
            warrantyExpiry);

        // Here you could:
        // - Store in warranty tracking system
        // - Schedule reminder before expiry
        // - Link to maintenance records

        return Task.CompletedTask;
    }
}
