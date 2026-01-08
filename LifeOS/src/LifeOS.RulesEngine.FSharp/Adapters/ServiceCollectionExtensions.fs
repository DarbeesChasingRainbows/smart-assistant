namespace LifeOS.RulesEngine.Adapters

open System
open System.Runtime.CompilerServices
open Microsoft.Extensions.DependencyInjection
open LifeOS.RulesEngine.Contracts

/// Extension methods for registering RulesEngine services in C# DI container
/// This provides a clean C# consumption experience:
/// services.AddLifeOSRulesEngine();
[<Extension>]
type ServiceCollectionExtensions =
    
    /// <summary>
    /// Registers all LifeOS Rules Engine services.
    /// Usage in C#: services.AddLifeOSRulesEngine();
    /// </summary>
    [<Extension>]
    static member AddLifeOSRulesEngine(services: IServiceCollection) : IServiceCollection =
        services
            .AddSingleton<IAllowanceRulesEngine, AllowanceRulesEngine>()
            .AddSingleton<IMaintenanceRulesEngine, MaintenanceRulesEngine>()
    
    /// <summary>
    /// Registers only the Allowance Rules Engine.
    /// </summary>
    [<Extension>]
    static member AddAllowanceRulesEngine(services: IServiceCollection) : IServiceCollection =
        services.AddSingleton<IAllowanceRulesEngine, AllowanceRulesEngine>()
    
    /// <summary>
    /// Registers only the Maintenance Rules Engine.
    /// </summary>
    [<Extension>]
    static member AddMaintenanceRulesEngine(services: IServiceCollection) : IServiceCollection =
        services.AddSingleton<IMaintenanceRulesEngine, MaintenanceRulesEngine>()
