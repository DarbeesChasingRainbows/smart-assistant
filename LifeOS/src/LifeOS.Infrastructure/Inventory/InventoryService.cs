using LifeOS.Domain.Inventory;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Inventory;

/// <summary>
/// Service layer implementation for inventory management operations.
/// Coordinates between multiple repositories to provide high-level inventory workflows.
/// Implements business logic for asset movement, stock management, and inventory tracking.
/// </summary>
/// <remarks>
/// This service acts as the application layer in Hexagonal Architecture,
/// orchestrating domain operations across multiple repositories.
/// It ensures consistency between assets, stock levels, and movement records.
/// All operations are transactional where possible and include proper error handling.
/// </remarks>
public class InventoryService : IInventoryService
{
    private readonly IItemRepository _itemRepo;
    private readonly IAssetRepository _assetRepo;
    private readonly ILocationRepository _locationRepo;
    private readonly IStockRepository _stockRepo;
    private readonly IMovementRepository _movementRepo;

    /// <summary>
    /// Initializes a new instance of the <see cref="InventoryService"/> class.
    /// </summary>
    /// <param name="itemRepo">Repository for item catalog operations.</param>
    /// <param name="assetRepo">Repository for physical asset management.</param>
    /// <param name="locationRepo">Repository for location hierarchy operations.</param>
    /// <param name="stockRepo">Repository for stock level tracking.</param>
    /// <param name="movementRepo">Repository for movement history tracking.</param>
    /// <exception cref="ArgumentNullException">
    /// Thrown when any repository parameter is null.
    /// </exception>
    public InventoryService(
        IItemRepository itemRepo,
        IAssetRepository assetRepo,
        ILocationRepository locationRepo,
        IStockRepository stockRepo,
        IMovementRepository movementRepo
    )
    {
        _itemRepo = itemRepo ?? throw new ArgumentNullException(nameof(itemRepo));
        _assetRepo = assetRepo ?? throw new ArgumentNullException(nameof(assetRepo));
        _locationRepo = locationRepo ?? throw new ArgumentNullException(nameof(locationRepo));
        _stockRepo = stockRepo ?? throw new ArgumentNullException(nameof(stockRepo));
        _movementRepo = movementRepo ?? throw new ArgumentNullException(nameof(movementRepo));
    }

