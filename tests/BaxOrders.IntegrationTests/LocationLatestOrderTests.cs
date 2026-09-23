using BaxOrders.Application.Orders;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// What the objects list says about each location's most recent order.
/// </summary>
/// <remarks>
/// The list used to carry lifetime totals, which answer a question nobody asks of a list of objects. These
/// fields answer the one they do ask — what did this place order last, and is that normal — and the rules they
/// have to keep are the same ones the rest of the system keeps: one version per month, and a month that does
/// not exist is never a month of zero.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class LocationLatestOrderTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    [PostgresFact]
    public async Task The_money_shown_is_the_latest_order_not_the_lifetime_total()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world);

        // June 20×10 then July 30×10: the row is about July, and 500 would be both months added together.
        Assert.Equal(300m, row.LatestKnownAmount);
        Assert.Equal(500m, row.KnownAmountTotal);
        Assert.Equal(world.July, row.LatestPeriod);
    }

    [PostgresFact]
    public async Task It_is_compared_with_the_calendar_month_before_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world);

        Assert.Equal(world.June, row.PreviousPeriod);
        Assert.Equal(200m, row.PreviousKnownAmount);
        Assert.Equal(100m, row.KnownAmountDelta);
        Assert.Equal(50m, row.KnownAmountPercentChange);
    }

    [PostgresFact]
    public async Task A_location_whose_previous_month_is_missing_is_offered_no_difference()
    {
        await using var db = database.CreateContext();
        var world = await GappedWorldAsync(db);

        var row = await RowAsync(db, world);

        // May, then July. June never happened, so July is not "up from nothing" — it is simply uncompared.
        Assert.Null(row.PreviousKnownAmount);
        Assert.Null(row.KnownAmountDelta);
        Assert.Null(row.KnownAmountPercentChange);
        Assert.Equal(300m, row.LatestKnownAmount);
    }

    [PostgresFact]
    public async Task Only_the_highest_version_of_the_previous_month_counts()
    {
        await using var db = database.CreateContext();
        var world = await VersionedWorldAsync(db);

        var row = await RowAsync(db, world);

        // June exists twice: version 1 ordered 100, version 2 ordered 200. Neither 100 nor 300 is the baseline.
        Assert.Equal(200m, row.PreviousKnownAmount);
        Assert.Equal(100m, row.KnownAmountDelta);
    }

    [PostgresFact]
    public async Task An_unpriced_line_in_the_latest_order_is_counted_and_said()
    {
        await using var db = database.CreateContext();
        var world = await UnpricedWorldAsync(db);

        var row = await RowAsync(db, world);

        Assert.Equal(2, row.LatestMissingPriceItemCount);
        Assert.False(row.LatestAmountIsComplete);
        Assert.Equal(300m, row.LatestKnownAmount);
    }

    [PostgresFact]
    public async Task A_location_that_never_ordered_claims_nothing()
    {
        await using var db = database.CreateContext();
        var tag = Unique();

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Boş obyekt {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var row = await RowAsync(db, new World(location.Id, location.Name, default, default));

        Assert.Null(row.LatestRequestId);
        Assert.Null(row.LatestKnownAmount);
        Assert.Null(row.PreviousPeriod);
        Assert.Null(row.KnownAmountDelta);
        Assert.Equal(0, row.LatestItemCount);
    }

    [PostgresFact]
    public async Task A_catalogue_location_with_no_orders_is_still_listed_and_still_counted()
    {
        await using var db = database.CreateContext();
        var queries = new LocationOrderQueries(db);
        var before = await queries.ListAsync(new LocationOrderListQuery(), None);

        var tag = Unique();
        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Sifarişsiz obyekt {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var after = await queries.ListAsync(new LocationOrderListQuery(), None);
        var found = await queries.ListAsync(new LocationOrderListQuery(Search: location.Name), None);

        // The object directory is the catalogue. A place that has not ordered yet is still a place the company
        // has, and disappearing from the list is the one thing that would stop anybody noticing it.
        Assert.Equal(before.LocationCount + 1, after.LocationCount);
        Assert.Equal(before.LocationsWithOrders, after.LocationsWithOrders);
        Assert.Equal(before.OrderRequestCount, after.OrderRequestCount);

        var row = Assert.Single(found.Locations.Items, item => item.LocationId == location.Id);
        Assert.Equal(0, row.OrderRequestCount);
        Assert.Null(row.LatestPeriod);
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private static async Task<LocationOrderSummaryDto> RowAsync(BaxOrdersDbContext db, World world)
    {
        var list = await new LocationOrderQueries(db).ListAsync(
            new LocationOrderListQuery(Search: world.LocationName), None);

        return list.Locations.Items.Single(row => row.LocationId == world.LocationId);
    }

    private sealed record World(int LocationId, string LocationName, DateOnly June, DateOnly July);

    private static async Task<World> WorldAsync(BaxOrdersDbContext db) =>
        await BuildAsync(db, (new DateOnly(2026, 6, 1), 20m, 10m), (new DateOnly(2026, 7, 1), 30m, 10m));

    private static async Task<World> GappedWorldAsync(BaxOrdersDbContext db) =>
        await BuildAsync(db, (new DateOnly(2026, 5, 1), 20m, 10m), (new DateOnly(2026, 7, 1), 30m, 10m));

    private static async Task<World> BuildAsync(
        BaxOrdersDbContext db,
        (DateOnly Period, decimal Quantity, decimal Price) first,
        (DateOnly Period, decimal Quantity, decimal Price) second)
    {
        var (location, variant) = await CatalogueAsync(db, "Son sifariş");

        var earlier = new OrderRequest(location, first.Period);
        earlier.AddItem(variant, first.Quantity, first.Price);

        var later = new OrderRequest(location, second.Period);
        later.AddItem(variant, second.Quantity, second.Price);

        db.OrderRequests.AddRange(earlier, later);
        await db.SaveChangesAsync();

        return new World(location.Id, location.Name, first.Period, second.Period);
    }

    private static async Task<World> VersionedWorldAsync(BaxOrdersDbContext db)
    {
        var (location, variant) = await CatalogueAsync(db, "Versiyalı son sifariş");
        var (june, july) = (new DateOnly(2026, 6, 1), new DateOnly(2026, 7, 1));

        var first = new OrderRequest(location, june);
        first.AddItem(variant, 10m, 10m);
        db.OrderRequests.Add(first);
        await db.SaveChangesAsync();

        first.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);
        var second = first.CreateNextVersion();
        second.AddItem(variant, 20m, 10m);

        var later = new OrderRequest(location, july);
        later.AddItem(variant, 30m, 10m);

        db.OrderRequests.AddRange(second, later);
        await db.SaveChangesAsync();

        return new World(location.Id, location.Name, june, july);
    }

    private static async Task<World> UnpricedWorldAsync(BaxOrdersDbContext db)
    {
        var (location, variant) = await CatalogueAsync(db, "Qiymətsiz son sifariş");
        var (june, july) = (new DateOnly(2026, 6, 1), new DateOnly(2026, 7, 1));

        var earlier = new OrderRequest(location, june);
        earlier.AddItem(variant, 20m, 10m);

        var later = new OrderRequest(location, july);
        later.AddItem(variant, 30m, 10m);
        later.AddItem(variant, 5m, null);
        later.AddItem(variant, 7m, null);

        db.OrderRequests.AddRange(earlier, later);
        await db.SaveChangesAsync();

        return new World(location.Id, location.Name, june, july);
    }

    private static async Task<(Location Location, ProductVariant Variant)> CatalogueAsync(
        BaxOrdersDbContext db, string name)
    {
        var tag = Unique();

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"{name} {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"{name} malı {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        return (location, variant);
    }

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];
}
