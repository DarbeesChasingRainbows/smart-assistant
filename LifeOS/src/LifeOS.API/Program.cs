using LifeOS.API.Endpoints;
using LifeOS.Application;
using LifeOS.Infrastructure;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.RulesEngine.Adapters;
using MediatR;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddOpenApi();

// Add Application services (use-cases)
builder.Services.AddApplicationServices();

// Add MediatR for domain events
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(LifeOS.Application.DependencyInjection).Assembly);
    cfg.NotificationPublisher = new MediatR.NotificationPublishers.TaskWhenAllPublisher();
});

// Add Infrastructure services (ArangoDB, Repositories)
builder.Services.AddInfrastructureServices(builder.Configuration);

// Add F# Rules Engine services (Allowance, Maintenance rules)
builder.Services.AddLifeOSRulesEngine();

builder.Services.AddHttpClient(
    "VinProvider",
    client =>
    {
        var baseUrl =
            builder.Configuration["Vin:BaseUrl"]
            ?? Environment.GetEnvironmentVariable("LIFEOS_VIN_BASE_URL")
            ?? "https://vpic.nhtsa.dot.gov";
        client.BaseAddress = new Uri(baseUrl);
    }
);

// Add CORS for Deno Fresh frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "AllowFrontend",
        policy =>
        {
            policy
                .WithOrigins(
                    "http://localhost:8000",
                    "http://localhost:3000",
                    "http://localhost:5173",
                    "http://127.0.0.1:5173"
                )
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials(); // Added for future auth support and preflight consistency
        }
    );
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("AllowFrontend");

// Map API endpoints (Primary Adapters)
app.MapVehicleEndpoints();
app.MapVehicleMaintenanceEndpoints();
app.MapComponentEndpoints();
app.MapInventoryEndpoints();
app.MapPeopleEndpoints();
app.MapGardenEndpoints();
app.MapFinanceEndpoints();
app.MapHomeEndpoints();
app.MapVehicleEventsExample();
app.MapEventsEndpoints();
app.MapVinEndpoints();
app.MapBudgetEndpoints();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow }))
    .WithName("HealthCheck")
    .WithTags("System");

// Initialize database collections
var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("Starting database initialization...");
InitializeDatabaseAsync(app).GetAwaiter().GetResult();
logger.LogInformation("Database initialization completed");

app.Run();

async Task InitializeDatabaseAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var arangoContext = scope.ServiceProvider.GetRequiredService<ArangoDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    try
    {
        var collectionApi = arangoContext.Client.Collection;
        
        // Budget domain collections to create
        var budgetCollections = new[]
        {
            ArangoDbContext.Collections.BudgetPayPeriods,
            ArangoDbContext.Collections.BudgetCategoryGroups,
            ArangoDbContext.Collections.BudgetCategories,
            ArangoDbContext.Collections.BudgetAssignments,
            ArangoDbContext.Collections.BudgetCategoryCarryovers,
            ArangoDbContext.Collections.BudgetIncomeEntries,
            ArangoDbContext.Collections.BudgetAccounts,
            ArangoDbContext.Collections.BudgetBills,
            ArangoDbContext.Collections.BudgetGoals,
            ArangoDbContext.Collections.BudgetTransactions
        };

        foreach (var collectionName in budgetCollections)
        {
            try
            {
                await collectionApi.GetCollectionAsync(collectionName);
                logger.LogDebug("Collection '{CollectionName}' exists", collectionName);
            }
            catch (ArangoDBNetStandard.ApiErrorException)
            {
                logger.LogInformation("Creating collection '{CollectionName}'", collectionName);
                await collectionApi.PostCollectionAsync(new ArangoDBNetStandard.CollectionApi.Models.PostCollectionBody
                {
                    Name = collectionName,
                    Type = ArangoDBNetStandard.CollectionApi.Models.CollectionType.Document
                });
            }
        }
        
        logger.LogInformation("Budget collections initialization completed");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to initialize database collections");
        throw;
    }
}
