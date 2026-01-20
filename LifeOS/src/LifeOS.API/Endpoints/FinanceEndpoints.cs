using System.Text.Json;
using LifeOS.API.DTOs;
using LifeOS.Application.Finance;
using LifeOS.Domain.Finance;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using LifeOS.Infrastructure.Storage;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FSharp.Core;

namespace LifeOS.API.Endpoints;

public static class FinanceEndpoints
{
    private const string AccountCollection = ArangoDbContext.Collections.FinancialAccounts;
    private const string MerchantCollection = ArangoDbContext.Collections.FinancialMerchants;
    private const string CategoryCollection = ArangoDbContext.Collections.FinancialCategories;
    private const string TransactionCollection = ArangoDbContext.Collections.FinancialTransactions;
    private const string JournalEntryCollection = ArangoDbContext.Collections.FinancialJournalEntries;
    private const string ReceiptCollection = ArangoDbContext.Collections.FinancialReceipts;
    private const string ReconciliationCollection = ArangoDbContext.Collections.FinancialReconciliations;
    private const string BudgetCollection = ArangoDbContext.Collections.FinancialBudgets;

    public static void MapFinanceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/finance").WithTags("Finance");

        // Accounts
        var accounts = group.MapGroup("/accounts");
        accounts.MapGet("/", GetAccounts).WithName("GetFinancialAccounts");
        accounts.MapGet("/{key}", GetAccount).WithName("GetFinancialAccount");
        accounts.MapPost("/", CreateAccount).WithName("CreateFinancialAccount");
        accounts.MapPut("/{key}", UpdateAccount).WithName("UpdateFinancialAccount");

        // Merchants
        var merchants = group.MapGroup("/merchants");
        merchants.MapGet("/", GetMerchants).WithName("GetFinancialMerchants");
        merchants.MapGet("/{key}", GetMerchant).WithName("GetFinancialMerchant");
        merchants.MapPost("/", CreateMerchant).WithName("CreateFinancialMerchant");

        // Categories
        var categories = group.MapGroup("/categories");
        categories.MapGet("/", GetCategories).WithName("GetFinancialCategories");
        categories.MapGet("/{key}", GetCategory).WithName("GetFinancialCategory");
        categories.MapPost("/", CreateCategory).WithName("CreateFinancialCategory");

        // Transactions
        var transactions = group.MapGroup("/transactions");
        transactions.MapGet("/", GetTransactions).WithName("GetFinancialTransactions");
        transactions.MapGet("/{key}", GetTransaction).WithName("GetFinancialTransaction");
        transactions.MapPost("/", CreateTransaction).WithName("CreateFinancialTransaction");
        transactions.MapPut("/{key}", UpdateTransaction).WithName("UpdateFinancialTransaction");
        transactions.MapPost("/transfer", CreateTransfer).WithName("CreateFinancialTransfer");
        transactions.MapPost("/{key}/void", VoidTransaction).WithName("VoidFinancialTransaction");
        transactions.MapGet("/{key}/journal-entries", GetTransactionJournalEntries).WithName("GetTransactionJournalEntries");
        transactions.MapPost("/{key}/attach-receipt", AttachReceiptToTransaction).WithName("AttachReceiptToTransaction");

        // Receipts
        var receipts = group.MapGroup("/receipts");
        receipts.MapGet("/", GetReceipts).WithName("GetFinancialReceipts");
        receipts.MapGet("/{key}", GetReceipt).WithName("GetFinancialReceipt");
        receipts.MapPost("/upload-url", GetReceiptUploadUrl).WithName("GetReceiptUploadUrl");
        receipts.MapPost("/", CreateReceipt).WithName("CreateFinancialReceipt");
        receipts.MapGet("/{key}/download-url", GetReceiptDownloadUrl).WithName("GetReceiptDownloadUrl");

        // Reconciliations
        var reconciliations = group.MapGroup("/reconciliations");
        reconciliations.MapGet("/", GetReconciliations).WithName("GetFinancialReconciliations");
        reconciliations.MapGet("/{key}", GetReconciliation).WithName("GetFinancialReconciliation");
        reconciliations.MapPost("/", CreateReconciliation).WithName("CreateFinancialReconciliation");
        reconciliations.MapPost("/{key}/match", MatchTransactions).WithName("MatchReconciliationTransactions");
        reconciliations.MapPost("/{key}/complete", CompleteReconciliation).WithName("CompleteReconciliation");

        // Budgets (legacy month-based)
        var budgets = group.MapGroup("/budgets");
        budgets.MapGet("/{year}/{month}", GetBudgetSummary).WithName("GetBudgetSummary");
        budgets.MapPut("/{year}/{month}", CreateOrUpdateBudget).WithName("CreateOrUpdateBudget");

        // Budgets (new flexible periods)
        budgets.MapGet("/period", GetPeriodBudgetSummary).WithName("GetPeriodBudgetSummary");
        budgets.MapPut("/period", CreateOrUpdatePeriodBudget).WithName("CreateOrUpdatePeriodBudget");

