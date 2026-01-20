using LifeOS.Domain.Common;
using LifeOS.Domain.Finance;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Application.Finance;

public sealed class FinanceApplicationService : IFinanceApplicationService
{
    private readonly IFinanceUnitOfWork _uow;

    public FinanceApplicationService(IFinanceUnitOfWork uow)
    {
        _uow = uow;
    }

    public Task<FSharpResult<TransferExecutionResult, DomainError>> ExecuteTransferAsync(
        CreateTransferCommand command,
        CancellationToken cancellationToken = default
    )
    {
        return ExecuteTransferInternalAsync(command);
    }

    public Task<FSharpResult<Transaction, DomainError>> CreateTransactionAsync(
        CreateTransactionCommand command,
        CancellationToken cancellationToken = default
    )
    {
        return CreateTransactionInternalAsync(command);
    }

    public Task<FSharpResult<Transaction, DomainError>> UpdateTransactionAsync(
        UpdateTransactionCommand command,
        CancellationToken cancellationToken = default
    )
    {
        return UpdateTransactionInternalAsync(command);
    }

    public Task<FSharpResult<Transaction, DomainError>> VoidTransactionAsync(
        string transactionKey,
        CancellationToken cancellationToken = default
    )
    {
        return VoidTransactionInternalAsync(transactionKey);
    }

    public Task<FSharpResult<Reconciliation, DomainError>> CreateReconciliationAsync(
        CreateReconciliationCommand command,
        CancellationToken cancellationToken = default
    )
    {
        return CreateReconciliationInternalAsync(command);
    }

    public Task<FSharpResult<Reconciliation, DomainError>> MatchTransactionsAsync(
        MatchTransactionsCommand command,
        CancellationToken cancellationToken = default
    )
    {
        return MatchTransactionsInternalAsync(command);
    }

    public Task<FSharpResult<Reconciliation, DomainError>> CompleteReconciliationAsync(
        CompleteReconciliationCommand command,
        CancellationToken cancellationToken = default
    )
    {
        return CompleteReconciliationInternalAsync(command);
    }

    public Task<FSharpResult<PeriodBudgetSummaryResult, DomainError>> GetPeriodBudgetSummaryAsync(
        GetPeriodBudgetSummaryCommand command,
        CancellationToken cancellationToken = default
    )
    {
        return GetPeriodBudgetSummaryInternalAsync(command);
    }

    public Task<FSharpResult<UpsertPeriodBudgetResult, DomainError>> UpsertPeriodBudgetAsync(
        UpsertPeriodBudgetCommand command,
        CancellationToken cancellationToken = default
    )
    {
        return UpsertPeriodBudgetInternalAsync(command);
    }

    private async Task<
        FSharpResult<TransferExecutionResult, DomainError>
    > ExecuteTransferInternalAsync(CreateTransferCommand command)
    {
        var now = global::System.DateTime.UtcNow;
        var postedAt = command.PostedAt ?? now;
        var description = string.IsNullOrWhiteSpace(command.Description)
            ? "Transfer"
            : command.Description;

        var fromId = AccountIdModule.fromString(command.FromAccountKey);
        var toId = AccountIdModule.fromString(command.ToAccountKey);
        var amount = MoneyModule.create(command.Amount);

        var fromOpt = await _uow.Accounts.GetById(fromId);
        if (FSharpOption<Account>.get_IsNone(fromOpt))
            return FSharpResult<TransferExecutionResult, DomainError>.NewError(
                DomainError.NewNotFoundError("From account not found")
            );

        var toOpt = await _uow.Accounts.GetById(toId);
        if (FSharpOption<Account>.get_IsNone(toOpt))
            return FSharpResult<TransferExecutionResult, DomainError>.NewError(
                DomainError.NewNotFoundError("To account not found")
            );

        var domainResult = FinanceServices.TransferService.executeTransfer(
            fromOpt.Value,
            toOpt.Value,
            amount,
            description,
            postedAt
        );

        if (domainResult.IsError)
            return FSharpResult<TransferExecutionResult, DomainError>.NewError(
                domainResult.ErrorValue
            );

        var r = domainResult.ResultValue;

        // Persist: transactions, journal entries, updated accounts
        var txs = ListModule.OfSeq(
            new[] { r.Transfer.WithdrawalTransaction, r.Transfer.DepositTransaction }
        );
        await _uow.Transactions.SaveMany(txs);
        await _uow.JournalEntries.SaveMany(r.JournalEntries.Entries);
        await _uow.Accounts.Save(r.UpdatedFromAccount);
        await _uow.Accounts.Save(r.UpdatedToAccount);
        await _uow.CommitAsync();

        var result = new TransferExecutionResult(
            WithdrawalTransactionKey: TransactionIdModule.value(
                r.Transfer.WithdrawalTransaction.Id
            ),
            DepositTransactionKey: TransactionIdModule.value(r.Transfer.DepositTransaction.Id),
            TransferId: r.Transfer.TransferId
        );

        return FSharpResult<TransferExecutionResult, DomainError>.NewOk(result);
    }

