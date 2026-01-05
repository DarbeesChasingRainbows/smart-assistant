using LifeOS.Domain.Garden;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Garden;

/// <summary>
/// ArangoDB implementation of crop batch repository for garden management.
/// Provides CRUD operations and specialized queries for crop batch tracking.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository handles the mapping between F# domain types and ArangoDB document storage.
/// It supports crop lifecycle management from planning through harvest.
/// All operations are asynchronous for optimal performance.
/// </remarks>
public class CropBatchRepository : ICropBatchRepository
{
    private readonly ArangoDbContext _context;
    private const string CollectionName = ArangoDbContext.Collections.CropBatches;

    /// <summary>
    /// Initializes a new instance of the <see cref="CropBatchRepository"/> class.
    /// </summary>
    /// <param name="context">The ArangoDB database context for data operations.</param>
    /// <exception cref="ArgumentNullException">Thrown when context is null.</exception>
    public CropBatchRepository(ArangoDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <summary>
    /// Retrieves a crop batch by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the crop batch.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{CropBatch}"/> with the crop batch if found,
    /// or <see cref="FSharpOption{CropBatch}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Uses ArangoDB's document key for efficient lookup.
    /// Handles database errors gracefully by returning None for missing collections.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails, caught and handled internally.
    /// </exception>
    public async Task<FSharpOption<CropBatch>> GetByIdAsync(CropBatchId id)
    {
        try
        {
            var guidId = GardenId.cropBatchIdValue(id);
            var query = $"FOR b IN {CollectionName} FILTER b.Key == @id RETURN b";
            var bindVars = new Dictionary<string, object> { { "id", guidId.ToString() } };
            var cursor = await _context.Client.Cursor.PostCursorAsync<CropBatchDocument>(query, bindVars);
            var doc = cursor.Result.FirstOrDefault();
            return doc == null ? FSharpOption<CropBatch>.None : FSharpOption<CropBatch>.Some(MapToDomain(doc));
        }
        catch (ArangoDBNetStandard.ApiErrorException ex) when (ex.Message.Contains("collection or view not found"))
        {
            // Collection doesn't exist yet
            return FSharpOption<CropBatch>.None;
        }
    }

    /// <summary>
    /// Retrieves all crop batches from the database.
    /// </summary>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{CropBatch}"/> with all crop batches.
    /// Returns an empty collection if no crop batches exist.
    /// </returns>
    /// <remarks>
    /// Returns all crop batches without filtering.
    /// Handles database errors gracefully by returning empty collection for missing collections.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails, caught and handled internally.
    /// </exception>
    public async Task<IEnumerable<CropBatch>> GetAllAsync()
    {
        try
        {
            var query = $"FOR b IN {CollectionName} RETURN b";
            var cursor = await _context.Client.Cursor.PostCursorAsync<CropBatchDocument>(query);
            return cursor.Result.Select(MapToDomain);
        }
        catch (ArangoDBNetStandard.ApiErrorException ex) when (ex.Message.Contains("collection or view not found"))
        {
            // Collection doesn't exist yet
            return Enumerable.Empty<CropBatch>();
        }
    }

    /// <summary>
    /// Adds a new crop batch to the database.
    /// </summary>
    /// <param name="batch">The crop batch to add.</param>
    /// <returns>A task containing the added crop batch.</returns>
    /// <remarks>
    /// Uses the crop batch's ID as the document key in ArangoDB.
    /// Timestamps are automatically managed by the database.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when batch is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document cannot be created due to validation or constraint violations.
    /// </exception>
    public async Task<CropBatch> AddAsync(CropBatch batch)
    {
        if (batch == null)
            throw new ArgumentNullException(nameof(batch));
        
        var doc = MapToDocument(batch);
        await _context.Client.Document.PostDocumentAsync(CollectionName, doc);
        return batch;
    }

    /// <summary>
    /// Updates an existing crop batch in the database.
    /// </summary>
    /// <param name="batch">The crop batch with updated values.</param>
    /// <returns>A task containing the updated crop batch.</returns>
    /// <remarks>
    /// Uses the crop batch's ID as the document key for the update operation.
    /// The UpdatedAt timestamp is automatically refreshed by the database.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when batch is null.</exception>
    /// <exception cref="InvalidOperationException">
    /// Thrown when the crop batch is not found in the database.
    /// </exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document doesn't exist or update fails due to validation errors.
    /// </exception>
    public async Task<CropBatch> UpdateAsync(CropBatch batch)
    {
        if (batch == null)
            throw new ArgumentNullException(nameof(batch));
        
        var doc = MapToDocument(batch);
        var domainId = GardenId.cropBatchIdValue(batch.Id).ToString();
        var keyQuery = $"FOR b IN {CollectionName} FILTER b.Key == @id RETURN b._key";
        var keyBindVars = new Dictionary<string, object> { { "id", domainId } };
        var keyCursor = await _context.Client.Cursor.PostCursorAsync<string>(keyQuery, keyBindVars);
        var arangoKey = keyCursor.Result.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(arangoKey)) throw new InvalidOperationException("Crop batch not found");
        await _context.Client.Document.PutDocumentAsync(CollectionName, arangoKey, doc);
        return batch;
    }

