using LifeOS.Domain.Finance;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Finance;

public sealed class FinancePayPeriodConfigRepository : IPayPeriodConfigRepository
{
    private readonly ArangoDbContext _db;
    private const string Collection = ArangoDbContext.Collections.PayPeriodConfig;
    private const string DefaultKey = "default";

    public FinancePayPeriodConfigRepository(ArangoDbContext db)
    {
        _db = db;
    }

    public async Task<FSharpOption<PayPeriodConfig>> Get()
    {
        try
        {
            var doc = await _db.Client.Document.GetDocumentAsync<PayPeriodConfigDocument>(Collection, DefaultKey);
            var domain = FinanceMappers.ToDomain(doc);
            return domain is null ? FSharpOption<PayPeriodConfig>.None : FSharpOption<PayPeriodConfig>.Some(domain);
        }
        catch
        {
            return FSharpOption<PayPeriodConfig>.None;
        }
    }

    public async Task<PayPeriodConfig> Save(PayPeriodConfig config)
    {
        var doc = FinanceMappers.ToDocument(config);
        try
        {
            await _db.Client.Document.GetDocumentAsync<PayPeriodConfigDocument>(Collection, DefaultKey);
            await _db.Client.Document.PutDocumentAsync($"{Collection}/{DefaultKey}", doc);
        }
        catch
        {
            await _db.Client.Document.PostDocumentAsync(Collection, doc);
        }
        return config;
    }
}