    private async Task<FSharpResult<Transaction, DomainError>> CreateTransactionInternalAsync(
        CreateTransactionCommand command
    )
    {
        var now = global::System.DateTime.UtcNow;
        var postedAt = command.PostedAt ?? now;

        var accountId = AccountIdModule.fromString(command.AccountKey);
        var amount = MoneyModule.create(command.Amount);

        var accountOpt = await _uow.Accounts.GetById(accountId);
        if (FSharpOption<Account>.get_IsNone(accountOpt))
            return FSharpResult<Transaction, DomainError>.NewError(
                DomainError.NewNotFoundError("Account not found")
            );

        var merchantId = string.IsNullOrWhiteSpace(command.MerchantKey)
            ? FSharpOption<MerchantId>.None
            : FSharpOption<MerchantId>.Some(MerchantIdModule.fromString(command.MerchantKey));

        var categoryId = string.IsNullOrWhiteSpace(command.CategoryKey)
            ? FSharpOption<CategoryId>.None
            : FSharpOption<CategoryId>.Some(CategoryIdModule.fromString(command.CategoryKey));

        var memo = string.IsNullOrWhiteSpace(command.Memo)
            ? FSharpOption<string>.None
            : FSharpOption<string>.Some(command.Memo);

        var authorizedAt = command.AuthorizedAt.HasValue
            ? FSharpOption<global::System.DateTime>.Some(command.AuthorizedAt.Value)
            : FSharpOption<global::System.DateTime>.None;

        var checkNumber = string.IsNullOrWhiteSpace(command.CheckNumber)
            ? FSharpOption<string>.None
            : FSharpOption<string>.Some(command.CheckNumber);

        var tags = command.Tags is null
            ? ListModule.Empty<string>()
            : ListModule.OfSeq(command.Tags);

        var domainResult = FinanceServices.TransactionService.createTransaction(
            accountOpt.Value,
            merchantId,
            categoryId,
            amount,
            command.Description,
            memo,
            postedAt,
            authorizedAt,
            checkNumber,
            tags
        );

        if (domainResult.IsError)
            return FSharpResult<Transaction, DomainError>.NewError(domainResult.ErrorValue);

        var r = domainResult.ResultValue;

        await _uow.Transactions.Save(r.Transaction);
        await _uow.JournalEntries.SaveMany(r.JournalEntries.Entries);
        await _uow.Accounts.Save(r.UpdatedAccount);
        await _uow.CommitAsync();

        return FSharpResult<Transaction, DomainError>.NewOk(r.Transaction);
    }

