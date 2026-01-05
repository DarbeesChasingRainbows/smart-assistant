using LifeOS.Domain.Finance;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Finance;

/// <summary>
/// ArangoDB implementation of financial receipt repository with MinIO object storage integration.
/// Provides CRUD operations for receipt management and handles file storage operations.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository handles financial receipt operations including metadata storage in ArangoDB
/// and file storage in MinIO S3-compatible object storage. All operations are asynchronous for optimal performance.
/// Receipt files are stored in MinIO with metadata tracked in ArangoDB for efficient querying.
/// </remarks>
public sealed class FinanceReceiptRepository(ArangoDbContext db) : IReceiptRepository
{
    private readonly ArangoDbContext _db = db;
    private const string Collection = ArangoDbContext.Collections.FinancialReceipts;

    /// <summary>
    /// Retrieves a financial receipt by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the receipt.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{Receipt}"/> with the receipt if found,
    /// or <see cref="FSharpOption{Receipt}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Uses ArangoDB's document key for efficient lookup.
    /// Returns None for missing receipts without throwing exceptions.
    /// The receipt metadata includes the MinIO storage key for file access.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpOption<Receipt>> GetById(ReceiptId id)
    {
        try
        {
            var key = ReceiptIdModule.value(id);
            var doc = await _db.Client.Document.GetDocumentAsync<FinancialReceiptDocument>(
                Collection,
                key
            );
            var domain = FinanceMappers.ToDomain(doc);
            return domain is null ? FSharpOption<Receipt>.None : FSharpOption<Receipt>.Some(domain);
        }
        catch
        {
            return FSharpOption<Receipt>.None;
        }
    }

    /// <summary>
    /// Retrieves all financial receipts for a specific transaction.
    /// </summary>
    /// <param name="transactionId">The unique identifier of the transaction.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpList{Receipt}"/> with matching receipts.
    /// Returns an empty list if no receipts exist for the transaction.
    /// </returns>
    /// <remarks>
    /// Filters receipts by transaction key and sorts by creation date descending.
    /// Essential for transaction receipt tracking and audit trails.
    /// Each receipt contains MinIO storage information for file access.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when transactionId is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpList<Receipt>> GetByTransaction(TransactionId transactionId)
    {
        ArgumentNullException.ThrowIfNull(transactionId);

        var txKey = TransactionIdModule.value(transactionId);
        var query =
            $@"
            FOR doc IN {Collection}
            FILTER doc.transactionKey == @txKey
            SORT doc.createdAt DESC
            RETURN doc";
        var cursor = await _db.Client.Cursor.PostCursorAsync<FinancialReceiptDocument>(
            query,
            new Dictionary<string, object> { ["txKey"] = txKey }
        );
        var results = cursor
            .Result.Select(FinanceMappers.ToDomain)
            .Where(r => r is not null)
            .Cast<Receipt>()
            .ToList();
        return ListModule.OfSeq(results);
    }

    /// <summary>
    /// Retrieves all financial receipts with optional limit.
    /// </summary>
    /// <param name="limit">Maximum number of receipts to return.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpList{Receipt}"/> with receipts.
    /// Returns an empty list if no receipts exist.
    /// </returns>
    /// <remarks>
    /// Returns receipts sorted by creation date descending.
    /// Use with caution on large datasets as it loads all receipt metadata into memory.
    /// Each receipt contains MinIO storage information for file access.
    /// </remarks>
    /// <exception cref="ArgumentException">Thrown when limit is less than 0.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpList<Receipt>> GetAll(int limit)
    {
        if (limit < 0)
            throw new ArgumentException("Limit must be non-negative.", nameof(limit));

        var query =
            $@"
            FOR doc IN {Collection}
            SORT doc.createdAt DESC
            LIMIT @limit
            RETURN doc";
        var cursor = await _db.Client.Cursor.PostCursorAsync<FinancialReceiptDocument>(
            query,
            new Dictionary<string, object> { ["limit"] = limit }
        );
        var results = cursor
            .Result.Select(FinanceMappers.ToDomain)
            .Where(r => r is not null)
            .Cast<Receipt>()
            .ToList();
        return ListModule.OfSeq(results);
    }

    /// <summary>
    /// Saves a financial receipt to the database (create or update).
    /// </summary>
    /// <param name="receipt">The receipt to save.</param>
    /// <returns>A task containing the saved receipt.</returns>
    /// <remarks>
    /// Uses UPSERT operation by checking for document existence first.
    /// Creates new document if not found, updates existing if found.
    /// The receipt file should be uploaded to MinIO before saving metadata.
    /// The StorageKey field contains the MinIO object identifier for file access.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when receipt is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document cannot be saved due to validation or constraint violations.
    /// </exception>
    public async Task<Receipt> Save(Receipt receipt)
    {
        ArgumentNullException.ThrowIfNull(receipt);

        var doc = FinanceMappers.ToDocument(receipt);
        try
        {
            await _db.Client.Document.GetDocumentAsync<FinancialReceiptDocument>(
                Collection,
                doc.Key
            );
            await _db.Client.Document.PutDocumentAsync($"{Collection}/{doc.Key}", doc);
        }
        catch
        {
            await _db.Client.Document.PostDocumentAsync(Collection, doc);
        }
        return receipt;
    }
}
