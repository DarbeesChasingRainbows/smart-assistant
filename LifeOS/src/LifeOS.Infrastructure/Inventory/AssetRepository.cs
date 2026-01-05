using LifeOS.Domain.Inventory;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Inventory;

/// <summary>
/// Repository implementation for managing Asset entities in ArangoDB.
/// Provides CRUD operations and specialized queries for asset management.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository handles the mapping between F# domain types and ArangoDB document storage.
/// It uses the ArangoDbContext for database operations and includes error handling
/// for common database scenarios. All operations are asynchronous for optimal performance.
/// </remarks>
public class AssetRepository : IAssetRepository
{
    private readonly ArangoDbContext _context;
    private const string CollectionName = ArangoDbContext.Collections.InventoryAssets;

    /// <summary>
    /// Initializes a new instance of the <see cref="AssetRepository"/> class.
    /// </summary>
    /// <param name="context">The ArangoDB database context for data operations.</param>
    /// <exception cref="ArgumentNullException">Thrown when context is null.</exception>
    public AssetRepository(ArangoDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <summary>
    /// Retrieves an asset by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the asset.</param>
    /// <returns>
    /// An <see cref="FSharpOption{Asset}"/> containing the asset if found,
    /// or <see cref="FSharpOption{Asset}.None"/> if not found or an error occurs.
    /// </returns>
    /// <remarks>
    /// Uses ArangoDB's document key for efficient lookup.
    /// Handles database errors gracefully by returning None.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails, caught and handled internally.
    /// </exception>
    public async Task<FSharpOption<Asset>> GetByIdAsync(AssetId id)
    {
        try
        {
            var guidId = AssetIdModule.toValue(id);
            var query = $"FOR a IN {CollectionName} FILTER a._key == @id RETURN a";
            var bindVars = new Dictionary<string, object> { { "id", guidId.ToString() } };
            var cursor = await _context.Client.Cursor.PostCursorAsync<AssetDocument>(
                query,
                bindVars
            );
            var doc = cursor.Result.FirstOrDefault();
            return doc == null
                ? FSharpOption<Asset>.None
                : FSharpOption<Asset>.Some(MapToDomain(doc));
        }
        catch (ArangoDBNetStandard.ApiErrorException)
        {
            return FSharpOption<Asset>.None;
        }
    }

    /// <summary>
    /// Retrieves all assets associated with a specific item.
    /// </summary>
    /// <param name="itemId">The unique identifier of the item.</param>
    /// <returns>
    /// An <see cref="IEnumerable{Asset}"/> containing all assets for the specified item.
    /// Returns an empty collection if no assets are found.
    /// </returns>
    /// <remarks>
    /// Useful for finding all physical instances of a particular item type.
    /// </remarks>
    public async Task<IEnumerable<Asset>> GetByItemIdAsync(ItemId itemId)
    {
        var itemIdStr = ItemIdModule.toValue(itemId).ToString();
        var query = $"FOR a IN {CollectionName} FILTER a.ItemId == @itemId RETURN a";
        var bindVars = new Dictionary<string, object> { { "itemId", itemIdStr } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<AssetDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves all assets located at a specific location.
    /// </summary>
    /// <param name="locationId">The unique identifier of the location.</param>
    /// <returns>
    /// An <see cref="IEnumerable{Asset}"/> containing all assets at the specified location.
    /// Returns an empty collection if no assets are found.
    /// </returns>
    /// <remarks>
    /// Essential for location-based inventory management and tracking.
    /// </remarks>
    public async Task<IEnumerable<Asset>> GetByLocationAsync(LocationId locationId)
    {
        var locationIdStr = LocationIdModule.toValue(locationId).ToString();
        var query = $"FOR a IN {CollectionName} FILTER a.LocationId == @locationId RETURN a";
        var bindVars = new Dictionary<string, object> { { "locationId", locationIdStr } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<AssetDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves an asset by its serial number.
    /// </summary>
    /// <param name="serialNumber">The serial number to search for.</param>
    /// <returns>
    /// An <see cref="FSharpOption{Asset}"/> containing the asset if found,
    /// or <see cref="FSharpOption{Asset}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Serial numbers are typically unique and used for precise asset identification.
    /// Useful for warranty tracking and maintenance history.
    /// </remarks>
    /// <exception cref="ArgumentException">Thrown when serialNumber is null or empty.</exception>
    public async Task<FSharpOption<Asset>> GetBySerialNumberAsync(string serialNumber)
    {
        if (string.IsNullOrWhiteSpace(serialNumber))
            throw new ArgumentException(
                "Serial number cannot be null or empty.",
                nameof(serialNumber)
            );

        var query = $"FOR a IN {CollectionName} FILTER a.SerialNumber == @serial RETURN a";
        var bindVars = new Dictionary<string, object> { { "serial", serialNumber } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<AssetDocument>(query, bindVars);
        var doc = cursor.Result.FirstOrDefault();
        return doc == null ? FSharpOption<Asset>.None : FSharpOption<Asset>.Some(MapToDomain(doc));
    }

    /// <summary>
    /// Retrieves all assets with a specific status.
    /// </summary>
    /// <param name="status">The asset status to filter by.</param>
    /// <returns>
    /// An <see cref="IEnumerable{Asset}"/> containing all assets with the specified status.
    /// Returns an empty collection if no assets match the status.
    /// </returns>
    /// <remarks>
    /// Essential for workflow management and status-based reporting.
    /// Commonly used for finding available assets or items needing maintenance.
    /// </remarks>
    public async Task<IEnumerable<Asset>> GetByStatusAsync(AssetStatus status)
    {
        var statusStr = status switch
        {
            var s when s == AssetStatus.Available => "Available",
            var s when s == AssetStatus.InUse => "InUse",
            var s when s == AssetStatus.Reserved => "Reserved",
            var s when s == AssetStatus.InTransit => "InTransit",
            var s when s == AssetStatus.OutForRepair => "OutForRepair",
            var s when s == AssetStatus.Retired => "Retired",
            var s when s == AssetStatus.Lost => "Lost",
            var s when s == AssetStatus.Disposed => "Disposed",
            _ => "Unknown",
        };

        var query = $"FOR a IN {CollectionName} FILTER a.Status == @status RETURN a";
        var bindVars = new Dictionary<string, object> { { "status", statusStr } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<AssetDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves all assets from the database.
    /// </summary>
    /// <returns>
    /// An <see cref="IEnumerable{Asset}"/> containing all assets in the collection.
    /// Returns an empty collection if no assets exist.
    /// </returns>
    /// <remarks>
    /// Use with caution on large datasets. Consider using filtered queries
    /// for better performance when specific subsets are needed.
    /// </remarks>
    public async Task<IEnumerable<Asset>> GetAllAsync()
    {
        var query = $"FOR a IN {CollectionName} RETURN a";
        var cursor = await _context.Client.Cursor.PostCursorAsync<AssetDocument>(query);
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Adds a new asset to the database.
    /// </summary>
    /// <param name="asset">The asset to add.</param>
    /// <returns>The added asset with any database-generated values.</returns>
    /// <remarks>
    /// The asset's ID is used as the document key in ArangoDB.
    /// Timestamps are automatically managed by the database.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when asset is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document cannot be created due to validation or constraint violations.
    /// </exception>
    public async Task<Asset> AddAsync(Asset asset)
    {
        if (asset == null)
            throw new ArgumentNullException(nameof(asset));

        var doc = MapToDocument(asset);
        await _context.Client.Document.PostDocumentAsync(CollectionName, doc);
        return asset;
    }

    /// <summary>
    /// Updates an existing asset in the database.
    /// </summary>
    /// <param name="asset">The asset with updated values.</param>
    /// <returns>The updated asset.</returns>
    /// <remarks>
    /// Uses the asset's ID as the document key for the update operation.
    /// The UpdatedAt timestamp is automatically refreshed by the database.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when asset is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document doesn't exist or update fails due to validation errors.
    /// </exception>
    public async Task<Asset> UpdateAsync(Asset asset)
    {
        if (asset == null)
            throw new ArgumentNullException(nameof(asset));

        var doc = MapToDocument(asset);
        var key = AssetIdModule.toValue(asset.Id).ToString();
        await _context.Client.Document.PutDocumentAsync($"{CollectionName}/{key}", doc);
        return asset;
    }

    /// <summary>
    /// Deletes an asset from the database.
    /// </summary>
    /// <param name="id">The unique identifier of the asset to delete.</param>
    /// <returns>
    /// <see langword="true"/> if the asset was successfully deleted;
    /// <see langword="false"/> if the asset was not found or deletion failed.
    /// </returns>
    /// <remarks>
    /// This is a permanent operation. Consider using status updates
    /// for soft deletes when audit trails are required.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when id is null.</exception>
    public async Task<bool> DeleteAsync(AssetId id)
    {
        if (id == null)
            throw new ArgumentNullException(nameof(id));
        try
        {
            var key = AssetIdModule.toValue(id).ToString();
            await _context.Client.Document.DeleteDocumentAsync(CollectionName, key);
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Maps an ArangoDB document to the F# domain Asset type.
    /// </summary>
    /// <param name="doc">The database document to map.</param>
    /// <returns>The corresponding domain Asset instance.</returns>
    /// <remarks>
    /// Handles conversion between string representations and F# option types.
    /// Parses GUIDs and converts enum values from strings.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when doc is null.</exception>
    /// <exception cref="FormatException">
    /// Thrown when GUID parsing fails for invalid document keys.
    /// </exception>
    private Asset MapToDomain(AssetDocument doc) =>
        new(
            AssetIdModule.fromGuid(Guid.Parse(doc.Key)),
            ItemIdModule.fromGuid(Guid.Parse(doc.ItemId)),
            string.IsNullOrEmpty(doc.SerialNumber)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.SerialNumber),
            string.IsNullOrEmpty(doc.BatchCode)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.BatchCode),
            ParseAssetCondition(doc.Condition),
            ParseAssetStatus(doc.Status),
            string.IsNullOrEmpty(doc.LocationId)
                ? FSharpOption<LocationId>.None
                : FSharpOption<LocationId>.Some(
                    LocationIdModule.fromGuid(Guid.Parse(doc.LocationId))
                ),
            doc.Cost,
            doc.PurchaseDate,
            doc.WarrantyExpiry,
            string.IsNullOrEmpty(doc.Notes)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Notes),
            MapModule.OfSeq(
                (
                    doc.Metadata?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)
                    ?? new Dictionary<string, object>()
                ).Select(kvp => Tuple.Create(kvp.Key, kvp.Value))
            ),
            doc.CreatedAt,
            doc.UpdatedAt
        );

    /// <summary>
    /// Maps an F# domain Asset to an ArangoDB document.
    /// </summary>
    /// <param name="asset">The domain asset to map.</param>
    /// <returns>The corresponding database document.</returns>
    /// <remarks>
    /// Converts F# option types to nullable reference types.
    /// Transforms enum values to their string representations for storage.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when asset is null.</exception>
    private AssetDocument MapToDocument(Asset asset) =>
        new()
        {
            Key = AssetIdModule.toValue(asset.Id).ToString(),
            ItemId = ItemIdModule.toValue(asset.ItemId).ToString(),
            SerialNumber = FSharpOption<string>.get_IsSome(asset.SerialNumber)
                ? asset.SerialNumber.Value
                : null,
            BatchCode = FSharpOption<string>.get_IsSome(asset.BatchCode)
                ? asset.BatchCode.Value
                : null,
            Condition = asset.Condition switch
            {
                var c when c == AssetCondition.New => "New",
                var c when c == AssetCondition.Excellent => "Excellent",
                var c when c == AssetCondition.Good => "Good",
                var c when c == AssetCondition.Fair => "Fair",
                var c when c == AssetCondition.Poor => "Poor",
                var c when c == AssetCondition.Damaged => "Damaged",
                var c when c == AssetCondition.Unusable => "Unusable",
                _ => "Unknown",
            },
            Status = asset.Status switch
            {
                var s when s == AssetStatus.Available => "Available",
                var s when s == AssetStatus.InUse => "InUse",
                var s when s == AssetStatus.Reserved => "Reserved",
                var s when s == AssetStatus.InTransit => "InTransit",
                var s when s == AssetStatus.OutForRepair => "OutForRepair",
                var s when s == AssetStatus.Maintenance => "Maintenance",
                var s when s == AssetStatus.Damaged => "Damaged",
                var s when s == AssetStatus.Retired => "Retired",
                var s when s == AssetStatus.Lost => "Lost",
                var s when s == AssetStatus.Disposed => "Disposed",
                var s when s == AssetStatus.Unknown => "Unknown",
                _ => "Unknown",
            },
            LocationId = FSharpOption<LocationId>.get_IsSome(asset.LocationId)
                ? LocationIdModule.toValue(asset.LocationId.Value).ToString()
                : null,
            Cost = asset.Cost,
            PurchaseDate = FSharpOption<DateTime>.get_IsSome(asset.PurchaseDate)
                ? (DateTime?)asset.PurchaseDate.Value
                : null,
            WarrantyExpiry = FSharpOption<DateTime>.get_IsSome(asset.WarrantyExpiry)
                ? (DateTime?)asset.WarrantyExpiry.Value
                : null,
            Notes = FSharpOption<string>.get_IsSome(asset.Notes) ? asset.Notes.Value : null,
            Metadata = asset.Metadata?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
            CreatedAt = asset.CreatedAt,
            UpdatedAt = asset.UpdatedAt,
        };

    /// <summary>
    /// Parses a string representation of asset condition to the domain enum.
    /// </summary>
    /// <param name="s">The string to parse.</param>
    /// <returns>The corresponding <see cref="AssetCondition"/> value.</returns>
    /// <remarks>
    /// Defaults to <see cref="AssetCondition.Fair"/> for unknown values
    /// to maintain data integrity.
    /// </remarks>
    private static AssetCondition ParseAssetCondition(string s) =>
        s switch
        {
            "New" => AssetCondition.New,
            "Excellent" => AssetCondition.Excellent,
            "Good" => AssetCondition.Good,
            "Fair" => AssetCondition.Fair,
            "Poor" => AssetCondition.Poor,
            "Damaged" => AssetCondition.Damaged,
            "Unusable" => AssetCondition.Unusable,
            _ => AssetCondition.Fair,
        };

    /// <summary>
    /// Parses a string representation of asset status to the domain enum.
    /// </summary>
    /// <param name="s">The string to parse.</param>
    /// <returns>The corresponding <see cref="AssetStatus"/> value.</returns>
    /// <remarks>
    /// Defaults to <see cref="AssetStatus.Unknown"/> for unknown values
    /// to handle data migration scenarios gracefully.
    /// </remarks>
    private static AssetStatus ParseAssetStatus(string s) =>
        s switch
        {
            "Available" => AssetStatus.Available,
            "InUse" => AssetStatus.InUse,
            "Reserved" => AssetStatus.Reserved,
            "InTransit" => AssetStatus.InTransit,
            "OutForRepair" => AssetStatus.OutForRepair,
            "Retired" => AssetStatus.Retired,
            "Lost" => AssetStatus.Lost,
            "Disposed" => AssetStatus.Disposed,
            _ => AssetStatus.Unknown,
        };
}

/// <summary>
/// ArangoDB document representation of an Asset entity.
/// Used for persistence and database operations.
/// </summary>
/// <remarks>
/// This class serves as the data transfer object between the application
/// and ArangoDB. It uses string representations for enum values and
/// nullable types for optional fields to match JSON serialization requirements.
/// </remarks>
public class AssetDocument
{
    /// <summary>
    /// Gets or sets the document key (used as the primary identifier in ArangoDB).
    /// Corresponds to the Asset's ID.
    /// </summary>
    public string Key { get; set; } = "";

    /// <summary>
    /// Gets or sets the reference to the Item this asset represents.
    /// Links to the Item catalog entry.
    /// </summary>
    public string ItemId { get; set; } = "";

    /// <summary>
    /// Gets or sets the unique serial number for this specific asset instance.
    /// Optional field used for precise identification and warranty tracking.
    /// </summary>
    public string? SerialNumber { get; set; }

    /// <summary>
    /// Gets or sets the batch code for grouped assets.
    /// Used for tracking assets purchased or manufactured together.
    /// </summary>
    public string? BatchCode { get; set; }

    /// <summary>
    /// Gets or sets the physical condition of the asset.
    /// Stored as string for JSON compatibility.
    /// Default value is "Good".
    /// </summary>
    public string Condition { get; set; } = "Good";

    /// <summary>
    /// Gets or sets the current status of the asset.
    /// Stored as string for JSON compatibility.
    /// Default value is "Available".
    /// </summary>
    public string Status { get; set; } = "Available";

    /// <summary>
    /// Gets or sets the current location of the asset.
    /// Optional field that can be null for assets not assigned to a location.
    /// </summary>
    public string? LocationId { get; set; }

    /// <summary>
    /// Gets or sets the monetary cost of the asset.
    /// Used for financial tracking and valuation.
    /// </summary>
    public decimal Cost { get; set; }

    /// <summary>
    /// Gets or sets the purchase date of the asset.
    /// Optional field for financial and warranty tracking.
    /// </summary>
    public DateTime? PurchaseDate { get; set; }

    /// <summary>
    /// Gets or sets the warranty expiration date.
    /// Optional field for maintenance planning and support tracking.
    /// </summary>
    public DateTime? WarrantyExpiry { get; set; }

    /// <summary>
    /// Gets or sets additional notes about the asset.
    /// Optional field for free-form information storage.
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Gets or sets flexible metadata for the asset.
    /// Allows storage of additional properties not covered by the schema.
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }

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
