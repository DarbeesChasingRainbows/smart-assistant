using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LifeOS.Domain.Inventory;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Inventory;

/// <summary>
/// Repository implementation for managing Movement entities in ArangoDB.
/// Provides CRUD operations and specialized queries for inventory movement tracking.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository handles the mapping between F# domain types and ArangoDB document storage.
/// It supports movement history tracking and audit trail functionality.
/// All operations are asynchronous for optimal performance.
/// </remarks>
public class MovementRepository : IMovementRepository
{
    private readonly ArangoDbContext _context;
    private const string CollectionName = ArangoDbContext.Collections.InventoryMovements;

    /// <summary>
    /// Initializes a new instance of the <see cref="MovementRepository"/> class.
    /// </summary>
    /// <param name="context">The ArangoDB database context for data operations.</param>
    /// <exception cref="ArgumentNullException">Thrown when context is null.</exception>
    public MovementRepository(ArangoDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <summary>
    /// Retrieves a movement by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the movement.</param>
    /// <returns>
    /// An <see cref="FSharpOption{Movement}"/> containing the movement if found,
    /// or <see cref="FSharpOption{Movement}.None"/> if not found or an error occurs.
    /// </returns>
    /// <remarks>
    /// Uses ArangoDB's document key for efficient lookup.
    /// Handles database errors gracefully by returning None.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails, caught and handled internally.
    /// </exception>
    public async Task<FSharpOption<Movement>> GetByIdAsync(MovementId id)
    {
        try
        {
            var guidId = MovementIdModule.toValue(id);
            var query = $"FOR m IN {CollectionName} FILTER m._key == @id RETURN m";
            var bindVars = new Dictionary<string, object> { { "id", guidId.ToString() } };
            var cursor = await _context.Client.Cursor.PostCursorAsync<MovementDocument>(
                query,
                bindVars
            );
            var doc = cursor.Result.FirstOrDefault();
            return doc == null
                ? FSharpOption<Movement>.None
                : FSharpOption<Movement>.Some(MapToDomain(doc));
        }
        catch (ArangoDBNetStandard.ApiErrorException)
        {
            return FSharpOption<Movement>.None;
        }
    }

    /// <summary>
    /// Retrieves all movements for a specific item within an optional date range.
    /// </summary>
    /// <param name="itemId">The unique identifier of the item.</param>
    /// <param name="from">Optional start date for filtering movements.</param>
    /// <param name="to">Optional end date for filtering movements.</param>
    /// <returns>
    /// An <see cref="IEnumerable{Movement}"/> containing matching movements.
    /// Returns an empty collection if no movements are found.
    /// </returns>
    /// <remarks>
    /// Essential for item-specific inventory tracking and audit trails.
    /// Date filtering is optional; when not provided, returns all movements.
    /// </remarks>
    public async Task<IEnumerable<Movement>> GetByItemAsync(
        ItemId itemId,
        FSharpOption<DateTime> from,
        FSharpOption<DateTime> to
    )
    {
        var itemIdStr = ItemIdModule.toValue(itemId).ToString();
        var query = $"FOR m IN {CollectionName} FILTER m.ItemId == @itemId";
        var bindVars = new Dictionary<string, object> { { "itemId", itemIdStr } };

        if (FSharpOption<DateTime>.get_IsSome(from))
        {
            query += " && m.OccurredAt >= @from";
            bindVars["from"] = from.Value;
        }
        if (FSharpOption<DateTime>.get_IsSome(to))
        {
            query += " && m.OccurredAt <= @to";
            bindVars["to"] = to.Value;
        }

        query += " RETURN m";
        var cursor = await _context.Client.Cursor.PostCursorAsync<MovementDocument>(
            query,
            bindVars
        );
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves all movements involving a specific location within an optional date range.
    /// </summary>
    /// <param name="locationId">The unique identifier of the location.</param>
    /// <param name="from">Optional start date for filtering movements.</param>
    /// <param name="to">Optional end date for filtering movements.</param>
    /// <returns>
    /// An <see cref="IEnumerable{Movement}"/> containing matching movements.
    /// Returns an empty collection if no movements are found.
    /// </returns>
    /// <remarks>
    /// Includes movements where the location is either source or destination.
    /// Essential for location-based inventory flow analysis.
    /// </remarks>
    public async Task<IEnumerable<Movement>> GetByLocationAsync(
        LocationId locationId,
        FSharpOption<DateTime> from,
        FSharpOption<DateTime> to
    )
    {
        var locationIdStr = LocationIdModule.toValue(locationId).ToString();
        var query =
            $"FOR m IN {CollectionName} FILTER m.FromLocationId == @locationId || m.ToLocationId == @locationId";
        var bindVars = new Dictionary<string, object> { { "locationId", locationIdStr } };

        if (FSharpOption<DateTime>.get_IsSome(from))
        {
            query += " && m.OccurredAt >= @from";
            bindVars["from"] = from.Value;
        }
        if (FSharpOption<DateTime>.get_IsSome(to))
        {
            query += " && m.OccurredAt <= @to";
            bindVars["to"] = to.Value;
        }

        query += " RETURN m";
        var cursor = await _context.Client.Cursor.PostCursorAsync<MovementDocument>(
            query,
            bindVars
        );
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves all movements with a specific reference identifier.
    /// </summary>
    /// <param name="reference">The reference identifier to search for.</param>
    /// <returns>
    /// An <see cref="IEnumerable{Movement}"/> containing matching movements.
    /// Returns an empty collection if no movements are found.
    /// </returns>
    /// <remarks>
    /// Reference codes are typically used for batch operations or external system integration.
    /// Useful for tracking related movements across different items.
    /// </remarks>
    /// <exception cref="ArgumentException">Thrown when reference is null or empty.</exception>
    public async Task<IEnumerable<Movement>> GetByReferenceAsync(string reference)
    {
        if (string.IsNullOrWhiteSpace(reference))
            throw new ArgumentException("Reference cannot be null or empty.", nameof(reference));
        var query = $"FOR m IN {CollectionName} FILTER m.Reference == @reference RETURN m";
        var bindVars = new Dictionary<string, object> { { "reference", reference } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<MovementDocument>(
            query,
            bindVars
        );
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Adds a new movement record to the database.
    /// </summary>
    /// <param name="movement">The movement to add.</param>
    /// <returns>The added movement with any database-generated values.</returns>
    /// <remarks>
    /// The movement's ID is used as the document key in ArangoDB.
    /// Timestamps are automatically managed by the database.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when movement is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document cannot be created due to validation or constraint violations.
    /// </exception>
    public async Task<Movement> AddAsync(Movement movement)
    {
        if (movement == null)
            throw new ArgumentNullException(nameof(movement));
        var doc = MapToDocument(movement);
        await _context.Client.Document.PostDocumentAsync(CollectionName, doc);
        return movement;
    }

    /// <summary>
    /// Retrieves movements within an optional date range with optional limiting.
    /// </summary>
    /// <param name="from">Optional start date for filtering movements.</param>
    /// <param name="to">Optional end date for filtering movements.</param>
    /// <param name="limit">Optional maximum number of movements to return.</param>
    /// <returns>
    /// An <see cref="IEnumerable{Movement}"/> containing matching movements.
    /// Returns movements sorted by occurrence date in descending order.
    /// </returns>
    /// <remarks>
    /// Returns recent movements when no date range is specified.
    /// Useful for dashboards and recent activity displays.
    /// </remarks>
    public async Task<IEnumerable<Movement>> GetMovementsAsync(
        FSharpOption<DateTime> from,
        FSharpOption<DateTime> to,
        FSharpOption<int> limit
    )
    {
        var query = $"FOR m IN {CollectionName}";
        var bindVars = new Dictionary<string, object>();

        if (FSharpOption<DateTime>.get_IsSome(from))
        {
            query += " FILTER m.OccurredAt >= @from";
            bindVars["from"] = from.Value;
        }
        if (FSharpOption<DateTime>.get_IsSome(to))
        {
            query +=
                (FSharpOption<DateTime>.get_IsSome(from) ? " &&" : " FILTER")
                + " m.OccurredAt <= @to";
            bindVars["to"] = to.Value;
        }

        query += " SORT m.OccurredAt DESC";
        if (FSharpOption<int>.get_IsSome(limit))
        {
            query += " LIMIT @limit";
            bindVars["limit"] = limit.Value;
        }

        query += " RETURN m";
        var cursor = await _context.Client.Cursor.PostCursorAsync<MovementDocument>(
            query,
            bindVars
        );
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Maps an ArangoDB document to the F# domain Movement type.
    /// </summary>
    /// <param name="doc">The database document to map.</param>
    /// <returns>The corresponding domain Movement instance.</returns>
    /// <remarks>
    /// Handles conversion between string representations and F# option types.
    /// Parses GUIDs and converts enum values from strings.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when doc is null.</exception>
    /// <exception cref="FormatException">
    /// Thrown when GUID parsing fails for invalid document keys.
    /// </exception>
    private Movement MapToDomain(MovementDocument doc) =>
        new(
            MovementIdModule.fromGuid(Guid.Parse(doc.Key)),
            doc.Reference,
            ParseMovementType(doc.Type),
            string.IsNullOrEmpty(doc.FromLocationId)
                ? FSharpOption<LocationId>.None
                : FSharpOption<LocationId>.Some(
                    LocationIdModule.fromGuid(Guid.Parse(doc.FromLocationId))
                ),
            string.IsNullOrEmpty(doc.ToLocationId)
                ? FSharpOption<LocationId>.None
                : FSharpOption<LocationId>.Some(
                    LocationIdModule.fromGuid(Guid.Parse(doc.ToLocationId))
                ),
            ItemIdModule.fromGuid(Guid.Parse(doc.ItemId)),
            doc.Quantity,
            doc.Cost,
            doc.Reason,
            doc.UserId,
            doc.OccurredAt,
            doc.CreatedAt
        );

    /// <summary>
    /// Maps an F# domain Movement to an ArangoDB document.
    /// </summary>
    /// <param name="movement">The domain movement to map.</param>
    /// <returns>The corresponding database document.</returns>
    /// <remarks>
    /// Converts F# option types to nullable reference types.
    /// Transforms enum values to their string representations for storage.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when movement is null.</exception>
    private MovementDocument MapToDocument(Movement movement) =>
        new()
        {
            Key = MovementIdModule.toValue(movement.Id).ToString(),
            Reference = movement.Reference,
            Type = movement.Type switch
            {
                var t when t == MovementType.Purchase => "Purchase",
                var t when t == MovementType.Sale => "Sale",
                var t when t == MovementType.Transfer => "Transfer",
                var t when t == MovementType.Adjustment => "Adjustment",
                var t when t == MovementType.Consumption => "Consumption",
                var t when t == MovementType.Return => "Return",
                var t when t == MovementType.Build => "Build",
                var t when t == MovementType.Disassembly => "Disassembly",
                var t when t == MovementType.Disposal => "Disposal",
                MovementType.Custom custom => custom.Item,
                _ => "Other",
            },
            FromLocationId = FSharpOption<LocationId>.get_IsSome(movement.FromLocationId)
                ? LocationIdModule.toValue(movement.FromLocationId.Value).ToString()
                : null,
            ToLocationId = FSharpOption<LocationId>.get_IsSome(movement.ToLocationId)
                ? LocationIdModule.toValue(movement.ToLocationId.Value).ToString()
                : null,
            ItemId = ItemIdModule.toValue(movement.ItemId).ToString(),
            Quantity = movement.Quantity,
            Cost = FSharpOption<decimal>.get_IsSome(movement.Cost)
                ? (decimal?)movement.Cost.Value
                : null,
            Reason = movement.Reason,
            UserId = movement.UserId,
            OccurredAt = movement.OccurredAt,
            CreatedAt = movement.CreatedAt,
        };

    /// <summary>
    /// Parses a string representation of movement type to the domain enum.
    /// </summary>
    /// <param name="s">The string to parse.</param>
    /// <returns>The corresponding <see cref="MovementType"/> value.</returns>
    /// <remarks>
    /// Defaults to Adjustment type for unknown values to maintain data integrity.
    /// </remarks>
    private static MovementType ParseMovementType(string s) =>
        s switch
        {
            "Purchase" => MovementType.Purchase,
            "Sale" => MovementType.Sale,
            "Transfer" => MovementType.Transfer,
            "Adjustment" => MovementType.Adjustment,
            "Consumption" => MovementType.Consumption,
            "Return" => MovementType.Return,
            "Build" => MovementType.Build,
            "Disassembly" => MovementType.Disassembly,
            _ => MovementType.Adjustment,
        };
}

/// <summary>
/// ArangoDB document representation of a Movement entity.
/// Used for persistence and database operations.
/// </summary>
/// <remarks>
/// This class serves as the data transfer object between the application
/// and ArangoDB. It uses string representations for enum values and
/// nullable types for optional fields to match JSON serialization requirements.
/// </remarks>
public class MovementDocument
{
    /// <summary>
    /// Gets or sets the document key (used as the primary identifier in ArangoDB).
    /// Corresponds to the Movement's ID.
    /// </summary>
    public string Key { get; set; } = "";

    /// <summary>
    /// Gets or sets the reference code for the movement.
    /// Used for batch operations and external system integration.
    /// </summary>
    public string Reference { get; set; } = "";

    /// <summary>
    /// Gets or sets the type of movement.
    /// Stored as string for JSON compatibility.
    /// Default value is "Adjustment".
    /// </summary>
    public string Type { get; set; } = "Adjustment";

    /// <summary>
    /// Gets or sets the source location identifier.
    /// Optional field; null for movements without a source (e.g., purchases).
    /// </summary>
    public string? FromLocationId { get; set; }

    /// <summary>
    /// Gets or sets the destination location identifier.
    /// Optional field; null for movements without a destination (e.g., sales).
    /// </summary>
    public string? ToLocationId { get; set; }

    /// <summary>
    /// Gets or sets the item identifier for the movement.
    /// Required field linking to the item catalog.
    /// </summary>
    public string ItemId { get; set; } = "";

    /// <summary>
    /// Gets or sets the quantity moved.
    /// Positive values represent inventory additions, negative values represent removals.
    /// </summary>
    public decimal Quantity { get; set; }

    /// <summary>
    /// Gets or sets the cost associated with the movement.
    /// Optional field for financial tracking and valuation.
    /// </summary>
    public decimal? Cost { get; set; }

    /// <summary>
    /// Gets or sets the reason or description for the movement.
    /// Used for audit trails and operational context.
    /// </summary>
    public string Reason { get; set; } = "";

    /// <summary>
    /// Gets or sets the user identifier who performed the movement.
    /// Used for audit and accountability purposes.
    /// </summary>
    public string UserId { get; set; } = "";

    /// <summary>
    /// Gets or sets when the movement occurred.
    /// Used for chronological ordering and date-based filtering.
    /// </summary>
    public DateTime OccurredAt { get; set; }

    /// <summary>
    /// Gets or sets the creation timestamp.
    /// Automatically set when the document is first created.
    /// </summary>
    public DateTime CreatedAt { get; set; }
}