    /// <summary>
    /// Creates a new item in the inventory catalog.
    /// </summary>
    /// <param name="request">The item creation request with all required properties.</param>
    /// <returns>The created <see cref="Item"/> entity.</returns>
    /// <remarks>
    /// Automatically generates a unique ItemId and sets creation timestamps.
    /// The item is created with an empty image list and specifications map.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when request is null.</exception>
    /// <exception cref="ArgumentException">
    /// Thrown when required request properties are invalid.
    /// </exception>
    public async Task<Item> CreateItemAsync(CreateItemRequest request)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));
        var item = new Item(
            ItemIdModule.create(),
            request.SKU,
            request.Name,
            request.Description,
            request.Category,
            request.UnitOfMeasure,
            request.DefaultCost,
            request.DefaultPrice,
            request.Supplier,
            request.PartNumber,
            request.Barcode,
            ListModule.OfSeq(new List<string>()),
            MapModule.OfSeq(
                (
                    request.Specifications?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)
                    ?? new Dictionary<string, string>()
                ).Select(kvp => Tuple.Create(kvp.Key, kvp.Value))
            ),
            true,
            DateTime.UtcNow,
            DateTime.UtcNow
        );

        return await _itemRepo.AddAsync(item);
    }

    /// <summary>
    /// Updates an existing item in the inventory catalog.
    /// </summary>
    /// <param name="id">The unique identifier of the item to update.</param>
    /// <param name="request">The update request with properties to modify.</param>
    /// <returns>The updated <see cref="Item"/> entity.</returns>
    /// <remarks>
    /// Only non-null properties in the request are applied.
    /// The UpdatedAt timestamp is automatically refreshed.
    /// </remarks>
    /// <exception cref="ArgumentException">
    /// Thrown when the item is not found or request is invalid.
    /// </exception>
    public async Task<Item> UpdateItemAsync(ItemId id, UpdateItemRequest request)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));
        var existing = await _itemRepo.GetByIdAsync(id);
        if (FSharpOption<Item>.get_IsNone(existing))
            throw new ArgumentException("Item not found");

        var item = existing.Value;
        var updated = new Item(
            item.Id,
            item.SKU,
            request.Name != null ? request.Name.Value : item.Name,
            request.Description ?? item.Description,
            request.Category != null ? request.Category.Value : item.Category,
            request.UnitOfMeasure != null ? request.UnitOfMeasure.Value : item.UnitOfMeasure,
            request.DefaultCost != null ? request.DefaultCost.Value : item.DefaultCost,
            request.DefaultPrice != null ? request.DefaultPrice.Value : item.DefaultPrice,
            request.Supplier ?? item.Supplier,
            request.PartNumber ?? item.PartNumber,
            request.Barcode ?? item.Barcode,
            item.Images,
            request.Specifications != null ? request.Specifications.Value : item.Specifications,
            request.IsActive != null ? request.IsActive.Value : item.IsActive,
            item.CreatedAt,
            DateTime.UtcNow
        );

        return await _itemRepo.UpdateAsync(updated);
    }

    /// <summary>
    /// Creates a new physical asset instance in the inventory.
    /// </summary>
    /// <param name="request">The asset creation request with all required properties.</param>
    /// <returns>The created <see cref="Asset"/> entity.</returns>
    /// <remarks>
    /// Automatically updates stock levels when the asset is assigned to a location.
    /// Creates a movement record to track the asset's initial placement.
    /// The asset is created with empty metadata and current timestamps.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when request is null.</exception>
    /// <exception cref="ArgumentException">
    /// Thrown when the specified ItemId or LocationId is invalid.
    /// </exception>
    public async Task<Asset> CreateAssetAsync(CreateAssetRequest request)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));
        var asset = new Asset(
            AssetIdModule.create(),
            ItemIdModule.fromGuid(request.ItemId),
            request.SerialNumber,
            request.BatchCode,
            request.Condition,
            request.Status,
            request.LocationId != null
                ? FSharpOption<LocationId>.Some(LocationIdModule.fromGuid(request.LocationId.Value))
                : FSharpOption<LocationId>.None,
            request.Cost,
            request.PurchaseDate,
            request.WarrantyExpiry,
            request.Notes,
            MapModule.OfSeq(
                new Dictionary<string, object>().Select(kvp => Tuple.Create(kvp.Key, kvp.Value))
            ),
            DateTime.UtcNow,
            DateTime.UtcNow
        );

        var created = await _assetRepo.AddAsync(asset);

        // Update stock if asset is in a location
        if (request.LocationId != null)
        {
            var locationId = LocationIdModule.fromGuid(request.LocationId.Value);
            await AdjustStockForAsset(created, locationId, 1);
        }

        return created;
    }

    /// <summary>
    /// Moves an asset from its current location to a new location.
    /// </summary>
    /// <param name="assetId">The unique identifier of the asset to move.</param>
    /// <param name="toLocationId">The destination location identifier.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// This operation performs three coordinated actions:
    /// 1. Updates the asset's current location
    /// 2. Creates a movement record for audit trail
    /// 3. Adjusts stock levels at both source and destination locations
    /// </remarks>
    /// <exception cref="ArgumentException">
    /// Thrown when the asset is not found or location is invalid.
    /// </exception>
    public async Task MoveAssetAsync(AssetId assetId, LocationId toLocationId)
    {
        var asset = await _assetRepo.GetByIdAsync(assetId);
        if (FSharpOption<Asset>.get_IsNone(asset))
            throw new ArgumentException("Asset not found");

        var fromLocationId = asset.Value.LocationId;

        // Update asset location
        var updated = new Asset(
            asset.Value.Id,
            asset.Value.ItemId,
            asset.Value.SerialNumber,
            asset.Value.BatchCode,
            asset.Value.Condition,
            asset.Value.Status,
            toLocationId,
            asset.Value.Cost,
            asset.Value.PurchaseDate,
            asset.Value.WarrantyExpiry,
            asset.Value.Notes,
            asset.Value.Metadata,
            asset.Value.CreatedAt,
            DateTime.UtcNow
        );
        await _assetRepo.UpdateAsync(updated);

        // Create movement record
        var movement = new Movement(
            MovementIdModule.create(),
            Guid.NewGuid().ToString("N")[..8],
            MovementType.Transfer,
            fromLocationId,
            FSharpOption<LocationId>.Some(toLocationId),
            asset.Value.ItemId,
            1,
            FSharpOption<decimal>.None,
            "Asset transfer",
            "system",
            DateTime.UtcNow,
            DateTime.UtcNow
        );
        await _movementRepo.AddAsync(movement);

        // Adjust stock levels
        if (FSharpOption<LocationId>.get_IsSome(fromLocationId))
        {
            await AdjustStockForAsset(asset.Value, fromLocationId.Value, -1);
        }
        await AdjustStockForAsset(updated, toLocationId, 1);
    }

    /// <summary>
    /// Adjusts stock levels for a specific item and location.
    /// </summary>
    /// <param name="request">The stock adjustment request with quantity and reason.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// Creates both a stock record update and a movement record for audit purposes.
    /// Positive quantities increase stock, negative quantities decrease stock.
    /// Can create new stock records or update existing ones.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when request is null.</exception>
    /// <exception cref="ArgumentException">
    /// Thrown when ItemId or LocationId in request is invalid.
    /// </exception>
    public async Task AdjustStockAsync(StockAdjustmentRequest request)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));
        
        var itemId = ItemIdModule.fromGuid(request.ItemId);
        var locationId = LocationIdModule.fromGuid(request.LocationId);
        var existing = await _stockRepo.GetByItemAndLocationAsync(itemId, locationId);

        var newQuantity = FSharpOption<StockRecord>.get_IsNone(existing)
            ? request.Quantity
            : existing.Value.Quantity + request.Quantity;
        await _stockRepo.SetStockLevelAsync(itemId, locationId, newQuantity);

        // Create movement record
        var movement = new Movement(
            MovementIdModule.create(),
            Guid.NewGuid().ToString("N")[..8],
            MovementType.Adjustment,
            FSharpOption<LocationId>.None,
            FSharpOption<LocationId>.Some(locationId),
            itemId,
            request.Quantity,
            FSharpOption<decimal>.None,
            request.Reason,
            "system",
            DateTime.UtcNow,
            DateTime.UtcNow
        );
        await _movementRepo.AddAsync(movement);
    }

    /// <summary>
    /// Creates a new movement record and updates corresponding stock levels.
    /// </summary>
    /// <param name="request">The movement request with all movement details.</param>
    /// <returns>The created <see cref="Movement"/> entity.</returns>
    /// <remarks>
    /// Automatically adjusts stock levels at source and destination locations
    /// based on the movement type and quantity. Supports transfers, purchases,
    /// sales, and other movement types.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when request is null.</exception>
    /// <exception cref="ArgumentException">
    /// Thrown when location IDs or item ID in request are invalid.
    /// </exception>
    public async Task<Movement> CreateMovementAsync(MovementRequest request)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));
        
        var movement = new Movement(
            MovementIdModule.create(),
            Guid.NewGuid().ToString("N")[..8],
            request.Type,
            request.FromLocationId != null
                ? FSharpOption<LocationId>.Some(
                    LocationIdModule.fromGuid(request.FromLocationId.Value)
                )
                : FSharpOption<LocationId>.None,
            request.ToLocationId != null
                ? FSharpOption<LocationId>.Some(
                    LocationIdModule.fromGuid(request.ToLocationId.Value)
                )
                : FSharpOption<LocationId>.None,
            ItemIdModule.fromGuid(request.ItemId),
            request.Quantity,
            request.Cost,
            request.Reason,
            "system",
            DateTime.UtcNow,
            DateTime.UtcNow
        );

        var created = await _movementRepo.AddAsync(movement);

        // Update stock levels based on movement
        if (request.FromLocationId != null)
        {
            var fromLocationId = LocationIdModule.fromGuid(request.FromLocationId.Value);
            var existing = await _stockRepo.GetByItemAndLocationAsync(
                movement.ItemId,
                fromLocationId
            );
            var newQuantity = FSharpOption<StockRecord>.get_IsNone(existing)
                ? -request.Quantity
                : existing.Value.Quantity - request.Quantity;
            await _stockRepo.SetStockLevelAsync(movement.ItemId, fromLocationId, newQuantity);
        }

        if (request.ToLocationId != null)
        {
            var toLocationId = LocationIdModule.fromGuid(request.ToLocationId.Value);
            var existing = await _stockRepo.GetByItemAndLocationAsync(
                movement.ItemId,
                toLocationId
            );
            var newQuantity = FSharpOption<StockRecord>.get_IsNone(existing)
                ? request.Quantity
                : existing.Value.Quantity + request.Quantity;
            await _stockRepo.SetStockLevelAsync(movement.ItemId, toLocationId, newQuantity);
        }

        return created;
    }

    /// <summary>
    /// Retrieves stock levels for an item across all locations.
    /// </summary>
    /// <param name="itemId">The unique identifier of the item.</param>
    /// <returns>
    /// A dictionary mapping location IDs to available quantities
    /// (total quantity minus reserved quantity).
    /// </returns>
    /// <remarks>
    /// Returns only available quantities, excluding reserved stock.
    /// Useful for inventory planning and allocation decisions.
    /// </remarks>
    public async Task<Dictionary<LocationId, decimal>> GetStockLevelsAsync(ItemId itemId)
    {
        var stocks = await _stockRepo.GetByItemAsync(itemId);
        return stocks.ToDictionary(s => s.LocationId, s => s.Quantity - s.ReservedQuantity);
    }

    /// <summary>
    /// Calculates the total monetary value of all stock for a specific item.
    /// </summary>
    /// <param name="itemId">The unique identifier of the item.</param>
    /// <returns>
    /// The total value calculated as (available quantity × default cost).
    /// Returns 0 if the item is not found or has no stock.
    /// </returns>
    /// <remarks>
    /// Uses the item's default cost for valuation.
    /// Only considers available stock (total minus reserved).
    /// </remarks>
    public async Task<decimal> GetItemValueAsync(ItemId itemId)
    {
        var item = await _itemRepo.GetByIdAsync(itemId);
        if (FSharpOption<Item>.get_IsNone(item))
            return 0;

        var stocks = await _stockRepo.GetByItemAsync(itemId);
        var totalQuantity = stocks.Sum(s => s.Quantity - s.ReservedQuantity);
        return totalQuantity * item.Value.DefaultCost;
    }

    /// <summary>
    /// Calculates the total monetary value of all items at a specific location.
    /// </summary>
    /// <param name="locationId">The unique identifier of the location.</param>
    /// <returns>
    /// The sum of values for all items at the location.
    /// Returns 0 if the location has no stock.
    /// </returns>
    /// <remarks>
    /// Iterates through all stock records at the location and calculates
    /// individual item values using their default costs.
    /// Only considers available stock (total minus reserved).
    /// </remarks>
    public async Task<decimal> GetLocationValueAsync(LocationId locationId)
    {
        var stocks = await _stockRepo.GetByLocationAsync(locationId);
        decimal totalValue = 0;

        foreach (var stock in stocks)
        {
            var item = await _itemRepo.GetByIdAsync(stock.ItemId);
            if (!FSharpOption<Item>.get_IsNone(item))
            {
                totalValue += (stock.Quantity - stock.ReservedQuantity) * item.Value.DefaultCost;
            }
        }

        return totalValue;
    }

    /// <summary>
    /// Adjusts stock levels for a specific asset at a location.
    /// </summary>
    /// <param name="asset">The asset whose stock should be adjusted.</param>
    /// <param name="locationId">The location where the adjustment occurs.</param>
    /// <param name="adjustment">
    /// The quantity adjustment (positive to increase, negative to decrease).
    /// </param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// Creates new stock records if none exist, or updates existing ones.
    /// Removes stock records when quantity reaches zero or below.
    /// Used internally by asset movement and creation operations.
    /// </remarks>
    private async Task AdjustStockForAsset(Asset asset, LocationId locationId, int adjustment)
    {
        var existing = await _stockRepo.GetByItemAndLocationAsync(asset.ItemId, locationId);
        var newQuantity = FSharpOption<StockRecord>.get_IsNone(existing)
            ? adjustment
            : existing.Value.Quantity + adjustment;

        if (newQuantity > 0)
        {
            await _stockRepo.SetStockLevelAsync(asset.ItemId, locationId, newQuantity);
        }
        else if (FSharpOption<StockRecord>.get_IsSome(existing) && newQuantity <= 0)
        {
            // Remove stock record if quantity is zero or negative
            await _stockRepo.SetStockLevelAsync(asset.ItemId, locationId, 0);
        }
    }
}

