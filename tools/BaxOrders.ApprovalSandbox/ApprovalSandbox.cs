using BaxOrders.Application;
using BaxOrders.Application.Abstractions;
using BaxOrders.Infrastructure;
using BaxOrders.Infrastructure.Identity;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace BaxOrders.ApprovalSandbox;

/// <summary>Which sandbox to act on, and the database it may never be.</summary>
/// <param name="ServerConnectionString">Any connection string to the server; its database is replaced.</param>
/// <param name="DatabaseName"><see cref="SandboxDatabaseName.Default"/> for the tool; <c>baxorders_sandbox_t_…</c> in tests.</param>
/// <param name="RealDatabaseName">The database the API's own <c>ConnectionStrings:BaxOrders</c> names.</param>
public sealed record SandboxTarget(string? ServerConnectionString, string? DatabaseName, string? RealDatabaseName);

/// <summary>
/// Creating, resetting and dropping the sandbox — the logic behind the tool's three commands, which the
/// integration tests call directly.
/// </summary>
/// <remarks>
/// Every method runs its guards first and opens a connection only once they have passed. Two connections are
/// ever opened: to the server's maintenance database, for <c>CREATE DATABASE</c> and <c>DROP DATABASE</c>
/// of the sandbox name, and to the sandbox itself.
/// </remarks>
public static class SandboxLifecycle
{
    /// <summary>Creates the sandbox, builds it from the application's migrations and seeds it.</summary>
    /// <exception cref="SandboxRefusedException">
    /// A guard refused, the database already exists, or seeding refused. Nothing that existed was changed; a
    /// sandbox this call created and could not finish is dropped again.
    /// </exception>
    public static async Task<SandboxContents> CreateAsync(
        SandboxTarget target, string? accountPassword, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(target);

        var server = Server(target);
        _ = SandboxPassword.Require(accountPassword);

        try
        {
            await OnMaintenanceDatabaseAsync(server, server.CreateStatement, cancellationToken);
        }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.DuplicateDatabase)
        {
            throw new SandboxRefusedException(
                $"'{server.DatabaseName}' already exists, and --create does not touch an existing database. "
                + "Use --reset to drop it and start again.");
        }

        try
        {
            await using var services = Services(server.SandboxConnectionString);
            await using var scope = services.CreateAsyncScope();

            await scope.ServiceProvider.GetRequiredService<BaxOrdersDbContext>().Database.MigrateAsync(cancellationToken);
            return await SandboxSeed.SeedAsync(scope.ServiceProvider, server.DatabaseName, accountPassword, cancellationToken);
        }
        catch
        {
            // It was made a moment ago by this call, so it is nobody's data: a half-built sandbox is removed
            // rather than left for somebody to mistake for a finished one.
            try
            {
                await DropAsync(server, CancellationToken.None);
            }
            catch (NpgsqlException)
            {
                // What went wrong first is the thing to report; --drop can remove the remains.
            }

            throw;
        }
    }

    /// <summary>Drops the sandbox and creates it again: the test order waiting, the draft unsent, as new.</summary>
    /// <remarks>Every guard, the password included, is checked before anything is dropped.</remarks>
    public static async Task<SandboxContents> ResetAsync(
        SandboxTarget target, string? accountPassword, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(target);

        var server = Server(target);
        _ = SandboxPassword.Require(accountPassword);

        await DropAsync(server, cancellationToken);
        return await CreateAsync(target, accountPassword, cancellationToken);
    }

    /// <summary>Drops the sandbox. Dropping one that does not exist is not an error.</summary>
    public static Task DropAsync(SandboxTarget target, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(target);
        return DropAsync(Server(target), cancellationToken);
    }

    /// <summary>Guards 1–3, from the text alone.</summary>
    internal static SandboxServer Server(SandboxTarget target) =>
        SandboxServer.For(target.ServerConnectionString, target.DatabaseName, target.RealDatabaseName);

    /// <summary>
    /// The application's own services against the sandbox: the same infrastructure, the same application
    /// services and the same accounts and password rules as the API, with the seed standing where the
    /// signed-in session stands.
    /// </summary>
    internal static ServiceProvider Services(string sandboxConnectionString)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [$"ConnectionStrings:{Infrastructure.DependencyInjection.ConnectionStringName}"] = sandboxConnectionString,
            })
            .Build();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddInfrastructure(configuration);
        services.AddApplication();
        services.AddBaxOrdersIdentity();
        services.AddScoped<IUserDirectory, IdentityUserDirectory>();
        services.AddScoped<IdentityInitializer>();
        services.AddScoped<SeedActor>();
        services.AddScoped<ICurrentUserContext>(provider => provider.GetRequiredService<SeedActor>());
        return services.BuildServiceProvider(validateScopes: true);
    }

    private static async Task DropAsync(SandboxServer server, CancellationToken cancellationToken)
    {
        // Idle pooled connections to the sandbox would otherwise be broken by the forced drop and handed out
        // again later; only this sandbox's pool is cleared.
        await using (var pooled = new NpgsqlConnection(server.SandboxConnectionString))
        {
            NpgsqlConnection.ClearPool(pooled);
        }

        await OnMaintenanceDatabaseAsync(server, server.DropStatement, cancellationToken);
    }

    /// <summary>The one use of the maintenance database: a statement <see cref="SandboxServer"/> built for the sandbox name.</summary>
    private static async Task OnMaintenanceDatabaseAsync(SandboxServer server, string statement, CancellationToken cancellationToken)
    {
        await using var connection = new NpgsqlConnection(server.MaintenanceConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(statement, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
