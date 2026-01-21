using System.Globalization;
using LifeOS.API.BackgroundServices;
using LifeOS.API.DTOs;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;

namespace LifeOS.API.Endpoints;

/// <summary>
/// Budget Domain Endpoints - Pay-Period Based Zero-Based Budgeting
/// Every dollar has a job. Budget per paycheck, not monthly.
/// </summary>
public static class BudgetEndpoints
{
    private const string PayPeriodCollection = ArangoDbContext.Collections.BudgetPayPeriods;
    private const string CategoryGroupCollection = ArangoDbContext.Collections.BudgetCategoryGroups;
    private const string CategoryCollection = ArangoDbContext.Collections.BudgetCategories;
    private const string AssignmentCollection = ArangoDbContext.Collections.BudgetAssignments;
    private const string CarryoverCollection = ArangoDbContext.Collections.BudgetCategoryCarryovers;
    private const string IncomeCollection = ArangoDbContext.Collections.BudgetIncomeEntries;
    private const string AccountCollection = ArangoDbContext.Collections.BudgetAccounts;
    private const string BillCollection = ArangoDbContext.Collections.BudgetBills;
    private const string GoalCollection = ArangoDbContext.Collections.BudgetGoals;
    private const string TransactionCollection = ArangoDbContext.Collections.BudgetTransactions;

    public static void MapBudgetEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/budget").WithTags("Budget");

        // Dashboard (CQRS Query)
        group.MapGet("/dashboard", GetDashboard).WithName("GetBudgetDashboard");
        group.MapGet("/balances/{payPeriodKey}", GetCategoryBalances)
            .WithName("GetBudgetCategoryBalances");

        // Pay Periods
        var payPeriods = group.MapGroup("/pay-periods");
        payPeriods.MapGet("/", GetPayPeriods).WithName("GetBudgetPayPeriods");
        payPeriods.MapGet("/current", GetCurrentPayPeriod).WithName("GetCurrentBudgetPayPeriod");
        payPeriods.MapGet("/{key}", GetPayPeriod).WithName("GetBudgetPayPeriod");
        payPeriods.MapPost("/", CreatePayPeriod).WithName("CreateBudgetPayPeriod");
        payPeriods.MapPut("/{key}", UpdatePayPeriod).WithName("UpdateBudgetPayPeriod");
        payPeriods.MapDelete("/{key}", DeletePayPeriod).WithName("DeleteBudgetPayPeriod");
        payPeriods.MapPost("/{key}/recalculate-year", RecalculateYear).WithName("RecalculateBudgetYear");
        payPeriods.MapGet("/{key}/summary", GetPayPeriodSummary).WithName("GetPayPeriodBudgetSummary");

        // Category Groups
        var categoryGroups = group.MapGroup("/category-groups");
        categoryGroups.MapGet("/", GetCategoryGroups).WithName("GetBudgetCategoryGroups");
        categoryGroups.MapPost("/", CreateCategoryGroup).WithName("CreateBudgetCategoryGroup");
        categoryGroups.MapPost("/reorder", ReorderCategoryGroups).WithName("ReorderBudgetCategoryGroups");
        categoryGroups.MapPut("/{key}", UpdateCategoryGroup).WithName("UpdateBudgetCategoryGroup");
        categoryGroups.MapDelete("/{key}", DeleteCategoryGroup).WithName("DeleteBudgetCategoryGroup");

        // Categories
        var categories = group.MapGroup("/categories");
        categories.MapGet("/", GetCategories).WithName("GetBudgetCategories");
        categories.MapGet("/{key}", GetCategory).WithName("GetBudgetCategory");
        categories.MapPost("/", CreateCategory).WithName("CreateBudgetCategory");
        categories.MapPost("/reorder", ReorderCategories).WithName("ReorderBudgetCategories");
        categories.MapPut("/{key}", UpdateCategory).WithName("UpdateBudgetCategory");
        categories.MapDelete("/{key}", DeleteCategory).WithName("DeleteBudgetCategory");
        categories.MapGet("/{key}/balance", GetCategoryBalance).WithName("GetBudgetCategoryBalance");

        // Budget Assignments (CQRS Command - Core Zero-Based Budgeting)
        var assignments = group.MapGroup("/assignments");
        assignments.MapGet("/", GetAssignments).WithName("GetBudgetAssignments");
        assignments.MapPost("/assign", AssignMoney).WithName("AssignBudgetMoney");

        // Income Entries
        var income = group.MapGroup("/income");
        income.MapGet("/", GetIncomeEntries).WithName("GetBudgetIncomeEntries");
        income.MapPost("/", AddIncome).WithName("AddBudgetIncome");

        // Accounts
        var accounts = group.MapGroup("/accounts");
        accounts.MapGet("/", GetAccounts).WithName("GetBudgetAccounts");
        accounts.MapGet("/{key}", GetAccount).WithName("GetBudgetAccount");
        accounts.MapPost("/", CreateAccount).WithName("CreateBudgetAccount");
        accounts.MapPut("/{key}", UpdateAccount).WithName("UpdateBudgetAccount");

        // Bills
        var bills = group.MapGroup("/bills");
        bills.MapGet("/", GetBills).WithName("GetBudgetBills");
        bills.MapGet("/upcoming", GetUpcomingBills).WithName("GetUpcomingBudgetBills");
        bills.MapGet("/{key}", GetBill).WithName("GetBudgetBill");
        bills.MapPost("/", CreateBill).WithName("CreateBudgetBill");
        bills.MapPut("/{key}", UpdateBill).WithName("UpdateBudgetBill");
        bills.MapPost("/{key}/paid", MarkBillPaid).WithName("MarkBudgetBillPaid");
        bills.MapPost("/generate-instances", GenerateRecurringBillInstances).WithName("GenerateRecurringBillInstances");

        // Goals
        var goals = group.MapGroup("/goals");
        goals.MapGet("/", GetGoals).WithName("GetBudgetGoals");
        goals.MapGet("/{key}", GetGoal).WithName("GetBudgetGoal");
        goals.MapPost("/", CreateGoal).WithName("CreateBudgetGoal");
        goals.MapPost("/{key}/progress", UpdateGoalProgress).WithName("UpdateBudgetGoalProgress");

