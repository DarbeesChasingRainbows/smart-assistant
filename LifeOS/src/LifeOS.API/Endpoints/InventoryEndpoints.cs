using ArangoDBNetStandard.CursorApi.Models;
using LifeOS.API.DTOs;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.AspNetCore.Mvc;

namespace LifeOS.API.Endpoints;

public static class InventoryEndpoints
{
    private const string SkuCollection = ArangoDbContext.Collections.InventorySkus;
    private const string AssetCollection = ArangoDbContext.Collections.InventoryAssets;
    private const string LotCollection = ArangoDbContext.Collections.InventoryLots;
    private const string MovementCollection = ArangoDbContext.Collections.InventoryMovements;
    private const string LocationCollection = ArangoDbContext.Collections.InventoryLocations;
    private const string BinCollection = ArangoDbContext.Collections.InventoryBins;
    private const string StockLevelCollection = ArangoDbContext.Collections.InventoryStockLevels;
    private const string InstallationsCollection = ArangoDbContext.Collections.AssetInstallations;

    public static void MapInventoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/inventory")
            .WithTags("Inventory");

        var skus = group.MapGroup("/skus");
        skus.MapGet("/", GetSkus).WithName("GetInventorySkus");
        skus.MapGet("/{key}", GetSkuByKey).WithName("GetInventorySkuByKey");
        skus.MapPost("/", CreateSku).WithName("CreateInventorySku");

        var assets = group.MapGroup("/assets");
        assets.MapGet("/", GetAssets).WithName("GetInventoryAssets");
        assets.MapGet("/{id:guid}", GetAssetById).WithName("GetInventoryAssetById");
        assets.MapPost("/", CreateAsset).WithName("CreateInventoryAsset");
        assets.MapPut("/{id:guid}", UpdateAsset).WithName("UpdateInventoryAsset");
        assets.MapDelete("/{id:guid}", DeleteAsset).WithName("DeleteInventoryAsset");

        var lots = group.MapGroup("/lots");
        lots.MapGet("/", GetLots).WithName("GetInventoryLots");
        lots.MapGet("/{key}", GetLotByKey).WithName("GetInventoryLotByKey");
        lots.MapPost("/", CreateLot).WithName("CreateInventoryLot");
        lots.MapPut("/{key}", UpdateLot).WithName("UpdateInventoryLot");
        lots.MapDelete("/{key}", DeleteLot).WithName("DeleteInventoryLot");

        var movements = group.MapGroup("/movements");
        movements.MapGet("/", GetMovements).WithName("GetInventoryMovements");
        movements.MapPost("/", CreateMovement).WithName("CreateInventoryMovement");

        var locations = group.MapGroup("/locations");
        locations.MapGet("/", GetLocations).WithName("GetInventoryLocations");
        locations.MapPost("/", CreateLocation).WithName("CreateInventoryLocation");

        var bins = group.MapGroup("/bins");
        bins.MapGet("/", GetBins).WithName("GetInventoryBins");
        bins.MapPost("/", CreateBin).WithName("CreateInventoryBin");

        group.MapGet("/stock", GetStockLevels).WithName("GetInventoryStockLevels");

        var ops = group.MapGroup("/ops");
        ops.MapPost("/adjustments", CreateAdjustment).WithName("CreateInventoryAdjustment");
        ops.MapPost("/transfers", CreateTransfer).WithName("CreateInventoryTransfer");

        var history = group.MapGroup("/history");
        history.MapPost("/corrections", CorrectHistory).WithName("CorrectInventoryHistory");
    }

    private static async Task<IResult> GetLocations([FromServices] ArangoDbContext db)
    {
        var query = $"FOR l IN {LocationCollection} SORT l.name ASC RETURN l";
        var cursor = await db.Client.Cursor.PostCursorAsync<InventoryLocationDocument>(query);
        return Results.Ok(cursor.Result.Select(MapLocation));
    }

    private static async Task<IResult> CreateLocation(CreateInventoryLocationRequest request, [FromServices] ArangoDbContext db)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new ApiErrorResponse { Error = "Name is required" });

        var key = Normalize(request.Name);

        var query = $@"
