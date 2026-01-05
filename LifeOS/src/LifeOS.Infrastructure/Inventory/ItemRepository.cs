using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LifeOS.Domain.Inventory;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Inventory;

/// <summary>
/// Repository implementation for managing Item entities in ArangoDB.
/// Provides CRUD operations and specialized queries for item catalog management.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository handles the mapping between F# domain types and ArangoDB document storage.
/// It uses the ArangoDbContext for database operations and includes error handling
/// for common database scenarios. All operations are asynchronous for optimal performance.
/// </remarks>
public class ItemRepository : IItemRepository
{
    private readonly ArangoDbContext _context;
    private const string CollectionName = ArangoDbContext.Collections.InventorySkus;

    /// <summary>
    /// Initializes a new instance of the <see cref="ItemRepository"/> class.
    /// </summary>
    /// <param name="context">The ArangoDB database context for data operations.</param>
    /// <exception cref="ArgumentNullException">Thrown when context is null.</exception>
    public ItemRepository(ArangoDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <summary>
    /// Retrieves an item by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the item.</param>
    /// <returns>
    /// An <see cref="FSharpOption{Item}"/> containing the item if found,
    /// or <see cref="FSharpOption{Item}.None"/> if not found or an error occurs.
    /// </returns>
    /// <remarks>
    /// Uses ArangoDB's document key for efficient lookup.
    /// Handles database errors gracefully by returning None.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails, caught and handled internally.
    /// </exception>
    public async Task<FSharpOption<Item>> GetByIdAsync(ItemId id)
    {
        try
        {
            var guidId = ItemIdModule.toValue(id);
            var query = $"FOR i IN {CollectionName} FILTER i._key == @id RETURN i";
            var bindVars = new Dictionary<string, object> { { "id", guidId.ToString() } };
            var cursor = await _context.Client.Cursor.PostCursorAsync<ItemDocument>(
                query,
                bindVars
            );
            var doc = cursor.Result.FirstOrDefault();
            return doc == null
                ? FSharpOption<Item>.None
                : FSharpOption<Item>.Some(MapToDomain(doc));
        }
        catch (ArangoDBNetStandard.ApiErrorException ex)
            when (ex.Message.Contains("collection or view not found"))
        {
            return FSharpOption<Item>.None;
        }
    }

    /// <summary>
    /// Retrieves an item by its SKU (Stock Keeping Unit).
    /// </summary>
    /// <param name="sku">The SKU to search for.</param>
    /// <returns>
    /// An <see cref="FSharpOption{Item}"/> containing the item if found,
    /// or <see cref="FSharpOption{Item}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// SKUs are typically unique and used for product identification.
    /// Useful for barcode scanning and inventory lookup operations.
    /// </remarks>
    /// <exception cref="ArgumentException">Thrown when sku is null or empty.</exception>
    public async Task<FSharpOption<Item>> GetBySKUAsync(string sku)
    {
        if (string.IsNullOrWhiteSpace(sku))
            throw new ArgumentException("SKU cannot be null or empty.", nameof(sku));
        try
        {
            var query = $"FOR i IN {CollectionName} FILTER i.Sku == @sku RETURN i";
            var bindVars = new Dictionary<string, object> { { "sku", sku } };
            var cursor = await _context.Client.Cursor.PostCursorAsync<ItemDocument>(
                query,
                bindVars
            );
            var doc = cursor.Result.FirstOrDefault();
            return doc == null
                ? FSharpOption<Item>.None
                : FSharpOption<Item>.Some(MapToDomain(doc));
        }
        catch (ArangoDBNetStandard.ApiErrorException)
        {
            return FSharpOption<Item>.None;
        }
    }

    /// <summary>
    /// Retrieves all active items from the catalog.
    /// </summary>
    /// <returns>
    /// An <see cref="IEnumerable{Item}"/> containing all active items.
    /// Returns an empty collection if no active items exist.
    /// </returns>
    /// <remarks>
    /// Only returns items where IsActive is true.
    /// Use with caution on large datasets.
    /// </remarks>
    public async Task<IEnumerable<Item>> GetAllAsync()
    {
        try
        {
            var query = $"FOR i IN {CollectionName} FILTER i.IsActive == true RETURN i";
            var cursor = await _context.Client.Cursor.PostCursorAsync<ItemDocument>(query);
            return cursor.Result.Select(MapToDomain);
        }
        catch (ArangoDBNetStandard.ApiErrorException)
        {
            return Enumerable.Empty<Item>();
        }
    }

    /// <summary>
    /// Retrieves all items belonging to a specific category.
    /// </summary>
    /// <param name="category">The item category to filter by.</param>
    /// <returns>
    /// An <see cref="IEnumerable{Item}"/> containing all items in the specified category.
    /// Returns an empty collection if no items match the category.
    /// </returns>
    /// <remarks>
    /// Essential for category-based browsing and reporting.
    /// Handles both standard categories and custom category values.
    /// </remarks>
    public async Task<IEnumerable<Item>> GetByCategoryAsync(ItemCategory category)
    {
        try
        {
            var categoryStr = category switch
            {
                var c when c == ItemCategory.Hardware => "Hardware",
                var c when c == ItemCategory.Fastener => "Fastener",
                var c when c == ItemCategory.Fluid => "Fluid",
                var c when c == ItemCategory.Tool => "Tool",
                var c when c == ItemCategory.Electrical => "Electrical",
                var c when c == ItemCategory.Body => "Body",
                var c when c == ItemCategory.Interior => "Interior",
                var c when c == ItemCategory.Performance => "Performance",
                var c when c == ItemCategory.Maintenance => "Maintenance",
                ItemCategory.Custom custom => custom.Item,
                _ => "Other",
            };
            var query = $"FOR i IN {CollectionName} FILTER i.Category == @category RETURN i";
            var bindVars = new Dictionary<string, object> { { "category", categoryStr } };
            var cursor = await _context.Client.Cursor.PostCursorAsync<ItemDocument>(
                query,
                bindVars
            );
            return cursor.Result.Select(MapToDomain);
        }
        catch (ArangoDBNetStandard.ApiErrorException)
        {
            return Enumerable.Empty<Item>();
        }
    }

    /// <summary>
    /// Searches for items by name or SKU using partial matching.
    /// </summary>
    /// <param name="searchTerm">The term to search for (case-insensitive partial match).</param>
    /// <returns>
    /// An <see cref="IEnumerable{Item}"/> containing matching items.
    /// Returns an empty collection if no matches are found.
    /// </returns>
    /// <remarks>
    /// Uses SQL LIKE pattern matching with wildcards.
    /// Searches both item names and SKUs for flexible lookup.
    /// </remarks>
    /// <exception cref="ArgumentException">Thrown when searchTerm is null or empty.</exception>
    public async Task<IEnumerable<Item>> SearchAsync(string searchTerm)
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
            throw new ArgumentException("Search term cannot be null or empty.", nameof(searchTerm));
        try
        {
            var query =
                $"FOR i IN {CollectionName} FILTER LIKE(i.Name, @search, true) || LIKE(i.SKU, @search, true) RETURN i";
            var bindVars = new Dictionary<string, object> { { "search", $"%{searchTerm}%" } };
            var cursor = await _context.Client.Cursor.PostCursorAsync<ItemDocument>(
                query,
                bindVars
            );
            return cursor.Result.Select(MapToDomain);
        }
        catch (ArangoDBNetStandard.ApiErrorException)
        {
            return Enumerable.Empty<Item>();
        }
    }

