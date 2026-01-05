using LifeOS.Domain.Finance;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Finance;

/// <summary>
/// ArangoDB implementation of financial journal entry repository.
/// Provides CRUD operations for double-entry bookkeeping journal entries.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository handles financial journal entries for double-entry accounting.
/// All operations are asynchronous for optimal performance.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="FinanceJournalEntryRepository"/> class.
/// </remarks>
/// <param name="context">The ArangoDB database context for data operations.</param>
/// <exception cref="ArgumentNullException">Thrown when context is null.</exception>
public sealed class FinanceJournalEntryRepository(ArangoDbContext context) : IJournalEntryRepository
{
    private readonly ArangoDbContext _context =
        context ?? throw new ArgumentNullException(nameof(context));
    private const string CollectionName = ArangoDbContext.Collections.FinancialJournalEntries;

    /// <summary>
    /// Retrieves all journal entries for a specific transaction.
    /// </summary>
    /// <param name="transactionId">The unique identifier of the transaction.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpList{JournalEntry}"/> with matching entries.
    /// Returns an empty list if no entries exist for the transaction.
    /// </returns>
    /// <remarks>
    /// Filters entries by transaction key and sorts by creation date ascending.
    /// Essential for double-entry bookkeeping and transaction audit trails.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when transactionId is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpList<JournalEntry>> GetByTransaction(TransactionId transactionId)
    {
        ArgumentNullException.ThrowIfNull(transactionId);

        var key = TransactionIdModule.value(transactionId);
        var query =
            $@"
            FOR doc IN {CollectionName}
            FILTER doc.transactionKey == @key
            SORT doc.createdAt ASC
            RETURN doc";

        var cursor = await _context.Client.Cursor.PostCursorAsync<FinancialJournalEntryDocument>(
            query,
            new Dictionary<string, object> { ["key"] = key }
        );

        var entries = cursor
            .Result.Select(FinanceMappers.ToDomain)
            .Where(e => e is not null)
            .Cast<JournalEntry>();

        return ListModule.OfSeq(entries);
    }

    /// <summary>
    /// Saves a journal entry to the database.
    /// </summary>
    /// <param name="entry">The journal entry to save.</param>
    /// <returns>A task containing the saved journal entry.</returns>
    /// <remarks>
    /// Creates a new journal entry document in the database.
    /// Essential for recording double-entry bookkeeping transactions.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when entry is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document cannot be created due to validation or constraint violations.
    /// </exception>
    public async Task<JournalEntry> Save(JournalEntry entry)
    {
        ArgumentNullException.ThrowIfNull(entry);

        var doc = FinanceMappers.ToDocument(entry);
        await _context.Client.Document.PostDocumentAsync(CollectionName, doc);
        return entry;
    }

    /// <summary>
    /// Saves multiple journal entries to the database.
    /// </summary>
    /// <param name="entries">The collection of journal entries to save.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// Creates multiple journal entry documents in the database.
    /// Essential for batch operations and transaction recording.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when entries is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when any entry cannot be created due to validation or constraint violations.
    /// </exception>
    public async Task<Unit> SaveMany(FSharpList<JournalEntry> entries)
    {
        ArgumentNullException.ThrowIfNull(entries);

        foreach (var entry in entries)
        {
            var doc = FinanceMappers.ToDocument(entry);
            await _context.Client.Document.PostDocumentAsync(CollectionName, doc);
        }

        return default;
    }
}
