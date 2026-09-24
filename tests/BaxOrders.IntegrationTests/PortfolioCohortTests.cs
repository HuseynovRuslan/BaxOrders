using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The portfolio headline compares one set of objects, and says which.
/// </summary>
/// <remarks>
/// It used to compare three. The month's money was summed over every object that ordered; the baseline was
/// summed over every object with any history at all; and the difference between them was presented as a change
/// in spending. An object that ordered for the first time was in one sum and not the other, an object that had
/// stopped ordering was in the other and not the one — so the "difference" moved when the membership moved,
/// and moved again when the reader changed the basis, for reasons that had nothing to do with money.
/// <para>
/// Every assertion here is written so that it holds whatever else the shared test database happens to contain:
/// the partition covers the whole catalogue, so the reconciliations are sums over the partition rather than
/// over a page of rows, and the objects of this world are found by id rather than counted.
/// </para>
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class PortfolioCohortTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;
    private static readonly DateOnly September = new(2026, 9, 1);

    // ---- the rule --------------------------------------------------------------------------------------

    /// <summary>
    /// Four situations, four groups, and an object in exactly one of them. Under the previous-month basis
    /// the window is August alone, which is what separates the object with a January order from a compared one.
    /// </summary>
    [PostgresFact]
    public async Task Every_object_is_in_the_group_its_own_months_put_it_in()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var partition = (await DashboardAsync(db, AnalyticsComparisonBasis.PreviousMonth))!.Summary.Partition;

        Assert.Equal(PortfolioGroup.Compared, GroupOf(partition, world.Compared));
        Assert.Equal(PortfolioGroup.NoOrderThisMonth, GroupOf(partition, world.Stopped));
        Assert.Equal(PortfolioGroup.NoBaseline, GroupOf(partition, world.OutsideWindow));
        Assert.Equal(PortfolioGroup.NoHistory, GroupOf(partition, world.NeverOrdered));
    }

    /// <summary>
    /// History is read as of the month being looked at, never as of today. An object whose first order came
    /// after September had no history in September, whatever it has now — otherwise reading an old month would
    /// be coloured by everything that happened since, and the same month would answer differently over time.
    /// </summary>
    [PostgresFact]
    public async Task An_object_whose_first_order_came_later_has_no_history_for_this_month()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var partition = (await DashboardAsync(db, AnalyticsComparisonBasis.PreviousMonth))!.Summary.Partition;

        Assert.Equal(PortfolioGroup.NoHistory, GroupOf(partition, world.OrderedLater));
        Assert.Null(Member(partition, world.OrderedLater).LastOrderPeriod);
    }

    /// <summary>The window decides the group, so widening it moves an object into the comparison.</summary>
    [PostgresFact]
    public async Task An_object_outside_the_window_joins_the_cohort_when_the_window_reaches_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var lastMonth = (await DashboardAsync(db, AnalyticsComparisonBasis.PreviousMonth))!.Summary.Partition;
        var everyMonth = (await DashboardAsync(db, AnalyticsComparisonBasis.AllPriorMonths))!.Summary.Partition;

        Assert.Equal(PortfolioGroup.NoBaseline, GroupOf(lastMonth, world.OutsideWindow));
        Assert.Equal(PortfolioGroup.Compared, GroupOf(everyMonth, world.OutsideWindow));

        // The object that has never ordered is not moved by any window: there is nothing to reach.
        Assert.Equal(PortfolioGroup.NoHistory, GroupOf(everyMonth, world.NeverOrdered));
    }

    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_four_groups_add_up_to_the_catalogue(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        await WorldAsync(db);
        var summary = (await DashboardAsync(db, basis, from, to))!.Summary;
        var partition = summary.Partition;

        Assert.Equal(
            partition.LocationCount,
            partition.Compared.Count + partition.NoOrderThisMonth.Count
                + partition.NoBaseline.Count + partition.NoHistory.Count);

        // The objects that had a history as of this month are what the coverage line divides by, and they are
        // the rows the table can say anything at all about.
        Assert.Equal(
            partition.Compared.Count + partition.NoOrderThisMonth.Count + partition.NoBaseline.Count,
            partition.ComparableLocationCount);
        Assert.True(partition.LocationCount >= summary.LocationCount);
        Assert.True(partition.ComparableLocationCount <= summary.LocationCount);
    }

    /// <summary>An object appears once, in one group. A partition with a duplicate would still add up.</summary>
    [PostgresFact]
    public async Task No_object_is_in_two_groups()
    {
        await using var db = database.CreateContext();
        await WorldAsync(db);
        var partition = (await DashboardAsync(db, AnalyticsComparisonBasis.PreviousMonth))!.Summary.Partition;

        var everyone = All(partition).Select(member => member.LocationId).ToList();
        Assert.Equal(everyone.Count, everyone.Distinct().Count());
    }

    // ---- the headline ----------------------------------------------------------------------------------

    /// <summary>
    /// The claim the screen makes: add the rows up and you land on the headline.
    /// </summary>
    /// <remarks>
    /// Each object's money is rounded to the cent before it is added, because the cent is what its row shows.
    /// Summing unrounded and rounding once at the end is arithmetically purer and gives a total nobody can
    /// reproduce from the page in front of them.
    /// </remarks>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_headline_is_the_sum_of_the_rows_it_is_drawn_from(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        await WorldAsync(db);
        var summary = (await DashboardAsync(db, basis, from, to))!.Summary;
        var partition = summary.Partition;

        // The month is every object that ordered, whoever it can be compared with.
        Assert.Equal(
            summary.Current.KnownAmount ?? 0m,
            All(partition).Sum(member => member.CurrentKnownAmount ?? 0m));

        // The comparison is the cohort, on both sides of itself.
        Assert.Equal(
            summary.ComparedCurrent.KnownAmount ?? 0m,
            partition.Compared.Sum(member => member.CurrentKnownAmount ?? 0m));
        Assert.Equal(
            summary.Baseline.KnownAmount ?? 0m,
            partition.Compared.Sum(member => member.BaselineKnownAmount ?? 0m));

        // And the difference is the Dəyişmə column added up, which is the check a manager actually performs.
        // It is deliberately not the difference of the two totals above: each object's difference comes from
        // its own two unrounded sides, so the two can land a few qəpik apart.
        Assert.Equal(
            summary.KnownAmountDelta ?? 0m,
            partition.Compared.Sum(member => member.KnownAmountDelta ?? 0m));
    }

    /// <summary>
    /// The rows are the objects that have ordered; the partition is the whole catalogue. An object with no
    /// orders at all has no row — whether it should is a separate question — but it is still one of the
    /// company's objects, and a cohort figure can only be checked against a count that includes it.
    /// </summary>
    [PostgresFact]
    public async Task The_partition_covers_objects_the_table_does_not()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var dashboard = (await DashboardAsync(db, AnalyticsComparisonBasis.PreviousMonth))!;

        Assert.Contains(dashboard.Summary.Partition.NoHistory, member => member.LocationId == world.NeverOrdered);
        Assert.True(dashboard.Summary.Partition.LocationCount > dashboard.Summary.LocationCount);

        var found = await Queries(db).GetAsync(
            September,
            new DashboardQuery(Search: Member(dashboard.Summary.Partition, world.NeverOrdered).LocationName, PageSize: 100),
            None);
        Assert.Empty(found!.Rows.Items);
    }

    /// <summary>
    /// The bug, stated as a test. An object with months behind it and no order this month has a baseline of its
    /// own, and that baseline used to be added to the company's — against a current month the object was not in.
    /// </summary>
    [PostgresFact]
    public async Task An_object_that_did_not_order_keeps_its_baseline_out_of_the_comparison()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var summary = (await DashboardAsync(db, AnalyticsComparisonBasis.AllPriorMonths))!.Summary;
        var stopped = Member(summary.Partition, world.Stopped);

        // It really does have money behind it — otherwise this test would pass for the wrong reason.
        Assert.NotNull(stopped.BaselineKnownAmount);
        Assert.True(stopped.BaselineKnownAmount > 0m);

        Assert.DoesNotContain(summary.Partition.Compared, member => member.LocationId == world.Stopped);
        Assert.Equal(
            summary.Baseline.KnownAmount ?? 0m,
            summary.Partition.Compared.Sum(member => member.BaselineKnownAmount ?? 0m));
    }

    /// <summary>
    /// An object that ordered with nothing to compare against belongs to the month and not to the comparison,
    /// and the two figures say so rather than being quietly reconciled into one.
    /// </summary>
    [PostgresFact]
    public async Task The_month_total_holds_money_the_comparison_does_not()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var summary = (await DashboardAsync(db, AnalyticsComparisonBasis.PreviousMonth))!.Summary;
        var outside = Member(summary.Partition, world.OutsideWindow);

        Assert.NotNull(outside.CurrentKnownAmount);
        Assert.True(summary.ComparedCurrent.KnownAmount < summary.Current.KnownAmount);
        Assert.Equal(
            summary.Current.KnownAmount ?? 0m,
            (summary.ComparedCurrent.KnownAmount ?? 0m)
                + All(summary.Partition)
                    .Where(member => !summary.Partition.Compared.Contains(member))
                    .Sum(member => member.CurrentKnownAmount ?? 0m));
    }

    /// <summary>
    /// The month is a fact about the month. Only the comparison depends on what it is being compared with, so
    /// the headline amount must not move when the reader changes the basis.
    /// </summary>
    [PostgresFact]
    public async Task The_months_own_total_does_not_move_with_the_basis()
    {
        await using var db = database.CreateContext();
        await WorldAsync(db);

        var amounts = new List<decimal?>();
        foreach (var (basis, from, to) in Bases())
        {
            amounts.Add((await DashboardAsync(db, basis, from, to))!.Summary.Current.KnownAmount);
        }

        Assert.All(amounts, amount => Assert.Equal(amounts[0], amount));
    }

    // ---- what the exceptions block is drawn from ---------------------------------------------------------

    /// <summary>
    /// The next question a reader asks about an object with no order is "when did it last order, and for how
    /// much?", so the answer travels with the name rather than being three clicks away.
    /// </summary>
    [PostgresFact]
    public async Task An_object_with_no_order_carries_the_month_and_money_of_its_last_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var partition = (await DashboardAsync(db, AnalyticsComparisonBasis.PreviousMonth))!.Summary.Partition;
        var stopped = Member(partition, world.Stopped);

        Assert.Equal(new DateOnly(2026, 7, 1), stopped.LastOrderPeriod);
        Assert.Equal(300m, stopped.LastOrderKnownAmount);
        Assert.Null(stopped.CurrentKnownAmount);
    }

    /// <summary>
    /// An object that has never ordered is named and nothing further is claimed about it. It is not an object
    /// that is late, and the records are not incomplete: there is simply nothing there.
    /// </summary>
    [PostgresFact]
    public async Task An_object_that_has_never_ordered_is_named_and_left_at_that()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var dashboard = (await DashboardAsync(db, AnalyticsComparisonBasis.PreviousMonth))!;
        var never = Member(dashboard.Summary.Partition, world.NeverOrdered);

        Assert.Null(never.LastOrderPeriod);
        Assert.Null(never.LastOrderKnownAmount);
        Assert.Null(never.CurrentKnownAmount);
        Assert.Null(never.BaselineKnownAmount);

    }

    /// <summary>
    /// It is also not in the attention section. That section is a reading order over things that happened, and
    /// an object with no orders at all has not done anything to read about.
    /// </summary>
    [PostgresFact]
    public async Task An_object_that_has_never_ordered_is_not_put_in_front_of_anybody()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var dashboard = (await DashboardAsync(db, AnalyticsComparisonBasis.PreviousMonth))!;

        Assert.DoesNotContain(dashboard.Attention, card => card.Location.LocationId == world.NeverOrdered);
        Assert.DoesNotContain(dashboard.Attention, card => card.Location.LocationId == world.OrderedLater);
    }

    // ---- fixture -----------------------------------------------------------------------------------------

    public static TheoryData<AnalyticsComparisonBasis, string?, string?> EveryBasis()
    {
        var data = new TheoryData<AnalyticsComparisonBasis, string?, string?>();
        foreach (var (basis, from, to) in Bases())
        {
            data.Add(basis, from, to);
        }

        return data;
    }

    private static IEnumerable<(AnalyticsComparisonBasis Basis, string? From, string? To)> Bases() =>
    [
        (AnalyticsComparisonBasis.PreviousMonth, null, null),
        (AnalyticsComparisonBasis.Previous3MonthAverage, null, null),
        (AnalyticsComparisonBasis.Previous6MonthAverage, null, null),
        (AnalyticsComparisonBasis.AllPriorMonths, null, null),
        (AnalyticsComparisonBasis.CustomRange, "2026-01", "2026-08"),
    ];

    private static ManagementDashboardQueries Queries(BaxOrdersDbContext db) => new(db);

    private static Task<ManagementDashboardDto?> DashboardAsync(
        BaxOrdersDbContext db,
        AnalyticsComparisonBasis basis,
        string? from = null,
        string? to = null) =>
        Queries(db).GetAsync(
            September,
            new DashboardQuery(basis, PageSize: 100, CustomStart: from, CustomEnd: to),
            None);

    private static IEnumerable<DashboardPartitionMemberDto> All(DashboardPartitionDto partition) =>
        [.. partition.Compared, .. partition.NoOrderThisMonth, .. partition.NoBaseline, .. partition.NoHistory];

    private static PortfolioGroup GroupOf(DashboardPartitionDto partition, int locationId)
    {
        if (partition.Compared.Any(member => member.LocationId == locationId))
        {
            return PortfolioGroup.Compared;
        }

        if (partition.NoOrderThisMonth.Any(member => member.LocationId == locationId))
        {
            return PortfolioGroup.NoOrderThisMonth;
        }

        if (partition.NoBaseline.Any(member => member.LocationId == locationId))
        {
            return PortfolioGroup.NoBaseline;
        }

        Assert.Contains(partition.NoHistory, member => member.LocationId == locationId);
        return PortfolioGroup.NoHistory;
    }

    private static DashboardPartitionMemberDto Member(DashboardPartitionDto partition, int locationId) =>
        Assert.Single(All(partition), member => member.LocationId == locationId);

    private sealed record World(
        int Compared, int Stopped, int OutsideWindow, int NeverOrdered, int OrderedLater);

    /// <summary>
    /// One object of each of the five kinds the rule has to tell apart, with September as the month being read
    /// and the previous-month basis putting August alone in the window.
    /// </summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Guid.NewGuid().ToString("N")[..8];
        var codes = new PostgresLocationCodeGenerator(db);

        async Task<Location> LocationAsync(string name)
        {
            var location = new Location(await codes.NextAsync(None), $"{name} {tag}");
            db.Locations.Add(location);
            await db.SaveChangesAsync(None);
            return location;
        }

        var compared = await LocationAsync("Kohort obyekti");
        var stopped = await LocationAsync("Sifarişi dayanan obyekt");
        var outsideWindow = await LocationAsync("Pəncərədən kənar obyekt");
        var neverOrdered = await LocationAsync("Heç sifariş verməyən obyekt");
        var orderedLater = await LocationAsync("Sonra başlayan obyekt");

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS", None);
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"Kohort malı {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync(None);

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync(None);

        OrderRequest Order(Location location, int month, decimal quantity, decimal price)
        {
            var request = new OrderRequest(location, new DateOnly(2026, month, 1));
            request.AddItem(variant, quantity, price);
            return request;
        }

        db.OrderRequests.AddRange(
            // Ordered in the window and in the month: the ordinary case.
            Order(compared, 8, 10m, 20m),
            Order(compared, 9, 12m, 25m),
            // Ordered in July and not since. 300,00 ₼ is what the exceptions block has to say about it.
            Order(stopped, 7, 10m, 30m),
            // A January order and a September one: history, but nothing the previous-month window reaches.
            Order(outsideWindow, 1, 5m, 10m),
            Order(outsideWindow, 9, 4m, 15m),
            // Its first order is in October, so as of September it had never ordered.
            Order(orderedLater, 10, 3m, 11m));

        await db.SaveChangesAsync(None);
        db.ChangeTracker.Clear();

        return new World(compared.Id, stopped.Id, outsideWindow.Id, neverOrdered.Id, orderedLater.Id);
    }
}
