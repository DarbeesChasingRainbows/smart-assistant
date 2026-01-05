using ArangoDBNetStandard.CursorApi.Models;
using LifeOS.Domain.Common;
using LifeOS.Domain.Garage;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Garage;

/// <summary>
/// ArangoDB implementation of component repository for garage management.
/// Provides CRUD operations and specialized queries for component tracking.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository handles the mapping between F# domain types and ArangoDB document storage.
/// It supports component lifecycle management including location tracking and warranty monitoring.
/// All operations are asynchronous for optimal performance.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="ComponentRepository"/> class.
/// </remarks>
/// <param name="context">The ArangoDB database context for data operations.</param>
/// <exception cref="ArgumentNullException">Thrown when context is null.</exception>
public class ComponentRepository(ArangoDbContext context) : IComponentRepository
{
    private readonly ArangoDbContext _context =
        context ?? throw new ArgumentNullException(nameof(context));
    private const string CollectionName = ArangoDbContext.Collections.Components;

    /// <summary>
    /// Retrieves a component by its unique identifier.
    /// </summary>
    /// <param name="componentId">The unique identifier of the component.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{Component}"/> with the component if found,
    /// or <see cref="FSharpOption{Component}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Uses ArangoDB's document key for efficient lookup.
    /// Returns None for missing components without throwing exceptions.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpOption<Component>> GetByIdAsync(ComponentId componentId)
    {
        var id = Id.componentIdValue(componentId).ToString();
        var query = $"FOR c IN {CollectionName} FILTER c.Key == @id RETURN c";
        var bindVars = new Dictionary<string, object> { { "id", id } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<ComponentDocument>(
            query,
            bindVars
        );
        var doc = cursor.Result.FirstOrDefault();
        var component = ComponentMapper.ToDomain(doc);

        return component != null
            ? FSharpOption<Component>.Some(component)
            : FSharpOption<Component>.None;
    }

    /// <summary>
    /// Retrieves all components from the database.
    /// </summary>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{Component}"/> with all components.
    /// Returns an empty collection if no components exist.
    /// </returns>
    /// <remarks>
    /// Returns all components without filtering.
    /// Use with caution on large datasets as it loads all components into memory.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<IEnumerable<Component>> GetAllAsync()
    {
        var query = $"FOR c IN {CollectionName} RETURN c";
        var cursor = await _context.Client.Cursor.PostCursorAsync<ComponentDocument>(query);

        var components = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var component = ComponentMapper.ToDomain(doc);
            if (component != null)
                components.Add(component);
        }
        return components;
    }

    /// <summary>
    /// Adds a new component to the database.
    /// </summary>
    /// <param name="component">The component to add.</param>
    /// <returns>A task containing the added component.</returns>
    /// <remarks>
    /// Uses the component's ID as the document key in ArangoDB.
    /// Timestamps are automatically managed by the database.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when component is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document cannot be created due to validation or constraint violations.
    /// </exception>
    public async Task<Component> AddAsync(Component component)
    {
        ArgumentNullException.ThrowIfNull(component);

        var document = ComponentMapper.ToDocument(component);
        await _context.Client.Document.PostDocumentAsync(CollectionName, document);
        return component;
    }

    /// <summary>
    /// Updates an existing component in the database.
    /// </summary>
    /// <param name="component">The component with updated values.</param>
    /// <returns>A task containing the updated component.</returns>
    /// <remarks>
    /// Uses the component's ID as the document key for the update operation.
    /// The UpdatedAt timestamp is automatically refreshed by the database.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when component is null.</exception>
    /// <exception cref="InvalidOperationException">
    /// Thrown when the component is not found in the database.
    /// </exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document doesn't exist or update fails due to validation errors.
    /// </exception>
    public async Task<Component> UpdateAsync(Component component)
    {
        ArgumentNullException.ThrowIfNull(component);

        var document = ComponentMapper.ToDocument(component);
        var domainId = Id.componentIdValue(component.Id).ToString();

        var keyQuery = $"FOR c IN {CollectionName} FILTER c.Key == @id RETURN c._key";
        var keyBindVars = new Dictionary<string, object> { { "id", domainId } };
        var keyCursor = await _context.Client.Cursor.PostCursorAsync<string>(keyQuery, keyBindVars);
        var arangoKey = keyCursor.Result.FirstOrDefault();

        if (string.IsNullOrWhiteSpace(arangoKey))
            throw new InvalidOperationException("Component not found");

        await _context.Client.Document.PutDocumentAsync(CollectionName, arangoKey, document);
        return component;
    }

