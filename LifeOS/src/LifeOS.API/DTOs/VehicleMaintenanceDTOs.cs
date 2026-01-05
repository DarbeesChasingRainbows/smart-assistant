namespace LifeOS.API.DTOs;

public record MaintenanceItemDto
{
    public string Type { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Url { get; init; }
    public decimal? Quantity { get; init; }
    public string? Unit { get; init; }
}

public record VehicleMaintenanceDto
{
    public Guid Id { get; init; }
    public Guid VehicleId { get; init; }
    public DateTime Date { get; init; }
    public decimal? Mileage { get; init; }
    public string Description { get; init; } = string.Empty;
    public decimal? Cost { get; init; }
    public string? PerformedBy { get; init; }
    public IEnumerable<MaintenanceItemDto> Items { get; init; } = [];
}

public record CreateVehicleMaintenanceRequest
{
    public DateTime Date { get; init; }
    public decimal? Mileage { get; init; }
    public string Description { get; init; } = string.Empty;
    public decimal? Cost { get; init; }
    public string? PerformedBy { get; init; }
    public IEnumerable<MaintenanceItemDto> Items { get; init; } = [];
}
