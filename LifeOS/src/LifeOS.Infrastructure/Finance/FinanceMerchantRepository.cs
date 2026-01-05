using LifeOS.Domain.Finance;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Finance;

public sealed class FinanceMerchantRepository : IMerchantRepository
{
    private readonly ArangoDbContext _db;
    private const string Collection = ArangoDbContext.Collections.FinancialMerchants;

    public FinanceMerchantRepository(ArangoDbContext db)
    {
        _db = db;
    }

    public async Task<FSharpOption<Merchant>> GetById(MerchantId id)
    {
        try
        {
            var key = MerchantIdModule.value(id);
            var doc = await _db.Client.Document.GetDocumentAsync<FinancialMerchantDocument>(Collection, key);
            var domain = FinanceMappers.ToDomain(doc);
            return domain is null ? FSharpOption<Merchant>.None : FSharpOption<Merchant>.Some(domain);
        }
        catch
        {
            return FSharpOption<Merchant>.None;
        }
    }

    public async Task<FSharpList<Merchant>> GetAll()
    {
        var query = $"FOR doc IN {Collection} SORT doc.name ASC RETURN doc";
        var cursor = await _db.Client.Cursor.PostCursorAsync<FinancialMerchantDocument>(query);
        var results = cursor.Result
            .Select(FinanceMappers.ToDomain)
            .Where(m => m is not null)
            .Cast<Merchant>()
            .ToList();
        return ListModule.OfSeq(results);
    }

    public async Task<FSharpList<Merchant>> Search(string search)
    {
        var query = $@"
            FOR doc IN {Collection}
            FILTER CONTAINS(LOWER(doc.name), LOWER(@search))
            SORT doc.name ASC
            RETURN doc";
        var cursor = await _db.Client.Cursor.PostCursorAsync<FinancialMerchantDocument>(query,
            new Dictionary<string, object> { ["search"] = search });
        var results = cursor.Result
            .Select(FinanceMappers.ToDomain)
            .Where(m => m is not null)
            .Cast<Merchant>()
            .ToList();
        return ListModule.OfSeq(results);
    }

    public async Task<Merchant> Save(Merchant merchant)
    {
        var doc = FinanceMappers.ToDocument(merchant);
        try
        {
            await _db.Client.Document.GetDocumentAsync<FinancialMerchantDocument>(Collection, doc.Key);
            await _db.Client.Document.PutDocumentAsync($"{Collection}/{doc.Key}", doc);
        }
        catch
        {
            await _db.Client.Document.PostDocumentAsync(Collection, doc);
        }
        return merchant;
    }

    public async Task<Unit> Delete(MerchantId id)
    {
        var key = MerchantIdModule.value(id);
        try
        {
            await _db.Client.Document.DeleteDocumentAsync<FinancialMerchantDocument>(Collection, key);
        }
        catch
        {
            // Ignore if not found
        }
        return default(Unit);
    }
}
