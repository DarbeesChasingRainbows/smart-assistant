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
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;
        var doc = new FinancialReconciliationDocument
        {
            Key = Guid.NewGuid().ToString("N")[..12],
            AccountKey = request.AccountKey,
            StatementDate = request.StatementDate,
            StatementBalance = request.StatementBalance,
            ClearedBalance = 0,
            Difference = request.StatementBalance,
            Status = "InProgress",
            MatchedTransactionKeys = new List<string>(),
            CreatedAt = now,
            UpdatedAt = now
        };

        var result = await db.Client.Document.PostDocumentAsync(ReconciliationCollection, doc);
        doc.Key = result._key;
        return Results.Created($"/api/v1/finance/reconciliations/{doc.Key}", MapReconciliation(doc));
    }

    private static async Task<IResult> MatchTransactions(
        string key,
        MatchTransactionsRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            var recon = await db.Client.Document.GetDocumentAsync<FinancialReconciliationDocument>(ReconciliationCollection, key);

            // Add new transaction keys
            foreach (var txKey in request.TransactionKeys)
            {
                if (!recon.MatchedTransactionKeys.Contains(txKey))
                {
                    recon.MatchedTransactionKeys.Add(txKey);

                    // Update transaction status to Cleared
                    try
                    {
                        var tx = await db.Client.Document.GetDocumentAsync<FinancialTransactionDocument>(TransactionCollection, txKey);
                        tx.Status = "Cleared";
                        tx.ReconciliationKey = key;
                        tx.UpdatedAt = DateTime.UtcNow;
                        await db.Client.Document.PutDocumentAsync($"{TransactionCollection}/{txKey}", tx);
                    }
                    catch { /* Transaction may not exist */ }
                }
            }

            // Recalculate cleared balance
            var clearedBalance = await CalculateClearedBalance(db, recon.MatchedTransactionKeys);
            recon.ClearedBalance = clearedBalance;
            recon.Difference = recon.StatementBalance - clearedBalance;
            recon.UpdatedAt = DateTime.UtcNow;

            await db.Client.Document.PutDocumentAsync($"{ReconciliationCollection}/{key}", recon);
            return Results.Ok(MapReconciliation(recon));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CompleteReconciliation(
        string key,
        CompleteReconciliationRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            var recon = await db.Client.Document.GetDocumentAsync<FinancialReconciliationDocument>(ReconciliationCollection, key);

            if (Math.Abs(recon.Difference) > 0.01m)
            {
                return Results.BadRequest(new { Error = "Reconciliation difference must be zero to complete" });
            }

            recon.Status = "Completed";
            recon.Notes = request.Notes;
            recon.CompletedAt = DateTime.UtcNow;
            recon.UpdatedAt = DateTime.UtcNow;

            // Mark all matched transactions as Reconciled
            foreach (var txKey in recon.MatchedTransactionKeys)
            {
                try
                {
                    var tx = await db.Client.Document.GetDocumentAsync<FinancialTransactionDocument>(TransactionCollection, txKey);
                    tx.Status = "Reconciled";
                    tx.UpdatedAt = DateTime.UtcNow;
                    await db.Client.Document.PutDocumentAsync($"{TransactionCollection}/{txKey}", tx);
                }
                catch { /* Transaction may not exist */ }
            }

            await db.Client.Document.PutDocumentAsync($"{ReconciliationCollection}/{key}", recon);
            return Results.Ok(MapReconciliation(recon));
        }
        catch
        {
            return Results.NotFound();
        }
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
        [FromServices] ArangoDbContext db,
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] string? periodType = null)
    {
        // Build period key for lookup
        var periodKey = $"{startDate:yyyy-MM-dd}_{endDate:yyyy-MM-dd}";

        // First try to find budgets by periodKey
        var query = $@"
            FOR doc IN {BudgetCollection}
            FILTER doc.periodKey == @periodKey
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<FinancialBudgetDocument>(
            query, new Dictionary<string, object> { ["periodKey"] = periodKey });

        var budgets = cursor.Result.ToList();

        // If no budgets found by periodKey, try by date range
        if (budgets.Count == 0)
        {
            var rangeQuery = $@"
                FOR doc IN {BudgetCollection}
                FILTER doc.startDate != null AND doc.endDate != null
                FILTER doc.startDate >= @startDate AND doc.endDate <= @endDate
                RETURN doc";

            var rangeCursor = await db.Client.Cursor.PostCursorAsync<FinancialBudgetDocument>(
                rangeQuery, new Dictionary<string, object>
                {
                    ["startDate"] = startDate.ToString("o"),
                    ["endDate"] = endDate.ToString("o")
                });

            budgets = rangeCursor.Result.ToList();
        }

        // Calculate spent amounts from transactions in the date range
        var budgetDtos = new List<FinancialBudgetDto>();
        foreach (var budget in budgets)
        {
            var spentAmount = await CalculateSpentForCategory(db, budget.CategoryKey, startDate, endDate);
            budget.SpentAmount = spentAmount;
            budgetDtos.Add(MapBudget(budget));
        }

        var summary = new PeriodBudgetSummaryDto
        {
            PeriodType = periodType ?? "Custom",
            StartDate = startDate,
            EndDate = endDate,
            PeriodKey = periodKey,
            TotalBudgeted = budgetDtos.Sum(b => b.BudgetedAmount),
            TotalSpent = budgetDtos.Sum(b => b.SpentAmount),
            TotalAvailable = budgetDtos.Sum(b => b.AvailableAmount),
            Categories = budgetDtos
        };

        return Results.Ok(summary);
    }

    private static async Task<IResult> CreateOrUpdatePeriodBudget(
        CreateOrUpdatePeriodBudgetRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;
        var periodKey = $"{request.StartDate:yyyy-MM-dd}_{request.EndDate:yyyy-MM-dd}";

        // Check if budget exists for this category/period
        var query = $@"
            FOR doc IN {BudgetCollection}
            FILTER doc.periodKey == @periodKey AND doc.categoryKey == @categoryKey
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<FinancialBudgetDocument>(
            query, new Dictionary<string, object>
            {
                ["periodKey"] = periodKey,
                ["categoryKey"] = request.CategoryKey
            });

        var existing = cursor.Result.FirstOrDefault();

        if (existing != null)
        {
            // Update existing
            existing.PeriodType = request.PeriodType;
            existing.StartDate = request.StartDate;
            existing.EndDate = request.EndDate;
            existing.BudgetedAmount = request.BudgetedAmount;
            if (request.RolloverAmount.HasValue) existing.RolloverAmount = request.RolloverAmount.Value;
            if (request.Notes != null) existing.Notes = request.Notes;
            existing.UpdatedAt = now;

            // Recalculate spent amount
            existing.SpentAmount = await CalculateSpentForCategory(db, existing.CategoryKey, request.StartDate, request.EndDate);

            await db.Client.Document.PutDocumentAsync($"{BudgetCollection}/{existing.Key}", existing);
            return Results.Ok(MapBudget(existing));
        }
        else
        {
            // Calculate spent amount for new budget
            var spentAmount = await CalculateSpentForCategory(db, request.CategoryKey, request.StartDate, request.EndDate);

            var doc = new FinancialBudgetDocument
            {
                Key = Guid.NewGuid().ToString("N")[..12],
                Year = request.StartDate.Year,
                Month = request.StartDate.Month,
                PeriodType = request.PeriodType,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                PeriodKey = periodKey,
                CategoryKey = request.CategoryKey,
                BudgetedAmount = request.BudgetedAmount,
                SpentAmount = spentAmount,
                RolloverAmount = request.RolloverAmount ?? 0,
                Notes = request.Notes,
                CreatedAt = now,
                UpdatedAt = now
            };

            await db.Client.Document.PostDocumentAsync(BudgetCollection, doc);
            return Results.Created($"/api/v1/finance/budgets/period?startDate={request.StartDate:yyyy-MM-dd}&endDate={request.EndDate:yyyy-MM-dd}", MapBudget(doc));
        }
    }

    private static async Task<decimal> CalculateSpentForCategory(
        ArangoDbContext db,
        string categoryKey,
        DateTime startDate,
        DateTime endDate)
    {
        var query = $@"
            FOR doc IN {TransactionCollection}
            FILTER doc.categoryKey == @categoryKey
            FILTER doc.postedAt >= @startDate AND doc.postedAt <= @endDate
            FILTER doc.amount < 0
            RETURN ABS(doc.amount)";

        var cursor = await db.Client.Cursor.PostCursorAsync<decimal>(
            query, new Dictionary<string, object>
            {
                ["categoryKey"] = categoryKey,
                ["startDate"] = startDate.ToString("o"),
                ["endDate"] = endDate.ToString("o")
            });

        return cursor.Result.Sum();
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

    // ==================== HELPER METHODS ====================

    private static async Task CreateJournalEntriesForTransaction(
        ArangoDbContext db,
        string transactionKey,
        string accountKey,
        decimal amount,
        DateTime entryDate)
    {
        var now = DateTime.UtcNow;

        // For a simple transaction, we create a debit/credit pair
        // Positive amount = credit to account (deposit)
        // Negative amount = debit from account (withdrawal)
        var entry = new FinancialJournalEntryDocument
        {
            Key = Guid.NewGuid().ToString("N")[..12],
            TransactionKey = transactionKey,
            AccountKey = accountKey,
            Debit = amount < 0 ? Math.Abs(amount) : 0,
            Credit = amount > 0 ? amount : 0,
            EntryDate = entryDate,
            CreatedAt = now
        };

        await db.Client.Document.PostDocumentAsync(JournalEntryCollection, entry);
    }

    private static async Task CreateJournalEntriesForTransfer(
        ArangoDbContext db,
        string withdrawalKey,
        string depositKey,
        string fromAccountKey,
        string toAccountKey,
        decimal amount,
        DateTime entryDate)
    {
        var now = DateTime.UtcNow;
        var absAmount = Math.Abs(amount);

        // Debit from source account
        var debitEntry = new FinancialJournalEntryDocument
        {
            Key = Guid.NewGuid().ToString("N")[..12],
            TransactionKey = withdrawalKey,
            AccountKey = fromAccountKey,
            Debit = absAmount,
            Credit = 0,
            EntryDate = entryDate,
            CreatedAt = now
        };

        // Credit to destination account
        var creditEntry = new FinancialJournalEntryDocument
        {
            Key = Guid.NewGuid().ToString("N")[..12],
            TransactionKey = depositKey,
            AccountKey = toAccountKey,
            Debit = 0,
            Credit = absAmount,
            EntryDate = entryDate,
            CreatedAt = now
        };

        await db.Client.Document.PostDocumentAsync(JournalEntryCollection, debitEntry);
        await db.Client.Document.PostDocumentAsync(JournalEntryCollection, creditEntry);
    }

    private static async Task UpdateAccountBalance(ArangoDbContext db, string accountKey, decimal amount)
    {
        var query = $@"
            FOR doc IN {AccountCollection}
            FILTER doc._key == @key
            UPDATE doc WITH {{ 
                currentBalance: doc.currentBalance + @amount,
                updatedAt: @now
            }} IN {AccountCollection}";

        await db.Client.Cursor.PostCursorAsync<object>(query, new Dictionary<string, object>
        {
            ["key"] = accountKey,
            ["amount"] = amount,
            ["now"] = DateTime.UtcNow.ToString("o")
        });
    }

    private static async Task<decimal> CalculateClearedBalance(ArangoDbContext db, List<string> transactionKeys)
    {
        if (transactionKeys.Count == 0) return 0;

        var query = $@"
            FOR doc IN {TransactionCollection}
            FILTER doc._key IN @keys
            RETURN doc.amount";

        var cursor = await db.Client.Cursor.PostCursorAsync<decimal>(
            query, new Dictionary<string, object> { ["keys"] = transactionKeys });

        return cursor.Result.Sum();
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
