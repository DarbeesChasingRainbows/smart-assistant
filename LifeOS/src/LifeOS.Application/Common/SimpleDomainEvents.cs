using MediatR;
using SystemDateTime = System.DateTime;

namespace LifeOS.Application.Common;

/// Simplified domain event base interface
public interface ISimpleDomainEvent
{
    Guid EventId { get; }
    Guid AggregateId { get; }
    string EventType { get; }
    SystemDateTime Timestamp { get; }
    int Version { get; }
}

/// Base notification for domain events
public abstract class DomainEventNotification<TDomainEvent> : INotification
    where TDomainEvent : ISimpleDomainEvent
{
    public TDomainEvent DomainEvent { get; }
    public string Context { get; }
    public SystemDateTime PublishedAt { get; }

    protected DomainEventNotification(TDomainEvent domainEvent, string context)
    {
        DomainEvent = domainEvent;
        Context = context;
        PublishedAt = SystemDateTime.UtcNow;
    }
}

// Simple event implementations
public class CropBatchCreatedEvent : ISimpleDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public Guid AggregateId { get; set; }
    public string EventType => "CropBatchCreated";
    public SystemDateTime Timestamp { get; } = SystemDateTime.UtcNow;
    public int Version { get; set; }
    public Guid SpeciesId { get; set; }
    public Guid GardenBedId { get; set; }
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;
}

public class CropBatchHarvestedEvent : ISimpleDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public Guid AggregateId { get; set; }
    public string EventType => "CropBatchHarvested";
    public SystemDateTime Timestamp { get; } = SystemDateTime.UtcNow;
    public int Version { get; set; }
    public decimal ActualYield { get; set; }
    public string Quality { get; set; } = string.Empty;
    public SystemDateTime HarvestDate { get; set; }
}

public class VehicleCreatedEvent : ISimpleDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public Guid AggregateId { get; set; }
    public string EventType => "VehicleCreated";
    public SystemDateTime Timestamp { get; } = SystemDateTime.UtcNow;
    public int Version { get; set; }
    public string VIN { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public decimal InitialValue { get; set; }
}

public class VehicleMaintainedEvent : ISimpleDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public Guid AggregateId { get; set; }
    public string EventType => "VehicleMaintained";
    public SystemDateTime Timestamp { get; } = SystemDateTime.UtcNow;
    public int Version { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public SystemDateTime Date { get; set; }
}

public class ComponentInstalledEvent : ISimpleDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public Guid AggregateId { get; set; }
    public string EventType => "ComponentInstalled";
    public SystemDateTime Timestamp { get; } = SystemDateTime.UtcNow;
    public int Version { get; set; }
    public string ComponentName { get; set; } = string.Empty;
    public decimal PartCost { get; set; }
    public SystemDateTime InstallDate { get; set; }
}

public class ExpenseRecordedEvent : ISimpleDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public Guid AggregateId { get; set; }
    public string EventType => "ExpenseRecorded";
    public SystemDateTime Timestamp { get; } = SystemDateTime.UtcNow;
    public int Version { get; set; }
    public decimal Amount { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public SystemDateTime Date { get; set; }
    public Guid? SourceEventId { get; set; }
}

public class TransactionCreatedEvent : ISimpleDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public Guid AggregateId { get; set; }
    public string EventType => "TransactionCreated";
    public SystemDateTime Timestamp { get; } = SystemDateTime.UtcNow;
    public int Version { get; set; }
    public decimal Amount { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public SystemDateTime Date { get; set; }
    public Guid? SourceEventId { get; set; }
}

// Notification classes
public class CropBatchCreatedNotification : DomainEventNotification<CropBatchCreatedEvent>
{
    public CropBatchCreatedNotification(CropBatchCreatedEvent domainEvent)
        : base(domainEvent, "Garden") { }
}

public class CropBatchHarvestedNotification : DomainEventNotification<CropBatchHarvestedEvent>
{
    public CropBatchHarvestedNotification(CropBatchHarvestedEvent domainEvent)
        : base(domainEvent, "Garden") { }
}

public class VehicleCreatedNotification : DomainEventNotification<VehicleCreatedEvent>
{
    public VehicleCreatedNotification(VehicleCreatedEvent domainEvent)
        : base(domainEvent, "Garage") { }
}

public class VehicleMaintainedNotification : DomainEventNotification<VehicleMaintainedEvent>
{
    public VehicleMaintainedNotification(VehicleMaintainedEvent domainEvent)
        : base(domainEvent, "Garage") { }
}

public class ComponentInstalledNotification : DomainEventNotification<ComponentInstalledEvent>
{
    public ComponentInstalledNotification(ComponentInstalledEvent domainEvent)
        : base(domainEvent, "Garage") { }
}

public class ExpenseRecordedNotification : DomainEventNotification<ExpenseRecordedEvent>
{
    public ExpenseRecordedNotification(ExpenseRecordedEvent domainEvent)
        : base(domainEvent, "Finance") { }
}

public class TransactionCreatedNotification : DomainEventNotification<TransactionCreatedEvent>
{
    public TransactionCreatedNotification(TransactionCreatedEvent domainEvent)
        : base(domainEvent, "Finance") { }
}
