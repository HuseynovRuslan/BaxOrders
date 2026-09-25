using Microsoft.Extensions.Configuration;
using Npgsql;

namespace BaxOrders.ImportPricingMigration;

/// <summary>The five things the tool can be asked to do. There is no sixth, and none of them takes SQL.</summary>
public enum ToolCommand
{
    Inspect,
    DryRun,
    Backup,
    Apply,
    Verify,
}

/// <param name="ConnectionString">The development database, read from the API's own user-secrets.</param>
/// <param name="BackupDirectory">Where <c>--backup</c> writes and where <c>--apply</c> looks for today's backup.</param>
public sealed record ToolSettings(string ConnectionString, string BackupDirectory)
{
    /// <summary>BaxOrders.Api's secret store, where the development connection string lives.</summary>
    private const string ApiUserSecretsId = "9009c03b-5170-410c-aa43-9cd30c88c6ae";

    /// <summary>Overrides the backup folder, for a machine that keeps its backups somewhere else.</summary>
    public const string BackupDirectoryVariable = "BAXORDERS_BACKUP_DIR";

    /// <summary>What every file this tool writes is named after, so Task 3's and 13a's files are never mistaken for these.</summary>
    public const string TaskTag = "task16a";

    public static ToolCommand? ParseCommand(string[] args)
    {
        ArgumentNullException.ThrowIfNull(args);

        return args switch
        {
            ["--inspect"] => ToolCommand.Inspect,
            ["--dry-run"] => ToolCommand.DryRun,
            ["--backup"] => ToolCommand.Backup,
            ["--apply"] => ToolCommand.Apply,
            ["--verify"] => ToolCommand.Verify,
            _ => null,
        };
    }

    /// <returns>Null when no connection string can be found.</returns>
    public static ToolSettings? Load()
    {
        // The same place tools/BaxOrders.ProductMatchMigration reads it from: the API's own user-secrets, which
        // scripts/dev-postgres.ps1 fills in, then the environment. It is never taken from the command line, so it
        // never lands in a shell history or a log.
        var connectionString = new ConfigurationBuilder()
            .AddUserSecrets(ApiUserSecretsId, reloadOnChange: false)
            .AddEnvironmentVariables()
            .Build()
            .GetConnectionString("BaxOrders");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return null;
        }

        var backupDirectory = Environment.GetEnvironmentVariable(BackupDirectoryVariable);
        if (string.IsNullOrWhiteSpace(backupDirectory))
        {
            backupDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "BaxOrders-backups");
        }

        return new ToolSettings(connectionString, backupDirectory);
    }

    /// <summary>Where the tool is pointed, without the password, so a report can name it.</summary>
    public string DescribeDatabase()
    {
        var builder = new NpgsqlConnectionStringBuilder(ConnectionString);
        return $"{builder.Database} @ {builder.Host}:{builder.Port} (user {builder.Username})";
    }

    public string DatabaseName => new NpgsqlConnectionStringBuilder(ConnectionString).Database ?? "database";
}
