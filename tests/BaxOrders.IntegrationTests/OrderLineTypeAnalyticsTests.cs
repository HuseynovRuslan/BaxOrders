using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Decisions;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// What the monthly comparison is allowed to look at, against a real PostgreSQL.
/// </summary>
/// <remarks>
/// The feature exists to stop a one-off purchase from reading as a rise in demand. So what is pinned here is
/// the population, not the arithmetic: the comparison sees monthly lines and nothing else, the month's own
/// total still accounts for every line, and a line nobody has classified is in neither subtotal — it is the
/// absence of an answer, and folding it into either would be the guess this column exists to prevent.
/// </remarks>
/// <remarks>
/// A database of this class's own. Three of these assertions are about the company's whole month — the
/// summary is company-wide by design, whatever the search — and a shared database carrying other tests'
/// objects cannot give an exact figure for that.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class OrderLineTypeAnalyticsTests : IAsyncLifetime
{
    private static readonly CancellationToken None = CancellationToken.None;
    private IsolatedDatabase? _database;
    private static readonly DateOnly June = new(2026, 6, 1);
    private static readonly DateOnly July = new(2026, 7, 1);

    /// <summary>
    /// July's planned material is the same 10 × 5,00 as June's. Beside it sits a 200,00 one-off. Without the
    /// classification the month reads as a 200,00 rise; with it, the comparison says what is true — nothing
    /// about the monthly order changed.
    /// </summary>
    [PostgresFact]
    public async Task A_one_off_purchase_is_not_a_rise_in_the_monthly_order()
    {
        await using var db = _database!.CreateContext();
        var world = await WorldAsync(
            db,
            june: [(10m, 5m, OrderLineType.Monthly)],
            july: [(10m, 5m, OrderLineType.Monthly), (1m, 200m, OrderLineType.OutsideMonthly)]);

        var row = await RowAsync(db, world);

        Assert.Equal(50m, row.Current.KnownAmount);
        Assert.Equal(50m, row.Baseline.KnownAmount);
        Assert.Equal(0m, row.KnownAmountDelta);
        Assert.Equal(1, row.Current.ItemCount);
    }

    /// <summary>
    /// The same month through the order's own decision screen: the ad-hoc line is not a new product, and no
    /// driver is made of it.
    /// </summary>
    [PostgresFact]
    public async Task The_decision_context_names_no_driver_for_a_line_ordered_outside_the_plan()
    {
        await using var db = _database!.CreateContext();
        var world = await WorldAsync(
            db,
            june: [(10m, 5m, OrderLineType.Monthly)],
            july: [(10m, 5m, OrderLineType.Monthly), (1m, 200m, OrderLineType.OutsideMonthly)]);

        var context = await new OrderDecisionContextQueries(db)
            .GetAsync(world.JulyRequestId, new DecisionContextQuery(), None);

        Assert.NotNull(context);

        // The month's own figure on this screen is the monthly lines: the 200,00 one-off is not in it, and
        // there is nothing for the comparison to explain, because nothing about the monthly order moved.
        Assert.Equal(50m, context.Current.KnownAmount);
        Assert.Equal(1, context.Current.ItemCount);
        Assert.Equal(0m, context.Primary.DeltaAmount);
        Assert.Equal(50m, context.Primary.BaselineKnownAmount);
    }

    /// <summary>
    /// The month's headline still accounts for every line: 50,00 planned, 200,00 on top, 30,00 nobody has
    /// classified. The three do not overlap and they add up to the month.
    /// </summary>
    [PostgresFact]
    public async Task The_month_splits_into_three_populations_that_add_up_to_it()
    {
        await using var db = _database!.CreateContext();
        var world = await WorldAsync(
            db,
            june: null,
            july:
            [
                (10m, 5m, OrderLineType.Monthly),
                (1m, 200m, OrderLineType.OutsideMonthly),
                (3m, 10m, OrderLineType.Unclassified),
            ]);

        var split = (await DashboardAsync(db, world)).Summary.LineTypes;

        Assert.Equal(50m, split.Monthly.KnownAmount);
        Assert.Equal(200m, split.OutsideMonthly.KnownAmount);
        Assert.Equal(30m, split.Unclassified.KnownAmount);
        Assert.Equal(280m, split.Monthly.KnownAmount + split.OutsideMonthly.KnownAmount + split.Unclassified.KnownAmount);
        Assert.Equal(1, split.Monthly.ItemCount);
        Assert.Equal(1, split.OutsideMonthly.ItemCount);
        Assert.Equal(1, split.Unclassified.ItemCount);
    }

    [PostgresFact]
    public async Task A_line_nobody_has_classified_is_in_neither_subtotal_and_is_counted_where_it_can_be_seen()
    {
        await using var db = _database!.CreateContext();
        var world = await WorldAsync(
            db,
            june: null,
            july: [(10m, 5m, OrderLineType.Monthly), (3m, 10m, OrderLineType.Unclassified)]);

        var summary = (await DashboardAsync(db, world)).Summary;

        Assert.Equal(50m, summary.LineTypes.Monthly.KnownAmount);
        Assert.Null(summary.LineTypes.OutsideMonthly.KnownAmount);
        Assert.Equal(30m, summary.LineTypes.Unclassified.KnownAmount);
        Assert.Equal(1, summary.LineTypes.UnclassifiedItemCount);

        // And it is nowhere near the comparison: the monthly figure is the monthly lines alone.
        Assert.Equal(50m, summary.Current.KnownAmount);
    }

    /// <summary>
    /// One request, both kinds, which is the whole reason the classification is on the line: of the 143
    /// requests the source workbook classifies, 59 hold both.
    /// </summary>
    [PostgresFact]
    public async Task One_request_holds_both_kinds_and_each_line_keeps_its_own()
    {
        await using var db = _database!.CreateContext();
        var world = await WorldAsync(
            db,
            june: null,
            july: [(10m, 5m, OrderLineType.Monthly), (1m, 200m, OrderLineType.OutsideMonthly)]);

        var kinds = await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.OrderRequestId == world.JulyRequestId)
            .Select(item => item.OrderLineType)
            .ToListAsync(None);

        Assert.Equal(
            [OrderLineType.Monthly, OrderLineType.OutsideMonthly],
            kinds.Order().ToList());
    }

    /// <summary>
    /// The population moved; the arithmetic did not. Ten units at 5,00 against twelve at 6,00 decomposes the
    /// same way it always has — 10,00 of quantity, 12,00 of price, the interaction with the price — whether or
    /// not an ad-hoc line is sitting beside it in the same request.
    /// </summary>
    [PostgresFact]
    public async Task The_decomposition_is_unchanged_by_an_ad_hoc_line_sitting_beside_it()
    {
        await using var db = _database!.CreateContext();

        var alone = await WorldAsync(db, june: [(10m, 5m, OrderLineType.Monthly)], july: [(12m, 6m, OrderLineType.Monthly)]);
        var beside = await WorldAsync(
            db,
            june: [(10m, 5m, OrderLineType.Monthly)],
            july: [(12m, 6m, OrderLineType.Monthly), (1m, 200m, OrderLineType.OutsideMonthly)]);

        var (first, second) = (await RowAsync(db, alone), await RowAsync(db, beside));

        Assert.Equal(72m, first.Current.KnownAmount);
        Assert.Equal(22m, first.KnownAmountDelta);
        Assert.Equal(first.Current.KnownAmount, second.Current.KnownAmount);
        Assert.Equal(first.KnownAmountDelta, second.KnownAmountDelta);
        Assert.Equal(first.PrimaryCause, second.PrimaryCause);
        Assert.Equal(first.PrimaryCauseAmount, second.PrimaryCauseAmount);
        Assert.Equal(
            first.Causes.Select(cause => (cause.Category, cause.Amount)),
            second.Causes.Select(cause => (cause.Category, cause.Amount)));
    }

    /// <summary>
    /// The list a manager opens from the figure: it holds the ad-hoc lines and nothing else, and it answers
    /// which object, which product and how much without inventing a comparison for any of them.
    /// </summary>
    [PostgresFact]
    public async Task The_ad_hoc_list_holds_only_the_lines_ordered_outside_the_plan()
    {
        await using var db = _database!.CreateContext();
        await WorldAsync(
            db,
            june: null,
            july:
            [
                (10m, 5m, OrderLineType.Monthly),
                (1m, 200m, OrderLineType.OutsideMonthly),
                (2m, 30m, OrderLineType.OutsideMonthly),
                (3m, 10m, OrderLineType.Unclassified),
            ]);

        var list = await new OutsideMonthlyQueries(db).GetAsync(July, None);

        Assert.Equal(2, list.LineCount);
        Assert.Equal(260m, list.KnownAmount);
        Assert.Equal(0, list.MissingPriceLineCount);

        var location = Assert.Single(list.Locations);
        Assert.Equal(2, location.LineCount);
        Assert.Equal(260m, location.KnownAmount);

        // Biggest first: the question is where the month's ad-hoc money went.
        Assert.Equal([200m, 60m], location.Lines.Select(line => line.KnownAmount).ToList());
    }

    [PostgresFact]
    public async Task A_month_with_nothing_ordered_outside_the_plan_answers_with_an_empty_list()
    {
        await using var db = _database!.CreateContext();
        await WorldAsync(db, june: null, july: [(10m, 5m, OrderLineType.Monthly)]);

        var list = await new OutsideMonthlyQueries(db).GetAsync(July, None);

        Assert.Equal(0, list.LineCount);
        Assert.Null(list.KnownAmount);
        Assert.Empty(list.Locations);
    }

    /// <summary>
    /// A line nobody has priced is not a line that cost nothing: it is counted and named, and the money above
    /// it stays the money that is known.
    /// </summary>
    [PostgresFact]
    public async Task An_unpriced_ad_hoc_line_is_counted_apart_and_never_totalled_as_zero()
    {
        await using var db = _database!.CreateContext();
        await WorldAsync(
            db,
            june: null,
            july: [(1m, 200m, OrderLineType.OutsideMonthly), (4m, null, OrderLineType.OutsideMonthly)]);

        var list = await new OutsideMonthlyQueries(db).GetAsync(July, None);

        Assert.Equal(2, list.LineCount);
        Assert.Equal(200m, list.KnownAmount);
        Assert.Equal(1, list.MissingPriceLineCount);
        Assert.Contains(list.Locations.Single().Lines, line => line.KnownAmount is null);
    }

    public async Task InitializeAsync()
    {
        if (PostgresDatabaseFixture.IsConfigured)
        {
            _database = await IsolatedDatabase.CreateAsync("baxorders_order_line_type");
        }
    }

    public async Task DisposeAsync()
    {
        if (_database is not null)
        {
            await _database.DisposeAsync();
        }
    }

    // ---- the world ------------------------------------------------------------------------------------

    private sealed record World(int LocationId, string LocationName, long JulyRequestId);

    private static async Task<ManagementDashboardDto> DashboardAsync(BaxOrdersDbContext db, World world) =>
        (await new ManagementDashboardQueries(db).GetAsync(
            July, new DashboardQuery(Search: world.LocationName, PageSize: 100), None))!;

    private static async Task<LocationDashboardRowDto> RowAsync(BaxOrdersDbContext db, World world) =>
        (await DashboardAsync(db, world)).Rows.Items.Single(row => row.LocationId == world.LocationId);

    private static async Task<World> WorldAsync(
        BaxOrdersDbContext db,
        (decimal Quantity, decimal? Price, OrderLineType Type)[]? june,
        (decimal Quantity, decimal? Price, OrderLineType Type)[] july)
    {
        var tag = Guid.NewGuid().ToString("N")[..6];
        var (location, variants) = await CatalogueAsync(db, tag, Math.Max(june?.Length ?? 0, july.Length));

        var requests = new List<OrderRequest>();
        if (june is not null)
        {
            var juneRequest = new OrderRequest(location, June);
            for (var index = 0; index < june.Length; index++)
            {
                juneRequest.AddItem(
                    variants[index], june[index].Quantity, june[index].Price, orderLineType: june[index].Type);
            }

            requests.Add(juneRequest);
        }

        var julyRequest = new OrderRequest(location, July);
        for (var index = 0; index < july.Length; index++)
        {
            julyRequest.AddItem(
                variants[index], july[index].Quantity, july[index].Price, orderLineType: july[index].Type);
        }

        requests.Add(julyRequest);
        db.OrderRequests.AddRange(requests);
        await db.SaveChangesAsync(None);

        return new World(location.Id, location.Name, julyRequest.Id);
    }

    private static async Task<(Location Location, List<ProductVariant> Variants)> CatalogueAsync(
        BaxOrdersDbContext db, string tag, int count)
    {
        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Növ obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync(None);

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS", None);
        var codes = new PostgresProductCodeGenerator(db);
        var products = new List<Product>();
        for (var index = 0; index < Math.Max(1, count); index++)
        {
            products.Add(new Product(await codes.NextAsync(None), $"Növ malı {index} {tag}"));
        }

        db.Products.AddRange(products);
        await db.SaveChangesAsync(None);

        var variants = products.Select(product => product.AddVariant(null, null, null, pieces)).ToList();
        await db.SaveChangesAsync(None);
        return (location, variants);
    }
}
