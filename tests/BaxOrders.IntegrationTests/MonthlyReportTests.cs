using BaxOrders.Application.Reports;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The year-at-a-glance report, against a real PostgreSQL. Its whole value is that a reader can trust the empty
/// cells as much as the full ones, so most of what is pinned here is what the report refuses to claim.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class MonthlyReportTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    // ---- the shape of a year -------------------------------------------------------------------------

    [PostgresFact]
    public async Task Every_location_gets_all_twelve_months_whether_it_ordered_in_them_or_not()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await ReportAsync(db, 2026), world.LocationId);

        Assert.Equal(12, row.Months.Count);
        Assert.Equal(Enumerable.Range(1, 12), row.Months.Select(month => month.Month));
    }

    [PostgresFact]
    public async Task A_month_with_no_request_is_empty_and_never_a_zero()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await ReportAsync(db, 2026), world.LocationId);
        var april = row.Months[3];

        Assert.Null(april.OrderRequestId);
        Assert.Null(april.Status);
        // The location did not order in April. That is not the same as ordering nothing, so there is no zero
        // here, no difference against March, and nothing a reader could mistake for a spend of 0.
        Assert.Null(april.KnownAmount);
        Assert.Null(april.DeltaAmount);
        Assert.Equal(0, april.ItemCount);
    }

    [PostgresFact]
    public async Task A_real_zero_survives_as_a_zero()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await ReportAsync(db, 2026), world.LocationId);
        var august = row.Months[7];

        // August has a request whose only line is priced at nothing. Zero is what was ordered, and zero is shown.
        Assert.NotNull(august.OrderRequestId);
        Assert.Equal(0m, august.KnownAmount);
    }

    [PostgresFact]
    public async Task A_month_carries_its_own_request_version_and_status()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var june = Row(await ReportAsync(db, 2026), world.LocationId).Months[5];

        Assert.Equal(world.JuneRequestId, june.OrderRequestId);
        Assert.Equal(1, june.Version);
        Assert.Equal(OrderRequestStatus.Draft, june.Status);
    }

    [PostgresFact]
    public async Task Only_the_highest_version_of_a_month_is_reported()
    {
        await using var db = database.CreateContext();
        var world = await VersionedWorldAsync(db);

        var may = Row(await ReportAsync(db, 2026), world.LocationId).Months[4];

        // Version 1 ordered 10, version 2 ordered 40. Neither 10 nor 50 is the answer.
        Assert.Equal(world.SecondVersionId, may.OrderRequestId);
        Assert.Equal(2, may.Version);
        Assert.Equal(40m, may.KnownAmount);
    }

    // ---- the difference ------------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_month_is_compared_with_the_month_before_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await ReportAsync(db, 2026), world.LocationId);
        var june = row.Months[5];

        Assert.Equal(200m, june.PreviousMonthKnownAmount);
        Assert.Equal(300m, june.KnownAmount);
        Assert.Equal(100m, june.DeltaAmount);
        Assert.Equal(50m, june.DeltaPercent);
    }

    [PostgresFact]
    public async Task January_is_compared_with_the_December_of_the_year_before()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var january = Row(await ReportAsync(db, 2026), world.LocationId).Months[0];

        // December 2025 is outside the reported year but is still the month before January 2026.
        Assert.Equal(80m, january.PreviousMonthKnownAmount);
        Assert.Equal(100m, january.KnownAmount);
        Assert.Equal(20m, january.DeltaAmount);
    }

    [PostgresFact]
    public async Task A_month_whose_predecessor_does_not_exist_is_offered_no_difference()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var may = Row(await ReportAsync(db, 2026), world.LocationId).Months[4];

        // April has no request, so May is not "up from nothing" — it is simply uncompared.
        Assert.Null(may.PreviousMonthKnownAmount);
        Assert.Null(may.DeltaAmount);
        Assert.Null(may.DeltaPercent);
        Assert.Equal(200m, may.KnownAmount);
    }

    // ---- incomplete prices ---------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_month_with_an_unpriced_line_says_how_many_rather_than_hiding_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var july = Row(await ReportAsync(db, 2026), world.LocationId).Months[6];

        Assert.Equal(2, july.MissingPriceItemCount);
        Assert.False(july.AmountIsComplete);
        // The money that is known is still shown; it is the completeness that is qualified, not the figure.
        Assert.Equal(400m, july.KnownAmount);
    }

    [PostgresFact]
    public async Task A_fully_priced_month_claims_nothing_about_missing_prices()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var june = Row(await ReportAsync(db, 2026), world.LocationId).Months[5];

        Assert.Equal(0, june.MissingPriceItemCount);
        Assert.True(june.AmountIsComplete);
    }

    // ---- totals and filtering ------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_rows_year_is_the_sum_of_the_months_it_actually_has()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await ReportAsync(db, 2026), world.LocationId);

        Assert.Equal(100m + 200m + 300m + 400m + 0m, row.KnownAmount);
        Assert.Equal(5, row.RequestCount);
        Assert.Equal(7, row.MonthsWithoutRequest);
    }

    [PostgresFact]
    public async Task A_search_narrows_the_rows_and_leaves_the_totals_describing_everything()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var all = await ReportAsync(db, 2026);
        var found = await ReportAsync(db, 2026, world.LocationName);

        Assert.Equal(world.LocationId, Assert.Single(found.Rows).LocationId);
        Assert.Equal(1, found.FilteredLocationCount);
        Assert.Equal(all.LocationCount, found.LocationCount);
        // The company's own figures do not shrink because somebody typed a name into a box.
        Assert.Equal(all.KnownAmount, found.KnownAmount);
        Assert.Equal(all.RequestCount, found.RequestCount);
    }

    [PostgresFact]
    public async Task The_year_defaults_to_one_that_has_something_in_it()
    {
        await using var db = database.CreateContext();
        await WorldAsync(db);

        var report = await new MonthlyReportQueries(db).GetAsync(new MonthlyReportQuery(), None);

        Assert.Contains(report.Year, report.AvailableYears);
        Assert.NotEmpty(report.AvailableYears);
    }


    // ---- the catalogue, not only the locations that ordered ------------------------------------------

    [PostgresFact]
    public async Task A_location_that_has_never_ordered_still_has_a_row()
    {
        await using var db = database.CreateContext();
        var quiet = await BareLocationAsync(db);

        var report = await ReportAsync(db, 2026);

        // A yearly report exists partly to show who did not order. Leaving the row out would hide exactly the
        // thing somebody opened the report to find.
        var row = Row(report, quiet.LocationId);
        Assert.Equal(quiet.LocationName, row.LocationName);
        Assert.Equal(0, row.RequestCount);
        Assert.Equal(12, row.MonthsWithoutRequest);
    }

    [PostgresFact]
    public async Task All_twelve_of_its_months_are_no_request_rather_than_zero()
    {
        await using var db = database.CreateContext();
        var quiet = await BareLocationAsync(db);

        var row = Row(await ReportAsync(db, 2026), quiet.LocationId);

        Assert.All(row.Months, month =>
        {
            Assert.Null(month.OrderRequestId);
            Assert.Null(month.Status);
            // Not a zero, and not a difference against one either.
            Assert.Null(month.KnownAmount);
            Assert.Null(month.PreviousMonthKnownAmount);
            Assert.Null(month.DeltaAmount);
            Assert.Equal(0, month.ItemCount);
        });

        Assert.Null(row.KnownAmount);
    }

    [PostgresFact]
    public async Task It_adds_no_money_and_no_requests_to_the_year()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var before = await ReportAsync(db, 2026);
        await BareLocationAsync(db);
        var after = await ReportAsync(db, 2026);

        // One more row, and not one manat more: a location that ordered nothing contributes nothing.
        Assert.Equal(before.LocationCount + 1, after.LocationCount);
        Assert.Equal(before.KnownAmount, after.KnownAmount);
        Assert.Equal(before.RequestCount, after.RequestCount);
        // The months are a list, which a record compares by reference; the figures in them are what matter.
        var (was, now) = (Row(before, world.LocationId), Row(after, world.LocationId));
        Assert.Equal(was with { Months = [] }, now with { Months = [] });
        Assert.Equal(was.Months, now.Months);
    }

    [PostgresFact]
    public async Task A_location_that_ordered_is_untouched_by_the_wider_universe()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        await BareLocationAsync(db);

        var row = Row(await ReportAsync(db, 2026), world.LocationId);

        Assert.Equal(5, row.RequestCount);
        Assert.Equal(100m + 200m + 300m + 400m + 0m, row.KnownAmount);
        Assert.Equal(300m, row.Months[5].KnownAmount);
    }

    [PostgresFact]
    public async Task Adding_locations_that_never_ordered_costs_no_extra_query()
    {
        await using var db = database.CreateContext();
        await WorldAsync(db);
        await BareLocationAsync(db);
        await BareLocationAsync(db);
        await BareLocationAsync(db);

        var counter = new CountingCommandInterceptor();
        await using (var counted = new BaxOrdersDbContext(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(PostgresDatabaseFixture.ConnectionString)
            .AddInterceptors(counter)
            .Options))
        {
            await new MonthlyReportQueries(counted).GetAsync(new MonthlyReportQuery(2026), None);
        }

        // Still the years, the locations, the requests and their lines — a row of dashes needs no round trip.
        Assert.Equal(4, counter.Count);
    }

    // ---- what it costs to ask ------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_whole_year_is_four_queries_not_one_per_cell()
    {
        await using var db = database.CreateContext();
        await WorldAsync(db);

        var counter = new CountingCommandInterceptor();
        await using (var counted = new BaxOrdersDbContext(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(PostgresDatabaseFixture.ConnectionString)
            .AddInterceptors(counter)
            .Options))
        {
            await new MonthlyReportQueries(counted).GetAsync(new MonthlyReportQuery(2026), None);
        }

        // The years, the locations, the requests of thirteen months, and their lines. Twenty-six locations
        // times twelve months would otherwise be three hundred round trips.
        Assert.Equal(4, counter.Count);
    }

    [PostgresFact]
    public async Task Reading_the_report_writes_nothing()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var before = await FingerprintAsync(db, world.LocationId);
        await ReportAsync(db, 2026);
        await ReportAsync(db, 2025);
        var after = await FingerprintAsync(db, world.LocationId);

        Assert.Equal(before, after);
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private static Task<MonthlyReportDto> ReportAsync(BaxOrdersDbContext db, int year, string? search = null) =>
        new MonthlyReportQueries(db).GetAsync(new MonthlyReportQuery(year, search), None);

    private static MonthlyReportRowDto Row(MonthlyReportDto report, int locationId) =>
        report.Rows.Single(row => row.LocationId == locationId);

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
            .Select(item => new { item.Id, item.Quantity, item.UnitPrice })
            .ToListAsync();

        return string.Join('|', requests.Select(request => $"{request.Id}:{request.Version}:{request.Status}"))
            + "//"
            + string.Join('|', items.Select(item => $"{item.Id}:{item.Quantity}:{item.UnitPrice}"));
    }

    private sealed record World(int LocationId, string LocationName, long JuneRequestId);

    /// <summary>A catalogue location with no order of any kind — active, watched, and empty.</summary>
    private static async Task<World> BareLocationAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Sifarişsiz obyekt {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        return new World(location.Id, location.Name, 0);
    }

    /// <summary>
    /// One location's 2026: five months that exist, one of them a genuine zero and one of them partly unpriced,
    /// a gap in April, and a December 2025 behind January so the year boundary has something to be compared with.
    /// </summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Hesabat obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = await ProductAsync(db, new PostgresProductCodeGenerator(db), $"Hesabat malı {tag}");
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var december = new OrderRequest(location, new DateOnly(2025, 12, 1));
        december.AddItem(variant, 8m, 10m);

        var january = new OrderRequest(location, new DateOnly(2026, 1, 1));
        january.AddItem(variant, 10m, 10m);

        // February and March are absent as well as April; the year is deliberately full of holes.
        var may = new OrderRequest(location, new DateOnly(2026, 5, 1));
        may.AddItem(variant, 20m, 10m);

        var june = new OrderRequest(location, new DateOnly(2026, 6, 1));
        june.AddItem(variant, 30m, 10m);

        var july = new OrderRequest(location, new DateOnly(2026, 7, 1));
        july.AddItem(variant, 40m, 10m);
        july.AddItem(variant, 5m, null);
        july.AddItem(variant, 7m, null);

        // A month that really did order nothing worth anything: priced, and priced at zero.
        var august = new OrderRequest(location, new DateOnly(2026, 8, 1));
        august.AddItem(variant, 3m, 0m);

        db.OrderRequests.AddRange(december, january, may, june, july, august);
        await db.SaveChangesAsync();

        return new World(location.Id, location.Name, june.Id);
    }

    private sealed record VersionedWorld(int LocationId, long SecondVersionId);

    private static async Task<VersionedWorld> VersionedWorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Versiyalı hesabat {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = await ProductAsync(db, new PostgresProductCodeGenerator(db), $"Versiyalı hesabat malı {tag}");
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var first = new OrderRequest(location, new DateOnly(2026, 5, 1));
        first.AddItem(variant, 10m, 1m);
        db.OrderRequests.Add(first);
        await db.SaveChangesAsync();

        first.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);
        var second = first.CreateNextVersion();
        second.AddItem(variant, 40m, 1m);
        db.OrderRequests.Add(second);
        await db.SaveChangesAsync();

        return new VersionedWorld(location.Id, second.Id);
    }

    private static async Task<Product> ProductAsync(BaxOrdersDbContext db, PostgresProductCodeGenerator codes, string name)
    {
        var product = new Product(await codes.NextAsync(None), name);
        db.Products.Add(product);
        return product;
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
