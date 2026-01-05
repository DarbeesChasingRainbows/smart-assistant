using LifeOS.Domain.Finance;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Finance;

public sealed class FinanceTransactionRepository : ITransactionRepository
{
    private readonly ArangoDbContext _context;
    private const string CollectionName = ArangoDbContext.Collections.FinancialTransactions;

    public FinanceTransactionRepository(ArangoDbContext context)
    {
        _context = context;
    }

    public async Task<FSharpOption<Transaction>> GetById(TransactionId transactionId)
    {
        var key = TransactionIdModule.value(transactionId);
        var query = $"FOR doc IN {CollectionName} FILTER doc._key == @key RETURN doc";
        var cursor = await _context.Client.Cursor.PostCursorAsync<FinancialTransactionDocument>(
            query,
            new Dictionary<string, object> { ["key"] = key });

        var doc = cursor.Result.FirstOrDefault();
        var tx = FinanceMappers.ToDomain(doc);
        return tx is null ? FSharpOption<Transaction>.None : FSharpOption<Transaction>.Some(tx);
    }

    public async Task<FSharpList<Transaction>> GetByAccount(AccountId accountId)
    {
        var key = AccountIdModule.value(accountId);
        return await Query(
            FSharpOption<string>.Some(key),
            FSharpOption<string>.None,
            FSharpOption<DateTime>.None,
            FSharpOption<DateTime>.None,
            FSharpOption<string>.None,
            limit: 100,
            offset: 0);
    }

    public async Task<FSharpList<Transaction>> GetByCategory(CategoryId categoryId)
    {
        var key = CategoryIdModule.value(categoryId);
        return await Query(
            FSharpOption<string>.None,
            FSharpOption<string>.Some(key),
            FSharpOption<DateTime>.None,
            FSharpOption<DateTime>.None,
            FSharpOption<string>.None,
            limit: 100,
            offset: 0);
    }

    public async Task<FSharpList<Transaction>> GetByDateRange(DateTime start, DateTime end)
    {
        return await Query(
            FSharpOption<string>.None,
            FSharpOption<string>.None,
            FSharpOption<DateTime>.Some(start),
            FSharpOption<DateTime>.Some(end),
            FSharpOption<string>.None,
            limit: 100,
            offset: 0);
    }

    public async Task<FSharpList<Transaction>> GetByCategoryAndDateRange(CategoryId categoryId, DateTime start, DateTime end)
    {
        var key = CategoryIdModule.value(categoryId);
        return await Query(
            FSharpOption<string>.None,
            FSharpOption<string>.Some(key),
            FSharpOption<DateTime>.Some(start),
            FSharpOption<DateTime>.Some(end),
            FSharpOption<string>.None,
            limit: 100,
            offset: 0);
    }

    public async Task<FSharpList<Transaction>> Query(
        FSharpOption<string> accountKey,
        FSharpOption<string> categoryKey,
        FSharpOption<DateTime> startDate,
        FSharpOption<DateTime> endDate,
        FSharpOption<string> status,
        int limit,
        int offset)
    {
        var filters = new List<string>();
        var bindVars = new Dictionary<string, object>
        {
            ["offset"] = offset,
            ["limit"] = limit
        };

        if (FSharpOption<string>.get_IsSome(accountKey) && !string.IsNullOrWhiteSpace(accountKey.Value))
        {
            filters.Add("doc.accountKey == @accountKey");
            bindVars["accountKey"] = accountKey.Value;
        }

        if (FSharpOption<string>.get_IsSome(categoryKey) && !string.IsNullOrWhiteSpace(categoryKey.Value))
        {
            filters.Add("doc.categoryKey == @categoryKey");
            bindVars["categoryKey"] = categoryKey.Value;
        }

        if (FSharpOption<DateTime>.get_IsSome(startDate))
        {
            filters.Add("doc.postedAt >= @startDate");
            bindVars["startDate"] = startDate.Value.ToString("o");
        }

        if (FSharpOption<DateTime>.get_IsSome(endDate))
        {
            filters.Add("doc.postedAt <= @endDate");
            bindVars["endDate"] = endDate.Value.ToString("o");
        }

        if (FSharpOption<string>.get_IsSome(status) && !string.IsNullOrWhiteSpace(status.Value))
        {
            filters.Add("doc.status == @status");
            bindVars["status"] = status.Value;
        }

        var filterClause = filters.Count > 0 ? $"FILTER {string.Join(" AND ", filters)}" : string.Empty;

        var query = $@"
            FOR doc IN {CollectionName}
            {filterClause}
            SORT doc.postedAt DESC
            LIMIT @offset, @limit
            RETURN doc";

        var cursor = await _context.Client.Cursor.PostCursorAsync<FinancialTransactionDocument>(query, bindVars);

        var txs = cursor.Result
            .Select(FinanceMappers.ToDomain)
            .Where(t => t is not null)
            .Cast<Transaction>();

        return ListModule.OfSeq(txs);
    }

    public async Task<Transaction> Save(Transaction transaction)
    {
        var doc = FinanceMappers.ToDocument(transaction);
        await _context.Client.Document.PostDocumentAsync(CollectionName, doc);
        return transaction;
    }

    public async Task<Unit> SaveMany(FSharpList<Transaction> transactions)
    {
        foreach (var tx in transactions)
        {
            var doc = FinanceMappers.ToDocument(tx);
            await _context.Client.Document.PostDocumentAsync(CollectionName, doc);
        }

        return default(Unit);
    }
}