    private async Task<FSharpResult<Transaction, DomainError>> UpdateTransactionInternalAsync(
        UpdateTransactionCommand command
    )
    {
        var txId = TransactionIdModule.fromString(command.TransactionKey);
        var txOpt = await _uow.Transactions.GetById(txId);
        if (FSharpOption<Transaction>.get_IsNone(txOpt))
            return FSharpResult<Transaction, DomainError>.NewError(
                DomainError.NewNotFoundError("Transaction not found")
            );

        var tx = txOpt.Value;
        var accountOpt = await _uow.Accounts.GetById(tx.AccountId);
        if (FSharpOption<Account>.get_IsNone(accountOpt))
            return FSharpResult<Transaction, DomainError>.NewError(
                DomainError.NewNotFoundError("Account not found")
            );

        var updated = tx;

        // Update details (merchant, category, description, memo, tags)
        var merchantId =
            command.MerchantKey is null ? tx.MerchantId
            : string.IsNullOrWhiteSpace(command.MerchantKey) ? FSharpOption<MerchantId>.None
            : FSharpOption<MerchantId>.Some(MerchantIdModule.fromString(command.MerchantKey));

        var categoryId =
            command.CategoryKey is null ? tx.CategoryId
            : string.IsNullOrWhiteSpace(command.CategoryKey) ? FSharpOption<CategoryId>.None
            : FSharpOption<CategoryId>.Some(CategoryIdModule.fromString(command.CategoryKey));

        var description = command.Description ?? tx.Description;

        var memo =
            command.Memo is null ? tx.Memo
            : string.IsNullOrWhiteSpace(command.Memo) ? FSharpOption<string>.None
            : FSharpOption<string>.Some(command.Memo);

        var tags = command.Tags is null ? tx.Tags : ListModule.OfSeq(command.Tags);

        var detailsResult = updated.UpdateDetails(merchantId, categoryId, description, memo, tags);
        if (detailsResult.IsError)
            return FSharpResult<Transaction, DomainError>.NewError(detailsResult.ErrorValue);
        updated = detailsResult.ResultValue;

        // Update amount if provided (uses domain rule: only for Pending)
        Account updatedAccount = accountOpt.Value;
        if (command.Amount.HasValue)
        {
            var newAmount = MoneyModule.create(command.Amount.Value);
            var amountResult = FinanceServices.TransactionService.updateTransactionAmount(
                accountOpt.Value,
                updated,
                newAmount
            );
            if (amountResult.IsError)
                return FSharpResult<Transaction, DomainError>.NewError(amountResult.ErrorValue);
            updated = amountResult.ResultValue.Transaction;
            updatedAccount = amountResult.ResultValue.UpdatedAccount;
        }

        // Update status if provided
        if (!string.IsNullOrWhiteSpace(command.Status))
        {
            var statusParseResult = TransactionStatusModule.fromString(command.Status);
            if (statusParseResult.IsError)
                return FSharpResult<Transaction, DomainError>.NewError(
                    statusParseResult.ErrorValue
                );
            var statusResult = updated.UpdateStatus(statusParseResult.ResultValue);
            if (statusResult.IsError)
                return FSharpResult<Transaction, DomainError>.NewError(statusResult.ErrorValue);
            updated = statusResult.ResultValue;
        }

        // Update postedAt if provided
        if (command.PostedAt.HasValue)
        {
            var postedAtResult = updated.UpdatePostedAt(command.PostedAt.Value);
            if (postedAtResult.IsError)
                return FSharpResult<Transaction, DomainError>.NewError(postedAtResult.ErrorValue);
            updated = postedAtResult.ResultValue;
        }

        // Update checkNumber if provided
        if (command.CheckNumber is not null)
        {
            var checkNum = string.IsNullOrWhiteSpace(command.CheckNumber)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(command.CheckNumber);
            var checkResult = updated.UpdateCheckNumber(checkNum);
            if (checkResult.IsError)
                return FSharpResult<Transaction, DomainError>.NewError(checkResult.ErrorValue);
            updated = checkResult.ResultValue;
        }

        await _uow.Transactions.Save(updated);
        if (command.Amount.HasValue)
            await _uow.Accounts.Save(updatedAccount);
        await _uow.CommitAsync();

        return FSharpResult<Transaction, DomainError>.NewOk(updated);
    }

