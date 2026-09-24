using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Approvals;
using BaxOrders.Application.Decisions;
using BaxOrders.Application.Orders;
using BaxOrders.Application.Orders.Pricing;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Application.Reports;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Every screen must give the same answer to "how many lines have no price, and how many of those matter".
/// </summary>
/// <remarks>
/// One object, one month, four lines: one priced, one unclassified, one owed a price, one supplied by the
/// company itself. Whichever endpoint is asked, the answer is <b>two warnings and one internal supply</b>,
/// and the amount is incomplete.
/// <para>
/// This is the test that would have caught the bug it was written for. The object screen counted raw unpriced
/// lines and reported two problems where the order screen reported one — for the very same month — because
/// each read model did its own counting. Adding a screen without routing it through the shared rule breaks
/// this test, which is the point.
/// </para>
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class PricingCountConsistencyTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;
    private static readonly DateOnly September = new(2026, 9, 1);

    private const int Warnings = 2;
    private const int InternalSupply = 1;

    [PostgresFact]
    public async Task The_order_screen_header_counts_two_and_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var detail = (await new OrderRequestQueries(db, TestCurrentUser.Anonymous())
            .GetAsync(world.OrderId, new OrderItemQuery(PageSize: 50), None))!;

        Assert.Equal(Warnings, detail.MissingPriceItemCount);
    }

    [PostgresFact]
    public async Task The_order_side_panel_counts_two_and_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var workflow = (await new OrderWorkflowService(db, TestCurrentUser.Anonymous(), new PostgresOrderRequestLock(db))
            .GetAsync(world.OrderId, None))!;

        Assert.Equal(Warnings, workflow.MissingPriceItemCount);
        Assert.Equal(InternalSupply, workflow.PriceNotRequiredItemCount);
        Assert.False(workflow.AmountIsComplete);
    }

    [PostgresFact]
    public async Task The_decision_screen_counts_two_and_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var context = (await new OrderDecisionContextQueries(db)
            .GetAsync(world.OrderId, new DecisionContextQuery(), None))!;

        Assert.Equal(Warnings, context.Current.MissingPriceItemCount);
        Assert.Equal(InternalSupply, context.Current.PriceNotRequiredItemCount);
        Assert.False(context.Current.IsComplete);
    }

    [PostgresFact]
    public async Task The_dashboard_counts_two_and_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var dashboard = (await new ManagementDashboardQueries(db).GetAsync(
            September, new DashboardQuery(Search: world.LocationName, PageSize: 100), None))!;
        var row = Assert.Single(dashboard.Rows.Items);

        Assert.Equal(Warnings, row.Current.MissingPriceItemCount);
        Assert.Equal(InternalSupply, row.Current.PriceNotRequiredItemCount);
        Assert.False(row.Current.IsComplete);
        // And the object is one of those with a price warning, because it has one.
        Assert.Equal(PriceCoverageState.Partial, row.CurrentPriceCoverage);
    }

    [PostgresFact]
    public async Task The_monthly_report_counts_two_and_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var report = await new MonthlyReportQueries(db)
            .GetAsync(new MonthlyReportQuery(2026, Search: world.LocationName), None);
        var cell = Assert.Single(report.Rows).Months[8];

        Assert.Equal(Warnings, cell.MissingPriceItemCount);
        Assert.False(cell.AmountIsComplete);
    }

    /// <summary>The screen that used to say two problems where there is one.</summary>
    [PostgresFact]
    public async Task The_objects_list_counts_two_and_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var list = await new LocationOrderQueries(db)
            .ListAsync(new LocationOrderListQuery(Search: world.LocationName), None);
        var row = Assert.Single(list.Locations.Items);

        Assert.Equal(Warnings, row.MissingPriceItemCount);
        Assert.Equal(InternalSupply, row.InternalSupplyItemCount);
        Assert.Equal(Warnings, row.LatestMissingPriceItemCount);
        Assert.Equal(InternalSupply, row.LatestPriceNotRequiredItemCount);
        Assert.False(row.LatestAmountIsComplete);
    }

    [PostgresFact]
    public async Task The_object_page_header_and_month_row_count_two_and_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var history = (await new LocationOrderQueries(db)
            .GetHistoryAsync(world.LocationId, new LocationHistoryQuery(), None))!;

        Assert.Equal(Warnings, history.MissingPriceItemCount);
        Assert.Equal(InternalSupply, history.InternalSupplyItemCount);

        var month = Assert.Single(history.Requests.Items);
        Assert.Equal(Warnings, month.MissingPriceItemCount);
        Assert.Equal(InternalSupply, month.InternalSupplyItemCount);
        Assert.False(month.AmountIsComplete);
    }

    [PostgresFact]
    public async Task The_object_comparison_counts_two_and_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var comparison = (await new OrderAnalyticsQueries(db)
            .CompareAsync(world.LocationId, September, new ComparisonQuery(PageSize: 100), None))!;

        Assert.Equal(Warnings, comparison.Summary.CurrentMissingPriceItemCount);
        Assert.Equal(InternalSupply, comparison.Summary.CurrentPriceNotRequiredItemCount);
        Assert.False(comparison.Summary.AmountIsComplete);
    }

    [PostgresFact]
    public async Task The_approval_inbox_counts_two()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var manager = await TestCurrentUser.ManagerAsync(db, "Sınaq rəhbəri");

        var request = await db.OrderRequests.Include(order => order.Items)
            .SingleAsync(order => order.Id == world.OrderId, None);
        request.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);
        await db.SaveChangesAsync(None);

        var inbox = await new ApprovalInboxQueries(db, manager)
            .GetAsync(new ApprovalInboxQuery(Search: world.LocationName), None);
        var row = Assert.Single(inbox.Rows.Items);

        Assert.Equal(Warnings, row.MissingPriceItemCount);
        Assert.False(row.AmountIsComplete);
    }

    [PostgresFact]
    public async Task The_product_history_reports_internal_supply_without_a_warning()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var trend = (await new OrderAnalyticsQueries(db)
            .GetTrendAsync(world.LocationId, world.InternalVariantId, new TrendQuery(), None))!;
        var month = Assert.Single(trend.Points);

        Assert.Equal(0, month.MissingRequiredPriceItemCount);
        Assert.Equal(1, month.PriceNotRequiredItemCount);
        // Real quantity, and no money at all — never a fabricated zero.
        Assert.Equal(6m, month.Quantity);
        Assert.Null(month.KnownAmount);
        Assert.Null(month.WeightedUnitPrice);
    }

    [PostgresFact]
    public async Task The_classification_queue_sees_the_three_unpriced_lines()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var review = await new PricingModeReviewService(db, TestCurrentUser.Anonymous())
            .GetAsync(new PricingModeReviewQuery(Mode: null, Search: world.ProductTag), None);

        // The pager follows the search; the tab counters describe the whole queue, which the shared test
        // database fills with other tests' lines as well.
        Assert.Equal(3, review.TotalCount);
        Assert.Equal(3, review.Rows.Count);
        Assert.True(review.Unresolved >= 1);
        Assert.True(review.MissingRequiredPrice >= 1);
        Assert.True(review.InternalFreeSupply >= 1);
    }

    /// <summary>The domain's own counts, which the acknowledgement rule and the workflow read.</summary>
    [PostgresFact]
    public async Task The_order_itself_counts_two_and_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var request = await db.OrderRequests.Include(order => order.Items)
            .SingleAsync(order => order.Id == world.OrderId, None);

        Assert.Equal(Warnings, request.MissingRequiredPriceItemCount);
        Assert.Equal(InternalSupply, request.InternalFreeSupplyItemCount);
        Assert.Equal(1, request.UnresolvedPricingItemCount);
        Assert.Equal(
            new LinePricingCounts(4, 1, Warnings, InternalSupply),
            LinePricingCounts.Of(request.Items));
    }

    // ---- E. the classification queue pages the set it is showing ----------------------------------------

    /// <summary>
    /// The footer used to count the whole queue while the table showed one filtered row, so "Növbəti" led to
    /// a page that was not there.
    /// </summary>
    [PostgresFact]
    public async Task Filtering_the_queue_pages_the_filtered_set()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var service = new PricingModeReviewService(db, TestCurrentUser.Anonymous());

        var all = await service.GetAsync(new PricingModeReviewQuery(Mode: null, Search: world.ProductTag), None);
        Assert.Equal(3, all.TotalCount);

        foreach (var (mode, expected) in new[]
        {
            (PricingMode.Unresolved, 1),
            (PricingMode.PriceRequired, 1),
            (PricingMode.InternalFreeSupply, 1),
        })
        {
            var page = await service.GetAsync(new PricingModeReviewQuery(mode, world.ProductTag), None);

            Assert.Equal(expected, page.TotalCount);
            Assert.Equal(expected, page.Rows.Count);
            // The tab counters still describe the whole queue; only the pager follows the filter.
            Assert.True(page.Unresolved >= 1);
        }
    }

    [PostgresFact]
    public async Task Searching_the_queue_pages_the_searched_set()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var service = new PricingModeReviewService(db, TestCurrentUser.Anonymous());

        var searched = await service.GetAsync(new PricingModeReviewQuery(Mode: null, Search: world.InternalProductName), None);

        Assert.Equal(1, searched.TotalCount);
        Assert.Single(searched.Rows);
    }

    [PostgresFact]
    public async Task A_page_past_the_filtered_end_is_empty_rather_than_offered()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var page = await new PricingModeReviewService(db, TestCurrentUser.Anonymous()).GetAsync(
            new PricingModeReviewQuery(PricingMode.InternalFreeSupply, world.ProductTag, Page: 2, PageSize: 50), None);

        Assert.Equal(1, page.TotalCount);
        Assert.Empty(page.Rows);
    }

    // ---- fixture ---------------------------------------------------------------------------------------

    private sealed record World(
        int LocationId, string LocationName, long OrderId, long InternalVariantId,
        string ProductTag, string InternalProductName);

    /// <summary>
    /// One month with all four states in it: priced, unclassified, owed a price, supplied by the company.
    /// </summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Guid.NewGuid().ToString("N")[..8];
        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Qiymət obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync(None);

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS", None);
        var codes = new PostgresProductCodeGenerator(db);
        var priced = new Product(await codes.NextAsync(None), $"Qiymətli mal {tag}");
        var unclassified = new Product(await codes.NextAsync(None), $"Təsnifsiz mal {tag}");
        var owed = new Product(await codes.NextAsync(None), $"Borclu mal {tag}");
        var free = new Product(await codes.NextAsync(None), $"Daxili mal {tag}");
        db.Products.AddRange(priced, unclassified, owed, free);
        await db.SaveChangesAsync(None);

        var pricedVariant = priced.AddVariant(null, null, null, pieces);
        var unclassifiedVariant = unclassified.AddVariant(null, null, null, pieces);
        var owedVariant = owed.AddVariant(null, null, null, pieces);
        var freeVariant = free.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync(None);

        var order = new OrderRequest(location, September);
        order.AddItem(pricedVariant, 10m, 5m);
        var unclassifiedLine = order.AddItem(unclassifiedVariant, 4m, null);
        order.AddItem(owedVariant, 3m, null);
        var freeLine = order.AddItem(freeVariant, 6m, null);
        db.OrderRequests.Add(order);
        await db.SaveChangesAsync(None);

        // The two answers a person gives; the third line is left unanswered on purpose.
        var actor = WorkflowActor.User(Guid.NewGuid(), "Sınaq");
        unclassifiedLine.SetPricingMode(PricingMode.Unresolved, actor, null, DateTime.UtcNow);
        freeLine.SetPricingMode(PricingMode.InternalFreeSupply, actor, null, DateTime.UtcNow);
        await db.SaveChangesAsync(None);
        db.ChangeTracker.Clear();

        return new World(location.Id, location.Name, order.Id, freeVariant.Id, tag, free.Name);
    }
}
