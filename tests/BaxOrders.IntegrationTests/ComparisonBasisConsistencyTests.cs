using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Common;
using BaxOrders.Application.Decisions;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The dashboard card and the order screen must give one answer, not two.
/// </summary>
/// <remarks>
/// A manager picks a comparison basis on the dashboard, reads "+15 129,07 ₼, because of new orders", clicks
/// "Detallara bax" — and used to land on a page comparing against last month instead, with a different figure
/// and a different reason. Both screens now call <see cref="PeriodComparison"/>, and these tests hold them to
/// it for every basis the app offers.
/// <para>
/// One subtlety is pinned here on purpose. A row's delta is taken from the baseline <i>rounded</i> to the
/// money scale, while the decomposition averages each variant unrounded so its categories add up exactly.
/// On an averaged window those two paths can differ by a fraction of a qəpik. That difference is the same on
/// both screens — they run the same code — and is far below anything either of them prints.
/// </para>
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ComparisonBasisConsistencyTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;
    private static readonly DateOnly September = new(2026, 9, 1);

    /// <summary>Below a hundredth of a qəpik: smaller than anything either screen can display.</summary>
    private const decimal RoundingSlack = 0.0001m;

    public static TheoryData<AnalyticsComparisonBasis, string?, string?> EveryBasis() => new()
    {
        { AnalyticsComparisonBasis.PreviousMonth, null, null },
        { AnalyticsComparisonBasis.Previous3MonthAverage, null, null },
        { AnalyticsComparisonBasis.Previous6MonthAverage, null, null },
        { AnalyticsComparisonBasis.AllPriorMonths, null, null },
        { AnalyticsComparisonBasis.CustomRange, "2026-05", "2026-07" },
    };

    // ---- D. one formula, not two ----------------------------------------------------------------------

    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_card_and_the_order_screen_agree_on_every_figure(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, basis, from, to);
        var context = await ContextAsync(db, world, basis, from, to);

        Assert.Equal(row.Current.KnownAmount, context.Current.KnownAmount);
        Assert.Equal(row.Baseline.KnownAmount, context.Primary.BaselineKnownAmount);
        Assert.Equal(row.KnownAmountDelta, context.Primary.DeltaAmount);
        Assert.Equal(row.KnownAmountPercentChange, context.Primary.DeltaPercent);
        Assert.Equal(row.AvailableBaselinePeriodCount, context.Primary.AvailablePeriodCount);
        Assert.Equal(row.ExpectedBaselinePeriodCount, context.Primary.ExpectedPeriodCount);
    }

    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_card_and_the_order_screen_name_the_same_causes(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, basis, from, to);
        var context = await ContextAsync(db, world, basis, from, to);
        var categories = context.Decomposition!.Categories.ToDictionary(item => item.Category, item => item.Amount);

        // The card shows only the categories that moved money; every one of them must match to the qəpik.
        Assert.NotEmpty(row.Causes);
        foreach (var cause in row.Causes)
        {
            Assert.Equal(cause.Amount, categories[cause.Category]);
            Assert.Equal(
                cause.VariantCount,
                context.Decomposition.Categories.Single(item => item.Category == cause.Category).VariantCount);
        }

        var primary = row.PrimaryCause!.Value;
        var strongest = context.Decomposition.Categories
            .Where(item => item.Amount != 0m)
            .OrderByDescending(item => Math.Abs(item.Amount))
            .ThenBy(item => item.Category)
            .First();
        Assert.Equal(strongest.Category, primary);
        Assert.Equal(row.PrimaryCauseAmount, strongest.Amount);
    }

    // ---- the causes account for the difference ---------------------------------------------------------

    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_causes_add_up_to_the_difference_they_explain(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world, basis, from, to);
        var decomposition = context.Decomposition!;

        // Exactly, with nothing left over: there is no "other" bucket for the remainder to hide in.
        Assert.Equal(decomposition.TotalAmountImpact, decomposition.Categories.Sum(item => item.Amount));

        // And that total is the difference the screen puts beside it.
        Assert.True(
            Math.Abs(decomposition.TotalAmountImpact - context.Primary.DeltaAmount!.Value) < RoundingSlack,
            $"{basis}: causes {decomposition.TotalAmountImpact} vs delta {context.Primary.DeltaAmount}");
    }

    /// <summary>A single-month window divides by one, so there is no averaging to round and no slack at all.</summary>
    [PostgresFact]
    public async Task Against_one_month_the_causes_equal_the_difference_exactly()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world, AnalyticsComparisonBasis.PreviousMonth, null, null);

        Assert.Equal(context.Primary.DeltaAmount, context.Decomposition!.TotalAmountImpact);
    }

    // ---- what the screen can say about the window -------------------------------------------------------

    [PostgresFact]
    public async Task The_primary_comparison_names_the_months_it_covers()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world, AnalyticsComparisonBasis.Previous3MonthAverage, null, null);

        // İyun, İyul, Avqust — the three months before Sentyabr, oldest first.
        Assert.Equal(
            [new DateOnly(2026, 6, 1), new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 1)],
            context.Primary.WindowPeriods);
    }

    [PostgresFact]
    public async Task The_other_bases_come_back_beside_the_chosen_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world, AnalyticsComparisonBasis.Previous3MonthAverage, null, null);

        Assert.Equal(AnalyticsComparisonBasis.Previous3MonthAverage, context.Primary.Basis);
        Assert.Equal(
            [
                AnalyticsComparisonBasis.PreviousMonth,
                AnalyticsComparisonBasis.Previous6MonthAverage,
                AnalyticsComparisonBasis.AllPriorMonths,
            ],
            context.Secondary.Select(item => item.Basis));
    }

    /// <summary>"Bütün dövr" was missing from the order screen entirely; it is a first-class basis now.</summary>
    [PostgresFact]
    public async Task Every_prior_month_works_on_the_order_screen_too()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world, AnalyticsComparisonBasis.AllPriorMonths, null, null);

        Assert.True(context.Primary.Available);
        Assert.True(context.Primary.AvailablePeriodCount >= 6);
        Assert.NotNull(context.Decomposition);
    }

    // ---- F. nothing to compare against -----------------------------------------------------------------

    /// <summary>
    /// Never a silent comparison against zero, and never a quiet fall back to another basis: the screen is
    /// told there is nothing in the window, and says so.
    /// </summary>
    [PostgresFact]
    public async Task A_window_the_location_never_ordered_in_is_reported_as_empty()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world, AnalyticsComparisonBasis.CustomRange, "2025-01", "2025-03");

        Assert.False(context.Primary.Available);
        Assert.Equal(0, context.Primary.AvailablePeriodCount);
        Assert.Equal(3, context.Primary.ExpectedPeriodCount);
        Assert.Null(context.Primary.BaselineKnownAmount);
        Assert.Null(context.Primary.DeltaAmount);
        // Nothing is explained, rather than every product being called new.
        Assert.Null(context.Decomposition);
    }

    [PostgresFact]
    public async Task Partial_coverage_is_reported_as_the_months_it_has_and_the_months_it_lacks()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db, skipJuly: true);

        var context = await ContextAsync(db, world, AnalyticsComparisonBasis.Previous3MonthAverage, null, null);

        Assert.Equal(3, context.Primary.ExpectedPeriodCount);
        Assert.Equal(2, context.Primary.AvailablePeriodCount);
        Assert.Equal(new DateOnly(2026, 7, 1), Assert.Single(context.Primary.MissingPeriods));

        // Divided by the two months that exist, never by the three the basis asked for.
        var row = await RowAsync(db, world, AnalyticsComparisonBasis.Previous3MonthAverage, null, null);
        Assert.Equal(row.Baseline.KnownAmount, context.Primary.BaselineKnownAmount);
    }

    [PostgresFact]
    public async Task A_range_that_reaches_the_month_being_decided_is_refused()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        await Assert.ThrowsAsync<ValidationException>(() => new OrderDecisionContextQueries(db).GetAsync(
            world.SeptemberRequestId,
            new DecisionContextQuery(AnalyticsComparisonBasis.CustomRange, "2026-07", "2026-09"),
            None));
    }

    /// <summary>A link that carries no basis is a month-to-month reading, as the monthly report intends.</summary>
    [PostgresFact]
    public async Task No_basis_means_the_previous_month()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = (await new OrderDecisionContextQueries(db)
            .GetAsync(world.SeptemberRequestId, new DecisionContextQuery(), None))!;

        Assert.Equal(AnalyticsComparisonBasis.PreviousMonth, context.Primary.Basis);
        Assert.Equal(new DateOnly(2026, 8, 1), Assert.Single(context.Primary.WindowPeriods));
    }

    // ---- fixture ---------------------------------------------------------------------------------------

    private static async Task<LocationDashboardRowDto> RowAsync(
        BaxOrdersDbContext db, World world, AnalyticsComparisonBasis basis, string? from, string? to)
    {
        var dashboard = await new ManagementDashboardQueries(db).GetAsync(
            September,
            new DashboardQuery(basis, Search: world.LocationName, PageSize: 100, CustomStart: from, CustomEnd: to),
            None);

        return Assert.Single(dashboard!.Rows.Items);
    }

    private static async Task<OrderDecisionContextDto> ContextAsync(
        BaxOrdersDbContext db, World world, AnalyticsComparisonBasis basis, string? from, string? to) =>
        (await new OrderDecisionContextQueries(db).GetAsync(
            world.SeptemberRequestId, new DecisionContextQuery(basis, from, to), None))!;

    private sealed record World(int LocationId, string LocationName, long SeptemberRequestId);

    /// <summary>
    /// One object with eight months behind it, each a different shape, so no basis can accidentally agree
    /// with another: prices move, quantities move, a product is dropped and a product is new.
    /// </summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db, bool skipJuly = false)
    {
        var tag = Guid.NewGuid().ToString("N")[..8];
        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Baza obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync(None);

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS", None);
        var codes = new PostgresProductCodeGenerator(db);
        var kept = new Product(await codes.NextAsync(None), $"Qalan mal {tag}");
        var dropped = new Product(await codes.NextAsync(None), $"Dayanan mal {tag}");
        var added = new Product(await codes.NextAsync(None), $"Yeni mal {tag}");
        db.Products.AddRange(kept, dropped, added);
        await db.SaveChangesAsync(None);

        var keptVariant = kept.AddVariant(null, null, null, pieces);
        var droppedVariant = dropped.AddVariant(null, null, null, pieces);
        var addedVariant = added.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync(None);

        // 2026-01 … 2026-08, then the month being decided.
        var requests = new List<OrderRequest>();
        for (var month = 1; month <= 8; month++)
        {
            if (skipJuly && month == 7)
            {
                continue;
            }

            var request = new OrderRequest(location, new DateOnly(2026, month, 1));
            request.AddItem(keptVariant, 10m + month, 2m + (month * 0.25m));
            request.AddItem(droppedVariant, 5m, 3m);
            requests.Add(request);
        }

        var september = new OrderRequest(location, September);
        september.AddItem(keptVariant, 30m, 4m);
        september.AddItem(addedVariant, 8m, 12.5m);
        requests.Add(september);

        db.OrderRequests.AddRange(requests);
        await db.SaveChangesAsync(None);
        db.ChangeTracker.Clear();

        return new World(location.Id, location.Name, september.Id);
    }
}