    /// <summary>
    /// Deletes a component from the database.
    /// </summary>
    /// <param name="componentId">The unique identifier of the component to delete.</param>
    /// <returns>
    /// A task containing <see langword="true"/> if the component was successfully deleted;
    /// <see langword="false"/> if the component was not found or deletion failed.
    /// </returns>
    /// <remarks>
    /// This is a permanent operation. Consider using status changes
    /// for soft deletion when audit trails are required.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when componentId is null.</exception>
    public async Task<bool> DeleteAsync(ComponentId componentId)
    {
        ArgumentNullException.ThrowIfNull(componentId);

        try
        {
            var domainId = Id.componentIdValue(componentId).ToString();

            var keyQuery = $"FOR c IN {CollectionName} FILTER c.Key == @id RETURN c._key";
            var keyBindVars = new Dictionary<string, object> { { "id", domainId } };
            var keyCursor = await _context.Client.Cursor.PostCursorAsync<string>(
                keyQuery,
                keyBindVars
            );
            var arangoKey = keyCursor.Result.FirstOrDefault();

            if (string.IsNullOrWhiteSpace(arangoKey))
                return false;

            await _context.Client.Document.DeleteDocumentAsync(CollectionName, arangoKey);
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Retrieves all components installed on a specific vehicle.
    /// </summary>
    /// <param name="vehicleId">The unique identifier of the vehicle.</param>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{Component}"/> with matching components.
    /// Returns an empty collection if no components are installed on the vehicle.
    /// </returns>
    /// <remarks>
    /// Filters components by location type "InstalledOn" and vehicle ID.
    /// Essential for vehicle-specific component management and tracking.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when vehicleId is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<IEnumerable<Component>> GetByVehicleIdAsync(VehicleId vehicleId)
    {
        ArgumentNullException.ThrowIfNull(vehicleId);

        var id = Id.vehicleIdValue(vehicleId).ToString();
        var query =
            $"FOR c IN {CollectionName} FILTER c.Location.Type == 'InstalledOn' AND c.Location.VehicleId == @vehicleId RETURN c";
        var bindVars = new Dictionary<string, object> { { "vehicleId", id } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<ComponentDocument>(
            query,
            bindVars
        );

        var components = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var component = ComponentMapper.ToDomain(doc);
            if (component != null)
                components.Add(component);
        }
        return components;
    }

    /// <summary>
    /// Retrieves all components currently in storage (not installed on vehicles).
    /// </summary>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{Component}"/> with components in storage.
    /// Returns an empty collection if no components are in storage.
    /// </returns>
    /// <remarks>
    /// Filters components by location type "InStorage".
    /// Essential for inventory management and component availability tracking.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<IEnumerable<Component>> GetInStorageAsync()
    {
        var query = $"FOR c IN {CollectionName} FILTER c.Location.Type == 'InStorage' RETURN c";
        var cursor = await _context.Client.Cursor.PostCursorAsync<ComponentDocument>(query);

        var components = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var component = ComponentMapper.ToDomain(doc);
            if (component != null)
                components.Add(component);
        }
        return components;
    }

    /// <summary>
    /// Retrieves all components of a specific category.
    /// </summary>
    /// <param name="category">The component category to filter by.</param>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{Component}"/> with matching components.
    /// Returns an empty collection if no components match the category.
    /// </returns>
    /// <remarks>
    /// Essential for category-based component organization and reporting.
    /// Useful for inventory analysis by component type.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<IEnumerable<Component>> GetByCategoryAsync(ComponentCategory category)
    {
        var categoryValue = GarageInterop.ComponentCategoryToString(category);
        var query = $"FOR c IN {CollectionName} FILTER c.Category == @category RETURN c";
        var bindVars = new Dictionary<string, object> { { "category", categoryValue } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<ComponentDocument>(
            query,
            bindVars
        );

        var components = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var component = ComponentMapper.ToDomain(doc);
            if (component != null)
                components.Add(component);
        }
        return components;
    }

    /// <summary>
    /// Retrieves all components with a specific part number.
    /// </summary>
    /// <param name="partNumber">The part number to search for.</param>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{Component}"/> with matching components.
    /// Returns an empty collection if no components match the part number.
    /// </returns>
    /// <remarks>
    /// Performs exact match on part number field.
    /// Essential for component identification and cross-referencing.
    /// </remarks>
    /// <exception cref="ArgumentException">
    /// Thrown when partNumber is null or empty.
    /// </exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<IEnumerable<Component>> GetByPartNumberAsync(string partNumber)
    {
        if (string.IsNullOrWhiteSpace(partNumber))
            throw new ArgumentException("Part number cannot be null or empty.", nameof(partNumber));

        var query = $"FOR c IN {CollectionName} FILTER c.PartNumber == @partNumber RETURN c";
        var bindVars = new Dictionary<string, object> { { "partNumber", partNumber } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<ComponentDocument>(
            query,
            bindVars
        );

        var components = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var component = ComponentMapper.ToDomain(doc);
            if (component != null)
                components.Add(component);
        }
        return components;
    }

    /// <summary>
    /// Retrieves all components currently under warranty.
    /// </summary>
    /// <param name="currentDate">The current date for warranty comparison.</param>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{Component}"/> with components under warranty.
    /// Returns an empty collection if no components are under warranty.
    /// </returns>
    /// <remarks>
    /// Filters components where warranty expiration date is after current date.
    /// Essential for warranty management and cost planning.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<IEnumerable<Component>> GetUnderWarrantyAsync(
        global::System.DateTime currentDate
    )
    {
        var query =
            $"FOR c IN {CollectionName} FILTER c.WarrantyExpiration != null AND c.WarrantyExpiration > @currentDate RETURN c";
        var bindVars = new Dictionary<string, object> { { "currentDate", currentDate } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<ComponentDocument>(
            query,
            bindVars
        );

        var components = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var component = ComponentMapper.ToDomain(doc);
            if (component != null)
                components.Add(component);
        }
        return components;
    }

