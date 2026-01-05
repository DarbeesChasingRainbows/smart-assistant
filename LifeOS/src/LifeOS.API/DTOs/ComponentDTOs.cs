namespace LifeOS.API.DTOs;

public record ComponentLocationDto
{
    public string Type { get; init; } = "InStorage";
    public string? StorageLocation { get; init; }
    public Guid? VehicleId { get; init; }
    public DateTime? InstalledDate { get; init; }
}

public record ComponentDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? PartNumber { get; init; }
    public string Category { get; init; } = string.Empty;
    public ComponentLocationDto Location { get; init; } = new();
    public DateTime? PurchaseDate { get; init; }
    public decimal? PurchaseCost { get; init; }
    public DateTime? WarrantyExpiry { get; init; }
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateComponentRequest
{
    public string Name { get; init; } = string.Empty;
    public string? PartNumber { get; init; }
    public string Category { get; init; } = "Other";
    public DateTime? PurchaseDate { get; init; }
    public decimal? PurchaseCost { get; init; }
    public DateTime? WarrantyExpiry { get; init; }
    public string? Notes { get; init; }
}

public record InstallComponentRequest
{
    public Guid VehicleId { get; init; }
}

public record UpdateComponentRequest
{
    public string? Name { get; init; }
    public string? PartNumber { get; init; }
    public string? Category { get; init; }
    public DateTime? PurchaseDate { get; init; }
    public decimal? PurchaseCost { get; init; }
    public DateTime? WarrantyExpiry { get; init; }
    public string? Notes { get; init; }
}
