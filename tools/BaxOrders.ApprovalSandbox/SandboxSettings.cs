using BaxOrders.Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;

namespace BaxOrders.ApprovalSandbox;

/// <summary>
/// Where the command-line tool finds the server, the API's own database and the test accounts' password.
/// </summary>
/// <param name="ServerConnectionString">Any connection string to the server; <see cref="SandboxServer"/> replaces its database.</param>
/// <param name="RealDatabaseName">The database the API's <c>ConnectionStrings:BaxOrders</c> names, which the sandbox may never be.</param>
/// <param name="AccountPassword">From <see cref="SandboxPassword.Variable"/>; null when it is not set.</param>
public sealed record SandboxSettings(string? ServerConnectionString, string? RealDatabaseName, string? AccountPassword)
{
    /// <summary>A connection string to the server the sandbox should live on. Any database; it is replaced.</summary>
    public const string ServerVariable = "BAXORDERS_SANDBOX_SERVER";

    /// <summary>BaxOrders.Api's secret store, where scripts/dev-postgres.ps1 puts the development connection string.</summary>
    private const string ApiUserSecretsId = "9009c03b-5170-410c-aa43-9cd30c88c6ae";

    /// <summary>
    /// Reads the environment and the API's user-secrets. Nothing comes from the command line, so no password
    /// lands in a shell history, and nothing here opens a connection.
    /// </summary>
    public static SandboxSettings Load()
    {
        var apiConnectionString = new ConfigurationBuilder()
            .AddUserSecrets(ApiUserSecretsId, reloadOnChange: false)
            .AddEnvironmentVariables()
            .Build()
            .GetConnectionString(Infrastructure.DependencyInjection.ConnectionStringName);

        return Resolve(
            Environment.GetEnvironmentVariable(ServerVariable),
            apiConnectionString,
            Environment.GetEnvironmentVariable(SandboxPassword.Variable));
    }

    /// <summary>
    /// The server is <see cref="ServerVariable"/> when it is set, and otherwise the server of the API's
    /// development connection string — whose database <see cref="SandboxServer"/> then replaces.
    /// </summary>
    public static SandboxSettings Resolve(string? serverVariable, string? apiConnectionString, string? password) =>
        new(
            string.IsNullOrWhiteSpace(serverVariable) ? apiConnectionString : serverVariable,
            SandboxDatabase.DatabaseNameOf(apiConnectionString),
            password);
}