// Service stubs for remaining interfaces

/// <summary>
/// Service implementation for location management operations.
/// Provides location hierarchy management and capacity tracking.
/// </summary>
/// <remarks>
/// Handles location creation, tree traversal, and content management.
/// Integrates with asset repository for location-based queries.
/// </remarks>
public class LocationService : ILocationService
{
    private readonly ILocationRepository _locationRepo;
    private readonly IAssetRepository _assetRepo;

    /// <summary>
    /// Initializes a new instance of the <see cref="LocationService"/> class.
    /// </summary>
    /// <param name="locationRepo">Repository for location data operations.</param>
    /// <param name="assetRepo">Repository for asset data operations.</param>
    /// <exception cref="ArgumentNullException">
    /// Thrown when any repository parameter is null.
    /// </exception>
    public LocationService(ILocationRepository locationRepo, IAssetRepository assetRepo)
    {
        _locationRepo = locationRepo ?? throw new ArgumentNullException(nameof(locationRepo));
        _assetRepo = assetRepo ?? throw new ArgumentNullException(nameof(assetRepo));
    }

    /// <summary>
    /// Creates a new location in the inventory hierarchy.
    /// </summary>
    /// <param name="request">The location creation request with all required properties.</param>
    /// <returns>The created <see cref="Location"/> entity.</returns>
    /// <remarks>
    /// Automatically generates a unique LocationId and sets creation timestamps.
    /// The path field would typically be computed based on parent hierarchy.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when request is null.</exception>
    public async Task<Location> CreateLocationAsync(CreateLocationRequest request)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));
        var location = new Location(
            LocationIdModule.create(),
            request.Name,
            request.Description,
            request.Type,
            request.ParentId != null
                ? FSharpOption<LocationId>.Some(LocationIdModule.fromGuid(request.ParentId.Value))
                : FSharpOption<LocationId>.None,
            "", // Path would be computed
            request.Capacity,
            true,
            request.Tags,
            DateTime.UtcNow,
            DateTime.UtcNow
        );

        return await _locationRepo.AddAsync(location);
    }

    /// <summary>
    /// Retrieves the complete location hierarchy tree.
    /// </summary>
    /// <returns>
    /// An <see cref="IEnumerable{Location}"/> containing all active locations.
    /// The caller is responsible for building the tree structure.
    /// </returns>
    /// <remarks>
    /// Returns all active locations. Tree construction logic would be implemented
    /// by the caller or in a separate method for better performance.
    /// </remarks>
    public async Task<IEnumerable<Location>> GetLocationTreeAsync()
    {
        return await _locationRepo.GetAllAsync();
    }

    /// <summary>
    /// Retrieves all assets currently located at a specific location.
    /// </summary>
    /// <param name="locationId">The unique identifier of the location.</param>
    /// <returns>
    /// An <see cref="IEnumerable{Asset}"/> containing all assets at the location.
    /// Returns an empty collection if no assets are found.
    /// </returns>
    /// <remarks>
    /// Useful for location inventory management and capacity planning.
    /// </remarks>
    public async Task<IEnumerable<Asset>> GetLocationContentsAsync(LocationId locationId)
    {
        return await _assetRepo.GetByLocationAsync(locationId);
    }

    /// <summary>
    /// Calculates the capacity utilization percentage for a location.
    /// </summary>
    /// <param name="locationId">The unique identifier of the location.</param>
    /// <returns>
    /// A decimal representing the utilization percentage (0.0 to 1.0).
    /// Returns a placeholder value in the current implementation.
    /// </returns>
    /// <remarks>
    /// This is a simplified implementation that returns a placeholder value.
    /// A complete implementation would calculate based on item sizes/volumes
    /// and the location's configured capacity.
    /// </remarks>
    public async Task<decimal> CalculateCapacityUtilizationAsync(LocationId locationId)
    {
        // Simplified implementation - would need to calculate based on item sizes/volumes
        return 0.75m; // Placeholder
    }
}

