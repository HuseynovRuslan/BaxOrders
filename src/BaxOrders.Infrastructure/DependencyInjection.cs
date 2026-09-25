using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports.Reading;
using BaxOrders.Infrastructure.Imports;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace BaxOrders.Infrastructure;

public static class DependencyInjection
{
    public const string ConnectionStringName = "BaxOrders";

    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString(ConnectionStringName);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"Connection string '{ConnectionStringName}' is not configured. " +
                $"Provide it via the ConnectionStrings__{ConnectionStringName} environment variable, user secrets, " +
                "or by running scripts/dev-postgres.ps1, which stores it in user-secrets.");
        }

        services.TryAddSingleton(TimeProvider.System);
        services.AddSingleton<AuditingSaveChangesInterceptor>();

        services.AddDbContext<BaxOrdersDbContext>((serviceProvider, options) =>
            options
                .UseNpgsql(connectionString)
                .AddInterceptors(serviceProvider.GetRequiredService<AuditingSaveChangesInterceptor>()));

        services.AddScoped<IBaxOrdersDbContext>(serviceProvider => serviceProvider.GetRequiredService<BaxOrdersDbContext>());
        services.AddScoped<IProductCodeGenerator, PostgresProductCodeGenerator>();
        services.AddScoped<ILocationCodeGenerator, PostgresLocationCodeGenerator>();
        services.AddScoped<IImportBatchLock, PostgresImportBatchLock>();
        services.AddScoped<IOrderRequestLock, PostgresOrderRequestLock>();
        services.AddScoped<IProductMatchLock, PostgresProductMatchLock>();
        services.AddSingleton<IExcelWorkbookReader, ExcelDataReaderWorkbookReader>();

        return services;
    }
}
