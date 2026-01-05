using LifeOS.Domain.Finance;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Finance;

/// <summary>
/// ArangoDB implementation of financial budget repository.
/// Provides CRUD operations and specialized queries for budget management.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository handles budget operations including period-based budgeting
/// and category-specific budget tracking. All operations are asynchronous for optimal performance.
/// </remarks>
public sealed class FinanceBudgetRepository : IBudgetRepository
{
    private readonly ArangoDbContext _db;
    private const string Collection = ArangoDbContext.Collections.FinancialBudgets;

    /// <summary>
    /// Initializes a new instance of the <see cref="FinanceBudgetRepository"/> class.
    /// </summary>
    /// <param name="db">The ArangoDB database context for data operations.</param>
    /// <exception cref="ArgumentNullException">Thrown when db is null.</exception>
    public FinanceBudgetRepository(ArangoDbContext db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    /// <summary>
    /// Retrieves a budget by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the budget.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{Budget}"/> with the budget if found,
    /// or <see cref="FSharpOption{Budget}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Uses ArangoDB's document key for efficient lookup.
    /// Returns None for missing budgets without throwing exceptions.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpOption<Budget>> GetById(BudgetId id)
    {
        try
        {
            var key = BudgetIdModule.value(id);
            var doc = await _db.Client.Document.GetDocumentAsync<FinancialBudgetDocument>(Collection, key);
            var domain = FinanceMappers.ToDomain(doc);
            return domain is null ? FSharpOption<Budget>.None : FSharpOption<Budget>.Some(domain);
        }
        catch
        {
            return FSharpOption<Budget>.None;
        }
    }

    /// <summary>
    /// Retrieves all budgets for a specific budget period.
    /// </summary>
    /// <param name="period">The budget period to filter by.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpList{Budget}"/> with matching budgets.
    /// Returns an empty list if no budgets exist for the period.
    /// </returns>
    /// <remarks>
    /// Filters budgets by period key and sorts alphabetically by category.
    /// Essential for period-based budget analysis and reporting.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when period is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpList<Budget>> GetByPeriod(BudgetPeriod period)
    {
        if (period == null)
            throw new ArgumentNullException(nameof(period));
        
        var query = $@"
            FOR doc IN {Collection}
            FILTER doc.periodKey == @periodKey
            SORT doc.categoryKey ASC
            RETURN doc";
        var cursor = await _db.Client.Cursor.PostCursorAsync<FinancialBudgetDocument>(query,
            new Dictionary<string, object> { ["periodKey"] = period.PeriodKey });
        var results = cursor.Result
            .Select(FinanceMappers.ToDomain)
            .Where(b => b is not null)
            .Cast<Budget>()
            .ToList();
        return ListModule.OfSeq(results);
    }

    /// <summary>
    /// Retrieves a budget for a specific category and period.
    /// </summary>
    /// <param name="categoryId">The unique identifier of the category.</param>
    /// <param name="period">The budget period to filter by.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{Budget}"/> with the matching budget,
    /// or <see cref="FSharpOption{Budget}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Filters by both category and period for precise budget lookup.
    /// Essential for category-specific budget tracking and variance analysis.
    /// </remarks>
    /// <exception cref="ArgumentNullException">
    /// Thrown when categoryId or period is null.
    /// </exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpOption<Budget>> GetByCategoryAndPeriod(CategoryId categoryId, BudgetPeriod period)
    {
        if (categoryId == null)
            throw new ArgumentNullException(nameof(categoryId));
        if (period == null)
            throw new ArgumentNullException(nameof(period));
        
        var catKey = CategoryIdModule.value(categoryId);
        var query = $@"
            FOR doc IN {Collection}
            FILTER doc.categoryKey == @catKey AND doc.periodKey == @periodKey
            LIMIT 1
            RETURN doc";
        var cursor = await _db.Client.Cursor.PostCursorAsync<FinancialBudgetDocument>(query,
            new Dictionary<string, object>
            {
                ["catKey"] = catKey,
                ["periodKey"] = period.PeriodKey
            });
        var doc = cursor.Result.FirstOrDefault();
        if (doc is null) return FSharpOption<Budget>.None;
        var domain = FinanceMappers.ToDomain(doc);
        return domain is null ? FSharpOption<Budget>.None : FSharpOption<Budget>.Some(domain);
    }

    /// <summary>
    /// Retrieves all budgets for a specific period key.
    /// </summary>
    /// <param name="periodKey">The period key to filter by.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpList{Budget}"/> with matching budgets.
    /// Returns an empty list if no budgets exist for the period key.
    /// </returns>
    /// <remarks>
    /// Filters budgets by period key and sorts alphabetically by category.
    /// Useful for period-based budget analysis when using raw period keys.
    /// </remarks>
    /// <exception cref="ArgumentException">
    /// Thrown when periodKey is null or empty.
    /// </exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpList<Budget>> GetByPeriodKey(string periodKey)
    {
        if (string.IsNullOrWhiteSpace(periodKey))
            throw new ArgumentException("Period key cannot be null or empty.", nameof(periodKey));
        
        var query = $@"
            FOR doc IN {Collection}
            FILTER doc.periodKey == @periodKey
            SORT doc.categoryKey ASC
            RETURN doc";
        var cursor = await _db.Client.Cursor.PostCursorAsync<FinancialBudgetDocument>(query,
            new Dictionary<string, object> { ["periodKey"] = periodKey });
        var results = cursor.Result
            .Select(FinanceMappers.ToDomain)
            .Where(b => b is not null)
            .Cast<Budget>()
            .ToList();
        return ListModule.OfSeq(results);
    }

    /// <summary>
    /// Saves a budget to the database (create or update).
    /// </summary>
    /// <param name="budget">The budget to save.</param>
    /// <returns>A task containing the saved budget.</returns>
    /// <remarks>
    /// Uses UPSERT operation by checking for document existence first.
    /// Creates new document if not found, updates existing if found.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when budget is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document cannot be saved due to validation or constraint violations.
    /// </exception>
    public async Task<Budget> Save(Budget budget)
    {
        if (budget == null)
            throw new ArgumentNullException(nameof(budget));
        
        var doc = FinanceMappers.ToDocument(budget);
        try
        {
            await _db.Client.Document.GetDocumentAsync<FinancialBudgetDocument>(Collection, doc.Key);
            await _db.Client.Document.PutDocumentAsync($"{Collection}/{doc.Key}", doc);
        }
        catch
        {
            await _db.Client.Document.PostDocumentAsync(Collection, doc);
        }
        return budget;
    }

    /// <summary>
    /// Saves multiple budgets to the database.
    /// </summary>
    /// <param name="budgets">The collection of budgets to save.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// Saves each budget individually using the Save method.
    /// Essential for bulk budget operations and period initialization.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when budgets is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when any budget cannot be saved due to validation or constraint violations.
    /// </exception>
    public async Task<Unit> SaveMany(FSharpList<Budget> budgets)
    {
        if (budgets == null)
            throw new ArgumentNullException(nameof(budgets));
        
        foreach (var budget in budgets)
        {
            await Save(budget);
        }
        return default(Unit);
    }
}
