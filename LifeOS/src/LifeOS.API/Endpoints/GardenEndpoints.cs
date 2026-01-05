using LifeOS.API.DTOs;
using LifeOS.Domain.Garden;
using Microsoft.FSharp.Core;
using Microsoft.AspNetCore.Mvc;

namespace LifeOS.API.Endpoints;

public static class GardenEndpoints
{
    public static void MapGardenEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/garden").WithTags("Garden");

        // Species endpoints
        group.MapGet("/species", GetAllSpecies).WithName("GetAllSpecies");
        group.MapGet("/species/{id:guid}", GetSpeciesById).WithName("GetSpeciesById");
        group.MapPost("/species", CreateSpecies).WithName("CreateSpecies");
        group.MapPut("/species/{id:guid}", UpdateSpecies).WithName("UpdateSpecies");
        group.MapDelete("/species/{id:guid}", DeleteSpecies).WithName("DeleteSpecies");
        group.MapGet("/species/search", SearchSpecies).WithName("SearchSpecies");

        // Garden Bed endpoints
        group.MapGet("/beds", GetAllBeds).WithName("GetAllGardenBeds");
        group.MapGet("/beds/active", GetActiveBeds).WithName("GetActiveGardenBeds");
        group.MapGet("/beds/{id:guid}", GetBedById).WithName("GetGardenBedById");
        group.MapPost("/beds", CreateBed).WithName("CreateGardenBed");
        group.MapPut("/beds/{id:guid}", UpdateBed).WithName("UpdateGardenBed");
        group.MapDelete("/beds/{id:guid}", DeleteBed).WithName("DeleteGardenBed");