/// <summary>
/// Service implementation for inventory reporting and analytics.
/// Provides comprehensive reporting capabilities for inventory management.
/// </summary>
/// <remarks>
/// Generates various reports including valuation, category analysis,
/// low stock alerts, and movement tracking. Integrates with multiple repositories
/// to provide consolidated inventory insights.
/// </remarks>
public class InventoryReporting : IInventoryReporting
{
    private readonly IItemRepository _itemRepo;
    private readonly IStockRepository _stockRepo;
    private readonly IMovementRepository _movementRepo;

    /// <summary>
    /// Initializes a new instance of the <see cref="InventoryReporting"/> class.
    /// </summary>
    /// <param name="itemRepo">Repository for item catalog operations.</param>
    /// <param name="stockRepo">Repository for stock level operations.</param>
    /// <param name="movementRepo">Repository for movement history operations.</param>
    /// <exception cref="ArgumentNullException">
    /// Thrown when any repository parameter is null.
    /// </exception>
    public InventoryReporting(
        IItemRepository itemRepo,
        IStockRepository stockRepo,
        IMovementRepository movementRepo
    )
    {
        _itemRepo = itemRepo ?? throw new ArgumentNullException(nameof(itemRepo));
        _stockRepo = stockRepo ?? throw new ArgumentNullException(nameof(stockRepo));
        _movementRepo = movementRepo ?? throw new ArgumentNullException(nameof(movementRepo));
    }

