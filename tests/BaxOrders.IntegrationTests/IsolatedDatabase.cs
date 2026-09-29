using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// A database of one test's own, built from the migrations and dropped afterwards.
/// </summary>
/// <remarks>
/// For the few tests the shared database cannot serve: one that has to count every object in the database and
/// get an exact number, and one that deletes the seeded objects other tests rely on. It lives on the same test
/// server as the shared database and is created through a connection to it.
/// </remarks>
internal sealed class IsolatedDatabase : IAsyncDisposable
{
    private IsolatedDatabase(string name)
    {
        Name = name;
        ConnectionString = new NpgsqlConnectionStringBuilder(PostgresDatabaseFixture.ConnectionString) { Database = name }.ConnectionString;
    }

    public string Name { get; }

    public string ConnectionString { get; }

    /// <summary>
    /// The maintenance database, for the two statements that cannot run inside the database they are about.
    /// </summary>
    /// <remarks>
    /// Never the shared run database: that one is created by <see cref="PostgresDatabaseFixture"/>, so a class
    /// with a database of its own would depend on some unrelated class in the collection having run first — and
    /// on its own it would fail with "database does not exist", which is what it used to do.
    /// </remarks>
    private static string ServerConnectionString =>
        new NpgsqlConnectionStringBuilder(PostgresDatabaseFixture.ConnectionString) { Database = "postgres" }.ConnectionString;

    public static async Task<IsolatedDatabase> CreateAsync(string prefix)
    {
        var database = new IsolatedDatabase($"{prefix}_{Guid.NewGuid():N}"[..40]);

        await using (var server = new NpgsqlConnection(ServerConnectionString))
        {
            await server.OpenAsync();
            await using var create = new NpgsqlCommand(
                $"""CREATE DATABASE "{database.Name}" ENCODING 'UTF8' TEMPLATE template0""", server);
            await create.ExecuteNonQueryAsync();
        }

        await using var db = database.CreateContext();
        await db.Database.MigrateAsync();
        return database;
    }

    public BaxOrdersDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(ConnectionString)
            .AddInterceptors(new AuditingSaveChangesInterceptor(TimeProvider.System))
            .Options);

    public async ValueTask DisposeAsync()
    {
        // Pooled connections would keep the database busy and the drop would fail.
        NpgsqlConnection.ClearAllPools();

        await using var server = new NpgsqlConnection(ServerConnectionString);
        await server.OpenAsync();
        await using var drop = new NpgsqlCommand($"""DROP DATABASE IF EXISTS "{Name}" WITH (FORCE)""", server);
        await drop.ExecuteNonQueryAsync();
    }
}
