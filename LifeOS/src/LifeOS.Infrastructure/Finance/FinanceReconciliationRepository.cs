using LifeOS.Domain.Finance;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Finance;

/// <summary>
/// ArangoDB implementation of financial reconciliation repository.
/// Provides CRUD operations and specialized queries for account reconciliation management.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository handles financial reconciliation operations including statement matching,
/// balance verification, and reconciliation status tracking. All operations are asynchronous for optimal performance.
/// </remarks>
public sealed class FinanceReconciliationRepository(ArangoDbContext db) : IReconciliationRepository
{
    private readonly ArangoDbContext _db = db;
    private const string Collection = ArangoDbContext.Collections.FinancialReconciliations;

    /// <summary>
    /// Retrieves a financial reconciliation by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the reconciliation.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{Reconciliation}"/> with the reconciliation if found,
    /// or <see cref="FSharpOption{Reconciliation}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Uses ArangoDB's document key for efficient lookup.
    /// Returns None for missing reconciliations without throwing exceptions.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpOption<Reconciliation>> GetById(ReconciliationId id)
    {
        try
        {
            var key = ReconciliationIdModule.value(id);
            var doc = await _db.Client.Document.GetDocumentAsync<FinancialReconciliationDocument>(
                Collection,
                key
            );
            var domain = FinanceMappers.ToDomain(doc);
            return domain is null
                ? FSharpOption<Reconciliation>.None
                : FSharpOption<Reconciliation>.Some(domain);
        }
        catch
        {
            return FSharpOption<Reconciliation>.None;
        }
    }

    /// <summary>
    /// Retrieves all financial reconciliations for a specific account.
    /// </summary>
    /// <param name="accountId">The unique identifier of the account.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpList{Reconciliation}"/> with matching reconciliations.
    /// Returns an empty list if no reconciliations exist for the account.
    /// </returns>
    /// <remarks>
    /// Filters reconciliations by account key and sorts by statement date descending.
    /// Essential for account reconciliation history and audit trails.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when accountId is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpList<Reconciliation>> GetByAccount(AccountId accountId)
    {
        ArgumentNullException.ThrowIfNull(accountId);

        var accKey = AccountIdModule.value(accountId);
        var query =
            $@"
            FOR doc IN {Collection}
            FILTER doc.accountKey == @accKey
            SORT doc.statementDate DESC
            RETURN doc";
        var cursor = await _db.Client.Cursor.PostCursorAsync<FinancialReconciliationDocument>(
            query,
            new Dictionary<string, object> { ["accKey"] = accKey }
        );
        var results = cursor
            .Result.Select(FinanceMappers.ToDomain)
            .Where(r => r is not null)
            .Cast<Reconciliation>()
            .ToList();
        return ListModule.OfSeq(results);
    }

    /// <summary>
    /// Retrieves the in-progress reconciliation for a specific account.
    /// </summary>
    /// <param name="accountId">The unique identifier of the account.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{Reconciliation}"/> with the in-progress reconciliation,
    /// or <see cref="FSharpOption{Reconciliation}.None"/> if no in-progress reconciliation exists.
    /// </returns>
    /// <remarks>
    /// Filters by account key and 'InProgress' status, returning only the first match.
    /// Essential for checking if a reconciliation is currently active for an account.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when accountId is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpOption<Reconciliation>> GetInProgress(AccountId accountId)
    {
        ArgumentNullException.ThrowIfNull(accountId);

        var accKey = AccountIdModule.value(accountId);
        var query =
            $@"
            FOR doc IN {Collection}
            FILTER doc.accountKey == @accKey AND doc.status == 'InProgress'
            LIMIT 1
            RETURN doc";
        var cursor = await _db.Client.Cursor.PostCursorAsync<FinancialReconciliationDocument>(
            query,
            new Dictionary<string, object> { ["accKey"] = accKey }
        );
        var doc = cursor.Result.FirstOrDefault();
        if (doc is null)
            return FSharpOption<Reconciliation>.None;
        var domain = FinanceMappers.ToDomain(doc);
        return domain is null
            ? FSharpOption<Reconciliation>.None
            : FSharpOption<Reconciliation>.Some(domain);
    }

    /// <summary>
    /// Saves a financial reconciliation to the database (create or update).
    /// </summary>
    /// <param name="reconciliation">The reconciliation to save.</param>
    /// <returns>A task containing the saved reconciliation.</returns>
    /// <remarks>
    /// Uses UPSERT operation by checking for document existence first.
    /// Creates new document if not found, updates existing if found.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when reconciliation is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document cannot be saved due to validation or constraint violations.
    /// </exception>
    public async Task<Reconciliation> Save(Reconciliation reconciliation)
    {
        ArgumentNullException.ThrowIfNull(reconciliation);

        var doc = FinanceMappers.ToDocument(reconciliation);
        try
        {
            await _db.Client.Document.GetDocumentAsync<FinancialReconciliationDocument>(
                Collection,
                doc.Key
            );
            await _db.Client.Document.PutDocumentAsync($"{Collection}/{doc.Key}", doc);
        }
        catch
        {
            await _db.Client.Document.PostDocumentAsync(Collection, doc);
        }
        return reconciliation;
    }
}
