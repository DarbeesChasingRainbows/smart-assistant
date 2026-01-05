using System.Text.Json.Serialization;

namespace LifeOS.Infrastructure.Persistence.Documents;

public class VehicleMaintenanceRecordDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("vehicleId")]
    public string VehicleId { get; set; } = string.Empty;

    [JsonPropertyName("date")]
    public DateTime Date { get; set; }

    [JsonPropertyName("mileage")]
    public decimal? Mileage { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("cost")]
    public decimal? Cost { get; set; }

    [JsonPropertyName("performedBy")]
    public string? PerformedBy { get; set; }

    [JsonPropertyName("idempotencyKey")]
    public string? IdempotencyKey { get; set; }

    [JsonPropertyName("items")]
    public List<VehicleMaintenanceItemDocument> Items { get; set; } = [];
}

public class VehicleMaintenanceItemDocument
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("quantity")]
    public decimal? Quantity { get; set; }

    [JsonPropertyName("unit")]
    public string? Unit { get; set; }
}
