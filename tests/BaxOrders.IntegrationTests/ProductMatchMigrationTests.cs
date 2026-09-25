using System.Globalization;
using BaxOrders.Application.Catalog.ProductMatches;
using BaxOrders.Domain.Catalog;
using BaxOrders.Infrastructure.Persistence;
using BaxOrders.ProductMatchMigration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using ToolProgram = BaxOrders.ProductMatchMigration.Program;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The Task 13a migration tool against a real PostgreSQL: the migration goes in once and only once, <c>Down</c> takes
/// it out again, a STOP condition changes nothing, and the figures <c>--verify</c> compares are captured the same way
/// every time — whatever is decided about a match.
/// </summary>
/// <remarks>
/// Each test builds a database of its own from the migrations and drops it afterwards: stepping the schema back and
/// forth is not something the shared test database may see.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ProductMatchMigrationTests : IAsyncLifetime
{
    private static readonly CancellationToken None = CancellationToken.None;

    private IsolatedDatabase? _database;

    [PostgresFact]
    public async Task Once_migrated_nothing_is_pending_and_the_table_is_empty()
    {
        await using var db = _database!.CreateContext();

        var state = await MigrationState.ReadAsync(db, None);
        var plan = MigrationPlan.Of(state);

        Assert.True(plan.IsDone);
        Assert.Empty(plan.Pending);
        Assert.Equal((true, 0), (state.TableExists, state.DecisionCount));
        Assert.Equal(MigrationPlan.Target, state.Applied[^1]);
        Assert.Equal(ApplyOutcome.NothingToDo, (await Apply.ExecuteAsync(db, None)).Outcome);
    }

    [PostgresFact]
    public async Task Down_drops_the_table_and_the_tool_puts_it_back_once()
    {
        await using var db = _database!.CreateContext();

        // Down: back to the migration before Task 13a.
        await db.GetService<IMigrator>().MigrateAsync(MigrationPlan.Previous, None);
        var before = await MigrationState.ReadAsync(db, None);
        Assert.False(before.TableExists);
        Assert.Equal([MigrationPlan.Target], MigrationPlan.Of(before).Pending);
        Assert.True(MigrationPlan.Of(before).CanApply);

        // What --dry-run prints: the one table, and the history row, in one transaction.
        var script = DryRun.Script(db, before);
        Assert.Contains("CREATE TABLE \"ProductMatchDecisions\"", script, StringComparison.Ordinal);
        Assert.Contains($"'{MigrationPlan.Target}'", script, StringComparison.Ordinal);

        // No row of any table but the migration history is written.
        var inserts = script.Split("INSERT INTO ", StringSplitOptions.None).Skip(1).ToList();
        Assert.All(inserts, insert => Assert.StartsWith("\"__EFMigrationsHistory\"", insert, StringComparison.Ordinal));
        Assert.DoesNotContain("UPDATE \"", script, StringComparison.Ordinal);
        Assert.DoesNotContain("DELETE FROM", script, StringComparison.Ordinal);

        var first = await Apply.ExecuteAsync(db, None);
        Assert.Equal(ApplyOutcome.Applied, first.Outcome);
        Assert.Equal((true, 0), (first.After!.TableExists, first.After.DecisionCount));
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

        // Something other than the migration has made a table of that name.
        await db.Database.ExecuteSqlRawAsync("CREATE TABLE \"ProductMatchDecisions\" (\"Id\" bigint)", None);

        var result = await Apply.ExecuteAsync(db, None);

        Assert.Equal(ApplyOutcome.Refused, result.Outcome);
        Assert.Contains(result.Before.Stops, stop => stop.Contains("already exists", StringComparison.Ordinal));
        var after = await MigrationState.ReadAsync(db, None);
        Assert.DoesNotContain(MigrationPlan.Target, after.Applied);
    }

    [PostgresFact]
    public async Task The_figures_are_captured_the_same_twice_and_no_decision_moves_them()
    {
        await using (var seed = _database!.CreateContext())
        {
            var fixture = await ProductMatchFixture.CreateAsync(seed);
            var admin = await TestCurrentUser.AdminAsync(seed);
            await using var services = ToolProgram.Build(new ToolSettings(_database.ConnectionString, Path.GetTempPath()));

            var first = await CaptureAsync(services);
            var second = await CaptureAsync(services);
            Assert.Empty(Invariants.Compare(first, second).Differences);

            // The brief's example as the screens show it today: two products, 750.00 against 750.00.
            Assert.Equal(0m, decimal.Parse(first[Invariants.HeydarAliyevSeptemberDelta], CultureInfo.InvariantCulture));
            Assert.Equal(fixture.SeptemberOrderId.ToString(CultureInfo.InvariantCulture), first["hem.2026-09.order"]);
            Assert.Contains("dashboard.2026-09.PreviousMonth.row.HEM.delta", first.Keys);
            Assert.Contains("report.2026.row.HEM.month.09.amount", first.Keys);

            // Approving a match writes one decision and nothing that any figure is made of.
            await new ProductMatchService(seed, admin, new PostgresProductMatchLock(seed)).ApproveAsync(
                new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano")), None);
            var afterApproval = await CaptureAsync(services);

            var (identical, differences) = Invariants.Compare(first, afterApproval);
            Assert.Empty(differences);
            Assert.Equal(first.Count, identical);
        }
    }

    public async Task InitializeAsync()
    {
        if (PostgresDatabaseFixture.IsConfigured)
        {
            _database = await IsolatedDatabase.CreateAsync("baxorders_match_tool");
        }
    }

    public async Task DisposeAsync()
    {
        if (_database is not null)
        {
            await _database.DisposeAsync();
        }
    }

    private static async Task<SortedDictionary<string, string>> CaptureAsync(ServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        return await Invariants.CaptureAsync(scope.ServiceProvider, None);
    }
}
