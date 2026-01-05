namespace LifeOS.API.DTOs;

/// <summary>
/// Data Transfer Objects for Vehicle API endpoints
/// </summary>

public record VehicleDto
{
    public Guid Id { get; init; }
    public string VIN { get; init; } = string.Empty;
    public string? LicensePlate { get; init; }
    public string Make { get; init; } = string.Empty;
    public string Model { get; init; } = string.Empty;
    public int Year { get; init; }
    public VehicleTypeDto VehicleType { get; init; } = new();
    public decimal CurrentMileage { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record VehicleTypeDto
{
    public string Type { get; init; } = string.Empty;
    public decimal? PayloadCapacity { get; init; }
    public decimal? Length { get; init; }
    public int? SlideOuts { get; init; }
    public string? BodyStyle { get; init; }
    public int? EngineCC { get; init; }
}

public record CreateVehicleRequest
{
    public string VIN { get; init; } = string.Empty;
    public string? LicensePlate { get; init; }
    public string Make { get; init; } = string.Empty;
    public string Model { get; init; } = string.Empty;
    public int Year { get; init; }
    public VehicleTypeDto VehicleType { get; init; } = new();
}

public record UpdateVehicleRequest
{
    public string? LicensePlate { get; init; }
    public decimal? CurrentMileage { get; init; }
    public bool? IsActive { get; init; }
    public string? Make { get; init; }
    public string? Model { get; init; }
    public int? Year { get; init; }
    public VehicleTypeDto? VehicleType { get; init; }
}

public record VehicleListResponse
{
    public IEnumerable<VehicleDto> Vehicles { get; init; } = [];
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
}

public record ApiErrorResponse
{
    public string Error { get; init; } = string.Empty;
    public string? Details { get; init; }
}
