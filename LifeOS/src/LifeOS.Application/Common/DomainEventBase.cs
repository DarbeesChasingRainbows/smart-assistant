using SystemDateTime = System.DateTime;

namespace LifeOS.Application.Common;

/// <summary>
/// Enhanced base interface for all domain events with correlation and causation tracking
/// </summary>
public interface IDomainEvent
{
    Guid EventId { get; }
    Guid AggregateId { get; }
    string AggregateType { get; }
    string EventType { get; }
    SystemDateTime Timestamp { get; }
    int Version { get; }

    // Event sourcing metadata
    Guid? CorrelationId { get; }
    Guid? CausationId { get; }
    string? UserId { get; }
    Dictionary<string, object> Metadata { get; }
}

/// <summary>
/// Base implementation of domain event with common functionality
/// </summary>
public abstract class DomainEventBase : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public Guid AggregateId { get; set; }
    public abstract string AggregateType { get; }
    public abstract string EventType { get; }
    public SystemDateTime Timestamp { get; } = SystemDateTime.UtcNow;
    public int Version { get; set; }

    public Guid? CorrelationId { get; set; }
    public Guid? CausationId { get; set; }
    public string? UserId { get; set; }
    public Dictionary<string, object> Metadata { get; } = new();

    protected DomainEventBase()
    {
    }

    protected DomainEventBase(Guid aggregateId)
    {
        AggregateId = aggregateId;
    }

    /// <summary>
    /// Set correlation ID for event chain tracking
    /// </summary>
    public DomainEventBase WithCorrelation(Guid correlationId)
    {
        CorrelationId = correlationId;
        return this;
    }

    /// <summary>
    /// Set causation ID to track which event caused this one
    /// </summary>
    public DomainEventBase WithCausation(Guid causationId)
    {
        CausationId = causationId;
        return this;
    }

    /// <summary>
    /// Add metadata to the event
    /// </summary>
    public DomainEventBase WithMetadata(string key, object value)
    {
        Metadata[key] = value;
        return this;
    }

    /// <summary>
    /// Set the user who triggered this event
    /// </summary>
    public DomainEventBase WithUser(string userId)
    {
        UserId = userId;
        return this;
    }
}

/// <summary>
/// Event envelope for cross-context publishing
/// </summary>
public class EventEnvelope
{
    public Guid EventId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string AggregateType { get; set; } = string.Empty;
    public Guid AggregateId { get; set; }
    public SystemDateTime Timestamp { get; set; }
    public int Version { get; set; }
    public object EventData { get; set; } = new();
    public string? SourceContext { get; set; }
    public Guid? CorrelationId { get; set; }
    public Guid? CausationId { get; set; }
    public string? UserId { get; set; }
    public Dictionary<string, object> Headers { get; set; } = new();
}

/// <summary>
/// Event store interface for persistence and replay
/// </summary>
public interface IEventStore
{
    Task SaveEventsAsync(Guid aggregateId, IEnumerable<IDomainEvent> events, int expectedVersion, CancellationToken cancellationToken = default);
    Task<IEnumerable<IDomainEvent>> GetEventsAsync(Guid aggregateId, int fromVersion = 0, CancellationToken cancellationToken = default);
    Task<IEnumerable<IDomainEvent>> GetEventsByTypeAsync(string eventType, SystemDateTime? fromTimestamp = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<EventEnvelope>> GetEventsForContextAsync(string contextName, SystemDateTime? fromTimestamp = null, CancellationToken cancellationToken = default);
}

/// <summary>
/// Event bus interface for publishing events
/// </summary>
public interface IEventBus
{
    Task PublishAsync(IDomainEvent domainEvent, CancellationToken cancellationToken = default);
    Task PublishAsync(IEnumerable<IDomainEvent> domainEvents, CancellationToken cancellationToken = default);
}

/// <summary>
/// Snapshot interface for performance optimization
/// </summary>
public interface ISnapshot
{
    Guid AggregateId { get; }
    int Version { get; }
    object Data { get; }
    SystemDateTime Timestamp { get; }
}

public interface ISnapshotStore
{
    Task<ISnapshot?> GetSnapshotAsync(Guid aggregateId, CancellationToken cancellationToken = default);
    Task SaveSnapshotAsync(ISnapshot snapshot, CancellationToken cancellationToken = default);
}

/// <summary>
/// Event projector for read models
/// </summary>
public interface IEventProjector<TEvent> where TEvent : IDomainEvent
{
    Task ProjectAsync(TEvent domainEvent, CancellationToken cancellationToken = default);
}

/// <summary>
/// Saga manager for long-running processes
/// </summary>
public interface ISagaManager
{
    Task StartAsync<TSaga>(Guid sagaId, object message) where TSaga : class;
    Task HandleAsync(Guid sagaId, object message);
    Task CompleteAsync(Guid sagaId);
    Task RejectAsync(Guid sagaId, Exception reason);
}
