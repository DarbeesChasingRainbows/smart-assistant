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
/// Repository implementation for managing Location entities in ArangoDB.
/// Provides CRUD operations and specialized queries for location hierarchy management.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository handles the mapping between F# domain types and ArangoDB document storage.
/// It supports hierarchical location structures and path-based queries.
/// All operations are asynchronous for optimal performance.
/// </remarks>
public class LocationRepository : ILocationRepository
{
    private readonly ArangoDbContext _context;
    private const string CollectionName = ArangoDbContext.Collections.InventoryLocations;

    /// <summary>
    /// Initializes a new instance of the <see cref="LocationRepository"/> class.
    /// </summary>
    /// <param name="context">The ArangoDB database context for data operations.</param>
    /// <exception cref="ArgumentNullException">Thrown when context is null.</exception>
    public LocationRepository(ArangoDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <summary>
    /// Retrieves a location by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the location.</param>
    /// <returns>
    /// An <see cref="FSharpOption{Location}"/> containing the location if found,
    /// or <see cref="FSharpOption{Location}.None"/> if not found or an error occurs.
    /// </returns>
    /// <remarks>
    /// Uses ArangoDB's document key for efficient lookup.
    /// Handles database errors gracefully by returning None.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails, caught and handled internally.
    /// </exception>
    public async Task<FSharpOption<Location>> GetByIdAsync(LocationId id)
    {
        try
        {
            var guidId = LocationIdModule.toValue(id);
            var query = $"FOR l IN {CollectionName} FILTER l._key == @id RETURN l";
            var bindVars = new Dictionary<string, object> { { "id", guidId.ToString() } };
            var cursor = await _context.Client.Cursor.PostCursorAsync<LocationDocument>(
                query,
                bindVars
            );
            var doc = cursor.Result.FirstOrDefault();
            return doc == null
                ? FSharpOption<Location>.None
                : FSharpOption<Location>.Some(MapToDomain(doc));
        }
        catch (ArangoDBNetStandard.ApiErrorException)
        {
            return FSharpOption<Location>.None;
        }
    }

    /// <summary>
    /// Retrieves all child locations of a specific parent location.
    /// </summary>
    /// <param name="parentId">The unique identifier of the parent location.</param>
    /// <returns>
    /// An <see cref="IEnumerable{Location}"/> containing all child locations.
    /// Returns an empty collection if no children are found.
    /// </returns>
    /// <remarks>
    /// Essential for building location hierarchies and tree structures.
    /// Used for navigation and location browsing interfaces.
    /// </remarks>
    public async Task<IEnumerable<Location>> GetByParentAsync(LocationId parentId)
    {
        var parentIdStr = LocationIdModule.toValue(parentId).ToString();
        var query = $"FOR l IN {CollectionName} FILTER l.ParentId == @parentId RETURN l";
        var bindVars = new Dictionary<string, object> { { "parentId", parentIdStr } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<LocationDocument>(
            query,
            bindVars
        );
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves all locations of a specific type.
    /// </summary>
    /// <param name="type">The location type to filter by.</param>
    /// <returns>
    /// An <see cref="IEnumerable{Location}"/> containing all locations of the specified type.
    /// Returns an empty collection if no locations match the type.
    /// </returns>
    /// <remarks>
    /// Only returns active locations (IsActive = true).
    /// Useful for filtering by location categories (warehouses, shelves, etc.).
    /// </remarks>
    public async Task<IEnumerable<Location>> GetByTypeAsync(LocationType type)
    {
        var typeStr = type switch
        {
            var t when t == LocationType.Warehouse => "Warehouse",
            var t when t == LocationType.Garage => "Garage",
            var t when t == LocationType.Shed => "Shed",
            var t when t == LocationType.Vehicle => "Vehicle",
            var t when t == LocationType.Shelf => "Shelf",
            var t when t == LocationType.Cabinet => "Cabinet",
            var t when t == LocationType.Bin => "Bin",
            var t when t == LocationType.Room => "Room",
            var t when t == LocationType.Aisle => "Aisle",
            LocationType.Custom custom => custom.Item,
            _ => "Other",
        };

        var query =
            $"FOR l IN {CollectionName} FILTER l.Type == @type && l.IsActive == true RETURN l";
        var bindVars = new Dictionary<string, object> { { "type", typeStr } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<LocationDocument>(
            query,
            bindVars
        );
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves all root locations (locations with no parent).
    /// </summary>
    /// <returns>
    /// An <see cref="IEnumerable{Location}"/> containing all root locations.
    /// Returns an empty collection if no root locations exist.
    /// </returns>
    /// <remarks>
    /// Root locations are the top-level entries in the location hierarchy.
    /// Only returns active locations.
    /// </remarks>
    public async Task<IEnumerable<Location>> GetRootLocationsAsync()
    {
        var query =
            $"FOR l IN {CollectionName} FILTER l.ParentId == null && l.IsActive == true RETURN l";
        var cursor = await _context.Client.Cursor.PostCursorAsync<LocationDocument>(query);
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves the complete path from a location to the root.
    /// </summary>
    /// <param name="id">The unique identifier of the location.</param>
    /// <returns>
    /// An <see cref="IEnumerable{Location}"/> containing the path from root to the location.
    /// Returns an empty collection if the location is not found or has no path.
    /// </returns>
    /// <remarks>
    /// Builds the hierarchy by recursively following parent relationships.
    /// The path is ordered from root to the specified location.
    /// </remarks>
    public async Task<IEnumerable<Location>> GetPathAsync(LocationId id)
    {
        var locations = new List<Location>();
        var currentId = id;

        while (true)
        {
            var location = await GetByIdAsync(currentId);
            if (FSharpOption<Location>.get_IsNone(location))
                break;
            if (FSharpOption<LocationId>.get_IsNone(location.Value.ParentId))
                break;

            locations.Insert(0, location.Value);
            currentId = location.Value.ParentId.Value;
        }

        return locations;
    }

    /// <summary>
    /// Retrieves all active locations from the database.
    /// </summary>
    /// <returns>
    /// An <see cref="IEnumerable{Location}"/> containing all active locations.
    /// Returns an empty collection if no active locations exist.
    /// </returns>
    /// <remarks>
    /// Only returns locations where IsActive is true.
    /// Use with caution on large datasets.
    /// </remarks>
    public async Task<IEnumerable<Location>> GetAllAsync()
    {
        var query = $"FOR l IN {CollectionName} FILTER l.IsActive == true RETURN l";
        var cursor = await _context.Client.Cursor.PostCursorAsync<LocationDocument>(query);
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Adds a new location to the database.
    /// </summary>
    /// <param name="location">The location to add.</param>
    /// <returns>The added location with any database-generated values.</returns>
    /// <remarks>
    /// The location's ID is used as the document key in ArangoDB.
    /// Timestamps are automatically managed by the database.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when location is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document cannot be created due to validation or constraint violations.
    /// </exception>
    public async Task<Location> AddAsync(Location location)
    {
        if (location == null)
            throw new ArgumentNullException(nameof(location));
        var doc = MapToDocument(location);
        await _context.Client.Document.PostDocumentAsync(CollectionName, doc);
        return location;
    }

    /// <summary>
    /// Updates an existing location in the database.
    /// </summary>
    /// <param name="location">The location with updated values.</param>
    /// <returns>The updated location.</returns>
    /// <remarks>
    /// Uses the location's ID as the document key for the update operation.
    /// The UpdatedAt timestamp is automatically refreshed by the database.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when location is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document doesn't exist or update fails due to validation errors.
    /// </exception>
    public async Task<Location> UpdateAsync(Location location)
    {
        if (location == null)
            throw new ArgumentNullException(nameof(location));
        var doc = MapToDocument(location);
        var key = LocationIdModule.toValue(location.Id).ToString();
        await _context.Client.Document.PutDocumentAsync($"{CollectionName}/{key}", doc);
        return location;
    }

    /// <summary>
    /// Deletes a location from the database.
    /// </summary>
    /// <param name="id">The unique identifier of the location to delete.</param>
    /// <returns>
    /// <see langword="true"/> if the location was successfully deleted;
    /// <see langword="false"/> if the location was not found or deletion failed.
    /// </returns>
    /// <remarks>
    /// This is a permanent operation. Consider using IsActive flag
    /// for soft deletes when audit trails are required.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when id is null.</exception>
    public async Task<bool> DeleteAsync(LocationId id)
    {
        if (id == null)
            throw new ArgumentNullException(nameof(id));
        try
        {
            var key = LocationIdModule.toValue(id).ToString();
            await _context.Client.Document.DeleteDocumentAsync(CollectionName, key);
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Maps an ArangoDB document to the F# domain Location type.
    /// </summary>
    /// <param name="doc">The database document to map.</param>
    /// <returns>The corresponding domain Location instance.</returns>
    /// <remarks>
    /// Handles conversion between string representations and F# option types.
    /// Parses GUIDs and converts enum values from strings.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when doc is null.</exception>
    /// <exception cref="FormatException">
    /// Thrown when GUID parsing fails for invalid document keys.
    /// </exception>
    private Location MapToDomain(LocationDocument doc) =>
        new(
            LocationIdModule.fromGuid(Guid.Parse(doc.Key)),
            doc.Name,
            string.IsNullOrEmpty(doc.Description)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Description),
            ParseLocationType(doc.Type),
            string.IsNullOrEmpty(doc.ParentId)
                ? FSharpOption<LocationId>.None
                : FSharpOption<LocationId>.Some(
                    LocationIdModule.fromGuid(Guid.Parse(doc.ParentId))
                ),
            doc.Path,
            doc.Capacity,
            doc.IsActive,
            ListModule.OfSeq(doc.Tags ?? new List<string>()),
            doc.CreatedAt,
            doc.UpdatedAt
        );

    /// <summary>
    /// Maps an F# domain Location to an ArangoDB document.
    /// </summary>
    /// <param name="location">The domain location to map.</param>
    /// <returns>The corresponding database document.</returns>
    /// <remarks>
    /// Converts F# option types to nullable reference types.
    /// Transforms enum values to their string representations for storage.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when location is null.</exception>
    private LocationDocument MapToDocument(Location location) =>
        new()
        {
            Key = LocationIdModule.toValue(location.Id).ToString(),
            Name = location.Name,
            Description = FSharpOption<string>.get_IsSome(location.Description)
                ? location.Description.Value
                : null,
            Type = location.Type switch
            {
                var t when t == LocationType.Warehouse => "Warehouse",
                var t when t == LocationType.Store => "Store",
                var t when t == LocationType.Garage => "Garage",
                var t when t == LocationType.Shed => "Shed",
                var t when t == LocationType.Vehicle => "Vehicle",
                var t when t == LocationType.Shelf => "Shelf",
                var t when t == LocationType.Cabinet => "Cabinet",
                var t when t == LocationType.Bin => "Bin",
                var t when t == LocationType.Room => "Room",
                var t when t == LocationType.Aisle => "Aisle",
                var t when t == LocationType.Virtual => "Virtual",
                LocationType.Custom custom => custom.Item,
                _ => "Other",
            },
            ParentId = FSharpOption<LocationId>.get_IsSome(location.ParentId)
                ? LocationIdModule.toValue(location.ParentId.Value).ToString()
                : null,
            Path = location.Path,
            Capacity = FSharpOption<decimal>.get_IsSome(location.Capacity)
                ? (decimal?)location.Capacity.Value
                : null,
            IsActive = location.IsActive,
            Tags = location.Tags?.ToList() ?? new List<string>(),
            CreatedAt = location.CreatedAt,
            UpdatedAt = location.UpdatedAt,
        };

    /// <summary>
    /// Parses a string representation of location type to the domain enum.
    /// </summary>
    /// <param name="s">The string to parse.</param>
    /// <returns>The corresponding <see cref="LocationType"/> value.</returns>
    /// <remarks>
    /// Creates custom location types for unknown values to maintain data integrity.
    /// </remarks>
    private static LocationType ParseLocationType(string s) =>
        s switch
        {
            "Warehouse" => LocationType.Warehouse,
            "Garage" => LocationType.Garage,
            "Shed" => LocationType.Shed,
            "Vehicle" => LocationType.Vehicle,
            "Shelf" => LocationType.Shelf,
            "Cabinet" => LocationType.Cabinet,
            "Bin" => LocationType.Bin,
            "Room" => LocationType.Room,
            "Aisle" => LocationType.Aisle,
            _ => LocationType.NewCustom(s),
        };
}

/// <summary>
/// ArangoDB document representation of a Location entity.
/// Used for persistence and database operations.
/// </summary>
/// <remarks>
/// This class serves as the data transfer object between the application
/// and ArangoDB. It uses string representations for enum values and
/// nullable types for optional fields to match JSON serialization requirements.
/// </remarks>
public class LocationDocument
{
    /// <summary>
    /// Gets or sets the document key (used as the primary identifier in ArangoDB).
    /// Corresponds to the Location's ID.
    /// </summary>
    public string Key { get; set; } = "";

    /// <summary>
    /// Gets or sets the display name of the location.
    /// Used for user-facing identification and navigation.
    /// </summary>
    public string Name { get; set; } = "";

    /// <summary>
    /// Gets or sets the detailed description of the location.
    /// Optional field for additional location information.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the type classification of the location.
    /// Stored as string for JSON compatibility.
    /// Default value is "Other".
    /// </summary>
    public string Type { get; set; } = "Other";

    /// <summary>
    /// Gets or sets the parent location identifier.
    /// Optional field for building hierarchical structures.
    /// Null for root locations.
    /// </summary>
    public string? ParentId { get; set; }

    /// <summary>
    /// Gets or sets the hierarchical path of the location.
    /// Used for efficient tree navigation and display.
    /// </summary>
    public string Path { get; set; } = "";

    /// <summary>
    /// Gets or sets the capacity of the location.
    /// Optional field for capacity planning and utilization tracking.
    /// </summary>
    public decimal? Capacity { get; set; }

    /// <summary>
    /// Gets or sets whether the location is currently active.
    /// Used for soft deletes and location lifecycle management.
    /// Default value is true.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Gets or sets the collection of tags for the location.
    /// Optional field for categorization and search.
    /// </summary>
    public List<string>? Tags { get; set; }

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
