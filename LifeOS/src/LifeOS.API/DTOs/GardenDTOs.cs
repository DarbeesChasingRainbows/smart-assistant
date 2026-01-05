namespace LifeOS.API.DTOs;

public record MedicinalActionDto
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public string Description { get; init; } = "";
}

public record ActiveConstituentDto
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public string Class { get; init; } = "";
    public string? Description { get; init; }
}

public record MedicinalPropertiesDto
{
    public List<string> ActionIds { get; init; } = new();
    public List<string> ConstituentIds { get; init; } = new();
    public List<string> PrimaryIndications { get; init; } = new();
    public List<string> PartsUsed { get; init; } = new();
    public List<string> Contraindications { get; init; } = new();
    public List<string> DrugInteractions { get; init; } = new();
    public string SafetyClass { get; init; } = "Unknown";
    public string? StandardDosage { get; init; }
    public List<string> Preparations { get; init; } = new();
}

public record SpeciesDto
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public string? ScientificName { get; init; }
    public string? Variety { get; init; }
    public string PlantType { get; init; } = "Vegetable";
    public string GrowthHabit { get; init; } = "Bush";
    public string SunRequirement { get; init; } = "FullSun";
    public string WaterNeed { get; init; } = "Moderate";
    public string PreferredSoilType { get; init; } = "Loamy";
    public int? DaysToMaturity { get; init; }
    public decimal? SpacingRequirement { get; init; }
    public decimal? DepthRequirement { get; init; }
    public decimal? GerminationRate { get; init; }
    public bool FrostTolerance { get; init; }
    public List<string> PlantingSeasons { get; init; } = new();
    public List<string> HarvestSeasons { get; init; } = new();
    public string? Notes { get; init; }
    public MedicinalPropertiesDto? MedicinalProperties { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateSpeciesRequest
{
    public string Name { get; init; } = "";
    public string? ScientificName { get; init; }
    public string? Variety { get; init; }
    public string PlantType { get; init; } = "Vegetable";
    public string GrowthHabit { get; init; } = "Bush";
    public string SunRequirement { get; init; } = "FullSun";
    public string WaterNeed { get; init; } = "Moderate";
    public string PreferredSoilType { get; init; } = "Loamy";
    public int? DaysToMaturity { get; init; }
    public decimal? SpacingRequirement { get; init; }
    public decimal? DepthRequirement { get; init; }
    public decimal? GerminationRate { get; init; }
    public bool FrostTolerance { get; init; }
    public List<string>? PlantingSeasons { get; init; }
    public List<string>? HarvestSeasons { get; init; }
    public string? Notes { get; init; }
    public MedicinalPropertiesDto? MedicinalProperties { get; init; }
}

public record UpdateSpeciesRequest
{
    public string? Name { get; init; }
    public string? ScientificName { get; init; }
    public string? Variety { get; init; }
    public string? PlantType { get; init; }
    public int? DaysToMaturity { get; init; }
    public string? Notes { get; init; }
}

public record GardenBedDto
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public string? Location { get; init; }
    public decimal? Latitude { get; init; }
    public decimal? Longitude { get; init; }
    public decimal? ElevationMeters { get; init; }
    public string? GeoNotes { get; init; }
    public decimal Area { get; init; }
    public string SoilType { get; init; } = "Loamy";
    public bool HasIrrigation { get; init; }
    public bool? HasCover { get; init; }
    public bool IsActive { get; init; }
    public List<string> PlantedSpecies { get; init; } = new();
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateGardenBedRequest
{
    public string Name { get; init; } = "";
    public string? Location { get; init; }
    public decimal? Latitude { get; init; }
    public decimal? Longitude { get; init; }
    public decimal? ElevationMeters { get; init; }
    public string? GeoNotes { get; init; }
    public decimal Area { get; init; }
    public string SoilType { get; init; } = "Loamy";
    public bool HasIrrigation { get; init; }
    public bool? HasCover { get; init; }
}

public record UpdateGardenBedRequest
{
    public string? Name { get; init; }
    public string? Location { get; init; }
    public decimal? Latitude { get; init; }
    public decimal? Longitude { get; init; }
    public decimal? ElevationMeters { get; init; }
    public string? GeoNotes { get; init; }
    public decimal? Area { get; init; }
    public string? SoilType { get; init; }
    public bool? HasIrrigation { get; init; }
    public bool? HasCover { get; init; }
    public bool? IsActive { get; init; }
}

public record CropBatchDto
{
    public string Id { get; init; } = "";
    public string SpeciesId { get; init; } = "";
    public string? GardenBedId { get; init; }
    public string BatchName { get; init; } = "";
    public string Status { get; init; } = "Planned";
    public decimal Quantity { get; init; }
    public string Unit { get; init; } = "seeds";
    public DateTime? DateSeeded { get; init; }
    public DateTime? DateHarvested { get; init; }
    public decimal? ExpectedYield { get; init; }
    public decimal? ActualYield { get; init; }
    public string? Quality { get; init; }
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateCropBatchRequest
{
    public string SpeciesId { get; init; } = "";
    public string? GardenBedId { get; init; }
    public string BatchName { get; init; } = "";
    public decimal Quantity { get; init; }
    public string Unit { get; init; } = "seeds";
    public decimal? ExpectedYield { get; init; }
    public string? Notes { get; init; }
}

public record UpdateCropBatchRequest
{
    public string? Status { get; init; }
    public decimal? Quantity { get; init; }
    public decimal? ExpectedYield { get; init; }
    public decimal? ActualYield { get; init; }
    public string? Quality { get; init; }
    public string? Notes { get; init; }
}

public record SeedBatchRequest
{
    public decimal Quantity { get; init; }
    public DateTime? Date { get; init; }
}

public record HarvestBatchRequest
{
    public decimal ActualYield { get; init; }
    public string? Quality { get; init; }
    public DateTime? Date { get; init; }
}
