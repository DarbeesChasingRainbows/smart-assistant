using ArangoDBNetStandard;
using ArangoDBNetStandard.Transport.Http;

namespace LifeOS.Infrastructure.Persistence.ArangoDB;

/// <summary>
/// ArangoDB connection context - manages database connections
/// </summary>
public class ArangoDbContext : IAsyncDisposable
{
    private readonly ArangoDBClient _client;
    private readonly string _databaseName;

    public ArangoDbContext(ArangoDbSettings settings)
    {
        var transport = HttpApiTransport.UsingBasicAuth(
            new Uri(settings.Endpoint),
            settings.DatabaseName,
            settings.Username,
            settings.Password);

        _client = new ArangoDBClient(transport);
        _databaseName = settings.DatabaseName;
    }

    public ArangoDBClient Client => _client;
    public string DatabaseName => _databaseName;

    // Collection names following graph data modeling conventions
    public static class Collections
    {
        // Vertex collections (Nouns)
        public const string Vehicles = "vehicles";
        public const string Components = "components";
        public const string InventorySkus = "inventory_skus";
        public const string InventoryAssets = "inventory_assets";
        public const string InventoryLots = "inventory_lots";
        public const string InventoryMovements = "inventory_movements";
        public const string InventoryLocations = "inventory_locations";
        public const string InventoryBins = "inventory_bins";
        public const string InventoryStockLevels = "inventory_stock_levels";
        public const string Users = "users";
        public const string PeopleEmployments = "people_employments";
        public const string MaintenanceRecords = "maintenance_records";
        public const string CropBatches = "crop_batches";
        public const string GardenBeds = "garden_beds";
        public const string Species = "species";
        public const string MedicinalActions = "medicinal_actions";
        public const string ActiveConstituents = "active_constituents";
        public const string Tasks = "tasks";
        public const string Skills = "skills";
        public const string Identities = "identities";
        public const string Habits = "habits";
        public const string Visions = "visions";
        public const string KRAs = "kras";
        public const string KPIs = "kpis";
        public const string FinancialTransactions = "financial_transactions";
        public const string FinancialAccounts = "financial_accounts";
        public const string FinancialMerchants = "financial_merchants";
        public const string FinancialJournalEntries = "financial_journal_entries";
        public const string FinancialReceipts = "financial_receipts";
        public const string FinancialReconciliations = "financial_reconciliations";
        public const string FinancialBudgets = "financial_budgets";
        public const string FinancialCategories = "financial_categories";
        public const string PayPeriodConfig = "pay_period_config";

        // Edge collections (Verbs)
        public const string InstalledOn = "installed_on";
        public const string AssetInstallations = "asset_installations";
        public const string PeopleRelationships = "people_relationships";
        public const string Serviced = "serviced";
        public const string WorkedOn = "worked_on";
        public const string Consumed = "consumed";
        public const string Performed = "performed";
        public const string ContributesTo = "contributes_to";
        public const string Measures = "measures";
        public const string OwnedBy = "owned_by";
        public const string HasMedicinalAction = "has_medicinal_action";
        public const string ContainsConstituent = "contains_constituent";
        public const string TreatsIndication = "treats_indication";
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await Task.CompletedTask;
    }
}

/// <summary>
/// Configuration settings for ArangoDB connection
/// </summary>
public class ArangoDbSettings
{
    public string Endpoint { get; set; } = "http://localhost:8529";
    public string DatabaseName { get; set; } = "lifeos";
    public string Username { get; set; } = "root";
    public string Password { get; set; } = "";
}
