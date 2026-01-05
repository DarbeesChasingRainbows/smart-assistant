using LifeOS.Domain.Garden;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Garden;

public class SpeciesRepository : ISpeciesRepository
{
    private readonly ArangoDbContext _context;
    private const string CollectionName = ArangoDbContext.Collections.Species;

    public SpeciesRepository(ArangoDbContext context)
    {
        _context = context;
    }

    public async Task<FSharpOption<Species>> GetByIdAsync(SpeciesId id)
    {
        try
        {
            var guidId = GardenId.speciesIdValue(id);
            var query = $"FOR s IN {CollectionName} FILTER s.Key == @id RETURN s";
            var bindVars = new Dictionary<string, object> { { "id", guidId.ToString() } };
            var cursor = await _context.Client.Cursor.PostCursorAsync<SpeciesDocument>(query, bindVars);
            var doc = cursor.Result.FirstOrDefault();
            return doc == null ? FSharpOption<Species>.None : FSharpOption<Species>.Some(MapToDomain(doc));
        }
        catch (ArangoDBNetStandard.ApiErrorException ex) when (ex.Message.Contains("collection or view not found"))
        {
            // Collection doesn't exist yet
            return FSharpOption<Species>.None;
        }
    }

    public async Task<IEnumerable<Species>> GetAllAsync()
    {
        try
        {
            var query = $"FOR s IN {CollectionName} RETURN s";
            var cursor = await _context.Client.Cursor.PostCursorAsync<SpeciesDocument>(query);
            return cursor.Result.Select(MapToDomain);
        }
        catch (ArangoDBNetStandard.ApiErrorException ex) when (ex.Message.Contains("collection or view not found"))
        {
            // Collection doesn't exist yet
            return Enumerable.Empty<Species>();
        }
    }

    public async Task<Species> AddAsync(Species species)
    {
        var doc = MapToDocument(species);
        await _context.Client.Document.PostDocumentAsync(CollectionName, doc);
        return species;
    }

