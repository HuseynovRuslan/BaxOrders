using System.Text.Json;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Locations;
using BaxOrders.Application.Orders;
using BaxOrders.Application.Reports;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// One universe of objects, and every screen counting from it (Task 3, B1–B5).
/// </summary>
/// <remarks>
/// The dashboard used to say "24 / 26" while the monthly report and the Obyektlər page said 29: three screens,
/// three rules about which objects count. The rule is now one function — active objects, together with every
/// object that ordered in the period being shown — and these tests hold each screen to it.
/// <para>
/// The first group runs on the shared test database and finds its own objects by id, so it holds whatever else
/// the database contains. The last test counts everything, so it builds a database of its own.
/// </para>
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ObjectUniverseTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;
    private static readonly DateOnly March = new(2026, 3, 1);
    private static readonly DateOnly September = new(2026, 9, 1);

    // ---- B1: the rule ----------------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_month_is_every_active_object_and_every_object_that_ordered_in_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var september = await IdsAsync(LocationUniverse.ForMonth(db, September));

        Assert.Contains(world.ActiveOrdered, september);
        Assert.Contains(world.ActiveNeverOrdered, september);
        Assert.Contains(world.InactiveOrderedInSeptember, september);
        Assert.DoesNotContain(world.InactiveOrderedInMarch, september);
    }

    /// <summary>
    /// An object that has since been switched off still counts in the months it ordered — and only in those.
    /// Deactivating it never takes its money out of a month somebody has already read.
    /// </summary>
    [PostgresFact]
    public async Task An_inactive_object_with_history_counts_only_where_it_ordered()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var march = await IdsAsync(LocationUniverse.ForMonth(db, March));
        var year = await IdsAsync(LocationUniverse.ForYear(db, 2026));
        var allTime = await IdsAsync(LocationUniverse.AllTime(db));

        Assert.Contains(world.InactiveOrderedInMarch, march);
        Assert.DoesNotContain(world.InactiveOrderedInSeptember, march);
        Assert.Contains(world.InactiveOrderedInMarch, year);
        Assert.Contains(world.InactiveOrderedInSeptember, year);
        Assert.Contains(world.InactiveOrderedInMarch, allTime);
        Assert.DoesNotContain(world.InactiveNeverOrdered, allTime);
    }

    /// <summary>A new object with no orders yet — Çadır's situation — is in every period, because it is active.</summary>
    [PostgresFact]
    public async Task A_new_object_without_orders_counts_everywhere()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        Assert.Contains(world.ActiveNeverOrdered, await IdsAsync(LocationUniverse.ForMonth(db, March)));
        Assert.Contains(world.ActiveNeverOrdered, await IdsAsync(LocationUniverse.ForMonth(db, September)));
        Assert.Contains(world.ActiveNeverOrdered, await IdsAsync(LocationUniverse.ForYear(db, 2026)));
        Assert.Contains(world.ActiveNeverOrdered, await IdsAsync(LocationUniverse.AllTime(db)));
    }

    // ---- B2–B4: every screen reads it ------------------------------------------------------------------

    /// <summary>
    /// B2: an object with no orders is no longer filtered out of the table. It has a row, with no money on it,
    /// and it is in the "no history" group, so the rows, the partition and the headline count the same objects.
    /// </summary>
    [PostgresFact]
    public async Task The_dashboard_has_a_row_for_an_object_that_has_never_ordered()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        // Narrowed to this world's objects: the shared database can hold more objects than one page.
        var dashboard = await DashboardAsync(db, AnalyticsComparisonBasis.PreviousMonth, search: world.Tag);

        var row = Assert.Single(dashboard.Rows.Items, item => item.LocationId == world.ActiveNeverOrdered);
        Assert.False(row.HasCurrentRequest);
        Assert.Null(row.Current.KnownAmount);
        Assert.Null(row.Baseline.KnownAmount);
        Assert.Null(row.KnownAmountDelta);
        Assert.Contains(dashboard.Summary.Partition.NoHistory, member => member.LocationId == world.ActiveNeverOrdered);

        Assert.Contains(dashboard.Rows.Items, item => item.LocationId == world.InactiveOrderedInSeptember);
        Assert.DoesNotContain(dashboard.Rows.Items, item => item.LocationId == world.InactiveOrderedInMarch);
    }

    /// <summary>The partition adds up to the universe on every basis — the headline, the chips and the table agree.</summary>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_partition_adds_up_to_the_universe_on_every_basis(AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        await WorldAsync(db);

        var dashboard = await DashboardAsync(db, basis, from, to);
        var partition = dashboard.Summary.Partition;
        var universe = await LocationUniverse.ForMonth(db, September).CountAsync(None);

        Assert.Equal(universe, partition.Compared.Count + partition.NoOrderThisMonth.Count + partition.NoBaseline.Count + partition.NoHistory.Count);
        Assert.Equal(universe, partition.LocationCount);
        Assert.Equal(universe, dashboard.Summary.LocationCount);
        Assert.Equal(universe, dashboard.Rows.TotalCount);
    }

    [PostgresFact]
    public async Task The_monthly_report_and_the_Obyektlər_page_list_the_same_universe()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var report = await new MonthlyReportQueries(db).GetAsync(new MonthlyReportQuery(2026), None);
        Assert.Equal(await LocationUniverse.ForYear(db, 2026).CountAsync(None), report.LocationCount);
        Assert.Contains(report.Rows, row => row.LocationId == world.ActiveNeverOrdered && row.RequestCount == 0);
        Assert.Contains(report.Rows, row => row.LocationId == world.InactiveOrderedInMarch);

        var list = await new LocationOrderQueries(db).ListAsync(new LocationOrderListQuery(PageSize: 100), None);
        Assert.Equal(await LocationUniverse.AllTime(db).CountAsync(None), list.LocationCount);
        Assert.Equal(
            await LocationUniverse.AllTime(db).CountAsync(location => db.OrderRequests.Any(request => request.LocationId == location.Id), None),
            list.LocationsWithOrders);
    }

    /// <summary>
    /// B4 and B6 together: an object with no orders goes last when the list is ranked by its latest month,
    /// whichever way — a missing month is not an early one — and names otherwise come in the Azerbaijani order.
    /// </summary>
    [PostgresFact]
    public async Task The_Obyektlər_page_puts_an_object_with_no_orders_last_when_ranking_by_month()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        foreach (var descending in new[] { false, true })
        {
            var list = await new LocationOrderQueries(db).ListAsync(
                new LocationOrderListQuery(Search: world.Tag, Sort: LocationOrderSort.LatestPeriod, Descending: descending, PageSize: 100), None);

            Assert.Equal(world.ActiveNeverOrdered, list.Locations.Items[^1].LocationId);
        }
    }

    // ---- one count on every screen, through the endpoints ----------------------------------------------

    /// <summary>
    /// The test the specification asks for: the dashboard, the monthly report and the Obyektlər page, read
    /// through the API as the browser reads them, count the same objects.
    /// </summary>
    /// <remarks>
    /// On a database of its own, because it counts everything: the four seeded objects (no orders), three
    /// ordering in September, one whose last order was August, one that ordered in September and has since been
    /// deactivated, and a new one with no orders. Ten objects, eight of them with orders somewhere.
    /// </remarks>
    [PostgresFact]
    public async Task The_dashboard_the_monthly_report_and_Obyektlər_count_the_same_objects()
    {
        await using var isolated = await IsolatedDatabase.CreateAsync("baxorders_universe");
        await using (var db = isolated.CreateContext())
        {
            await CompanyAsync(db);
        }

        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:BaxOrders", isolated.ConnectionString);
        });

        var manager = await AuthenticatedApi.CreateUserAsync(factory, BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        using var client = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(client, manager.UserName, manager.Password);

        using var dashboard = await JsonAsync(client, "/api/v1/dashboard?period=2026-09&basis=PreviousMonth");
        using var report = await JsonAsync(client, "/api/v1/reports/monthly?year=2026");
        using var locations = await JsonAsync(client, "/api/v1/locations/orders");

        var summary = dashboard.RootElement.GetProperty("summary");
        Assert.Equal(10, summary.GetProperty("locationCount").GetInt32());
        Assert.Equal(10, summary.GetProperty("partition").GetProperty("locationCount").GetInt32());
        Assert.Equal(10, dashboard.RootElement.GetProperty("rows").GetProperty("totalCount").GetInt32());
        Assert.Equal(4, summary.GetProperty("locationsWithCurrentRequest").GetInt32());

        Assert.Equal(10, report.RootElement.GetProperty("locationCount").GetInt32());

        Assert.Equal(10, locations.RootElement.GetProperty("locationCount").GetInt32());
        Assert.Equal(5, locations.RootElement.GetProperty("locationsWithOrders").GetInt32());
    }

    // ---- fixture -----------------------------------------------------------------------------------------

    public static TheoryData<AnalyticsComparisonBasis, string?, string?> EveryBasis() => new()
    {
        { AnalyticsComparisonBasis.PreviousMonth, null, null },
        { AnalyticsComparisonBasis.Previous3MonthAverage, null, null },
        { AnalyticsComparisonBasis.Previous6MonthAverage, null, null },
        { AnalyticsComparisonBasis.AllPriorMonths, null, null },
        { AnalyticsComparisonBasis.CustomRange, "2026-01", "2026-08" },
    };

    private static async Task<List<int>> IdsAsync(IQueryable<Location> locations) =>
        await locations.Select(location => location.Id).ToListAsync(None);

    private static async Task<ManagementDashboardDto> DashboardAsync(
        BaxOrdersDbContext db, AnalyticsComparisonBasis basis, string? from = null, string? to = null, string? search = null) =>
        (await new ManagementDashboardQueries(db).GetAsync(
            September,
            new DashboardQuery(basis, Search: search, PageSize: ManagementDashboardQueries.MaxPageSize, CustomStart: from, CustomEnd: to),
            None))!;

    private static async Task<JsonDocument> JsonAsync(HttpClient client, string url)
    {
        var response = await client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    }

    private sealed record World(
        string Tag,
        int ActiveOrdered,
        int ActiveNeverOrdered,
        int InactiveOrderedInSeptember,
        int InactiveOrderedInMarch,
        int InactiveNeverOrdered);

    /// <summary>One object in each situation the rule has to tell apart.</summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Guid.NewGuid().ToString("N")[..8];
        var orders = await OrdersAsync(db, tag);

        var activeOrdered = await orders.LocationAsync("Sifariş verən obyekt");
        var activeNeverOrdered = await orders.LocationAsync("Yeni obyekt");
        var inactiveSeptember = await orders.LocationAsync("Sentyabrda sifariş verib bağlanan obyekt");
        var inactiveMarch = await orders.LocationAsync("Martda sifariş verib bağlanan obyekt");
        var inactiveNever = await orders.LocationAsync("Heç sifariş verməyib bağlanan obyekt");

        await orders.OrderAsync(activeOrdered, 8);
        await orders.OrderAsync(activeOrdered, 9);
        await orders.OrderAsync(inactiveSeptember, 9);
        await orders.OrderAsync(inactiveMarch, 3);

        // Orders are placed while an object is active; it is switched off afterwards, as it would be in life.
        foreach (var location in new[] { inactiveSeptember, inactiveMarch, inactiveNever })
        {
            location.Deactivate();
        }

        await db.SaveChangesAsync(None);
        db.ChangeTracker.Clear();

        return new World(tag, activeOrdered.Id, activeNeverOrdered.Id, inactiveSeptember.Id, inactiveMarch.Id, inactiveNever.Id);
    }

    /// <summary>The company of the endpoint test: ten objects, eight of them ordering somewhere.</summary>
    private static async Task CompanyAsync(BaxOrdersDbContext db)
    {
        var orders = await OrdersAsync(db, "şirkət");

        foreach (var name in new[] { "Birinci", "İkinci", "Üçüncü" })
        {
            var location = await orders.LocationAsync(name);
            await orders.OrderAsync(location, 8);
            await orders.OrderAsync(location, 9);
        }

        await orders.OrderAsync(await orders.LocationAsync("Avqustda dayanan"), 8);

        var closed = await orders.LocationAsync("Sentyabrda sifariş verib bağlanan");
        await orders.OrderAsync(closed, 9);
        closed.Deactivate();

        await orders.LocationAsync("Çadır");
        await db.SaveChangesAsync(None);
        db.ChangeTracker.Clear();
    }

    private static async Task<Orders> OrdersAsync(BaxOrdersDbContext db, string tag)
    {
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS", None);
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"Universum malı {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync(None);

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync(None);
        return new Orders(db, variant, tag);
    }

    private sealed class Orders(BaxOrdersDbContext db, ProductVariant variant, string tag)
    {
        private readonly PostgresLocationCodeGenerator _codes = new(db);

        public async Task<Location> LocationAsync(string name)
        {
            var location = new Location(await _codes.NextAsync(None), $"{name} {tag}");
            db.Locations.Add(location);
            await db.SaveChangesAsync(None);
            return location;
        }

        public async Task OrderAsync(Location location, int month)
        {
            var request = new OrderRequest(location, new DateOnly(2026, month, 1));
            request.AddItem(variant, 2m, 10m);
            db.OrderRequests.Add(request);
            await db.SaveChangesAsync(None);
        }
    }
}