        // Pay period configuration
        var payPeriod = group.MapGroup("/pay-period-config");
        payPeriod.MapGet("/", GetPayPeriodConfig).WithName("GetPayPeriodConfig");
        payPeriod.MapPut("/", CreateOrUpdatePayPeriodConfig).WithName("CreateOrUpdatePayPeriodConfig");
    }

    // ==================== ACCOUNTS ====================

    private static async Task<IResult> GetAccounts(
        [FromServices] ArangoDbContext db,
        [FromQuery] bool? isActive = null)
    {
        var filter = isActive.HasValue
            ? $"FILTER doc.isActive == {isActive.Value.ToString().ToLower()}"
            : "";

        var query = $@"
            FOR doc IN {AccountCollection}
            {filter}
            SORT doc.name ASC
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<FinancialAccountDocument>(query);
        var accounts = cursor.Result.Select(MapAccount).ToList();
        return Results.Ok(accounts);
    }

    private static async Task<IResult> GetAccount(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<FinancialAccountDocument>(AccountCollection, key);
            return Results.Ok(MapAccount(doc));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CreateAccount(
        CreateFinancialAccountRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;
        var doc = new FinancialAccountDocument
        {
            Key = Guid.NewGuid().ToString("N")[..12],
            Name = request.Name,
            Type = request.Type,
            Institution = request.Institution,
            AccountNumber = request.AccountNumber,
            Currency = request.Currency,
            OpeningBalance = request.OpeningBalance,
            CurrentBalance = request.OpeningBalance,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        var result = await db.Client.Document.PostDocumentAsync(AccountCollection, doc);
        doc.Key = result._key;
        return Results.Created($"/api/v1/finance/accounts/{doc.Key}", MapAccount(doc));
    }

    private static async Task<IResult> UpdateAccount(
        string key,
        UpdateFinancialAccountRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            var existing = await db.Client.Document.GetDocumentAsync<FinancialAccountDocument>(AccountCollection, key);

            if (request.Name != null) existing.Name = request.Name;
            if (request.Institution != null) existing.Institution = request.Institution;
            if (request.AccountNumber != null) existing.AccountNumber = request.AccountNumber;
            if (request.IsActive.HasValue) existing.IsActive = request.IsActive.Value;
            existing.UpdatedAt = DateTime.UtcNow;

            await db.Client.Document.PutDocumentAsync($"{AccountCollection}/{key}", existing);
            return Results.Ok(MapAccount(existing));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    // ==================== MERCHANTS ====================

    private static async Task<IResult> GetMerchants(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? search = null)
    {
        var filter = !string.IsNullOrEmpty(search)
            ? $"FILTER CONTAINS(LOWER(doc.name), LOWER(@search))"
            : "";

        var query = $@"
            FOR doc IN {MerchantCollection}
            {filter}
            SORT doc.name ASC
            LIMIT 100
            RETURN doc";

        var bindVars = new Dictionary<string, object>();
        if (!string.IsNullOrEmpty(search)) bindVars["search"] = search;

        var cursor = await db.Client.Cursor.PostCursorAsync<FinancialMerchantDocument>(query, bindVars);
        var merchants = cursor.Result.Select(MapMerchant).ToList();
        return Results.Ok(merchants);
    }

    private static async Task<IResult> GetMerchant(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<FinancialMerchantDocument>(MerchantCollection, key);
            return Results.Ok(MapMerchant(doc));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CreateMerchant(
        CreateFinancialMerchantRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;
        var doc = new FinancialMerchantDocument
        {
            Key = Guid.NewGuid().ToString("N")[..12],
            Name = request.Name,
            DefaultCategoryKey = request.DefaultCategoryKey,
            Address = request.Address,
            City = request.City,
            State = request.State,
            PostalCode = request.PostalCode,
            Phone = request.Phone,
            Website = request.Website,
            Notes = request.Notes,
            CreatedAt = now,
            UpdatedAt = now
        };

        var result = await db.Client.Document.PostDocumentAsync(MerchantCollection, doc);
        doc.Key = result._key;
        return Results.Created($"/api/v1/finance/merchants/{doc.Key}", MapMerchant(doc));
    }

    // ==================== CATEGORIES ====================

    private static async Task<IResult> GetCategories(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? type = null)
    {
        var filter = !string.IsNullOrEmpty(type)
            ? $"FILTER doc.type == @type"
            : "";

        var query = $@"
            FOR doc IN {CategoryCollection}
            {filter}
            SORT doc.name ASC
            RETURN doc";

        var bindVars = new Dictionary<string, object>();
        if (!string.IsNullOrEmpty(type)) bindVars["type"] = type;

        var cursor = await db.Client.Cursor.PostCursorAsync<FinancialCategoryDocument>(query, bindVars);
        var categories = cursor.Result.Select(MapCategory).ToList();
        return Results.Ok(categories);
    }

    private static async Task<IResult> GetCategory(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<FinancialCategoryDocument>(CategoryCollection, key);
            return Results.Ok(MapCategory(doc));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CreateCategory(
        CreateFinancialCategoryRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;
        var doc = new FinancialCategoryDocument
        {
            Key = Guid.NewGuid().ToString("N")[..12],
            Name = request.Name,
            Type = request.Type,
            ParentKey = request.ParentKey,
            Icon = request.Icon,
            Color = request.Color,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        var result = await db.Client.Document.PostDocumentAsync(CategoryCollection, doc);
        doc.Key = result._key;
        return Results.Created($"/api/v1/finance/categories/{doc.Key}", MapCategory(doc));
    }

    // ==================== TRANSACTIONS ====================

    private static async Task<IResult> GetTransactions(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? accountKey = null,
        [FromQuery] string? categoryKey = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string? status = null,
        [FromQuery] int limit = 100,
        [FromQuery] int offset = 0)
    {
        var filters = new List<string>();
        var bindVars = new Dictionary<string, object>();

        if (!string.IsNullOrEmpty(accountKey))
        {
            filters.Add("doc.accountKey == @accountKey");
            bindVars["accountKey"] = accountKey;
        }
        if (!string.IsNullOrEmpty(categoryKey))
        {
            filters.Add("doc.categoryKey == @categoryKey");
            bindVars["categoryKey"] = categoryKey;
        }
        if (startDate.HasValue)
        {
            filters.Add("doc.postedAt >= @startDate");
            bindVars["startDate"] = startDate.Value.ToString("o");
        }
        if (endDate.HasValue)
        {
            filters.Add("doc.postedAt <= @endDate");
            bindVars["endDate"] = endDate.Value.ToString("o");
        }
        if (!string.IsNullOrEmpty(status))
        {
            filters.Add("doc.status == @status");
            bindVars["status"] = status;
        }

        var filterClause = filters.Count > 0 ? $"FILTER {string.Join(" AND ", filters)}" : "";

        var query = $@"
            FOR doc IN {TransactionCollection}
            {filterClause}
            SORT doc.postedAt DESC
            LIMIT @offset, @limit
            RETURN doc";

        bindVars["offset"] = offset;
        bindVars["limit"] = limit;

        var cursor = await db.Client.Cursor.PostCursorAsync<FinancialTransactionDocument>(query, bindVars);
        var transactions = cursor.Result.Select(MapTransaction).ToList();
        return Results.Ok(transactions);
    }

    private static async Task<IResult> GetTransaction(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<FinancialTransactionDocument>(TransactionCollection, key);
            return Results.Ok(MapTransaction(doc));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CreateTransaction(
        CreateFinancialTransactionRequest request,
        [FromServices] IFinanceApplicationService financeAppService)
    {
        var result = await financeAppService.CreateTransactionAsync(
            new CreateTransactionCommand(
                AccountKey: request.AccountKey,
                MerchantKey: request.MerchantKey,
                CategoryKey: request.CategoryKey,
                Amount: request.Amount,
                Description: request.Description,
                Memo: request.Memo,
                PostedAt: request.PostedAt,
                AuthorizedAt: request.AuthorizedAt,
                CheckNumber: request.CheckNumber,
                Tags: request.Tags));

        if (result.IsError)
        {
            var error = result.ErrorValue;
            var errorMessage = error switch
            {
                LifeOS.Domain.Common.DomainError.ValidationError ve => ve.Item,
                LifeOS.Domain.Common.DomainError.BusinessRuleViolation br => br.Item,
                LifeOS.Domain.Common.DomainError.NotFoundError nf => nf.Item,
                _ => "Transaction creation failed"
            };
            return Results.BadRequest(new { Error = errorMessage });
        }

        var tx = result.ResultValue;
        var key = TransactionIdModule.value(tx.Id);
        return Results.Created($"/api/v1/finance/transactions/{key}", MapTransaction(tx));
    }

    private static async Task<IResult> UpdateTransaction(
        string key,
        UpdateFinancialTransactionRequest request,
        [FromServices] IFinanceApplicationService financeAppService)
    {
        var result = await financeAppService.UpdateTransactionAsync(
            new UpdateTransactionCommand(
                TransactionKey: key,
                MerchantKey: request.MerchantKey,
                CategoryKey: request.CategoryKey,
                Amount: request.Amount,
                Description: request.Description,
                Memo: request.Memo,
                PostedAt: request.PostedAt,
                Status: request.Status,
                CheckNumber: request.CheckNumber,
                Tags: request.Tags));

        if (result.IsError)
        {
            var error = result.ErrorValue;
            return error switch
            {
                LifeOS.Domain.Common.DomainError.NotFoundError _ => Results.NotFound(),
                LifeOS.Domain.Common.DomainError.ValidationError ve => Results.BadRequest(new { Error = ve.Item }),
                LifeOS.Domain.Common.DomainError.BusinessRuleViolation br => Results.BadRequest(new { Error = br.Item }),
                _ => Results.BadRequest(new { Error = "Update failed" })
            };
        }

        return Results.Ok(MapTransaction(result.ResultValue));
    }

    private static async Task<IResult> VoidTransaction(
        string key,
        [FromServices] IFinanceApplicationService financeAppService)
    {
        var result = await financeAppService.VoidTransactionAsync(key);

        if (result.IsError)
        {
            var error = result.ErrorValue;
            return error switch
            {
                LifeOS.Domain.Common.DomainError.NotFoundError _ => Results.NotFound(),
                LifeOS.Domain.Common.DomainError.ValidationError ve => Results.BadRequest(new { Error = ve.Item }),
                LifeOS.Domain.Common.DomainError.BusinessRuleViolation br => Results.BadRequest(new { Error = br.Item }),
                _ => Results.BadRequest(new { Error = "Void failed" })
            };
        }

        return Results.Ok(MapTransaction(result.ResultValue));
    }

    private static async Task<IResult> CreateTransfer(
        CreateFinancialTransferRequest request,
        [FromServices] IFinanceApplicationService financeAppService)
    {
        var result = await financeAppService.ExecuteTransferAsync(
            new CreateTransferCommand(
                FromAccountKey: request.FromAccountKey,
                ToAccountKey: request.ToAccountKey,
                Amount: request.Amount,
                Description: request.Description,
                PostedAt: request.PostedAt));

        if (result.IsError)
        {
            var error = result.ErrorValue;
            var errorMessage = error switch
            {
                LifeOS.Domain.Common.DomainError.ValidationError ve => ve.Item,
                LifeOS.Domain.Common.DomainError.BusinessRuleViolation br => br.Item,
                LifeOS.Domain.Common.DomainError.NotFoundError nf => nf.Item,
                _ => "Transfer failed"
            };
            return Results.BadRequest(new { Error = errorMessage });
        }

        var r = result.ResultValue;
        // For now, return DTOs with minimal fields (matching existing response shape)
        var withdrawalDto = new FinancialTransactionDto
        {
            Key = r.WithdrawalTransactionKey,
            AccountKey = request.FromAccountKey,
            Amount = -Math.Abs(request.Amount),
            Description = request.Description ?? "Transfer",
            PostedAt = request.PostedAt ?? DateTime.UtcNow,
            Status = "Posted",
            Tags = new List<string> { "transfer", $"transfer:{r.TransferId}" },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var depositDto = new FinancialTransactionDto
        {
            Key = r.DepositTransactionKey,
            AccountKey = request.ToAccountKey,
            Amount = Math.Abs(request.Amount),
            Description = request.Description ?? "Transfer",
            PostedAt = request.PostedAt ?? DateTime.UtcNow,
            Status = "Posted",
            Tags = new List<string> { "transfer", $"transfer:{r.TransferId}" },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        return Results.Created($"/api/v1/finance/transactions/{r.WithdrawalTransactionKey}", new
        {
            WithdrawalTransaction = withdrawalDto,
            DepositTransaction = depositDto,
            TransferId = r.TransferId
        });
    }

    private static async Task<IResult> GetTransactionJournalEntries(string key, [FromServices] ArangoDbContext db)
    {
        var query = $@"
            FOR doc IN {JournalEntryCollection}
            FILTER doc.transactionKey == @key
            SORT doc.createdAt ASC
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<FinancialJournalEntryDocument>(
            query, new Dictionary<string, object> { ["key"] = key });

        var entries = cursor.Result.Select(MapJournalEntry).ToList();
        return Results.Ok(entries);
    }

    private static async Task<IResult> AttachReceiptToTransaction(
        string key,
        AttachReceiptToTransactionRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            var tx = await db.Client.Document.GetDocumentAsync<FinancialTransactionDocument>(TransactionCollection, key);
            tx.ReceiptKey = request.ReceiptKey;
            tx.UpdatedAt = DateTime.UtcNow;

            await db.Client.Document.PutDocumentAsync($"{TransactionCollection}/{key}", tx);

            // Also update the receipt to link back
            try
            {
                var receipt = await db.Client.Document.GetDocumentAsync<FinancialReceiptDocument>(ReceiptCollection, request.ReceiptKey);
                receipt.TransactionKey = key;
                receipt.UpdatedAt = DateTime.UtcNow;
                await db.Client.Document.PutDocumentAsync($"{ReceiptCollection}/{request.ReceiptKey}", receipt);
            }
            catch { /* Receipt may not exist yet */ }

            return Results.Ok(MapTransaction(tx));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    // ==================== RECEIPTS ====================

    private static async Task<IResult> GetReceipts(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? transactionKey = null,
        [FromQuery] int limit = 50)
    {
        var filter = !string.IsNullOrEmpty(transactionKey)
            ? "FILTER doc.transactionKey == @transactionKey"
            : "";

        var query = $@"
            FOR doc IN {ReceiptCollection}
            {filter}
            SORT doc.uploadedAt DESC
            LIMIT @limit
            RETURN doc";

        var bindVars = new Dictionary<string, object> { ["limit"] = limit };
        if (!string.IsNullOrEmpty(transactionKey)) bindVars["transactionKey"] = transactionKey;

        var cursor = await db.Client.Cursor.PostCursorAsync<FinancialReceiptDocument>(query, bindVars);
        var receipts = cursor.Result.Select(MapReceipt).ToList();
        return Results.Ok(receipts);
    }

    private static async Task<IResult> GetReceipt(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<FinancialReceiptDocument>(ReceiptCollection, key);
            return Results.Ok(MapReceipt(doc));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> GetReceiptUploadUrl(
        CreateFinancialReceiptRequest request,
        [FromServices] ArangoDbContext db,
        [FromServices] MinioStorageService minio)
    {
        var now = DateTime.UtcNow;
        var receiptKey = Guid.NewGuid().ToString("N")[..12];
        var storageKey = $"{now:yyyy/MM}/{receiptKey}/{request.FileName}";

        // Create receipt record first
        var doc = new FinancialReceiptDocument
        {
            Key = receiptKey,
            TransactionKey = request.TransactionKey,
            MerchantKey = request.MerchantKey,
            FileName = request.FileName,
            ContentType = request.ContentType,
            FileSize = request.FileSize,
            StorageKey = storageKey,
            ReceiptDate = request.ReceiptDate,
            TotalAmount = request.TotalAmount,
            TaxAmount = request.TaxAmount,
            Notes = request.Notes,
            UploadedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        await db.Client.Document.PostDocumentAsync(ReceiptCollection, doc);

        // Generate presigned upload URL
        var uploadUrl = await minio.GetReceiptUploadUrlAsync(storageKey, 3600);

        return Results.Ok(new ReceiptUploadUrlResponse
        {
            ReceiptKey = receiptKey,
            UploadUrl = uploadUrl,
            StorageKey = storageKey,
            ExpiresInSeconds = 3600
        });
    }

    private static async Task<IResult> CreateReceipt(
        CreateFinancialReceiptRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;
        var receiptKey = Guid.NewGuid().ToString("N")[..12];
        var storageKey = $"{now:yyyy/MM}/{receiptKey}/{request.FileName}";

        var doc = new FinancialReceiptDocument
        {
            Key = receiptKey,
            TransactionKey = request.TransactionKey,
            MerchantKey = request.MerchantKey,
            FileName = request.FileName,
            ContentType = request.ContentType,
            FileSize = request.FileSize,
            StorageKey = storageKey,
            ReceiptDate = request.ReceiptDate,
            TotalAmount = request.TotalAmount,
            TaxAmount = request.TaxAmount,
            Notes = request.Notes,
            UploadedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        await db.Client.Document.PostDocumentAsync(ReceiptCollection, doc);
        return Results.Created($"/api/v1/finance/receipts/{receiptKey}", MapReceipt(doc));
    }

    private static async Task<IResult> GetReceiptDownloadUrl(
        string key,
        [FromServices] ArangoDbContext db,
        [FromServices] MinioStorageService minio)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<FinancialReceiptDocument>(ReceiptCollection, key);
            var downloadUrl = await minio.GetReceiptDownloadUrlAsync(doc.StorageKey, 3600);
            return Results.Ok(new { DownloadUrl = downloadUrl, ExpiresInSeconds = 3600 });
        }
        catch
        {
            return Results.NotFound();
        }
    }

    // ==================== RECONCILIATIONS ====================

    private static async Task<IResult> GetReconciliations(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? accountKey = null,
        [FromQuery] string? status = null)
    {
        var filters = new List<string>();
        var bindVars = new Dictionary<string, object>();

        if (!string.IsNullOrEmpty(accountKey))
        {
            filters.Add("doc.accountKey == @accountKey");
            bindVars["accountKey"] = accountKey;
        }
        if (!string.IsNullOrEmpty(status))
        {
            filters.Add("doc.status == @status");
            bindVars["status"] = status;
        }

        var filterClause = filters.Count > 0 ? $"FILTER {string.Join(" AND ", filters)}" : "";

        var query = $@"
            FOR doc IN {ReconciliationCollection}
            {filterClause}
            SORT doc.statementDate DESC
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<FinancialReconciliationDocument>(query, bindVars);
        var reconciliations = cursor.Result.Select(MapReconciliation).ToList();
        return Results.Ok(reconciliations);
    }

    private static async Task<IResult> GetReconciliation(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<FinancialReconciliationDocument>(ReconciliationCollection, key);
            return Results.Ok(MapReconciliation(doc));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CreateReconciliation(
        CreateFinancialReconciliationRequest request,
        [FromServices] IFinanceApplicationService financeAppService)
    {
        var result = await financeAppService.CreateReconciliationAsync(
            new CreateReconciliationCommand(
                AccountKey: request.AccountKey,
                StatementDate: request.StatementDate,
                StatementBalance: request.StatementBalance));

        if (result.IsError)
        {
            var error = result.ErrorValue;
            var errorMessage = error switch
            {
                LifeOS.Domain.Common.DomainError.ValidationError ve => ve.Item,
                LifeOS.Domain.Common.DomainError.BusinessRuleViolation br => br.Item,
                LifeOS.Domain.Common.DomainError.NotFoundError nf => nf.Item,
                _ => "Reconciliation creation failed"
            };
            return Results.BadRequest(new { Error = errorMessage });
        }

        var reconciliation = result.ResultValue;
        var key = ReconciliationIdModule.value(reconciliation.Id);
        return Results.Created($"/api/v1/finance/reconciliations/{key}", MapReconciliation(reconciliation));
    }

    private static async Task<IResult> MatchTransactions(
        string key,
        MatchTransactionsRequest request,
        [FromServices] IFinanceApplicationService financeAppService)
    {
        var result = await financeAppService.MatchTransactionsAsync(
            new MatchTransactionsCommand(
                ReconciliationKey: key,
                TransactionKeys: request.TransactionKeys));

        if (result.IsError)
        {
            var error = result.ErrorValue;
            return error switch
            {
                LifeOS.Domain.Common.DomainError.NotFoundError _ => Results.NotFound(),
                LifeOS.Domain.Common.DomainError.ValidationError ve => Results.BadRequest(new { Error = ve.Item }),
                LifeOS.Domain.Common.DomainError.BusinessRuleViolation br => Results.BadRequest(new { Error = br.Item }),
                _ => Results.BadRequest(new { Error = "Match transactions failed" })
            };
        }

        return Results.Ok(MapReconciliation(result.ResultValue));
    }

    private static async Task<IResult> CompleteReconciliation(
        string key,
        CompleteReconciliationRequest request,
        [FromServices] IFinanceApplicationService financeAppService)
    {
        var result = await financeAppService.CompleteReconciliationAsync(
            new CompleteReconciliationCommand(
                ReconciliationKey: key,
                Notes: request.Notes));

        if (result.IsError)
        {
            var error = result.ErrorValue;
            return error switch
            {
                LifeOS.Domain.Common.DomainError.NotFoundError _ => Results.NotFound(),
                LifeOS.Domain.Common.DomainError.ValidationError ve => Results.BadRequest(new { Error = ve.Item }),
                LifeOS.Domain.Common.DomainError.BusinessRuleViolation br => Results.BadRequest(new { Error = br.Item }),
                _ => Results.BadRequest(new { Error = "Complete reconciliation failed" })
            };
        }

        return Results.Ok(MapReconciliation(result.ResultValue));
    }

    // ==================== BUDGETS (Legacy Month-Based) ====================

    private static async Task<IResult> GetBudgetSummary(
        int year,
        int month,
        [FromServices] ArangoDbContext db)
    {
        var query = $@"
            FOR doc IN {BudgetCollection}
            FILTER doc.year == @year AND doc.month == @month
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<FinancialBudgetDocument>(
            query, new Dictionary<string, object> { ["year"] = year, ["month"] = month });

        var budgets = cursor.Result.Select(MapBudget).ToList();

        var summary = new BudgetSummaryDto
        {
            Year = year,
            Month = month,
            TotalBudgeted = budgets.Sum(b => b.BudgetedAmount),
            TotalSpent = budgets.Sum(b => b.SpentAmount),
            TotalAvailable = budgets.Sum(b => b.AvailableAmount),
            Categories = budgets
        };

        return Results.Ok(summary);
    }

    private static async Task<IResult> CreateOrUpdateBudget(
        int year,
        int month,
        CreateOrUpdateBudgetRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;

        // Check if budget exists for this category/period
        var query = $@"
            FOR doc IN {BudgetCollection}
            FILTER doc.year == @year AND doc.month == @month AND doc.categoryKey == @categoryKey
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<FinancialBudgetDocument>(
            query, new Dictionary<string, object>
            {
                ["year"] = year,
                ["month"] = month,
                ["categoryKey"] = request.CategoryKey
            });

        var existing = cursor.Result.FirstOrDefault();

        if (existing != null)
        {
            // Update existing
            existing.BudgetedAmount = request.BudgetedAmount;
            if (request.RolloverAmount.HasValue) existing.RolloverAmount = request.RolloverAmount.Value;
            if (request.Notes != null) existing.Notes = request.Notes;
            existing.UpdatedAt = now;

            await db.Client.Document.PutDocumentAsync($"{BudgetCollection}/{existing.Key}", existing);
            return Results.Ok(MapBudget(existing));
        }
        else
        {
            // Create new
            var doc = new FinancialBudgetDocument
            {
                Key = Guid.NewGuid().ToString("N")[..12],
                Year = year,
                Month = month,
                PeriodType = "Monthly",
                CategoryKey = request.CategoryKey,
                BudgetedAmount = request.BudgetedAmount,
                SpentAmount = 0,
                RolloverAmount = request.RolloverAmount ?? 0,
                Notes = request.Notes,
                CreatedAt = now,
                UpdatedAt = now
            };

            await db.Client.Document.PostDocumentAsync(BudgetCollection, doc);
            return Results.Created($"/api/v1/finance/budgets/{year}/{month}", MapBudget(doc));
        }
    }

    // ==================== BUDGETS (Flexible Periods) ====================

    private static async Task<IResult> GetPeriodBudgetSummary(
        [FromServices] IFinanceApplicationService financeAppService,
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] string? periodType = null)
    {
        var result = await financeAppService.GetPeriodBudgetSummaryAsync(
            new GetPeriodBudgetSummaryCommand(startDate, endDate, periodType));

        if (result.IsError)
        {
            var error = result.ErrorValue;
            return error switch
            {
                LifeOS.Domain.Common.DomainError.ValidationError ve => Results.BadRequest(new { Error = ve.Item }),
                LifeOS.Domain.Common.DomainError.BusinessRuleViolation br => Results.BadRequest(new { Error = br.Item }),
                _ => Results.BadRequest(new { Error = "Budget summary failed" })
            };
        }

        var summaryResult = result.ResultValue;
        var budgetDtos = summaryResult.Summary.Budgets.Select(b => MapBudget(b)).ToList();

        var summary = new PeriodBudgetSummaryDto
        {
            PeriodType = BudgetPeriodTypeModule.toString(summaryResult.Period.PeriodType),
            StartDate = summaryResult.Period.StartDate,
            EndDate = summaryResult.Period.EndDate,
            PeriodKey = summaryResult.Period.PeriodKey,
            TotalBudgeted = MoneyModule.value(summaryResult.Summary.TotalBudgeted),
            TotalSpent = MoneyModule.value(summaryResult.Summary.TotalSpent),
            TotalAvailable = MoneyModule.value(summaryResult.Summary.TotalRemaining),
            Categories = budgetDtos
        };

        return Results.Ok(summary);
    }

    private static async Task<IResult> CreateOrUpdatePeriodBudget(
        CreateOrUpdatePeriodBudgetRequest request,
        [FromServices] IFinanceApplicationService financeAppService)
    {
        var result = await financeAppService.UpsertPeriodBudgetAsync(
            new UpsertPeriodBudgetCommand(
                request.PeriodType,
                request.StartDate,
                request.EndDate,
                request.CategoryKey,
                request.BudgetedAmount,
                request.RolloverAmount,
                request.Notes));

        if (result.IsError)
        {
            var error = result.ErrorValue;
            return error switch
            {
                LifeOS.Domain.Common.DomainError.ValidationError ve => Results.BadRequest(new { Error = ve.Item }),
                LifeOS.Domain.Common.DomainError.BusinessRuleViolation br => Results.BadRequest(new { Error = br.Item }),
                _ => Results.BadRequest(new { Error = "Budget upsert failed" })
            };
        }

        var payload = result.ResultValue;
        var response = MapBudget(payload.Budget);

        if (payload.Created)
        {
            return Results.Created(
                $"/api/v1/finance/budgets/period?startDate={request.StartDate:yyyy-MM-dd}&endDate={request.EndDate:yyyy-MM-dd}",
                response);
        }

        return Results.Ok(response);
    }


    // ==================== PAY PERIOD CONFIG ====================

    private const string PayPeriodConfigCollection = ArangoDbContext.Collections.PayPeriodConfig;

    private static async Task<IResult> GetPayPeriodConfig([FromServices] ArangoDbContext db)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<PayPeriodConfigDocument>(PayPeriodConfigCollection, "default");
            return Results.Ok(MapPayPeriodConfig(doc));
        }
        catch
        {
            // Return default config if none exists
            return Results.Ok(new PayPeriodConfigDto
            {
                Key = "default",
                AnchorDate = DateTime.UtcNow.Date,
                PeriodLengthDays = 14,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
    }

    private static async Task<IResult> CreateOrUpdatePayPeriodConfig(
        CreateOrUpdatePayPeriodConfigRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;

        try
        {
            var existing = await db.Client.Document.GetDocumentAsync<PayPeriodConfigDocument>(PayPeriodConfigCollection, "default");
            existing.AnchorDate = request.AnchorDate;
            existing.PeriodLengthDays = request.PeriodLengthDays;
            existing.UpdatedAt = now;

            await db.Client.Document.PutDocumentAsync($"{PayPeriodConfigCollection}/default", existing);
            return Results.Ok(MapPayPeriodConfig(existing));
        }
        catch
        {
            // Create new
            var doc = new PayPeriodConfigDocument
            {
                Key = "default",
                AnchorDate = request.AnchorDate,
                PeriodLengthDays = request.PeriodLengthDays,
                CreatedAt = now,
                UpdatedAt = now
            };

            await db.Client.Document.PostDocumentAsync(PayPeriodConfigCollection, doc);
            return Results.Created("/api/v1/finance/pay-period-config", MapPayPeriodConfig(doc));
        }
    }

    // ==================== MAPPERS ====================

    private static FinancialAccountDto MapAccount(FinancialAccountDocument doc) => new()
    {
        Key = doc.Key,
        Name = doc.Name,
        Type = doc.Type,
        Institution = doc.Institution,
        AccountNumber = doc.AccountNumber,
        Currency = doc.Currency,
        OpeningBalance = doc.OpeningBalance,
        CurrentBalance = doc.CurrentBalance,
        IsActive = doc.IsActive,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt
    };

    private static FinancialTransactionDto MapTransaction(Transaction tx) => new()
    {
        Key = TransactionIdModule.value(tx.Id),
        AccountKey = AccountIdModule.value(tx.AccountId),
        MerchantKey = Microsoft.FSharp.Core.FSharpOption<MerchantId>.get_IsSome(tx.MerchantId)
            ? MerchantIdModule.value(tx.MerchantId.Value)
            : null,
        CategoryKey = Microsoft.FSharp.Core.FSharpOption<CategoryId>.get_IsSome(tx.CategoryId)
            ? CategoryIdModule.value(tx.CategoryId.Value)
            : null,
        Amount = MoneyModule.value(tx.Amount),
        Description = tx.Description,
        Memo = Microsoft.FSharp.Core.FSharpOption<string>.get_IsSome(tx.Memo) ? tx.Memo.Value : null,
        PostedAt = tx.PostedAt,
        AuthorizedAt = Microsoft.FSharp.Core.FSharpOption<DateTime>.get_IsSome(tx.AuthorizedAt) ? tx.AuthorizedAt.Value : null,
        Status = TransactionStatusModule.toString(tx.Status),
        ExternalId = Microsoft.FSharp.Core.FSharpOption<string>.get_IsSome(tx.ExternalId) ? tx.ExternalId.Value : null,
        CheckNumber = Microsoft.FSharp.Core.FSharpOption<string>.get_IsSome(tx.CheckNumber) ? tx.CheckNumber.Value : null,
        Tags = tx.Tags.ToList(),
        ReceiptKey = Microsoft.FSharp.Core.FSharpOption<ReceiptId>.get_IsSome(tx.ReceiptId) ? ReceiptIdModule.value(tx.ReceiptId.Value) : null,
        ReconciliationKey = Microsoft.FSharp.Core.FSharpOption<ReconciliationId>.get_IsSome(tx.ReconciliationId) ? ReconciliationIdModule.value(tx.ReconciliationId.Value) : null,
        CreatedAt = tx.CreatedAt,
        UpdatedAt = tx.UpdatedAt
    };

    private static FinancialMerchantDto MapMerchant(FinancialMerchantDocument doc) => new()
    {
        Key = doc.Key,
        Name = doc.Name,
        DefaultCategoryKey = doc.DefaultCategoryKey,
        Address = doc.Address,
        City = doc.City,
        State = doc.State,
        PostalCode = doc.PostalCode,
        Phone = doc.Phone,
        Website = doc.Website,
        Notes = doc.Notes,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt
    };

    private static FinancialBudgetDto MapBudget(Budget budget) => new()
    {
        Key = BudgetIdModule.value(budget.Id),
        Year = budget.Period.StartDate.Year,
        Month = budget.Period.StartDate.Month,
        PeriodType = BudgetPeriodTypeModule.toString(budget.Period.PeriodType),
        StartDate = budget.Period.StartDate,
        EndDate = budget.Period.EndDate,
        PeriodKey = budget.Period.PeriodKey,
        CategoryKey = CategoryIdModule.value(budget.CategoryId),
        BudgetedAmount = MoneyModule.value(budget.BudgetedAmount),
        SpentAmount = MoneyModule.value(budget.SpentAmount),
        RolloverAmount = MoneyModule.value(budget.RolloverAmount),
        Notes = FSharpOption<string>.get_IsSome(budget.Notes) ? budget.Notes.Value : null,
        CreatedAt = budget.CreatedAt,
        UpdatedAt = budget.UpdatedAt
    };

    private static FinancialCategoryDto MapCategory(FinancialCategoryDocument doc) => new()
    {
        Key = doc.Key,
        Name = doc.Name,
        Type = doc.Type,
        ParentKey = doc.ParentKey,
        Icon = doc.Icon,
        Color = doc.Color,
        IsActive = doc.IsActive,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt
    };

    private static FinancialTransactionDto MapTransaction(FinancialTransactionDocument doc) => new()
    {
        Key = doc.Key,
        AccountKey = doc.AccountKey,
        MerchantKey = doc.MerchantKey,
        CategoryKey = doc.CategoryKey,
        Amount = doc.Amount,
        Description = doc.Description,
        Memo = doc.Memo,
        PostedAt = doc.PostedAt,
        AuthorizedAt = doc.AuthorizedAt,
        Status = doc.Status,
        ExternalId = doc.ExternalId,
        CheckNumber = doc.CheckNumber,
        Tags = doc.Tags,
        ReceiptKey = doc.ReceiptKey,
        ReconciliationKey = doc.ReconciliationKey,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt
    };

    private static FinancialJournalEntryDto MapJournalEntry(FinancialJournalEntryDocument doc) => new()
    {
        Key = doc.Key,
        TransactionKey = doc.TransactionKey,
        AccountKey = doc.AccountKey,
        Debit = doc.Debit,
        Credit = doc.Credit,
        EntryDate = doc.EntryDate,
        Memo = doc.Memo,
        CreatedAt = doc.CreatedAt
    };

    private static FinancialReceiptDto MapReceipt(FinancialReceiptDocument doc) => new()
    {
        Key = doc.Key,
        TransactionKey = doc.TransactionKey,
        MerchantKey = doc.MerchantKey,
        FileName = doc.FileName,
        ContentType = doc.ContentType,
        FileSize = doc.FileSize,
        StorageKey = doc.StorageKey,
        ReceiptDate = doc.ReceiptDate,
        TotalAmount = doc.TotalAmount,
        TaxAmount = doc.TaxAmount,
        Notes = doc.Notes,
        UploadedAt = doc.UploadedAt,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt
    };

    private static FinancialReconciliationDto MapReconciliation(FinancialReconciliationDocument doc) => new()
    {
        Key = doc.Key,
        AccountKey = doc.AccountKey,
        StatementDate = doc.StatementDate,
        StatementBalance = doc.StatementBalance,
        ClearedBalance = doc.ClearedBalance,
        Difference = doc.Difference,
        Status = doc.Status,
        MatchedTransactionKeys = doc.MatchedTransactionKeys,
        Notes = doc.Notes,
        CompletedAt = doc.CompletedAt,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt
    };

    private static FinancialReconciliationDto MapReconciliation(Reconciliation r) => new()
    {
        Key = ReconciliationIdModule.value(r.Id),
        AccountKey = AccountIdModule.value(r.AccountId),
        StatementDate = r.StatementDate,
        StatementBalance = MoneyModule.value(r.StatementBalance),
        ClearedBalance = MoneyModule.value(r.ClearedBalance),
        Difference = MoneyModule.value(r.Difference),
        Status = ReconciliationStatusModule.toString(r.Status),
        MatchedTransactionKeys = r.MatchedTransactionIds.Select(TransactionIdModule.value).ToList(),
        Notes = Microsoft.FSharp.Core.FSharpOption<string>.get_IsSome(r.Notes) ? r.Notes.Value : null,
        CompletedAt = Microsoft.FSharp.Core.FSharpOption<global::System.DateTime>.get_IsSome(r.CompletedAt) ? r.CompletedAt.Value : null,
        CreatedAt = r.CreatedAt,
        UpdatedAt = r.UpdatedAt
    };

    private static FinancialBudgetDto MapBudget(FinancialBudgetDocument doc) => new()
    {
        Key = doc.Key,
        Year = doc.Year,
        Month = doc.Month,
        PeriodType = doc.PeriodType,
        StartDate = doc.StartDate,
        EndDate = doc.EndDate,
        PeriodKey = doc.PeriodKey,
        CategoryKey = doc.CategoryKey,
        BudgetedAmount = doc.BudgetedAmount,
        SpentAmount = doc.SpentAmount,
        RolloverAmount = doc.RolloverAmount,
        Notes = doc.Notes,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt
    };

    private static PayPeriodConfigDto MapPayPeriodConfig(PayPeriodConfigDocument doc) => new()
    {
        Key = doc.Key,
        AnchorDate = doc.AnchorDate,
        PeriodLengthDays = doc.PeriodLengthDays,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt
    };
}
