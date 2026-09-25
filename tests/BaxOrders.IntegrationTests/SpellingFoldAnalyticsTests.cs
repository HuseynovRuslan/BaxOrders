using System.Text.Json;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Catalog.ProductMatches;
using BaxOrders.Application.Decisions;
using BaxOrders.Application.Reports;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Task 13b against a real PostgreSQL: an approved spelling match is one product in every analytics read — the order
/// page, the dashboard, the comparison endpoint and the product history — and no amount moves when it is approved,
/// rejected or undone.
/// </summary>
/// <remarks>
/// Each test builds a database of its own and drops it afterwards: an approval must be a current suggestion, and the
/// suggestion rule reads the whole catalogue, so a product another test left behind would change what it finds.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class SpellingFoldAnalyticsTests : IAsyncLifetime
{
    private static readonly CancellationToken None = CancellationToken.None;

    private static readonly AnalyticsComparisonBasis[] Bases =
    [
        AnalyticsComparisonBasis.PreviousMonth,
        AnalyticsComparisonBasis.Previous3MonthAverage,
        AnalyticsComparisonBasis.Previous6MonthAverage,
        AnalyticsComparisonBasis.AllPriorMonths,
    ];

    private IsolatedDatabase? _database;

    /// <summary>Acceptance 4 and criterion 2, before: two spellings are two products, as they are today.</summary>
    [PostgresFact]
    public async Task Before_approval_the_two_spellings_are_a_new_product_and_one_no_longer_ordered()
    {
        await using var db = _database!.CreateContext();
        var fixture = await Fixture.CreateAsync(db);

        var context = await ContextAsync(db, fixture.LampaSeptemberOrderId);
        Assert.Equal((24.00m, 20.00m, 4.00m), (context.Current.KnownAmount, context.Primary.BaselineKnownAmount, context.Primary.DeltaAmount));
        Assert.Equal(
            [("Lampa 15W", ComparisonState.New, 24.00m), ("Lampa 15 W", ComparisonState.NoLongerOrdered, -20.00m)],
            context.Decomposition!.Drivers.Select(driver => (driver.Variant.ProductName, driver.State, driver.AmountImpact)));
        Assert.Equal((1, 1, 0), (context.Decomposition.Products.NewCount, context.Decomposition.Products.NoLongerOrderedCount, context.Decomposition.Products.IncreasedCount));

        var row = await DashboardRowAsync(db, fixture.LampaLocationId);
        Assert.Equal((1, 1, 0), (row.NewVariantCount, row.NoLongerOrderedVariantCount, row.IncreasedVariantCount));
        Assert.Equal((CauseCategory.NewOrders, "Lampa 15W"), (row.PrimaryCause, row.PrimaryCauseProduct!.ProductName));

        var comparison = await CompareAsync(db, fixture.LampaLocationId);
        Assert.Equal(
            [("Lampa 15 W", ComparisonState.NoLongerOrdered), ("Lampa 15W", ComparisonState.New)],
            comparison.Rows.Items.Select(item => (item.Variant.ProductName, item.State)));

        // The history of "Lampa 15W" has a zero August: the object ordered that month, just not this spelling.
        var history = await TrendAsync(db, fixture.LampaLocationId, fixture.Variant("Lampa 15W"));
        Assert.Equal([(ProductMatchFixture.August, 0m, 0), (ProductMatchFixture.September, 12m, 1)], Points(history));
    }

    /// <summary>
    /// Acceptance 5 and criterion 2: once the administrator approves the spelling match, keeping "Lampa 15W", the order
    /// page, the dashboard and the comparison endpoint see one product whose quantity went up — and agree.
    /// </summary>
    [PostgresFact]
    public async Task After_approval_the_two_spellings_are_one_product_on_the_order_page_the_dashboard_and_the_comparison()
    {
        await using var db = _database!.CreateContext();
        var fixture = await Fixture.CreateAsync(db);
        await ApproveLampaAsync(db, fixture);

        var context = await ContextAsync(db, fixture.LampaSeptemberOrderId);
        Assert.Equal((24.00m, 20.00m, 4.00m), (context.Current.KnownAmount, context.Primary.BaselineKnownAmount, context.Primary.DeltaAmount));
        var driver = Assert.Single(context.Decomposition!.Drivers);
        Assert.Equal(
            (fixture.Variant("Lampa 15W"), "Lampa 15W", ComparisonState.Increased, CauseCategory.QuantityChange),
            (driver.Variant.ProductVariantId, driver.Variant.ProductName, driver.State, driver.Category));
        Assert.Equal((12m, 10m, 4.00m), (driver.CurrentQuantity, driver.BaselineQuantity, driver.AmountImpact));
        Assert.Equal((1, 1), (driver.CurrentItemCount, driver.BaselineItemCount));
        Assert.Empty(context.Decomposition.Steady);
        Assert.Equal((0, 0, 1, 1), (context.Decomposition.Products.NewCount, context.Decomposition.Products.NoLongerOrderedCount, context.Decomposition.Products.IncreasedCount, context.Decomposition.Products.ComparedCount));
        Assert.Equal(4.00m, Category(context, CauseCategory.QuantityChange));
        Assert.Equal(0m, Category(context, CauseCategory.NewOrders));
        Assert.Equal(0m, Category(context, CauseCategory.NoLongerOrdered));

        var row = await DashboardRowAsync(db, fixture.LampaLocationId);
        Assert.Equal((0, 0, 1), (row.NewVariantCount, row.NoLongerOrderedVariantCount, row.IncreasedVariantCount));
        Assert.Equal((CauseCategory.QuantityChange, 4.00m), (row.PrimaryCause, row.PrimaryCauseAmount));
        Assert.Equal((fixture.Variant("Lampa 15W"), "Lampa 15W", 4.00m), (row.PrimaryCauseProduct!.ProductVariantId, row.PrimaryCauseProduct.ProductName, row.PrimaryCauseProduct.Amount));
        Assert.Equal(context.Primary.DeltaAmount, row.KnownAmountDelta);

        var comparison = await CompareAsync(db, fixture.LampaLocationId);
        var only = Assert.Single(comparison.Rows.Items);
        Assert.Equal(("Lampa 15W", ComparisonState.Increased, 2m, 4.00m), (only.Variant.ProductName, only.State, only.Delta.QuantityDelta, only.Delta.AmountDelta));
        Assert.Equal((0, 0, 1), (comparison.Summary.NewVariantCount, comparison.Summary.NoLongerOrderedVariantCount, comparison.Summary.IncreasedVariantCount));
        Assert.Equal(context.Primary.DeltaAmount, comparison.Summary.KnownAmountDelta);

        // The comparison endpoint's search now finds the one row by the kept spelling.
        var found = await new OrderAnalyticsQueries(db).CompareAsync(
            fixture.LampaLocationId, ProductMatchFixture.September, new ComparisonQuery(Search: "lampa 15w"), None);
        Assert.Equal(1, found!.Rows.TotalCount);

        // The lines themselves are untouched: each is still under its own spelling.
        Assert.Equal(
            [fixture.Variant("Lampa 15 W"), fixture.Variant("Lampa 15W")],
            await db.OrderRequestItems.AsNoTracking()
                .Where(item => item.OrderRequest.LocationId == fixture.LampaLocationId)
                .OrderBy(item => item.OrderRequest.RequestPeriod)
                .Select(item => item.ProductVariantId)
                .ToListAsync());
    }

    /// <summary>Acceptance 5: "malın tarixçəsində bir mal görürəm" — asked for by either spelling.</summary>
    [PostgresFact]
    public async Task After_approval_the_history_of_either_spelling_is_one_product_under_the_kept_name()
    {
        await using var db = _database!.CreateContext();
        var fixture = await Fixture.CreateAsync(db);
        await ApproveLampaAsync(db, fixture);

        foreach (var asked in new[] { fixture.Variant("Lampa 15W"), fixture.Variant("Lampa 15 W") })
        {
            var history = await TrendAsync(db, fixture.LampaLocationId, asked);

            Assert.Equal((fixture.Variant("Lampa 15W"), "Lampa 15W"), (history.Variant.ProductVariantId, history.Variant.ProductName));
            Assert.Equal([(ProductMatchFixture.August, 10m, 1), (ProductMatchFixture.September, 12m, 1)], Points(history));
            Assert.Equal([20.00m, 24.00m], history.Points.Select(point => point.KnownAmount));
            Assert.Equal(2, history.Frequency.OrderedMonthCount);
        }
    }

    /// <summary>Acceptance 7 and criterion 4 on this fixture: no amount moves, on any basis, at any step.</summary>
    [PostgresFact]
    public async Task No_amount_moves_on_any_basis_before_approval_after_it_and_after_its_undo()
    {
        await using var db = _database!.CreateContext();
        var fixture = await Fixture.CreateAsync(db);
        long[] orders = [fixture.LampaSeptemberOrderId, fixture.PriceSeptemberOrderId];
        int[] locations = [fixture.LampaLocationId, fixture.PriceLocationId];

        var service = Service(db, await TestCurrentUser.AdminAsync(db));

        var before = await MoneyAsync(db, orders, locations, ProductMatchFixture.September);
        var decisions = await ApproveAllAsync(service, fixture);
        var afterApproval = await MoneyAsync(db, orders, locations, ProductMatchFixture.September);
        foreach (var decision in decisions)
        {
            await service.UndoAsync(decision, new UndoProductMatchCommand(), None);
        }

        var afterUndo = await MoneyAsync(db, orders, locations, ProductMatchFixture.September);

        Assert.Equal(before, afterApproval);
        Assert.Equal(before, afterUndo);
    }

    /// <summary>Acceptance 8 and criterion 5: undoing the approval restores every response, byte for byte.</summary>
    [PostgresFact]
    public async Task Undoing_the_approval_restores_every_analytics_response_byte_for_byte()
    {
        await using var db = _database!.CreateContext();
        var fixture = await Fixture.CreateAsync(db);

        var service = Service(db, await TestCurrentUser.AdminAsync(db));

        var before = await ResponsesAsync(db, fixture);
        var decisions = await ApproveAllAsync(service, fixture);
        var afterApproval = await ResponsesAsync(db, fixture);
        foreach (var decision in decisions)
        {
            await service.UndoAsync(decision, new UndoProductMatchCommand("səhv təsdiq"), None);
        }

        var afterUndo = await ResponsesAsync(db, fixture);

        Assert.NotEqual(before, afterApproval);
        Assert.Equal(before, afterUndo);
    }

    /// <summary>Acceptance 4 and criterion 3: a rejected pair, and an undone rejection, fold nothing.</summary>
    [PostgresFact]
    public async Task A_rejected_pair_stays_two_products_everywhere()
    {
        await using var db = _database!.CreateContext();
        var fixture = await Fixture.CreateAsync(db);
        var service = Service(db, await TestCurrentUser.AdminAsync(db));

        var before = await ResponsesAsync(db, fixture);
        var rejected = await service.RejectAsync(
            new RejectProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Lampa 15 W"), fixture.Variant("Lampa 15W")), None);
        var afterRejection = await ResponsesAsync(db, fixture);
        await service.UndoAsync(rejected.Id, new UndoProductMatchCommand(), None);
        var afterUndo = await ResponsesAsync(db, fixture);

        Assert.Equal(before, afterRejection);
        Assert.Equal(before, afterUndo);
    }

    /// <summary>
    /// Criterion 6, Task 2's price states: an owed missing price is still owed and still counted once, and internal
    /// supply is still neutral and never counted as missing.
    /// </summary>
    [PostgresFact]
    public async Task A_folded_pair_keeps_its_owed_missing_price_and_its_internal_supply()
    {
        await using var db = _database!.CreateContext();
        var fixture = await Fixture.CreateAsync(db);

        var before = await ContextAsync(db, fixture.PriceSeptemberOrderId);
        Assert.Equal(2, Rows(before).Count(row => row.Variant.ProductName.StartsWith("Kaplin", StringComparison.Ordinal)));
        Assert.Equal(2, Rows(before).Count(row => row.Variant.ProductName.StartsWith("Vedrə", StringComparison.Ordinal)));

        await ApproveAllAsync(Service(db, await TestCurrentUser.AdminAsync(db)), fixture);
        var after = await ContextAsync(db, fixture.PriceSeptemberOrderId);

        // The order's own counts and money do not move.
        Assert.Equal((1, 1), (after.Current.MissingPriceItemCount, after.Current.PriceNotRequiredItemCount));
        Assert.Equal((10.00m, 25.00m, -15.00m), (after.Current.KnownAmount, after.Primary.BaselineKnownAmount, after.Primary.DeltaAmount));
        Assert.Equal(
            (before.Current, before.Primary.DeltaAmount, before.Primary.BaselineMissingPriceItemCount),
            (after.Current, after.Primary.DeltaAmount, after.Primary.BaselineMissingPriceItemCount));
        Assert.False(after.Decomposition!.ExplanationIsComplete);

        // "Kaplin 3\4" (September, no price, owed) now counts as "Kaplin 3/4" (August, priced): one product, still
        // unattributed, its one owed line still counted.
        var kaplin = Assert.Single(Rows(after), row => row.Variant.ProductName.StartsWith("Kaplin", StringComparison.Ordinal));
        Assert.Equal(("Kaplin 3/4", CauseCategory.UnattributedDueToMissingPrice, 1, false), (kaplin.Variant.ProductName, kaplin.Category, kaplin.MissingPriceItemCount, kaplin.PriceIsComplete));
        Assert.Equal(-15.00m, kaplin.AmountImpact);
        Assert.Contains(after.Decomposition.Drivers, row => row.Variant.ProductVariantId == kaplin.Variant.ProductVariantId);

        // "Vedrə 10L" now counts as "Vedrə 10 L": one product, internal supply, nothing missing.
        var vedre = Assert.Single(Rows(after), row => row.Variant.ProductName.StartsWith("Vedrə", StringComparison.Ordinal));
        Assert.Equal(("Vedrə 10 L", CauseCategory.InternalSupply, 0, 2, true), (vedre.Variant.ProductName, vedre.Category, vedre.MissingPriceItemCount, vedre.PriceNotRequiredItemCount, vedre.PriceIsComplete));
        Assert.Equal((0m, ComparisonState.Increased), (vedre.AmountImpact, vedre.State));
        Assert.Equal((1, 1), (after.Decomposition.UnattributedVariantCount, after.Decomposition.InternalSupplyVariantCount));

        var row = await DashboardRowAsync(db, fixture.PriceLocationId);
        Assert.Equal((1, 1, false), (row.Current.MissingPriceItemCount, row.Current.PriceNotRequiredItemCount, row.ExplanationIsComplete));

        // The history is one product too: August priced, September owed and still counted as owed.
        var history = await TrendAsync(db, fixture.PriceLocationId, fixture.Variant("Kaplin 3\\4"));
        Assert.Equal("Kaplin 3/4", history.Variant.ProductName);
        Assert.Equal([(0, 1), (1, 0)], history.Points.Select(point => (point.MissingRequiredPriceItemCount, point.KnownPriceItemCount)));
    }

    /// <summary>
    /// Criteria 4 and 7 on 13a's Heydər Əliyev fixture: a variant link folds nothing (13c's line, not 13b's), and a
    /// spelling match moves no amount — before, after and after the undo, on every basis.
    /// </summary>
    [PostgresFact]
    public async Task On_the_briefs_example_a_variant_link_folds_nothing_and_a_spelling_match_moves_no_amount()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var service = Service(db, await TestCurrentUser.AdminAsync(db));
        var hem = await db.Locations.AsNoTracking().Where(location => location.Code == "HEM").Select(location => location.Id).SingleAsync();
        var testObject = await db.Locations.AsNoTracking().Where(location => location.Name == "Sınaq obyekti 13a").Select(location => location.Id).SingleAsync();
        var june = new DateOnly(2026, 6, 1);
        var juneOrder = await db.OrderRequests.AsNoTracking()
            .Where(request => request.LocationId == testObject && request.RequestPeriod == june)
            .Select(request => request.Id)
            .SingleAsync();

        async Task<string> HemAsync()
        {
            var pieces = new List<object?>();
            foreach (var basis in Bases)
            {
                pieces.Add(await new OrderDecisionContextQueries(db).GetAsync(fixture.SeptemberOrderId, new DecisionContextQuery(basis), None));
                pieces.Add(await new ManagementDashboardQueries(db).GetAsync(ProductMatchFixture.September, new DashboardQuery(basis, PageSize: ManagementDashboardQueries.MaxPageSize), None));
                pieces.Add(await new OrderAnalyticsQueries(db).CompareAsync(hem, ProductMatchFixture.September, new ComparisonQuery(basis), None));
            }

            pieces.Add(await new OrderAnalyticsQueries(db).GetTrendAsync(hem, fixture.Variant("Sabun elano"), new TrendQuery(), None));
            pieces.Add(await new OrderAnalyticsQueries(db).GetTrendAsync(hem, fixture.Variant("Sabun elano lavanda ətirli"), new TrendQuery(), None));
            pieces.Add(await new MonthlyReportQueries(db).GetAsync(new MonthlyReportQuery(2026), None));
            return Json(pieces);
        }

        // Criterion 7: the variant link, alone, changes nothing at all.
        var before = await HemAsync();
        var link = await service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano")), None);
        Assert.Equal(before, await HemAsync());

        var context = await ContextAsync(db, fixture.SeptemberOrderId);
        Assert.Equal((750.00m, 750.00m, 0.00m), (context.Current.KnownAmount, context.Primary.BaselineKnownAmount, context.Primary.DeltaAmount));
        Assert.Equal(
            [("Sabun elano", ComparisonState.NoLongerOrdered, -750.00m), ("Sabun elano lavanda ətirli", ComparisonState.New, 750.00m)],
            context.Decomposition!.Drivers
                .Select(driver => (driver.Variant.ProductName, driver.State, driver.AmountImpact))
                .OrderBy(driver => driver.ProductName, StringComparer.Ordinal));

        // Criterion 4: add a spelling match at the test object — its June order is one where the two spellings meet.
        var moneyBefore = await MoneyAsync(db, [fixture.SeptemberOrderId, juneOrder], [hem, testObject], june);
        var spelling = await service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Lampa 15 W"), fixture.Variant("Lampa 15W")), None);
        var moneyAfter = await MoneyAsync(db, [fixture.SeptemberOrderId, juneOrder], [hem, testObject], june);
        await service.UndoAsync(spelling.Id, new UndoProductMatchCommand(), None);
        await service.UndoAsync(link.Id, new UndoProductMatchCommand(), None);

        Assert.Equal(moneyBefore, moneyAfter);
        Assert.Equal(moneyBefore, await MoneyAsync(db, [fixture.SeptemberOrderId, juneOrder], [hem, testObject], june));
        Assert.Equal(before, await HemAsync());
    }

    public async Task InitializeAsync()
    {
        if (PostgresDatabaseFixture.IsConfigured)
        {
            _database = await IsolatedDatabase.CreateAsync("baxorders_fold");
        }
    }

    public async Task DisposeAsync()
    {
        if (_database is not null)
        {
            await _database.DisposeAsync();
        }
    }

    // ---- helpers -------------------------------------------------------------------------------------------

    private static ProductMatchService Service(BaxOrdersDbContext db, ICurrentUserContext user) =>
        new(db, user, new PostgresProductMatchLock(db));

    private static async Task ApproveLampaAsync(BaxOrdersDbContext db, Fixture fixture) =>
        await Service(db, await TestCurrentUser.AdminAsync(db)).ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Lampa 15 W"), fixture.Variant("Lampa 15W")), None);

    /// <summary>Every spelling match of the fixture, approved by an administrator. Returns the decisions.</summary>
    private static async Task<long[]> ApproveAllAsync(ProductMatchService service, Fixture fixture)
    {
        var decisions = new List<long>();
        foreach (var (source, target) in new[] { ("Lampa 15 W", "Lampa 15W"), ("Kaplin 3\\4", "Kaplin 3/4"), ("Vedrə 10L", "Vedrə 10 L") })
        {
            var decision = await service.ApproveAsync(
                new ApproveProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant(source), fixture.Variant(target)), None);
            decisions.Add(decision.Id);
        }

        return [.. decisions];
    }

    private static async Task<OrderDecisionContextDto> ContextAsync(BaxOrdersDbContext db, long orderId) =>
        (await new OrderDecisionContextQueries(db).GetAsync(orderId, new DecisionContextQuery(), None))!;

    private static async Task<LocationDashboardRowDto> DashboardRowAsync(BaxOrdersDbContext db, int locationId)
    {
        var dashboard = await new ManagementDashboardQueries(db).GetAsync(
            ProductMatchFixture.September, new DashboardQuery(PageSize: ManagementDashboardQueries.MaxPageSize), None);
        return dashboard!.Rows.Items.Single(row => row.LocationId == locationId);
    }

    private static async Task<LocationComparisonDto> CompareAsync(BaxOrdersDbContext db, int locationId) =>
        (await new OrderAnalyticsQueries(db).CompareAsync(locationId, ProductMatchFixture.September, new ComparisonQuery(), None))!;

    private static async Task<VariantTrendDto> TrendAsync(BaxOrdersDbContext db, int locationId, long variantId) =>
        (await new OrderAnalyticsQueries(db).GetTrendAsync(locationId, variantId, new TrendQuery(), None))!;

    private static IEnumerable<(DateOnly, decimal?, int)> Points(VariantTrendDto history) =>
        history.Points.Select(point => (point.Period, point.Quantity, point.ItemCount));

    private static IEnumerable<DecisionDriverDto> Rows(OrderDecisionContextDto context) =>
        context.Decomposition!.Drivers.Concat(context.Decomposition.Steady);

    private static decimal Category(OrderDecisionContextDto context, CauseCategory category) =>
        context.Decomposition!.Categories.Single(item => item.Category == category).Amount;

    private static string Json(object? value) => JsonSerializer.Serialize(value);

    /// <summary>
    /// Every money figure and every line count of these orders, their objects and the whole month, on every basis:
    /// the figures that must not move whatever is approved. The split between products and causes is left out — that
    /// is what an approval is allowed to change — and the causes are checked to add up to the difference instead.
    /// </summary>
    private static async Task<string> MoneyAsync(
        BaxOrdersDbContext db, long[] orderIds, int[] locationIds, DateOnly period)
    {
        var pieces = new List<object?>();
        foreach (var basis in Bases)
        {
            foreach (var orderId in orderIds)
            {
                var context = (await new OrderDecisionContextQueries(db).GetAsync(orderId, new DecisionContextQuery(basis), None))!;
                pieces.Add(new { context.Current, context.Primary, context.Secondary });
                if (context.Decomposition is { } decomposition)
                {
                    if (context.Primary.DeltaAmount is { } delta)
                    {
                        Assert.Equal(delta, decomposition.TotalAmountImpact);
                    }

                    Assert.Equal(decomposition.TotalAmountImpact, decomposition.Categories.Sum(category => category.Amount));
                }
            }

            var dashboard = (await new ManagementDashboardQueries(db).GetAsync(
                period, new DashboardQuery(basis, PageSize: ManagementDashboardQueries.MaxPageSize), None))!;
            pieces.Add(new
            {
                dashboard.Summary.Current,
                dashboard.Summary.ComparedCurrent,
                dashboard.Summary.Baseline,
                dashboard.Summary.KnownAmountDelta,
                dashboard.Summary.KnownAmountPercentChange,
                dashboard.Summary.Partition,
                dashboard.Summary.LocationsWithMissingPrices,
            });
            pieces.AddRange(dashboard.Rows.Items.Select(row => new
            {
                row.LocationId,
                row.Current,
                row.Baseline,
                row.KnownAmountDelta,
                row.KnownAmountPercentChange,
                Causes = row.Causes.Sum(cause => cause.Amount),
            }));

            foreach (var locationId in locationIds)
            {
                var comparison = await new OrderAnalyticsQueries(db).CompareAsync(locationId, period, new ComparisonQuery(basis), None);
                pieces.Add(comparison is null ? null : new
                {
                    comparison.Summary.CurrentItemCount,
                    comparison.Summary.BaselineAverageItemCount,
                    comparison.Summary.CurrentKnownAmountTotal,
                    comparison.Summary.BaselineKnownAmountTotal,
                    comparison.Summary.KnownAmountDelta,
                    comparison.Summary.KnownAmountPercentChange,
                    comparison.Summary.CurrentMissingPriceItemCount,
                    comparison.Summary.BaselineMissingPriceItemCount,
                    comparison.Summary.CurrentPriceNotRequiredItemCount,
                    comparison.Summary.BaselinePriceNotRequiredItemCount,
                    comparison.Summary.AmountIsComplete,
                });
            }
        }

        pieces.Add(await new MonthlyReportQueries(db).GetAsync(new MonthlyReportQuery(2026), None));
        return Json(pieces);
    }

    /// <summary>Every analytics response of the fixture, whole, as the screens receive them.</summary>
    private static async Task<string> ResponsesAsync(BaxOrdersDbContext db, Fixture fixture)
    {
        var pieces = new List<object?>();
        foreach (var basis in Bases)
        {
            pieces.Add(await new OrderDecisionContextQueries(db).GetAsync(fixture.LampaSeptemberOrderId, new DecisionContextQuery(basis), None));
            pieces.Add(await new OrderDecisionContextQueries(db).GetAsync(fixture.PriceSeptemberOrderId, new DecisionContextQuery(basis), None));
            pieces.Add(await new ManagementDashboardQueries(db).GetAsync(ProductMatchFixture.September, new DashboardQuery(basis, PageSize: ManagementDashboardQueries.MaxPageSize), None));
            pieces.Add(await new OrderAnalyticsQueries(db).CompareAsync(fixture.LampaLocationId, ProductMatchFixture.September, new ComparisonQuery(basis), None));
            pieces.Add(await new OrderAnalyticsQueries(db).CompareAsync(fixture.PriceLocationId, ProductMatchFixture.September, new ComparisonQuery(basis), None));
        }

        foreach (var (name, locationId) in fixture.Histories)
        {
            pieces.Add(await new OrderAnalyticsQueries(db).GetTrendAsync(locationId, fixture.Variant(name), new TrendQuery(), None));
        }

        pieces.Add(await new MonthlyReportQueries(db).GetAsync(new MonthlyReportQuery(2026), None));
        return Json(pieces);
    }

    /// <summary>
    /// Two objects of their own. The first ordered "Lampa 15 W" 10 ədəd × 2.00 in August and "Lampa 15W" 12 ədəd ×
    /// 2.00 in September. The second ordered "Kaplin 3/4" 5 × 3.00 and "Vedrə 10 L" 4 from the company's own store in
    /// August, and "Kaplin 3\4" 5 with no price (owed) and "Vedrə 10L" 6 from the store in September; "Əlcək" 10 × 1.00
    /// both months, so each month has money and the difference is a number (−15.00).
    /// </summary>
    private sealed class Fixture
    {
        private readonly Dictionary<string, long> _variants = new(StringComparer.Ordinal);

        public int LampaLocationId { get; private set; }

        public long LampaSeptemberOrderId { get; private set; }

        public int PriceLocationId { get; private set; }

        public long PriceSeptemberOrderId { get; private set; }

        /// <summary>Every spelling at the object that ordered it.</summary>
        public IEnumerable<(string Name, int LocationId)> Histories =>
        [
            ("Lampa 15 W", LampaLocationId), ("Lampa 15W", LampaLocationId),
            ("Kaplin 3/4", PriceLocationId), ("Kaplin 3\\4", PriceLocationId),
            ("Vedrə 10 L", PriceLocationId), ("Vedrə 10L", PriceLocationId),
        ];

        public long Variant(string name) => _variants[name];

        public static async Task<Fixture> CreateAsync(BaxOrdersDbContext db)
        {
            var fixture = new Fixture();
            var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
            var variants = new Dictionary<string, ProductVariant>(StringComparer.Ordinal);
            foreach (var name in new[] { "Lampa 15 W", "Lampa 15W", "Kaplin 3/4", "Kaplin 3\\4", "Vedrə 10 L", "Vedrə 10L", "Əlcək" })
            {
                var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(CancellationToken.None), name);
                db.Products.Add(product);
                await db.SaveChangesAsync();
                variants[name] = product.AddVariant(null, null, null, pieces);
                await db.SaveChangesAsync();
                fixture._variants[name] = variants[name].Id;
            }

            var store = new Supplier("Anbar 13b");
            db.Suppliers.Add(store);
            await db.SaveChangesAsync();
            store.ChangePriceRequirement(SupplierPriceRequirement.NotRequired);
            await db.SaveChangesAsync();

            var lampa = await LocationAsync(db, "Sınaq obyekti 13b");
            var price = await LocationAsync(db, "Sınaq obyekti 13b qiymət");
            fixture.LampaLocationId = lampa.Id;
            fixture.PriceLocationId = price.Id;

            var lampaAugust = new OrderRequest(lampa, ProductMatchFixture.August);
            lampaAugust.AddItem(variants["Lampa 15 W"], 10m, 2.00m);
            var lampaSeptember = new OrderRequest(lampa, ProductMatchFixture.September);
            lampaSeptember.AddItem(variants["Lampa 15W"], 12m, 2.00m);

            var priceAugust = new OrderRequest(price, ProductMatchFixture.August);
            priceAugust.AddItem(variants["Kaplin 3/4"], 5m, 3.00m);
            priceAugust.AddItem(variants["Vedrə 10 L"], 4m, null, store);
            priceAugust.AddItem(variants["Əlcək"], 10m, 1.00m);
            var priceSeptember = new OrderRequest(price, ProductMatchFixture.September);
            priceSeptember.AddItem(variants["Kaplin 3\\4"], 5m, null);
            priceSeptember.AddItem(variants["Vedrə 10L"], 6m, null, store);
            priceSeptember.AddItem(variants["Əlcək"], 10m, 1.00m);

            db.OrderRequests.AddRange(lampaAugust, lampaSeptember, priceAugust, priceSeptember);
            await db.SaveChangesAsync();
            fixture.LampaSeptemberOrderId = lampaSeptember.Id;
            fixture.PriceSeptemberOrderId = priceSeptember.Id;

            db.ChangeTracker.Clear();
            return fixture;
        }

        private static async Task<Location> LocationAsync(BaxOrdersDbContext db, string name)
        {
            var location = new Location(await new PostgresLocationCodeGenerator(db).NextAsync(CancellationToken.None), name);
            db.Locations.Add(location);
            await db.SaveChangesAsync();
            return location;
        }
    }
}
