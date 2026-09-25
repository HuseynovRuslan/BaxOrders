using BaxOrders.Application;
using BaxOrders.Application.Abstractions;
using BaxOrders.Infrastructure;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.ProductMatchMigration;

/// <summary>
/// Task 13a: the one new, empty table that records product-match decisions, put into the database through one
/// reviewable tool.
/// </summary>
/// <remarks>
/// <code>
///   dotnet run --project tools/BaxOrders.ProductMatchMigration -- --inspect    read-only: migrations, catalogue, suggestions
///   dotnet run --project tools/BaxOrders.ProductMatchMigration -- --dry-run    read-only: the one pending migration, its SQL, every STOP check
///   dotnet run --project tools/BaxOrders.ProductMatchMigration -- --backup     pg_dump, and the figures that must not move
///   dotnet run --project tools/BaxOrders.ProductMatchMigration -- --apply      that one migration, in one transaction
///   dotnet run --project tools/BaxOrders.ProductMatchMigration -- --verify     read-only: nothing pending, the table empty, every figure unchanged
/// </code>
/// There is no way to hand it SQL, and nothing in it writes a decision, an alias, a product, a variant or a line. The
/// only change it can make is the migration <see cref="MigrationPlan.Target"/>.
/// </remarks>
internal static class Program
{
    public static async Task<int> Main(string[] args)
    {
        var command = ToolSettings.ParseCommand(args);
        if (command is null)
        {
            Console.Error.WriteLine("""
                Usage: dotnet run --project tools/BaxOrders.ProductMatchMigration -- <command>

                  --inspect   Migrations, the catalogue and every current product-match suggestion. Changes nothing.
                  --dry-run   The pending migration, the SQL it runs and every STOP condition. Changes nothing.
                  --backup    pg_dump the database (custom format) and record the figures that must not change.
                  --apply     Apply the Task 13a migration. Needs a backup taken today.
                  --verify    Nothing pending, ProductMatchDecisions empty, every recorded figure unchanged. Changes nothing.
                """);
            return 2;
        }

        var settings = ToolSettings.Load();
        if (settings is null)
        {
            Console.Error.WriteLine(
                "No connection string: ConnectionStrings:BaxOrders is not in the API's user-secrets or the environment. "
                + "Run scripts/dev-postgres.ps1 first.");
            return 2;
        }

        Console.OutputEncoding = System.Text.Encoding.UTF8;
        Console.WriteLine($"BAX Sifarişlər — product-match migration ({ToolSettings.TaskTag}), --{Describe(command.Value)}");
        Console.WriteLine($"Database: {settings.DescribeDatabase()}");
        Console.WriteLine();

        await using var services = Build(settings);
        await using var scope = services.CreateAsyncScope();
        var provider = scope.ServiceProvider;
        var cancellationToken = CancellationToken.None;

        return command switch
        {
            ToolCommand.Inspect => await Inspection.RunAsync(provider, cancellationToken),
            ToolCommand.DryRun => await DryRun.RunAsync(provider, cancellationToken),
            ToolCommand.Backup => await Backup.RunAsync(provider, settings, cancellationToken),
            ToolCommand.Apply => await Apply.RunAsync(provider, settings, cancellationToken),
            ToolCommand.Verify => await Verification.RunAsync(provider, settings, cancellationToken),
            _ => 2,
        };
    }

    /// <summary>
    /// The application's own services, so every figure the tool records is the figure a screen shows — not a second
    /// calculation that could agree with itself and disagree with the app.
    /// </summary>
    internal static ServiceProvider Build(ToolSettings settings)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [$"ConnectionStrings:{Infrastructure.DependencyInjection.ConnectionStringName}"] = settings.ConnectionString,
            })
            .Build();

        var services = new ServiceCollection();
        services.AddInfrastructure(configuration);
        services.AddApplication();
        services.AddScoped<ICurrentUserContext, NobodySignedIn>();
        return services.BuildServiceProvider(validateScopes: true);
    }

    private static string Describe(ToolCommand command) => command switch
    {
        ToolCommand.DryRun => "dry-run",
        _ => command.ToString().ToLowerInvariant(),
    };

    public static BaxOrdersDbContext Db(IServiceProvider provider) => provider.GetRequiredService<BaxOrdersDbContext>();
}

/// <summary>
/// The tool reads what any screen reads and signs nothing. A service that needs an actor to write — deciding a
/// product match is one — is refused, because nobody is signed in, which is true.
/// </summary>
internal sealed class NobodySignedIn : ICurrentUserContext
{
    public bool IsAuthenticated => false;

    public Guid? UserId => null;

    public string? UserName => null;

    public string? DisplayName => null;

    public string? Role => null;
}

internal static class Report
{
    public static void Heading(string text) => Console.WriteLine($"== {text} ==");

    public static string Month(DateOnly period) =>
        period.ToString("yyyy-MM", System.Globalization.CultureInfo.InvariantCulture);
}