    /// <summary>
    /// Retrieves all components needing maintenance as of the current date.
    /// </summary>
    /// <param name="currentDate">The current date for maintenance comparison.</param>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{Component}"/> with components needing maintenance.
    /// Returns an empty collection if no components need maintenance.
    /// </returns>
    /// <remarks>
    /// Filters components where next maintenance date is on or before current date.
    /// Essential for preventive maintenance scheduling and safety management.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<IEnumerable<Component>> GetNeedingMaintenanceAsync(
        global::System.DateTime currentDate
    )
    {
        var query =
            $"FOR c IN {CollectionName} FILTER c.NextMaintenanceDate != null AND c.NextMaintenanceDate <= @currentDate RETURN c";
        var bindVars = new Dictionary<string, object> { { "currentDate", currentDate } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<ComponentDocument>(
            query,
            bindVars
        );

        var components = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var component = ComponentMapper.ToDomain(doc);
            if (component != null)
                components.Add(component);
        }
        return components;
    }

    /// <summary>
    /// Retrieves a paginated list of components with total count.
    /// </summary>
    /// <param name="page">The page number (1-based).</param>
    /// <param name="pageSize">The number of items per page.</param>
    /// <returns>
    /// A task containing a tuple with the component list and total count.
    /// </returns>
    /// <remarks>
    /// Uses LIMIT and OFFSET for efficient pagination.
    /// Returns total count for UI pagination controls.
    /// </remarks>
    /// <exception cref="ArgumentOutOfRangeException">
    /// Thrown when page is less than 1 or pageSize is less than 1.
    /// </exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<Tuple<IEnumerable<Component>, int>> GetPagedAsync(int page, int pageSize)
    {
        if (page < 1)
            throw new ArgumentOutOfRangeException(nameof(page), "Page must be greater than 0.");
        if (pageSize < 1)
            throw new ArgumentOutOfRangeException(
                nameof(pageSize),
                "Page size must be greater than 0."
            );

        var offset = (page - 1) * pageSize;

        var countQuery = $"RETURN LENGTH({CollectionName})";
        var countCursor = await _context.Client.Cursor.PostCursorAsync<int>(countQuery);
        var totalCount = countCursor.Result.FirstOrDefault();

        var query = $"FOR c IN {CollectionName} LIMIT @offset, @limit RETURN c";
        var bindVars = new Dictionary<string, object>
        {
            { "offset", offset },
            { "limit", pageSize },
        };

        var cursor = await _context.Client.Cursor.PostCursorAsync<ComponentDocument>(
            query,
            bindVars
        );

        var components = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var component = ComponentMapper.ToDomain(doc);
            if (component != null)
                components.Add(component);
        }

        return Tuple.Create<IEnumerable<Component>, int>(components, totalCount);
    }

    /// <summary>
    /// Searches components by name, part number, or category.
    /// </summary>
    /// <param name="searchTerm">The search term to match against component data.</param>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{Component}"/> with matching components.
    /// Returns an empty collection if no matches are found.
    /// </returns>
    /// <remarks>
    /// Performs case-insensitive search across name, part number, and category.
    /// Uses CONTAINS operator for partial matching flexibility.
    /// </remarks>
    /// <exception cref="ArgumentException">
    /// Thrown when searchTerm is null or empty.
    /// </exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<IEnumerable<Component>> SearchAsync(string searchTerm)
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
            throw new ArgumentException("Search term cannot be null or empty.", nameof(searchTerm));

        var query =
            $@"
            FOR c IN {CollectionName}
            FILTER CONTAINS(LOWER(c.Name), LOWER(@term))
                OR CONTAINS(LOWER(c.PartNumber), LOWER(@term))
                OR CONTAINS(LOWER(c.Category), LOWER(@term))
            RETURN c";

        var bindVars = new Dictionary<string, object> { { "term", searchTerm } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<ComponentDocument>(
            query,
            bindVars
        );

        var components = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var component = ComponentMapper.ToDomain(doc);
            if (component != null)
                components.Add(component);
        }
        return components;
    }
}
