using LifeOS.Domain.Garden;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Garden;

public class GardenBedRepository : IGardenBedRepository
{
    private readonly ArangoDbContext _context;
    private const string CollectionName = ArangoDbContext.Collections.GardenBeds;

    public GardenBedRepository(ArangoDbContext context)
    {
        _context = context;
    }

    public async Task<FSharpOption<GardenBed>> GetByIdAsync(GardenBedId id)
    {
        var guidId = GardenId.gardenBedIdValue(id);
        var query = $"FOR b IN {CollectionName} FILTER b.Key == @id RETURN b";
        var bindVars = new Dictionary<string, object> { { "id", guidId.ToString() } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<GardenBedDocument>(query, bindVars);
        var doc = cursor.Result.FirstOrDefault();
        return doc == null ? FSharpOption<GardenBed>.None : FSharpOption<GardenBed>.Some(MapToDomain(doc));
    }

    public async Task<IEnumerable<GardenBed>> GetAllAsync()
    {
        var query = $"FOR b IN {CollectionName} RETURN b";
        var cursor = await _context.Client.Cursor.PostCursorAsync<GardenBedDocument>(query);
        return cursor.Result.Select(MapToDomain);
    }

    public async Task<GardenBed> AddAsync(GardenBed bed)
    {
        var doc = MapToDocument(bed);
        await _context.Client.Document.PostDocumentAsync(CollectionName, doc);
        return bed;
    }

    public async Task<GardenBed> UpdateAsync(GardenBed bed)
    {
        var doc = MapToDocument(bed);
        var domainId = GardenId.gardenBedIdValue(bed.Id).ToString();
        var keyQuery = $"FOR b IN {CollectionName} FILTER b.Key == @id RETURN b._key";
        var keyBindVars = new Dictionary<string, object> { { "id", domainId } };
        var keyCursor = await _context.Client.Cursor.PostCursorAsync<string>(keyQuery, keyBindVars);
        var arangoKey = keyCursor.Result.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(arangoKey)) throw new InvalidOperationException("Garden bed not found");
        await _context.Client.Document.PutDocumentAsync(CollectionName, arangoKey, doc);
        return bed;
    }

    public async Task<bool> DeleteAsync(GardenBedId id)
    {
        try
        {
            var domainId = GardenId.gardenBedIdValue(id).ToString();
            var keyQuery = $"FOR b IN {CollectionName} FILTER b.Key == @id RETURN b._key";
            var keyBindVars = new Dictionary<string, object> { { "id", domainId } };
            var keyCursor = await _context.Client.Cursor.PostCursorAsync<string>(keyQuery, keyBindVars);
            var arangoKey = keyCursor.Result.FirstOrDefault();
            if (string.IsNullOrWhiteSpace(arangoKey)) return false;
            await _context.Client.Document.DeleteDocumentAsync(CollectionName, arangoKey);
            return true;
        }
        catch { return false; }
    }

    public async Task<IEnumerable<GardenBed>> GetActiveBedsAsync()
    {
        var query = $"FOR b IN {CollectionName} FILTER b.IsActive == true RETURN b";
        var cursor = await _context.Client.Cursor.PostCursorAsync<GardenBedDocument>(query);
        return cursor.Result.Select(MapToDomain);
    }

    public async Task<IEnumerable<GardenBed>> GetBySoilTypeAsync(SoilType soilType)
    {
        var query = $"FOR b IN {CollectionName} FILTER b.SoilType == @st RETURN b";
        var bindVars = new Dictionary<string, object> { { "st", soilType.ToString() } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<GardenBedDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    public async Task<IEnumerable<GardenBed>> GetByLocationAsync(string location)
    {
        var query = $"FOR b IN {CollectionName} FILTER CONTAINS(LOWER(b.Location), LOWER(@loc)) RETURN b";
        var bindVars = new Dictionary<string, object> { { "loc", location } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<GardenBedDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    private GardenBed MapToDomain(GardenBedDocument doc)
    {
        var geo =
            doc.Latitude.HasValue && doc.Longitude.HasValue
                ? FSharpOption<GeoReference>.Some(
                    new GeoReference(
                        new GeoPoint(doc.Latitude.Value, doc.Longitude.Value),
                        new GeoJsonPoint("Point", Tuple.Create(doc.Longitude.Value, doc.Latitude.Value)),
                        doc.ElevationMeters.HasValue ? FSharpOption<decimal>.Some(doc.ElevationMeters.Value) : FSharpOption<decimal>.None,
                        string.IsNullOrEmpty(doc.GeoNotes) ? FSharpOption<string>.None : FSharpOption<string>.Some(doc.GeoNotes)))
                : FSharpOption<GeoReference>.None;

        return new GardenBed(
            GardenBedId.NewGardenBedId(Guid.Parse(doc.Key)),
            doc.Name,
            string.IsNullOrEmpty(doc.Location) ? FSharpOption<string>.None : FSharpOption<string>.Some(doc.Location),
            geo,
            Area.NewArea(doc.Area),
            ParseSoilType(doc.SoilType),
            doc.HasIrrigation,
            doc.HasCover.HasValue ? FSharpOption<bool>.Some(doc.HasCover.Value) : FSharpOption<bool>.None,
            doc.IsActive,
            Microsoft.FSharp.Collections.ListModule.OfSeq(doc.PlantedSpecies?.Select(g => SpeciesId.NewSpeciesId(g)) ?? []),
            doc.CreatedAt,
            doc.UpdatedAt);
    }

    private GardenBedDocument MapToDocument(GardenBed b) => new()
    {
        Key = GardenId.gardenBedIdValue(b.Id).ToString(),
        Name = b.Name,
        Location = FSharpOption<string>.get_IsSome(b.Location) ? b.Location.Value : null,
        Latitude = FSharpOption<GeoReference>.get_IsSome(b.Geo) ? b.Geo.Value.Point.Latitude : null,
        Longitude = FSharpOption<GeoReference>.get_IsSome(b.Geo) ? b.Geo.Value.Point.Longitude : null,
        ElevationMeters = FSharpOption<GeoReference>.get_IsSome(b.Geo) && FSharpOption<decimal>.get_IsSome(b.Geo.Value.ElevationMeters)
            ? b.Geo.Value.ElevationMeters.Value
            : null,
        GeoNotes = FSharpOption<GeoReference>.get_IsSome(b.Geo) && FSharpOption<string>.get_IsSome(b.Geo.Value.Notes)
            ? b.Geo.Value.Notes.Value
            : null,
        Area = GardenInterop.GetAreaValue(b.Area),
        SoilType = b.SoilType.ToString(),
        HasIrrigation = b.HasIrrigation,
        HasCover = FSharpOption<bool>.get_IsSome(b.HasCover) ? b.HasCover.Value : null,
        IsActive = b.IsActive,
        PlantedSpecies = b.PlantedSpecies.Select(id => GardenId.speciesIdValue(id)).ToList(),
        CreatedAt = b.CreatedAt,
        UpdatedAt = b.UpdatedAt
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
}

public class GardenBedDocument
{
    public string Key { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Location { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public decimal? ElevationMeters { get; set; }
    public string? GeoNotes { get; set; }
    public decimal Area { get; set; }
    public string SoilType { get; set; } = "Loamy";
    public bool HasIrrigation { get; set; }
    public bool? HasCover { get; set; }
    public bool IsActive { get; set; } = true;
    public List<Guid> PlantedSpecies { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
