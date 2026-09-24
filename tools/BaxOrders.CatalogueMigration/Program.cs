using BaxOrders.Application;
using BaxOrders.Application.Abstractions;
using BaxOrders.Infrastructure;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.CatalogueMigration;

/// <summary>
/// Task 3: the owner's decisions about the object catalogue, applied to the data through one reviewable tool.
/// </summary>
/// <remarks>
/// <code>
///   dotnet run --project tools/BaxOrders.CatalogueMigration -- --inspect    read-only: who refers to what
///   dotnet run --project tools/BaxOrders.CatalogueMigration -- --dry-run    read-only: the plan and every STOP check
///   dotnet run --project tools/BaxOrders.CatalogueMigration -- --backup     pg_dump, and the figures that must not move
///   dotnet run --project tools/BaxOrders.CatalogueMigration -- --apply      the approved changes, in one transaction
///   dotnet run --project tools/BaxOrders.CatalogueMigration -- --verify     read-only: catalogue, aliases, counts, invariants
/// </code>
/// There is no way to hand it SQL. The database is reached through these five commands and nothing else, so what
/// the tool can do is exactly what can be read here.
/// </remarks>
internal static class Program
{
    public static async Task<int> Main(string[] args)
    {
        var command = ToolSettings.ParseCommand(args);
        if (command is null)
        {
            Console.Error.WriteLine("""
                Usage: dotnet run --project tools/BaxOrders.CatalogueMigration -- <command>

                  --inspect   List every reference to the affected objects, the aliases and the import mapping. Changes nothing.
                  --dry-run   Print the catalogue migration plan and check every STOP condition. Changes nothing.
                  --backup    pg_dump the database (custom format) and record the figures that must not change.
                  --apply     Apply the approved Task 3 catalogue changes. Needs a backup taken today.
                  --verify    Check the catalogue, the aliases, the counts, the import mapping and the invariants. Changes nothing.
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
        Console.WriteLine($"BAX Sifarişlər — catalogue migration {CatalogueDecisions.Version}, --{Describe(command.Value)}");
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
    /// The application's own services, so every figure the tool records is the figure a screen shows — not a
    /// second calculation that could agree with itself and disagree with the app.
    /// </summary>
    private static ServiceProvider Build(ToolSettings settings)
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

    /// <summary>Walks up from the working directory to the folder holding the solution.</summary>
    public static string RepositoryRoot()
    {
        for (var directory = new DirectoryInfo(Directory.GetCurrentDirectory()); directory is not null; directory = directory.Parent)
        {
            if (File.Exists(Path.Combine(directory.FullName, "BaxOrders.slnx")))
            {
                return directory.FullName;
            }
        }

        throw new InvalidOperationException("Run the tool from inside the repository: BaxOrders.slnx was not found above the working directory.");
    }

    public static BaxOrdersDbContext Db(IServiceProvider provider) => provider.GetRequiredService<BaxOrdersDbContext>();
}

/// <summary>
/// The tool reads what any screen reads and signs nothing. A service that needs an actor to write is never
/// called; one that only asks "may this user edit" is told nobody is signed in, which is true.
/// </summary>
internal sealed class NobodySignedIn : ICurrentUserContext
{
    public bool IsAuthenticated => false;

    public Guid? UserId => null;

    public string? UserName => null;

    public string? DisplayName => null;

    public string? Role => null;
}