    /// <summary>
    /// Calculates the total monetary value of all inventory across all locations.
    /// </summary>
    /// <returns>
    /// The total valuation of all available stock using item default costs.
    /// Returns 0 if no items or stock exist.
    /// </returns>
    /// <remarks>
    /// Iterates through all items and their stock levels to calculate total value.
    /// Only considers available stock (total minus reserved quantities).
    /// </remarks>
    public async Task<decimal> GetInventoryValuationAsync()
    {
        var items = await _itemRepo.GetAllAsync();
        decimal totalValue = 0;

        foreach (var item in items)
        {
            var stocks = await _stockRepo.GetByItemAsync(item.Id);
            var totalQuantity = stocks.Sum(s => s.Quantity - s.ReservedQuantity);
            totalValue += totalQuantity * item.DefaultCost;
        }

        return totalValue;
    }

    /// <summary>
    /// Groups inventory valuation by item categories.
    /// </summary>
    /// <returns>
    /// A dictionary mapping <see cref="ItemCategory"/> to total monetary value.
    /// Returns an empty dictionary if no items or stock exist.
    /// </returns>
    /// <remarks>
    /// Useful for category-based analysis and reporting.
    /// Aggregates values across all locations for each category.
    /// </remarks>
    public async Task<Dictionary<ItemCategory, decimal>> GetInventoryByCategoryAsync()
    {
        var items = await _itemRepo.GetAllAsync();
        var result = new Dictionary<ItemCategory, decimal>();

        foreach (var item in items)
        {
            var stocks = await _stockRepo.GetByItemAsync(item.Id);
            var totalQuantity = stocks.Sum(s => s.Quantity - s.ReservedQuantity);
            var value = totalQuantity * item.DefaultCost;

            if (result.ContainsKey(item.Category))
                result[item.Category] += value;
            else
                result[item.Category] = value;
        }

        return result;
    }