    /// <summary>
    /// Deletes a crop batch from the database.
    /// </summary>
    /// <param name="id">The unique identifier of the crop batch to delete.</param>
    /// <returns>
    /// A task containing <see langword="true"/> if the crop batch was successfully deleted;
    /// <see langword="false"/> if the crop batch was not found or deletion failed.
    /// </returns>
    /// <remarks>
    /// This is a permanent operation. Consider using status changes
    /// for soft deletion when audit trails are required.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when id is null.</exception>
    public async Task<bool> DeleteAsync(CropBatchId id)
    {
        if (id == null)
            throw new ArgumentNullException(nameof(id));
        
        try
        {
            var domainId = GardenId.cropBatchIdValue(id).ToString();
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

    /// <summary>
    /// Retrieves all crop batches for a specific species.
    /// </summary>
    /// <param name="speciesId">The unique identifier of the species.</param>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{CropBatch}"/> with matching crop batches.
    /// Returns an empty collection if no crop batches exist for the species.
    /// </returns>
    /// <remarks>
    /// Essential for species-specific crop management and analysis.
    /// Useful for tracking planting history and yield data by species.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when speciesId is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<IEnumerable<CropBatch>> GetBySpeciesIdAsync(SpeciesId speciesId)
    {
        if (speciesId == null)
            throw new ArgumentNullException(nameof(speciesId));
        
        var query = $"FOR b IN {CollectionName} FILTER b.SpeciesId == @sid RETURN b";
        var bindVars = new Dictionary<string, object> { { "sid", GardenId.speciesIdValue(speciesId).ToString() } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<CropBatchDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves all crop batches planted in a specific garden bed.
    /// </summary>
    /// <param name="bedId">The unique identifier of the garden bed.</param>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{CropBatch}"/> with matching crop batches.
    /// Returns an empty collection if no crop batches exist in the bed.
    /// </returns>
    /// <remarks>
    /// Essential for garden bed management and space utilization.
    /// Useful for planning crop rotations and bed-specific yield tracking.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when bedId is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<IEnumerable<CropBatch>> GetByGardenBedIdAsync(GardenBedId bedId)
    {
        if (bedId == null)
            throw new ArgumentNullException(nameof(bedId));
        
        var query = $"FOR b IN {CollectionName} FILTER b.GardenBedId == @bid RETURN b";
        var bindVars = new Dictionary<string, object> { { "bid", GardenId.gardenBedIdValue(bedId).ToString() } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<CropBatchDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves all crop batches with a specific status.
    /// </summary>
    /// <param name="status">The crop status to filter by.</param>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{CropBatch}"/> with matching crop batches.
    /// Returns an empty collection if no crop batches have the specified status.
    /// </returns>
    /// <remarks>
    /// Essential for crop lifecycle management and workflow tracking.
    /// Useful for monitoring planting progress and harvest readiness.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<IEnumerable<CropBatch>> GetByStatusAsync(CropStatus status)
    {
        var query = $"FOR b IN {CollectionName} FILTER b.Status == @st RETURN b";
        var bindVars = new Dictionary<string, object> { { "st", status.ToString() } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<CropBatchDocument>(query, bindVars);
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves all active crop batches (not yet completed).
    /// </summary>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{CropBatch}"/> with active crop batches.
    /// Returns an empty collection if no active crop batches exist.
    /// </returns>
    /// <remarks>
    /// Filters out batches with status: Harvested, Failed, or Terminated.
    /// Essential for current garden planning and resource allocation.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<IEnumerable<CropBatch>> GetActiveBatchesAsync()
    {
        var query = $"FOR b IN {CollectionName} FILTER b.Status NOT IN ['Harvested', 'Failed', 'Terminated'] RETURN b";
        var cursor = await _context.Client.Cursor.PostCursorAsync<CropBatchDocument>(query);
        return cursor.Result.Select(MapToDomain);
    }

    /// <summary>
    /// Retrieves all crop batches that are ready for harvest.
    /// </summary>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{CropBatch}"/> with harvestable crop batches.
    /// Returns an empty collection if no harvestable crop batches exist.
    /// </returns>
    /// <remarks>
    /// Filters for batches with "Fruiting" status.
    /// Essential for harvest planning and yield prediction.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<IEnumerable<CropBatch>> GetHarvestableBatchesAsync()
    {
        var query = $"FOR b IN {CollectionName} FILTER b.Status == 'Fruiting' RETURN b";
        var cursor = await _context.Client.Cursor.PostCursorAsync<CropBatchDocument>(query);
        return cursor.Result.Select(MapToDomain);
    }

    private CropBatch MapToDomain(CropBatchDocument doc) => new(
        CropBatchId.NewCropBatchId(Guid.Parse(doc.Key)),
        SpeciesId.NewSpeciesId(Guid.Parse(doc.SpeciesId)),
        string.IsNullOrEmpty(doc.GardenBedId) ? FSharpOption<GardenBedId>.None : FSharpOption<GardenBedId>.Some(GardenBedId.NewGardenBedId(Guid.Parse(doc.GardenBedId))),
        doc.BatchName,
        ParseCropStatus(doc.Status),
        Quantity.NewQuantity(doc.Quantity),
        doc.Unit,
        doc.DateSeeded.HasValue ? FSharpOption<DateTime>.Some(doc.DateSeeded.Value) : FSharpOption<DateTime>.None,
        doc.DateHarvested.HasValue ? FSharpOption<DateTime>.Some(doc.DateHarvested.Value) : FSharpOption<DateTime>.None,
        doc.ExpectedYield.HasValue ? FSharpOption<Quantity>.Some(Quantity.NewQuantity(doc.ExpectedYield.Value)) : FSharpOption<Quantity>.None,
        doc.ActualYield.HasValue ? FSharpOption<Quantity>.Some(Quantity.NewQuantity(doc.ActualYield.Value)) : FSharpOption<Quantity>.None,
        string.IsNullOrEmpty(doc.Quality) ? FSharpOption<string>.None : FSharpOption<string>.Some(doc.Quality),
        string.IsNullOrEmpty(doc.Notes) ? FSharpOption<string>.None : FSharpOption<string>.Some(doc.Notes),
        doc.CreatedAt, doc.UpdatedAt);

    private CropBatchDocument MapToDocument(CropBatch b) => new()
    {
        Key = GardenId.cropBatchIdValue(b.Id).ToString(),
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

public class CropBatchDocument
{
    public string Key { get; set; } = "";
    public string SpeciesId { get; set; } = "";
    public string? GardenBedId { get; set; }
    public string BatchName { get; set; } = "";
    public string Status { get; set; } = "Planned";
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = "seeds";
    public DateTime? DateSeeded { get; set; }
    public DateTime? DateHarvested { get; set; }
    public decimal? ExpectedYield { get; set; }
    public decimal? ActualYield { get; set; }
    public string? Quality { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
