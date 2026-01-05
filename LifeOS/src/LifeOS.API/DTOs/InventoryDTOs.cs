namespace LifeOS.API.DTOs;

public record InventorySkuDto
{
    public string Key { get; init; } = string.Empty;
    public string Domain { get; init; } = string.Empty;
    public string Kind { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public string? PartNumber { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateInventorySkuRequest
{
    public string Domain { get; init; } = string.Empty;
    public string Kind { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public string? PartNumber { get; init; }
}

public record InventoryAssetDto
{
    public Guid Id { get; init; }
    public string SkuKey { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public string? PartNumber { get; init; }
    public ComponentLocationDto Location { get; init; } = new();
    public DateTime? PurchaseDate { get; init; }
    public decimal? PurchaseCost { get; init; }
    public DateTime? WarrantyExpiry { get; init; }
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateInventoryAssetRequest
{
    public string? SkuKey { get; init; }

    // If SkuKey is omitted, these are used to auto-resolve/create (A1)
    public string? Domain { get; init; }
    public string? Kind { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Category { get; init; } = "Other";
    public string? PartNumber { get; init; }

    public DateTime? PurchaseDate { get; init; }
    public decimal? PurchaseCost { get; init; }
    public DateTime? WarrantyExpiry { get; init; }
    public string? Notes { get; init; }
}

public record UpdateInventoryAssetRequest
{
    public string? SkuKey { get; init; }
    public string? Name { get; init; }
    public string? Category { get; init; }
    public string? PartNumber { get; init; }
    public ComponentLocationDto? Location { get; init; }

    public DateTime? PurchaseDate { get; init; }
    public decimal? PurchaseCost { get; init; }
    public DateTime? WarrantyExpiry { get; init; }
    public string? Notes { get; init; }
}

public record InventoryLotDto
{
    public string Key { get; init; } = string.Empty;
    public string SkuKey { get; init; } = string.Empty;
    public decimal Quantity { get; init; }
    public string Unit { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateInventoryLotRequest
{
    public string SkuKey { get; init; } = string.Empty;
    public decimal Quantity { get; init; }
    public string Unit { get; init; } = string.Empty;
}

public record UpdateInventoryLotRequest
{
    public decimal? Quantity { get; init; }
    public string? Unit { get; init; }
}

public record InventoryMovementDto
{
    public string Key { get; init; } = string.Empty;
    public string SkuKey { get; init; } = string.Empty;
    public string? AssetKey { get; init; }
    public string? LotKey { get; init; }
    public string? LocationKey { get; init; }
    public string? BinKey { get; init; }
    public string? Reason { get; init; }
    public string Type { get; init; } = string.Empty;
    public decimal Quantity { get; init; }
    public DateTime OccurredAt { get; init; }
    public bool IsValid { get; init; }
    public DateTime? InvalidatedAt { get; init; }
    public string? InvalidatedReason { get; init; }
}

public record CreateInventoryMovementRequest
{
    public string SkuKey { get; init; } = string.Empty;
    public string? AssetKey { get; init; }
    public string? LotKey { get; init; }
    public string? LocationKey { get; init; }
    public string? BinKey { get; init; }
    public string? Reason { get; init; }
    public string Type { get; init; } = string.Empty;
    public decimal Quantity { get; init; }
    public DateTime? OccurredAt { get; init; }
}

public record InventoryLocationDto
{
    public string Key { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateInventoryLocationRequest
{
    public string Name { get; init; } = string.Empty;
}

public record InventoryBinDto
{
    public string Key { get; init; } = string.Empty;
    public string LocationKey { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateInventoryBinRequest
{
    public string LocationKey { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
}

public record InventoryStockLevelDto
{
    public string Key { get; init; } = string.Empty;
    public string LocationKey { get; init; } = string.Empty;
    public string SkuKey { get; init; } = string.Empty;
    public decimal OnHand { get; init; }
    public decimal Reserved { get; init; }
    public decimal Available { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateInventoryAdjustmentRequest
{
    public string LocationKey { get; init; } = string.Empty;
    public string SkuKey { get; init; } = string.Empty;
    public decimal QuantityDelta { get; init; }
    public string Reason { get; init; } = string.Empty;
    public DateTime? OccurredAt { get; init; }
}

public record CreateInventoryTransferRequest
{
    public string FromLocationKey { get; init; } = string.Empty;
    public string ToLocationKey { get; init; } = string.Empty;
    public string SkuKey { get; init; } = string.Empty;
    public decimal Quantity { get; init; }
    public string? Reason { get; init; }
    public DateTime? OccurredAt { get; init; }
}

public record CreateInventoryHistoryCorrectionRequest
{
    public string IncorrectEdgeKey { get; init; } = string.Empty;
    public string Reason { get; init; } = string.Empty;
    public Guid CorrectedVehicleId { get; init; }
    public DateTime CorrectedInstalledAt { get; init; }
}
