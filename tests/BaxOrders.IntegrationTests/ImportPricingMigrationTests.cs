using BaxOrders.ImportPricingMigration;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using static BaxOrders.IntegrationTests.ImportWorkbooks;
using ToolProgram = BaxOrders.ImportPricingMigration.Program;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The Task 16a migration tool against a real PostgreSQL: the four columns go in once and only once, empty on every
/// staged row; <c>Down</c> takes them out again; a STOP condition changes nothing; and every figure <c>--verify</c>
/// compares is the same before the migration, on the old schema, and after it.
/// </summary>
/// <remarks>
/// Each test builds a database of its own from the migrations and drops it afterwards: stepping the schema back and
/// forth is not something the shared test database may see.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ImportPricingMigrationTests : IAsyncLifetime
{
    private static readonly CancellationToken None = CancellationToken.None;

    private IsolatedDatabase? _database;

    [PostgresFact]
    public async Task Once_migrated_nothing_is_pending_and_every_row_s_four_columns_are_null()
    {
        await using var db = _database!.CreateContext();
        await StagedImportsAsync(db);

        var state = await MigrationState.ReadAsync(db, None);
        var plan = MigrationPlan.Of(state);

        Assert.True(plan.IsDone);
        Assert.Empty(plan.Pending);
        Assert.Equal(MigrationPlan.Target, state.Applied[^1]);
        Assert.True(state.ColumnsExist);
        Assert.True(await db.ImportRows.AnyAsync(None));
        Assert.Equal(0, state.ClassifiedRows);
        Assert.Equal(ApplyOutcome.NothingToDo, (await Apply.ExecuteAsync(db, None)).Outcome);
    }

    [PostgresFact]
    public async Task Down_removes_the_columns_and_the_tool_puts_them_back_once()
    {
        await using var db = _database!.CreateContext();
        await StagedImportsAsync(db);

        // Down: back to the migration before Task 16a. The staged rows stay; only the four columns go.
        await db.GetService<IMigrator>().MigrateAsync(MigrationPlan.Previous, None);
        var before = await MigrationState.ReadAsync(db, None);
        Assert.Empty(before.PresentColumns);
        Assert.Null(before.ClassifiedRows);
        Assert.Equal([MigrationPlan.Target], MigrationPlan.Of(before).Pending);
        Assert.True(MigrationPlan.Of(before).CanApply);

        // What --dry-run prints: four columns, two checks, and the history row, in one transaction.
        var script = DryRun.Script(db, before);
        foreach (var column in MigrationState.Columns)
        {
            Assert.Contains($"ALTER TABLE \"ImportRows\" ADD \"{column}\"", script, StringComparison.Ordinal);
        }

        Assert.Contains("CK_ImportRows_PricingClassification", script, StringComparison.Ordinal);
        Assert.Contains("CK_ImportRows_PricingClassificationActor", script, StringComparison.Ordinal);
        Assert.Contains($"'{MigrationPlan.Target}'", script, StringComparison.Ordinal);
        Assert.Contains("START TRANSACTION", script, StringComparison.Ordinal);

        // No row of any table but the migration history is written.
        var inserts = script.Split("INSERT INTO ", StringSplitOptions.None).Skip(1).ToList();
        Assert.All(inserts, insert => Assert.StartsWith("\"__EFMigrationsHistory\"", insert, StringComparison.Ordinal));
        Assert.DoesNotContain("UPDATE \"", script, StringComparison.Ordinal);
        Assert.DoesNotContain("DELETE FROM", script, StringComparison.Ordinal);

        var first = await Apply.ExecuteAsync(db, None);
        Assert.Equal(ApplyOutcome.Applied, first.Outcome);
        Assert.True(first.After!.ColumnsExist);
        Assert.Equal(0, first.After.ClassifiedRows);
        Assert.True(MigrationPlan.Of(first.After).IsDone);

        var second = await Apply.ExecuteAsync(db, None);
        Assert.Equal(ApplyOutcome.NothingToDo, second.Outcome);
        Assert.Null(second.After);
    }

    [PostgresFact]
    public async Task A_stop_condition_refuses_the_migration_and_changes_nothing()
    {
        await using var db = _database!.CreateContext();
        await db.GetService<IMigrator>().MigrateAsync(MigrationPlan.Previous, None);

        // Something other than the migration has added one of its columns.
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"ImportRows\" ADD \"PricingClassification\" character varying(30)", None);

        var result = await Apply.ExecuteAsync(db, None);

        Assert.Equal(ApplyOutcome.Refused, result.Outcome);
        Assert.Contains(result.Before.Stops, stop => stop.Contains("already has", StringComparison.Ordinal));
        var after = await MigrationState.ReadAsync(db, None);
        Assert.DoesNotContain(MigrationPlan.Target, after.Applied);
        Assert.Equal(["PricingClassification"], after.PresentColumns);
    }

    /// <summary>
    /// The capture is the same taken twice, the same on the schema before the migration — where <c>--backup</c> takes
    /// the baseline on the real database — and the same once the migration is back in: it changes no figure.
    /// </summary>
    [PostgresFact]
    public async Task The_figures_are_the_same_twice_before_the_migration_and_after_it()
    {
        await using var db = _database!.CreateContext();
        await StagedImportsAsync(db);
        await using var services = ToolProgram.Build(new ToolSettings(_database.ConnectionString, Path.GetTempPath()));

        var first = await CaptureAsync(services);
        Assert.Empty(Invariants.Compare(first, await CaptureAsync(services)).Differences);
        Assert.Equal("2", first["imports.batches"]);
        Assert.Contains("imports.rows.sha256", first.Keys);
        Assert.Contains("catalogue.locationAliases.sha256", first.Keys);
        Assert.Contains("pricing.decisions.sha256", first.Keys);

        await db.GetService<IMigrator>().MigrateAsync(MigrationPlan.Previous, None);
        var onTheOldSchema = await CaptureAsync(services);
        Assert.Empty(Invariants.Compare(first, onTheOldSchema).Differences);

        Assert.Equal(ApplyOutcome.Applied, (await Apply.ExecuteAsync(db, None)).Outcome);
        var (identical, differences) = Invariants.Compare(first, await CaptureAsync(services));
        Assert.Empty(differences);
        Assert.Equal(first.Count, identical);
    }

    public async Task InitializeAsync()
    {
        if (PostgresDatabaseFixture.IsConfigured)
        {
            _database = await IsolatedDatabase.CreateAsync("baxorders_import_pricing_tool");
        }
    }

    public async Task DisposeAsync()
    {
        if (_database is not null)
        {
            await _database.DisposeAsync();
        }
    }

    /// <summary>One import confirmed into an order, with an unpriced line; one still under review.</summary>
    private static async Task StagedImportsAsync(BaxOrdersDbContext db)
    {
        await ImportedOrders.ImportAsync(db, new OrderLine(Quantity: 3, Price: 2), new OrderLine(Quantity: 5, Price: null));
        await StageAsync(db, new OrderLine(Product: "Yoxlamada qalan mal", Location: "Yoxlamada qalan obyekt", Price: null));
    }

    private static async Task<SortedDictionary<string, string>> CaptureAsync(ServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        return await Invariants.CaptureAsync(scope.ServiceProvider, None);
    }
}
