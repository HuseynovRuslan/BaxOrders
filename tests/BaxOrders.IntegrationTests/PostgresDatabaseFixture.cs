using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Creates a throw-away PostgreSQL database from the migrations and drops it afterwards.
/// </summary>
/// <remarks>
/// Opt-in: the tests need a real PostgreSQL, because what they check is how the real one behaves — row locks,
/// unique indexes, check constraints and concurrency are exactly the things a fake would get wrong. Point
/// <see cref="AdminConnectionStringKey"/> at a server (user-secrets or the environment) and the fixture makes
/// its own database on it; <c>scripts/dev-postgres.ps1</c> sets that up in one command.
/// <para>
/// The database is named for this run and dropped at the end, so a test never inherits another run's rows and
/// nothing outside the run is ever touched.
/// </para>
/// </remarks>
public sealed class PostgresDatabaseFixture : IAsyncLifetime
{
    /// <summary>Where the server is. It names a maintenance database, never the one the tests use.</summary>
    public const string AdminConnectionStringKey = "TestDatabase:AdminConnectionString";

    public const string AdminConnectionStringVariable = "BAXORDERS_TEST_POSTGRES";

    private static readonly string? Admin = ReadAdminConnectionString();

    /// <summary>One database per run, so two runs on one server cannot tread on each other.</summary>
    private static readonly string DatabaseName = $"baxorders_test_{Guid.NewGuid():N}"[..30];

    public static bool IsConfigured => !string.IsNullOrWhiteSpace(Admin);

    /// <summary>The connection the tests use, or null when no server is configured.</summary>
    public static string? ConnectionString => IsConfigured
        ? new NpgsqlConnectionStringBuilder(Admin) { Database = DatabaseName }.ConnectionString
        : null;

    public async Task InitializeAsync()
    {
        if (!IsConfigured)
        {
            return;
        }

        await DropAsync();
        await using (var server = new NpgsqlConnection(Admin))
        {
            await server.OpenAsync();
            await using var create = new NpgsqlCommand(
                $"""CREATE DATABASE "{DatabaseName}" ENCODING 'UTF8' TEMPLATE template0""", server);
            await create.ExecuteNonQueryAsync();
        }

        await using var db = CreateContext();
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        if (IsConfigured)
        {
            await DropAsync();
        }
    }

    public BaxOrdersDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(ConnectionString)
            .AddInterceptors(new AuditingSaveChangesInterceptor(TimeProvider.System))
            .Options);

    private static async Task DropAsync()
    {
        // Pooled connections would keep the database busy and the drop would fail.
        NpgsqlConnection.ClearAllPools();

        await using var server = new NpgsqlConnection(Admin);
        await server.OpenAsync();
        await using var drop = new NpgsqlCommand($"""DROP DATABASE IF EXISTS "{DatabaseName}" WITH (FORCE)""", server);
        await drop.ExecuteNonQueryAsync();
    }

    /// <summary>
    /// User-secrets first, because that is where <c>scripts/dev-postgres.ps1</c> puts it; an environment
    /// variable still works for a build server that has no secret store.
    /// </summary>
    private static string? ReadAdminConnectionString()
    {
        var fromEnvironment = Environment.GetEnvironmentVariable(AdminConnectionStringVariable);
        if (!string.IsNullOrWhiteSpace(fromEnvironment))
        {
            return fromEnvironment;
        }

        return new ConfigurationBuilder()
            .AddUserSecrets<PostgresDatabaseFixture>(optional: true)
            .AddEnvironmentVariables()
            .Build()[AdminConnectionStringKey];
    }
}

/// <summary>
/// All database tests share one throw-away database and run serially: they create and drop schema-wide
/// things, which must not happen concurrently from several test classes.
/// </summary>
[CollectionDefinition(Name)]
public sealed class PostgresCollection : ICollectionFixture<PostgresDatabaseFixture>
{
    public const string Name = "Postgres";
}

/// <summary>
/// A fact that runs only when a test PostgreSQL is configured, so a default clone of the repository still has
/// a test suite that passes.
/// </summary>
public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        if (!PostgresDatabaseFixture.IsConfigured)
        {
            Skip = "Run scripts/dev-postgres.ps1, or set "
                   + $"{PostgresDatabaseFixture.AdminConnectionStringVariable} to a PostgreSQL server.";
        }
    }
}

/// <summary>The same rule for a test that runs once per case, such as one per comparison basis.</summary>
public sealed class PostgresTheoryAttribute : TheoryAttribute
{
    public PostgresTheoryAttribute()
    {
        if (!PostgresDatabaseFixture.IsConfigured)
        {
            Skip = "Run scripts/dev-postgres.ps1, or set "
                   + $"{PostgresDatabaseFixture.AdminConnectionStringVariable} to a PostgreSQL server.";
        }
    }
}
