using System.Reflection;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Internal;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// A context that sees the code's migrations as they stood when a historical migration tool was written: up to and
/// including that tool's own migration, and not one newer.
/// </summary>
/// <remarks>
/// <para>
/// Each migration tool applies exactly its one migration and stops when any other is pending — which is right, and
/// which is what its tests record. A later task's migration makes "another one is pending" true forever after, so
/// those tests are run against the code and the database <i>as the tool found them</i>, rather than having their
/// assertions rewritten every time the schema moves on. The tool's own code is not touched.
/// </para>
/// <para>
/// Use it only after the database itself stands at that migration: a context that does not know the newer
/// migrations cannot take them out again.
/// </para>
/// </remarks>
internal static class MigrationsAsFound
{
    /// <summary>The code as Task 13a's product-match tool found it.</summary>
    public static BaxOrdersDbContext Task13a(string connectionString) =>
        new(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(connectionString)
            .AddInterceptors(new AuditingSaveChangesInterceptor(TimeProvider.System))
            .ReplaceService<IMigrationsAssembly, MigrationsUpToTask13a>()
            .Options);

    /// <summary>The code as Task 16a's import-pricing tool found it.</summary>
    public static BaxOrdersDbContext Task16a(string connectionString) =>
        new(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(connectionString)
            .AddInterceptors(new AuditingSaveChangesInterceptor(TimeProvider.System))
            .ReplaceService<IMigrationsAssembly, MigrationsUpToTask16a>()
            .Options);
}

#pragma warning disable EF1001 // EF Core's own migrations assembly, with nothing changed but how far its list reaches.

/// <summary>Every migration of the code up to <c>ProductMatchMigration.MigrationPlan.Target</c>, in order.</summary>
internal sealed class MigrationsUpToTask13a(
    ICurrentDbContext currentContext,
    IDbContextOptions options,
    IMigrationsIdGenerator idGenerator,
    IDiagnosticsLogger<DbLoggerCategory.Migrations> logger)
    : MigrationsAssembly(currentContext, options, idGenerator, logger)
{
    private IReadOnlyDictionary<string, TypeInfo>? _migrations;

    public override IReadOnlyDictionary<string, TypeInfo> Migrations =>
        _migrations ??= new SortedList<string, TypeInfo>(
            base.Migrations
                .Where(migration => string.CompareOrdinal(migration.Key, ProductMatchMigration.MigrationPlan.Target) <= 0)
                .ToDictionary(migration => migration.Key, migration => migration.Value),
            StringComparer.Ordinal);
}

/// <summary>Every migration of the code up to <c>ImportPricingMigration.MigrationPlan.Target</c>, in order.</summary>
internal sealed class MigrationsUpToTask16a(
    ICurrentDbContext currentContext,
    IDbContextOptions options,
    IMigrationsIdGenerator idGenerator,
    IDiagnosticsLogger<DbLoggerCategory.Migrations> logger)
    : MigrationsAssembly(currentContext, options, idGenerator, logger)
{
    private IReadOnlyDictionary<string, TypeInfo>? _migrations;

    public override IReadOnlyDictionary<string, TypeInfo> Migrations =>
        _migrations ??= new SortedList<string, TypeInfo>(
            base.Migrations
                .Where(migration => string.CompareOrdinal(migration.Key, ImportPricingMigration.MigrationPlan.Target) <= 0)
                .ToDictionary(migration => migration.Key, migration => migration.Value),
            StringComparer.Ordinal);
}

#pragma warning restore EF1001