    private async Task<FSharpResult<Transaction, DomainError>> VoidTransactionInternalAsync(
        string transactionKey
    )
    {
        var txId = TransactionIdModule.fromString(transactionKey);
        var txOpt = await _uow.Transactions.GetById(txId);
        if (FSharpOption<Transaction>.get_IsNone(txOpt))
            return FSharpResult<Transaction, DomainError>.NewError(
                DomainError.NewNotFoundError("Transaction not found")
            );

        var tx = txOpt.Value;
        var accountOpt = await _uow.Accounts.GetById(tx.AccountId);
        if (FSharpOption<Account>.get_IsNone(accountOpt))
            return FSharpResult<Transaction, DomainError>.NewError(
                DomainError.NewNotFoundError("Account not found")
            );

        var voidResult = FinanceServices.TransactionService.voidTransaction(accountOpt.Value, tx);
        if (voidResult.IsError)
            return FSharpResult<Transaction, DomainError>.NewError(voidResult.ErrorValue);

        var r = voidResult.ResultValue;

        await _uow.Transactions.Save(r.Transaction);
        await _uow.Accounts.Save(r.UpdatedAccount);
        await _uow.CommitAsync();

        return FSharpResult<Transaction, DomainError>.NewOk(r.Transaction);
    }

    private async Task<FSharpResult<Reconciliation, DomainError>> CreateReconciliationInternalAsync(
        CreateReconciliationCommand command
    )
    {
        var accountId = AccountIdModule.fromString(command.AccountKey);
        var statementBalance = MoneyModule.create(command.StatementBalance);

        // Verify account exists
        var accountOpt = await _uow.Accounts.GetById(accountId);
        if (FSharpOption<Account>.get_IsNone(accountOpt))
            return FSharpResult<Reconciliation, DomainError>.NewError(
                DomainError.NewNotFoundError("Account not found")
            );

        // Create reconciliation directly using domain types
        var now = global::System.DateTime.UtcNow;
        var reconciliation = new Reconciliation(
            id: ReconciliationIdModule.create(),
            accountId: accountId,
            statementDate: command.StatementDate,
            statementBalance: statementBalance,
            clearedBalance: MoneyModule.zero,
            difference: statementBalance,
            status: ReconciliationStatus.InProgress,
            matchedTransactionIds: ListModule.Empty<TransactionId>(),
            notes: FSharpOption<string>.None,
            completedAt: FSharpOption<global::System.DateTime>.None,
            createdAt: now,
            updatedAt: now
        );
        await _uow.Reconciliations.Save(reconciliation);
        await _uow.CommitAsync();

        return FSharpResult<Reconciliation, DomainError>.NewOk(reconciliation);
    }

    private async Task<FSharpResult<Reconciliation, DomainError>> MatchTransactionsInternalAsync(
        MatchTransactionsCommand command
    )
    {
        var reconId = ReconciliationIdModule.fromString(command.ReconciliationKey);

        // Get reconciliation
        var reconOpt = await _uow.Reconciliations.GetById(reconId);
        if (FSharpOption<Reconciliation>.get_IsNone(reconOpt))
            return FSharpResult<Reconciliation, DomainError>.NewError(
                DomainError.NewNotFoundError("Reconciliation not found")
            );

        var reconciliation = reconOpt.Value;

        // Match each transaction
        foreach (var txKey in command.TransactionKeys)
        {
            var txId = TransactionIdModule.fromString(txKey);
            var txOpt = await _uow.Transactions.GetById(txId);

            if (FSharpOption<Transaction>.get_IsSome(txOpt))
            {
                var tx = txOpt.Value;
                var matchResult = reconciliation.MatchTransaction(txId, tx.Amount);

                if (matchResult.IsError)
                    return FSharpResult<Reconciliation, DomainError>.NewError(
                        matchResult.ErrorValue
                    );

                reconciliation = matchResult.ResultValue;

                // Update transaction status to Cleared and set reconciliation
                var updateResult = tx.UpdateStatus(TransactionStatus.Cleared);
                if (updateResult.IsError)
                    return FSharpResult<Reconciliation, DomainError>.NewError(
                        updateResult.ErrorValue
                    );

                var updatedTx = updateResult.ResultValue;
                await _uow.Transactions.Save(updatedTx);
            }
        }

        await _uow.Reconciliations.Save(reconciliation);
        await _uow.CommitAsync();

        return FSharpResult<Reconciliation, DomainError>.NewOk(reconciliation);
    }

