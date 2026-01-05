using LifeOS.Domain.Finance;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Finance;

/// <summary>
/// ArangoDB implementation of financial category repository.
/// Provides CRUD operations and specialized queries for category management.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository handles financial category operations including type-based filtering
/// and hierarchical category management. All operations are asynchronous for optimal performance.
/// </remarks>
public sealed class FinanceCategoryRepository : ICategoryRepository
{
    private readonly ArangoDbContext _db;
    private const string Collection = ArangoDbContext.Collections.FinancialCategories;

    /// <summary>
    /// Initializes a new instance of the <see cref="FinanceCategoryRepository"/> class.
    /// </summary>
    /// <param name="db">The ArangoDB database context for data operations.</param>
    /// <exception cref="ArgumentNullException">Thrown when db is null.</exception>
    public FinanceCategoryRepository(ArangoDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    /// <summary>
    /// Retrieves a financial category by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the category.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{Category}"/> with the category if found,
    /// or <see cref="FSharpOption{Category}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Uses ArangoDB's document key for efficient lookup.
    /// Returns None for missing categories without throwing exceptions.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpOption<Category>> GetById(CategoryId id)
    {
        try
        {
            var key = CategoryIdModule.value(id);
            var doc = await _db.Client.Document.GetDocumentAsync<FinancialCategoryDocument>(Collection, key);
            var domain = FinanceMappers.ToDomain(doc);
            return domain is null ? FSharpOption<Category>.None : FSharpOption<Category>.Some(domain);
        }
        catch
        {
            return FSharpOption<Category>.None;
        }
    }

    /// <summary>
    /// Retrieves all financial categories sorted by name.
    /// </summary>
    /// <returns>
    /// A task containing an <see cref="FSharpList{Category}"/> with all categories.
    /// Returns an empty list if no categories exist.
    /// </returns>
    /// <remarks>
    /// Returns all categories sorted alphabetically by name.
    /// Use with caution on large datasets as it loads all categories into memory.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpList<Category>> GetAll()
    {
        var query = $"FOR doc IN {Collection} SORT doc.name ASC RETURN doc";
        var cursor = await _db.Client.Cursor.PostCursorAsync<FinancialCategoryDocument>(query);
        var results = cursor.Result
            .Select(FinanceMappers.ToDomain)
            .Where(c => c is not null)
            .Cast<Category>()
            .ToList();
        return ListModule.OfSeq(results);
    }

    /// <summary>
    /// Retrieves all financial categories of a specific type.
    /// </summary>
    /// <param name="categoryType">The category type to filter by.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpList{Category}"/> with matching categories.
    /// Returns an empty list if no categories match the type.
    /// </returns>
    /// <remarks>
    /// Filters categories by type and sorts alphabetically by name.
    /// Essential for type-based category organization and reporting.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpList<Category>> GetByType(CategoryType categoryType)
    {
        var typeStr = CategoryTypeModule.toString(categoryType);
        var query = $@"
            FOR doc IN {Collection}
            FILTER doc.type == @type
            SORT doc.name ASC
            RETURN doc";
        var cursor = await _db.Client.Cursor.PostCursorAsync<FinancialCategoryDocument>(query,
            new Dictionary<string, object> { ["type"] = typeStr });
        var results = cursor.Result
            .Select(FinanceMappers.ToDomain)
            .Where(c => c is not null)
            .Cast<Category>()
            .ToList();
        return ListModule.OfSeq(results);
    }

    /// <summary>
    /// Saves a financial category to the database (create or update).
    /// </summary>
    /// <param name="category">The category to save.</param>
    /// <returns>A task containing the saved category.</returns>
    /// <remarks>
    /// Uses UPSERT operation by checking for document existence first.
    /// Creates new document if not found, updates existing if found.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when category is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document cannot be saved due to validation or constraint violations.
    /// </exception>
    public async Task<Category> Save(Category category)
    {
        if (category == null)
            throw new ArgumentNullException(nameof(category));
        
        var doc = FinanceMappers.ToDocument(category);
        try
        {
            await _db.Client.Document.GetDocumentAsync<FinancialCategoryDocument>(Collection, doc.Key);
            await _db.Client.Document.PutDocumentAsync($"{Collection}/{doc.Key}", doc);
        }
        catch
        {
            await _db.Client.Document.PostDocumentAsync(Collection, doc);
        }
        return category;
    }
}
