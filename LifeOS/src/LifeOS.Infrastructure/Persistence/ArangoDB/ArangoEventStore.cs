using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Text.Json;
using DomainCommon = LifeOS.Domain.Common;
using LifeOS.Domain.Garden;
using LifeOS.Domain.Garage;
using LifeOS.Domain.Finance;
using AppCommon = LifeOS.Application.Common;
using Microsoft.Extensions.Logging;
using Microsoft.FSharp.Core;
using ArangoDB.Client;
using SystemDateTime = System.DateTime;
using Microsoft.FSharp.Collections;

namespace LifeOS.Infrastructure.Persistence.ArangoDB;

/// <summary>
/// ArangoDB implementation of event store for domain events
/// </summary>
public class ArangoEventStore : DomainCommon.IEventStore, DomainCommon.IGraphEventStore
{
    private readonly ILogger<ArangoEventStore> _logger;
    private readonly ArangoDbContext _context;
    private const string CollectionName = "domain_events";
    private const string EdgeCollectionName = "event_edges";

    public ArangoEventStore(
        ILogger<ArangoEventStore> logger,
        ArangoDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    public async Task<FSharpList<DomainCommon.IDomainEvent>> GetEventsAsync(Guid aggregateId, FSharpOption<int> fromVersion)
    {
        try
        {
            var version = FSharpOption<int>.get_IsSome(fromVersion) ? fromVersion.Value : 0;
            var query = $"FOR e IN {CollectionName} FILTER e.aggregateId == @id && e.version >= @version SORT e.timestamp ASC RETURN e";
            var bindVars = new Dictionary<string, object>
            {
                ["id"] = aggregateId,
                ["version"] = version
            };
            var cursor = await _context.Client.Cursor.PostCursorAsync<JsonElement>(query, bindVars);

            // Deserialize events
            var events = new List<DomainCommon.IDomainEvent>();
            foreach (var doc in cursor.Result)
            {
                var eventData = DeserializeEvent(doc);
                if (eventData != null)
                {
                    events.Add(eventData);
                }
            }

            return ListModule.OfSeq(events);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving events for aggregate {AggregateId}", aggregateId);
            return ListModule.Empty<DomainCommon.IDomainEvent>();
        }
    }

    public async Task<Microsoft.FSharp.Core.Unit> SaveEventsAsync(Guid aggregateId, FSharpList<DomainCommon.IDomainEvent> events, int expectedVersion)
    {
        try
        {
            // Convert FSharpList to IEnumerable
            var eventList = SeqModule.ToList(events);

            foreach (var domainEvent in eventList)
            {
                var eventDocument = new
                {
                    _key = $"{aggregateId}_{domainEvent.Version}",
                    aggregateId = domainEvent.AggregateId,
                    aggregateType = GetAggregateType(domainEvent),
                    eventType = domainEvent.EventType,
                    timestamp = domainEvent.Timestamp,
                    version = domainEvent.Version,
                    data = SerializeEventData(domainEvent),
                    eventId = domainEvent.EventId
                };

                await _context.Client.Document.PostDocumentAsync(CollectionName, eventDocument);
            }

            // Saved {Count} events for aggregate {AggregateId}
            // eventList.Count, aggregateId
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving events for aggregate {AggregateId}", aggregateId);
            throw;
        }
    }

    public async Task<FSharpList<DomainCommon.IDomainEvent>> GetEventsByTypeAsync(string eventType, FSharpOption<SystemDateTime> fromTimestamp)
    {
        try
        {
            var query = FSharpOption<SystemDateTime>.get_IsSome(fromTimestamp)
                ? $"FOR e IN {CollectionName} FILTER e.eventType == @type && e.timestamp >= @timestamp SORT e.timestamp ASC RETURN e"
                : $"FOR e IN {CollectionName} FILTER e.eventType == @type SORT e.timestamp ASC RETURN e";

            Dictionary<string, object> bindVars;
            if (FSharpOption<SystemDateTime>.get_IsSome(fromTimestamp))
            {
                bindVars = new Dictionary<string, object>
                {
                    ["type"] = eventType,
                    ["timestamp"] = fromTimestamp.Value
                };
            }
            else
            {
                bindVars = new Dictionary<string, object>
                {
                    ["type"] = eventType
                };
            }

            var cursor = await _context.Client.Cursor.PostCursorAsync<JsonElement>(query, bindVars);

            // Deserialize events
            var events = new List<DomainCommon.IDomainEvent>();
            foreach (var doc in cursor.Result)
            {
                var eventData = DeserializeEvent(doc);
                if (eventData != null)
                {
                    events.Add(eventData);
                }
            }

            return ListModule.OfSeq(events);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving events of type {EventType}", eventType);
            return ListModule.Empty<DomainCommon.IDomainEvent>();
        }
    }

    public async Task<IEnumerable<AppCommon.EventEnvelope>> GetEventsForContextAsync(string contextName, SystemDateTime? fromTimestamp = null, CancellationToken cancellationToken = default)
    {
        // Implementation for context-specific events
        return Enumerable.Empty<AppCommon.EventEnvelope>();
    }

    public async Task<FSharpList<DomainCommon.IDomainEvent>> GetEventsAlongEdgeAsync(Guid fromVertex, string edgeType, int maxDepth)
    {
        try
        {
            var query = $@"
                FOR v, e, p IN 1..@maxDepth OUTBOUND @startVertex 
                {EdgeCollectionName} 
                FILTER e.type == @edgeType
                RETURN v";

            var bindVars = new Dictionary<string, object>
            {
                ["startVertex"] = $"{CollectionName}/{fromVertex}",
                ["edgeType"] = edgeType,
                ["maxDepth"] = maxDepth
            };

            var cursor = await _context.Client.Cursor.PostCursorAsync<JsonElement>(query, bindVars);

            // Deserialize events
            var events = new List<DomainCommon.IDomainEvent>();
            foreach (var doc in cursor.Result)
            {
                var eventData = DeserializeEvent(doc);
                if (eventData != null)
                {
                    events.Add(eventData);
                }
            }

            return ListModule.OfSeq(events);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving events along edge from {FromVertex}", fromVertex);
            return ListModule.Empty<DomainCommon.IDomainEvent>();
        }
    }

    public async Task<Microsoft.FSharp.Core.Unit> StoreEventWithEdgesAsync(DomainCommon.IDomainEvent domainEvent, FSharpList<Tuple<string, Guid>> edges)
    {
        try
        {
            // Store the event
            var eventList = ListModule.OfArray(new[] { domainEvent });
            await SaveEventsAsync(domainEvent.AggregateId, eventList, 0);

            // Convert FSharpList to IEnumerable
            var edgeList = SeqModule.ToList(edges);
            foreach (var (edgeType, targetId) in edgeList)
            {
                // Create edge document
                var edge = new
                {
                    _from = $"{CollectionName}/{domainEvent.EventId}",
                    _to = $"{CollectionName}/{targetId}",
                    type = edgeType,
                    created_at = SystemDateTime.UtcNow
                };

                // Create edge in edge collection
                await _context.Client.Document.PostDocumentAsync(EdgeCollectionName, edge);

                _logger.LogDebug("Created edge: {EdgeType} from {From} to {To}",
                    edgeType, domainEvent.EventId, targetId);
            }
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving event with edges for event {EventId}", domainEvent.EventId);
            throw;
        }
    }

    public async Task<FSharpList<DomainCommon.IDomainEvent>> QueryEventsByPatternAsync(string aql)
    {
        try
        {
            // Execute AQL query
            var cursor = await _context.Client.Cursor.PostCursorAsync<JsonElement>(aql);

            // Deserialize events
            var events = new List<DomainCommon.IDomainEvent>();
            foreach (var doc in cursor.Result)
            {
                var eventData = DeserializeEvent(doc);
                if (eventData != null)
                {
                    events.Add(eventData);
                }
            }

            return ListModule.OfSeq(events);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying events with pattern: {AQL}", aql);
            return ListModule.Empty<DomainCommon.IDomainEvent>();
        }
    }

    private string GetAggregateType(DomainCommon.IDomainEvent domainEvent)
    {
        return domainEvent.EventType switch
        {
            var s when s.StartsWith("CropBatch") => "Garden",
            var s when s.StartsWith("Vehicle") => "Garage",
            var s when s.StartsWith("Expense") => "Finance",
            var s when s.StartsWith("Transaction") => "Finance",
            _ => "Unknown"
        };
    }

    private string SerializeEventData(DomainCommon.IDomainEvent domainEvent)
    {
        return System.Text.Json.JsonSerializer.Serialize(domainEvent, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false,
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
        });
    }

