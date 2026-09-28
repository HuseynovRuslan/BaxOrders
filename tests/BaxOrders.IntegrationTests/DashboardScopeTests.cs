using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The dashboard answered about the population the reader asked for.
/// </summary>
/// <remarks>
/// The manager asks one question in three ways — what we order every month, what we bought on top of the plan,
/// what we actually spent — and the screen has to answer about exactly that and nothing else. What must never
/// happen is the line nobody classified sliding into a figure read as demand.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class DashboardScopeTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;
    private static readonly DateOnly July = new(2026, 7, 1);

    /// <summary>June and July of planned material, a July one-off, and a July line nobody classified.</summary>
    /// <remarks>
    /// Monthly: 200 in June, 200 in July · outside: 900 in July alone · unclassified: 7 in July alone.
    /// </remarks>
    private sealed record World(int LocationId, string Tag);

    [PostgresFact]
    public async Task The_default_scope_is_the_months_planned_material()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, scope: null);

        Assert.Equal(200m, row.Current.KnownAmount);
        Assert.Equal(200m, row.Baseline.KnownAmount);
        Assert.Equal(0m, row.KnownAmountDelta);
    }

    /// <summary>Asked about the plan, the screen is answered about the plan — the one-off is not in it.</summary>
    [PostgresFact]
    public async Task The_monthly_scope_leaves_the_one_off_and_the_unclassified_out()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, AnalyticsScope.Monthly);

        Assert.Equal(200m, row.Current.KnownAmount);
        Assert.Equal(0m, row.KnownAmountDelta);
    }

    /// <summary>
    /// Asked about off-plan spending, the screen answers about that alone — and July's 900 against a June that
    /// bought nothing off-plan is a real fact about spend, not a claim about demand.
    /// </summary>
    [PostgresFact]
    public async Task The_outside_scope_answers_about_what_was_bought_on_top_of_the_plan()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, AnalyticsScope.OutsideMonthly);

        Assert.Equal(900m, row.Current.KnownAmount);
        Assert.Null(row.Baseline.KnownAmount);
    }

    /// <summary>The factual total is the only scope the unclassified line reaches.</summary>
    [PostgresFact]
    public async Task The_factual_total_carries_every_line_of_the_month()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, AnalyticsScope.All);

        // 200 planned + 900 off-plan + 7 nobody classified.
        Assert.Equal(1107m, row.Current.KnownAmount);
        Assert.Equal(200m, row.Baseline.KnownAmount);
    }

    /// <summary>
    /// Whatever the scope, the month's own split is the month's own split: it describes what was ordered, not
    /// what the reader asked to compare, so it must not move when they change the question.
    /// </summary>
    [PostgresFact]
    public async Task The_months_split_does_not_move_with_the_scope()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        // Compared with itself across the scopes rather than against a figure: the split describes the whole
        // company, which other fixtures of this suite also order in, so only its steadiness is this test's claim.
        var monthly = (await SummaryAsync(db, world, AnalyticsScope.Monthly)).LineTypes;
        var outside = (await SummaryAsync(db, world, AnalyticsScope.OutsideMonthly)).LineTypes;
        var all = (await SummaryAsync(db, world, AnalyticsScope.All)).LineTypes;

        Assert.Equal(monthly, outside);
        Assert.Equal(monthly, all);

        // And it is not empty, or the comparison above would hold for the wrong reason.
        Assert.NotNull(monthly.Monthly.KnownAmount);
        Assert.NotNull(monthly.OutsideMonthly.KnownAmount);
    }

    /// <summary>
    /// Half a year, ending at the month on the screen and never running past it.
    /// </summary>
    [PostgresFact]
    public async Task The_trend_ends_at_the_selected_month_and_carries_at_most_half_a_year()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var trend = (await SummaryAsync(db, world, AnalyticsScope.Monthly)).Trend;

        Assert.InRange(trend.Count, 2, 6);
        Assert.Equal(July, trend[^1].Period);
        Assert.All(trend, point => Assert.True(point.Period <= July));
    }

    /// <summary>
    /// Months the company ordered in, in order, each one once. A calendar count backwards would invent months
    /// the company never had and draw the line through them.
    /// </summary>
    [PostgresFact]
    public async Task The_trend_is_made_of_months_the_company_actually_ordered_in()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var trend = (await SummaryAsync(db, world, AnalyticsScope.Monthly)).Trend;
        var ordered = await db.OrderRequests.AsNoTracking()
            .Select(request => request.RequestPeriod)
            .Distinct()
            .ToListAsync(None);

        Assert.Equal(trend.Select(point => point.Period).Order(), trend.Select(point => point.Period));
        Assert.Equal(trend.Select(point => point.Period).Distinct().Count(), trend.Count);
        Assert.All(trend, point => Assert.Contains(point.Period, ordered));
    }

    /// <summary>
    /// The line follows the scope. A line of monthly demand and a line of total expenditure are two different
    /// stories, and drawing either under the other's name is exactly the mistake the comparison avoids.
    /// </summary>
    [PostgresFact]
    public async Task The_trend_follows_the_scope_it_was_asked_about()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var monthly = (await SummaryAsync(db, world, AnalyticsScope.Monthly)).Trend.Single(point => point.Period == July);
        var all = (await SummaryAsync(db, world, AnalyticsScope.All)).Trend.Single(point => point.Period == July);

        // The company-wide figures also carry every other fixture of this suite, so the claim is the gap and
        // not the totals: July's off-plan 900 and unclassified 7 are in one line and out of the other.
        Assert.NotNull(monthly.KnownAmount);
        Assert.NotNull(all.KnownAmount);
        Assert.True(all.KnownAmount - monthly.KnownAmount >= 907m);
    }

    /// <summary>
    /// A point says how many objects stand behind it, because a line that climbs on more objects is a different
    /// fact from one that climbs on more ordering, and nothing else on the screen would tell them apart.
    /// </summary>
    [PostgresFact]
    public async Task A_trend_point_carries_the_objects_that_ordered_in_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var july = (await SummaryAsync(db, world, AnalyticsScope.Monthly)).Trend.Single(point => point.Period == July);

        Assert.True(july.LocationCount >= 1);
    }

    /// <summary>
    /// The location's own row, which the search really does narrow — the summary describes the whole company,
    /// and every other fixture in this suite orders in it too.
    /// </summary>
    private static async Task<LocationDashboardRowDto> RowAsync(
        BaxOrdersDbContext db, World world, AnalyticsScope? scope)
    {
        var dashboard = await DashboardAsync(db, world, scope);
        return dashboard.Rows.Items.Single(row => row.LocationId == world.LocationId);
    }

    private static async Task<ManagementDashboardSummaryDto> SummaryAsync(
        BaxOrdersDbContext db, World world, AnalyticsScope? scope) =>
        (await DashboardAsync(db, world, scope)).Summary;

    private static async Task<ManagementDashboardDto> DashboardAsync(
        BaxOrdersDbContext db, World world, AnalyticsScope? scope)
    {
        var query = scope is null
            ? new DashboardQuery(Search: world.Tag, PageSize: 100)
            : new DashboardQuery(Search: world.Tag, PageSize: 100, Scope: scope.Value);

        return (await new ManagementDashboardQueries(db).GetAsync(July, query, None))!;
    }

    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Guid.NewGuid().ToString("N")[..8];

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Əhatə obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"Əhatə malı {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync();
        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var june = new OrderRequest(location, new DateOnly(2026, 6, 1));
        june.AddItem(variant, 20m, 10m);

        var july = new OrderRequest(location, July);
        july.AddItem(variant, 20m, 10m);
        july.AddItem(variant, 1m, 900m, orderLineType: OrderLineType.OutsideMonthly);
        july.AddItem(variant, 1m, 7m, orderLineType: OrderLineType.Unclassified);

        db.OrderRequests.AddRange(june, july);
        await db.SaveChangesAsync();

        return new World(location.Id, tag);
    }
}
