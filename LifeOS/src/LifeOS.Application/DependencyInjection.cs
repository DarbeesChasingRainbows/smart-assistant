using Microsoft.Extensions.DependencyInjection;
using LifeOS.Application.Common;
using LifeOS.Application.Finance;

namespace LifeOS.Application;

/// <summary>
/// Extension methods for registering Application services
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Register application services
        services.AddScoped<IFinanceApplicationService, FinanceApplicationService>();

        // Register event publisher
        services.AddScoped<SimpleEventPublisher>();

        return services;
    }
}
