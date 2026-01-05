using System.Text.Json.Serialization;

namespace LifeOS.Infrastructure.Persistence.Documents;

/// <summary>
/// ArangoDB document representation of Vehicle aggregate
/// Maps between F# domain types and JSON documents
/// </summary>
public class VehicleDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("vin")]
    public string VIN { get; set; } = string.Empty;

    [JsonPropertyName("licensePlate")]
    public string? LicensePlate { get; set; }

    [JsonPropertyName("make")]
    public string Make { get; set; } = string.Empty;

    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;

    [JsonPropertyName("year")]
    public int Year { get; set; }

    [JsonPropertyName("vehicleType")]
    public VehicleTypeDocument VehicleType { get; set; } = new();

    [JsonPropertyName("currentMileage")]
    public decimal CurrentMileage { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Discriminated union representation for VehicleType
/// </summary>
public class VehicleTypeDocument
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("payloadCapacity")]
    public decimal? PayloadCapacity { get; set; }

    [JsonPropertyName("length")]
    public decimal? Length { get; set; }

    [JsonPropertyName("slideOuts")]
    public int? SlideOuts { get; set; }

    [JsonPropertyName("bodyStyle")]
    public string? BodyStyle { get; set; }

    [JsonPropertyName("engineCC")]
    public int? EngineCC { get; set; }
}

/// <summary>
/// ArangoDB document representation of Component aggregate
/// </summary>
public class ComponentDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("partNumber")]
    public string? PartNumber { get; set; }

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("location")]
    public ComponentLocationDocument Location { get; set; } = new();

    [JsonPropertyName("purchaseDate")]
    public DateTime? PurchaseDate { get; set; }

    [JsonPropertyName("purchasePrice")]
    public decimal? PurchasePrice { get; set; }

    [JsonPropertyName("warrantyExpiration")]
    public DateTime? WarrantyExpiration { get; set; }

    [JsonPropertyName("nextMaintenanceDate")]
    public DateTime? NextMaintenanceDate { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Discriminated union representation for ComponentLocation
/// </summary>
public class ComponentLocationDocument
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "InStorage";

    [JsonPropertyName("storageLocation")]
    public string? StorageLocation { get; set; }

    [JsonPropertyName("vehicleId")]
    public string? VehicleId { get; set; }

    [JsonPropertyName("installedDate")]
    public DateTime? InstalledDate { get; set; }
}

/// <summary>
/// Edge document for INSTALLED_ON relationship
/// </summary>
public class InstalledOnEdge
{
    [JsonPropertyName("_key")]
    public string? Key { get; set; }

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("_to")]
    public string To { get; set; } = string.Empty;

    [JsonPropertyName("installedDate")]
    public DateTime InstalledDate { get; set; }

    [JsonPropertyName("removedDate")]
    public DateTime? RemovedDate { get; set; }

    [JsonPropertyName("mileageAtInstall")]
    public decimal? MileageAtInstall { get; set; }
}

/// <summary>
/// Edge document for SERVICED relationship
/// </summary>
public class ServicedEdge
{
    [JsonPropertyName("_key")]
    public string? Key { get; set; }

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("_to")]
    public string To { get; set; } = string.Empty;

    [JsonPropertyName("serviceDate")]
    public DateTime ServiceDate { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("cost")]
    public decimal? Cost { get; set; }

    [JsonPropertyName("performedBy")]
    public string? PerformedBy { get; set; }

    [JsonPropertyName("mileage")]
    public decimal? Mileage { get; set; }
}
