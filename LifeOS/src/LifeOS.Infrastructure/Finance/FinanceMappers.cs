using LifeOS.Domain.Finance;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Finance;

/// <summary>
/// Static mapper class for converting between financial domain types and ArangoDB documents.
/// Handles the translation layer between the Hexagonal Architecture domain and database persistence.
/// </summary>
/// <remarks>
/// This mapper provides bidirectional conversion between F# domain types and C# document types.
/// It handles complex object mapping including option types, collections, and nested objects.
/// All mapping operations include proper validation and error handling for type safety.
/// </remarks>
internal static class FinanceMappers
{
    /// <summary>
    /// Maps a FinancialAccountDocument to an Account domain entity.
    /// </summary>
    /// <param name="doc">The FinancialAccountDocument to map.</param>
    /// <returns>An Account domain entity.</returns>
    /// <remarks>
    /// Validates account type and currency before mapping.
    /// Converts option types from document null values to FSharpOption.
    /// Handles all account properties including balances and status.
    /// </remarks>
    /// <exception cref="InvalidOperationException">
    /// Thrown when account type or currency is invalid.
    /// </exception>
    /// <exception cref="ArgumentNullException">Thrown when doc is null.</exception>
    public static Account ToDomain(FinancialAccountDocument doc)
    {
        var accountType = AccountTypeModule.fromString(doc.Type);
        if (accountType.IsError)
            throw new InvalidOperationException($"Invalid account type: {doc.Type}");

        var currency = CurrencyModule.create(doc.Currency);
        if (currency.IsError)
            throw new InvalidOperationException($"Invalid currency: {doc.Currency}");

        return new Account(
            id: AccountIdModule.fromString(doc.Key),
            name: doc.Name,
            accountType: accountType.ResultValue,
            institution: string.IsNullOrWhiteSpace(doc.Institution)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Institution),
            accountNumber: string.IsNullOrWhiteSpace(doc.AccountNumber)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.AccountNumber),
            currency: currency.ResultValue,
            openingBalance: MoneyModule.create(doc.OpeningBalance),
            currentBalance: MoneyModule.create(doc.CurrentBalance),
            isActive: doc.IsActive,
            createdAt: doc.CreatedAt,
            updatedAt: doc.UpdatedAt
        );
    }

    /// <summary>
    /// Maps an Account domain entity to a FinancialAccountDocument.
    /// </summary>
    /// <param name="account">The Account domain entity to map.</param>
    /// <returns>A FinancialAccountDocument suitable for database storage.</returns>
    /// <remarks>
    /// Converts FSharpOption types to document null values.
    /// Extracts primitive values from domain modules for storage.
    /// Preserves all account properties including balances and timestamps.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when account is null.</exception>
    public static FinancialAccountDocument ToDocument(Account account)
    {
        return new FinancialAccountDocument
        {
            Key = AccountIdModule.value(account.Id),
            Name = account.Name,
            Type = AccountTypeModule.toString(account.AccountType),
            Institution = FSharpOption<string>.get_IsSome(account.Institution)
                ? account.Institution.Value
                : null,
            AccountNumber = FSharpOption<string>.get_IsSome(account.AccountNumber)
                ? account.AccountNumber.Value
                : null,
            Currency = CurrencyModule.value(account.Currency),
            OpeningBalance = MoneyModule.value(account.OpeningBalance),
            CurrentBalance = MoneyModule.value(account.CurrentBalance),
            IsActive = account.IsActive,
            CreatedAt = account.CreatedAt,
            UpdatedAt = account.UpdatedAt,
        };
    }

    /// <summary>
    /// Maps a FinancialTransactionDocument to a Transaction domain entity.
    /// </summary>
    /// <param name="doc">The FinancialTransactionDocument to map.</param>
    /// <returns>A Transaction domain entity, or null if doc is null or invalid.</returns>
    /// <remarks>
    /// Handles null documents gracefully by returning null.
    /// Validates transaction status before mapping.
    /// Converts option types from document null values to FSharpOption.
    /// Handles complex relationships with merchants, categories, receipts, and reconciliations.
    /// </remarks>
    /// <exception cref="InvalidOperationException">
    /// Thrown when transaction status is invalid.
    /// </exception>
    /// <exception cref="FormatException">
    /// Thrown when GUID parsing fails for invalid document keys.
    /// </exception>
    public static Transaction? ToDomain(FinancialTransactionDocument? doc)
    {
        if (doc is null)
            return null;

        var statusResult = TransactionStatusModule.fromString(doc.Status);
        if (statusResult.IsError)
            return null;

        var tags = doc.Tags is null ? [] : ListModule.OfSeq(doc.Tags);

        return new Transaction(
            id: TransactionIdModule.fromString(doc.Key),
            accountId: AccountIdModule.fromString(doc.AccountKey),
            merchantId: string.IsNullOrWhiteSpace(doc.MerchantKey)
                ? FSharpOption<MerchantId>.None
                : FSharpOption<MerchantId>.Some(MerchantIdModule.fromString(doc.MerchantKey)),
            categoryId: string.IsNullOrWhiteSpace(doc.CategoryKey)
                ? FSharpOption<CategoryId>.None
                : FSharpOption<CategoryId>.Some(CategoryIdModule.fromString(doc.CategoryKey)),
            amount: MoneyModule.create(doc.Amount),
            description: doc.Description,
            memo: string.IsNullOrWhiteSpace(doc.Memo)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Memo),
            postedAt: doc.PostedAt,
            authorizedAt: doc.AuthorizedAt.HasValue
                ? FSharpOption<global::System.DateTime>.Some(doc.AuthorizedAt.Value)
                : FSharpOption<global::System.DateTime>.None,
            status: statusResult.ResultValue,
            externalId: string.IsNullOrWhiteSpace(doc.ExternalId)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.ExternalId),
            checkNumber: string.IsNullOrWhiteSpace(doc.CheckNumber)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.CheckNumber),
            tags: tags,
            receiptId: string.IsNullOrWhiteSpace(doc.ReceiptKey)
                ? FSharpOption<ReceiptId>.None
                : FSharpOption<ReceiptId>.Some(ReceiptIdModule.fromString(doc.ReceiptKey)),
            reconciliationId: string.IsNullOrWhiteSpace(doc.ReconciliationKey)
                ? FSharpOption<ReconciliationId>.None
                : FSharpOption<ReconciliationId>.Some(
                    ReconciliationIdModule.fromString(doc.ReconciliationKey)
                ),
            createdAt: doc.CreatedAt,
            updatedAt: doc.UpdatedAt
        );
    }

    /// <summary>
    /// Maps a JournalEntry domain entity to a FinancialJournalEntryDocument.
    /// </summary>
    /// <param name="entry">The JournalEntry domain entity to map.</param>
    /// <returns>A FinancialJournalEntryDocument suitable for database storage.</returns>
    /// <remarks>
    /// Converts FSharpOption types to document null values.
    /// Extracts primitive values from domain modules for storage.
    /// Preserves all journal entry properties including debit/credit amounts and dates.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when entry is null.</exception>
    public static FinancialJournalEntryDocument ToDocument(JournalEntry entry)
    {
        return new FinancialJournalEntryDocument
        {
            Key = JournalEntryIdModule.value(entry.Id),
            TransactionKey = TransactionIdModule.value(entry.TransactionId),
            AccountKey = AccountIdModule.value(entry.AccountId),
            Debit = MoneyModule.value(entry.Debit),
            Credit = MoneyModule.value(entry.Credit),
            EntryDate = entry.EntryDate,
            Memo = FSharpOption<string>.get_IsSome(entry.Memo) ? entry.Memo.Value : null,
            CreatedAt = entry.CreatedAt,
        };
    }

    /// <summary>
    /// Maps a FinancialJournalEntryDocument to a JournalEntry domain entity.
    /// </summary>
    /// <param name="doc">The FinancialJournalEntryDocument to map.</param>
    /// <returns>A JournalEntry domain entity, or null if doc is null.</returns>
    /// <remarks>
    /// Handles null documents gracefully by returning null.
    /// Converts option types from document null values to FSharpOption.
    /// Reconstructs journal entry with proper debit/credit amounts and relationships.
    /// </remarks>
    /// <exception cref="FormatException">
    /// Thrown when GUID parsing fails for invalid document keys.
    /// </exception>
    public static JournalEntry? ToDomain(FinancialJournalEntryDocument? doc)
    {
        if (doc is null)
            return null;

        return new JournalEntry(
            id: JournalEntryIdModule.fromString(doc.Key),
            transactionId: TransactionIdModule.fromString(doc.TransactionKey),
            accountId: AccountIdModule.fromString(doc.AccountKey),
            debit: MoneyModule.create(doc.Debit),
            credit: MoneyModule.create(doc.Credit),
            entryDate: doc.EntryDate,
            memo: string.IsNullOrWhiteSpace(doc.Memo)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Memo),
            createdAt: doc.CreatedAt
        );
    }

    /// <summary>
    /// Maps a Transaction domain entity to a FinancialTransactionDocument.
    /// </summary>
    /// <param name="tx">The Transaction domain entity to map.</param>
    /// <returns>A FinancialTransactionDocument suitable for database storage.</returns>
    /// <remarks>
    /// Converts FSharpOption types to document null values.
    /// Extracts primitive values from domain modules for storage.
    /// Preserves all transaction properties including relationships and tags.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when tx is null.</exception>
    public static FinancialTransactionDocument ToDocument(Transaction tx)
    {
        return new FinancialTransactionDocument
        {
            Key = TransactionIdModule.value(tx.Id),
            AccountKey = AccountIdModule.value(tx.AccountId),
            MerchantKey = FSharpOption<MerchantId>.get_IsSome(tx.MerchantId)
                ? MerchantIdModule.value(tx.MerchantId.Value)
                : null,
            CategoryKey = FSharpOption<CategoryId>.get_IsSome(tx.CategoryId)
                ? CategoryIdModule.value(tx.CategoryId.Value)
                : null,
            Amount = MoneyModule.value(tx.Amount),
            Description = tx.Description,
            Memo = FSharpOption<string>.get_IsSome(tx.Memo) ? tx.Memo.Value : null,
            PostedAt = tx.PostedAt,
            AuthorizedAt = FSharpOption<global::System.DateTime>.get_IsSome(tx.AuthorizedAt)
                ? tx.AuthorizedAt.Value
                : null,
            Status = TransactionStatusModule.toString(tx.Status),
            ExternalId = FSharpOption<string>.get_IsSome(tx.ExternalId)
                ? tx.ExternalId.Value
                : null,
            CheckNumber = FSharpOption<string>.get_IsSome(tx.CheckNumber)
                ? tx.CheckNumber.Value
                : null,
            Tags = [.. tx.Tags],
            ReceiptKey = FSharpOption<ReceiptId>.get_IsSome(tx.ReceiptId)
                ? ReceiptIdModule.value(tx.ReceiptId.Value)
                : null,
            ReconciliationKey = FSharpOption<ReconciliationId>.get_IsSome(tx.ReconciliationId)
                ? ReconciliationIdModule.value(tx.ReconciliationId.Value)
                : null,
            CreatedAt = tx.CreatedAt,
            UpdatedAt = tx.UpdatedAt,
        };
    }

    /// <summary>
    /// Maps a FinancialMerchantDocument to a Merchant domain entity.
    /// </summary>
    /// <param name="doc">The FinancialMerchantDocument to map.</param>
    /// <returns>A Merchant domain entity, or null if doc is null.</returns>
    /// <remarks>
    /// Handles null documents gracefully by returning null.
    /// Converts option types from document null values to FSharpOption.
    /// Reconstructs merchant with contact information and default category.
    /// </remarks>
    /// <exception cref="FormatException">
    /// Thrown when GUID parsing fails for invalid document keys.
    /// </exception>
    public static Merchant? ToDomain(FinancialMerchantDocument? doc)
    {
        if (doc is null)
            return null;
        return new Merchant(
            id: MerchantIdModule.fromString(doc.Key),
            name: doc.Name,
            defaultCategoryId: string.IsNullOrWhiteSpace(doc.DefaultCategoryKey)
                ? FSharpOption<CategoryId>.None
                : FSharpOption<CategoryId>.Some(
                    CategoryIdModule.fromString(doc.DefaultCategoryKey)
                ),
            address: string.IsNullOrWhiteSpace(doc.Address)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Address),
            city: string.IsNullOrWhiteSpace(doc.City)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.City),
            state: string.IsNullOrWhiteSpace(doc.State)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.State),
            postalCode: string.IsNullOrWhiteSpace(doc.PostalCode)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.PostalCode),
            phone: string.IsNullOrWhiteSpace(doc.Phone)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Phone),
            website: string.IsNullOrWhiteSpace(doc.Website)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Website),
            notes: string.IsNullOrWhiteSpace(doc.Notes)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Notes),
            createdAt: doc.CreatedAt,
            updatedAt: doc.UpdatedAt
        );
    }

    /// <summary>
    /// Maps a Merchant domain entity to a FinancialMerchantDocument.
    /// </summary>
    /// <param name="m">The Merchant domain entity to map.</param>
    /// <returns>A FinancialMerchantDocument suitable for database storage.</returns>
    /// <remarks>
    /// Converts FSharpOption types to document null values.
    /// Extracts primitive values from domain modules for storage.
    /// Preserves all merchant properties including contact information and default category.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when m is null.</exception>
    public static FinancialMerchantDocument ToDocument(Merchant m)
    {
        return new FinancialMerchantDocument
        {
            Key = MerchantIdModule.value(m.Id),
            Name = m.Name,
            DefaultCategoryKey = FSharpOption<CategoryId>.get_IsSome(m.DefaultCategoryId)
                ? CategoryIdModule.value(m.DefaultCategoryId.Value)
                : null,
            Address = FSharpOption<string>.get_IsSome(m.Address) ? m.Address.Value : null,
            City = FSharpOption<string>.get_IsSome(m.City) ? m.City.Value : null,
            State = FSharpOption<string>.get_IsSome(m.State) ? m.State.Value : null,
            PostalCode = FSharpOption<string>.get_IsSome(m.PostalCode) ? m.PostalCode.Value : null,
            Phone = FSharpOption<string>.get_IsSome(m.Phone) ? m.Phone.Value : null,
            Website = FSharpOption<string>.get_IsSome(m.Website) ? m.Website.Value : null,
            Notes = FSharpOption<string>.get_IsSome(m.Notes) ? m.Notes.Value : null,
            CreatedAt = m.CreatedAt,
            UpdatedAt = m.UpdatedAt,
        };
    }

    /// <summary>
    /// Maps a FinancialCategoryDocument to a Category domain entity.
    /// </summary>
    /// <param name="doc">The FinancialCategoryDocument to map.</param>
    /// <returns>A Category domain entity, or null if doc is null or invalid.</returns>
    /// <remarks>
    /// Handles null documents gracefully by returning null.
    /// Validates category type before mapping.
    /// Converts option types from document null values to FSharpOption.
    /// Handles hierarchical relationships with parent categories.
    /// </remarks>
    /// <exception cref="InvalidOperationException">
    /// Thrown when category type is invalid.
    /// </exception>
    /// <exception cref="FormatException">
    /// Thrown when GUID parsing fails for invalid document keys.
    /// </exception>
    public static Category? ToDomain(FinancialCategoryDocument? doc)
    {
        if (doc is null)
            return null;
        var typeResult = CategoryTypeModule.fromString(doc.Type);
        if (typeResult.IsError)
            return null;
        return new Category(
            id: CategoryIdModule.fromString(doc.Key),
            name: doc.Name,
            categoryType: typeResult.ResultValue,
            parentId: string.IsNullOrWhiteSpace(doc.ParentKey)
                ? FSharpOption<CategoryId>.None
                : FSharpOption<CategoryId>.Some(CategoryIdModule.fromString(doc.ParentKey)),
            icon: string.IsNullOrWhiteSpace(doc.Icon)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Icon),
            color: string.IsNullOrWhiteSpace(doc.Color)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Color),
            isActive: doc.IsActive,
            createdAt: doc.CreatedAt,
            updatedAt: doc.UpdatedAt
        );
    }

    /// <summary>
    /// Maps a Category domain entity to a FinancialCategoryDocument.
    /// </summary>
    /// <param name="c">The Category domain entity to map.</param>
    /// <returns>A FinancialCategoryDocument suitable for database storage.</returns>
    /// <remarks>
    /// Converts FSharpOption types to document null values.
    /// Extracts primitive values from domain modules for storage.
    /// Preserves all category properties including hierarchical relationships and styling.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when c is null.</exception>
    public static FinancialCategoryDocument ToDocument(Category c)
    {
        return new FinancialCategoryDocument
        {
            Key = CategoryIdModule.value(c.Id),
            Name = c.Name,
            Type = CategoryTypeModule.toString(c.CategoryType),
            ParentKey = FSharpOption<CategoryId>.get_IsSome(c.ParentId)
                ? CategoryIdModule.value(c.ParentId.Value)
                : null,
            Icon = FSharpOption<string>.get_IsSome(c.Icon) ? c.Icon.Value : null,
            Color = FSharpOption<string>.get_IsSome(c.Color) ? c.Color.Value : null,
            IsActive = c.IsActive,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt,
        };
    }

    /// <summary>
    /// Maps a FinancialReceiptDocument to a Receipt domain entity.
    /// </summary>
    /// <param name="doc">The FinancialReceiptDocument to map.</param>
    /// <returns>A Receipt domain entity, or null if doc is null.</returns>
    /// <remarks>
    /// Handles null documents gracefully by returning null.
    /// Converts option types from document null values to FSharpOption.
    /// Reconstructs receipt with file information and financial amounts.
    /// Handles relationships with transactions and merchants.
    /// </remarks>
    /// <exception cref="FormatException">
    /// Thrown when GUID parsing fails for invalid document keys.
    /// </exception>
    public static Receipt? ToDomain(FinancialReceiptDocument? doc)
    {
        if (doc is null)
            return null;
        return new Receipt(
            id: ReceiptIdModule.fromString(doc.Key),
            transactionId: string.IsNullOrWhiteSpace(doc.TransactionKey)
                ? FSharpOption<TransactionId>.None
                : FSharpOption<TransactionId>.Some(
                    TransactionIdModule.fromString(doc.TransactionKey)
                ),
            merchantId: string.IsNullOrWhiteSpace(doc.MerchantKey)
                ? FSharpOption<MerchantId>.None
                : FSharpOption<MerchantId>.Some(MerchantIdModule.fromString(doc.MerchantKey)),
            fileName: doc.FileName,
            contentType: doc.ContentType,
            fileSize: doc.FileSize,
            storageKey: doc.StorageKey,
            receiptDate: doc.ReceiptDate.HasValue
                ? FSharpOption<global::System.DateTime>.Some(doc.ReceiptDate.Value)
                : FSharpOption<global::System.DateTime>.None,
            totalAmount: doc.TotalAmount.HasValue
                ? FSharpOption<Money>.Some(MoneyModule.create(doc.TotalAmount.Value))
                : FSharpOption<Money>.None,
            taxAmount: doc.TaxAmount.HasValue
                ? FSharpOption<Money>.Some(MoneyModule.create(doc.TaxAmount.Value))
                : FSharpOption<Money>.None,
            notes: string.IsNullOrWhiteSpace(doc.Notes)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Notes),
            uploadedAt: doc.UploadedAt,
            createdAt: doc.CreatedAt,
            updatedAt: doc.UpdatedAt
        );
    }

    /// <summary>
    /// Maps a Receipt domain entity to a FinancialReceiptDocument.
    /// </summary>
    /// <param name="r">The Receipt domain entity to map.</param>
    /// <returns>A FinancialReceiptDocument suitable for database storage.</returns>
    /// <remarks>
    /// Converts FSharpOption types to document null values.
    /// Extracts primitive values from domain modules for storage.
    /// Preserves all receipt properties including file information and financial amounts.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when r is null.</exception>
    public static FinancialReceiptDocument ToDocument(Receipt r)
    {
        return new FinancialReceiptDocument
        {
            Key = ReceiptIdModule.value(r.Id),
            TransactionKey = FSharpOption<TransactionId>.get_IsSome(r.TransactionId)
                ? TransactionIdModule.value(r.TransactionId.Value)
                : null,
            MerchantKey = FSharpOption<MerchantId>.get_IsSome(r.MerchantId)
                ? MerchantIdModule.value(r.MerchantId.Value)
                : null,
            FileName = r.FileName,
            ContentType = r.ContentType,
            FileSize = r.FileSize,
            StorageKey = r.StorageKey,
            ReceiptDate = FSharpOption<global::System.DateTime>.get_IsSome(r.ReceiptDate)
                ? r.ReceiptDate.Value
                : null,
            TotalAmount = FSharpOption<Money>.get_IsSome(r.TotalAmount)
                ? MoneyModule.value(r.TotalAmount.Value)
                : null,
            TaxAmount = FSharpOption<Money>.get_IsSome(r.TaxAmount)
                ? MoneyModule.value(r.TaxAmount.Value)
                : null,
            Notes = FSharpOption<string>.get_IsSome(r.Notes) ? r.Notes.Value : null,
            UploadedAt = r.UploadedAt,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
        };
    }

    /// <summary>
    /// Maps a FinancialBudgetDocument to a Budget domain entity.
    /// </summary>
    /// <param name="doc">The FinancialBudgetDocument to map.</param>
    /// <returns>A Budget domain entity, or null if doc is null or invalid.</returns>
    /// <remarks>
    /// Handles null documents gracefully by returning null.
    /// Validates budget period type before mapping.
    /// Reconstructs budget period with proper date calculations.
    /// Handles budget amounts and category relationships.
    /// </remarks>
    /// <exception cref="InvalidOperationException">
    /// Thrown when budget period type is invalid.
    /// </exception>
    /// <exception cref="FormatException">
    /// Thrown when GUID parsing fails for invalid document keys.
    /// </exception>
    public static Budget? ToDomain(FinancialBudgetDocument? doc)
    {
        if (doc is null)
            return null;
        var periodTypeResult = BudgetPeriodTypeModule.fromString(doc.PeriodType);
        if (periodTypeResult.IsError)
            return null;

        var startDate = doc.StartDate ?? new global::System.DateTime(doc.Year, doc.Month, 1);
        var endDate = doc.EndDate ?? startDate.AddMonths(1).AddDays(-1);
        var periodKey = doc.PeriodKey ?? $"{doc.Year:D4}-{doc.Month:D2}";

        var period = new BudgetPeriod(
            periodType: periodTypeResult.ResultValue,
            startDate: startDate,
            endDate: endDate,
            periodKey: periodKey
        );

        return new Budget(
            id: BudgetIdModule.fromString(doc.Key),
            period: period,
            categoryId: CategoryIdModule.fromString(doc.CategoryKey),
            budgetedAmount: MoneyModule.create(doc.BudgetedAmount),
            spentAmount: MoneyModule.create(doc.SpentAmount),
            rolloverAmount: MoneyModule.create(doc.RolloverAmount),
            notes: string.IsNullOrWhiteSpace(doc.Notes)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Notes),
            createdAt: doc.CreatedAt,
            updatedAt: doc.UpdatedAt
        );
    }

    /// <summary>
    /// Maps a Budget domain entity to a FinancialBudgetDocument.
    /// </summary>
    /// <param name="b">The Budget domain entity to map.</param>
    /// <returns>A FinancialBudgetDocument suitable for database storage.</returns>
    /// <remarks>
    /// Converts FSharpOption types to document null values.
    /// Extracts primitive values from domain modules for storage.
    /// Preserves all budget properties including period information and amounts.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when b is null.</exception>
    public static FinancialBudgetDocument ToDocument(Budget b)
    {
        return new FinancialBudgetDocument
        {
            Key = BudgetIdModule.value(b.Id),
            Year = b.Period.StartDate.Year,
            Month = b.Period.StartDate.Month,
            PeriodType = BudgetPeriodTypeModule.toString(b.Period.PeriodType),
            StartDate = b.Period.StartDate,
            EndDate = b.Period.EndDate,
            PeriodKey = b.Period.PeriodKey,
            CategoryKey = CategoryIdModule.value(b.CategoryId),
            BudgetedAmount = MoneyModule.value(b.BudgetedAmount),
            SpentAmount = MoneyModule.value(b.SpentAmount),
            RolloverAmount = MoneyModule.value(b.RolloverAmount),
            Notes = FSharpOption<string>.get_IsSome(b.Notes) ? b.Notes.Value : null,
            CreatedAt = b.CreatedAt,
            UpdatedAt = b.UpdatedAt,
        };
    }

    /// <summary>
    /// Maps a FinancialReconciliationDocument to a Reconciliation domain entity.
    /// </summary>
    /// <param name="doc">The FinancialReconciliationDocument to map.</param>
    /// <returns>A Reconciliation domain entity, or null if doc is null or invalid.</returns>
    /// <remarks>
    /// Handles null documents gracefully by returning null.
    /// Validates reconciliation status before mapping.
    /// Reconstructs matched transaction IDs from document keys.
    /// Handles reconciliation balances and completion status.
    /// </remarks>
    /// <exception cref="InvalidOperationException">
    /// Thrown when reconciliation status is invalid.
    /// </exception>
    /// <exception cref="FormatException">
    /// Thrown when GUID parsing fails for invalid document keys.
    /// </exception>
    public static Reconciliation? ToDomain(FinancialReconciliationDocument? doc)
    {
        if (doc is null)
            return null;
        var statusResult = ReconciliationStatusModule.fromString(doc.Status);
        if (statusResult.IsError)
            return null;

        var matchedTxIds = doc
            .MatchedTransactionKeys.Select(TransactionIdModule.fromString)
            .ToList();

        return new Reconciliation(
            id: ReconciliationIdModule.fromString(doc.Key),
            accountId: AccountIdModule.fromString(doc.AccountKey),
            statementDate: doc.StatementDate,
            statementBalance: MoneyModule.create(doc.StatementBalance),
            clearedBalance: MoneyModule.create(doc.ClearedBalance),
            difference: MoneyModule.create(doc.Difference),
            status: statusResult.ResultValue,
            matchedTransactionIds: ListModule.OfSeq(matchedTxIds),
            notes: string.IsNullOrWhiteSpace(doc.Notes)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Notes),
            completedAt: doc.CompletedAt.HasValue
                ? FSharpOption<global::System.DateTime>.Some(doc.CompletedAt.Value)
                : FSharpOption<global::System.DateTime>.None,
            createdAt: doc.CreatedAt,
            updatedAt: doc.UpdatedAt
        );
    }

    /// <summary>
    /// Maps a Reconciliation domain entity to a FinancialReconciliationDocument.
    /// </summary>
    /// <param name="r">The Reconciliation domain entity to map.</param>
    /// <returns>A FinancialReconciliationDocument suitable for database storage.</returns>
    /// <remarks>
    /// Converts FSharpOption types to document null values.
    /// Extracts primitive values from domain modules for storage.
    /// Preserves all reconciliation properties including matched transactions.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when r is null.</exception>
    public static FinancialReconciliationDocument ToDocument(Reconciliation r)
    {
        return new FinancialReconciliationDocument
        {
            Key = ReconciliationIdModule.value(r.Id),
            AccountKey = AccountIdModule.value(r.AccountId),
            StatementDate = r.StatementDate,
            StatementBalance = MoneyModule.value(r.StatementBalance),
            ClearedBalance = MoneyModule.value(r.ClearedBalance),
            Difference = MoneyModule.value(r.Difference),
            Status = ReconciliationStatusModule.toString(r.Status),
            MatchedTransactionKeys = r
                .MatchedTransactionIds.Select(TransactionIdModule.value)
                .ToList(),
            Notes = FSharpOption<string>.get_IsSome(r.Notes) ? r.Notes.Value : null,
            CompletedAt = FSharpOption<global::System.DateTime>.get_IsSome(r.CompletedAt)
                ? r.CompletedAt.Value
                : null,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
        };
    }

    /// <summary>
    /// Maps a PayPeriodConfigDocument to a PayPeriodConfig domain entity.
    /// </summary>
    /// <param name="doc">The PayPeriodConfigDocument to map.</param>
    /// <returns>A PayPeriodConfig domain entity, or null if doc is null.</returns>
    /// <remarks>
    /// Handles null documents gracefully by returning null.
    /// Reconstructs pay period configuration with anchor date and length.
    /// Simple mapping as pay period config has minimal properties.
    /// </remarks>
    public static PayPeriodConfig? ToDomain(PayPeriodConfigDocument? doc)
    {
        if (doc is null)
            return null;
        return new PayPeriodConfig(
            anchorDate: doc.AnchorDate,
            periodLengthDays: doc.PeriodLengthDays
        );
    }

    /// <summary>
    /// Maps a PayPeriodConfig domain entity to a PayPeriodConfigDocument.
    /// </summary>
    /// <param name="c">The PayPeriodConfig domain entity to map.</param>
    /// <returns>A PayPeriodConfigDocument suitable for database storage.</returns>
    /// <remarks>
    /// Uses fixed key "default" as pay period config is a singleton.
    /// Sets current UTC timestamps for created/updated at.
    /// Preserves anchor date and period length configuration.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when c is null.</exception>
    public static PayPeriodConfigDocument ToDocument(PayPeriodConfig c)
    {
        return new PayPeriodConfigDocument
        {
            Key = "default",
            AnchorDate = c.AnchorDate,
            PeriodLengthDays = c.PeriodLengthDays,
            CreatedAt = global::System.DateTime.UtcNow,
            UpdatedAt = global::System.DateTime.UtcNow,
        };
    }
}
