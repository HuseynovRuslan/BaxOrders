using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Decisions;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// What the management dashboard says caused each object's month to differ, against a real PostgreSQL.
/// </summary>
/// <remarks>
/// The dashboard's one job here is to replace a row of counts — "Yeni 60 · Artıb 9 · Azalıb 2" — with the one
/// sentence a manager can act on. So what is pinned is that the cause it names is the one that actually moved
/// the most money, that it refuses to name one when it cannot, and that naming it for twenty-six objects costs
/// no more queries than not naming it.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class DashboardCauseTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    // ---- the cause is the largest mover ---------------------------------------------------------------

    [PostgresFact]
    public async Task A_price_that_moved_the_most_money_is_the_reason_given()
    {
        await using var db = database.CreateContext();
        // 100 units at 5.00, then 100 at 9.00: four hundred manat of price and nothing else.
        var world = await WorldAsync(db, june: [(Quantity: 100m, Price: 5m)], july: [(100m, 9m)]);

        var row = await RowAsync(db, world);

        Assert.Equal(CauseCategory.PriceChange, row.PrimaryCause);
        Assert.Equal(400m, row.PrimaryCauseAmount);
    }

    [PostgresFact]
    public async Task A_quantity_that_moved_the_most_money_is_the_reason_given()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db, june: [(20m, 3m)], july: [(120m, 3m)]);

        var row = await RowAsync(db, world);

        Assert.Equal(CauseCategory.QuantityChange, row.PrimaryCause);
        Assert.Equal(300m, row.PrimaryCauseAmount);
    }

    [PostgresFact]
    public async Task A_month_of_new_products_says_so()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db, june: [(10m, 1m)], july: [(10m, 1m), (50m, 20m)]);

        var row = await RowAsync(db, world);

        Assert.Equal(CauseCategory.NewOrders, row.PrimaryCause);
        Assert.Equal(1000m, row.PrimaryCauseAmount);
    }

    [PostgresFact]
    public async Task A_month_that_stopped_ordering_something_large_says_so()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db, june: [(10m, 1m), (40m, 30m)], july: [(10m, 1m)]);

        var row = await RowAsync(db, world);

        Assert.Equal(CauseCategory.NoLongerOrdered, row.PrimaryCause);
        Assert.Equal(-1200m, row.PrimaryCauseAmount);
    }

    [PostgresFact]
    public async Task When_two_causes_both_move_money_the_larger_one_is_named()
    {
        await using var db = database.CreateContext();
        // 10 at 5.00 → 20 at 6.00: fifty of quantity, twenty of price. Quantity wins, and both are reported.
        var world = await WorldAsync(db, june: [(10m, 5m)], july: [(20m, 6m)]);

        var row = await RowAsync(db, world);

        Assert.Equal(CauseCategory.QuantityChange, row.PrimaryCause);
        Assert.Equal(50m, row.PrimaryCauseAmount);
        Assert.Equal(20m, row.Causes.Single(cause => cause.Category == CauseCategory.PriceChange).Amount);
    }

    [PostgresFact]
    public async Task The_named_cause_agrees_with_the_decision_screens_own_decomposition()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db, june: [(10m, 5m)], july: [(20m, 6m), (5m, 40m)]);

        var row = await RowAsync(db, world);
        var context = (await new OrderDecisionContextQueries(db).GetAsync(world.JulyId, new DecisionContextQuery(), None))!;

        // One decomposition, two screens. If these ever disagree the manager has been told two stories.
        var strongest = context.Decomposition!.Categories
            .OrderByDescending(category => Math.Abs(category.Amount))
            .First();

        Assert.Equal(strongest.Category, row.PrimaryCause);
        Assert.Equal(strongest.Amount, row.PrimaryCauseAmount);
    }

    // ---- the product behind the cause (7.1, 7.1a) -----------------------------------------------------

    [PostgresFact]
    public async Task A_month_of_new_products_names_the_largest_of_them()
    {
        await using var db = database.CreateContext();
        // One product kept as it was, two new: 50 × 20,00 = 1 000,00 and 5 × 30,00 = 150,00.
        var world = await WorldAsync(db, june: [(10m, 1m)], july: [(10m, 1m), (50m, 20m), (5m, 30m)]);

        var row = await RowAsync(db, world);

        Assert.Equal(CauseCategory.NewOrders, row.PrimaryCause);
        var product = row.PrimaryCauseProduct!;
        Assert.Equal(world.Products[1].VariantId, product.ProductVariantId);
        Assert.Equal(world.Products[1].Name, product.ProductName);
        Assert.Equal(1000m, product.Amount);
        // Every rise, and the unchanged product is not one.
        Assert.Equal(1150m, product.SameDirectionAmount);
    }

    [PostgresFact]
    public async Task A_month_that_stopped_ordering_something_names_it()
    {
        await using var db = database.CreateContext();
        // 40 × 30,00 = 1 200,00 and 5 × 20,00 = 100,00 not ordered this month.
        var world = await WorldAsync(db, june: [(10m, 1m), (40m, 30m), (5m, 20m)], july: [(10m, 1m)]);

        var row = await RowAsync(db, world);

        Assert.Equal(CauseCategory.NoLongerOrdered, row.PrimaryCause);
        var product = row.PrimaryCauseProduct!;
        Assert.Equal(world.Products[1].VariantId, product.ProductVariantId);
        Assert.Equal(world.Products[1].Name, product.ProductName);
        Assert.Equal(-1200m, product.Amount);
        Assert.Equal(-1300m, product.SameDirectionAmount);
    }

    // ---- when it cannot name one ----------------------------------------------------------------------

    [PostgresFact]
    public async Task With_no_previous_month_no_cause_is_invented()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db, june: null, july: [(10m, 5m)]);

        var row = await RowAsync(db, world);

        Assert.Null(row.PrimaryCause);
        Assert.Null(row.PrimaryCauseAmount);
        Assert.Null(row.PrimaryCauseProduct);
        Assert.Empty(row.Causes);
        Assert.Equal(ComparisonAvailability.NoBaselineHistory, row.ComparisonAvailability);
    }

    [PostgresFact]
    public async Task A_price_somebody_owes_makes_the_explanation_incomplete()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db, june: [(10m, 5m)], july: [(10m, null)]);

        var row = await RowAsync(db, world);

        Assert.False(row.ExplanationIsComplete);
        Assert.Equal(CauseCategory.UnattributedDueToMissingPrice, row.PrimaryCause);
        Assert.Equal(-50m, row.UnattributedAmount);
    }

    [PostgresFact]
    public async Task Material_from_the_companys_own_store_never_makes_it_incomplete()
    {
        await using var db = database.CreateContext();
        var world = await InternalWorldAsync(db);

        var row = await RowAsync(db, world);

        // No purchase price was owed, so nothing is missing and no warning is raised.
        Assert.True(row.ExplanationIsComplete);
        Assert.Equal(0, row.Current.MissingPriceItemCount);
        Assert.Equal(1, row.Current.PriceNotRequiredItemCount);
        Assert.Equal(CauseCategory.InternalSupply, row.PrimaryCause);
    }

    // ---- the shortlist --------------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_biggest_mover_is_put_in_front_of_the_reader()
    {
        await using var db = database.CreateContext();
        var tag = Unique();
        var quiet = await WorldAsync(db, june: [(10m, 1m)], july: [(11m, 1m)], tag: tag);
        var loud = await WorldAsync(db, june: [(10m, 1m)], july: [(1000m, 50m)], tag: tag);

        var dashboard = await DashboardAsync(db, tag);

        var named = dashboard.Attention.Select(item => item.Location.LocationId).ToList();
        Assert.Contains(loud.LocationId, named);
        // Nothing is hidden: the quiet object is still in the table, just not in the reading order.
        Assert.Contains(quiet.LocationId, dashboard.Rows.Items.Select(row => row.LocationId));
    }

    [PostgresFact]
    public async Task An_object_it_names_says_why_it_was_named()
    {
        await using var db = database.CreateContext();
        var tag = Unique();
        var world = await WorldAsync(db, june: [(10m, 1m)], july: [(2000m, 60m)], tag: tag);

        var dashboard = await DashboardAsync(db, tag);
        var item = dashboard.Attention.Single(entry => entry.Location.LocationId == world.LocationId);

        Assert.Equal(DashboardAttentionReason.LargestIncrease, item.Reason);
    }

    [PostgresFact]
    public async Task It_stays_a_shortlist()
    {
        await using var db = database.CreateContext();
        var tag = Unique();
        for (var index = 0; index < 12; index++)
        {
            await WorldAsync(db, june: [(10m, 1m)], july: [(10m + index, 1m + index)], tag: tag);
        }

        var dashboard = await DashboardAsync(db, tag);

        Assert.True(dashboard.Attention.Count <= 8);
        // One card per object, whatever signals it qualified under.
        Assert.Equal(
            dashboard.Attention.Select(item => item.Location.LocationId).Distinct().Count(),
            dashboard.Attention.Count);
    }

    // ---- what it costs --------------------------------------------------------------------------------

    [PostgresFact]
    public async Task Naming_a_cause_for_every_object_costs_no_extra_query()
    {
        await using var db = database.CreateContext();
        for (var index = 0; index < 6; index++)
        {
            await WorldAsync(db, june: [(10m, 1m)], july: [(20m, 2m)]);
        }

        var counter = new CountingCommandInterceptor();
        await using (var counted = new BaxOrdersDbContext(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(PostgresDatabaseFixture.ConnectionString)
            .AddInterceptors(counter)
            .Options))
        {
            await new ManagementDashboardQueries(counted).GetAsync(July, new DashboardQuery(), None);
        }

        // The locations, their requests, each object's last month before this one, the approved spelling matches
        // (Task 13b), the lines of the requests in the window, the month's classification split (Task 22), the
        // variant kinds and names, the trend's two — which months the company ordered in and what each of them
        // came to — and the breakdown's two: the month's lines grouped by the category their product is filed
        // under, and the category tree itself. Eleven whatever the number of objects: the decomposition and the
        // partition run on figures already in memory, the trend's second query is one row per object and month
        // of six months, and the category tree is the whole table at 148 rows. Two more again since the cards
        // name who each order is answerable to: the month's assignments, and its lines grouped by person.
        Assert.Equal(13, counter.Count);
    }

    [PostgresFact]
    public async Task Reading_the_dashboard_writes_nothing()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db, june: [(10m, 5m)], july: [(20m, 6m)]);

        var before = await FingerprintAsync(db, world.LocationId);
        await DashboardAsync(db);
        await DashboardAsync(db);
        var after = await FingerprintAsync(db, world.LocationId);

        Assert.Equal(before, after);
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private static readonly DateOnly June = new(2026, 6, 1);
    private static readonly DateOnly July = new(2026, 7, 1);

    private static async Task<ManagementDashboardDto> DashboardAsync(BaxOrdersDbContext db, string? search = null) =>
        (await new ManagementDashboardQueries(db).GetAsync(
            July, new DashboardQuery(Search: search, PageSize: 100), None))!;

    private static async Task<LocationDashboardRowDto> RowAsync(BaxOrdersDbContext db, World world)
    {
        var dashboard = await new ManagementDashboardQueries(db).GetAsync(
            July, new DashboardQuery(Search: world.LocationName, PageSize: 100), None);

        return dashboard!.Rows.Items.Single(row => row.LocationId == world.LocationId);
    }

    private static async Task<string> FingerprintAsync(BaxOrdersDbContext db, int locationId)
    {
        var items = await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.OrderRequest.LocationId == locationId)
            .OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.Quantity, item.UnitPrice })
            .ToListAsync();

        return string.Join('|', items.Select(item => $"{item.Id}:{item.Quantity}:{item.UnitPrice}"));
    }

    /// <param name="Products">Each line's variant and product name, in the order the test listed the lines.</param>
    private sealed record World(
        int LocationId, string LocationName, long JulyId, IReadOnlyList<(long VariantId, string Name)> Products);

    /// <summary>One location whose two months are exactly the lines the test names, and nothing else.</summary>
    private static async Task<World> WorldAsync(
        BaxOrdersDbContext db,
        (decimal Quantity, decimal? Price)[]? june,
        (decimal Quantity, decimal? Price)[] july,
        string? tag = null)
    {
        // A shared tag lets one test ask the dashboard about its own objects and nobody else's.
        var name = tag is null ? Unique() : $"{tag} {Unique()}";
        var (location, variants) = await CatalogueAsync(db, name, Math.Max(june?.Length ?? 0, july.Length));

        var requests = new List<OrderRequest>();
        if (june is not null)
        {
            var juneRequest = new OrderRequest(location, June);
            for (var index = 0; index < june.Length; index++)
            {
                juneRequest.AddItem(variants[index], june[index].Quantity, june[index].Price);
            }

            requests.Add(juneRequest);
        }

        var julyRequest = new OrderRequest(location, July);
        for (var index = 0; index < july.Length; index++)
        {
            julyRequest.AddItem(variants[index], july[index].Quantity, july[index].Price);
        }

        requests.Add(julyRequest);
        db.OrderRequests.AddRange(requests);
        await db.SaveChangesAsync();

        return new World(location.Id, location.Name, julyRequest.Id, ProductsOf(variants));
    }

    /// <summary>A month that switched from a bought product to one issued from the company's own store.</summary>
    private static async Task<World> InternalWorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var (location, variants) = await CatalogueAsync(db, tag, 1);

        var store = new Supplier($"Anbar {tag}");
        db.Suppliers.Add(store);
        await db.SaveChangesAsync();
        store.ChangePriceRequirement(SupplierPriceRequirement.NotRequired);
        await db.SaveChangesAsync();

        var juneRequest = new OrderRequest(location, June);
        juneRequest.AddItem(variants[0], 10m, 5m);

        var julyRequest = new OrderRequest(location, July);
        julyRequest.AddItem(variants[0], 10m, null, store);

        db.OrderRequests.AddRange(juneRequest, julyRequest);
        await db.SaveChangesAsync();

        return new World(location.Id, location.Name, julyRequest.Id, ProductsOf(variants));
    }

    private static List<(long VariantId, string Name)> ProductsOf(List<ProductVariant> variants) =>
        [.. variants.Select(variant => (variant.Id, variant.Product.Name))];

    private static async Task<(Location Location, List<ProductVariant> Variants)> CatalogueAsync(
        BaxOrdersDbContext db, string tag, int count)
    {
        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Səbəb obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var codes = new PostgresProductCodeGenerator(db);
        var products = new List<Product>();
        for (var index = 0; index < Math.Max(1, count); index++)
        {
            var product = new Product(await codes.NextAsync(None), $"Səbəb malı {index} {tag}");
            db.Products.Add(product);
            products.Add(product);
        }

        await db.SaveChangesAsync();

        var variants = products.Select(product => product.AddVariant(null, null, null, pieces)).ToList();
        await db.SaveChangesAsync();
        return (location, variants);
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
