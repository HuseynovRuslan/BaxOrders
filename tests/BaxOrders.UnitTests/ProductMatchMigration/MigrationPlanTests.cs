using BaxOrders.ProductMatchMigration;

namespace BaxOrders.UnitTests.ProductMatchMigration;

/// <summary>
/// Task 13a's migration tool without a database: it applies exactly one migration or refuses, a second run finds
/// nothing to do, and <c>--verify</c> reports every figure that moved.
/// </summary>
public sealed class MigrationPlanTests
{
    private static readonly string[] Before =
    [
        "20260923122642_AddLinePricingModeAndHistoricalApproval",
        MigrationPlan.Previous,
    ];

    private static readonly string[] Known = [.. Before, MigrationPlan.Target];

    [Fact]
    public void With_only_the_task_13a_migration_pending_it_can_be_applied()
    {
        var plan = MigrationPlan.Of(new MigrationState(Known, Before, TableExists: false, DecisionCount: null));

        Assert.Empty(plan.Stops);
        Assert.Equal([MigrationPlan.Target], plan.Pending);
        Assert.True(plan.CanApply);
        Assert.False(plan.IsDone);
    }

    [Fact]
    public void Once_applied_there_is_nothing_to_do()
    {
        var plan = MigrationPlan.Of(new MigrationState(Known, Known, TableExists: true, DecisionCount: 0));

        Assert.Empty(plan.Stops);
        Assert.Empty(plan.Pending);
        Assert.True(plan.IsDone);
        Assert.False(plan.CanApply);
    }

    [Fact]
    public void Any_other_pending_migration_stops_it()
    {
        var plan = MigrationPlan.Of(new MigrationState(Known, [Before[0]], TableExists: false, DecisionCount: null));

        Assert.False(plan.CanApply);
        Assert.Contains(plan.Stops, stop => stop.Contains(MigrationPlan.Previous, StringComparison.Ordinal));
    }

    [Fact]
    public void A_migration_the_code_does_not_know_stops_it()
    {
        var plan = MigrationPlan.Of(new MigrationState(Known, [.. Before, "20260930000000_SomethingElse"], TableExists: false, DecisionCount: null));

        Assert.False(plan.CanApply);
        Assert.Contains(plan.Stops, stop => stop.Contains("20260930000000_SomethingElse", StringComparison.Ordinal));
    }

    [Fact]
    public void The_table_existing_while_its_migration_is_pending_stops_it()
    {
        var plan = MigrationPlan.Of(new MigrationState(Known, Before, TableExists: true, DecisionCount: 0));

        Assert.False(plan.CanApply);
        Assert.Contains(plan.Stops, stop => stop.Contains("already exists", StringComparison.Ordinal));
    }

    [Fact]
    public void The_migration_recorded_without_its_table_is_not_done()
    {
        var plan = MigrationPlan.Of(new MigrationState(Known, Known, TableExists: false, DecisionCount: null));

        Assert.False(plan.IsDone);
        Assert.Contains(plan.Stops, stop => stop.Contains("does not exist", StringComparison.Ordinal));
    }

    [Fact]
    public void Code_without_the_migration_is_refused()
    {
        var plan = MigrationPlan.Of(new MigrationState(Before, Before, TableExists: false, DecisionCount: null));

        Assert.False(plan.CanApply);
        Assert.Contains(plan.Stops, stop => stop.Contains("does not contain", StringComparison.Ordinal));
    }

    [Fact]
    public void The_comparison_passes_only_when_every_figure_is_identical()
    {
        var before = Figures(("orders.lines", "8791"), ("hem.2026-09.PreviousMonth.Primary.DeltaAmount", "23852.70"));

        var (identical, differences) = Invariants.Compare(before, Figures(("orders.lines", "8791"), ("hem.2026-09.PreviousMonth.Primary.DeltaAmount", "23852.70")));

        Assert.Equal(2, identical);
        Assert.Empty(differences);
    }

    [Fact]
    public void The_comparison_names_every_changed_missing_and_new_figure()
    {
        var before = Figures(("orders.lines", "8791"), ("catalogue.aliases", "40"), ("pricing.decisions.count", "94"));
        var after = Figures(("orders.lines", "8792"), ("pricing.decisions.count", "94"), ("catalogue.products", "900"));

        var (identical, differences) = Invariants.Compare(before, after);

        Assert.Equal(1, identical);
        Assert.Equal(3, differences.Count);
        Assert.Contains("orders.lines: 8791 → 8792", differences);
        Assert.Contains("catalogue.aliases: 40 → (gone)", differences);
        Assert.Contains("catalogue.products: (new) → 900", differences);
    }

    [Theory]
    [InlineData("--inspect", ToolCommand.Inspect)]
    [InlineData("--dry-run", ToolCommand.DryRun)]
    [InlineData("--backup", ToolCommand.Backup)]
    [InlineData("--apply", ToolCommand.Apply)]
    [InlineData("--verify", ToolCommand.Verify)]
    public void The_five_commands_are_the_only_ones(string argument, ToolCommand expected)
    {
        Assert.Equal(expected, ToolSettings.ParseCommand([argument]));
    }

    [Theory]
    [InlineData("--sql")]
    [InlineData("--apply --force")]
    [InlineData("")]
    public void Nothing_else_is_accepted(string arguments)
    {
        Assert.Null(ToolSettings.ParseCommand(arguments.Split(' ', StringSplitOptions.RemoveEmptyEntries)));
    }

    private static SortedDictionary<string, string> Figures(params (string Key, string Value)[] entries) =>
        new(entries.ToDictionary(entry => entry.Key, entry => entry.Value), StringComparer.Ordinal);
}
