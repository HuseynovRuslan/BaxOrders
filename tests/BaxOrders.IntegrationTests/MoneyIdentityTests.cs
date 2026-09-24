using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Common;
using BaxOrders.Application.Decisions;
using BaxOrders.Application.Reports;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The arithmetic a manager checks by hand, end to end.
/// </summary>
/// <remarks>
/// Every one of these is a subtraction or an addition somebody can perform on the figures in front of them.
/// If any of them fails, the page is wrong however defensible the arithmetic behind it was: a reader who
/// subtracts two numbers on the screen and does not get the third has caught the system lying to them, and
/// has no way to know which of the three to believe.
/// <para>
/// The world is built so that the averages land on half a qəpik, because that is the only place the old
/// behaviour and the new one differ. Before the inputs were rounded, every identity below held for ordinary
/// figures and broke for these.
/// </para>
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class MoneyIdentityTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;
    private static readonly DateOnly September = new(2026, 9, 1);

    public static TheoryData<AnalyticsComparisonBasis, string?, string?> EveryBasis() => new()
    {
        { AnalyticsComparisonBasis.PreviousMonth, null, null },
        { AnalyticsComparisonBasis.Previous3MonthAverage, null, null },
        { AnalyticsComparisonBasis.Previous6MonthAverage, null, null },
        { AnalyticsComparisonBasis.AllPriorMonths, null, null },
        { AnalyticsComparisonBasis.CustomRange, "2026-05", "2026-08" },
        { AnalyticsComparisonBasis.CustomRange, "2026-07", "2026-07" },
    };

    /// <summary>The row: what it spent, what it spent before, and the difference between those two figures.</summary>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task A_rows_difference_is_its_own_two_cells_subtracted(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        foreach (var row in await RowsAsync(db, world, basis, from, to))
        {
            if (!row.ComparisonAvailable)
            {
                continue;
            }

            Assert.Equal(row.Current.KnownAmount - row.Baseline.KnownAmount, row.KnownAmountDelta);
        }
    }

    /// <summary>And every one of those figures is a whole number of qəpik, so the screen never rounds again.</summary>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task Nothing_leaves_the_backend_at_a_finer_scale_than_a_qepik(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        foreach (var row in await RowsAsync(db, world, basis, from, to))
        {
            Assert.Equal(Money.RoundCents(row.Current.KnownAmount), row.Current.KnownAmount);
            Assert.Equal(Money.RoundCents(row.Baseline.KnownAmount), row.Baseline.KnownAmount);
            Assert.Equal(Money.RoundCents(row.KnownAmountDelta), row.KnownAmountDelta);
            Assert.All(row.Causes, cause => Assert.Equal(Money.RoundCents(cause.Amount), cause.Amount));
        }
    }

    /// <summary>The reasons a month changed add up to the change, with nothing left over.</summary>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_reasons_add_up_to_the_difference_they_explain(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var explained = 0;
        foreach (var row in await RowsAsync(db, world, basis, from, to))
        {
            if (row.Causes.Count == 0)
            {
                continue;
            }

            Assert.Equal(row.KnownAmountDelta, row.Causes.Sum(cause => cause.Amount));
            explained++;
        }

        // Otherwise this would pass by explaining nothing at all.
        Assert.True(explained > 0);
    }

    /// <summary>
    /// The headline: the column added up, and its own two figures subtracted. Both, at once, exactly.
    /// </summary>
    /// <remarks>
    /// Taken from the partition rather than from a page of rows, because the partition carries every object in
    /// the company and a page carries twenty-five. What it asserts is the same claim the footer row makes.
    /// </remarks>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_headline_is_the_column_added_up_and_its_own_subtraction(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        await WorldAsync(db);
        var summary = (await DashboardAsync(db, basis, from, to))!.Summary;
        var compared = summary.Partition.Compared;

        Assert.Equal(summary.ComparedCurrent.KnownAmount, compared.Sum(member => member.CurrentKnownAmount ?? 0m));
        Assert.Equal(summary.Baseline.KnownAmount, compared.Sum(member => member.BaselineKnownAmount ?? 0m));
        Assert.Equal(summary.KnownAmountDelta, compared.Sum(member => member.KnownAmountDelta ?? 0m));
        Assert.Equal(
            summary.ComparedCurrent.KnownAmount - summary.Baseline.KnownAmount,
            summary.KnownAmountDelta);

        // And each object in it is subtractable in its own right.
        Assert.All(compared, member =>
            Assert.Equal(member.CurrentKnownAmount - member.BaselineKnownAmount, member.KnownAmountDelta));
    }

    /// <summary>
    /// The order page, the dashboard card and the table row are one answer, and stay one answer now that the
    /// answer is rounded. This is Task 1's guarantee, re-checked against the figures Task 1c changed.
    /// </summary>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_order_page_and_the_row_still_give_one_answer(
        AnalyticsComparisonBasis basis, string? from, string? to)
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var decisions = new OrderDecisionContextQueries(db);

        foreach (var row in await RowsAsync(db, world, basis, from, to))
        {
            if (row.CurrentRequestId is not { } requestId)
            {
                continue;
            }

            var context = await decisions.GetAsync(requestId, new DecisionContextQuery(basis, from, to), None);
            Assert.NotNull(context);

            Assert.Equal(row.Current.KnownAmount, context.Current.KnownAmount);
            Assert.Equal(row.Baseline.KnownAmount, context.Primary.BaselineKnownAmount);
            Assert.Equal(row.KnownAmountDelta, context.Primary.DeltaAmount);
            Assert.Equal(row.KnownAmountPercentChange, context.Primary.DeltaPercent);
        }
    }

    /// <summary>
    /// The case the whole task is about, spelled out in the figures the screen shows.
    /// </summary>
    /// <remarks>
    /// Three months averaging 1 069,505 exactly. The baseline shows 1 069,51 and the month shows 2 000,00, so
    /// the difference is 930,49. Computed from the unrounded average it came to 930,495 and printed as 930,50
    /// — a figure nothing else on the page could produce.
    /// </remarks>
    [PostgresFact]
    public async Task A_half_qepik_baseline_still_leaves_the_row_subtractable()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Assert.Single(
            await RowsAsync(db, world, AnalyticsComparisonBasis.Previous3MonthAverage, null, null),
            item => item.LocationId == world.HalfQepik);

        Assert.Equal(2000m, row.Current.KnownAmount);
        Assert.Equal(1069.51m, row.Baseline.KnownAmount);
        Assert.Equal(930.49m, row.KnownAmountDelta);
    }

    /// <summary>A month cell and the cell before it, in the monthly report, obey the same rule.</summary>
    [PostgresFact]
    public async Task A_monthly_report_cell_is_subtractable_from_the_one_before_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var report = await new MonthlyReportQueries(db).GetAsync(
            new MonthlyReportQuery(2026, Search: world.Tag), None);

        var row = Assert.Single(report.Rows, item => item.LocationId == world.HalfQepik);
        var checkedCells = 0;
        foreach (var cell in row.Months)
        {
            Assert.Equal(Money.RoundCents(cell.KnownAmount), cell.KnownAmount);
            if (cell.KnownAmount is { } amount && cell.PreviousMonthKnownAmount is { } previous)
            {
                Assert.Equal(amount - previous, cell.DeltaAmount);
                checkedCells++;
            }
        }

        // Otherwise this would pass over twelve empty months.
        Assert.True(checkedCells > 0);

        // And the year is its cells added up, with nothing accumulating along the way.
        Assert.Equal(row.KnownAmount, row.Months.Sum(cell => cell.KnownAmount ?? 0m));
    }

    // ---- fixture -----------------------------------------------------------------------------------------

    private static Task<ManagementDashboardDto?> DashboardAsync(
        BaxOrdersDbContext db, AnalyticsComparisonBasis basis, string? from, string? to, string? search = null) =>
        new ManagementDashboardQueries(db).GetAsync(
            September,
            new DashboardQuery(basis, Search: search, PageSize: 100, CustomStart: from, CustomEnd: to),
            None);

    private static async Task<IReadOnlyList<LocationDashboardRowDto>> RowsAsync(
        BaxOrdersDbContext db, World world, AnalyticsComparisonBasis basis, string? from, string? to) =>
        (await DashboardAsync(db, basis, from, to, world.Tag))!.Rows.Items;

    private sealed record World(string Tag, int HalfQepik, int Ordinary);

    /// <summary>
    /// Two objects whose months are chosen to land on half a qəpik under more than one basis, and a second
    /// product so the difference splits into a quantity effect and a price effect rather than falling whole
    /// into one category.
    /// </summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Guid.NewGuid().ToString("N")[..8];
        var codes = new PostgresLocationCodeGenerator(db);

        async Task<Location> LocationAsync(string name)
        {
            var location = new Location(await codes.NextAsync(None), $"{name} {tag}");
            db.Locations.Add(location);
            await db.SaveChangesAsync(None);
            return location;
        }

        var halfQepik = await LocationAsync("Yarım qəpik obyekti");
        var ordinary = await LocationAsync("Adi obyekt");

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS", None);
        var productCodes = new PostgresProductCodeGenerator(db);
        var first = new Product(await productCodes.NextAsync(None), $"Birinci mal {tag}");
        var second = new Product(await productCodes.NextAsync(None), $"İkinci mal {tag}");
        db.Products.AddRange(first, second);
        await db.SaveChangesAsync(None);

        var firstVariant = first.AddVariant(null, null, null, pieces);
        var secondVariant = second.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync(None);

        OrderRequest Order(Location location, int month, params (ProductVariant Variant, decimal Quantity, decimal Price)[] lines)
        {
            var request = new OrderRequest(location, new DateOnly(2026, month, 1));
            foreach (var (variant, quantity, price) in lines)
            {
                request.AddItem(variant, quantity, price);
            }

            return request;
        }

        db.OrderRequests.AddRange(
            // June, July, August come to 1 069,50 · 1 069,50 · 1 069,515 — an average of 1 069,505 exactly.
            Order(halfQepik, 3, (firstVariant, 3m, 333.3333m)),
            Order(halfQepik, 4, (firstVariant, 3m, 333.3333m)),
            Order(halfQepik, 5, (firstVariant, 3m, 333.3350m)),
            Order(halfQepik, 6, (firstVariant, 3m, 356.5000m)),
            Order(halfQepik, 7, (firstVariant, 3m, 356.5000m)),
            Order(halfQepik, 8, (firstVariant, 3m, 356.5050m)),
            Order(halfQepik, 9, (firstVariant, 5m, 400m)),
            // An ordinary object whose two products move in opposite directions, so the explanation splits.
            Order(ordinary, 7, (firstVariant, 4m, 12.3456m), (secondVariant, 9m, 7.7777m)),
            Order(ordinary, 8, (firstVariant, 6m, 12.3456m), (secondVariant, 9m, 8.8888m)),
            Order(ordinary, 9, (firstVariant, 11m, 13.5791m), (secondVariant, 4m, 8.8888m)));

        await db.SaveChangesAsync(None);
        db.ChangeTracker.Clear();

        return new World(tag, halfQepik.Id, ordinary.Id);
    }
}
