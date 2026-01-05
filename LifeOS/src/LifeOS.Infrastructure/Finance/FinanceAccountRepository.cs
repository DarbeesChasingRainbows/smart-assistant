using LifeOS.Domain.Finance;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Finance;

/// <summary>
/// ArangoDB implementation of financial account repository.
/// Provides CRUD operations and specialized queries for account management.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository handles financial account operations including balance updates
/// and account status management. All operations are asynchronous for optimal performance.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="FinanceAccountRepository"/> class.
/// </remarks>
/// <param name="context">The ArangoDB database context for data operations.</param>
/// <exception cref="ArgumentNullException">Thrown when context is null.</exception>
public sealed class FinanceAccountRepository(ArangoDbContext context) : IAccountRepository
{
    private readonly ArangoDbContext _context =
        context ?? throw new ArgumentNullException(nameof(context));
    private const string CollectionName = ArangoDbContext.Collections.FinancialAccounts;

    /// <summary>
    /// Retrieves a financial account by its unique identifier.
    /// </summary>
    /// <param name="accountId">The unique identifier of the account.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{Account}"/> with the account if found,
    /// or <see cref="FSharpOption{Account}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Uses ArangoDB's document key for efficient lookup.
    /// Returns None for missing accounts without throwing exceptions.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpOption<Account>> GetById(AccountId accountId)
    {
        var id = AccountIdModule.value(accountId);
        var query = $"FOR a IN {CollectionName} FILTER a._key == @id RETURN a";
        var bindVars = new Dictionary<string, object> { ["id"] = id };

        var cursor = await _context.Client.Cursor.PostCursorAsync<FinancialAccountDocument>(
            query,
            bindVars
        );
        var doc = cursor.Result.FirstOrDefault();
        var domain = doc is null ? null : FinanceMappers.ToDomain(doc);

        return domain is null ? FSharpOption<Account>.None : FSharpOption<Account>.Some(domain);
    }

    /// <summary>
    /// Retrieves all financial accounts sorted by name.
    /// </summary>
    /// <returns>
    /// A task containing an <see cref="FSharpList{Account}"/> with all accounts.
    /// Returns an empty list if no accounts exist.
    /// </returns>
    /// <remarks>
    /// Returns all accounts sorted alphabetically by name.
    /// Use with caution on large datasets as it loads all accounts into memory.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpList<Account>> GetAll()
    {
        var query = $"FOR a IN {CollectionName} SORT a.name ASC RETURN a";
        var cursor = await _context.Client.Cursor.PostCursorAsync<FinancialAccountDocument>(query);
        var accounts = cursor
            .Result.Select(FinanceMappers.ToDomain)
            .Where(a => a is not null)
            .Cast<Account>();
        return ListModule.OfSeq(accounts);
    }

    /// <summary>
    /// Retrieves all active financial accounts sorted by name.
    /// </summary>
    /// <returns>
    /// A task containing an <see cref="FSharpList{Account}"/> with active accounts.
    /// Returns an empty list if no active accounts exist.
    /// </returns>
    /// <remarks>
    /// Filters accounts where IsActive is true and sorts alphabetically by name.
    /// Essential for UI components that only show active accounts.
    /// </remarks>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when database query fails due to connection or syntax issues.
    /// </exception>
    public async Task<FSharpList<Account>> GetActive()
    {
        var query = $"FOR a IN {CollectionName} FILTER a.isActive == true SORT a.name ASC RETURN a";
        var cursor = await _context.Client.Cursor.PostCursorAsync<FinancialAccountDocument>(query);
        var accounts = cursor
            .Result.Select(FinanceMappers.ToDomain)
            .Where(a => a is not null)
            .Cast<Account>();
        return ListModule.OfSeq(accounts);
    }

    /// <summary>
    /// Saves a financial account to the database (create or update).
    /// </summary>
    /// <param name="account">The account to save.</param>
    /// <returns>A task containing the saved account.</returns>
    /// <remarks>
    /// Uses UPSERT operation by document key for create/update semantics.
    /// The UpdatedAt timestamp is automatically refreshed by the database.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when account is null.</exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the document cannot be saved due to validation or constraint violations.
    /// </exception>
    public async Task<Account> Save(Account account)
    {
        ArgumentNullException.ThrowIfNull(account);

        var doc = FinanceMappers.ToDocument(account);
        // Upsert by key (domain key == Arango _key)
        await _context.Client.Document.PutDocumentAsync($"{CollectionName}/{doc.Key}", doc);
        return account;
    }

    /// <summary>
    /// Updates the balance of a financial account.
    /// </summary>
    /// <param name="accountId">The unique identifier of the account to update.</param>
    /// <param name="amount">The amount to add to the current balance (can be negative).</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// Performs atomic balance update using AQL UPDATE operation.
    /// Automatically updates the UpdatedAt timestamp to reflect the change.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when accountId is null.</exception>
    /// <exception cref="InvalidOperationException">
    /// Thrown when the account is not found in the database.
    /// </exception>
    /// <exception cref="ArangoDBNetStandard.ApiErrorException">
    /// Thrown when the update operation fails due to validation or constraint issues.
    /// </exception>
    public async Task<Unit> UpdateBalance(AccountId accountId, Money amount)
    {
        ArgumentNullException.ThrowIfNull(accountId);

        var key = AccountIdModule.value(accountId);
        var delta = MoneyModule.value(amount);

        var query =
            $@"
            FOR doc IN {CollectionName}
            FILTER doc._key == @key
            UPDATE doc WITH {{ 
                currentBalance: doc.currentBalance + @amount,
                updatedAt: @now
            }} IN {CollectionName}";

        await _context.Client.Cursor.PostCursorAsync<object>(
            query,
            new Dictionary<string, object>
            {
                ["key"] = key,
                ["amount"] = delta,
                ["now"] = global::System.DateTime.UtcNow.ToString("o"),
            }
        );

        return default;
    }
}
