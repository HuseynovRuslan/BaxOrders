using BaxOrders.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Creates a throw-away SQL Server database from the migrations and drops it afterwards.
/// Opt-in: set <see cref="ConnectionStringVariable"/>; the database name must end with "_Test".
/// </summary>
public sealed class SqlServerDatabaseFixture : IAsyncLifetime
{
    public const string ConnectionStringVariable = "BAXORDERS_TEST_SQLSERVER";

    public static string? ConnectionString => Environment.GetEnvironmentVariable(ConnectionStringVariable);

    public async Task InitializeAsync()
    {
        if (string.IsNullOrWhiteSpace(ConnectionString))
        {
            return;
        }

        // The fixture drops the database, so refuse anything that is not clearly a test database.
        var databaseName = new SqlConnectionStringBuilder(ConnectionString).InitialCatalog;
        if (!databaseName.EndsWith("_Test", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"{ConnectionStringVariable} must point at a database whose name ends with '_Test' (got '{databaseName}').");
        }

        await using var db = CreateContext();
        await db.Database.EnsureDeletedAsync();
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        if (string.IsNullOrWhiteSpace(ConnectionString))
        {
            return;
        }

        await using var db = CreateContext();
        await db.Database.EnsureDeletedAsync();
    }

    public BaxOrdersDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseSqlServer(ConnectionString)
            .AddInterceptors(new AuditingSaveChangesInterceptor(TimeProvider.System))
            .Options);
}