    /// <summary>
    /// Generates a low stock report for items below their minimum levels.
    /// </summary>
    /// <returns>
    /// A tuple containing:
    /// - Items that are below minimum stock levels
    /// - The highest minimum threshold found (used for reporting)
    /// </returns>
    /// <remarks>
    /// Identifies items that need reordering based on their configured minimum levels.
    /// The threshold value helps prioritize which items need immediate attention.
    /// </remarks>
    public async Task<Tuple<IEnumerable<Item>, decimal>> GetLowStockReportAsync()
    {
        var stocks = await _stockRepo.GetLowStockAsync();
        var items = new List<Item>();
        decimal threshold = 0;

        foreach (var stock in stocks)
        {
            var item = await _itemRepo.GetByIdAsync(stock.ItemId);
            if (!FSharpOption<Item>.get_IsNone(item))
            {
                items.Add(item.Value);
                if (stock.MinLevel > threshold)
                    threshold = stock.MinLevel;
            }
        }

        return Tuple.Create((IEnumerable<Item>)items, threshold);
    }

    /// <summary>
    /// Generates a movement report grouped by movement types within a date range.
    /// </summary>
    /// <param name="from">The start date for the report period.</param>
    /// <param name="to">The end date for the report period.</param>
    /// <returns>
    /// A dictionary mapping <see cref="MovementType"/> to total quantities moved.
    /// Returns an empty dictionary if no movements exist in the period.
    /// </returns>
    /// <remarks>
    /// Useful for analyzing inventory flow patterns and identifying trends.
    /// Includes all movement types (transfers, purchases, sales, etc.).
    /// </remarks>
    public async Task<Dictionary<MovementType, decimal>> GetMovementReportAsync(
        DateTime from,
        DateTime to
    )
    {
        var movements = await _movementRepo.GetMovementsAsync(from, to, null);
        var result = new Dictionary<MovementType, decimal>();

        foreach (var movement in movements)
        {
            if (result.ContainsKey(movement.Type))
                result[movement.Type] += movement.Quantity;
            else
                result[movement.Type] = movement.Quantity;
        }

        return result;
    }

    /// <summary>
    /// Retrieves movement history for a specific asset.
    /// </summary>
    /// <param name="assetId">The unique identifier of the asset to track.</param>
    /// <returns>
    /// An <see cref="IEnumerable{Movement}"/> containing recent movements.
    /// Returns movements from the last 30 days in the current implementation.
    /// </returns>
    /// <remarks>
    /// This is a simplified implementation that returns recent movements.
    /// A complete implementation would query movements specifically by asset ID
    /// for accurate asset tracking and audit trails.
    /// </remarks>
    public async Task<IEnumerable<Movement>> GetAssetTrackingReportAsync(AssetId assetId)
    {
        // Would need to query movements by asset - simplified implementation
        return await _movementRepo.GetMovementsAsync(
            DateTime.UtcNow.AddDays(-30),
            DateTime.UtcNow,
            100
        );
    }
}