    private DomainCommon.IDomainEvent? DeserializeEvent(JsonElement eventDoc)
    {
        try
        {
            if (!eventDoc.TryGetProperty("data", out var dataElement))
                return null;

            var eventType = eventDoc.GetProperty("eventType").GetString();
            if (string.IsNullOrEmpty(eventType))
                return null;

            // Based on event type, deserialize to appropriate event type
            // This is a simplified implementation - in production, you'd have a proper factory
            return eventType switch
            {
                var s when s.Contains("VehicleCreated") => JsonSerializer.Deserialize<VehicleCreatedEvent>(dataElement.GetRawText()),
                var s when s.Contains("VehicleMaintained") => JsonSerializer.Deserialize<VehicleMaintainedEvent>(dataElement.GetRawText()),
                var s when s.Contains("CropBatchPlanted") => JsonSerializer.Deserialize<CropBatchPlantedEvent>(dataElement.GetRawText()),
                var s when s.Contains("ExpenseRecorded") => JsonSerializer.Deserialize<ExpenseRecordedEvent>(dataElement.GetRawText()),
                _ => null
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize event document");
            return null;
        }
    }
}

// Temporary event type definitions for deserialization
// In a real implementation, these would be in the Domain layer
public record VehicleCreatedEvent(Guid VehicleId, string VehicleType, string LicensePlate, DateTime Timestamp) : DomainCommon.IDomainEvent
{
    public Guid EventId => Guid.NewGuid();
    public Guid AggregateId => VehicleId;
    public string EventType => "VehicleCreated";
    public int Version => 1;
    public FSharpOption<Guid> CorrelationId => FSharpOption<Guid>.None;
    public FSharpOption<Guid> CausationId => FSharpOption<Guid>.None;
}

public record VehicleMaintainedEvent(Guid VehicleId, string MaintenanceType, decimal Cost, DateTime Timestamp) : DomainCommon.IDomainEvent
{
    public Guid EventId => Guid.NewGuid();
    public Guid AggregateId => VehicleId;
    public string EventType => "VehicleMaintained";
    public int Version => 2;
    public FSharpOption<Guid> CorrelationId => FSharpOption<Guid>.None;
    public FSharpOption<Guid> CausationId => FSharpOption<Guid>.None;
}

public record CropBatchPlantedEvent(Guid CropBatchId, Guid SpeciesId, Guid GardenBedId, int PlantCount, DateTime Timestamp) : DomainCommon.IDomainEvent
{
    public Guid EventId => Guid.NewGuid();
    public Guid AggregateId => CropBatchId;
    public string EventType => "CropBatchPlanted";
    public int Version => 1;
    public FSharpOption<Guid> CorrelationId => FSharpOption<Guid>.None;
    public FSharpOption<Guid> CausationId => FSharpOption<Guid>.None;
}

public record ExpenseRecordedEvent(Guid ExpenseId, string Category, decimal Amount, string Description, DateTime Timestamp) : DomainCommon.IDomainEvent
{
    public Guid EventId => Guid.NewGuid();
    public Guid AggregateId => ExpenseId;
    public string EventType => "ExpenseRecorded";
    public int Version => 1;
    public FSharpOption<Guid> CorrelationId => FSharpOption<Guid>.None;
    public FSharpOption<Guid> CausationId => FSharpOption<Guid>.None;
}

/// <summary>
/// Represents an edge in the event graph
/// </summary>
public class GraphEdge
{
    public string EdgeType { get; set; } = string.Empty;
    public Guid FromEventId { get; set; }
    public Guid ToEventId { get; set; }
    public SystemDateTime CreatedAt { get; set; }
}
