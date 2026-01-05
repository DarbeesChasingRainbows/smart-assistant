using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LifeOS.Domain.Inventory;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Inventory;

/// <summary>
/// Repository implementation for managing StockRecord entities in ArangoDB.
/// Provides CRUD operations and specialized queries for stock level tracking.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository handles the mapping between F# domain types and ArangoDB document storage.
/// It supports stock level management, reservation tracking, and low stock monitoring.
/// All operations are asynchronous for optimal performance.
/// </remarks>
public class StockRepository : IStockRepository
{
    private readonly ArangoDbContext _context;
    private const string CollectionName = ArangoDbContext.Collections.InventoryStockLevels;

    /// <summary>
    /// Initializes a new instance of the <see cref="StockRepository"/> class.
    /// </summary>
    /// <param name="context">The ArangoDB database context for data operations.</param>
    /// <exception cref="ArgumentNullException">Thrown when context is null.</exception>
    public StockRepository(ArangoDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <summary>
    /// Retrieves all stock records for a specific item across all locations.
    /// </summary>
    /// <param name="itemId">The unique identifier of the item.</param>
    /// <returns>
    /// An <see cref="IEnumerable{StockRecord}"/> containing all stock records for the item.
    /// Returns an empty collection if no stock records exist for the item.
    /// </returns>
    /// <remarks>
    /// Essential for item-level inventory analysis and stock distribution.
    /// Includes all locations where the item has stock records.
    /// </remarks>
    public async Task<IEnumerable<StockRecord>> GetByItemAsync(ItemId itemId)
    {
        var itemIdStr = ItemIdModule.toValue(itemId).ToString();
        var query = $"FOR s IN {CollectionName} FILTER s.ItemId == @itemId RETURN s";
        var bindVars = new Dictionary<string, object> { { "itemId", itemIdStr } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<StockDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves all stock records for a specific location across all items.
    /// </summary>
    /// <param name="locationId">The unique identifier of the location.</param>
    /// <returns>
    /// An <see cref="IEnumerable{StockRecord}"/> containing all stock records at the location.
    /// Returns an empty collection if no stock records exist at the location.
    /// </returns>
    /// <remarks>
    /// Essential for location-level inventory analysis and capacity planning.
    /// Includes all items that have stock records at the location.
    /// </remarks>
    public async Task<IEnumerable<StockRecord>> GetByLocationAsync(LocationId locationId)
    {
        var locationIdStr = LocationIdModule.toValue(locationId).ToString();
        var query = $"FOR s IN {CollectionName} FILTER s.LocationId == @locationId RETURN s";
        var bindVars = new Dictionary<string, object> { { "locationId", locationIdStr } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<StockDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves the stock record for a specific item at a specific location.
    /// </summary>
    /// <param name="itemId">The unique identifier of the item.</param>
    /// <param name="locationId">The unique identifier of the location.</param>
    /// <returns>
    /// An <see cref="FSharpOption{StockRecord}"/> containing the stock record if found,
    /// or <see cref="FSharpOption{StockRecord}.None"/> if no stock record exists.
    /// </returns>
    /// <remarks>
    /// Used for precise stock level queries and availability checks.
    /// Returns None when no stock record exists for the item-location combination.
    /// </remarks>
    public async Task<FSharpOption<StockRecord>> GetByItemAndLocationAsync(
        ItemId itemId,
        LocationId locationId
    )
    {
        var itemIdStr = ItemIdModule.toValue(itemId).ToString();
        var locationIdStr = LocationIdModule.toValue(locationId).ToString();
        var query =
            $"FOR s IN {CollectionName} FILTER s.ItemId == @itemId && s.LocationId == @locationId RETURN s";
        var bindVars = new Dictionary<string, object>
        {
            { "itemId", itemIdStr },
            { "locationId", locationIdStr },
        };
        var cursor = await _context.Client.Cursor.PostCursorAsync<StockDocument>(query, bindVars);
        var doc = cursor.Result.FirstOrDefault();
        return doc == null
            ? FSharpOption<StockRecord>.None
            : FSharpOption<StockRecord>.Some(MapToDomain(doc));
    }

    /// <summary>
    /// Retrieves all stock records that are below their minimum levels.
    /// </summary>
    /// <returns>
    /// An <see cref="IEnumerable{StockRecord}"/> containing low stock records.
    /// Returns an empty collection if no items are below minimum levels.
    /// </returns>
    /// <remarks>
    /// Essential for inventory management and reorder point calculations.
    /// Used for generating low stock alerts and purchase recommendations.
    /// </remarks>
    public async Task<IEnumerable<StockRecord>> GetLowStockAsync()
    {
        var query = $"FOR s IN {CollectionName} FILTER s.Quantity <= s.MinLevel RETURN s";
        var cursor = await _context.Client.Cursor.PostCursorAsync<StockDocument>(query);
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Sets the stock level for a specific item at a specific location.
    /// </summary>
    /// <param name="itemId">The unique identifier of the item.</param>
    /// <param name="locationId">The unique identifier of the location.</param>
    /// <param name="quantity">The new stock quantity to set.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// Creates a new stock record if none exists, or updates existing record.
    /// Automatically refreshes the LastUpdated timestamp.
    /// Preserves existing reservation quantities and level settings.
    /// </remarks>
    public async Task SetStockLevelAsync(ItemId itemId, LocationId locationId, decimal quantity)
    {
        var existing = await GetByItemAndLocationAsync(itemId, locationId);
        var stock = FSharpOption<StockRecord>.get_IsNone(existing)
            ? new StockRecord(
                StockIdModule.create(),
                itemId,
                locationId,
                quantity,
                0,
                0,
                0,
                DateTime.UtcNow
            )
            : new StockRecord(
                existing.Value.Id,
                existing.Value.ItemId,
                existing.Value.LocationId,
                quantity,
                existing.Value.ReservedQuantity,
                existing.Value.MinLevel,
                existing.Value.MaxLevel,
                DateTime.UtcNow
            );

        var doc = MapToDocument(stock);
        if (FSharpOption<StockRecord>.get_IsNone(existing))
        {
            await _context.Client.Document.PostDocumentAsync(CollectionName, doc);
        }
        else
        {
            var key = StockIdModule.toValue(stock.Id).ToString();
            await _context.Client.Document.PutDocumentAsync($"{CollectionName}/{key}", doc);
        }
    }

    /// <summary>
    /// Adjusts both the total quantity and reserved quantity for stock records.
    /// </summary>
    /// <param name="itemId">The unique identifier of the item.</param>
    /// <param name="locationId">The unique identifier of the location.</param>
    /// <param name="quantity">The new total quantity to set.</param>
    /// <param name="reservedQuantity">The new reserved quantity to set.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// Creates new stock records if none exist, or updates existing ones.
    /// Used for complex stock adjustments affecting both available and reserved stock.
    /// Automatically refreshes the LastUpdated timestamp.
    /// </remarks>
    public async Task AdjustStockAsync(
        ItemId itemId,
        LocationId locationId,
        decimal quantity,
        decimal reservedQuantity
    )
    {
        var existing = await GetByItemAndLocationAsync(itemId, locationId);
        if (FSharpOption<StockRecord>.get_IsNone(existing))
        {
            var stock = new StockRecord(
                StockIdModule.create(),
                itemId,
                locationId,
                quantity,
                reservedQuantity,
                0,
                0,
                DateTime.UtcNow
            );
            var doc = MapToDocument(stock);
            await _context.Client.Document.PostDocumentAsync(CollectionName, doc);
        }
        else
        {
            var stock = new StockRecord(
                existing.Value.Id,
                existing.Value.ItemId,
                existing.Value.LocationId,
                quantity,
                reservedQuantity,
                existing.Value.MinLevel,
                existing.Value.MaxLevel,
                DateTime.UtcNow
            );
            var doc = MapToDocument(stock);
            var key = StockIdModule.toValue(stock.Id).ToString();
            await _context.Client.Document.PutDocumentAsync($"{CollectionName}/{key}", doc);
        }
    }

    /// <summary>
    /// Calculates the available quantity (total minus reserved) for an item at a location.
    /// </summary>
    /// <param name="itemId">The unique identifier of the item.</param>
    /// <param name="locationId">The unique identifier of the location.</param>
    /// <returns>
    /// The available quantity for allocation or use.
    /// Returns 0 if no stock record exists.
    /// </returns>
    /// <remarks>
    /// Available quantity = Total Quantity - Reserved Quantity.
    /// Essential for inventory allocation and availability checks.
    /// </remarks>
    public async Task<decimal> GetAvailableQuantityAsync(ItemId itemId, LocationId locationId)
    {
        var stock = await GetByItemAndLocationAsync(itemId, locationId);
        return FSharpOption<StockRecord>.get_IsNone(stock)
            ? 0
            : stock.Value.Quantity - stock.Value.ReservedQuantity;
    }

    /// <summary>
    /// Maps an ArangoDB document to the F# domain StockRecord type.
    /// </summary>
    /// <param name="doc">The database document to map.</param>
    /// <returns>The corresponding domain StockRecord instance.</returns>
    /// <remarks>
    /// Handles conversion between database types and F# domain types.
    /// Parses GUIDs for identifier fields.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when doc is null.</exception>
    /// <exception cref="FormatException">
    /// Thrown when GUID parsing fails for invalid document keys.
    /// </exception>
    private StockRecord MapToDomain(StockDocument doc) =>
        new(
            StockIdModule.fromGuid(Guid.Parse(doc.Key)),
            ItemIdModule.fromGuid(Guid.Parse(doc.ItemId)),
            LocationIdModule.fromGuid(Guid.Parse(doc.LocationId)),
            doc.Quantity,
            doc.ReservedQuantity,
            doc.MinLevel,
            doc.MaxLevel,
            doc.LastUpdated
        );

    /// <summary>
    /// Maps an F# domain StockRecord to an ArangoDB document.
    /// </summary>
    /// <param name="stock">The domain stock record to map.</param>
    /// <returns>The corresponding database document.</returns>
    /// <remarks>
    /// Converts F# identifier types to string representations for storage.
    /// Preserves all stock level and reservation information.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when stock is null.</exception>
    private StockDocument MapToDocument(StockRecord stock) =>
        new()
        {
            Key = StockIdModule.toValue(stock.Id).ToString(),
            ItemId = ItemIdModule.toValue(stock.ItemId).ToString(),
            LocationId = LocationIdModule.toValue(stock.LocationId).ToString(),
            Quantity = stock.Quantity,
            ReservedQuantity = stock.ReservedQuantity,
            MinLevel = stock.MinLevel,
            MaxLevel = stock.MaxLevel,
            LastUpdated = stock.LastUpdated,
        };
}

/// <summary>
/// ArangoDB document representation of a StockRecord entity.
/// Used for persistence and database operations.
/// </summary>
/// <remarks>
/// This class serves as the data transfer object between the application
/// and ArangoDB. It stores stock levels, reservations, and threshold settings.
/// </remarks>
public class StockDocument
{
    /// <summary>
    /// Gets or sets the document key (used as the primary identifier in ArangoDB).
    /// Corresponds to the StockRecord's ID.
    /// </summary>
    public string Key { get; set; } = "";

    /// <summary>
    /// Gets or sets the item identifier for the stock record.
    /// Links to the item catalog entry.
    /// </summary>
    public string ItemId { get; set; } = "";

    /// <summary>
    /// Gets or sets the location identifier for the stock record.
    /// Links to the location hierarchy.
    /// </summary>
    public string LocationId { get; set; } = "";

    /// <summary>
    /// Gets or sets the total quantity of items in stock.
    /// Includes both available and reserved quantities.
    /// </summary>
    public decimal Quantity { get; set; }

    /// <summary>
    /// Gets or sets the quantity of items reserved for specific purposes.
    /// Reserved quantities are not available for general allocation.
    /// </summary>
    public decimal ReservedQuantity { get; set; }

    /// <summary>
    /// Gets or sets the minimum stock level threshold.
    /// Used for low stock alerts and reorder point calculations.
    /// </summary>
    public decimal MinLevel { get; set; }

    /// <summary>
    /// Gets or sets the maximum stock level threshold.
    /// Used for capacity planning and overstock prevention.
    /// </summary>
    public decimal MaxLevel { get; set; }

    /// <summary>
    /// Gets or sets the last update timestamp for the stock record.
    /// Automatically refreshed on any stock level changes.
    /// </summary>
    public DateTime LastUpdated { get; set; }
}
