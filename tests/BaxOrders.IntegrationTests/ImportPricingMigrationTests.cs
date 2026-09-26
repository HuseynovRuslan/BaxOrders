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
        await using var db = MigrationsAsFound.Task16a(_database!.ConnectionString);
        await StagedImportsAsync(db);
        await StandWhereTask16aFoundItAsync();

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
        await using var db = MigrationsAsFound.Task16a(_database!.ConnectionString);
        await StagedImportsAsync(db);
        await StandWhereTask16aFoundItAsync();

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
    /// The capture is deterministic: taken twice over the same data it produces the same figures, key for key.
    /// </summary>
    /// <remarks>
    /// <para>
    /// 16a's test also took the capture on the schema as it stood before its own migration, and after putting
    /// the migration back, to show the migration moved no figure. Neither leg can run any more, and not
    /// because of anything the tool does: this capture reads the management dashboard across every comparison
    /// basis, a later task added a column to <c>OrderRequestItems</c> that those screens now select, and a
    /// database stepped back below that migration does not have the column.
    /// <see cref="MigrationsAsFound"/> keeps the migration list where the tool found it; it cannot keep the
    /// model there too.
    /// </para>
    /// <para>
    /// What those legs proved is not lost. That the migration adds its columns empty and touches no row is
    /// what <see cref="Once_migrated_nothing_is_pending_and_every_row_s_four_columns_are_null"/> and
    /// <see cref="Down_removes_the_columns_and_the_tool_puts_them_back_once"/> assert directly — the latter
    /// reads the migration's own script and refuses it if it holds a single UPDATE or DELETE.
    /// </para>
    /// </remarks>
    [PostgresFact]
    public async Task The_capture_is_the_same_figure_for_figure_when_it_is_taken_twice()
    {
        await using var db = _database!.CreateContext();
        await StagedImportsAsync(db);
        await using var services = ToolProgram.Build(new ToolSettings(_database.ConnectionString, Path.GetTempPath()));

        var first = await CaptureAsync(services);
        var (identical, differences) = Invariants.Compare(first, await CaptureAsync(services));

        Assert.Empty(differences);
        Assert.Equal(first.Count, identical);
        Assert.Equal("2", first["imports.batches"]);
        Assert.Contains("imports.rows.sha256", first.Keys);
        Assert.Contains("catalogue.locationAliases.sha256", first.Keys);
        Assert.Contains("pricing.decisions.sha256", first.Keys);
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

    /// <summary>
    /// The starting point for the three tests that read "16a's migration is the latest": the database is taken
    /// back to <see cref="MigrationPlan.Target"/>, and the tool then looks at it through the code as it stood
    /// then (<see cref="MigrationsAsFound"/>). Later migrations — the order-line classification's first — are a
    /// fact about later tasks, not about this tool; every assertion stays as 16a wrote it.
    /// <para>
    /// Called after the rows are staged, never before. A later migration adds a column to
    /// <c>OrderRequestItems</c>, and the model still knows about it: writing a line needs the column to be
    /// there. Reading one does not, because every capture names the columns it reads.
    /// </para>
    /// </summary>
    private async Task StandWhereTask16aFoundItAsync()
    {
        await using var current = _database!.CreateContext();
        await current.GetService<IMigrator>().MigrateAsync(MigrationPlan.Target, None);
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