        // Transactions
        var transactions = group.MapGroup("/transactions");
        transactions.MapGet("/", GetTransactions).WithName("GetBudgetTransactions");
        transactions.MapGet("/account/{accountKey}", GetAccountTransactions).WithName("GetBudgetAccountTransactions");
        transactions.MapGet("/{key}", GetTransaction).WithName("GetBudgetTransaction");
        transactions.MapPost("/", CreateTransaction).WithName("CreateBudgetTransaction");
        transactions.MapPost("/transfer", CreateTransfer).WithName("CreateBudgetTransfer");
        transactions.MapPut("/{key}", UpdateTransaction).WithName("UpdateBudgetTransaction");
        transactions.MapPost("/{key}/clear", ClearTransaction).WithName("ClearBudgetTransaction");
        transactions.MapDelete("/{key}", DeleteTransaction).WithName("DeleteBudgetTransaction");
        transactions.MapPost("/{key}/splits/replace", ReplaceSplits).WithName("ReplaceBudgetTransactionSplits");
    }

    // ==================== DASHBOARD (CQRS Query) ====================

    private static async Task<IResult> GetDashboard(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? familyId = null)
    {
        var family = familyId ?? "default";

        // Get current pay period
        var currentPeriod = await GetCurrentPayPeriodInternal(db, family);

        // Get accounts
        var accountsQuery = $@"
            FOR doc IN {AccountCollection}
            FILTER doc.familyId == @familyId AND doc.isActive == true
            RETURN doc";
        var accountsCursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            accountsQuery, new Dictionary<string, object> { { "familyId", family } });

        var accounts = accountsCursor.Result.Select(doc => new AccountSummaryDto
        {
            AccountKey = doc._key?.ToString() ?? "",
            AccountName = doc.name?.ToString() ?? "",
            AccountType = doc.accountType?.ToString() ?? "",
            Balance = decimal.TryParse(doc.balance?.ToString(), out decimal bal) ? bal : 0,
            ClearedBalance = decimal.TryParse(doc.clearedBalance?.ToString(), out decimal clr) ? clr : 0,
            UnclearedCount = 0
        }).ToList();

        // Get goals
        var goalsQuery = $@"
            FOR doc IN {GoalCollection}
            FILTER doc.familyId == @familyId AND doc.isCompleted == false
            RETURN doc";
        var goalsCursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            goalsQuery, new Dictionary<string, object> { { "familyId", family } });

        var goals = goalsCursor.Result.Select(MapGoal).ToList();

        // Get upcoming bills (next 30 days)
        var upcomingBills = await GetUpcomingBillsInternal(db, family, DateTime.UtcNow, DateTime.UtcNow.AddDays(30));

        // Calculate budget summary if we have a current period
        PayPeriodBudgetSummaryDto? summary = null;
        List<CategoryBalanceDto> categoryBalances = [];

        if (currentPeriod != null)
        {
            summary = await CalculateBudgetSummaryInternal(db, currentPeriod.Key);
            categoryBalances = await CalculateCategoryBalancesInternal(db, currentPeriod.Key, family);
        }

        return Results.Ok(new BudgetDashboardDto
        {
            CurrentPayPeriod = currentPeriod,
            BudgetSummary = summary,
            Accounts = accounts,
            UpcomingBills = upcomingBills,
            Goals = goals,
            CategoryBalances = categoryBalances
        });
    }

    // ==================== PAY PERIODS ====================

    private static async Task<IResult> GetPayPeriods(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? familyId = null)
    {
        var family = familyId ?? "default";
        var query = $@"
            FOR doc IN {PayPeriodCollection}
            FILTER doc.familyId == @familyId
            SORT doc.startDate DESC
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            query, new Dictionary<string, object> { { "familyId", family } });

        var periods = cursor.Result.Select(MapPayPeriod).ToList();
        return Results.Ok(periods);
    }

    private static async Task<IResult> GetCurrentPayPeriod(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? familyId = null)
    {
        var family = familyId ?? "default";
        var period = await GetCurrentPayPeriodInternal(db, family);

        return period != null ? Results.Ok(period) : Results.NotFound("No active pay period found");
    }

    private static async Task<IResult> GetPayPeriod(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<dynamic>(PayPeriodCollection, key);
            return Results.Ok(MapPayPeriod(doc));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> DeletePayPeriod(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            // Ensure it exists before attempting cascades
            await db.Client.Document.GetDocumentAsync<dynamic>(PayPeriodCollection, key);

            // Delete dependent documents that reference this pay period
            // (keep graph consistent and prevent orphaned budget data)
            var query = $@"
FOR doc IN {AssignmentCollection}
    FILTER doc.payPeriodKey == @payPeriodKey
    REMOVE doc IN {AssignmentCollection}

FOR doc IN {CarryoverCollection}
    FILTER doc.payPeriodKey == @payPeriodKey
    REMOVE doc IN {CarryoverCollection}

FOR doc IN {IncomeCollection}
    FILTER doc.payPeriodKey == @payPeriodKey
    REMOVE doc IN {IncomeCollection}

FOR doc IN {TransactionCollection}
    FILTER doc.payPeriodKey == @payPeriodKey
    REMOVE doc IN {TransactionCollection}

REMOVE {{ _key: @payPeriodKey }} IN {PayPeriodCollection}
";

            await db.Client.Cursor.PostCursorAsync<dynamic>(
                query,
                new Dictionary<string, object> { { "payPeriodKey", key } });

            return Results.NoContent();
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CreatePayPeriod(
        CreatePayPeriodRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;
        var doc = new
        {
            _key = Guid.NewGuid().ToString("N")[..12],
            familyId = request.FamilyId,
            name = request.Name,
            startDate = request.StartDate,
            endDate = request.EndDate,
            isActive = true,
            isClosed = false,
            expectedIncome = request.ExpectedIncome,
            totalIncome = 0m,
            createdAt = now,
            updatedAt = now
        };

        var result = await db.Client.Document.PostDocumentAsync(PayPeriodCollection, doc);
        return Results.Created($"/api/v1/budget/pay-periods/{result._key}", MapPayPeriod(doc));
    }

    private static async Task<IResult> UpdatePayPeriod(
        string key,
        UpdatePayPeriodRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            var existing = await db.Client.Document.GetDocumentAsync<dynamic>(PayPeriodCollection, key);
            var updates = new Dictionary<string, object> { { "updatedAt", DateTime.UtcNow } };

            if (request.Name != null) updates["name"] = request.Name;
            if (request.StartDate.HasValue) updates["startDate"] = request.StartDate.Value;
            if (request.EndDate.HasValue) updates["endDate"] = request.EndDate.Value;
            if (request.IsActive.HasValue) updates["isActive"] = request.IsActive.Value;
            if (request.IsClosed.HasValue) updates["isClosed"] = request.IsClosed.Value;
            if (request.ExpectedIncome.HasValue) updates["expectedIncome"] = request.ExpectedIncome.Value;

            var startDate = request.StartDate.HasValue
                ? request.StartDate.Value
                : DateTime.TryParse(existing.startDate?.ToString(), out DateTime start) ? start : DateTime.MinValue;
            var endDate = request.EndDate.HasValue
                ? request.EndDate.Value
                : DateTime.TryParse(existing.endDate?.ToString(), out DateTime end) ? end : DateTime.MinValue;

            if (endDate.Date < startDate.Date)
            {
                return Results.BadRequest("EndDate must be >= StartDate");
            }

            await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(PayPeriodCollection, key, updates);
            return Results.Ok();
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> RecalculateYear(
        string key,
        [FromServices] ArangoDbContext db,
        [FromQuery] string? familyId = null)
    {
        var family = familyId ?? "default";

        dynamic startPeriod;
        try
        {
            startPeriod = await db.Client.Document.GetDocumentAsync<dynamic>(PayPeriodCollection, key);
        }
        catch
        {
            return Results.NotFound();
        }

        var startDate = DateTime.TryParse(startPeriod.startDate?.ToString(), out DateTime s) ? s.Date : DateTime.MinValue.Date;
        var year = startDate.Year;

        // Get pay periods in the same year from this starting period onward
        var periodsQuery = $@"
            FOR p IN {PayPeriodCollection}
            FILTER p.familyId == @familyId
                AND DATE_YEAR(p.startDate) == @year
                AND p.startDate >= @startDate
            SORT p.startDate ASC
            RETURN p";

        var periodsCursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            periodsQuery,
            new Dictionary<string, object>
            {
                { "familyId", family },
                { "year", year },
                { "startDate", startDate }
            });

        var periods = periodsCursor.Result.ToList();
        if (periods.Count == 0)
        {
            return Results.Ok(new { affectedPeriods = 0 });
        }

        // Get categories for family
        var categoriesQuery = $@"
            FOR c IN {CategoryCollection}
            FILTER c.familyId == @familyId
            RETURN c";

        var categoriesCursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            categoriesQuery, new Dictionary<string, object> { { "familyId", family } });
        var categories = categoriesCursor.Result.ToList();

        // Load initial carryovers for the first period (if any)
        var carryQuery = $@"
            FOR co IN {CarryoverCollection}
            FILTER co.familyId == @familyId AND co.payPeriodKey == @payPeriodKey
            RETURN co";

        var firstCarryCursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            carryQuery,
            new Dictionary<string, object>
            {
                { "familyId", family },
                { "payPeriodKey", periods[0]._key.ToString() }
            });

        var previousEnding = new Dictionary<string, decimal>();
        foreach (var cat in categories)
        {
            previousEnding[cat._key.ToString()] = 0m;
        }

        foreach (var co in firstCarryCursor.Result)
        {
            var categoryKey = co.categoryKey?.ToString() ?? "";
            var amount = decimal.TryParse(co.carryover?.ToString(), out decimal a) ? a : 0m;
            if (!string.IsNullOrWhiteSpace(categoryKey))
            {
                previousEnding[categoryKey] = amount;
            }
        }

        for (var i = 0; i < periods.Count; i++)
        {
            var periodKey = periods[i]._key.ToString();

            // For periods after the first, set carryovers to previous ending
            if (i > 0)
            {
                // delete existing carryovers for this period
                var deleteQuery = $@"
                    FOR co IN {CarryoverCollection}
                    FILTER co.familyId == @familyId AND co.payPeriodKey == @payPeriodKey
                    REMOVE co IN {CarryoverCollection}";

                await db.Client.Cursor.PostCursorAsync<dynamic>(
                    deleteQuery,
                    new Dictionary<string, object>
                    {
                        { "familyId", family },
                        { "payPeriodKey", periodKey }
                    });

                foreach (var kvp in previousEnding)
                {
                    var doc = new
                    {
                        _key = Guid.NewGuid().ToString("N")[..12],
                        familyId = family,
                        payPeriodKey = periodKey,
                        categoryKey = kvp.Key,
                        carryover = kvp.Value,
                        createdAt = DateTime.UtcNow,
                        updatedAt = DateTime.UtcNow
                    };
                    await db.Client.Document.PostDocumentAsync(CarryoverCollection, doc);
                }
            }

            // Compute ending available for this period based on carryover + assignments - spent
            var assignmentsQuery = $@"
                FOR a IN {AssignmentCollection}
                FILTER a.payPeriodKey == @payPeriodKey
                RETURN a";
            var assignmentsCursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
                assignmentsQuery, new Dictionary<string, object> { { "payPeriodKey", periodKey } });

            var spentQuery = $@"
                FOR t IN {TransactionCollection}
                FILTER t.payPeriodKey == @payPeriodKey AND t.amount < 0
                COLLECT categoryKey = t.categoryKey AGGREGATE spent = SUM(ABS(t.amount))
                RETURN {{ categoryKey: categoryKey, spent: spent }}";

            var spentCursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
                spentQuery, new Dictionary<string, object> { { "payPeriodKey", periodKey } });

            var assignedLookup = new Dictionary<string, decimal>();
            foreach (var a in assignmentsCursor.Result)
            {
                var categoryKey = a.categoryKey?.ToString() ?? "";
                var amount = decimal.TryParse(a.assignedAmount?.ToString(), out decimal val) ? val : 0m;
                if (!string.IsNullOrWhiteSpace(categoryKey))
                {
                    assignedLookup[categoryKey] = amount;
                }
            }

            var spentLookup = new Dictionary<string, decimal>();
            foreach (var row in spentCursor.Result)
            {
                var categoryKey = row.categoryKey?.ToString() ?? "";
                var amount = decimal.TryParse(row.spent?.ToString(), out decimal val) ? val : 0m;
                if (!string.IsNullOrWhiteSpace(categoryKey))
                {
                    spentLookup[categoryKey] = amount;
                }
            }

            var ending = new Dictionary<string, decimal>();
            foreach (var cat in categories)
            {
                string categoryKey = cat._key?.ToString() ?? "";
                if (string.IsNullOrWhiteSpace(categoryKey))
                {
                    continue;
                }

                var carry = previousEnding.TryGetValue(categoryKey, out var carryVal) ? carryVal : 0m;
                var assigned = assignedLookup.TryGetValue(categoryKey, out var assignedVal) ? assignedVal : 0m;
                var spent = spentLookup.TryGetValue(categoryKey, out var spentVal) ? spentVal : 0m;
                ending[categoryKey] = carry + assigned - spent;
            }

            previousEnding = ending;
        }

        return Results.Ok(new { affectedPeriods = periods.Count });
    }

    private static async Task<IResult> GetPayPeriodSummary(string key, [FromServices] ArangoDbContext db)
    {
        var summary = await CalculateBudgetSummaryInternal(db, key);
        return summary != null ? Results.Ok(summary) : Results.NotFound();
    }

    // ==================== CATEGORY GROUPS ====================

    private static async Task<IResult> GetCategoryGroups(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? familyId = null)
    {
        var family = familyId ?? "default";
        var query = $@"
            FOR g IN {CategoryGroupCollection}
            FILTER g.familyId == @familyId
            SORT g.sortOrder ASC
            LET cats = (
                FOR c IN {CategoryCollection}
                FILTER c.groupKey == g._key
                SORT c.sortOrder ASC
                RETURN c
            )
            RETURN MERGE(g, {{ categories: cats }})";

        var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            query, new Dictionary<string, object> { { "familyId", family } });

        var groups = cursor.Result.Select(MapCategoryGroup).ToList();
        return Results.Ok(groups);
    }

    private static async Task<IResult> CreateCategoryGroup(
        CreateCategoryGroupRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;
        var doc = new
        {
            _key = Guid.NewGuid().ToString("N")[..12],
            familyId = request.FamilyId,
            name = request.Name,
            type = request.Type,
            sortOrder = request.SortOrder,
            isSystem = false,
            createdAt = now
        };

        var result = await db.Client.Document.PostDocumentAsync(CategoryGroupCollection, doc);
        return Results.Created($"/api/v1/budget/category-groups/{result._key}", doc);
    }

    private static async Task<IResult> UpdateCategoryGroup(
        string key,
        UpdateCategoryGroupRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            var updates = new Dictionary<string, object> { { "updatedAt", DateTime.UtcNow } };
            if (request.Name != null) updates["name"] = request.Name;
            if (request.Type != null) updates["type"] = request.Type;

            await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(CategoryGroupCollection, key, updates);
            return Results.Ok();
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> ReorderCategoryGroups(
        ReorderCategoryGroupsRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            foreach (var item in request.Groups)
            {
                var updates = new Dictionary<string, object>
                {
                    { "sortOrder", item.SortOrder },
                    { "updatedAt", DateTime.UtcNow }
                };
                await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(CategoryGroupCollection, item.Key, updates);
            }
            return Results.Ok();
        }
        catch
        {
            return Results.Problem("Failed to reorder category groups");
        }
    }

    private static async Task<IResult> DeleteCategoryGroup(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            // Get all categories in this group
            var categoriesQuery = $"FOR c IN {CategoryCollection} FILTER c.groupKey == @key RETURN c";
            var categoriesCursor = await db.Client.Cursor.PostCursorAsync<dynamic>(categoriesQuery, new Dictionary<string, object> { { "key", key } });
            var categories = categoriesCursor.Result.ToList();

            if (categories.Count > 0)
            {
                var categoryKeys = categories.Select(c => (string)c._key).ToList();
                
                // Check for transactions in ANY of these categories
                var transactionCheckQuery = $@"
                    FOR t IN {TransactionCollection}
                    FILTER t.categoryKey IN @categoryKeys
                    LIMIT 1
                    RETURN 1";
                
                var txCursor = await db.Client.Cursor.PostCursorAsync<int>(
                    transactionCheckQuery, 
                    new Dictionary<string, object> { { "categoryKeys", categoryKeys } });
                
                if (txCursor.Result.Any())
                {
                     return Results.BadRequest("Cannot delete group: One or more categories have transactions associated with them.");
                }

                // Safe to cascade delete
                // 1. Assignments
                var deleteAssignments = $@"
                    FOR a IN {AssignmentCollection}
                    FILTER a.categoryKey IN @categoryKeys
                    REMOVE a IN {AssignmentCollection}";
                await db.Client.Cursor.PostCursorAsync<dynamic>(deleteAssignments, new Dictionary<string, object> { { "categoryKeys", categoryKeys } });

                // 2. Goals
                var deleteGoals = $@"
                    FOR g IN {GoalCollection}
                    FILTER g.categoryKey IN @categoryKeys
                    REMOVE g IN {GoalCollection}";
                await db.Client.Cursor.PostCursorAsync<dynamic>(deleteGoals, new Dictionary<string, object> { { "categoryKeys", categoryKeys } });

                // 3. Bills (Unlink)
                var unlinkBills = $@"
                    FOR b IN {BillCollection}
                    FILTER b.categoryKey IN @categoryKeys
                    UPDATE b WITH {{ categoryKey: null }} IN {BillCollection}";
                await db.Client.Cursor.PostCursorAsync<dynamic>(unlinkBills, new Dictionary<string, object> { { "categoryKeys", categoryKeys } });

                // 4. Categories
                var deleteCategories = $@"
                    FOR c IN {CategoryCollection}
                    FILTER c.groupKey == @key
                    REMOVE c IN {CategoryCollection}";
                await db.Client.Cursor.PostCursorAsync<dynamic>(deleteCategories, new Dictionary<string, object> { { "key", key } });
            }

            await db.Client.Document.DeleteDocumentAsync(CategoryGroupCollection, key);
            return Results.NoContent();
        }
        catch (Exception ex)
        {
            return Results.Problem(ex.Message);
        }
    }

    // ==================== CATEGORIES ====================

    private static async Task<IResult> GetCategories(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? familyId = null,
        [FromQuery] string? groupKey = null)
    {
        var family = familyId ?? "default";
        var groupFilter = groupKey != null ? "FILTER doc.groupKey == @groupKey" : "";

        var query = $@"
            FOR doc IN {CategoryCollection}
            FILTER doc.familyId == @familyId
            {groupFilter}
            SORT doc.sortOrder ASC
            RETURN doc";

        var bindVars = new Dictionary<string, object> { { "familyId", family } };
        if (groupKey != null) bindVars["groupKey"] = groupKey;

        var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(query, bindVars);
        var categories = cursor.Result.Select(MapCategory).ToList();
        return Results.Ok(categories);
    }

    private static async Task<IResult> GetCategory(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<dynamic>(CategoryCollection, key);
            return Results.Ok(MapCategory(doc));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CreateCategory(
        CreateBudgetCategoryRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;
        var doc = new
        {
            _key = Guid.NewGuid().ToString("N")[..12],
            groupKey = request.GroupKey,
            familyId = request.FamilyId,
            name = request.Name,
            targetAmount = request.TargetAmount,
            sortOrder = 0,
            isHidden = false,
            createdAt = now
        };

        var result = await db.Client.Document.PostDocumentAsync(CategoryCollection, doc);
        return Results.Created($"/api/v1/budget/categories/{result._key}", MapCategory(doc));
    }

    private static async Task<IResult> ReorderCategories(
        ReorderCategoriesRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            foreach (var item in request.Categories)
            {
                var updates = new Dictionary<string, object>
                {
                    { "sortOrder", item.SortOrder },
                    { "updatedAt", DateTime.UtcNow }
                };
                
                if (!string.IsNullOrEmpty(item.GroupKey))
                {
                    updates["groupKey"] = item.GroupKey;
                }

                await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(CategoryCollection, item.Key, updates);
            }
            return Results.Ok();
        }
        catch
        {
            return Results.Problem("Failed to reorder categories");
        }
    }

    private static async Task<IResult> UpdateCategory(
        string key,
        UpdateBudgetCategoryRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            var updates = new Dictionary<string, object>();
            if (request.Name != null) updates["name"] = request.Name;
            if (request.GroupKey != null) updates["groupKey"] = request.GroupKey;
            if (request.TargetAmount.HasValue) updates["targetAmount"] = request.TargetAmount.Value;
            if (request.SortOrder.HasValue) updates["sortOrder"] = request.SortOrder.Value;
            if (request.IsHidden.HasValue) updates["isHidden"] = request.IsHidden.Value;

            await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(CategoryCollection, key, updates);
            return Results.Ok();
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> DeleteCategory(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            // Check for transactions
            var checkQuery = $"FOR t IN {TransactionCollection} FILTER t.categoryKey == @key LIMIT 1 RETURN 1";
            var cursor = await db.Client.Cursor.PostCursorAsync<int>(checkQuery, new Dictionary<string, object> { { "key", key } });
            if (cursor.Result.Any())
            {
                return Results.BadRequest("Cannot delete category with transactions.");
            }

            // Cleanup Assignments, Goals, Bills
            var cleanupQuery = $@"
                FOR a IN {AssignmentCollection} FILTER a.categoryKey == @key REMOVE a IN {AssignmentCollection}
                FOR g IN {GoalCollection} FILTER g.categoryKey == @key REMOVE g IN {GoalCollection}
                FOR b IN {BillCollection} FILTER b.categoryKey == @key UPDATE b WITH {{ categoryKey: null }} IN {BillCollection}
                REMOVE {{ _key: @key }} IN {CategoryCollection}
            ";
            
            await db.Client.Cursor.PostCursorAsync<dynamic>(cleanupQuery, new Dictionary<string, object> { { "key", key } });
            return Results.NoContent();
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> GetCategoryBalance(
        string key,
        [FromQuery] string payPeriodKey,
        [FromServices] ArangoDbContext db)
    {
        // Get assignment for this category in this pay period
        var assignmentQuery = $@"
            FOR doc IN {AssignmentCollection}
            FILTER doc.categoryKey == @categoryKey AND doc.payPeriodKey == @payPeriodKey
            RETURN doc";

        var assignmentCursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            assignmentQuery,
            new Dictionary<string, object> { { "categoryKey", key }, { "payPeriodKey", payPeriodKey } });

        var assigned = assignmentCursor.Result.FirstOrDefault()?.assignedAmount ?? 0m;

        // Get transactions for this category in this pay period
        var transactionQuery = $@"
            FOR doc IN {TransactionCollection}
            FILTER doc.categoryKey == @categoryKey AND doc.payPeriodKey == @payPeriodKey AND doc.amount < 0
            RETURN doc.amount";

        var transactionCursor = await db.Client.Cursor.PostCursorAsync<decimal>(
            transactionQuery,
            new Dictionary<string, object> { { "categoryKey", key }, { "payPeriodKey", payPeriodKey } });

        var spent = Math.Abs(transactionCursor.Result.Sum());

        // Get category details
        var category = await db.Client.Document.GetDocumentAsync<dynamic>(CategoryCollection, key);

        return Results.Ok(new CategoryBalanceDto
        {
            CategoryKey = key,
            CategoryName = category.name?.ToString() ?? "",
            GroupName = "",
            Assigned = assigned,
            Spent = spent
        });
    }

    private static async Task<IResult> GetCategoryBalances(
        string payPeriodKey,
        [FromServices] ArangoDbContext db,
        [FromQuery] string? familyId = null)
    {
        var family = familyId ?? "default";
        var balances = await CalculateCategoryBalancesInternal(db, payPeriodKey, family);
        return Results.Ok(balances);
    }

    // ==================== BUDGET ASSIGNMENTS (CQRS Command) ====================

    private static async Task<IResult> GetAssignments(
        [FromServices] ArangoDbContext db,
        [FromQuery] string payPeriodKey)
    {
        var query = $@"
            FOR doc IN {AssignmentCollection}
            FILTER doc.payPeriodKey == @payPeriodKey
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            query, new Dictionary<string, object> { { "payPeriodKey", payPeriodKey } });

        var assignments = cursor.Result.Select(MapAssignment).ToList();
        return Results.Ok(assignments);
    }

    private static async Task<IResult> AssignMoney(
        AssignMoneyRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;

        // Check if assignment already exists (upsert)
        var existingQuery = $@"
            FOR doc IN {AssignmentCollection}
            FILTER doc.payPeriodKey == @payPeriodKey AND doc.categoryKey == @categoryKey
            RETURN doc";

        var existingCursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            existingQuery,
            new Dictionary<string, object>
            {
                { "payPeriodKey", request.PayPeriodKey },
                { "categoryKey", request.CategoryKey }
            });

        var existing = existingCursor.Result.FirstOrDefault();

        if (existing != null)
        {
            // Update existing assignment
            var updates = new Dictionary<string, object>
            {
                { "assignedAmount", request.Amount },
                { "updatedAt", now }
            };
            await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(
                AssignmentCollection, existing._key.ToString(), updates);

            return Results.Ok(new { message = "Assignment updated", key = existing._key.ToString() });
        }
        else
        {
            // Create new assignment
            var doc = new
            {
                _key = Guid.NewGuid().ToString("N")[..12],
                payPeriodKey = request.PayPeriodKey,
                categoryKey = request.CategoryKey,
                assignedAmount = request.Amount,
                createdByUserKey = (string?)null,
                createdAt = now,
                updatedAt = now
            };

            var result = await db.Client.Document.PostDocumentAsync(AssignmentCollection, doc);
            return Results.Created($"/api/v1/budget/assignments/{result._key}", MapAssignment(doc));
        }
    }

    // ==================== INCOME ENTRIES ====================

    private static async Task<IResult> GetIncomeEntries(
        [FromServices] ArangoDbContext db,
        [FromQuery] string payPeriodKey)
    {
        var query = $@"
            FOR doc IN {IncomeCollection}
            FILTER doc.payPeriodKey == @payPeriodKey
            SORT doc.createdAt DESC
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            query, new Dictionary<string, object> { { "payPeriodKey", payPeriodKey } });

        var entries = cursor.Result.Select(MapIncomeEntry).ToList();
        return Results.Ok(entries);
    }

    private static async Task<IResult> AddIncome(
        AddIncomeRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;
        var doc = new
        {
            _key = Guid.NewGuid().ToString("N")[..12],
            payPeriodKey = request.PayPeriodKey,
            description = request.Description,
            amount = request.Amount,
            receivedDate = request.ReceivedDate,
            createdByUserKey = (string?)null,
            createdAt = now
        };

        var result = await db.Client.Document.PostDocumentAsync(IncomeCollection, doc);

        // Update pay period total income
        var incomeQuery = $@"
            FOR doc IN {IncomeCollection}
            FILTER doc.payPeriodKey == @payPeriodKey
            COLLECT AGGREGATE total = SUM(doc.amount)
            RETURN total";

        var incomeCursor = await db.Client.Cursor.PostCursorAsync<decimal>(
            incomeQuery, new Dictionary<string, object> { { "payPeriodKey", request.PayPeriodKey } });

        var totalIncome = incomeCursor.Result.FirstOrDefault();

        await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(
            PayPeriodCollection, request.PayPeriodKey,
            new Dictionary<string, object> { { "totalIncome", totalIncome }, { "updatedAt", now } });

        return Results.Created($"/api/v1/budget/income/{result._key}", MapIncomeEntry(doc));
    }

    // ==================== ACCOUNTS ====================

    private static async Task<IResult> GetAccounts(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? familyId = null,
        [FromQuery] bool? isActive = null)
    {
        var family = familyId ?? "default";
        var activeFilter = isActive.HasValue
            ? $"FILTER doc.isActive == {isActive.Value.ToString().ToLower()}"
            : "";

        var query = $@"
            FOR doc IN {AccountCollection}
            FILTER doc.familyId == @familyId
            {activeFilter}
            SORT doc.name ASC
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            query, new Dictionary<string, object> { { "familyId", family } });

        var accounts = cursor.Result.Select(doc => new AccountSummaryDto
        {
            AccountKey = doc._key?.ToString() ?? "",
            AccountName = doc.name?.ToString() ?? "",
            AccountType = doc.accountType?.ToString() ?? "",
            Balance = decimal.TryParse(doc.balance?.ToString(), out decimal bal) ? bal : 0,
            UnclearedCount = 0
        }).ToList();

        return Results.Ok(accounts);
    }

    private static async Task<IResult> GetAccount(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<dynamic>(AccountCollection, key);
            return Results.Ok(MapAccount(doc));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CreateAccount(
        CreateBudgetAccountRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;
        var doc = new
        {
            _key = Guid.NewGuid().ToString("N")[..12],
            familyId = request.FamilyId,
            name = request.Name,
            accountType = request.AccountType,
            balance = request.OpeningBalance,
            clearedBalance = request.OpeningBalance,
            isActive = true,
            isClosed = false,
            createdAt = now,
            updatedAt = now
        };

        var result = await db.Client.Document.PostDocumentAsync(AccountCollection, doc);
        return Results.Created($"/api/v1/budget/accounts/{result._key}", MapAccount(doc));
    }

    private static async Task<IResult> UpdateAccount(
        string key,
        UpdateBudgetAccountRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            var updates = new Dictionary<string, object> { { "updatedAt", DateTime.UtcNow } };
            if (request.Name != null) updates["name"] = request.Name;
            if (request.IsActive.HasValue) updates["isActive"] = request.IsActive.Value;
            if (request.IsClosed.HasValue) updates["isClosed"] = request.IsClosed.Value;

            await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(AccountCollection, key, updates);
            return Results.Ok();
        }
        catch
        {
            return Results.NotFound();
        }
    }

    // ==================== BILLS ====================

    private static async Task<IResult> GetBills(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? familyId = null)
    {
        var family = familyId ?? "default";
        var query = $@"
            FOR doc IN {BillCollection}
            FILTER doc.familyId == @familyId
            SORT doc.dueDay ASC
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            query, new Dictionary<string, object> { { "familyId", family } });

        var bills = cursor.Result.Select(MapBill).ToList();
        return Results.Ok(bills);
    }

    private static async Task<IResult> GetUpcomingBills(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? familyId = null,
        [FromQuery] int days = 30)
    {
        var family = familyId ?? "default";
        var bills = await GetUpcomingBillsInternal(db, family, DateTime.UtcNow, DateTime.UtcNow.AddDays(days));
        return Results.Ok(bills);
    }

    private static async Task<IResult> GetBill(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<dynamic>(BillCollection, key);
            return Results.Ok(MapBill(doc));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CreateBill(
        CreateBudgetBillRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;
        var doc = new
        {
            _key = Guid.NewGuid().ToString("N")[..12],
            familyId = request.FamilyId,
            name = request.Name,
            categoryKey = request.CategoryKey,
            accountKey = request.AccountKey,
            amount = request.Amount,
            dueDay = request.DueDay,
            frequency = request.Frequency,
            isAutoPay = request.IsAutoPay,
            isActive = true,
            createdAt = now
        };

        var result = await db.Client.Document.PostDocumentAsync(BillCollection, doc);
        return Results.Created($"/api/v1/budget/bills/{result._key}", MapBill(doc));
    }

    private static async Task<IResult> UpdateBill(
        string key,
        UpdateBudgetBillRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            var updates = new Dictionary<string, object>();
            if (request.Name != null) updates["name"] = request.Name;
            if (request.CategoryKey != null) updates["categoryKey"] = request.CategoryKey;
            if (request.AccountKey != null) updates["accountKey"] = request.AccountKey;
            if (request.Amount.HasValue) updates["amount"] = request.Amount.Value;
            if (request.DueDay.HasValue) updates["dueDay"] = request.DueDay.Value;
            if (request.Frequency != null) updates["frequency"] = request.Frequency;
            if (request.IsAutoPay.HasValue) updates["isAutoPay"] = request.IsAutoPay.Value;
            if (request.IsActive.HasValue) updates["isActive"] = request.IsActive.Value;

            await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(BillCollection, key, updates);
            return Results.Ok();
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> MarkBillPaid(
        string key,
        MarkBillPaidRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            // Fetch the bill
            var bill = await db.Client.Document.GetDocumentAsync<dynamic>(BillCollection, key);
            if (bill == null)
            {
                return Results.NotFound(new { error = "Bill not found" });
            }

            string? accountKey = bill.accountKey?.ToString();
            string? categoryKey = bill.categoryKey?.ToString();
            string billName = bill.name?.ToString() ?? "Unknown Bill";
            decimal billAmount = Convert.ToDecimal(bill.amount ?? 0);
            string frequency = bill.frequency?.ToString() ?? "monthly";
            int dueDay = Convert.ToInt32(bill.dueDay ?? 1);

            if (string.IsNullOrWhiteSpace(accountKey))
            {
                return Results.BadRequest(new { error = "Bill must have an account assigned" });
            }

            // Use actual amount if provided, otherwise use bill amount
            decimal transactionAmount = request.ActualAmount ?? billAmount;

            // Create transaction for bill payment (negative for expense)
            var transactionDoc = new
            {
                _key = Guid.NewGuid().ToString("N")[..12],
                accountKey = accountKey,
                categoryKey = categoryKey,
                payPeriodKey = (string?)null, // Will be determined based on transaction date
                payee = billName,
                memo = request.Memo ?? $"Bill payment: {billName}",
                amount = -Math.Abs(transactionAmount), // Ensure negative (expense)
                transactionDate = request.PaidDate,
                isCleared = true, // Mark as cleared since it's a confirmed bill payment
                isReconciled = false,
                billKey = key, // Link transaction to bill
                createdAt = DateTime.UtcNow
            };

            var transactionResult = await db.Client.Document.PostDocumentAsync(TransactionCollection, transactionDoc);

            // Update account balance
            await UpdateAccountBalance(db, accountKey);

            // Calculate next due date based on frequency
            DateTime nextDueDate = CalculateNextDueDate(request.PaidDate, frequency, dueDay);

            // Update bill's lastPaidDate and nextDueDate
            var billUpdates = new Dictionary<string, object>
            {
                ["lastPaidDate"] = request.PaidDate,
                ["nextDueDate"] = nextDueDate
            };

            await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(BillCollection, key, billUpdates);

            // Return the created transaction
            return Results.Ok(new
            {
                transactionKey = transactionResult._key,
                billKey = key,
                amount = transactionAmount,
                paidDate = request.PaidDate,
                nextDueDate = nextDueDate,
                message = "Bill marked as paid and transaction created"
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error marking bill paid: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return Results.Problem(
                title: "Error marking bill paid",
                detail: ex.Message,
                statusCode: 500);
        }
    }

    private static DateTime CalculateNextDueDate(DateTime lastPaidDate, string frequency, int dueDay)
    {
        DateTime nextDate = lastPaidDate;

        switch (frequency.ToLower())
        {
            case "weekly":
                nextDate = lastPaidDate.AddDays(7);
                break;

            case "biweekly":
                nextDate = lastPaidDate.AddDays(14);
                break;

            case "monthly":
                nextDate = lastPaidDate.AddMonths(1);
                // Adjust to the correct due day
                nextDate = new DateTime(nextDate.Year, nextDate.Month, Math.Min(dueDay, DateTime.DaysInMonth(nextDate.Year, nextDate.Month)));
                break;

            case "quarterly":
                nextDate = lastPaidDate.AddMonths(3);
                nextDate = new DateTime(nextDate.Year, nextDate.Month, Math.Min(dueDay, DateTime.DaysInMonth(nextDate.Year, nextDate.Month)));
                break;

            case "yearly":
                nextDate = lastPaidDate.AddYears(1);
                nextDate = new DateTime(nextDate.Year, nextDate.Month, Math.Min(dueDay, DateTime.DaysInMonth(nextDate.Year, nextDate.Month)));
                break;

            default:
                // Default to monthly if frequency is unknown
                nextDate = lastPaidDate.AddMonths(1);
                nextDate = new DateTime(nextDate.Year, nextDate.Month, Math.Min(dueDay, DateTime.DaysInMonth(nextDate.Year, nextDate.Month)));
                break;
        }

        return nextDate;
    }

    private static async Task<IResult> GenerateRecurringBillInstances(
        [FromServices] IServiceProvider serviceProvider)
    {
        try
        {
            // Get the RecurringBillService from the hosted services
            var recurringBillService = serviceProvider.GetServices<IHostedService>()
                .OfType<RecurringBillService>()
                .FirstOrDefault();

            if (recurringBillService == null)
            {
                return Results.Problem(
                    title: "Service not found",
                    detail: "RecurringBillService is not registered",
                    statusCode: 500);
            }

            // Trigger bill instance generation manually
            await recurringBillService.GenerateBillInstances(CancellationToken.None);

            return Results.Ok(new
            {
                message = "Bill instance generation triggered successfully. Check logs for details.",
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Error generating bill instances",
                detail: ex.Message,
                statusCode: 500);
        }
    }

    // ==================== GOALS ====================

    private static async Task<IResult> GetGoals(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? familyId = null,
        [FromQuery] bool? isCompleted = null)
    {
        var family = familyId ?? "default";
        var completedFilter = isCompleted.HasValue
            ? $"FILTER doc.isCompleted == {isCompleted.Value.ToString().ToLower()}"
            : "";

        var query = $@"
            FOR doc IN {GoalCollection}
            FILTER doc.familyId == @familyId
            {completedFilter}
            SORT doc.createdAt DESC
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            query, new Dictionary<string, object> { { "familyId", family } });

        var goals = cursor.Result.Select(MapGoal).ToList();
        return Results.Ok(goals);
    }

    private static async Task<IResult> GetGoal(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<dynamic>(GoalCollection, key);
            return Results.Ok(MapGoal(doc));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CreateGoal(
        CreateBudgetGoalRequest request,
        [FromServices] ArangoDbContext db)
    {
        var now = DateTime.UtcNow;
        var doc = new
        {
            _key = Guid.NewGuid().ToString("N")[..12],
            familyId = request.FamilyId,
            name = request.Name,
            categoryKey = request.CategoryKey,
            targetAmount = request.TargetAmount,
            currentAmount = 0m,
            targetDate = request.TargetDate,
            isCompleted = false,
            createdAt = now,
            updatedAt = now
        };

        var result = await db.Client.Document.PostDocumentAsync(GoalCollection, doc);
        return Results.Created($"/api/v1/budget/goals/{result._key}", MapGoal(doc));
    }

    private static async Task<IResult> UpdateGoalProgress(
        string key,
        UpdateBudgetGoalProgressRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            var existing = await db.Client.Document.GetDocumentAsync<dynamic>(GoalCollection, key);
            var currentAmount = decimal.TryParse(existing.currentAmount?.ToString(), out decimal curr) ? curr : 0m;
            var targetAmount = decimal.TryParse(existing.targetAmount?.ToString(), out decimal target) ? target : 0m;

            var newAmount = currentAmount + request.Amount;
            var isCompleted = newAmount >= targetAmount;

            var updates = new Dictionary<string, object>
            {
                { "currentAmount", newAmount },
                { "isCompleted", isCompleted },
                { "updatedAt", DateTime.UtcNow }
            };

            await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(GoalCollection, key, updates);
            return Results.Ok(new { currentAmount = newAmount, isCompleted });
        }
        catch
        {
            return Results.NotFound();
        }
    }

    // ==================== TRANSACTIONS ====================

    private static async Task<IResult> GetTransactions(
        [FromServices] ArangoDbContext db,
        [FromQuery] string? payPeriodKey = null,
        [FromQuery] int limit = 50)
    {
        var periodFilter = payPeriodKey != null ? "FILTER doc.payPeriodKey == @payPeriodKey" : "";

        var query = $@"
            FOR doc IN {TransactionCollection}
            {periodFilter}
            SORT doc.transactionDate DESC
            LIMIT @limit
            RETURN doc";

        var bindVars = new Dictionary<string, object> { { "limit", limit } };
        if (payPeriodKey != null) bindVars["payPeriodKey"] = payPeriodKey;

        var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(query, bindVars);
        var transactions = cursor.Result.Select(MapTransaction).ToList();
        return Results.Ok(transactions);
    }

    private static async Task<IResult> GetAccountTransactions(
        string accountKey,
        [FromServices] ArangoDbContext db,
        [FromQuery] int limit = 50)
    {
        var query = $@"
            FOR doc IN {TransactionCollection}
            FILTER doc.accountKey == @accountKey
            SORT doc.transactionDate DESC
            LIMIT @limit
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            query, new Dictionary<string, object> { { "accountKey", accountKey }, { "limit", limit } });

        var transactions = cursor.Result.Select(MapTransaction).ToList();
        return Results.Ok(transactions);
    }

    private static async Task<IResult> GetTransaction(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var doc = await db.Client.Document.GetDocumentAsync<dynamic>(TransactionCollection, key);
            return Results.Ok(MapTransaction(doc));
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CreateTransfer(
        CreateBudgetTransferRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.FromAccountKey) || string.IsNullOrWhiteSpace(request.ToAccountKey))
            {
                return Results.BadRequest(new { error = "Both From and To accounts are required" });
            }

            if (request.FromAccountKey == request.ToAccountKey)
            {
                return Results.BadRequest(new { error = "Cannot transfer to the same account" });
            }

            if (request.Amount <= 0)
            {
                return Results.BadRequest(new { error = "Amount must be positive" });
            }

            var now = DateTime.UtcNow;
            
            // Get From Account Name for Payee
            var fromAccountDoc = await db.Client.Document.GetDocumentAsync<dynamic>(AccountCollection, request.FromAccountKey);
            string fromAccountName = fromAccountDoc?.name?.ToString() ?? "Unknown Account";

            // Get To Account Name for Payee
            var toAccountDoc = await db.Client.Document.GetDocumentAsync<dynamic>(AccountCollection, request.ToAccountKey);
            string toAccountName = toAccountDoc?.name?.ToString() ?? "Unknown Account";

            // 1. Create Withdrawal Transaction (From Account)
            var withdrawalDoc = new
            {
                _key = Guid.NewGuid().ToString("N")[..12],
                accountKey = request.FromAccountKey,
                payee = $"Transfer to: {toAccountName}",
                memo = request.Memo,
                amount = -Math.Abs(request.Amount),
                transactionDate = request.TransactionDate,
                isCleared = false,
                isReconciled = false,
                splits = (object?)null,
                createdAt = now
            };
            
            // 2. Create Deposit Transaction (To Account)
            var depositDoc = new
            {
                _key = Guid.NewGuid().ToString("N")[..12],
                accountKey = request.ToAccountKey,
                payee = $"Transfer from: {fromAccountName}",
                memo = request.Memo,
                amount = Math.Abs(request.Amount),
                transactionDate = request.TransactionDate,
                isCleared = false,
                isReconciled = false,
                splits = (object?)null,
                createdAt = now
            };

            await db.Client.Document.PostDocumentAsync(TransactionCollection, withdrawalDoc);
            await db.Client.Document.PostDocumentAsync(TransactionCollection, depositDoc);

            // 3. Update Balances
            await UpdateAccountBalance(db, request.FromAccountKey);
            await UpdateAccountBalance(db, request.ToAccountKey);

            return Results.Ok(new { message = "Transfer complete" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error creating transfer: {ex.Message}");
            return Results.Problem(title: "Error creating transfer", detail: ex.Message, statusCode: 500);
        }
    }

    private static async Task<IResult> CreateTransaction(
        CreateBudgetTransactionRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.AccountKey))
            {
                return Results.BadRequest(new { error = "accountKey is required" });
            }

            var now = DateTime.UtcNow;
            var doc = new
            {
                _key = Guid.NewGuid().ToString("N")[..12],
                accountKey = request.AccountKey,
                categoryKey = request.CategoryKey,
                payPeriodKey = (string?)null, // Will be determined based on transaction date
                payee = request.Payee,
                memo = request.Memo,
                amount = request.Amount,
                transactionDate = request.TransactionDate,
                isCleared = false,
                isReconciled = false,
                splits = (object?)null,
                createdAt = now
            };

            var result = await db.Client.Document.PostDocumentAsync(TransactionCollection, doc);

            // Update account balance
            try
            {
                await UpdateAccountBalance(db, request.AccountKey);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }

            return Results.Created($"/api/v1/budget/transactions/{result._key}", MapTransaction(doc));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error creating transaction: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return Results.Problem(
                title: "Error creating transaction",
                detail: ex.Message,
                statusCode: 500);
        }
    }

    private static async Task<IResult> UpdateTransaction(
        string key,
        UpdateBudgetTransactionRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            var existing = await db.Client.Document.GetDocumentAsync<dynamic>(TransactionCollection, key);
            var accountKey = existing.accountKey?.ToString();

            var updates = new Dictionary<string, object>();
            if (request.CategoryKey != null) updates["categoryKey"] = request.CategoryKey;
            if (request.Payee != null) updates["payee"] = request.Payee;
            if (request.Memo != null) updates["memo"] = request.Memo;
            if (request.Amount.HasValue) updates["amount"] = request.Amount.Value;
            if (request.TransactionDate.HasValue) updates["transactionDate"] = request.TransactionDate.Value;
            if (request.IsCleared.HasValue) updates["isCleared"] = request.IsCleared.Value;

            await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(TransactionCollection, key, updates);

            // Update account balance if amount changed
            if (request.Amount.HasValue && accountKey != null)
            {
                await UpdateAccountBalance(db, accountKey);
            }

            return Results.Ok();
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> ClearTransaction(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var existing = await db.Client.Document.GetDocumentAsync<dynamic>(TransactionCollection, key);
            var isCleared = existing.isCleared == true;

            await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(
                TransactionCollection, key,
                new Dictionary<string, object> { { "isCleared", !isCleared } });

            // Update cleared balance
            var accountKey = existing.accountKey?.ToString();
            if (accountKey != null)
            {
                await UpdateAccountBalance(db, accountKey);
            }

            return Results.Ok(new { isCleared = !isCleared });
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> DeleteTransaction(string key, [FromServices] ArangoDbContext db)
    {
        try
        {
            var existing = await db.Client.Document.GetDocumentAsync<dynamic>(TransactionCollection, key);
            var accountKey = existing.accountKey?.ToString();

            await db.Client.Document.DeleteDocumentAsync(TransactionCollection, key);

            // Update account balance after deletion
            if (accountKey != null)
            {
                await UpdateAccountBalance(db, accountKey);
            }

            return Results.NoContent();
        }
        catch
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> ReplaceSplits(
        string key,
        ReplaceSplitsRequest request,
        [FromServices] ArangoDbContext db)
    {
        try
        {
            // Verify transaction exists
            var existing = await db.Client.Document.GetDocumentAsync<dynamic>(TransactionCollection, key);

            // Update transaction with new splits
            var splits = request.Splits.Select(s => new
            {
                categoryKey = s.CategoryKey,
                amount = s.Amount,
                memo = s.Memo
            }).ToList();

            await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(
                TransactionCollection, key,
                new Dictionary<string, object> { { "splits", splits } });

            return Results.Ok(splits);
        }
        catch
        {
            return Results.NotFound();
        }
    }

    // ==================== HELPER METHODS ====================

    private static async Task<BudgetPayPeriodDto?> GetCurrentPayPeriodInternal(ArangoDbContext db, string familyId)
    {
        var today = DateTime.UtcNow.Date;
        var query = $@"
            FOR doc IN {PayPeriodCollection}
            FILTER doc.familyId == @familyId
                AND doc.startDate <= @today
                AND doc.endDate >= @today
            LIMIT 1
            RETURN doc";

        var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            query, new Dictionary<string, object> { { "familyId", familyId }, { "today", today } });

        var period = cursor.Result.FirstOrDefault();
        return period != null ? MapPayPeriod(period) : null;
    }

    private static async Task<PayPeriodBudgetSummaryDto?> CalculateBudgetSummaryInternal(ArangoDbContext db, string payPeriodKey)
    {
        // Get pay period
        dynamic period;
        try
        {
            period = await db.Client.Document.GetDocumentAsync<dynamic>(PayPeriodCollection, payPeriodKey);
        }
        catch
        {
            return null;
        }

        // Calculate Total Planned Income (Targets of Income Categories)
        // Note: Targets are global per category, not per period. Ideally should be per period if income varies.
        // But for now, we use Category.TargetAmount as the planned income.
        // TODO: Move Income Planning to AssignmentCollection or specific IncomePlanningCollection if it varies by period.
        // For EveryDollar style, you usually adjust the "Planned" amount for the month.
        // If we use AssignmentCollection for "Planned Expense", maybe we use it for "Planned Income" too?
        // Let's assume for now: Income Group -> AssignedAmount = Planned Income.
        
        // Let's check assignments for Income Groups
        var incomeAssignedQuery = $@"
            FOR doc IN {AssignmentCollection}
            FILTER doc.payPeriodKey == @payPeriodKey
            LET cat = FIRST(FOR c IN {CategoryCollection} FILTER c._key == doc.categoryKey RETURN c)
            LET grp = FIRST(FOR g IN {CategoryGroupCollection} FILTER g._key == cat.groupKey RETURN g)
            FILTER grp.type == 'Income'
            RETURN doc.assignedAmount";
            
        var incomeCursor = await db.Client.Cursor.PostCursorAsync<decimal>(
            incomeAssignedQuery, new Dictionary<string, object> { { "payPeriodKey", payPeriodKey } });
        var totalPlannedIncome = incomeCursor.Result.Sum();

        // Get total assigned to EXPENSES
        var expenseAssignedQuery = $@"
            FOR doc IN {AssignmentCollection}
            FILTER doc.payPeriodKey == @payPeriodKey
            LET cat = FIRST(FOR c IN {CategoryCollection} FILTER c._key == doc.categoryKey RETURN c)
            LET grp = FIRST(FOR g IN {CategoryGroupCollection} FILTER g._key == cat.groupKey RETURN g)
            FILTER grp.type != 'Income'
            RETURN doc.assignedAmount";

        var expenseCursor = await db.Client.Cursor.PostCursorAsync<decimal>(
            expenseAssignedQuery, new Dictionary<string, object> { { "payPeriodKey", payPeriodKey } });
        var totalExpenseAssigned = expenseCursor.Result.Sum();

        return new PayPeriodBudgetSummaryDto
        {
            PayPeriodKey = payPeriodKey,
            PayPeriodName = period.name?.ToString() ?? "",
            TotalIncome = totalPlannedIncome,
            TotalAssigned = totalExpenseAssigned,
            Unassigned = totalPlannedIncome - totalExpenseAssigned
        };
    }

    private static async Task<List<CategoryBalanceDto>> CalculateCategoryBalancesInternal(
        ArangoDbContext db, string payPeriodKey, string familyId)
    {
        var query = $@"
            FOR cat IN {CategoryCollection}
            FILTER cat.familyId == @familyId
            LET grp = FIRST(
                FOR g IN {CategoryGroupCollection}
                FILTER g._key == cat.groupKey
                RETURN g
            )
            LET isIncome = grp.type == 'Income'
            LET carryoverDoc = FIRST(
                FOR co IN {CarryoverCollection}
                FILTER co.familyId == @familyId AND co.payPeriodKey == @payPeriodKey AND co.categoryKey == cat._key
                RETURN co
            )
            LET assignment = FIRST(
                FOR a IN {AssignmentCollection}
                FILTER a.categoryKey == cat._key AND a.payPeriodKey == @payPeriodKey
                RETURN a
            )
            LET spent = SUM(
                FOR t IN {TransactionCollection}
                FILTER t.categoryKey == cat._key AND t.payPeriodKey == @payPeriodKey
                FILTER (isIncome ? t.amount > 0 : t.amount < 0)
                RETURN ABS(t.amount)
            )
            RETURN {{
                categoryKey: cat._key,
                categoryName: cat.name,
                groupName: grp.name,
                isIncome: isIncome,
                carryover: carryoverDoc.carryover || 0,
                assigned: assignment.assignedAmount || 0,
                spent: spent || 0
            }}";

        var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            query, new Dictionary<string, object> { { "familyId", familyId }, { "payPeriodKey", payPeriodKey } });

        return cursor.Result.Select(doc => new CategoryBalanceDto
        {
            CategoryKey = doc.categoryKey?.ToString() ?? "",
            CategoryName = doc.categoryName?.ToString() ?? "",
            GroupName = doc.groupName?.ToString() ?? "",
            IsIncome = doc.isIncome == true,
            Carryover = decimal.TryParse(doc.carryover?.ToString(), out decimal co) ? co : 0,
            Assigned = decimal.TryParse(doc.assigned?.ToString(), out decimal a) ? a : 0,
            Spent = decimal.TryParse(doc.spent?.ToString(), out decimal s) ? s : 0
        }).ToList();
    }

    private static async Task<List<UpcomingBillDto>> GetUpcomingBillsInternal(
        ArangoDbContext db, string familyId, DateTime fromDate, DateTime toDate)
    {
        var query = $@"
            FOR bill IN {BillCollection}
            FILTER bill.familyId == @familyId AND bill.isActive == true
            LET cat = FIRST(FOR c IN {CategoryCollection} FILTER c._key == bill.categoryKey RETURN c)
            LET acc = FIRST(FOR a IN {AccountCollection} FILTER a._key == bill.accountKey RETURN a)
            RETURN {{
                billKey: bill._key,
                billName: bill.name,
                amount: bill.amount,
                dueDay: bill.dueDay,
                categoryName: cat.name,
                accountName: acc.name,
                isAutoPay: bill.isAutoPay
            }}";

        var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
            query, new Dictionary<string, object> { { "familyId", familyId } });

        var bills = new List<UpcomingBillDto>();
        foreach (var doc in cursor.Result)
        {
            var dueDay = int.TryParse(doc.dueDay?.ToString(), out int d) ? d : 1;
            var dueDate = new DateTime(fromDate.Year, fromDate.Month, Math.Min(dueDay, DateTime.DaysInMonth(fromDate.Year, fromDate.Month)));

            if (dueDate < fromDate)
            {
                dueDate = dueDate.AddMonths(1);
                dueDate = new DateTime(dueDate.Year, dueDate.Month, Math.Min(dueDay, DateTime.DaysInMonth(dueDate.Year, dueDate.Month)));
            }

            if (dueDate >= fromDate && dueDate <= toDate)
            {
                bills.Add(new UpcomingBillDto
                {
                    BillKey = doc.billKey?.ToString() ?? "",
                    BillName = doc.billName?.ToString() ?? "",
                    Amount = decimal.TryParse(doc.amount?.ToString(), out decimal inc) ? inc : 0,
                    DueDate = dueDate,
                    CategoryName = doc.categoryName?.ToString() ?? "",
                    AccountName = doc.accountName?.ToString() ?? "",
                    IsAutoPay = doc.isAutoPay == true
                });
            }
        }

        return bills.OrderBy(b => b.DueDate).ToList();
    }

    private static async Task UpdateAccountBalance(ArangoDbContext db, string accountKey)
    {
        try
        {
            var balanceQuery = $@"
                FOR doc IN {TransactionCollection}
                FILTER doc.accountKey == @accountKey
                COLLECT AGGREGATE
                    total = SUM(doc.amount),
                    cleared = SUM(doc.isCleared ? doc.amount : 0)
                RETURN {{ total: total, cleared: cleared }}";

            var cursor = await db.Client.Cursor.PostCursorAsync<dynamic>(
                balanceQuery, new Dictionary<string, object> { { "accountKey", accountKey } });

            var result = cursor.Result.FirstOrDefault();
            var balanceStr = result?.total != null
                ? Convert.ToString(result.total, CultureInfo.InvariantCulture)
                : null;
            var balance = decimal.TryParse(
                balanceStr ?? "0",
                NumberStyles.Number,
                CultureInfo.InvariantCulture,
                out decimal b)
                ? b
                : 0m;

            var clearedStr = result?.cleared != null
                ? Convert.ToString(result.cleared, CultureInfo.InvariantCulture)
                : null;
            var clearedBalance = decimal.TryParse(
                clearedStr ?? "0",
                NumberStyles.Number,
                CultureInfo.InvariantCulture,
                out decimal c)
                ? c
                : 0m;

            // Get opening balance
            dynamic account;
            try
            {
                account = await db.Client.Document.GetDocumentAsync<dynamic>(AccountCollection, accountKey);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting account {accountKey}: {ex.Message}");
                throw new InvalidOperationException($"Account not found: {accountKey}", ex);
            }

            var openingBalanceStr = account.openingBalance != null
                ? Convert.ToString(account.openingBalance, CultureInfo.InvariantCulture)
                : null;
            var openingBalance = decimal.TryParse(
                openingBalanceStr ?? "0",
                NumberStyles.Number,
                CultureInfo.InvariantCulture,
                out decimal ob)
                ? ob
                : 0m;

            await db.Client.Document.PatchDocumentAsync<dynamic, dynamic>(
                AccountCollection, accountKey,
                new Dictionary<string, object>
                {
                    { "balance", openingBalance + balance },
                    { "clearedBalance", openingBalance + clearedBalance },
                    { "updatedAt", DateTime.UtcNow }
                });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error updating account balance for {accountKey}: {ex.Message}");
            throw;
        }
    }

    // ==================== MAPPERS ====================

    private static BudgetPayPeriodDto MapPayPeriod(dynamic doc) => new()
    {
        Key = doc._key?.ToString() ?? "",
        FamilyId = doc.familyId?.ToString() ?? "",
        Name = doc.name?.ToString() ?? "",
        StartDate = DateTime.TryParse(doc.startDate?.ToString(), out DateTime start) ? start : DateTime.MinValue,
        EndDate = DateTime.TryParse(doc.endDate?.ToString(), out DateTime end) ? end : DateTime.MinValue,
        IsActive = doc.isActive == true,
        IsClosed = doc.isClosed == true,
        ExpectedIncome = decimal.TryParse(doc.expectedIncome?.ToString() ?? "", out decimal expected) ? expected : 0,
        TotalIncome = decimal.TryParse(doc.totalIncome?.ToString() ?? "", out decimal income) ? income : 0,
        CreatedAt = DateTime.TryParse(doc.createdAt?.ToString(), out DateTime created) ? created : DateTime.MinValue,
        UpdatedAt = DateTime.TryParse(doc.updatedAt?.ToString(), out DateTime updated) ? updated : DateTime.MinValue,
    };

    private static BudgetCategoryGroupDto MapCategoryGroup(dynamic doc) => new()
    {
        Key = doc._key?.ToString() ?? "",
        FamilyId = doc.familyId?.ToString() ?? "",
        Name = doc.name?.ToString() ?? "",
        Type = doc.type?.ToString() ?? "Expense",
        SortOrder = int.TryParse(doc.sortOrder?.ToString() ?? "", out int sort) ? sort : 0,
        IsSystem = doc.isSystem == true,
        CreatedAt = DateTime.TryParse(doc.createdAt?.ToString(), out DateTime created) ? created : DateTime.MinValue,
        Categories = doc.categories != null
            ? ((IEnumerable<dynamic>)doc.categories).Select(MapCategory).ToList()
            : new List<BudgetCategoryDto>()
    };

    private static BudgetCategoryDto MapCategory(dynamic doc) => new()
    {
        Key = doc._key?.ToString() ?? "",
        GroupKey = doc.groupKey?.ToString() ?? "",
        FamilyId = doc.familyId?.ToString() ?? "",
        Name = doc.name?.ToString() ?? "",
        TargetAmount = decimal.TryParse(doc.targetAmount?.ToString() ?? "", out decimal target) ? target : 0,
        SortOrder = int.TryParse(doc.sortOrder?.ToString() ?? "", out int sort) ? sort : 0,
        IsHidden = doc.isHidden == true,
        CreatedAt = DateTime.TryParse(doc.createdAt?.ToString(), out DateTime created) ? created : DateTime.MinValue
    };

    private static BudgetAssignmentDto MapAssignment(dynamic doc) => new()
    {
        Key = doc._key?.ToString() ?? "",
        PayPeriodKey = doc.payPeriodKey?.ToString() ?? "",
        CategoryKey = doc.categoryKey?.ToString() ?? "",
        AssignedAmount = decimal.TryParse(doc.assignedAmount?.ToString(), out decimal amount) ? amount : 0,
        CreatedByUserKey = doc.createdByUserKey?.ToString(),
        CreatedAt = DateTime.TryParse(doc.createdAt?.ToString(), out DateTime created) ? created : DateTime.MinValue
    };

    private static BudgetIncomeEntryDto MapIncomeEntry(dynamic doc) => new()
    {
        Key = doc._key?.ToString() ?? "",
        PayPeriodKey = doc.payPeriodKey?.ToString() ?? "",
        Description = doc.description?.ToString() ?? "",
        Amount = decimal.TryParse(doc.amount?.ToString(), out decimal amount) ? amount : 0,
        ReceivedDate = DateTime.TryParse(doc.receivedDate?.ToString(), out DateTime received) ? received : DateTime.MinValue,
        CreatedByUserKey = doc.createdByUserKey?.ToString(),
        CreatedAt = DateTime.TryParse(doc.createdAt?.ToString(), out DateTime created) ? created : DateTime.MinValue
    };

    private static BudgetAccountDto MapAccount(dynamic doc) => new()
    {
        Key = doc._key?.ToString() ?? "",
        FamilyId = doc.familyId?.ToString() ?? "",
        Name = doc.name?.ToString() ?? "",
        AccountType = doc.accountType?.ToString() ?? "",
        Balance = decimal.TryParse(doc.balance?.ToString(), out decimal balance) ? balance : 0,
        ClearedBalance = decimal.TryParse(doc.clearedBalance?.ToString(), out decimal cleared) ? cleared : 0,
        IsActive = doc.isActive == true,
        IsClosed = doc.isClosed == true,
        CreatedAt = DateTime.TryParse(doc.createdAt?.ToString(), out DateTime created) ? created : DateTime.MinValue,
        UpdatedAt = DateTime.TryParse(doc.updatedAt?.ToString(), out DateTime updated) ? updated : DateTime.MinValue
    };

    private static BudgetBillDto MapBill(dynamic doc) => new()
    {
        Key = doc._key?.ToString() ?? "",
        FamilyId = doc.familyId?.ToString() ?? "",
        Name = doc.name?.ToString() ?? "",
        CategoryKey = doc.categoryKey?.ToString() ?? "",
        AccountKey = doc.accountKey?.ToString() ?? "",
        Amount = decimal.TryParse(doc.amount?.ToString(), out decimal amount) ? amount : 0,
        DueDay = int.TryParse(doc.dueDay?.ToString(), out int day) ? day : 1,
        Frequency = doc.frequency?.ToString() ?? "",
        IsAutoPay = doc.isAutoPay == true,
        IsActive = doc.isActive == true,
        CreatedAt = DateTime.TryParse(doc.createdAt?.ToString(), out DateTime created) ? created : DateTime.MinValue
    };

    private static BudgetGoalDto MapGoal(dynamic doc) => new()
    {
        Key = doc._key?.ToString() ?? "",
        FamilyId = doc.familyId?.ToString() ?? "",
        Name = doc.name?.ToString() ?? "",
        CategoryKey = doc.categoryKey?.ToString() ?? "",
        TargetAmount = decimal.TryParse(doc.targetAmount?.ToString(), out decimal target) ? target : 0,
        CurrentAmount = decimal.TryParse(doc.currentAmount?.ToString(), out decimal current) ? current : 0,
        TargetDate = DateTime.TryParse(doc.targetDate?.ToString(), out DateTime date) ? date : DateTime.MinValue,
        IsCompleted = doc.isCompleted == true,
        CreatedAt = DateTime.TryParse(doc.createdAt?.ToString(), out DateTime created) ? created : DateTime.MinValue,
        UpdatedAt = DateTime.TryParse(doc.updatedAt?.ToString(), out DateTime updated) ? updated : DateTime.MinValue,
    };

    private static BudgetTransactionDto MapTransaction(dynamic doc) => new()
    {
        Key = doc._key?.ToString() ?? "",
        AccountKey = doc.accountKey?.ToString() ?? "",
        CategoryKey = doc.categoryKey?.ToString(),
        PayPeriodKey = doc.payPeriodKey?.ToString(),
        Payee = doc.payee?.ToString() ?? "",
        Memo = doc.memo?.ToString(),
        Amount = decimal.TryParse(doc.amount?.ToString(), out decimal amount) ? amount : 0,
        Splits = doc.splits != null
            ? ((IEnumerable<dynamic>)doc.splits).Select(s => new SplitItem
            {
                CategoryKey = s.categoryKey?.ToString(),
                Amount = decimal.TryParse(s.amount?.ToString(), out decimal splitAmount) ? splitAmount : 0,
                Memo = s.memo?.ToString()
            }).ToList()
            : null,
        TransactionDate = DateTime.TryParse(doc.transactionDate?.ToString(), out DateTime date) ? date : DateTime.MinValue,
        IsCleared = doc.isCleared == true,
        IsReconciled = doc.isReconciled == true,
        CreatedAt = DateTime.TryParse(doc.createdAt?.ToString(), out DateTime created) ? created : DateTime.MinValue
    };
}
