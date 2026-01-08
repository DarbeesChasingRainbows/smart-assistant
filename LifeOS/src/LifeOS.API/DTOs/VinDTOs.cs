namespace LifeOS.API.DTOs;

public record VinLookupResponse
{
    public string Vin { get; init; } = string.Empty;
    public string? Make { get; init; }
    public string? Model { get; init; }
    public int? Year { get; init; }
    public string? Trim { get; init; }
    public string? Engine { get; init; }
    public string? Transmission { get; init; }
    public string? VehicleType { get; init; }
    public string? Manufacturer { get; init; }
    public string? Plant { get; init; }
    public string? Series { get; init; }
    public string? Body { get; init; }
    public string? Fuel { get; init; }
    public string? Error { get; init; }
}
