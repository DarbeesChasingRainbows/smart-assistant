namespace LifeOS.Domain.Common

open System
open System.Threading.Tasks

// ==================== DOMAIN EVENTS INFRASTRUCTURE ====================
// Based on Axon Framework and DDD best practices for graph databases

/// Base interface for all domain events
type IDomainEvent =
    abstract member EventId : Guid
    abstract member AggregateId : Guid
    abstract member EventType : string
    abstract member Timestamp : DateTime
    abstract member Version : int
    abstract member CorrelationId : Guid option
    abstract member CausationId : Guid option

/// Base domain event implementation
type DomainEvent =
    {
        EventId: Guid
        AggregateId: Guid
        AggregateType: string
        EventType: string
        Timestamp: DateTime
        Version: int
        CorrelationId: Guid option
        CausationId: Guid option
        Metadata: Map<string, obj>
    }
    interface IDomainEvent with
        member this.EventId = this.EventId
        member this.AggregateId = this.AggregateId
        member this.EventType = this.EventType
        member this.Timestamp = this.Timestamp
        member this.Version = this.Version
        member this.CorrelationId = this.CorrelationId
        member this.CausationId = this.CausationId

/// Event envelope for cross-context communication
type EventEnvelope =
    {
        Event: IDomainEvent
        Context: string // Bounded context name (e.g., "Garage", "Garden", "Finance")
        Source: string option // Source service/aggregate
        TargetContexts: string list // Target contexts for routing
    }

/// Event store interface for persistence
type IEventStore =
    abstract member SaveEventsAsync : aggregateId:Guid * events:IDomainEvent list * expectedVersion:int -> Task<unit>
    abstract member GetEventsAsync : aggregateId:Guid * fromVersion:int option -> Task<IDomainEvent list>
    abstract member GetEventsByTypeAsync : eventType:string * fromTimestamp:DateTime option -> Task<IDomainEvent list>

/// Event bus interface for cross-context communication
type IEventBus =
    abstract member PublishAsync : envelope:EventEnvelope -> Task<unit>
    abstract member SubscribeAsync : context:string * eventType:string * handler:(EventEnvelope -> Task<unit>) -> Task<unit>

/// Domain event dispatcher
type IDomainEventDispatcher =
    abstract member DispatchAsync : events:IDomainEvent list -> Task<unit>
    abstract member DispatchToContextAsync : envelope:EventEnvelope -> Task<unit>

// ==================== BOUNDED CONTEXT EVENTS ====================

// Garage Domain Events
type GarageDomainEvent =
    | VehicleCreated of VehicleCreatedEvent
    | VehicleMaintained of VehicleMaintenanceEvent
    | ComponentInstalled of ComponentInstalledEvent
    | ComponentRemoved of ComponentRemovedEvent

and VehicleCreatedEvent =
    {
        VehicleId: Guid
        VIN: string
        Make: string
        Model: string
        Year: int
    }

and VehicleMaintenanceEvent =
    {
        VehicleId: Guid
        MaintenanceType: string
        Cost: decimal option
        Date: DateTime
        Mileage: decimal option
    }

and ComponentInstalledEvent =
    {
        ComponentId: Guid
        VehicleId: Guid
        PartNumber: string
        InstallDate: DateTime
    }

and ComponentRemovedEvent =
    {
        ComponentId: Guid
        VehicleId: Guid
        RemoveDate: DateTime
        StorageLocation: string option
    }

// Garden Domain Events
type GardenDomainEvent =
    | CropBatchCreated of CropBatchCreatedEvent
    | CropBatchHarvested of CropBatchHarvestedEvent
    | SpeciesPlanted of SpeciesPlantedEvent
    | GardenBedUpdated of GardenBedUpdatedEvent

and CropBatchCreatedEvent =
    {
        BatchId: Guid
        SpeciesId: Guid
        GardenBedId: Guid option
        Quantity: decimal
        Unit: string
    }

and CropBatchHarvestedEvent =
    {
        BatchId: Guid
        ActualYield: decimal
        Quality: string option
        HarvestDate: DateTime
    }

and SpeciesPlantedEvent =
    {
        SpeciesId: Guid
        GardenBedId: Guid
        PlantDate: DateTime
        Quantity: decimal
    }

and GardenBedUpdatedEvent =
    {
        GardenBedId: Guid
        UpdateType: string
        UpdatedAt: DateTime
    }

// Finance Domain Events
type FinanceDomainEvent =
    | TransactionCreated of TransactionCreatedEvent
    | AccountUpdated of AccountUpdatedEvent
    | BudgetExceeded of BudgetExceededEvent
    | ExpenseRecorded of ExpenseRecordedEvent

and TransactionCreatedEvent =
    {
        TransactionId: Guid
        AccountId: Guid
        Amount: decimal
        Description: string
        Category: string option
    }

and AccountUpdatedEvent =
    {
        AccountId: Guid
        NewBalance: decimal
        TransactionId: Guid
    }

and BudgetExceededEvent =
    {
        BudgetId: Guid
        CategoryId: Guid
        Amount: decimal
        ExceededBy: decimal
    }

