using System.Text.Json.Serialization;

namespace LifeOS.Infrastructure.Persistence.Documents;

public class InventorySkuDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("domain")]
    public string Domain { get; set; } = string.Empty;

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("partNumber")]
    public string? PartNumber { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class InventoryLocationDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class InventoryBinDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("locationKey")]
    public string LocationKey { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class InventoryStockLevelDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("locationKey")]
    public string LocationKey { get; set; } = string.Empty;

    [JsonPropertyName("skuKey")]
    public string SkuKey { get; set; } = string.Empty;

    [JsonPropertyName("onHand")]
    public decimal OnHand { get; set; }

    [JsonPropertyName("reserved")]
    public decimal Reserved { get; set; }

    [JsonPropertyName("available")]
    public decimal Available { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class InventoryAssetDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("skuKey")]
    public string SkuKey { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("partNumber")]
    public string? PartNumber { get; set; }

    [JsonPropertyName("location")]
    public ComponentLocationDocument Location { get; set; } = new();

    [JsonPropertyName("purchaseDate")]
    public DateTime? PurchaseDate { get; set; }

    [JsonPropertyName("purchasePrice")]
    public decimal? PurchasePrice { get; set; }

    [JsonPropertyName("warrantyExpiration")]
    public DateTime? WarrantyExpiration { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class AssetInstallationEdge
{
    [JsonPropertyName("_key")]
    public string? Key { get; set; }

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("_to")]
    public string To { get; set; } = string.Empty;

    [JsonPropertyName("installedAt")]
    public DateTime InstalledAt { get; set; }

    [JsonPropertyName("removedAt")]
    public DateTime? RemovedAt { get; set; }

    [JsonPropertyName("isValid")]
    public bool IsValid { get; set; } = true;

    [JsonPropertyName("invalidatedAt")]
    public DateTime? InvalidatedAt { get; set; }

    [JsonPropertyName("invalidatedReason")]
    public string? InvalidatedReason { get; set; }
}

public class InventoryLotDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("skuKey")]
    public string SkuKey { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public decimal Quantity { get; set; }

    [JsonPropertyName("unit")]
    public string Unit { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class InventoryMovementDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("skuKey")]
    public string SkuKey { get; set; } = string.Empty;

    [JsonPropertyName("assetKey")]
    public string? AssetKey { get; set; }

    [JsonPropertyName("lotKey")]
    public string? LotKey { get; set; }

    [JsonPropertyName("locationKey")]
    public string? LocationKey { get; set; }

    [JsonPropertyName("binKey")]
    public string? BinKey { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public decimal Quantity { get; set; }

    [JsonPropertyName("occurredAt")]
    public DateTime OccurredAt { get; set; }

    [JsonPropertyName("isValid")]
    public bool IsValid { get; set; } = true;

    [JsonPropertyName("invalidatedAt")]
    public DateTime? InvalidatedAt { get; set; }

    [JsonPropertyName("invalidatedReason")]
    public string? InvalidatedReason { get; set; }
}