    public async Task<Species> UpdateAsync(Species species)
    {
        var doc = MapToDocument(species);
        var domainId = GardenId.speciesIdValue(species.Id).ToString();
        var keyQuery = $"FOR s IN {CollectionName} FILTER s.Key == @id RETURN s._key";
        var keyBindVars = new Dictionary<string, object> { { "id", domainId } };
        var keyCursor = await _context.Client.Cursor.PostCursorAsync<string>(keyQuery, keyBindVars);
        var arangoKey = keyCursor.Result.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(arangoKey)) throw new InvalidOperationException("Species not found");
        await _context.Client.Document.PutDocumentAsync(CollectionName, arangoKey, doc);
        return species;
    }

    public async Task<bool> DeleteAsync(SpeciesId id)
    {
        try
        {
            var domainId = GardenId.speciesIdValue(id).ToString();
            var keyQuery = $"FOR s IN {CollectionName} FILTER s.Key == @id RETURN s._key";
            var keyBindVars = new Dictionary<string, object> { { "id", domainId } };
            var keyCursor = await _context.Client.Cursor.PostCursorAsync<string>(keyQuery, keyBindVars);
            var arangoKey = keyCursor.Result.FirstOrDefault();
            if (string.IsNullOrWhiteSpace(arangoKey)) return false;
            await _context.Client.Document.DeleteDocumentAsync(CollectionName, arangoKey);
            return true;
        }
        catch { return false; }
    }

    public async Task<IEnumerable<Species>> GetByPlantTypeAsync(PlantType plantType)
    {
        var query = $"FOR s IN {CollectionName} FILTER s.PlantType == @pt RETURN s";
        var bindVars = new Dictionary<string, object> { { "pt", plantType.ToString() } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<SpeciesDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    public async Task<IEnumerable<Species>> GetBySunRequirementAsync(SunRequirement sunReq)
    {
        var query = $"FOR s IN {CollectionName} FILTER s.SunRequirement == @sr RETURN s";
        var bindVars = new Dictionary<string, object> { { "sr", sunReq.ToString() } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<SpeciesDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    public async Task<IEnumerable<Species>> SearchAsync(string searchTerm)
    {
        var query = $"FOR s IN {CollectionName} FILTER CONTAINS(LOWER(s.Name), LOWER(@term)) OR CONTAINS(LOWER(s.ScientificName), LOWER(@term)) RETURN s";
        var bindVars = new Dictionary<string, object> { { "term", searchTerm } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<SpeciesDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    public async Task<IEnumerable<Species>> GetBySeasonAsync(Season season)
    {
        var query = $"FOR s IN {CollectionName} FILTER @season IN s.PlantingSeasons OR @season IN s.HarvestSeasons RETURN s";
        var bindVars = new Dictionary<string, object> { { "season", season.ToString() } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<SpeciesDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    private Species MapToDomain(SpeciesDocument doc) => new(
        SpeciesId.FromGuid(Guid.Parse(doc.Key)),
        doc.Name,
        string.IsNullOrEmpty(doc.ScientificName) ? FSharpOption<string>.None : FSharpOption<string>.Some(doc.ScientificName),
        string.IsNullOrEmpty(doc.Variety) ? FSharpOption<string>.None : FSharpOption<string>.Some(doc.Variety),
        ParsePlantType(doc.PlantType),
        ParseGrowthHabit(doc.GrowthHabit),
        ParseSunRequirement(doc.SunRequirement),
        ParseWaterNeed(doc.WaterNeed),
        ParseSoilType(doc.PreferredSoilType),
        doc.DaysToMaturity.HasValue ? FSharpOption<int>.Some(doc.DaysToMaturity.Value) : FSharpOption<int>.None,
        doc.SpacingRequirement.HasValue ? FSharpOption<Area>.Some(Area.NewArea(doc.SpacingRequirement.Value)) : FSharpOption<Area>.None,
        doc.DepthRequirement.HasValue ? FSharpOption<Depth>.Some(Depth.NewDepth(doc.DepthRequirement.Value)) : FSharpOption<Depth>.None,
        doc.GerminationRate.HasValue ? FSharpOption<Percentage>.Some(Percentage.NewPercentage(doc.GerminationRate.Value)) : FSharpOption<Percentage>.None,
        doc.FrostTolerance,
        Microsoft.FSharp.Collections.ListModule.OfSeq(doc.CompanionPlants?.Select(g => SpeciesId.FromGuid(g)) ?? []),
        Microsoft.FSharp.Collections.ListModule.OfSeq(doc.IncompatiblePlants?.Select(g => SpeciesId.FromGuid(g)) ?? []),
        Microsoft.FSharp.Collections.ListModule.OfSeq(doc.PlantingSeasons?.Select(ParseSeason) ?? []),
        Microsoft.FSharp.Collections.ListModule.OfSeq(doc.HarvestSeasons?.Select(ParseSeason) ?? []),
        FSharpOption<MedicinalProperties>.None, // MedicinalData
        string.IsNullOrEmpty(doc.Notes) ? FSharpOption<string>.None : FSharpOption<string>.Some(doc.Notes),
        doc.CreatedAt, doc.UpdatedAt);

    private SpeciesDocument MapToDocument(Species s) => new()
    {
        Key = GardenId.speciesIdValue(s.Id).ToString(),
        Name = s.Name,
        ScientificName = FSharpOption<string>.get_IsSome(s.ScientificName) ? s.ScientificName.Value : null,
        Variety = FSharpOption<string>.get_IsSome(s.Variety) ? s.Variety.Value : null,
        PlantType = s.PlantType.ToString(),
        GrowthHabit = s.GrowthHabit.ToString(),
        SunRequirement = s.SunRequirement.ToString(),
        WaterNeed = s.WaterNeed.ToString(),
        PreferredSoilType = s.PreferredSoilType.ToString(),
        DaysToMaturity = FSharpOption<int>.get_IsSome(s.DaysToMaturity) ? s.DaysToMaturity.Value : null,
        SpacingRequirement = FSharpOption<Area>.get_IsSome(s.SpacingRequirement) ? GardenInterop.GetAreaValue(s.SpacingRequirement.Value) : null,
        DepthRequirement = FSharpOption<Depth>.get_IsSome(s.DepthRequirement) ? GardenInterop.GetDepthValue(s.DepthRequirement.Value) : null,
        GerminationRate = FSharpOption<Percentage>.get_IsSome(s.GerminationRate) ? GardenInterop.GetPercentageValue(s.GerminationRate.Value) : null,
        FrostTolerance = s.FrostTolerance,
        CompanionPlants = s.CompanionPlants.Select(id => GardenId.speciesIdValue(id)).ToList(),
        IncompatiblePlants = s.IncompatiblePlants.Select(id => GardenId.speciesIdValue(id)).ToList(),
        PlantingSeasons = s.PlantingSeasons.Select(ss => ss.ToString()).ToList(),
        HarvestSeasons = s.HarvestSeasons.Select(ss => ss.ToString()).ToList(),
        Notes = FSharpOption<string>.get_IsSome(s.Notes) ? s.Notes.Value : null,
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt
    };

    private static PlantType ParsePlantType(string s) => s switch
    {
        "Vegetable" => PlantType.Vegetable,
        "Fruit" => PlantType.Fruit,
        "Herb" => PlantType.Herb,
        "Flower" => PlantType.Flower,
        "Grain" => PlantType.Grain,
        "CoverCrop" => PlantType.CoverCrop,
        _ => PlantType.NewOther(s)
    };
    private static GrowthHabit ParseGrowthHabit(string s) => s switch
    {
        "Determinate" => GrowthHabit.Determinate,
        "Indeterminate" => GrowthHabit.Indeterminate,
        "Bush" => GrowthHabit.Bush,
        "Vine" => GrowthHabit.Vine,
        _ => GrowthHabit.Compact
    };
    private static SunRequirement ParseSunRequirement(string s) => s switch
    {
        "FullSun" => SunRequirement.FullSun,
        "PartialSun" => SunRequirement.PartialSun,
        "PartialShade" => SunRequirement.PartialShade,
        _ => SunRequirement.FullShade
    };
    private static WaterNeed ParseWaterNeed(string s) => s switch
    {
        "Low" => WaterNeed.Low,
        "Moderate" => WaterNeed.Moderate,
        "High" => WaterNeed.High,
        _ => WaterNeed.VeryHigh
    };
    private static SoilType ParseSoilType(string s) => s switch
    {
        "Sandy" => SoilType.Sandy,
        "Clay" => SoilType.Clay,
        "Loamy" => SoilType.Loamy,
        "Silt" => SoilType.Silt,
        "Peaty" => SoilType.Peaty,
        _ => SoilType.Chalky
    };
    private static Season ParseSeason(string s) => s switch
    {
        "Spring" => Season.Spring,
        "Summer" => Season.Summer,
        "Fall" => Season.Fall,
        "Winter" => Season.Winter,
        _ => Season.YearRound
    };
}

public class SpeciesDocument
{
    public string Key { get; set; } = "";
    public string Name { get; set; } = "";
    public string? ScientificName { get; set; }
    public string? Variety { get; set; }
    public string PlantType { get; set; } = "Vegetable";
    public string GrowthHabit { get; set; } = "Bush";
    public string SunRequirement { get; set; } = "FullSun";
    public string WaterNeed { get; set; } = "Moderate";
    public string PreferredSoilType { get; set; } = "Loamy";
    public int? DaysToMaturity { get; set; }
    public decimal? SpacingRequirement { get; set; }
    public decimal? DepthRequirement { get; set; }
    public decimal? GerminationRate { get; set; }
    public bool FrostTolerance { get; set; }
    public List<Guid> CompanionPlants { get; set; } = new();
    public List<Guid> IncompatiblePlants { get; set; } = new();
    public List<string> PlantingSeasons { get; set; } = new();
    public List<string> HarvestSeasons { get; set; } = new();
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