    /// <summary>
    /// Adds a new item to the catalog.
    /// </summary>
    /// <param name="item">The item to add.</param>
    /// <returns>The added item with any database-generated values.</returns>
    /// <remarks>
    /// The item's ID is used as the document key in ArangoDB.
    /// Timestamps are automatically managed by the database.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when item is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document cannot be created due to validation or constraint violations.
    /// </exception>
    public async Task<Item> AddAsync(Item item)
    {
        if (item == null)
            throw new ArgumentNullException(nameof(item));
        
        var doc = MapToDocument(item);
        await _context.Client.Document.PostDocumentAsync(CollectionName, doc);
        return item;
    }

    /// <summary>
    /// Updates an existing item in the catalog.
    /// </summary>
    /// <param name="item">The item with updated values.</param>
    /// <returns>The updated item.</returns>
    /// <remarks>
    /// Uses the item's ID as the document key for the update operation.
    /// The UpdatedAt timestamp is automatically refreshed by the database.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when item is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document doesn't exist or update fails due to validation errors.
    /// </exception>
    public async Task<Item> UpdateAsync(Item item)
    {
        if (item == null)
            throw new ArgumentNullException(nameof(item));
        
        var doc = MapToDocument(item);
        var key = ItemIdModule.toValue(item.Id).ToString();
        await _context.Client.Document.PutDocumentAsync(CollectionName, key, doc);
        return item;
    }

    /// <summary>
    /// Deletes an item from the catalog.
    /// </summary>
    /// <param name="id">The unique identifier of the item to delete.</param>
    /// <returns>
    /// <see langword="true"/> if the item was successfully deleted;
    /// <see langword="false"/> if the item was not found or deletion failed.
    /// </returns>
    /// <remarks>
    /// This is a permanent operation. Consider using IsActive flag
    /// for soft deletes when audit trails are required.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when id is null.</exception>
    public async Task<bool> DeleteAsync(ItemId id)
    {
        if (id == null)
            throw new ArgumentNullException(nameof(id));
        try
        {
            var key = ItemIdModule.toValue(id).ToString();
            await _context.Client.Document.DeleteDocumentAsync(CollectionName, key);
            return true;
        }
        catch (ArangoDBNetStandard.ApiErrorException)
        {
            return false;
        }
    }