UPSERT {{ _key: @key }}
INSERT {{ _key: @key, name: @name, isActive: true, createdAt: @now, updatedAt: @now }}
UPDATE {{ name: @name, updatedAt: @now }} IN {LocationCollection}
RETURN NEW";

        var bindVars = new Dictionary<string, object>
        {
            { "key", key },
            { "name", request.Name.Trim() },
            { "now", DateTime.UtcNow },
        };

        var cursor = await db.Client.Cursor.PostCursorAsync<InventoryLocationDocument>(query, bindVars);
        var created = cursor.Result.FirstOrDefault();
        return created == null
            ? Results.BadRequest(new ApiErrorResponse { Error = "Failed to create location" })
            : Results.Created($"/api/v1/inventory/locations/{created.Key}", MapLocation(created));
    }

    private static async Task<IResult> GetBins([FromServices] ArangoDbContext db, string? locationKey)
    {
        var query = string.IsNullOrWhiteSpace(locationKey)
            ? $"FOR b IN {BinCollection} SORT b.locationKey ASC, b.name ASC RETURN b"
            : $"FOR b IN {BinCollection} FILTER b.locationKey == @locationKey SORT b.name ASC RETURN b";

        var bindVars = string.IsNullOrWhiteSpace(locationKey)
            ? null
            : new Dictionary<string, object> { { "locationKey", locationKey! } };

        var cursor = await db.Client.Cursor.PostCursorAsync<InventoryBinDocument>(query, bindVars);
        return Results.Ok(cursor.Result.Select(MapBin));
    }

    private static async Task<IResult> CreateBin(CreateInventoryBinRequest request, [FromServices] ArangoDbContext db)
    {
        if (string.IsNullOrWhiteSpace(request.LocationKey))
            return Results.BadRequest(new ApiErrorResponse { Error = "LocationKey is required" });
        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new ApiErrorResponse { Error = "Name is required" });

        var key = $"{request.LocationKey}:{Normalize(request.Name)}";

        var query = $@"
