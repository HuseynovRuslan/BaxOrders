using Microsoft.Extensions.Configuration;

namespace BaxOrders.DataTransfer;

/// <param name="Source">The SQL Server database being left behind.</param>
/// <param name="Target">The PostgreSQL database being moved to.</param>
/// <param name="VerifyOnly">Count both sides and compare, writing nothing.</param>
/// <param name="Reset">
/// Empty the target's tables first. The migration seeds reference data, and the source holds those same rows
/// with those same ids, so the copy has to start from nothing to end up an exact likeness.
/// </param>
public sealed record TransferOptions(string Source, string Target, bool VerifyOnly, bool Reset)
{
    private const string DefaultSource =
        "Server=(localdb)\\MSSQLLocalDB;Database=BaxOrders_Dev;Trusted_Connection=True;TrustServerCertificate=True";

    /// <summary>BaxOrders.Api's secret store, where the development connection string lives.</summary>
    private const string ApiUserSecretsId = "9009c03b-5170-410c-aa43-9cd30c88c6ae";

    /// <returns>Null when the arguments cannot be read, so the caller can print the usage.</returns>
    public static TransferOptions? Parse(string[] args)
    {
        ArgumentNullException.ThrowIfNull(args);

        var source = DefaultSource;
        string? target = null;
        var verifyOnly = false;
        var reset = false;

        for (var index = 0; index < args.Length; index++)
        {
            switch (args[index])
            {
                case "--source" when index + 1 < args.Length:
                    source = args[++index];
                    break;
                case "--target" when index + 1 < args.Length:
                    target = args[++index];
                    break;
                case "--verify-only":
                    verifyOnly = true;
                    break;
                case "--reset":
                    reset = true;
                    break;
                default:
                    return null;
            }
        }

        // The target is normally the development database this repository already knows about: the API's own
        // user-secrets, which scripts/dev-postgres.ps1 fills in.
        target ??= new ConfigurationBuilder()
            .AddUserSecrets(ApiUserSecretsId, reloadOnChange: false)
            .AddEnvironmentVariables()
            .Build()
            .GetConnectionString("BaxOrders");

        return string.IsNullOrWhiteSpace(target) ? null : new TransferOptions(source, target, verifyOnly, reset);
    }
}