    /// <summary>
    /// Maps an ArangoDB document to the F# domain Item type.
    /// </summary>
    /// <param name="doc">The database document to map.</param>
    /// <returns>The corresponding domain Item instance.</returns>
    /// <remarks>
    /// Handles conversion between string representations and F# option types.
    /// Parses GUIDs and converts enum values from strings.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when doc is null.</exception>
    /// <exception cref="FormatException">
    /// Thrown when GUID parsing fails for invalid document keys.
    /// </exception>
    private Item MapToDomain(ItemDocument doc) =>
        new(
            ItemIdModule.fromGuid(Guid.Parse(doc.Key)),
            doc.Sku,
            doc.Name,
            string.IsNullOrEmpty(doc.Description)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Description),
            ItemCategory.NewCustom(doc.Category),
            ParseUnitOfMeasure(doc.UnitOfMeasure),
            doc.DefaultCost,
            doc.DefaultPrice,
            string.IsNullOrEmpty(doc.Supplier)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Supplier),
            string.IsNullOrEmpty(doc.PartNumber)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.PartNumber),
            string.IsNullOrEmpty(doc.Barcode)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Barcode),
            ListModule.OfSeq(doc.Images ?? new List<string>()),
            MapModule.OfSeq(
                (
                    doc.Specifications?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)
                    ?? new Dictionary<string, string>()
                ).Select(kvp => Tuple.Create(kvp.Key, kvp.Value))
            ),
            doc.IsActive,
            doc.CreatedAt,
            doc.UpdatedAt
        );

    /// <summary>
    /// Maps an F# domain Item to an ArangoDB document.
    /// </summary>
    /// <param name="item">The domain item to map.</param>
    /// <returns>The corresponding database document.</returns>
    /// <remarks>
    /// Converts F# option types to nullable reference types.
    /// Transforms enum values to their string representations for storage.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when item is null.</exception>
    private ItemDocument MapToDocument(Item item) =>
        new()
        {
            Key = ItemIdModule.toValue(item.Id).ToString(),
            Sku = item.SKU,
            Name = item.Name,
            Description = item.Description != null ? item.Description.Value : null,
            Category = item.Category switch
            {
                var c when c == ItemCategory.Hardware => "Hardware",
                var c when c == ItemCategory.Fastener => "Fastener",
                var c when c == ItemCategory.Fluid => "Fluid",
                var c when c == ItemCategory.Tool => "Tool",
                var c when c == ItemCategory.Electrical => "Electrical",
                var c when c == ItemCategory.Body => "Body",
                var c when c == ItemCategory.Interior => "Interior",
                var c when c == ItemCategory.Performance => "Performance",
                var c when c == ItemCategory.Maintenance => "Maintenance",
                ItemCategory.Custom custom => custom.Item,
                _ => "Other",
            },
            UnitOfMeasure = item.UnitOfMeasure switch
            {
                var u when u == UnitOfMeasure.Each => "Each",
                var u when u == UnitOfMeasure.Pair => "Pair",
                var u when u == UnitOfMeasure.Set => "Set",
                var u when u == UnitOfMeasure.Box => "Box",
                var u when u == UnitOfMeasure.Bag => "Bag",
                var u when u == UnitOfMeasure.Foot => "Foot",
                var u when u == UnitOfMeasure.Meter => "Meter",
                var u when u == UnitOfMeasure.Kilogram => "Kilogram",
                var u when u == UnitOfMeasure.Pound => "Pound",
                var u when u == UnitOfMeasure.Liter => "Liter",
                var u when u == UnitOfMeasure.Gallon => "Gallon",
                var u when u == UnitOfMeasure.Ounce => "Ounce",
                var u when u == UnitOfMeasure.Gram => "Gram",
                UnitOfMeasure.Custom custom => custom.Item,
                _ => "Each",
            },
            DefaultCost = item.DefaultCost,
            DefaultPrice = item.DefaultPrice,
            Supplier = item.Supplier != null ? item.Supplier.Value : null,
            PartNumber = item.PartNumber != null ? item.PartNumber.Value : null,
            Barcode = item.Barcode != null ? item.Barcode.Value : null,
            Images = item.Images?.ToList() ?? new List<string>(),
            Specifications =
                item.Specifications?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)
                ?? new Dictionary<string, string>(),
            IsActive = item.IsActive,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt,
        };

    /// <summary>
    /// Parses a string representation of item category to the domain enum.
    /// </summary>
    /// <param name="s">The string to parse.</param>
    /// <returns>The corresponding <see cref="ItemCategory"/> value.</returns>
    /// <remarks>
    /// Creates custom categories for unknown values to maintain data integrity.
    /// </remarks>
    private static ItemCategory ParseItemCategory(string s) =>
        s switch
        {
            "Hardware" => ItemCategory.Hardware,
            "Fastener" => ItemCategory.Fastener,
            "Fluid" => ItemCategory.Fluid,
            "Tool" => ItemCategory.Tool,
            "Electrical" => ItemCategory.Electrical,
            "Body" => ItemCategory.Body,
            "Interior" => ItemCategory.Interior,
            "Performance" => ItemCategory.Performance,
            "Maintenance" => ItemCategory.Maintenance,
            _ => ItemCategory.NewCustom(s),
        };

    /// <summary>
    /// Parses a string representation of unit of measure to the domain enum.
    /// </summary>
    /// <param name="s">The string to parse.</param>
    /// <returns>The corresponding <see cref="UnitOfMeasure"/> value.</returns>
    /// <remarks>
    /// Creates custom units for unknown values to handle data migration scenarios.
    /// </remarks>
    private static UnitOfMeasure ParseUnitOfMeasure(string s) =>
        s switch
        {
            "Each" => UnitOfMeasure.Each,
            "Pair" => UnitOfMeasure.Pair,
            "Set" => UnitOfMeasure.Set,
            "Box" => UnitOfMeasure.Box,
            "Bag" => UnitOfMeasure.Bag,
            "Foot" => UnitOfMeasure.Foot,
            "Meter" => UnitOfMeasure.Meter,
            "Kilogram" => UnitOfMeasure.Kilogram,
            "Pound" => UnitOfMeasure.Pound,
            "Liter" => UnitOfMeasure.Liter,
            "Gallon" => UnitOfMeasure.Gallon,
            "Ounce" => UnitOfMeasure.Ounce,
            "Gram" => UnitOfMeasure.Gram,
            _ => UnitOfMeasure.NewCustom(s),
        };
}