UPSERT {{ _key: @key }}
INSERT {{ _key: @key, locationKey: @locationKey, name: @name, isActive: true, createdAt: @now, updatedAt: @now }}
UPDATE {{ name: @name, updatedAt: @now }} IN {BinCollection}
RETURN NEW";

        var bindVars = new Dictionary<string, object>
        {
            { "key", key },
            { "locationKey", request.LocationKey },
            { "name", request.Name.Trim() },
            { "now", DateTime.UtcNow },
        };

        var cursor = await db.Client.Cursor.PostCursorAsync<InventoryBinDocument>(query, bindVars);
        var created = cursor.Result.FirstOrDefault();
        return created == null
            ? Results.BadRequest(new ApiErrorResponse { Error = "Failed to create bin" })
            : Results.Created($"/api/v1/inventory/bins/{created.Key}", MapBin(created));
    }

    private static async Task<IResult> GetStockLevels([FromServices] ArangoDbContext db, string? skuKey, string? locationKey)
    {
        var query = $@"
FOR s IN {StockLevelCollection}
    FILTER (@skuKey == null OR s.skuKey == @skuKey)
    FILTER (@locationKey == null OR s.locationKey == @locationKey)
    SORT s.locationKey ASC, s.skuKey ASC
    RETURN s";

        var bindVars = new Dictionary<string, object>
        {
            { "skuKey", string.IsNullOrWhiteSpace(skuKey) ? null! : skuKey },
            { "locationKey", string.IsNullOrWhiteSpace(locationKey) ? null! : locationKey },
        };

        var cursor = await db.Client.Cursor.PostCursorAsync<InventoryStockLevelDocument>(query, bindVars);
        return Results.Ok(cursor.Result.Select(MapStock));
    }

    private static async Task<IResult> CreateAdjustment(CreateInventoryAdjustmentRequest request, [FromServices] ArangoDbContext db)
    {
        if (string.IsNullOrWhiteSpace(request.LocationKey))
            return Results.BadRequest(new ApiErrorResponse { Error = "LocationKey is required" });
        if (string.IsNullOrWhiteSpace(request.SkuKey))
            return Results.BadRequest(new ApiErrorResponse { Error = "SkuKey is required" });
        if (request.QuantityDelta == 0)
            return Results.BadRequest(new ApiErrorResponse { Error = "QuantityDelta cannot be 0" });
        if (string.IsNullOrWhiteSpace(request.Reason))
            return Results.BadRequest(new ApiErrorResponse { Error = "Reason is required" });

        var now = request.OccurredAt ?? DateTime.UtcNow;

        var movement = new InventoryMovementDocument
        {
            Key = Guid.NewGuid().ToString("N"),
            SkuKey = request.SkuKey,
            AssetKey = null,
            LotKey = null,
            LocationKey = request.LocationKey,
            BinKey = null,
            Reason = request.Reason,
            Type = "Adjustment",
            Quantity = request.QuantityDelta,
            OccurredAt = now,
            IsValid = true,
            InvalidatedAt = null,
            InvalidatedReason = null,
        };

        await ApplyMovementAndUpdateStock(db, movement);
        return Results.Created($"/api/v1/inventory/movements/{movement.Key}", MapMovement(movement));
    }

    private static async Task<IResult> CreateTransfer(CreateInventoryTransferRequest request, [FromServices] ArangoDbContext db)
    {
        if (string.IsNullOrWhiteSpace(request.FromLocationKey))
            return Results.BadRequest(new ApiErrorResponse { Error = "FromLocationKey is required" });
        if (string.IsNullOrWhiteSpace(request.ToLocationKey))
            return Results.BadRequest(new ApiErrorResponse { Error = "ToLocationKey is required" });
        if (string.IsNullOrWhiteSpace(request.SkuKey))
            return Results.BadRequest(new ApiErrorResponse { Error = "SkuKey is required" });
        if (request.Quantity <= 0)
            return Results.BadRequest(new ApiErrorResponse { Error = "Quantity must be > 0" });

        var now = request.OccurredAt ?? DateTime.UtcNow;
        var reason = string.IsNullOrWhiteSpace(request.Reason)
            ? $"Transfer {request.FromLocationKey} -> {request.ToLocationKey}"
            : request.Reason;

        var outMovement = new InventoryMovementDocument
        {
            Key = Guid.NewGuid().ToString("N"),
            SkuKey = request.SkuKey,
            AssetKey = null,
            LotKey = null,
            LocationKey = request.FromLocationKey,
            BinKey = null,
            Reason = reason,
            Type = "TransferOut",
            Quantity = -request.Quantity,
            OccurredAt = now,
            IsValid = true,
            InvalidatedAt = null,
            InvalidatedReason = null,
        };

        var inMovement = new InventoryMovementDocument
        {
            Key = Guid.NewGuid().ToString("N"),
            SkuKey = request.SkuKey,
            AssetKey = null,
            LotKey = null,
            LocationKey = request.ToLocationKey,
            BinKey = null,
            Reason = reason,
            Type = "TransferIn",
            Quantity = request.Quantity,
            OccurredAt = now,
            IsValid = true,
            InvalidatedAt = null,
            InvalidatedReason = null,
        };

        await ApplyTransferAndUpdateStock(db, outMovement, inMovement);

        return Results.Ok(new
        {
            OutMovementKey = outMovement.Key,
            InMovementKey = inMovement.Key,
        });
    }

    private static async Task<IResult> GetSkus([FromServices] ArangoDbContext db, string? domain)
    {
        var query = string.IsNullOrWhiteSpace(domain)
            ? $"FOR s IN {SkuCollection} RETURN s"
            : $"FOR s IN {SkuCollection} FILTER s.domain == @domain RETURN s";

        var bindVars = string.IsNullOrWhiteSpace(domain)
            ? null
            : new Dictionary<string, object> { { "domain", domain! } };

        var cursor = await db.Client.Cursor.PostCursorAsync<InventorySkuDocument>(query, bindVars);
        return Results.Ok(cursor.Result.Select(MapSku));
    }

    private static async Task<IResult> GetSkuByKey(string key, [FromServices] ArangoDbContext db)
    {
        var query = $"FOR s IN {SkuCollection} FILTER s._key == @key RETURN s";
        var bindVars = new Dictionary<string, object> { { "key", key } };
        var cursor = await db.Client.Cursor.PostCursorAsync<InventorySkuDocument>(query, bindVars);
        var sku = cursor.Result.FirstOrDefault();
        return sku == null ? Results.NotFound() : Results.Ok(MapSku(sku));
    }

    private static async Task<IResult> CreateSku(CreateInventorySkuRequest request, [FromServices] ArangoDbContext db)
    {
        if (string.IsNullOrWhiteSpace(request.Domain)) return Results.BadRequest(new ApiErrorResponse { Error = "Domain is required" });
        if (string.IsNullOrWhiteSpace(request.Kind)) return Results.BadRequest(new ApiErrorResponse { Error = "Kind is required" });
        if (string.IsNullOrWhiteSpace(request.Name)) return Results.BadRequest(new ApiErrorResponse { Error = "Name is required" });
        if (string.IsNullOrWhiteSpace(request.Category)) return Results.BadRequest(new ApiErrorResponse { Error = "Category is required" });

        var skuKey = BuildSkuKey(request.Domain, request.PartNumber, request.Name, request.Category);

        var existing = await GetSkuByKeyInternal(db, skuKey);
        if (existing != null)
            return Results.Ok(MapSku(existing));

        var sku = new InventorySkuDocument
        {
            Key = skuKey,
            Domain = request.Domain,
            Kind = request.Kind,
            Name = request.Name,
            Category = request.Category,
            PartNumber = string.IsNullOrWhiteSpace(request.PartNumber) ? null : request.PartNumber,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await db.Client.Document.PostDocumentAsync(SkuCollection, sku);
        return Results.Created($"/api/v1/inventory/skus/{sku.Key}", MapSku(sku));
    }

    private static async Task<IResult> GetAssets([FromServices] ArangoDbContext db, string? skuKey)
    {
        var query = string.IsNullOrWhiteSpace(skuKey)
            ? $"FOR a IN {AssetCollection} RETURN a"
            : $"FOR a IN {AssetCollection} FILTER a.skuKey == @skuKey RETURN a";

        var bindVars = string.IsNullOrWhiteSpace(skuKey)
            ? null
            : new Dictionary<string, object> { { "skuKey", skuKey! } };

        var cursor = await db.Client.Cursor.PostCursorAsync<InventoryAssetDocument>(query, bindVars);
        return Results.Ok(cursor.Result.Select(MapAsset));
    }

    private static async Task<IResult> GetAssetById(Guid id, [FromServices] ArangoDbContext db)
    {
        var key = id.ToString();
        var query = $"FOR a IN {AssetCollection} FILTER a._key == @key RETURN a";
        var bindVars = new Dictionary<string, object> { { "key", key } };
        var cursor = await db.Client.Cursor.PostCursorAsync<InventoryAssetDocument>(query, bindVars);
        var asset = cursor.Result.FirstOrDefault();
        return asset == null ? Results.NotFound() : Results.Ok(MapAsset(asset));
    }

    private static async Task<IResult> CreateAsset(CreateInventoryAssetRequest request, [FromServices] ArangoDbContext db)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new ApiErrorResponse { Error = "Name is required" });

        var skuKey = await ResolveSkuKeyForAsset(db, request);
        if (skuKey == null)
            return Results.BadRequest(new ApiErrorResponse { Error = "SkuKey or (Domain+Kind+Name+Category) is required" });

        var id = Guid.NewGuid();
        var asset = new InventoryAssetDocument
        {
            Key = id.ToString(),
            SkuKey = skuKey,
            Name = request.Name,
            Category = request.Category,
            PartNumber = string.IsNullOrWhiteSpace(request.PartNumber) ? null : request.PartNumber,
            Location = new ComponentLocationDocument { Type = "InStorage" },
            PurchaseDate = request.PurchaseDate,
            PurchasePrice = request.PurchaseCost,
            WarrantyExpiration = request.WarrantyExpiry,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await db.Client.Document.PostDocumentAsync(AssetCollection, asset);
        return Results.Created($"/api/v1/inventory/assets/{id}", MapAsset(asset));
    }

    private static async Task<IResult> UpdateAsset(Guid id, UpdateInventoryAssetRequest request, [FromServices] ArangoDbContext db)
    {
        var key = id.ToString();
        var existing = await GetAssetByKeyInternal(db, key);
        if (existing == null) return Results.NotFound(new ApiErrorResponse { Error = "Asset not found" });

        var updated = new InventoryAssetDocument
        {
            Key = existing.Key,
            Id = existing.Id,
            Rev = existing.Rev,
            SkuKey = string.IsNullOrWhiteSpace(request.SkuKey) ? existing.SkuKey : request.SkuKey,
            Name = request.Name ?? existing.Name,
            Category = request.Category ?? existing.Category,
            PartNumber = request.PartNumber ?? existing.PartNumber,
            Location = request.Location != null ? MapLocation(request.Location) : existing.Location,
            PurchaseDate = request.PurchaseDate ?? existing.PurchaseDate,
            PurchasePrice = request.PurchaseCost ?? existing.PurchasePrice,
            WarrantyExpiration = request.WarrantyExpiry ?? existing.WarrantyExpiration,
            Notes = request.Notes ?? existing.Notes,
            CreatedAt = existing.CreatedAt,
            UpdatedAt = DateTime.UtcNow,
        };

        await db.Client.Document.PutDocumentAsync(AssetCollection, existing.Key, updated);
        await SyncInstallationsAsync(db, existing, updated);

        return Results.Ok(MapAsset(updated));
    }

    private static async Task<IResult> DeleteAsset(Guid id, [FromServices] ArangoDbContext db)
    {
        var key = id.ToString();
        var existing = await GetAssetByKeyInternal(db, key);
        if (existing == null) return Results.NotFound(new ApiErrorResponse { Error = "Asset not found" });

        await db.Client.Document.DeleteDocumentAsync(AssetCollection, existing.Key);
        return Results.NoContent();
    }

    private static async Task<IResult> GetLots([FromServices] ArangoDbContext db, string? skuKey)
    {
        var query = string.IsNullOrWhiteSpace(skuKey)
            ? $"FOR l IN {LotCollection} RETURN l"
            : $"FOR l IN {LotCollection} FILTER l.skuKey == @skuKey RETURN l";

        var bindVars = string.IsNullOrWhiteSpace(skuKey)
            ? null
            : new Dictionary<string, object> { { "skuKey", skuKey! } };

        var cursor = await db.Client.Cursor.PostCursorAsync<InventoryLotDocument>(query, bindVars);
        return Results.Ok(cursor.Result.Select(MapLot));
    }

    private static async Task<IResult> GetLotByKey(string key, [FromServices] ArangoDbContext db)
    {
        var query = $"FOR l IN {LotCollection} FILTER l._key == @key RETURN l";
        var bindVars = new Dictionary<string, object> { { "key", key } };
        var cursor = await db.Client.Cursor.PostCursorAsync<InventoryLotDocument>(query, bindVars);
        var lot = cursor.Result.FirstOrDefault();
        return lot == null ? Results.NotFound() : Results.Ok(MapLot(lot));
    }

    private static async Task<IResult> CreateLot(CreateInventoryLotRequest request, [FromServices] ArangoDbContext db)
    {
        if (string.IsNullOrWhiteSpace(request.SkuKey))
            return Results.BadRequest(new ApiErrorResponse { Error = "SkuKey is required" });
        if (request.Quantity <= 0)
            return Results.BadRequest(new ApiErrorResponse { Error = "Quantity must be > 0" });
        if (string.IsNullOrWhiteSpace(request.Unit))
            return Results.BadRequest(new ApiErrorResponse { Error = "Unit is required" });

        var lot = new InventoryLotDocument
        {
            Key = Guid.NewGuid().ToString("N"),
            SkuKey = request.SkuKey,
            Quantity = request.Quantity,
            Unit = request.Unit,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await db.Client.Document.PostDocumentAsync(LotCollection, lot);
        return Results.Created($"/api/v1/inventory/lots/{lot.Key}", MapLot(lot));
    }

    private static async Task<IResult> UpdateLot(string key, UpdateInventoryLotRequest request, [FromServices] ArangoDbContext db)
    {
        var existing = await GetLotByKeyInternal(db, key);
        if (existing == null) return Results.NotFound(new ApiErrorResponse { Error = "Lot not found" });

        var updated = new InventoryLotDocument
        {
            Key = existing.Key,
            Id = existing.Id,
            Rev = existing.Rev,
            SkuKey = existing.SkuKey,
            Quantity = request.Quantity ?? existing.Quantity,
            Unit = request.Unit ?? existing.Unit,
            CreatedAt = existing.CreatedAt,
            UpdatedAt = DateTime.UtcNow,
        };

        await db.Client.Document.PutDocumentAsync(LotCollection, existing.Key, updated);
        return Results.Ok(MapLot(updated));
    }

    private static async Task<IResult> DeleteLot(string key, [FromServices] ArangoDbContext db)
    {
        var existing = await GetLotByKeyInternal(db, key);
        if (existing == null) return Results.NotFound(new ApiErrorResponse { Error = "Lot not found" });

        await db.Client.Document.DeleteDocumentAsync(LotCollection, existing.Key);
        return Results.NoContent();
    }

    private static async Task<IResult> GetMovements([FromServices] ArangoDbContext db, string? skuKey)
    {
        var query = string.IsNullOrWhiteSpace(skuKey)
            ? $"FOR m IN {MovementCollection} SORT m.occurredAt DESC RETURN m"
            : $"FOR m IN {MovementCollection} FILTER m.skuKey == @skuKey SORT m.occurredAt DESC RETURN m";

        var bindVars = string.IsNullOrWhiteSpace(skuKey)
            ? null
            : new Dictionary<string, object> { { "skuKey", skuKey! } };

        var cursor = await db.Client.Cursor.PostCursorAsync<InventoryMovementDocument>(query, bindVars);
        return Results.Ok(cursor.Result.Select(MapMovement));
    }

    private static async Task<IResult> CreateMovement(CreateInventoryMovementRequest request, [FromServices] ArangoDbContext db)
    {
        if (string.IsNullOrWhiteSpace(request.SkuKey))
            return Results.BadRequest(new ApiErrorResponse { Error = "SkuKey is required" });
        if (string.IsNullOrWhiteSpace(request.Type))
            return Results.BadRequest(new ApiErrorResponse { Error = "Type is required" });
        if (request.Quantity == 0)
            return Results.BadRequest(new ApiErrorResponse { Error = "Quantity cannot be 0" });

        var movement = new InventoryMovementDocument
        {
            Key = Guid.NewGuid().ToString("N"),
            SkuKey = request.SkuKey,
            AssetKey = string.IsNullOrWhiteSpace(request.AssetKey) ? null : request.AssetKey,
            LotKey = string.IsNullOrWhiteSpace(request.LotKey) ? null : request.LotKey,
            LocationKey = string.IsNullOrWhiteSpace(request.LocationKey) ? null : request.LocationKey,
            BinKey = string.IsNullOrWhiteSpace(request.BinKey) ? null : request.BinKey,
            Reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason,
            Type = request.Type,
            Quantity = request.Quantity,
            OccurredAt = request.OccurredAt ?? DateTime.UtcNow,
            IsValid = true,
            InvalidatedAt = null,
            InvalidatedReason = null,
        };

        await ApplyMovementAndUpdateStock(db, movement);
        return Results.Created($"/api/v1/inventory/movements/{movement.Key}", MapMovement(movement));
    }

    private static async Task<IResult> CorrectHistory(CreateInventoryHistoryCorrectionRequest request, [FromServices] ArangoDbContext db)
    {
        if (string.IsNullOrWhiteSpace(request.IncorrectEdgeKey))
            return Results.BadRequest(new ApiErrorResponse { Error = "IncorrectEdgeKey is required" });
        if (string.IsNullOrWhiteSpace(request.Reason))
            return Results.BadRequest(new ApiErrorResponse { Error = "Reason is required" });

        var existingEdge = await GetAssetInstallationEdgeByKeyInternal(db, request.IncorrectEdgeKey);
        if (existingEdge == null)
            return Results.NotFound(new ApiErrorResponse { Error = "Installation edge not found" });

        // Invalidate existing edge
        var invalidateQuery = $@"
FOR e IN {InstallationsCollection}
    FILTER e._key == @key
    UPDATE e WITH {{ isValid: false, invalidatedAt: @invalidatedAt, invalidatedReason: @reason }} IN {InstallationsCollection}
    RETURN NEW";

        var invalidateVars = new Dictionary<string, object>
        {
            { "key", request.IncorrectEdgeKey },
            { "invalidatedAt", DateTime.UtcNow },
            { "reason", request.Reason },
        };

        await db.Client.Cursor.PostCursorAsync<object>(invalidateQuery, invalidateVars);

        // Insert corrected edge (same asset target)
        var corrected = new AssetInstallationEdge
        {
            From = $"{ArangoDbContext.Collections.Vehicles}/{request.CorrectedVehicleId}",
            To = existingEdge.To,
            InstalledAt = request.CorrectedInstalledAt,
            RemovedAt = null,
            IsValid = true,
            InvalidatedAt = null,
            InvalidatedReason = null,
        };

        await db.Client.Document.PostDocumentAsync(InstallationsCollection, corrected);

        return Results.Ok(new
        {
            InvalidatedEdgeKey = request.IncorrectEdgeKey,
            CorrectedEdgeFrom = corrected.From,
            CorrectedEdgeTo = corrected.To,
            CorrectedInstalledAt = corrected.InstalledAt
        });
    }

    private static InventorySkuDto MapSku(InventorySkuDocument doc) => new()
    {
        Key = doc.Key,
        Domain = doc.Domain,
        Kind = doc.Kind,
        Name = doc.Name,
        Category = doc.Category,
        PartNumber = doc.PartNumber,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt,
    };

    private static InventoryAssetDto MapAsset(InventoryAssetDocument doc) => new()
    {
        Id = Guid.Parse(doc.Key),
        SkuKey = doc.SkuKey,
        Name = doc.Name,
        Category = doc.Category,
        PartNumber = doc.PartNumber,
        Location = new ComponentLocationDto
        {
            Type = doc.Location.Type,
            StorageLocation = doc.Location.StorageLocation,
            VehicleId = string.IsNullOrWhiteSpace(doc.Location.VehicleId) ? null : Guid.Parse(doc.Location.VehicleId),
            InstalledDate = doc.Location.InstalledDate,
        },
        PurchaseDate = doc.PurchaseDate,
        PurchaseCost = doc.PurchasePrice,
        WarrantyExpiry = doc.WarrantyExpiration,
        Notes = doc.Notes,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt,
    };

    private static InventoryLotDto MapLot(InventoryLotDocument doc) => new()
    {
        Key = doc.Key,
        SkuKey = doc.SkuKey,
        Quantity = doc.Quantity,
        Unit = doc.Unit,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt,
    };

    private static InventoryMovementDto MapMovement(InventoryMovementDocument doc) => new()
    {
        Key = doc.Key,
        SkuKey = doc.SkuKey,
        AssetKey = doc.AssetKey,
        LotKey = doc.LotKey,
        LocationKey = doc.LocationKey,
        BinKey = doc.BinKey,
        Reason = doc.Reason,
        Type = doc.Type,
        Quantity = doc.Quantity,
        OccurredAt = doc.OccurredAt,
        IsValid = doc.IsValid,
        InvalidatedAt = doc.InvalidatedAt,
        InvalidatedReason = doc.InvalidatedReason,
    };

    private static InventoryLocationDto MapLocation(InventoryLocationDocument doc) => new()
    {
        Key = doc.Key,
        Name = doc.Name,
        IsActive = doc.IsActive,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt,
    };

    private static InventoryBinDto MapBin(InventoryBinDocument doc) => new()
    {
        Key = doc.Key,
        LocationKey = doc.LocationKey,
        Name = doc.Name,
        IsActive = doc.IsActive,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt,
    };

    private static InventoryStockLevelDto MapStock(InventoryStockLevelDocument doc) => new()
    {
        Key = doc.Key,
        LocationKey = doc.LocationKey,
        SkuKey = doc.SkuKey,
        OnHand = doc.OnHand,
        Reserved = doc.Reserved,
        Available = doc.Available,
        UpdatedAt = doc.UpdatedAt,
    };

    private static async Task ApplyMovementAndUpdateStock(ArangoDbContext db, InventoryMovementDocument movement)
    {
        // If no locationKey is provided, we only record the movement (backward compatible).
        if (string.IsNullOrWhiteSpace(movement.LocationKey))
        {
            await db.Client.Document.PostDocumentAsync(MovementCollection, movement);
            return;
        }

        var stockKey = $"{movement.LocationKey}:{movement.SkuKey}";
        var now = DateTime.UtcNow;

        var query = $@"
LET movement = @movement
INSERT movement INTO {MovementCollection}

LET stockKey = @stockKey
LET delta = @delta
LET now = @now

UPSERT {{ _key: stockKey }}
INSERT {{ _key: stockKey, locationKey: @locationKey, skuKey: @skuKey, onHand: delta, reserved: 0, available: delta, updatedAt: now }}
UPDATE {{
  onHand: OLD.onHand + delta,
  available: (OLD.onHand + delta) - OLD.reserved,
  updatedAt: now
}} IN {StockLevelCollection}
RETURN NEW";

        var bindVars = new Dictionary<string, object>
        {
            { "movement", movement },
            { "stockKey", stockKey },
            { "delta", movement.Quantity },
            { "locationKey", movement.LocationKey! },
            { "skuKey", movement.SkuKey },
            { "now", now },
        };

        await db.Client.Cursor.PostCursorAsync<InventoryStockLevelDocument>(query, bindVars);
    }

    private static async Task ApplyTransferAndUpdateStock(
        ArangoDbContext db,
        InventoryMovementDocument outMovement,
        InventoryMovementDocument inMovement)
    {
        var outStockKey = $"{outMovement.LocationKey}:{outMovement.SkuKey}";
        var inStockKey = $"{inMovement.LocationKey}:{inMovement.SkuKey}";
        var now = DateTime.UtcNow;

        var query = $@"
LET outM = @outMovement
LET inM = @inMovement
INSERT outM INTO {MovementCollection}
INSERT inM INTO {MovementCollection}

LET now = @now

UPSERT {{ _key: @outStockKey }}
INSERT {{ _key: @outStockKey, locationKey: @outLocationKey, skuKey: @skuKey, onHand: @outDelta, reserved: 0, available: @outDelta, updatedAt: now }}
UPDATE {{ onHand: OLD.onHand + @outDelta, available: (OLD.onHand + @outDelta) - OLD.reserved, updatedAt: now }} IN {StockLevelCollection}

UPSERT {{ _key: @inStockKey }}
INSERT {{ _key: @inStockKey, locationKey: @inLocationKey, skuKey: @skuKey, onHand: @inDelta, reserved: 0, available: @inDelta, updatedAt: now }}
UPDATE {{ onHand: OLD.onHand + @inDelta, available: (OLD.onHand + @inDelta) - OLD.reserved, updatedAt: now }} IN {StockLevelCollection}

RETURN true";

        var bindVars = new Dictionary<string, object>
        {
            { "outMovement", outMovement },
            { "inMovement", inMovement },
            { "now", now },
            { "skuKey", outMovement.SkuKey },
            { "outDelta", outMovement.Quantity },
            { "inDelta", inMovement.Quantity },
            { "outStockKey", outStockKey },
            { "inStockKey", inStockKey },
            { "outLocationKey", outMovement.LocationKey! },
            { "inLocationKey", inMovement.LocationKey! },
        };

        await db.Client.Cursor.PostCursorAsync<object>(query, bindVars);
    }

    private static ComponentLocationDocument MapLocation(ComponentLocationDto dto)
    {
        return dto.Type switch
        {
            "InstalledOn" when dto.VehicleId.HasValue => new ComponentLocationDocument
            {
                Type = "InstalledOn",
                StorageLocation = null,
                VehicleId = dto.VehicleId.Value.ToString(),
                InstalledDate = dto.InstalledDate ?? global::System.DateTime.UtcNow,
            },
            _ => new ComponentLocationDocument
            {
                Type = "InStorage",
                StorageLocation = string.IsNullOrWhiteSpace(dto.StorageLocation) ? null : dto.StorageLocation,
                VehicleId = null,
                InstalledDate = null,
            }
        };
    }

    private static async Task<string?> ResolveSkuKeyForAsset(ArangoDbContext db, CreateInventoryAssetRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.SkuKey)) return request.SkuKey;

        var domain = string.IsNullOrWhiteSpace(request.Domain) ? null : request.Domain;
        var kind = string.IsNullOrWhiteSpace(request.Kind) ? null : request.Kind;

        if (string.IsNullOrWhiteSpace(domain) || string.IsNullOrWhiteSpace(kind)) return null;

        var skuKey = BuildSkuKey(domain!, request.PartNumber, request.Name, request.Category);
        var existing = await GetSkuByKeyInternal(db, skuKey);
        if (existing != null) return existing.Key;

        var sku = new InventorySkuDocument
        {
            Key = skuKey,
            Domain = domain!,
            Kind = kind!,
            Name = request.Name,
            Category = request.Category,
            PartNumber = string.IsNullOrWhiteSpace(request.PartNumber) ? null : request.PartNumber,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await db.Client.Document.PostDocumentAsync(SkuCollection, sku);
        return sku.Key;
    }

    private static async Task<InventorySkuDocument?> GetSkuByKeyInternal(ArangoDbContext db, string key)
    {
        var query = $"FOR s IN {SkuCollection} FILTER s._key == @key RETURN s";
        var bindVars = new Dictionary<string, object> { { "key", key } };
        var cursor = await db.Client.Cursor.PostCursorAsync<InventorySkuDocument>(query, bindVars);
        return cursor.Result.FirstOrDefault();
    }

    private static async Task<InventoryAssetDocument?> GetAssetByKeyInternal(ArangoDbContext db, string key)
    {
        var query = $"FOR a IN {AssetCollection} FILTER a._key == @key RETURN a";
        var bindVars = new Dictionary<string, object> { { "key", key } };
        var cursor = await db.Client.Cursor.PostCursorAsync<InventoryAssetDocument>(query, bindVars);
        return cursor.Result.FirstOrDefault();
    }

    private static async Task<InventoryLotDocument?> GetLotByKeyInternal(ArangoDbContext db, string key)
    {
        var query = $"FOR l IN {LotCollection} FILTER l._key == @key RETURN l";
        var bindVars = new Dictionary<string, object> { { "key", key } };
        var cursor = await db.Client.Cursor.PostCursorAsync<InventoryLotDocument>(query, bindVars);
        return cursor.Result.FirstOrDefault();
    }

    private static async Task<AssetInstallationEdge?> GetAssetInstallationEdgeByKeyInternal(ArangoDbContext db, string key)
    {
        var query = $"FOR e IN {InstallationsCollection} FILTER e._key == @key RETURN e";
        var bindVars = new Dictionary<string, object> { { "key", key } };
        var cursor = await db.Client.Cursor.PostCursorAsync<AssetInstallationEdge>(query, bindVars);
        return cursor.Result.FirstOrDefault();
    }

    private static async Task SyncInstallationsAsync(ArangoDbContext db, InventoryAssetDocument before, InventoryAssetDocument after)
    {
        var beforeInstalled = before.Location.Type == "InstalledOn" && !string.IsNullOrWhiteSpace(before.Location.VehicleId);
        var afterInstalled = after.Location.Type == "InstalledOn" && !string.IsNullOrWhiteSpace(after.Location.VehicleId);

        var assetId = $"{AssetCollection}/{after.Key}";

        if (!beforeInstalled && afterInstalled)
        {
            var edge = new AssetInstallationEdge
            {
                From = $"{ArangoDbContext.Collections.Vehicles}/{after.Location.VehicleId}",
                To = assetId,
                InstalledAt = after.Location.InstalledDate ?? global::System.DateTime.UtcNow,
                RemovedAt = null,
                IsValid = true,
            };

            await db.Client.Document.PostDocumentAsync(InstallationsCollection, edge);
            return;
        }

        if (beforeInstalled && !afterInstalled)
        {
            var query = $@"
FOR e IN {InstallationsCollection}
    FILTER e._from == @from AND e._to == @to AND e.removedAt == null AND e.isValid == true
    UPDATE e WITH {{ removedAt: @removedAt }} IN {InstallationsCollection}";

            var bindVars = new Dictionary<string, object>
            {
                { "from", $"{ArangoDbContext.Collections.Vehicles}/{before.Location.VehicleId}" },
                { "to", assetId },
                { "removedAt", global::System.DateTime.UtcNow },
            };

            await db.Client.Cursor.PostCursorAsync<object>(query, bindVars);
            return;
        }

        if (beforeInstalled && afterInstalled && before.Location.VehicleId != after.Location.VehicleId)
        {
            var closeQuery = $@"
FOR e IN {InstallationsCollection}
    FILTER e._from == @from AND e._to == @to AND e.removedAt == null AND e.isValid == true
    UPDATE e WITH {{ removedAt: @removedAt }} IN {InstallationsCollection}";

            var closeBindVars = new Dictionary<string, object>
            {
                { "from", $"{ArangoDbContext.Collections.Vehicles}/{before.Location.VehicleId}" },
                { "to", assetId },
                { "removedAt", global::System.DateTime.UtcNow },
            };

            await db.Client.Cursor.PostCursorAsync<object>(closeQuery, closeBindVars);

            var edge = new AssetInstallationEdge
            {
                From = $"{ArangoDbContext.Collections.Vehicles}/{after.Location.VehicleId}",
                To = assetId,
                InstalledAt = after.Location.InstalledDate ?? global::System.DateTime.UtcNow,
                RemovedAt = null,
                IsValid = true,
            };

            await db.Client.Document.PostDocumentAsync(InstallationsCollection, edge);
        }
    }

    private static string BuildSkuKey(string domain, string? partNumber, string name, string category)
    {
        if (!string.IsNullOrWhiteSpace(partNumber))
        {
            return $"{Normalize(domain)}:{Normalize(partNumber)}";
        }

        return $"{Normalize(domain)}:{Normalize(category)}:{Normalize(name)}";
    }

    private static string Normalize(string value)
    {
        var lower = value.Trim().ToLowerInvariant();
        var chars = lower
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray();

        var normalized = new string(chars);
        while (normalized.Contains("--")) normalized = normalized.Replace("--", "-");
        return normalized.Trim('-');
    }
}
