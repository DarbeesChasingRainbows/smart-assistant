using LifeOS.Domain.Finance;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Finance;

public sealed class FinanceUnitOfWork(
    IAccountRepository accounts,
    ITransactionRepository transactions,
    IJournalEntryRepository journalEntries,
    IMerchantRepository merchants,
    ICategoryRepository categories,
    IReceiptRepository receipts,
    IBudgetRepository budgets,
    IReconciliationRepository reconciliations,
    IPayPeriodConfigRepository payPeriodConfig
) : IFinanceUnitOfWork
{
    public IAccountRepository Accounts { get; } = accounts;
    public IMerchantRepository Merchants { get; } = merchants;
    public ICategoryRepository Categories { get; } = categories;
    public ITransactionRepository Transactions { get; } = transactions;
    public IJournalEntryRepository JournalEntries { get; } = journalEntries;
    public IReceiptRepository Receipts { get; } = receipts;
    public IBudgetRepository Budgets { get; } = budgets;
    public IReconciliationRepository Reconciliations { get; } = reconciliations;
    public IPayPeriodConfigRepository PayPeriodConfig { get; } = payPeriodConfig;

    public Task<Unit> CommitAsync() => Task.FromResult(default(Unit));
}