/// <summary>
/// ArangoDB document representation of an Item entity.
/// Used for persistence and database operations.
/// </summary>
/// <remarks>
/// This class serves as the data transfer object between the application
/// and ArangoDB. It uses string representations for enum values and
/// nullable types for optional fields to match JSON serialization requirements.
/// </remarks>
public class ItemDocument
{
    /// <summary>
    /// Gets or sets the document key (used as the primary identifier in ArangoDB).
    /// Corresponds to the Item's ID.
    /// </summary>
    public string Key { get; set; } = "";

    /// <summary>
    /// Gets or sets the Stock Keeping Unit (SKU) for the item.
    /// Typically unique and used for product identification.
    /// </summary>
    public string Sku { get; set; } = "";

    /// <summary>
    /// Gets or sets the display name of the item.
    /// Used for user-facing identification.
    /// </summary>
    public string Name { get; set; } = "";

    /// <summary>
    /// Gets or sets the detailed description of the item.
    /// Optional field for additional product information.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the category classification of the item.
    /// Stored as string for JSON compatibility.
    /// Default value is "Other".
    /// </summary>
    public string Category { get; set; } = "Other";

    /// <summary>
    /// Gets or sets the unit of measure for the item.
    /// Stored as string for JSON compatibility.
    /// Default value is "Each".
    /// </summary>
    public string UnitOfMeasure { get; set; } = "Each";

    /// <summary>
    /// Gets or sets the default cost price of the item.
    /// Used for inventory valuation and financial calculations.
    /// </summary>
    public decimal DefaultCost { get; set; }

    /// <summary>
    /// Gets or sets the default selling price of the item.
    /// Used for pricing and revenue calculations.
    /// </summary>
    public decimal DefaultPrice { get; set; }

    /// <summary>
    /// Gets or sets the supplier information for the item.
    /// Optional field for procurement tracking.
    /// </summary>
    public string? Supplier { get; set; }

    /// <summary>
    /// Gets or sets the manufacturer part number.
    /// Optional field for cross-referencing with suppliers.
    /// </summary>
    public string? PartNumber { get; set; }

    /// <summary>
    /// Gets or sets the barcode for the item.
    /// Optional field for scanning and automated identification.
    /// </summary>
    public string? Barcode { get; set; }

    /// <summary>
    /// Gets or sets the collection of image URLs for the item.
    /// Optional field for visual product representation.
    /// </summary>
    public List<string>? Images { get; set; }

    /// <summary>
    /// Gets or sets the technical specifications of the item.
    /// Optional field for detailed product attributes.
    /// </summary>
    public Dictionary<string, string>? Specifications { get; set; }

    /// <summary>
    /// Gets or sets whether the item is currently active.
    /// Used for soft deletes and product lifecycle management.
    /// Default value is true.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Gets or sets the creation timestamp.
    /// Automatically set when the document is first created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the last update timestamp.
    /// Automatically updated on each modification.
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