    private async Task<
        FSharpResult<Reconciliation, DomainError>
    > CompleteReconciliationInternalAsync(CompleteReconciliationCommand command)
    {
        var reconId = ReconciliationIdModule.fromString(command.ReconciliationKey);

        // Get reconciliation
        var reconOpt = await _uow.Reconciliations.GetById(reconId);
        if (FSharpOption<Reconciliation>.get_IsNone(reconOpt))
            return FSharpResult<Reconciliation, DomainError>.NewError(
                DomainError.NewNotFoundError("Reconciliation not found")
            );

        var reconciliation = reconOpt.Value;

        // Complete the reconciliation
        var completeResult = reconciliation.Complete();
        if (completeResult.IsError)
            return FSharpResult<Reconciliation, DomainError>.NewError(completeResult.ErrorValue);

        var completedReconciliation = completeResult.ResultValue;

        // Apply notes if provided
        if (command.Notes is not null)
        {
            completedReconciliation = new Reconciliation(
                id: completedReconciliation.Id,
                accountId: completedReconciliation.AccountId,
                statementDate: completedReconciliation.StatementDate,
                statementBalance: completedReconciliation.StatementBalance,
                clearedBalance: completedReconciliation.ClearedBalance,
                difference: completedReconciliation.Difference,
                status: completedReconciliation.Status,
                matchedTransactionIds: completedReconciliation.MatchedTransactionIds,
                notes: string.IsNullOrWhiteSpace(command.Notes)
                    ? FSharpOption<string>.None
                    : FSharpOption<string>.Some(command.Notes),
                completedAt: completedReconciliation.CompletedAt,
                createdAt: completedReconciliation.CreatedAt,
                updatedAt: global::System.DateTime.UtcNow);
        }

        // Update all matched transactions to Reconciled status
        foreach (var txId in completedReconciliation.MatchedTransactionIds)
        {
            var txOpt = await _uow.Transactions.GetById(txId);
            if (FSharpOption<Transaction>.get_IsSome(txOpt))
            {
                var tx = txOpt.Value;
                var reconcileResult = tx.Reconcile(reconId);
                if (reconcileResult.IsError)
                    return FSharpResult<Reconciliation, DomainError>.NewError(
                        reconcileResult.ErrorValue
                    );

                var updatedTx = reconcileResult.ResultValue;
                await _uow.Transactions.Save(updatedTx);
            }
        }

        await _uow.Reconciliations.Save(completedReconciliation);
        await _uow.CommitAsync();

        return FSharpResult<Reconciliation, DomainError>.NewOk(completedReconciliation);
    }

    private async Task<
        FSharpResult<PeriodBudgetSummaryResult, DomainError>
    > GetPeriodBudgetSummaryInternalAsync(GetPeriodBudgetSummaryCommand command)
    {
        var periodTypeResult = BudgetPeriodTypeModule.fromString(command.PeriodType ?? "Custom");
        if (periodTypeResult.IsError)
            return FSharpResult<PeriodBudgetSummaryResult, DomainError>.NewError(
                periodTypeResult.ErrorValue
            );

        var periodResult = BudgetPeriodModule.create(
            periodTypeResult.ResultValue,
            command.StartDate,
            command.EndDate
        );
        if (periodResult.IsError)
            return FSharpResult<PeriodBudgetSummaryResult, DomainError>.NewError(
                periodResult.ErrorValue
            );

        var period = periodResult.ResultValue;

        var budgets = await _uow.Budgets.GetByPeriod(period);
        var transactions = await _uow.Transactions.GetByDateRange(
            command.StartDate,
            command.EndDate
        );

        var summaryResult = FinanceServices.BudgetService.getBudgetSummary<DomainError>(
            period,
            budgets,
            transactions
        );

        if (summaryResult.IsError)
            return FSharpResult<PeriodBudgetSummaryResult, DomainError>.NewError(
                summaryResult.ErrorValue
            );

        var summary = summaryResult.ResultValue;
        return FSharpResult<PeriodBudgetSummaryResult, DomainError>.NewOk(
            new PeriodBudgetSummaryResult(period, summary)
        );
    }

