using BaxOrders.ImportPricingMigration;

namespace BaxOrders.UnitTests.ImportPricingMigration;

/// <summary>
/// Task 16a's migration tool without a database: it applies exactly one migration or refuses, a second run finds
/// nothing to do, and <c>--verify</c> reports every figure that moved.
/// </summary>
public sealed class MigrationPlanTests
{
    private static readonly string[] Before =
    [
        "20260923124150_AddOrderItemPricingDecisions",
        MigrationPlan.Previous,
    ];

    private static readonly string[] Known = [.. Before, MigrationPlan.Target];

    private static readonly string[] NoColumns = [];

    private static readonly string[] AllColumns = [.. MigrationState.Columns];

    [Fact]
    public void With_only_the_task_16a_migration_pending_it_can_be_applied()
    {
        var plan = MigrationPlan.Of(new MigrationState(Known, Before, NoColumns, ClassifiedRows: null));

        Assert.Empty(plan.Stops);
        Assert.Equal([MigrationPlan.Target], plan.Pending);
        Assert.True(plan.CanApply);
        Assert.False(plan.IsDone);
    }

    [Fact]
    public void Once_applied_there_is_nothing_to_do()
    {
        var plan = MigrationPlan.Of(new MigrationState(Known, Known, AllColumns, ClassifiedRows: 0));

        Assert.Empty(plan.Stops);
        Assert.Empty(plan.Pending);
        Assert.True(plan.IsDone);
        Assert.False(plan.CanApply);
    }

    [Fact]
    public void Rows_classified_after_the_migration_do_not_make_it_pending_again()
    {
        // People classify rows in review once the API runs this code; a second --apply still has nothing to do.
        var plan = MigrationPlan.Of(new MigrationState(Known, Known, AllColumns, ClassifiedRows: 12));

        Assert.True(plan.IsDone);
    }

    [Fact]
    public void Any_other_pending_migration_stops_it()
    {
        var plan = MigrationPlan.Of(new MigrationState(Known, [Before[0]], NoColumns, ClassifiedRows: null));

        Assert.False(plan.CanApply);
        Assert.Contains(plan.Stops, stop => stop.Contains(MigrationPlan.Previous, StringComparison.Ordinal));
    }

    [Fact]
    public void A_migration_the_code_does_not_know_stops_it()
    {
        var plan = MigrationPlan.Of(new MigrationState(Known, [.. Before, "20260930000000_SomethingElse"], NoColumns, ClassifiedRows: null));

        Assert.False(plan.CanApply);
        Assert.Contains(plan.Stops, stop => stop.Contains("20260930000000_SomethingElse", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("PricingClassification")]
    [InlineData("PricingClassifiedByUserId")]
    public void Any_of_the_columns_existing_while_the_migration_is_pending_stops_it(string column)
    {
        var plan = MigrationPlan.Of(new MigrationState(Known, Before, [column], ClassifiedRows: null));

        Assert.False(plan.CanApply);
        Assert.Contains(plan.Stops, stop => stop.Contains("already has", StringComparison.Ordinal) && stop.Contains(column, StringComparison.Ordinal));
    }

    [Fact]
    public void The_migration_recorded_without_all_four_columns_is_not_done()
    {
        var plan = MigrationPlan.Of(new MigrationState(Known, Known, ["PricingClassification"], ClassifiedRows: null));

        Assert.False(plan.IsDone);
        Assert.Contains(plan.Stops, stop => stop.Contains("lacks", StringComparison.Ordinal));
    }

    [Fact]
    public void Code_without_the_migration_is_refused()
    {
        var plan = MigrationPlan.Of(new MigrationState(Before, Before, NoColumns, ClassifiedRows: null));

        Assert.False(plan.CanApply);
        Assert.Contains(plan.Stops, stop => stop.Contains("does not contain", StringComparison.Ordinal));
    }

    [Fact]
    public void The_four_columns_are_the_ones_the_migration_adds()
    {
        Assert.Equal(
            ["PricingClassification", "PricingClassifiedAtUtc", "PricingClassifiedByDisplayName", "PricingClassifiedByUserId"],
            MigrationState.Columns);
        Assert.True(new MigrationState(Known, Known, AllColumns, 0).ColumnsExist);
        Assert.False(new MigrationState(Known, Known, AllColumns[..3], null).ColumnsExist);
    }

    [Fact]
    public void The_comparison_passes_only_when_every_figure_is_identical()
    {
        var before = Figures(("orders.lines", "8791"), ("imports.rows.sha256", "ABC"));

        var (identical, differences) = Invariants.Compare(before, Figures(("orders.lines", "8791"), ("imports.rows.sha256", "ABC")));

        Assert.Equal(2, identical);
        Assert.Empty(differences);
    }

    [Fact]
    public void The_comparison_names_every_changed_missing_and_new_figure()
    {
        var before = Figures(("imports.rows", "12000"), ("catalogue.locationAliases", "40"), ("pricing.decisions.count", "94"));
        var after = Figures(("imports.rows", "12001"), ("pricing.decisions.count", "94"), ("catalogue.suppliers", "30"));

        var (identical, differences) = Invariants.Compare(before, after);

        Assert.Equal(1, identical);
        Assert.Equal(3, differences.Count);
        Assert.Contains("imports.rows: 12000 → 12001", differences);
        Assert.Contains("catalogue.locationAliases: 40 → (gone)", differences);
        Assert.Contains("catalogue.suppliers: (new) → 30", differences);
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
    [InlineData("--classify")]
    [InlineData("--apply --force")]
    [InlineData("")]
    public void Nothing_else_is_accepted(string arguments)
    {
        Assert.Null(ToolSettings.ParseCommand(arguments.Split(' ', StringSplitOptions.RemoveEmptyEntries)));
    }

    [Fact]
    public void Its_files_are_named_after_this_task()
    {
        Assert.Equal("task16a", ToolSettings.TaskTag);
    }

    private static SortedDictionary<string, string> Figures(params (string Key, string Value)[] entries) =>
        new(entries.ToDictionary(entry => entry.Key, entry => entry.Value), StringComparer.Ordinal);
}
