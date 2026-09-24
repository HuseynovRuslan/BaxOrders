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
        long UnpricedNewVariantId);

    /// <summary>
    /// One object with eight months behind September, holding every product that used to be counted two ways.
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
            "Yeni xidmət", "Yalnız bazada olan mal", "İki ayda olan mal",
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
        await db.SaveChangesAsync(None);

        // 2026-01 … 2026-08. The steady product is identical every month, so no average can move it.
        var requests = new List<OrderRequest>();
        for (var number = 1; number <= 8; number++)
        {
            var request = new OrderRequest(location, new DateOnly(2026, number, 1));
            request.AddItem(steady, 20m, 4m);
            request.AddItem(mixed, 50m, 32m);
            request.AddItem(basisOnly, 6m, 2.5m);
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
        requests.Add(september);

        db.OrderRequests.AddRange(requests);
        await db.SaveChangesAsync(None);
        db.ChangeTracker.Clear();

        return new World(location.Id, september.Id, 6, steady.Id, freeNew.Id, unpricedNew.Id);
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