    private async Task<
        FSharpResult<UpsertPeriodBudgetResult, DomainError>
    > UpsertPeriodBudgetInternalAsync(UpsertPeriodBudgetCommand command)
    {
        var periodTypeResult = BudgetPeriodTypeModule.fromString(command.PeriodType);
        if (periodTypeResult.IsError)
            return FSharpResult<UpsertPeriodBudgetResult, DomainError>.NewError(
                periodTypeResult.ErrorValue
            );

        var periodResult = BudgetPeriodModule.create(
            periodTypeResult.ResultValue,
            command.StartDate,
            command.EndDate
        );
        if (periodResult.IsError)
            return FSharpResult<UpsertPeriodBudgetResult, DomainError>.NewError(
                periodResult.ErrorValue
            );

        var period = periodResult.ResultValue;
        var categoryId = CategoryIdModule.fromString(command.CategoryKey);
        var budgetedAmount = MoneyModule.create(command.BudgetedAmount);

        var existing = await _uow.Budgets.GetByCategoryAndPeriod(categoryId, period);
        var wasCreated = FSharpOption<Budget>.get_IsNone(existing);
        var existingBudget = FSharpOption<Budget>.get_IsSome(existing) ? existing.Value : null;

        var upsertResult = FinanceServices.BudgetService.upsertBudget(
            period,
            categoryId,
            budgetedAmount,
            existingBudget
        );
        if (upsertResult.IsError)
            return FSharpResult<UpsertPeriodBudgetResult, DomainError>.NewError(
                upsertResult.ErrorValue
            );

        var budget = upsertResult.ResultValue;

        var spentTransactions = await _uow.Transactions.GetByCategoryAndDateRange(
            categoryId,
            period.StartDate,
            period.EndDate
        );
        var spentAmount = BudgetModule.calculateSpentFromTransactions(
            spentTransactions,
            categoryId,
            period
        );
        var spentResult = budget.UpdateSpentAmount<DomainError>(spentAmount);
        if (spentResult.IsError)
            return FSharpResult<UpsertPeriodBudgetResult, DomainError>.NewError(
                spentResult.ErrorValue
            );
        budget = spentResult.ResultValue;

        if (command.RolloverAmount.HasValue)
        {
            budget = new Budget(
                id: budget.Id,
                period: budget.Period,
                categoryId: budget.CategoryId,
                budgetedAmount: budget.BudgetedAmount,
                spentAmount: budget.SpentAmount,
                rolloverAmount: MoneyModule.create(command.RolloverAmount.Value),
                notes: budget.Notes,
                createdAt: budget.CreatedAt,
                updatedAt: global::System.DateTime.UtcNow
            );
        }

        if (command.Notes is not null)
        {
            budget = new Budget(
                id: budget.Id,
                period: budget.Period,
                categoryId: budget.CategoryId,
                budgetedAmount: budget.BudgetedAmount,
                spentAmount: budget.SpentAmount,
                rolloverAmount: budget.RolloverAmount,
                notes: string.IsNullOrWhiteSpace(command.Notes)
                    ? FSharpOption<string>.None
                    : FSharpOption<string>.Some(command.Notes),
                createdAt: budget.CreatedAt,
                updatedAt: global::System.DateTime.UtcNow
            );
        }

        await _uow.Budgets.Save(budget);
        await _uow.CommitAsync();

        return FSharpResult<UpsertPeriodBudgetResult, DomainError>.NewOk(
            new UpsertPeriodBudgetResult(budget, wasCreated)
        );
    }
}
