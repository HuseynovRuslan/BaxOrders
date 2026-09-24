using BaxOrders.Application.Analytics;
using BaxOrders.Application.Common;
using BaxOrders.Application.Decisions;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The read model behind the decision screen, against a real PostgreSQL. It answers three questions — what does
/// this order cost, how does it differ from the month before, and why — and the third one has to add up to the
/// second one exactly, because a manager approves money on the strength of it.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class OrderDecisionContextTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    // ---- the order it answers about ------------------------------------------------------------------

    [PostgresFact]
    public async Task It_describes_the_order_that_was_asked_for()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world.JulyRequestId);

        Assert.Equal(world.JulyRequestId, context.OrderRequestId);
        Assert.Equal(world.LocationId, context.LocationId);
        Assert.Equal(world.July, context.RequestPeriod);
        Assert.Equal(1, context.Version);
        Assert.Equal(OrderRequestStatus.Draft, context.Status);
        Assert.True(context.IsLatestVersion);
    }

    [PostgresFact]
    public async Task A_superseded_version_is_answered_about_itself_not_about_its_successor()
    {
        await using var db = database.CreateContext();
        var world = await VersionedWorldAsync(db);

        var first = await ContextAsync(db, world.FirstVersionId);

        // Version 1 ordered 10 at 1.00; version 2 ordered 40. Opening version 1 must show version 1's money.
        Assert.Equal(1, first.Version);
        Assert.False(first.IsLatestVersion);
        Assert.Equal(10m, first.Current.KnownAmount);
        Assert.Equal(world.SecondVersionId, first.LatestOrderRequestId);
        Assert.Equal(2, first.LatestVersion);
    }

    [PostgresFact]
    public async Task The_newest_version_says_so_and_offers_no_other()
    {
        await using var db = database.CreateContext();
        var world = await VersionedWorldAsync(db);

        var second = await ContextAsync(db, world.SecondVersionId);

        Assert.True(second.IsLatestVersion);
        Assert.Equal(40m, second.Current.KnownAmount);
    }

    [PostgresFact]
    public async Task An_order_that_does_not_exist_is_answered_with_nothing()
    {
        await using var db = database.CreateContext();

        Assert.Null(await new OrderDecisionContextQueries(db).GetAsync(-1, new DecisionContextQuery(), None));
    }

    // ---- the comparison ------------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_comparison_is_the_calendar_month_before()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world.JulyRequestId);

        Assert.Equal(AnalyticsComparisonBasis.PreviousMonth, context.Primary.Basis);
        Assert.True(context.Primary.Available);
        Assert.Equal(world.June, Assert.Single(context.Primary.WindowPeriods));
        Assert.Equal(world.JuneRequestId, Assert.Single(context.Primary.Periods).OrderRequestId);
        Assert.Equal(JuneAmount, context.Primary.BaselineKnownAmount);
        Assert.Equal(JulyAmount, context.Current.KnownAmount);
        Assert.Equal(JulyAmount - JuneAmount, context.Primary.DeltaAmount);
    }

    [PostgresFact]
    public async Task A_location_with_no_previous_month_is_told_so_rather_than_shown_everything_as_new()
    {
        await using var db = database.CreateContext();
        var world = await LonelyWorldAsync(db);

        var context = await ContextAsync(db, world.RequestId);

        Assert.False(context.Primary.Available);
        Assert.Empty(context.Primary.Periods);
        Assert.Null(context.Primary.DeltaAmount);
        // No baseline means no explanation at all — not an explanation that calls every product new.
        Assert.Null(context.Decomposition);
    }

    [PostgresFact]
    public async Task The_longer_windows_are_averages_of_the_months_that_exist()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world.JulyRequestId);

        // April, May, June are asked for; the world has no April, so the average rests on two months.
        Assert.Equal(3, Window(context, AnalyticsComparisonBasis.Previous3MonthAverage).ExpectedPeriodCount);
        Assert.Equal(2, Window(context, AnalyticsComparisonBasis.Previous3MonthAverage).AvailablePeriodCount);
        Assert.Equal(world.April, Assert.Single(Window(context, AnalyticsComparisonBasis.Previous3MonthAverage).MissingPeriods));
        Assert.Equal(
            Money.RoundCents((MayAmount + JuneAmount) / 2m),
            Window(context, AnalyticsComparisonBasis.Previous3MonthAverage).BaselineKnownAmount);
    }

    [PostgresFact]
    public async Task The_six_month_window_reaches_further_back_than_the_three_month_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world.JulyRequestId);

        Assert.Equal(6, Window(context, AnalyticsComparisonBasis.Previous6MonthAverage).ExpectedPeriodCount);
        Assert.Equal(3, Window(context, AnalyticsComparisonBasis.Previous6MonthAverage).AvailablePeriodCount);
        Assert.Equal(
            Money.RoundCents((MarchAmount + MayAmount + JuneAmount) / 3m),
            Window(context, AnalyticsComparisonBasis.Previous6MonthAverage).BaselineKnownAmount);
    }

    // ---- why it changed ------------------------------------------------------------------------------

    [PostgresFact]
    public async Task Every_cause_together_is_the_months_whole_difference()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world.JulyRequestId);
        var decomposition = context.Decomposition!;

        Assert.Equal(JulyAmount - JuneAmount, decomposition.TotalAmountImpact);
        Assert.Equal(decomposition.TotalAmountImpact, decomposition.Categories.Sum(category => category.Amount));
        Assert.Equal(context.Primary.DeltaAmount, decomposition.TotalAmountImpact);
    }

    [PostgresFact]
    public async Task A_price_that_moved_on_an_unchanged_quantity_is_reported_as_a_price_change()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var driver = Driver(await ContextAsync(db, world.JulyRequestId), world.NapkinVariantId);

        Assert.Equal(CauseCategory.PriceChange, driver.Category);
        Assert.Equal(2.80m, driver.BaselineUnitPrice);
        Assert.Equal(4.10m, driver.CurrentUnitPrice);
        Assert.Equal(30m, driver.BaselineQuantity);
        Assert.Equal(30m, driver.CurrentQuantity);
        Assert.Equal(39m, driver.AmountImpact);
        Assert.Equal(0m, driver.QuantityImpact);
        Assert.Equal(39m, driver.PriceImpact);
    }

    [PostgresFact]
    public async Task A_quantity_that_moved_at_an_unchanged_price_is_reported_as_a_quantity_change()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var driver = Driver(await ContextAsync(db, world.JulyRequestId), world.BagVariantId);

        Assert.Equal(CauseCategory.QuantityChange, driver.Category);
        Assert.Equal((20m, 60m), (driver.BaselineQuantity, driver.CurrentQuantity));
        Assert.Equal(120m, driver.QuantityImpact);
        Assert.Equal(0m, driver.PriceImpact);
    }

    [PostgresFact]
    public async Task When_both_moved_the_two_effects_reconstruct_that_products_difference()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var driver = Driver(await ContextAsync(db, world.JulyRequestId), world.BothVariantId);

        // 10 at 5.00 became 20 at 6.00: fifty manat of extra quantity at the old price, twenty of price on top.
        Assert.Equal(70m, driver.AmountImpact);
        Assert.Equal(50m, driver.QuantityImpact);
        Assert.Equal(20m, driver.PriceImpact);
        Assert.Equal(driver.AmountImpact, driver.QuantityImpact + driver.PriceImpact);
    }

    /// <summary>
    /// The audit's Zibil paketi: 50 → 55 paket and 32,00 → 32,1273 ₼. The row is +167,00 ₼, and the screen can only
    /// show "Miqdar +160,00 ₼ · Qiymət +7,00 ₼" if both parts arrive, non-zero, and add up to it.
    /// </summary>
    [PostgresFact]
    public async Task A_product_whose_quantity_and_price_both_moved_carries_both_parts()
    {
        await using var db = database.CreateContext();
        var world = await MixedWorldAsync(db);

        var driver = Driver(await ContextAsync(db, world.JulyRequestId), world.VariantId);

        Assert.Equal(167m, driver.AmountImpact);
        Assert.Equal(160m, driver.QuantityImpact);
        Assert.Equal(7m, driver.PriceImpact);
        Assert.Equal(driver.AmountImpact, driver.QuantityImpact + driver.PriceImpact);
        Assert.Equal(ComparisonState.Increased, driver.State);
    }

    [PostgresFact]
    public async Task Every_product_carries_the_state_the_comparison_page_labels_it_with()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world.JulyRequestId);

        Assert.Equal(ComparisonState.New, Driver(context, world.NewcomerVariantId).State);
        Assert.Equal(ComparisonState.NoLongerOrdered, Driver(context, world.RetiredVariantId).State);
        Assert.Equal(ComparisonState.Increased, Driver(context, world.BagVariantId).State);
        Assert.Equal(ComparisonState.Unchanged, Driver(context, world.NapkinVariantId).State);
        Assert.Equal(ComparisonState.NotComparable, Driver(context, world.ServiceVariantId).State);
        // Up by state even though its money is not explained: the state is about quantities, not about money.
        Assert.Equal(ComparisonState.Increased, Driver(context, world.UnpricedVariantId).State);
    }

    [PostgresFact]
    public async Task The_product_counts_say_what_they_count()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var decomposition = (await ContextAsync(db, world.JulyRequestId)).Decomposition!;

        // June and July together hold ten products; July's order has nine; one is new and one is no longer
        // ordered; the steady one moved nothing, so nine are listed.
        Assert.Equal(
            new DecisionProductCountsDto(
                ComparedCount: 10, InCurrentOrderCount: 9, NewCount: 1, NoLongerOrderedCount: 1, ListedCount: 9),
            decomposition.Products);
        Assert.Equal(decomposition.Drivers.Count, decomposition.Products.ListedCount);
    }

    [PostgresFact]
    public async Task A_product_the_month_before_never_ordered_is_new()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var driver = Driver(await ContextAsync(db, world.JulyRequestId), world.NewcomerVariantId);

        Assert.Equal(CauseCategory.NewOrders, driver.Category);
        Assert.Equal(50m, driver.AmountImpact);
        Assert.Equal(0m, driver.BaselineQuantity);
        Assert.Null(driver.BaselineUnitPrice);
        Assert.Null(driver.QuantityImpact);
    }

    [PostgresFact]
    public async Task A_product_that_stopped_being_ordered_removes_what_it_used_to_cost()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var driver = Driver(await ContextAsync(db, world.JulyRequestId), world.RetiredVariantId);

        Assert.Equal(CauseCategory.NoLongerOrdered, driver.Category);
        Assert.Equal(-20m, driver.AmountImpact);
        Assert.Equal(0m, driver.CurrentQuantity);
    }

    [PostgresFact]
    public async Task A_service_is_compared_by_money_and_given_no_quantity_effect()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var driver = Driver(await ContextAsync(db, world.JulyRequestId), world.ServiceVariantId);

        Assert.Equal(CauseCategory.Services, driver.Category);
        Assert.Equal(AnalyticsKind.AmountOrientedService, driver.AnalyticsKind);
        Assert.Equal(400m, driver.AmountImpact);
        Assert.Null(driver.CurrentQuantity);
        Assert.Null(driver.QuantityImpact);
        Assert.Null(driver.PriceImpact);
    }

    [PostgresFact]
    public async Task A_product_whose_price_is_partly_unknown_is_counted_but_not_explained()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world.JulyRequestId);
        var driver = Driver(context, world.UnpricedVariantId);

        Assert.Equal(CauseCategory.UnattributedDueToMissingPrice, driver.Category);
        Assert.False(driver.PriceIsComplete);
        Assert.Null(driver.QuantityImpact);
        Assert.Null(driver.PriceImpact);

        Assert.False(context.Decomposition!.ExplanationIsComplete);
        Assert.Equal(1, context.Decomposition.UnattributedVariantCount);
    }

    [PostgresFact]
    public async Task Several_lines_of_one_product_are_one_position_priced_by_weight()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var driver = Driver(await ContextAsync(db, world.JulyRequestId), world.WeightedVariantId);

        // July: 1 at 10.00 and 9 at 20.00 — ten units costing 190, so 19.00 each and not 15.00.
        Assert.Equal(19m, driver.CurrentUnitPrice);
        Assert.Equal(10m, driver.CurrentQuantity);
        Assert.Equal(2, driver.CurrentItemCount);
    }

    [PostgresFact]
    public async Task Two_variants_of_one_product_are_two_positions()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world.JulyRequestId);

        // The packs of the napkin product are their own position: its pack price is not a rise on its unit price.
        Assert.Contains(context.Decomposition!.Drivers, driver => driver.Variant.ProductVariantId == world.NapkinVariantId);
        Assert.Contains(context.Decomposition.Drivers, driver => driver.Variant.ProductVariantId == world.NapkinPackVariantId);
    }

    [PostgresFact]
    public async Task Products_are_listed_by_how_much_money_they_moved()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var drivers = (await ContextAsync(db, world.JulyRequestId)).Decomposition!.Drivers;
        var impacts = drivers.Select(driver => Math.Abs(driver.AmountImpact)).ToList();

        Assert.Equal(impacts.OrderByDescending(impact => impact), impacts);
    }

    [PostgresFact]
    public async Task A_product_that_moved_nothing_is_not_offered_as_a_reason()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var drivers = (await ContextAsync(db, world.JulyRequestId)).Decomposition!.Drivers;

        Assert.DoesNotContain(drivers, driver => driver.Variant.ProductVariantId == world.SteadyVariantId);
    }

    // ---- what it costs to ask ------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_whole_answer_is_a_handful_of_queries_however_many_products_there_are()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var counter = new CountingCommandInterceptor();
        await using (var counted = new BaxOrdersDbContext(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(PostgresDatabaseFixture.ConnectionString)
            .AddInterceptors(counter)
            .Options))
        {
            await new OrderDecisionContextQueries(counted).GetAsync(world.JulyRequestId, new DecisionContextQuery(), None);
        }

        // The request; which months the company has ever ordered in, for "Bütün dövr"; this location's
        // requests in every window; the lines of all of them; and the variants. Five, and five whatever the
        // basis, however many products the order has, and however many bases are shown beside the chosen one.
        Assert.Equal(5, counter.Count);
    }

    [PostgresFact]
    public async Task Reading_the_decision_context_writes_nothing()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var before = await FingerprintAsync(db, world.LocationId);
        await ContextAsync(db, world.JulyRequestId);
        await ContextAsync(db, world.JuneRequestId);
        var after = await FingerprintAsync(db, world.LocationId);

        Assert.Equal(before, after);
    }

    /// <summary>One of the bases shown beside the chosen one.</summary>
    private static DecisionComparisonDto Window(OrderDecisionContextDto context, AnalyticsComparisonBasis basis) =>
        context.Secondary.Single(item => item.Basis == basis);

    // ---- fixture -------------------------------------------------------------------------------------

    private const decimal MarchAmount = 100m;
    private const decimal MayAmount = 200m;

    // June: napkins 30×2.80, bags 20×3.00, both 10×5.00, retired 8×2.50, steady 50×1.00, service 1×400,
    //       weighted 10×5.00, unpriced 10×1.00, packs 2×15.00.
    private const decimal JuneAmount = 84m + 60m + 50m + 20m + 50m + 400m + 50m + 10m + 30m;

    // July: napkins 30×4.10, bags 60×3.00, both 20×6.00, newcomer 5×10.00, steady 50×1.00, service 2×400,
    //       weighted 1×10 + 9×20, unpriced 12 with one line unpriced (10 priced at 1.00), packs 3×15.00.
    private const decimal JulyAmount = 123m + 180m + 120m + 50m + 50m + 800m + 190m + 10m + 45m;

    private static async Task<OrderDecisionContextDto> ContextAsync(BaxOrdersDbContext db, long orderRequestId) =>
        (await new OrderDecisionContextQueries(db).GetAsync(orderRequestId, new DecisionContextQuery(), None))!;

    private static DecisionDriverDto Driver(OrderDecisionContextDto context, long variantId) =>
        context.Decomposition!.Drivers.Single(driver => driver.Variant.ProductVariantId == variantId);

    private static async Task<string> FingerprintAsync(BaxOrdersDbContext db, int locationId)
    {
        var requests = await db.OrderRequests.AsNoTracking()
            .Where(request => request.LocationId == locationId)
            .OrderBy(request => request.Id)
            .Select(request => new { request.Id, request.Version, request.Status })
            .ToListAsync();

        var items = await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.OrderRequest.LocationId == locationId)
            .OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.ProductVariantId, item.Quantity, item.UnitPrice })
            .ToListAsync();

        return string.Join('|', requests.Select(request => $"{request.Id}:{request.Version}:{request.Status}"))
            + "//"
            + string.Join('|', items.Select(item => $"{item.Id}:{item.ProductVariantId}:{item.Quantity}:{item.UnitPrice}"));
    }

    private sealed record World(
        int LocationId,
        DateOnly March, DateOnly April, DateOnly May, DateOnly June, DateOnly July,
        long JuneRequestId, long JulyRequestId,
        long NapkinVariantId, long NapkinPackVariantId, long BagVariantId, long BothVariantId,
        long NewcomerVariantId, long RetiredVariantId, long SteadyVariantId, long ServiceVariantId,
        long UnpricedVariantId, long WeightedVariantId);

    /// <summary>
    /// Two months built so that every cause the screen can name happens exactly once, and a third and sixth
    /// month behind them so the longer windows have something real to average.
    /// </summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var (march, april, may) = (new DateOnly(2026, 3, 1), new DateOnly(2026, 4, 1), new DateOnly(2026, 5, 1));
        var (june, july) = (new DateOnly(2026, 6, 1), new DateOnly(2026, 7, 1));

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Qərar obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var packs = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PACK");
        var month = await ServiceUnitAsync(db, AnalyticsUnits.Month, tag);

        var codes = new PostgresProductCodeGenerator(db);
        var napkin = await ProductAsync(db, codes, $"York qatlama salfet {tag}");
        var bag = await ProductAsync(db, codes, $"Zibil paketi {tag}");
        var both = await ProductAsync(db, codes, $"Əlcək {tag}");
        var newcomer = await ProductAsync(db, codes, $"Yeni alət {tag}");
        var retired = await ProductAsync(db, codes, $"Köhnə alət {tag}");
        var steady = await ProductAsync(db, codes, $"Sabit mal {tag}");
        var service = await ProductAsync(db, codes, $"Təmizlik xidməti {tag}");
        var unpriced = await ProductAsync(db, codes, $"Qiymətsiz mal {tag}");
        var weighted = await ProductAsync(db, codes, $"Çəkili mal {tag}");
        var older = await ProductAsync(db, codes, $"Köhnə dövr malı {tag}");
        await db.SaveChangesAsync();

        var napkinVariant = napkin.AddVariant(null, null, null, pieces);
        var napkinPackVariant = napkin.AddVariant(null, null, null, packs);
        var bagVariant = bag.AddVariant(null, null, null, pieces);
        var bothVariant = both.AddVariant(null, null, null, pieces);
        var newcomerVariant = newcomer.AddVariant(null, null, null, pieces);
        var retiredVariant = retired.AddVariant(null, null, null, pieces);
        var steadyVariant = steady.AddVariant(null, null, null, pieces);
        var serviceVariant = service.AddVariant(null, null, null, month);
        var unpricedVariant = unpriced.AddVariant(null, null, null, pieces);
        var weightedVariant = weighted.AddVariant(null, null, null, pieces);
        var olderVariant = older.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        // March and May only exist so the three- and six-month windows have months to average. April is
        // deliberately absent: the location did not order at all that month.
        var marchRequest = new OrderRequest(location, march);
        marchRequest.AddItem(olderVariant, 10m, 10m);

        var mayRequest = new OrderRequest(location, may);
        mayRequest.AddItem(olderVariant, 20m, 10m);

        var juneRequest = new OrderRequest(location, june);
        juneRequest.AddItem(napkinVariant, 30m, 2.80m);
        juneRequest.AddItem(napkinPackVariant, 2m, 15m);
        juneRequest.AddItem(bagVariant, 20m, 3m);
        juneRequest.AddItem(bothVariant, 10m, 5m);
        juneRequest.AddItem(retiredVariant, 8m, 2.50m);
        juneRequest.AddItem(steadyVariant, 50m, 1m);
        juneRequest.AddItem(serviceVariant, 1m, 400m);
        juneRequest.AddItem(weightedVariant, 10m, 5m);
        juneRequest.AddItem(unpricedVariant, 10m, 1m);

        var julyRequest = new OrderRequest(location, july);
        julyRequest.AddItem(napkinVariant, 30m, 4.10m);
        julyRequest.AddItem(napkinPackVariant, 3m, 15m);
        julyRequest.AddItem(bagVariant, 60m, 3m);
        julyRequest.AddItem(bothVariant, 20m, 6m);
        julyRequest.AddItem(newcomerVariant, 5m, 10m);
        julyRequest.AddItem(steadyVariant, 50m, 1m);
        julyRequest.AddItem(serviceVariant, 2m, 400m);
        julyRequest.AddItem(weightedVariant, 1m, 10m);
        julyRequest.AddItem(weightedVariant, 9m, 20m);
        julyRequest.AddItem(unpricedVariant, 10m, 1m);
        julyRequest.AddItem(unpricedVariant, 2m, null);

        db.OrderRequests.AddRange(marchRequest, mayRequest, juneRequest, julyRequest);
        await db.SaveChangesAsync();

        return new World(
            location.Id, march, april, may, june, july,
            juneRequest.Id, julyRequest.Id,
            napkinVariant.Id, napkinPackVariant.Id, bagVariant.Id, bothVariant.Id,
            newcomerVariant.Id, retiredVariant.Id, steadyVariant.Id, serviceVariant.Id,
            unpricedVariant.Id, weightedVariant.Id);
    }

    private sealed record MixedWorld(long JulyRequestId, long VariantId);

    /// <summary>One product whose quantity and price both moved, shaped like the audit's Zibil paketi.</summary>
    private static async Task<MixedWorld> MixedWorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Qarışıq obyekt {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var packs = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PACK");
        var product = await ProductAsync(db, new PostgresProductCodeGenerator(db), $"Zibil paketi {tag}");
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, packs);
        await db.SaveChangesAsync();

        var june = new OrderRequest(location, new DateOnly(2026, 6, 1));
        june.AddItem(variant, 50m, 32m);

        var july = new OrderRequest(location, new DateOnly(2026, 7, 1));
        july.AddItem(variant, 55m, 32.1273m);

        db.OrderRequests.AddRange(june, july);
        await db.SaveChangesAsync();

        return new MixedWorld(july.Id, variant.Id);
    }

    private sealed record VersionedWorld(long FirstVersionId, long SecondVersionId);

    /// <summary>One month that exists twice, so "the version you opened" can be told from "the newest version".</summary>
    private static async Task<VersionedWorld> VersionedWorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var june = new DateOnly(2026, 6, 1);

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Versiyalı obyekt {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = await ProductAsync(db, new PostgresProductCodeGenerator(db), $"Versiya malı {tag}");
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var first = new OrderRequest(location, june);
        first.AddItem(variant, 10m, 1m);
        db.OrderRequests.Add(first);
        await db.SaveChangesAsync();

        // Only a request that left draft may be versioned; a draft is corrected where it stands.
        first.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);
        var second = first.CreateNextVersion();
        second.AddItem(variant, 40m, 1m);

        db.OrderRequests.Add(second);
        await db.SaveChangesAsync();

        return new VersionedWorld(first.Id, second.Id);
    }

    private sealed record LonelyWorld(long RequestId);

    /// <summary>A location whose only month has nothing before it.</summary>
    private static async Task<LonelyWorld> LonelyWorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Tək obyekt {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = await ProductAsync(db, new PostgresProductCodeGenerator(db), $"Tək mal {tag}");
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var request = new OrderRequest(location, new DateOnly(2026, 6, 1));
        request.AddItem(variant, 10m, 1m);
        db.OrderRequests.Add(request);
        await db.SaveChangesAsync();

        return new LonelyWorld(request.Id);
    }

    private static async Task<Product> ProductAsync(BaxOrdersDbContext db, PostgresProductCodeGenerator codes, string name)
    {
        var product = new Product(await codes.NextAsync(None), name);
        db.Products.Add(product);
        return product;
    }

    private static async Task<UnitOfMeasure> ServiceUnitAsync(BaxOrdersDbContext db, string code, string tag)
    {
        var existing = await db.UnitsOfMeasure.FirstOrDefaultAsync(unit => unit.Code == code);
        if (existing is not null)
        {
            return existing;
        }

        var unit = new UnitOfMeasure(code, $"Ay {tag}", $"ay{tag}", UnitType.Other);
        db.UnitsOfMeasure.Add(unit);
        await db.SaveChangesAsync();
        return unit;
    }

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];

    private sealed class CountingCommandInterceptor : DbCommandInterceptor
    {
        public int Count { get; private set; }

        public override InterceptionResult<System.Data.Common.DbDataReader> ReaderExecuting(
            System.Data.Common.DbCommand command, CommandEventData eventData,
            InterceptionResult<System.Data.Common.DbDataReader> result)
        {
            Count++;
            return base.ReaderExecuting(command, eventData, result);
        }

        public override ValueTask<InterceptionResult<System.Data.Common.DbDataReader>> ReaderExecutingAsync(
            System.Data.Common.DbCommand command, CommandEventData eventData,
            InterceptionResult<System.Data.Common.DbDataReader> result, CancellationToken cancellationToken = default)
        {
            Count++;
            return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
        }
    }
}
