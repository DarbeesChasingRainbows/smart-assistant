using ArangoDBNetStandard;
using ArangoDBNetStandard.DatabaseApi;
using ArangoDBNetStandard.CollectionApi;
using ArangoDBNetStandard.CollectionApi.Models;
using static ArangoDBNetStandard.CollectionApi.Models.CollectionType;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using LifeOS.Infrastructure.Persistence.ArangoDB;

namespace LifeOS.API;

/// <summary>
/// Initializes the ArangoDB database with required collections
/// </summary>
public class DatabaseInitializer : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DatabaseInitializer> _logger;

    public DatabaseInitializer(IServiceProvider serviceProvider, ILogger<DatabaseInitializer> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var arangoContext = scope.ServiceProvider.GetRequiredService<ArangoDbContext>();
        
        try
        {
            // Get collection API for the specific database
            var collectionApi = arangoContext.Client.Collection;
            
            // List of collections to create (vertex collections)
            var collections = new[]
            {
                ArangoDbContext.Collections.Vehicles,
                ArangoDbContext.Collections.Components,
                ArangoDbContext.Collections.InventorySkus,
                ArangoDbContext.Collections.InventoryAssets,
                ArangoDbContext.Collections.InventoryLots,
                ArangoDbContext.Collections.InventoryMovements,
                ArangoDbContext.Collections.InventoryLocations,
                ArangoDbContext.Collections.InventoryBins,
                ArangoDbContext.Collections.InventoryStockLevels,
                ArangoDbContext.Collections.Users,
                ArangoDbContext.Collections.PeopleEmployments,
                ArangoDbContext.Collections.MaintenanceRecords,
                ArangoDbContext.Collections.CropBatches,
                ArangoDbContext.Collections.GardenBeds,
                ArangoDbContext.Collections.Species,
                ArangoDbContext.Collections.MedicinalActions,
                ArangoDbContext.Collections.ActiveConstituents,
                ArangoDbContext.Collections.Tasks,
                ArangoDbContext.Collections.Skills,
                ArangoDbContext.Collections.Identities,
                ArangoDbContext.Collections.Habits,
                ArangoDbContext.Collections.Visions,
                ArangoDbContext.Collections.KRAs,
                ArangoDbContext.Collections.KPIs,
                ArangoDbContext.Collections.FinancialTransactions,
                ArangoDbContext.Collections.FinancialAccounts,
                ArangoDbContext.Collections.FinancialMerchants,
                ArangoDbContext.Collections.FinancialJournalEntries,
                ArangoDbContext.Collections.FinancialReceipts,
                ArangoDbContext.Collections.FinancialReconciliations,
                ArangoDbContext.Collections.FinancialBudgets,
                ArangoDbContext.Collections.FinancialCategories,
                ArangoDbContext.Collections.PayPeriodConfig
            };

            // Create vertex collections
            foreach (var collectionName in collections)
            {
                try
                {
                    await collectionApi.GetCollectionAsync(collectionName);
                    _logger.LogDebug("Collection '{CollectionName}' exists", collectionName);
                }
                catch (ArangoDBNetStandard.ApiErrorException)
                {
                    // Create collection
                    _logger.LogInformation("Creating collection '{CollectionName}'", collectionName);
                    await collectionApi.PostCollectionAsync(new PostCollectionBody
                    {
                        Name = collectionName,
                        Type = CollectionType.Document
                    });
                }
            }

            // List of edge collections to create
            var edgeCollections = new[]
            {
                ArangoDbContext.Collections.InstalledOn,
                ArangoDbContext.Collections.AssetInstallations,
                ArangoDbContext.Collections.PeopleRelationships,
                ArangoDbContext.Collections.Serviced,
                ArangoDbContext.Collections.WorkedOn,
                ArangoDbContext.Collections.Consumed,
                ArangoDbContext.Collections.Performed,
                ArangoDbContext.Collections.ContributesTo,
                ArangoDbContext.Collections.Measures,
                ArangoDbContext.Collections.OwnedBy,
                ArangoDbContext.Collections.HasMedicinalAction,
                ArangoDbContext.Collections.ContainsConstituent,
                ArangoDbContext.Collections.TreatsIndication
            };

            // Create edge collections
            foreach (var collectionName in edgeCollections)
            {
                try
                {
                    await collectionApi.GetCollectionAsync(collectionName);
                    _logger.LogDebug("Edge collection '{CollectionName}' exists", collectionName);
                }
                catch (ArangoDBNetStandard.ApiErrorException)
                {
                    // Create edge collection
                    _logger.LogInformation("Creating edge collection '{CollectionName}'", collectionName);
                    await collectionApi.PostCollectionAsync(new PostCollectionBody
                    {
                        Name = collectionName,
                        Type = CollectionType.Edge
                    });
                }
            }

            _logger.LogInformation("Database initialization completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize database");
            throw;
        }
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
