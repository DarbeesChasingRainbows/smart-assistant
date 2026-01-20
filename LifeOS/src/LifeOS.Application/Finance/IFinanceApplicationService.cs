using LifeOS.Domain.Common;
using LifeOS.Domain.Finance;
using Microsoft.FSharp.Core;

namespace LifeOS.Application.Finance;

public interface IFinanceApplicationService
{
    Task<FSharpResult<TransferExecutionResult, DomainError>> ExecuteTransferAsync(
        CreateTransferCommand command,
        CancellationToken cancellationToken = default);

    Task<FSharpResult<Transaction, DomainError>> CreateTransactionAsync(
        CreateTransactionCommand command,
        CancellationToken cancellationToken = default);

    Task<FSharpResult<Transaction, DomainError>> UpdateTransactionAsync(
        UpdateTransactionCommand command,
        CancellationToken cancellationToken = default);

    Task<FSharpResult<Transaction, DomainError>> VoidTransactionAsync(
        string transactionKey,
        CancellationToken cancellationToken = default);

    Task<FSharpResult<Reconciliation, DomainError>> CreateReconciliationAsync(
        CreateReconciliationCommand command,
        CancellationToken cancellationToken = default);

    Task<FSharpResult<Reconciliation, DomainError>> MatchTransactionsAsync(
        MatchTransactionsCommand command,
        CancellationToken cancellationToken = default);

    Task<FSharpResult<Reconciliation, DomainError>> CompleteReconciliationAsync(
        CompleteReconciliationCommand command,
        CancellationToken cancellationToken = default);

    Task<FSharpResult<PeriodBudgetSummaryResult, DomainError>> GetPeriodBudgetSummaryAsync(
        GetPeriodBudgetSummaryCommand command,
        CancellationToken cancellationToken = default);

    Task<FSharpResult<UpsertPeriodBudgetResult, DomainError>> UpsertPeriodBudgetAsync(
        UpsertPeriodBudgetCommand command,
        CancellationToken cancellationToken = default);
}

public sealed record CreateTransferCommand(
    string FromAccountKey,
    string ToAccountKey,
    decimal Amount,
    string? Description,
    global::System.DateTime? PostedAt);

public sealed record TransferExecutionResult(
    string WithdrawalTransactionKey,
    string DepositTransactionKey,
    string TransferId);

public sealed record CreateTransactionCommand(
    string AccountKey,
    string? MerchantKey,
    string? CategoryKey,
    decimal Amount,
    string Description,
    string? Memo,
    global::System.DateTime? PostedAt,
    global::System.DateTime? AuthorizedAt,
    string? CheckNumber,
    List<string>? Tags);

public sealed record UpdateTransactionCommand(
    string TransactionKey,
    string? MerchantKey,
    string? CategoryKey,
    decimal? Amount,
    string? Description,
    string? Memo,
    global::System.DateTime? PostedAt,
    string? Status,
    string? CheckNumber,
    List<string>? Tags);

public sealed record CreateReconciliationCommand(
    string AccountKey,
    global::System.DateTime StatementDate,
    decimal StatementBalance);

public sealed record MatchTransactionsCommand(
    string ReconciliationKey,
    List<string> TransactionKeys);

public sealed record CompleteReconciliationCommand(
    string ReconciliationKey,
    string? Notes);

public sealed record GetPeriodBudgetSummaryCommand(
    global::System.DateTime StartDate,
    global::System.DateTime EndDate,
    string? PeriodType);

public sealed record UpsertPeriodBudgetCommand(
    string PeriodType,
    global::System.DateTime StartDate,
    global::System.DateTime EndDate,
    string CategoryKey,
    decimal BudgetedAmount,
    decimal? RolloverAmount,
    string? Notes);

public sealed record PeriodBudgetSummaryResult(
    BudgetPeriod Period,
    BudgetSummary Summary);

public sealed record UpsertPeriodBudgetResult(
    Budget Budget,
    bool Created);