        // Crop Batch endpoints
        group.MapGet("/batches", GetAllBatches).WithName("GetAllCropBatches");
        group.MapGet("/batches/active", GetActiveBatches).WithName("GetActiveCropBatches");
        group.MapGet("/batches/harvestable", GetHarvestableBatches).WithName("GetHarvestableBatches");
        group.MapGet("/batches/{id:guid}", GetBatchById).WithName("GetCropBatchById");
        group.MapPost("/batches", CreateBatch).WithName("CreateCropBatch");
        group.MapPut("/batches/{id:guid}", UpdateBatch).WithName("UpdateCropBatch");
        group.MapDelete("/batches/{id:guid}", DeleteBatch).WithName("DeleteCropBatch");
        group.MapPost("/batches/{id:guid}/seed", SeedBatch).WithName("SeedCropBatch");
        group.MapPost("/batches/{id:guid}/germinate", GerminateBatch).WithName("GerminateCropBatch");
        group.MapPost("/batches/{id:guid}/harvest", HarvestBatch).WithName("HarvestCropBatch");
    }

    // Species handlers
    private static async Task<IResult> GetAllSpecies([FromServices] ISpeciesRepository repo)
    {
        var species = await repo.GetAllAsync();
        return Results.Ok(species.Select(MapSpeciesToDto));
    }

    private static async Task<IResult> GetSpeciesById(Guid id, [FromServices] ISpeciesRepository repo)
    {
        var speciesId = SpeciesId.NewSpeciesId(id);
        var speciesOpt = await repo.GetByIdAsync(speciesId);
        if (FSharpOption<Species>.get_IsNone(speciesOpt))
            return Results.NotFound(new ApiErrorResponse { Error = "Species not found" });
        return Results.Ok(MapSpeciesToDto(speciesOpt.Value!));
    }

    private static async Task<IResult> CreateSpecies(CreateSpeciesRequest req, [FromServices] ISpeciesRepository repo)
    {
        var species = new Species(
            GardenId.createSpeciesId(),
            req.Name,
            string.IsNullOrEmpty(req.ScientificName) ? FSharpOption<string>.None : FSharpOption<string>.Some(req.ScientificName),
            string.IsNullOrEmpty(req.Variety) ? FSharpOption<string>.None : FSharpOption<string>.Some(req.Variety),
            ParsePlantType(req.PlantType),
            ParseGrowthHabit(req.GrowthHabit),
            ParseSunRequirement(req.SunRequirement),
            ParseWaterNeed(req.WaterNeed),
            ParseSoilType(req.PreferredSoilType),
            req.DaysToMaturity.HasValue ? FSharpOption<int>.Some(req.DaysToMaturity.Value) : FSharpOption<int>.None,
            req.SpacingRequirement.HasValue ? FSharpOption<Area>.Some(Area.NewArea(req.SpacingRequirement.Value)) : FSharpOption<Area>.None,
            req.DepthRequirement.HasValue ? FSharpOption<Depth>.Some(Depth.NewDepth(req.DepthRequirement.Value)) : FSharpOption<Depth>.None,
            req.GerminationRate.HasValue ? FSharpOption<Percentage>.Some(Percentage.NewPercentage(req.GerminationRate.Value)) : FSharpOption<Percentage>.None,
            req.FrostTolerance,
            Microsoft.FSharp.Collections.ListModule.Empty<SpeciesId>(),
            Microsoft.FSharp.Collections.ListModule.Empty<SpeciesId>(),
            Microsoft.FSharp.Collections.ListModule.OfSeq(req.PlantingSeasons?.Select(ParseSeason) ?? new[] { Season.Spring, Season.Summer }),
            Microsoft.FSharp.Collections.ListModule.OfSeq(req.HarvestSeasons?.Select(ParseSeason) ?? new[] { Season.Summer, Season.Fall }),
            FSharpOption<LifeOS.Domain.Garden.MedicinalProperties>.None, // TODO: Add medicinal data in request
            string.IsNullOrEmpty(req.Notes) ? FSharpOption<string>.None : FSharpOption<string>.Some(req.Notes),
            DateTime.UtcNow, DateTime.UtcNow);

        var saved = await repo.AddAsync(species);
        return Results.Created($"/api/v1/garden/species/{GardenId.speciesIdValue(saved.Id)}", MapSpeciesToDto(saved));
    }

    private static async Task<IResult> UpdateSpecies(Guid id, UpdateSpeciesRequest req, [FromServices] ISpeciesRepository repo)
    {
        var speciesId = SpeciesId.NewSpeciesId(id);
        var speciesOpt = await repo.GetByIdAsync(speciesId);
        if (FSharpOption<Species>.get_IsNone(speciesOpt))
            return Results.NotFound(new ApiErrorResponse { Error = "Species not found" });

        var s = speciesOpt.Value!;
        var updated = new Species(s.Id, req.Name ?? s.Name, s.ScientificName, s.Variety,
            req.PlantType != null ? ParsePlantType(req.PlantType) : s.PlantType,
            s.GrowthHabit, s.SunRequirement, s.WaterNeed, s.PreferredSoilType,
            req.DaysToMaturity.HasValue ? FSharpOption<int>.Some(req.DaysToMaturity.Value) : s.DaysToMaturity,
            s.SpacingRequirement, s.DepthRequirement, s.GerminationRate, s.FrostTolerance,
            s.CompanionPlants, s.IncompatiblePlants, s.PlantingSeasons, s.HarvestSeasons,
            s.MedicinalData, // Preserve medicinal data
            req.Notes != null ? FSharpOption<string>.Some(req.Notes) : s.Notes,
            s.CreatedAt, DateTime.UtcNow);

        var saved = await repo.UpdateAsync(updated);
        return Results.Ok(MapSpeciesToDto(saved));
    }

    private static async Task<IResult> DeleteSpecies(Guid id, [FromServices] ISpeciesRepository repo)
    {
        var speciesId = SpeciesId.NewSpeciesId(id);
        var success = await repo.DeleteAsync(speciesId);
        return success ? Results.NoContent() : Results.NotFound(new ApiErrorResponse { Error = "Species not found" });
    }

    private static async Task<IResult> SearchSpecies(string q, [FromServices] ISpeciesRepository repo)
    {
        var species = await repo.SearchAsync(q);
        return Results.Ok(species.Select(MapSpeciesToDto));
    }

    // Garden Bed handlers
    private static async Task<IResult> GetAllBeds([FromServices] IGardenBedRepository repo)
    {
        var beds = await repo.GetAllAsync();
        return Results.Ok(beds.Select(MapBedToDto));
    }

    private static async Task<IResult> GetActiveBeds([FromServices] IGardenBedRepository repo)
    {
        var beds = await repo.GetActiveBedsAsync();
        return Results.Ok(beds.Select(MapBedToDto));
    }

    private static async Task<IResult> GetBedById(Guid id, [FromServices] IGardenBedRepository repo)
    {
        var bedId = GardenBedId.NewGardenBedId(id);
        var bedOpt = await repo.GetByIdAsync(bedId);
        if (FSharpOption<GardenBed>.get_IsNone(bedOpt))
            return Results.NotFound(new ApiErrorResponse { Error = "Garden bed not found" });
        return Results.Ok(MapBedToDto(bedOpt.Value!));
    }

    private static async Task<IResult> CreateBed(CreateGardenBedRequest req, [FromServices] IGardenBedRepository repo)
    {
        var geo =
            req.Latitude.HasValue && req.Longitude.HasValue
                ? FSharpOption<GeoReference>.Some(
                    new GeoReference(
                        new GeoPoint(req.Latitude.Value, req.Longitude.Value),
                        new GeoJsonPoint("Point", Tuple.Create(req.Longitude.Value, req.Latitude.Value)),
                        req.ElevationMeters.HasValue ? FSharpOption<decimal>.Some(req.ElevationMeters.Value) : FSharpOption<decimal>.None,
                        string.IsNullOrEmpty(req.GeoNotes) ? FSharpOption<string>.None : FSharpOption<string>.Some(req.GeoNotes)))
                : FSharpOption<GeoReference>.None;

        var bed = new GardenBed(GardenId.createGardenBedId(), req.Name,
            string.IsNullOrEmpty(req.Location) ? FSharpOption<string>.None : FSharpOption<string>.Some(req.Location),
            geo,
            Area.NewArea(req.Area), ParseSoilType(req.SoilType), req.HasIrrigation,
            req.HasCover.HasValue ? FSharpOption<bool>.Some(req.HasCover.Value) : FSharpOption<bool>.None,
            true, Microsoft.FSharp.Collections.ListModule.Empty<SpeciesId>(), DateTime.UtcNow, DateTime.UtcNow);

        var saved = await repo.AddAsync(bed);
        return Results.Created($"/api/v1/garden/beds/{GardenId.gardenBedIdValue(saved.Id)}", MapBedToDto(saved));
    }

    private static async Task<IResult> UpdateBed(Guid id, UpdateGardenBedRequest req, [FromServices] IGardenBedRepository repo)
    {
        var bedId = GardenBedId.NewGardenBedId(id);
        var bedOpt = await repo.GetByIdAsync(bedId);
        if (FSharpOption<GardenBed>.get_IsNone(bedOpt))
            return Results.NotFound(new ApiErrorResponse { Error = "Garden bed not found" });

        var b = bedOpt.Value!;

        var geo =
            req.Latitude.HasValue && req.Longitude.HasValue
                ? FSharpOption<GeoReference>.Some(
                    new GeoReference(
                        new GeoPoint(req.Latitude.Value, req.Longitude.Value),
                        new GeoJsonPoint("Point", Tuple.Create(req.Longitude.Value, req.Latitude.Value)),
                        req.ElevationMeters.HasValue ? FSharpOption<decimal>.Some(req.ElevationMeters.Value) : FSharpOption<decimal>.None,
                        string.IsNullOrEmpty(req.GeoNotes) ? FSharpOption<string>.None : FSharpOption<string>.Some(req.GeoNotes)))
                : b.Geo;

        var updated = new GardenBed(b.Id, req.Name ?? b.Name,
            req.Location != null ? FSharpOption<string>.Some(req.Location) : b.Location,
            geo,
            req.Area.HasValue ? Area.NewArea(req.Area.Value) : b.Area,
            req.SoilType != null ? ParseSoilType(req.SoilType) : b.SoilType,
            req.HasIrrigation ?? b.HasIrrigation,
            req.HasCover.HasValue ? FSharpOption<bool>.Some(req.HasCover.Value) : b.HasCover,
            req.IsActive ?? b.IsActive, b.PlantedSpecies, b.CreatedAt, DateTime.UtcNow);

        var saved = await repo.UpdateAsync(updated);
        return Results.Ok(MapBedToDto(saved));
    }

    private static async Task<IResult> DeleteBed(Guid id, [FromServices] IGardenBedRepository repo)
    {
        var bedId = GardenBedId.NewGardenBedId(id);
        var success = await repo.DeleteAsync(bedId);
        return success ? Results.NoContent() : Results.NotFound(new ApiErrorResponse { Error = "Garden bed not found" });
    }

    // Crop Batch handlers
    private static async Task<IResult> GetAllBatches([FromServices] ICropBatchRepository repo)
    {
        var batches = await repo.GetAllAsync();
        return Results.Ok(batches.Select(MapBatchToDto));
    }

    private static async Task<IResult> GetActiveBatches([FromServices] ICropBatchRepository repo)
    {
        var batches = await repo.GetActiveBatchesAsync();
        return Results.Ok(batches.Select(MapBatchToDto));
    }

    private static async Task<IResult> GetHarvestableBatches([FromServices] ICropBatchRepository repo)
    {
        var batches = await repo.GetHarvestableBatchesAsync();
        return Results.Ok(batches.Select(MapBatchToDto));
    }

    private static async Task<IResult> GetBatchById(Guid id, [FromServices] ICropBatchRepository repo)
    {
        var batchId = CropBatchId.NewCropBatchId(id);
        var batchOpt = await repo.GetByIdAsync(batchId);
        if (FSharpOption<CropBatch>.get_IsNone(batchOpt))
            return Results.NotFound(new ApiErrorResponse { Error = "Crop batch not found" });
        return Results.Ok(MapBatchToDto(batchOpt.Value!));
    }

    private static async Task<IResult> CreateBatch(CreateCropBatchRequest req, [FromServices] ICropBatchRepository repo)
    {
        var batch = new CropBatch(GardenId.createCropBatchId(),
            SpeciesId.NewSpeciesId(Guid.Parse(req.SpeciesId)),
            string.IsNullOrEmpty(req.GardenBedId) ? FSharpOption<GardenBedId>.None : FSharpOption<GardenBedId>.Some(GardenBedId.NewGardenBedId(Guid.Parse(req.GardenBedId))),
            req.BatchName, CropStatus.Planned, Quantity.NewQuantity(req.Quantity), req.Unit,
            FSharpOption<DateTime>.None, FSharpOption<DateTime>.None,
            req.ExpectedYield.HasValue ? FSharpOption<Quantity>.Some(Quantity.NewQuantity(req.ExpectedYield.Value)) : FSharpOption<Quantity>.None,
            FSharpOption<Quantity>.None, FSharpOption<string>.None,
            string.IsNullOrEmpty(req.Notes) ? FSharpOption<string>.None : FSharpOption<string>.Some(req.Notes),
            DateTime.UtcNow, DateTime.UtcNow);

        var saved = await repo.AddAsync(batch);
        return Results.Created($"/api/v1/garden/batches/{GardenId.cropBatchIdValue(saved.Id)}", MapBatchToDto(saved));
    }

    private static async Task<IResult> UpdateBatch(Guid id, UpdateCropBatchRequest req, [FromServices] ICropBatchRepository repo)
    {
        var batchId = CropBatchId.NewCropBatchId(id);
        var batchOpt = await repo.GetByIdAsync(batchId);
        if (FSharpOption<CropBatch>.get_IsNone(batchOpt))
            return Results.NotFound(new ApiErrorResponse { Error = "Crop batch not found" });

        var b = batchOpt.Value!;
        var updated = new CropBatch(b.Id, b.SpeciesId, b.GardenBedId, b.BatchName,
            req.Status != null ? ParseCropStatus(req.Status) : b.Status,
            req.Quantity.HasValue ? Quantity.NewQuantity(req.Quantity.Value) : b.Quantity,
            b.Unit, b.DateSeeded, b.DateHarvested,
            req.ExpectedYield.HasValue ? FSharpOption<Quantity>.Some(Quantity.NewQuantity(req.ExpectedYield.Value)) : b.ExpectedYield,
            req.ActualYield.HasValue ? FSharpOption<Quantity>.Some(Quantity.NewQuantity(req.ActualYield.Value)) : b.ActualYield,
            req.Quality != null ? FSharpOption<string>.Some(req.Quality) : b.Quality,
            req.Notes != null ? FSharpOption<string>.Some(req.Notes) : b.Notes,
            b.CreatedAt, DateTime.UtcNow);

        var saved = await repo.UpdateAsync(updated);
        return Results.Ok(MapBatchToDto(saved));
    }

    private static async Task<IResult> DeleteBatch(Guid id, [FromServices] ICropBatchRepository repo)
    {
        var batchId = CropBatchId.NewCropBatchId(id);
        var success = await repo.DeleteAsync(batchId);
        return success ? Results.NoContent() : Results.NotFound(new ApiErrorResponse { Error = "Crop batch not found" });
    }

    private static async Task<IResult> SeedBatch(Guid id, SeedBatchRequest req, [FromServices] ICropBatchRepository repo)
    {
        var batchId = CropBatchId.NewCropBatchId(id);
        var batchOpt = await repo.GetByIdAsync(batchId);
        if (FSharpOption<CropBatch>.get_IsNone(batchOpt))
            return Results.NotFound(new ApiErrorResponse { Error = "Crop batch not found" });

        var b = batchOpt.Value!;
        var updated = new CropBatch(b.Id, b.SpeciesId, b.GardenBedId, b.BatchName, CropStatus.Seeded,
            Quantity.NewQuantity(req.Quantity), b.Unit,
            FSharpOption<DateTime>.Some(req.Date ?? DateTime.UtcNow),
            b.DateHarvested, b.ExpectedYield, b.ActualYield, b.Quality, b.Notes, b.CreatedAt, DateTime.UtcNow);

        var saved = await repo.UpdateAsync(updated);
        return Results.Ok(MapBatchToDto(saved));
    }

    private static async Task<IResult> GerminateBatch(Guid id, [FromServices] ICropBatchRepository repo)
    {
        var batchId = CropBatchId.NewCropBatchId(id);
        var batchOpt = await repo.GetByIdAsync(batchId);
        if (FSharpOption<CropBatch>.get_IsNone(batchOpt))
            return Results.NotFound(new ApiErrorResponse { Error = "Crop batch not found" });

        var b = batchOpt.Value!;
        var updated = new CropBatch(b.Id, b.SpeciesId, b.GardenBedId, b.BatchName, CropStatus.Germinated,
            b.Quantity, b.Unit, b.DateSeeded, b.DateHarvested, b.ExpectedYield, b.ActualYield, b.Quality, b.Notes, b.CreatedAt, DateTime.UtcNow);

        var saved = await repo.UpdateAsync(updated);
        return Results.Ok(MapBatchToDto(saved));
    }

    private static async Task<IResult> HarvestBatch(Guid id, HarvestBatchRequest req, [FromServices] ICropBatchRepository repo)
    {
        var batchId = CropBatchId.NewCropBatchId(id);
        var batchOpt = await repo.GetByIdAsync(batchId);
        if (FSharpOption<CropBatch>.get_IsNone(batchOpt))
            return Results.NotFound(new ApiErrorResponse { Error = "Crop batch not found" });

        var b = batchOpt.Value!;
        var updated = new CropBatch(b.Id, b.SpeciesId, b.GardenBedId, b.BatchName, CropStatus.Harvested,
            b.Quantity, b.Unit, b.DateSeeded,
            FSharpOption<DateTime>.Some(req.Date ?? DateTime.UtcNow),
            b.ExpectedYield, FSharpOption<Quantity>.Some(Quantity.NewQuantity(req.ActualYield)),
            string.IsNullOrEmpty(req.Quality) ? b.Quality : FSharpOption<string>.Some(req.Quality),
            b.Notes, b.CreatedAt, DateTime.UtcNow);

        var saved = await repo.UpdateAsync(updated);
        return Results.Ok(MapBatchToDto(saved));
    }

    // Mapping helpers
    private static SpeciesDto MapSpeciesToDto(Species s) => new()
    {
        Id = GardenId.speciesIdValue(s.Id).ToString(),
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
        PlantingSeasons = s.PlantingSeasons.Select(ss => ss.ToString()).ToList(),
        HarvestSeasons = s.HarvestSeasons.Select(ss => ss.ToString()).ToList(),
        Notes = FSharpOption<string>.get_IsSome(s.Notes) ? s.Notes.Value : null,
        MedicinalProperties = null, // Placeholder: Species aggregate needs migration or separate Monograph lookup
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt
    };

    private static GardenBedDto MapBedToDto(GardenBed b) => new()
    {
        Id = GardenId.gardenBedIdValue(b.Id).ToString(),
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
        PlantedSpecies = b.PlantedSpecies.Select(id => GardenId.speciesIdValue(id).ToString()).ToList(),
        CreatedAt = b.CreatedAt,
        UpdatedAt = b.UpdatedAt
    };

    private static CropBatchDto MapBatchToDto(CropBatch b) => new()
    {
        Id = GardenId.cropBatchIdValue(b.Id).ToString(),
        SpeciesId = GardenId.speciesIdValue(b.SpeciesId).ToString(),
        GardenBedId = FSharpOption<GardenBedId>.get_IsSome(b.GardenBedId) ? GardenId.gardenBedIdValue(b.GardenBedId.Value).ToString() : null,
        BatchName = b.BatchName,
        Status = b.Status.ToString(),
        Quantity = GardenInterop.GetQuantityValue(b.Quantity),
        Unit = b.Unit,
        DateSeeded = FSharpOption<DateTime>.get_IsSome(b.DateSeeded) ? b.DateSeeded.Value : null,
        DateHarvested = FSharpOption<DateTime>.get_IsSome(b.DateHarvested) ? b.DateHarvested.Value : null,
        ExpectedYield = FSharpOption<Quantity>.get_IsSome(b.ExpectedYield) ? GardenInterop.GetQuantityValue(b.ExpectedYield.Value) : null,
        ActualYield = FSharpOption<Quantity>.get_IsSome(b.ActualYield) ? GardenInterop.GetQuantityValue(b.ActualYield.Value) : null,
        Quality = FSharpOption<string>.get_IsSome(b.Quality) ? b.Quality.Value : null,
        Notes = FSharpOption<string>.get_IsSome(b.Notes) ? b.Notes.Value : null,
        CreatedAt = b.CreatedAt,
        UpdatedAt = b.UpdatedAt
    };

    // Parse helpers
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
    private static CropStatus ParseCropStatus(string s) => s switch
    {
        "Planned" => CropStatus.Planned,
        "Seeded" => CropStatus.Seeded,
        "Germinated" => CropStatus.Germinated,
        "Growing" => CropStatus.Growing,
        "Flowering" => CropStatus.Flowering,
        "Fruiting" => CropStatus.Fruiting,
        "Harvested" => CropStatus.Harvested,
        "Failed" => CropStatus.Failed,
        _ => CropStatus.Terminated
    };
}
