using MediatR;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace LifeOS.Application.Common;

/// <summary>
/// Pipeline behavior for logging all domain events
/// </summary>
public class EventLoggingBehavior<TNotification> : INotificationHandler<TNotification>
    where TNotification : INotification
{
    private readonly ILogger<EventLoggingBehavior<TNotification>> _logger;

    public EventLoggingBehavior(ILogger<EventLoggingBehavior<TNotification>> logger)
    {
        _logger = logger;
    }

    public async Task Handle(TNotification notification, CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            _logger.LogInformation("Handling event {EventType} at {Timestamp}",
                typeof(TNotification).Name,
                DateTime.UtcNow);

            // No need to call next handler as this is a notification handler
            // The pipeline will continue to other handlers automatically

            stopwatch.Stop();
            _logger.LogDebug("Event {EventType} processed in {ElapsedMs}ms",
                typeof(TNotification).Name,
                stopwatch.ElapsedMilliseconds);

            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Error handling event {EventType} after {ElapsedMs}ms",
                typeof(TNotification).Name,
                stopwatch.ElapsedMilliseconds);
            throw;
        }
    }
}

/// <summary>
/// Pipeline behavior for retrying failed event handlers
/// </summary>
public class RetryEventBehavior<TNotification> : INotificationHandler<TNotification>
    where TNotification : INotification
{
    private readonly ILogger<RetryEventBehavior<TNotification>> _logger;
    private readonly INotificationHandler<TNotification> _inner;
    private const int MaxRetries = 3;
    private readonly TimeSpan[] _delays = {
        TimeSpan.FromSeconds(1),
        TimeSpan.FromSeconds(2),
        TimeSpan.FromSeconds(5)
    };

    public RetryEventBehavior(
        ILogger<RetryEventBehavior<TNotification>> logger,
        INotificationHandler<TNotification> inner)
    {
        _logger = logger;
        _inner = inner;
    }

    public async Task Handle(TNotification notification, CancellationToken cancellationToken)
    {
        for (int attempt = 1; attempt <= MaxRetries; attempt++)
        {
            try
            {
                await _inner.Handle(notification, cancellationToken);
                return;
            }
            catch (Exception ex) when (attempt < MaxRetries)
            {
                var delay = _delays[attempt - 1];
                _logger.LogWarning(ex,
                    "Event handler failed (attempt {Attempt}/{MaxRetries}), retrying in {Delay}s",
                    attempt, MaxRetries, delay.TotalSeconds);

                await Task.Delay(delay, cancellationToken);
            }
        }

        // Final attempt - let the exception propagate
        await _inner.Handle(notification, cancellationToken);
    }
}

/// <summary>
/// Base class for domain event handlers with common functionality
/// </summary>
public abstract class DomainEventHandlerBase<TNotification> : INotificationHandler<TNotification>
    where TNotification : INotification
{
    protected readonly ILogger Logger;
    protected readonly IMediator Mediator;

    protected DomainEventHandlerBase(
        ILogger logger,
        IMediator mediator)
    {
        Logger = logger;
        Mediator = mediator;
    }

    public abstract Task Handle(TNotification notification, CancellationToken cancellationToken);

    /// <summary>
    /// Publish a follow-up event with error handling
    /// </summary>
    protected async Task PublishFollowUpEvent(INotification followUpEvent, CancellationToken cancellationToken)
    {
        try
        {
            await Mediator.Publish(followUpEvent, cancellationToken);
            Logger.LogDebug("Published follow-up event {EventType}",
                followUpEvent.GetType().Name);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to publish follow-up event {EventType}",
                followUpEvent.GetType().Name);
            // Decide whether to rethrow or continue based on business requirements
        }
    }
}

/// <summary>
/// Event to track when a domain event fails processing
/// </summary>
public class DomainEventProcessingFailed : INotification
{
    public string EventType { get; set; } = string.Empty;
    public string Error { get; set; } = string.Empty;
    public DateTime FailedAt { get; set; } = DateTime.UtcNow;
    public string? HandlerName { get; set; }
}

/// <summary>
/// Handler to track failed events for monitoring/alerting
/// </summary>
public class EventFailureTrackingHandler : INotificationHandler<DomainEventProcessingFailed>
{
    private readonly ILogger<EventFailureTrackingHandler> _logger;

    public EventFailureTrackingHandler(ILogger<EventFailureTrackingHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(DomainEventProcessingFailed notification, CancellationToken cancellationToken)
    {
        _logger.LogError(
            "Event processing failed - EventType: {EventType}, Handler: {Handler}, Error: {Error}, Time: {FailedAt}",
            notification.EventType,
            notification.HandlerName,
            notification.Error,
            notification.FailedAt);

        // Here you could:
        // - Send to a monitoring system
        // - Trigger alerts
        // - Store in a dead-letter queue
        // - Send email/SMS notifications

        return Task.CompletedTask;
    }
}
