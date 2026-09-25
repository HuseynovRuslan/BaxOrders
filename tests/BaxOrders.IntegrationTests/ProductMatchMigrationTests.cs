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
/// every time. An approved variant link moves only the split of "Niyə dəyişib?" on the order page (13.1a), and
/// undoing it puts every figure back.
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

    /// <summary>
    /// Approving the Sabun variant link moves on HEM's September order page exactly what 13.1a asks for — the
    /// categories' split, each driver's category and the new "variant dəyişib" line (TASK-13c §7) — and not one
    /// amount, count or figure besides. Undoing it gives back every figure first captured.
    /// </summary>
    [PostgresFact]
    public async Task The_figures_are_captured_the_same_twice_and_a_variant_link_moves_only_the_split_of_niye_deyisib()
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

            // The bases HEM's September order page is captured on, by the tool's own keys ("hem.2026-09.PreviousMonth", …).
            var bases = first.Keys
                .Where(key => key.StartsWith("hem.2026-09.", StringComparison.Ordinal) && key.Contains(".Decomposition.", StringComparison.Ordinal))
                .Select(key => key[..key.IndexOf(".Decomposition.", StringComparison.Ordinal)])
                .Distinct(StringComparer.Ordinal)
                .ToList();
            Assert.Equal(4, bases.Count);

            // Approving a variant link writes one decision. 13.1a then moves the split of "Niyə dəyişib?" — "Yeni" and
            // "yazılmayan" each 750.00 smaller, one "variant dəyişib" line — and nothing else: every amount, count,
            // driver figure, dashboard and report figure stays as it was.
            var service = new ProductMatchService(seed, admin, new PostgresProductMatchLock(seed));
            var approved = await service.ApproveAsync(
                new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano")), None);
            var afterApproval = await CaptureAsync(services);

            var differences = Invariants.Compare(first, afterApproval).Differences;
            Assert.Empty(differences.Where(difference => !IsTheSplit(KeyOf(difference), bases)).ToList());
            foreach (var basis in bases)
            {
                Assert.Equal(0m, decimal.Parse(afterApproval[$"{basis}.Decomposition.VariantTransitions[0].AmountImpact"], CultureInfo.InvariantCulture));
                Assert.DoesNotContain(afterApproval.Keys, key => key.StartsWith($"{basis}.Decomposition.VariantTransitions[1]", StringComparison.Ordinal));
            }

            // A wrong approval can be undone, and then every figure is what it was (acceptance 8).
            await service.UndoAsync(approved.Id, new UndoProductMatchCommand(), None);
            var afterUndo = await CaptureAsync(services);

            var (identical, differencesAfterUndo) = Invariants.Compare(first, afterUndo);
            Assert.Empty(differencesAfterUndo);
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

    /// <summary>The key a difference of <see cref="Invariants.Compare"/> is about: it reads "key: before → after".</summary>
    private static string KeyOf(string difference) => difference[..difference.IndexOf(": ", StringComparison.Ordinal)];

    /// <summary>
    /// What 13.1a may move on one basis of HEM's September order page: the categories' split, a driver's
    /// <c>Category</c> and the transition list (TASK-13c §7). By exact prefix, so that a driver's money —
    /// <c>….Decomposition.Drivers[0].AmountImpact</c> — is never one of them.
    /// </summary>
    private static bool IsTheSplit(string key, IEnumerable<string> bases) => bases.Any(basis =>
        key.StartsWith($"{basis}.Decomposition.Categories[", StringComparison.Ordinal)
        || key.StartsWith($"{basis}.Decomposition.VariantTransitions[", StringComparison.Ordinal)
        || IsDriverCategory(key, $"{basis}.Decomposition.Drivers["));

    /// <summary>Exactly <c>{drivers}N].Category</c>, N being a driver's index.</summary>
    private static bool IsDriverCategory(string key, string drivers)
    {
        const string category = "].Category";
        if (!key.StartsWith(drivers, StringComparison.Ordinal)
            || !key.EndsWith(category, StringComparison.Ordinal)
            || key.Length <= drivers.Length + category.Length)
        {
            return false;
        }

        return key[drivers.Length..^category.Length].All(char.IsAsciiDigit);
    }
}