and ExpenseRecordedEvent =
    {
        ExpenseId: Guid
        Category: string
        Amount: decimal
        Date: DateTime
        RelatedBatchId: Guid option // Link to Garden batch
    }

// ==================== EVENT HELPERS ====================

module DomainEvent =
    
    /// Create a new domain event
    let create (aggregateId:Guid) (aggregateType:string) (eventType:string) (version:int) =
        {
            EventId = Guid.NewGuid()
            AggregateId = aggregateId
            AggregateType = aggregateType
            EventType = eventType
            Timestamp = DateTime.UtcNow
            Version = version
            CorrelationId = None
            CausationId = None
            Metadata = Map.empty
        }
    
    /// Add correlation and causation IDs for event tracing
    let withCorrelation (correlationId:Guid) (event:DomainEvent) =
        { event with CorrelationId = Some correlationId }
    
    let withCausation (causationId:Guid) (event:DomainEvent) =
        { event with CausationId = Some causationId }
    
    /// Add metadata to event
    let withMetadata (key:string) (value:obj) (event:DomainEvent) =
        { event with Metadata = event.Metadata.Add(key, value) }

module EventEnvelope =
    
    /// Create an event envelope for cross-context publishing
    let create (event:IDomainEvent) (context:string) (source:string option) (targetContexts:string list) =
        {
            Event = event
            Context = context
            Source = source
            TargetContexts = targetContexts
        }
    
    /// Create envelope for specific target context
    let forContext (event:IDomainEvent) (fromContext:string) (toContext:string) =
        create event fromContext None [toContext]
    
    /// Create envelope for multiple contexts
    let broadcast (event:IDomainEvent) (fromContext:string) (targetContexts:string list) =
        create event fromContext None targetContexts

// ==================== GRAPH DATABASE EVENT STORE ====================
// Optimized for ArangoDB graph database

type IGraphEventStore =
    inherit IEventStore
    /// Get events along graph edges (for event sourcing across aggregates)
    abstract member GetEventsAlongEdgeAsync : fromVertex:Guid * edgeType:string * maxDepth:int -> Task<IDomainEvent list>
    /// Store event with graph relationships
    abstract member StoreEventWithEdgesAsync : event:IDomainEvent * edges:(string * Guid) list -> Task<unit>
    /// Query events by graph pattern
    abstract member QueryEventsByPatternAsync : aql:string -> Task<IDomainEvent list>

/// ArangoDB-specific event store implementation sketch
type ArangoGraphEventStore(database:obj) = // Would be ArangoDatabase instance
    interface IGraphEventStore with
        member _.SaveEventsAsync(aggregateId, events, expectedVersion) = 
            // Implementation would store events as documents
            // with edges to aggregate vertices
            Task.FromResult(())
        
        member _.GetEventsAsync(aggregateId, fromVersion) = 
            // Query events collection with filter on aggregateId
            Task.FromResult<List<IDomainEvent>>([])
        
        member _.GetEventsByTypeAsync(eventType, fromTimestamp) = 
            // Query by eventType and optionally timestamp
            Task.FromResult<List<IDomainEvent>>([])
        
        member _.GetEventsAlongEdgeAsync(fromVertex, edgeType, maxDepth) = 
            // Use ArangoDB's graph traversal to follow edges
            // and collect events from connected vertices
            Task.FromResult<List<IDomainEvent>>([])
        
        member _.StoreEventWithEdgesAsync(event, edges) = 
            // Store event document and create edge documents
            // connecting to related aggregates
            Task.FromResult(())
        
        member _.QueryEventsByPatternAsync(aql) = 
            // Execute custom AQL query for complex event patterns
            Task.FromResult<List<IDomainEvent>>([])

// ==================== CROSS-CONTEXT EVENT HANDLERS ====================

/// Handler for Garden events that affect Finance (e.g., expense tracking)
type GardenToFinanceHandler(financialService:obj) = // Would be IFinancialService
    member _.HandleCropBatchHarvested(envelope: EventEnvelope) =
        async {
            match envelope.Event with
            | :? DomainEvent as domainEvent when domainEvent.EventType = "CropBatchHarvested" ->
                // Extract harvest data and create financial records
                // This is where graph traversal would be useful:
                // Follow edges from CropBatch -> Expenses -> Transactions
                ()
            | _ -> ()
        } |> Async.StartAsTask

/// Handler for Garage events that affect Finance (e.g., maintenance costs)
type GarageToFinanceHandler(financialService:obj) = // Would be IFinancialService
    member _.HandleVehicleMaintained(envelope: EventEnvelope) =
        async {
            match envelope.Event with
            | :? DomainEvent as domainEvent when domainEvent.EventType = "VehicleMaintenance" ->
                // Create expense transaction for maintenance
                // Link to Vehicle via graph edges for traceability
                ()
            | _ -> ()
        } |> Async.StartAsTask

/// Handler for Finance events that might affect other domains
type FinanceEventHandler =
    member _.HandleBudgetExceeded(envelope: EventEnvelope) =
        async {
            match envelope.Event with
            | :? DomainEvent as domainEvent when domainEvent.EventType = "BudgetExceeded" ->
                // Could trigger alerts in Boardroom domain
                // Or affect purchasing decisions in Garage
                ()
            | _ -> ()
        } |> Async.StartAsTask
