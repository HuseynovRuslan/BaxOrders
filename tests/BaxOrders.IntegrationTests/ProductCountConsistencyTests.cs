using System.Globalization;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Decisions;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The order page and the comparison page count products by one rule, so one question gets one number.
/// </summary>
/// <remarks>
/// A manager read "Yeni 58" on the order page and "Yeni 60" on the comparison page for the same object, month and
/// basis, and "Hamısı 113" against "119". The order page counted by where a product's <i>money</i> went, and left
/// out every product that moved no money; the comparison page counted by the product's state. Both now label
/// products with <see cref="OrderAnalyticsCalculator.StateOf"/>, and these tests hold them to it on every basis,
/// over a world holding exactly the products that used to make the two disagree.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ProductCountConsistencyTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;
    private static readonly DateOnly September = new(2026, 9, 1);

    public static TheoryData<AnalyticsComparisonBasis, string?, string?> EveryBasis() => new()
    {
        { AnalyticsComparisonBasis.PreviousMonth, null, null },
        { AnalyticsComparisonBasis.Previous3MonthAverage, null, null },
        { AnalyticsComparisonBasis.Previous6MonthAverage, null, null },
        { AnalyticsComparisonBasis.AllPriorMonths, null, null },
        { AnalyticsComparisonBasis.CustomRange, "2026-05", "2026-07" },
    };

    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task Both_pages_count_the_same_new_dropped_and_compared_products(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var (summary, _) = await ComparisonAsync(db, world, basis, from, to);
        var products = (await ContextAsync(db, world, basis, from, to)).Decomposition!.Products;

        Assert.Equal(summary.NewVariantCount, products.NewCount);
        Assert.Equal(summary.NoLongerOrderedVariantCount, products.NoLongerOrderedCount);
        Assert.Equal(summary.TotalVariantCount, products.ComparedCount);

        // Three new products whatever the basis: the priced one, the unpriced one and the internally supplied one
        // are new materials; the new service is not a quantity, so neither page calls it new.
        Assert.Equal(3, products.NewCount);
    }

    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task Every_listed_product_carries_the_state_the_comparison_page_gives_it(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var (_, rows) = await ComparisonAsync(db, world, basis, from, to);
        var decomposition = (await ContextAsync(db, world, basis, from, to)).Decomposition!;
        var states = rows.ToDictionary(row => row.Variant.ProductVariantId, row => row.State);

        Assert.All(decomposition.Drivers, driver =>
            Assert.Equal(states[driver.Variant.ProductVariantId], driver.State));

        // Not only the same label on what both show: the same products under each label.
        foreach (var state in new[] { ComparisonState.New, ComparisonState.NoLongerOrdered })
        {
            Assert.Equal(
                rows.Where(row => row.State == state).Select(row => row.Variant.ProductVariantId).Order(),
                decomposition.Drivers.Where(driver => driver.State == state)
                    .Select(driver => driver.Variant.ProductVariantId).Order());
        }
    }

    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_counts_say_what_the_list_holds_and_what_the_order_holds(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var decomposition = (await ContextAsync(db, world, basis, from, to)).Decomposition!;
        var products = decomposition.Products;

        Assert.Equal(decomposition.Drivers.Count, products.ListedCount);
        Assert.Equal(world.SeptemberVariantCount, products.InCurrentOrderCount);
        Assert.True(products.ListedCount <= products.ComparedCount);
    }

    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task A_new_product_that_cost_nothing_is_listed_and_a_steady_one_is_not(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var drivers = (await ContextAsync(db, world, basis, from, to)).Decomposition!.Drivers;

        // Issued from the company's own store: no price owed, no money moved, and still a new product.
        var free = Assert.Single(drivers, driver => driver.Variant.ProductVariantId == world.FreeNewVariantId);
        Assert.Equal(ComparisonState.New, free.State);
        Assert.Equal(CauseCategory.InternalSupply, free.Category);
        Assert.Equal(0m, free.AmountImpact);

        // A new product with a missing price is new by state even though its money is unattributed.
        var unpriced = Assert.Single(drivers, driver => driver.Variant.ProductVariantId == world.UnpricedNewVariantId);
        Assert.Equal(ComparisonState.New, unpriced.State);
        Assert.Equal(CauseCategory.UnattributedDueToMissingPrice, unpriced.Category);

        Assert.DoesNotContain(drivers, driver => driver.Variant.ProductVariantId == world.SteadyVariantId);
    }

    /// <summary>Listing the new products changed which products are shown, never a figure.</summary>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task Listing_a_product_that_cost_nothing_moves_no_figure(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = await ContextAsync(db, world, basis, from, to);
        var decomposition = context.Decomposition!;

        Assert.Equal(decomposition.TotalAmountImpact, decomposition.Categories.Sum(category => category.Amount));
        Assert.All(decomposition.Drivers.Where(driver => driver.QuantityImpact is not null && driver.PriceImpact is not null),
            driver => Assert.Equal(driver.AmountImpact, driver.QuantityImpact + driver.PriceImpact));
    }

    // ---- the order page holds everything the comparison page held (Task 11b, 11.1) --------------------

    /// <summary>
    /// The comparison page is gone, so the order page must hold every product it held: the drivers and the steady
    /// products together are exactly its rows, each under the state it gave them.
    /// </summary>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_listed_and_the_steady_products_are_exactly_the_comparison_rows(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var (_, rows) = await ComparisonAsync(db, world, basis, from, to);
        var decomposition = (await ContextAsync(db, world, basis, from, to)).Decomposition!;
        var states = rows.ToDictionary(row => row.Variant.ProductVariantId, row => row.State);

        var driverIds = decomposition.Drivers.Select(driver => driver.Variant.ProductVariantId).ToHashSet();
        var steadyIds = decomposition.Steady.Select(product => product.Variant.ProductVariantId).ToHashSet();

        Assert.Empty(driverIds.Intersect(steadyIds));
        Assert.Equal(states.Keys.Order(), driverIds.Union(steadyIds).Order());
        Assert.All(decomposition.Steady, product =>
            Assert.Equal(states[product.Variant.ProductVariantId], product.State));

        var products = decomposition.Products;
        Assert.Equal(products.ComparedCount - products.ListedCount, decomposition.Steady.Count);
    }

    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task Both_pages_count_the_same_increased_decreased_and_service_products(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var (summary, _) = await ComparisonAsync(db, world, basis, from, to);
        var products = (await ContextAsync(db, world, basis, from, to)).Decomposition!.Products;

        Assert.Equal(summary.IncreasedVariantCount, products.IncreasedCount);
        Assert.Equal(summary.DecreasedVariantCount, products.DecreasedCount);
        Assert.Equal(summary.AmountOrientedServiceCount, products.ServiceCount);

        // The mixed product and the rising store product are up whatever the basis; the new service is the one
        // service.
        Assert.Equal(2, products.IncreasedCount);
        Assert.Equal(1, products.ServiceCount);
    }

    /// <summary>
    /// Steady means "moved no money", not "did not change": material from the company's own store whose quantity
    /// rose costs nothing either way, so it is not a reason — and it is still up.
    /// </summary>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task A_product_that_moved_no_money_is_steady_with_its_own_state(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var decomposition = (await ContextAsync(db, world, basis, from, to)).Decomposition!;

        var steady = Assert.Single(decomposition.Steady, product => product.Variant.ProductVariantId == world.SteadyVariantId);
        Assert.Equal(ComparisonState.Unchanged, steady.State);

        var rising = Assert.Single(decomposition.Steady, product => product.Variant.ProductVariantId == world.RisingStoreVariantId);
        Assert.Equal(ComparisonState.Increased, rising.State);
        Assert.Equal((10m, 12m), (rising.BaselineQuantity, rising.CurrentQuantity));
        Assert.Equal(0m, rising.AmountImpact);
        Assert.DoesNotContain(decomposition.Drivers, driver => driver.Variant.ProductVariantId == world.RisingStoreVariantId);
    }

    /// <summary>
    /// "Müqayisə dövründə də N sətirdə qiymət yoxdur": the order page says it from the same count the comparison
    /// page said it from — for the chosen basis and for every basis shown beside it.
    /// </summary>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_baseline_owed_prices_are_the_comparison_pages_on_every_basis(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await OwedWorldAsync(db);

        var context = (await new OrderDecisionContextQueries(db).GetAsync(
            world.SeptemberRequestId, new DecisionContextQuery(basis, from, to), None))!;

        foreach (var comparison in new[] { context.Primary }.Concat(context.Secondary))
        {
            var summary = (await new OrderAnalyticsQueries(db).CompareAsync(
                world.LocationId,
                September,
                new ComparisonQuery(
                    comparison.Basis,
                    CustomStart: comparison.CustomStart?.ToString("yyyy-MM", CultureInfo.InvariantCulture),
                    CustomEnd: comparison.CustomEnd?.ToString("yyyy-MM", CultureInfo.InvariantCulture)),
                None))!.Summary;

            Assert.Equal(summary.BaselineMissingPriceItemCount, comparison.BaselineMissingPriceItemCount);
            // July and August each owe one price, and every window here reaches at least one of them.
            Assert.True(comparison.BaselineMissingPriceItemCount > 0, $"{comparison.Basis}");
        }
    }

    // ---- fixture ---------------------------------------------------------------------------------------

    private static async Task<(ComparisonSummaryDto Summary, IReadOnlyList<VariantComparisonDto> Rows)> ComparisonAsync(
        BaxOrdersDbContext db, World world, AnalyticsComparisonBasis basis, string? from, string? to)
    {
        var comparison = await new OrderAnalyticsQueries(db).CompareAsync(
            world.LocationId,
            September,
            new ComparisonQuery(basis, PageSize: OrderAnalyticsQueries.MaxPageSize, CustomStart: from, CustomEnd: to),
            None);

        Assert.NotNull(comparison);
        Assert.Equal(comparison!.Summary.TotalVariantCount, comparison.Rows.Items.Count);
        return (comparison.Summary, comparison.Rows.Items);
    }

    private static async Task<OrderDecisionContextDto> ContextAsync(
        BaxOrdersDbContext db, World world, AnalyticsComparisonBasis basis, string? from, string? to) =>
        (await new OrderDecisionContextQueries(db).GetAsync(
            world.SeptemberRequestId, new DecisionContextQuery(basis, from, to), None))!;

    private sealed record World(
        int LocationId,
        long SeptemberRequestId,
        int SeptemberVariantCount,
        long SteadyVariantId,
        long FreeNewVariantId,
        long UnpricedNewVariantId,
        long RisingStoreVariantId);

    /// <summary>
    /// One object with eight months behind September, holding every product that used to be counted two ways —
    /// and, since 11b, the one the order page used to be unable to show: store material whose quantity rose.
    /// </summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Guid.NewGuid().ToString("N")[..6];
        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Say obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync(None);

        var store = new Supplier($"Anbar {tag}");
        db.Suppliers.Add(store);
        await db.SaveChangesAsync(None);
        store.ChangePriceRequirement(SupplierPriceRequirement.NotRequired);
        await db.SaveChangesAsync(None);

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS", None);
        var month = await ServiceUnitAsync(db, tag);

        var codes = new PostgresProductCodeGenerator(db);
        var names = new[]
        {
            "Sabit mal", "Qarışıq mal", "Yeni qiymətli mal", "Yeni qiymətsiz mal", "Yeni anbar malı",
            "Yeni xidmət", "Yalnız bazada olan mal", "İki ayda olan mal", "Artan anbar malı",
        };
        var products = new List<Product>();
        foreach (var name in names)
        {
            var product = new Product(await codes.NextAsync(None), $"{name} {tag}");
            db.Products.Add(product);
            products.Add(product);
        }

        await db.SaveChangesAsync(None);

        var steady = products[0].AddVariant(null, null, null, pieces);
        var mixed = products[1].AddVariant(null, null, null, pieces);
        var pricedNew = products[2].AddVariant(null, null, null, pieces);
        var unpricedNew = products[3].AddVariant(null, null, null, pieces);
        var freeNew = products[4].AddVariant(null, null, null, pieces);
        var serviceNew = products[5].AddVariant(null, null, null, month);
        var basisOnly = products[6].AddVariant(null, null, null, pieces);
        var twoMonths = products[7].AddVariant(null, null, null, pieces);
        var risingStore = products[8].AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync(None);

        // 2026-01 … 2026-08. The steady product is identical every month, so no average can move it; so is the
        // store material, which then rises in September.
        var requests = new List<OrderRequest>();
        for (var number = 1; number <= 8; number++)
        {
            var request = new OrderRequest(location, new DateOnly(2026, number, 1));
            request.AddItem(steady, 20m, 4m);
            request.AddItem(mixed, 50m, 32m);
            request.AddItem(basisOnly, 6m, 2.5m);
            request.AddItem(risingStore, 10m, null, store);
            if (number >= 7)
            {
                request.AddItem(twoMonths, 9m, 3m);
            }

            requests.Add(request);
        }

        var september = new OrderRequest(location, September);
        september.AddItem(steady, 20m, 4m);
        september.AddItem(mixed, 55m, 32.1273m);
        september.AddItem(pricedNew, 5m, 10m);
        september.AddItem(unpricedNew, 3m, null);
        september.AddItem(freeNew, 4m, null, store);
        september.AddItem(serviceNew, 1m, 250m);
        september.AddItem(risingStore, 12m, null, store);
        requests.Add(september);

        db.OrderRequests.AddRange(requests);
        await db.SaveChangesAsync(None);
        db.ChangeTracker.Clear();

        // Seven products in September: 11b added the rising store material to the six Task 10 had.
        return new World(location.Id, september.Id, 7, steady.Id, freeNew.Id, unpricedNew.Id, risingStore.Id);
    }

    private sealed record OwedWorld(int LocationId, long SeptemberRequestId);

    /// <summary>
    /// An object whose baseline months owe prices: one unpriced line in July and one in August, so every basis
    /// reaches at least one — the previous month reaches August, the May–July range reaches July.
    /// </summary>
    private static async Task<OwedWorld> OwedWorldAsync(BaxOrdersDbContext db)
    {
        var tag = Guid.NewGuid().ToString("N")[..6];
        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Borclu baza obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync(None);

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS", None);
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"Borclu mal {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync(None);

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync(None);

        var requests = new List<OrderRequest>();
        for (var number = 5; number <= 8; number++)
        {
            var request = new OrderRequest(location, new DateOnly(2026, number, 1));
            request.AddItem(variant, 10m, 2m);
            if (number >= 7)
            {
                request.AddItem(variant, 1m, null);
            }

            requests.Add(request);
        }

        var september = new OrderRequest(location, September);
        september.AddItem(variant, 12m, 2m);
        september.AddItem(variant, 1m, null);
        requests.Add(september);

        db.OrderRequests.AddRange(requests);
        await db.SaveChangesAsync(None);
        db.ChangeTracker.Clear();

        return new OwedWorld(location.Id, september.Id);
    }

    private static async Task<UnitOfMeasure> ServiceUnitAsync(BaxOrdersDbContext db, string tag)
    {
        var existing = await db.UnitsOfMeasure.FirstOrDefaultAsync(unit => unit.Code == AnalyticsUnits.Month, None);
        if (existing is not null)
        {
            return existing;
        }

        var unit = new UnitOfMeasure(AnalyticsUnits.Month, $"Ay {tag}", $"ay{tag}", UnitType.Other);
        db.UnitsOfMeasure.Add(unit);
        await db.SaveChangesAsync(None);
        return unit;
    }
}
