using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using FinanceRepo = LifeOS.Infrastructure.Finance;
using GarageRepo = LifeOS.Infrastructure.Garage;
using GardenRepo = LifeOS.Infrastructure.Garden;
using HomeRepo = LifeOS.Infrastructure.Home;
using InventoryRepo = LifeOS.Infrastructure.Inventory;
using SharedKernelRepo = LifeOS.Infrastructure.SharedKernel;

namespace LifeOS.Infrastructure;

/// <summary>
/// Extension methods for registering Infrastructure services
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        // Configure ArangoDB settings
        var arangoSettings = new ArangoDbSettings();
        configuration.GetSection("ArangoDB").Bind(arangoSettings);
        services.AddSingleton(arangoSettings);
        services.AddSingleton<ArangoDbContext>();

        // Register repositories
        services.AddScoped<LifeOS.Domain.Garage.IVehicleRepository, GarageRepo.VehicleRepository>();
        services.AddScoped<
            LifeOS.Domain.Garage.IVehicleMaintenanceRepository,
            GarageRepo.VehicleMaintenanceRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Garage.IComponentRepository,
            GarageRepo.ComponentRepository
        >();

        services.AddScoped<LifeOS.Domain.Garden.ISpeciesRepository, GardenRepo.SpeciesRepository>();
        services.AddScoped<
            LifeOS.Domain.Garden.ISpeciesMonographRepository,
            GardenRepo.ArangoSpeciesMonographRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Garden.ICropBatchRepository,
            GardenRepo.CropBatchRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Garden.IGardenBedRepository,
            GardenRepo.GardenBedRepository
        >();

        // Inventory repositories
        services.AddScoped<LifeOS.Domain.Inventory.IItemRepository, InventoryRepo.ItemRepository>();
        services.AddScoped<
            LifeOS.Domain.Inventory.IAssetRepository,
            InventoryRepo.AssetRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Inventory.ILocationRepository,
            InventoryRepo.LocationRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Inventory.IStockRepository,
            InventoryRepo.StockRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Inventory.IMovementRepository,
            InventoryRepo.MovementRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Inventory.IInventoryService,
            InventoryRepo.InventoryService
        >();
        services.AddScoped<
            LifeOS.Domain.Inventory.ILocationService,
            InventoryRepo.LocationService
        >();
        services.AddScoped<
            LifeOS.Domain.Inventory.IInventoryReporting,
            InventoryRepo.InventoryReporting
        >();

        services.AddScoped<
            LifeOS.Domain.Finance.IAccountRepository,
            FinanceRepo.FinanceAccountRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Finance.ITransactionRepository,
            FinanceRepo.FinanceTransactionRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Finance.ICategoryRepository,
            FinanceRepo.FinanceCategoryRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Finance.IBudgetRepository,
            FinanceRepo.FinanceBudgetRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Finance.IReconciliationRepository,
            FinanceRepo.FinanceReconciliationRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Finance.IMerchantRepository,
            FinanceRepo.FinanceMerchantRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Finance.IJournalEntryRepository,
            FinanceRepo.FinanceJournalEntryRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Finance.IReceiptRepository,
            FinanceRepo.FinanceReceiptRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Finance.IPayPeriodConfigRepository,
            FinanceRepo.FinancePayPeriodConfigRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Finance.IFinanceUnitOfWork,
            FinanceRepo.FinanceUnitOfWork
        >();

        services.AddScoped<
            LifeOS.Domain.SharedKernel.IUserRepository,
            SharedKernelRepo.UserRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Home.IHouseholdRepository,
            HomeRepo.InMemoryHouseholdRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Home.IHouseholdMemberRepository,
            HomeRepo.InMemoryHouseholdMemberRepository
        >();
        services.AddScoped<LifeOS.Domain.Home.IChoreRepository, HomeRepo.InMemoryChoreRepository>();
        services.AddScoped<
            LifeOS.Domain.Home.IChoreAssignmentRepository,
            HomeRepo.InMemoryChoreAssignmentRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Home.IChoreCompletionRepository,
            HomeRepo.InMemoryChoreCompletionRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Home.ICalendarRepository,
            HomeRepo.InMemoryCalendarRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Home.ICalendarEventRepository,
            HomeRepo.InMemoryCalendarEventRepository
        >();
        services.AddScoped<
            LifeOS.Domain.Home.IReminderRepository,
            HomeRepo.InMemoryReminderRepository
        >();

        // Configure MinIO settings for receipt storage
        var minioSettings = new MinioSettings();
        configuration.GetSection("MinIO").Bind(minioSettings);
        services.AddSingleton(minioSettings);
        services.AddSingleton<MinioStorageService>();

        return services;
    }
}
