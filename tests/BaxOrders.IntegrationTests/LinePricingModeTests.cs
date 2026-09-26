using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Common;
using BaxOrders.Application.Orders.Pricing;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// What a blank price means once the answer belongs to the line rather than to the supplier.
/// </summary>
/// <remarks>
/// Task 11B put this on the supplier, and the business then corrected it: Qala anbar buys some of its material
/// through Cleanfix MMC and issues the rest free from the same store. One supplier is therefore both, and no
/// property of it can say which a given line was — so the answer moved onto the line, and a line nobody has
/// answered for is its own third state rather than a guess in either direction.
/// <para>
/// These tests hold the three apart end to end: a line somebody owes a price for keeps every warning and every
/// block it had, an internally supplied line loses all of them without a price being invented, and an
/// unclassified line is treated as the cautious case until a person says otherwise.
/// </para>
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class LinePricingModeTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    // ---- A. one supplier, two answers ----------------------------------------------------------------

    /// <summary>
    /// The case the whole feature exists for. Both lines come from the same store; one was bought through it
    /// and one was issued free, and nothing but the line itself can tell them apart.
    /// </summary>
    [PostgresFact]
    public async Task One_supplier_can_be_both_bought_from_and_supplied_by()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var bought = await ItemAsync(db, world.BoughtItemId);
        var free = await ItemAsync(db, world.FreeItemId);

        Assert.Equal(bought.SupplierId, free.SupplierId);
        Assert.Equal(PricingMode.PriceRequired, bought.PricingMode);
        Assert.Equal(PricingMode.InternalFreeSupply, free.PricingMode);
        Assert.True(bought.IsMissingRequiredPrice);
        Assert.False(free.IsMissingRequiredPrice);
    }

    [PostgresFact]
    public async Task A_line_nobody_has_classified_is_counted_with_the_gaps()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var unresolved = await ItemAsync(db, world.UnresolvedItemId);

        Assert.Equal(PricingMode.Unresolved, unresolved.PricingMode);
        // The cautious reading: an unanswered line must not be able to hide a real gap.
        Assert.True(unresolved.IsMissingRequiredPrice);
        Assert.False(unresolved.IsInternalFreeSupply);
    }

    [PostgresFact]
    public async Task A_line_with_no_supplier_at_all_is_read_as_bought()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var orphan = await ItemAsync(db, world.NoSupplierItemId);

        Assert.Null(orphan.SupplierId);
        Assert.Equal(PricingMode.PriceRequired, orphan.PricingMode);
        Assert.True(orphan.IsMissingRequiredPrice);
    }

    /// <summary>
    /// A recorded price is the strongest statement there is that a line was bought, so it settles the question
    /// by itself — whatever its supplier, and whatever anybody would like to record about it.
    /// </summary>
    [PostgresFact]
    public async Task A_line_that_carries_a_price_is_already_answered_for()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var priced = await ItemAsync(db, world.PricedItemId);

        Assert.Equal(7.5m, priced.UnitPrice);
        Assert.False(priced.IsMissingRequiredPrice);
        // The internal-supply label never replaces a price that was recorded.
        Assert.False(priced.IsInternalFreeSupply);
    }

    // ---- B. what the screens count -------------------------------------------------------------------

    [PostgresFact]
    public async Task The_order_counts_the_three_states_apart()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var order = await OrderAsync(db, world.OrderId);

        // Bought-unpriced and unclassified are both owed; the free line is not.
        Assert.Equal(3, order.MissingPriceItemCount);
        Assert.Equal(1, order.PriceNotRequiredItemCount);
        Assert.False(order.AmountIsComplete);
    }

    [PostgresFact]
    public async Task Approval_is_blocked_only_by_the_prices_somebody_owes()
    {
        await using var db = database.CreateContext();
        var world = await FreeOnlyWorldAsync(db);

        var request = await LoadAsync(db, world.OrderId);
        request.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);

        Assert.Equal(0, request.MissingRequiredPriceItemCount);
        Assert.Equal(2, request.InternalFreeSupplyItemCount);

        // No acknowledgement is asked for, because nothing is missing.
        request.Approve(WorkflowActor.System("Test"), null, missingPricesAcknowledged: false, DateTime.UtcNow);
        Assert.Equal(OrderRequestStatus.Approved, request.Status);
    }

    [PostgresFact]
    public async Task An_unclassified_line_still_demands_an_acknowledgement()
    {
        await using var db = database.CreateContext();
        var world = await UnresolvedOnlyWorldAsync(db);

        var request = await LoadAsync(db, world.OrderId);
        request.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);

        Assert.Equal(1, request.MissingRequiredPriceItemCount);
        Assert.Equal(1, request.UnresolvedPricingItemCount);
        Assert.Throws<MissingPriceAcknowledgementRequiredException>(() =>
            request.Approve(WorkflowActor.System("Test"), null, missingPricesAcknowledged: false, DateTime.UtcNow));
    }

    // ---- C. the review queue -------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_queue_lists_unclassified_lines_with_the_context_to_decide_on_them()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var review = await new PricingModeReviewService(db, TestCurrentUser.Anonymous())
            .GetAsync(new PricingModeReviewQuery(PricingMode.Unresolved, world.ProductName), None);

        var row = Assert.Single(review.Rows);
        Assert.Equal(world.UnresolvedItemId, row.OrderRequestItemId);
        Assert.Equal(PricingMode.Unresolved, row.PricingMode);
        // Everything a person needs to answer the question, without leaving the screen.
        Assert.Equal(world.LocationName, row.LocationName);
        Assert.Equal(world.Period, row.RequestPeriod);
        Assert.Equal(world.SupplierName, row.SupplierName);
        Assert.Equal(11m, row.Quantity);
    }

    [PostgresFact]
    public async Task Deciding_records_who_decided_and_why()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");

        var result = await new PricingModeReviewService(db, coordinator).SetAsync(
            new SetPricingModeCommand([world.UnresolvedItemId], PricingMode.InternalFreeSupply, "Obyekt təsdiqlədi"),
            None);

        Assert.Equal(1, result.Changed);

        var decision = await db.OrderItemPricingDecisions.AsNoTracking()
            .SingleAsync(row => row.OrderRequestItemId == world.UnresolvedItemId, None);

        Assert.Equal(PricingMode.Unresolved, decision.PreviousMode);
        Assert.Equal(PricingMode.InternalFreeSupply, decision.NewMode);
        Assert.Equal("Sınaq koordinatoru", decision.ActorDisplayName);
        Assert.Equal("Obyekt təsdiqlədi", decision.Reason);
    }

    /// <summary>
    /// The safeguard that this whole screen exists to provide. Marking one line of a mixed supplier says
    /// nothing about its siblings, and there is deliberately no way to say it about all of them at once.
    /// </summary>
    [PostgresFact]
    public async Task Deciding_one_line_says_nothing_about_the_others_from_the_same_supplier()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");

        await new PricingModeReviewService(db, coordinator).SetAsync(
            new SetPricingModeCommand([world.UnresolvedItemId], PricingMode.InternalFreeSupply, null), None);

        db.ChangeTracker.Clear();

        Assert.Equal(PricingMode.InternalFreeSupply, (await ItemAsync(db, world.UnresolvedItemId)).PricingMode);
        Assert.Equal(PricingMode.PriceRequired, (await ItemAsync(db, world.BoughtItemId)).PricingMode);
        Assert.Equal(PricingMode.InternalFreeSupply, (await ItemAsync(db, world.FreeItemId)).PricingMode);
    }

    [PostgresFact]
    public async Task Deciding_changes_no_money_no_quantity_and_no_provenance()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");
        var before = await FingerprintAsync(db, world.OrderId);

        await new PricingModeReviewService(db, coordinator).SetAsync(
            new SetPricingModeCommand([world.UnresolvedItemId], PricingMode.InternalFreeSupply, null), None);

        db.ChangeTracker.Clear();
        Assert.Equal(before, await FingerprintAsync(db, world.OrderId));
    }

    [PostgresFact]
    public async Task A_line_that_carries_a_price_is_not_in_question()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");

        await Assert.ThrowsAsync<DomainException>(() => new PricingModeReviewService(db, coordinator).SetAsync(
            new SetPricingModeCommand([world.PricedItemId], PricingMode.InternalFreeSupply, null), None));
    }

    [PostgresFact]
    public async Task Recording_the_answer_a_line_already_has_records_nothing()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");

        var result = await new PricingModeReviewService(db, coordinator).SetAsync(
            new SetPricingModeCommand([world.FreeItemId], PricingMode.InternalFreeSupply, null), None);

        Assert.Equal(0, result.Changed);
        Assert.Equal(1, result.Unchanged);
        Assert.Empty(await db.OrderItemPricingDecisions.AsNoTracking()
            .Where(row => row.OrderRequestItemId == world.FreeItemId).ToListAsync(None));
    }

    /// <summary>Nobody decides anonymously: the record would have nobody to name.</summary>
    [PostgresFact]
    public async Task Deciding_without_a_signed_in_person_is_refused()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        await Assert.ThrowsAnyAsync<Exception>(() =>
            new PricingModeReviewService(db, TestCurrentUser.Anonymous()).SetAsync(
                new SetPricingModeCommand([world.UnresolvedItemId], PricingMode.InternalFreeSupply, null), None));
    }

    [PostgresFact]
    public async Task Deciding_on_nothing_at_all_is_refused()
    {
        await using var db = database.CreateContext();
        await WorldAsync(db);
        var coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");

        await Assert.ThrowsAsync<ValidationException>(() => new PricingModeReviewService(db, coordinator).SetAsync(
            new SetPricingModeCommand([], PricingMode.InternalFreeSupply, null), None));
    }

    // ---- D. the queue empties ------------------------------------------------------------------------

    [PostgresFact]
    public async Task Answering_a_line_takes_it_out_of_the_missing_price_count()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");

        Assert.Equal(3, (await OrderAsync(db, world.OrderId)).MissingPriceItemCount);

        await new PricingModeReviewService(db, coordinator).SetAsync(
            new SetPricingModeCommand([world.UnresolvedItemId], PricingMode.InternalFreeSupply, null), None);

        db.ChangeTracker.Clear();
        var after = await OrderAsync(db, world.OrderId);
        Assert.Equal(2, after.MissingPriceItemCount);
        Assert.Equal(2, after.PriceNotRequiredItemCount);
    }

    // ---- E. the comparison windows the dashboard offers -----------------------------------------------

    /// <summary>
    /// The average of the months that exist, never the sum of them and never divided by the months that do not.
    /// </summary>
    [PostgresFact]
    public async Task Every_prior_month_averages_the_months_the_object_has()
    {
        await using var db = database.CreateContext();
        var world = await HistoryWorldAsync(db);

        var comparison = (await new OrderAnalyticsQueries(db).CompareAsync(
            world.LocationId, world.April,
            new ComparisonQuery(AnalyticsComparisonBasis.AllPriorMonths), None))!;

        // January 100, February none, March 300 → two available months, average 200. Never 400/3.
        Assert.Equal(2, comparison.Summary.AvailableBaselinePeriodCount);
        Assert.Equal(200m, comparison.Summary.BaselineKnownAmountTotal);
        Assert.Equal(500m, comparison.Summary.CurrentKnownAmountTotal);
        Assert.Equal(300m, comparison.Summary.KnownAmountDelta);
    }

    [PostgresFact]
    public async Task A_custom_range_of_one_month_compares_against_that_month()
    {
        await using var db = database.CreateContext();
        var world = await HistoryWorldAsync(db);

        var comparison = (await new OrderAnalyticsQueries(db).CompareAsync(
            world.LocationId, world.April,
            new ComparisonQuery(AnalyticsComparisonBasis.CustomRange, CustomStart: "2026-01", CustomEnd: "2026-01"),
            None))!;

        Assert.Equal(1, comparison.Summary.AvailableBaselinePeriodCount);
        Assert.Equal(100m, comparison.Summary.BaselineKnownAmountTotal);
        Assert.Equal(new DateOnly(2026, 1, 1), comparison.Summary.CustomStart);
    }

    /// <summary>
    /// A month inside the chosen range that the object has no request for is left out of the average rather
    /// than counted as zero — and it is still named as a month the reader asked for and did not get.
    /// </summary>
    [PostgresFact]
    public async Task A_custom_range_excludes_a_missing_month_without_turning_it_into_zero()
    {
        await using var db = database.CreateContext();
        var world = await HistoryWorldAsync(db);

        var comparison = (await new OrderAnalyticsQueries(db).CompareAsync(
            world.LocationId, world.April,
            new ComparisonQuery(AnalyticsComparisonBasis.CustomRange, CustomStart: "2026-01", CustomEnd: "2026-03"),
            None))!;

        Assert.Equal(3, comparison.Summary.ExpectedBaselinePeriodCount);
        Assert.Equal(2, comparison.Summary.AvailableBaselinePeriodCount);
        Assert.Equal(new DateOnly(2026, 2, 1), Assert.Single(comparison.Summary.MissingBaselinePeriods));
        // 100 and 300 over the two months that exist. Divided by three it would have been 133,33.
        Assert.Equal(200m, comparison.Summary.BaselineKnownAmountTotal);
    }

    [PostgresFact]
    public async Task A_custom_range_that_reaches_the_selected_month_is_refused()
    {
        await using var db = database.CreateContext();
        var world = await HistoryWorldAsync(db);

        await Assert.ThrowsAsync<ValidationException>(() => new OrderAnalyticsQueries(db).CompareAsync(
            world.LocationId, world.April,
            new ComparisonQuery(AnalyticsComparisonBasis.CustomRange, CustomStart: "2026-01", CustomEnd: "2026-04"),
            None));
    }

    /// <summary>
    /// The one thing section 11 forbids: a baseline from one window beside a cause from another. Both come
    /// from the same resolved months here, so the dashboard cannot show a six-month figure explained by last
    /// month's products.
    /// </summary>
    [PostgresFact]
    public async Task The_dashboard_reports_the_window_its_figures_were_computed_from()
    {
        await using var db = database.CreateContext();
        var world = await HistoryWorldAsync(db);

        var dashboard = (await new ManagementDashboardQueries(db).GetAsync(
            world.April,
            // The dashboard is company-wide and the fixture database is shared by the whole run, so the rows
            // are narrowed to this test's own object. The summary above it is not, and is not meant to be.
            new DashboardQuery(
                AnalyticsComparisonBasis.CustomRange,
                Search: world.LocationName,
                PageSize: 100,
                CustomStart: "2026-01",
                CustomEnd: "2026-03"),
            None))!;

        Assert.Equal(AnalyticsComparisonBasis.CustomRange, dashboard.Summary.Basis);
        Assert.Equal(
            [new DateOnly(2026, 1, 1), new DateOnly(2026, 2, 1), new DateOnly(2026, 3, 1)],
            dashboard.Summary.BaselinePeriods);

        var row = dashboard.Rows.Items.Single(item => item.LocationId == world.LocationId);
        Assert.Equal(200m, row.Baseline.KnownAmount);
        Assert.Equal(300m, row.KnownAmountDelta);
        // The causes add up to exactly the difference the row reports beside them.
        Assert.Equal(row.KnownAmountDelta, row.Causes.Sum(cause => cause.Amount));
    }

    [PostgresFact]
    public async Task The_dashboard_refuses_a_range_it_was_not_given()
    {
        await using var db = database.CreateContext();
        var world = await HistoryWorldAsync(db);

        await Assert.ThrowsAsync<ValidationException>(() => new ManagementDashboardQueries(db).GetAsync(
            world.April, new DashboardQuery(AnalyticsComparisonBasis.CustomRange, PageSize: 100), None));
    }

    // ---- F. order frequency --------------------------------------------------------------------------

    /// <summary>
    /// Counted from the months the object has orders for. A month it ordered nothing at all is in neither
    /// number: nobody recorded whether this product was wanted then.
    /// </summary>
    [PostgresFact]
    public async Task Order_frequency_counts_the_months_that_exist()
    {
        await using var db = database.CreateContext();
        var world = await HistoryWorldAsync(db);

        var trend = (await new OrderAnalyticsQueries(db).GetTrendAsync(
            world.LocationId, world.VariantId, new TrendQuery(), None))!;

        // January, March and April have requests; February has none and produces no point at all.
        Assert.Equal(3, trend.Frequency.AvailableMonthCount);
        Assert.Equal(3, trend.Frequency.OrderedMonthCount);
        Assert.Equal(new DateOnly(2026, 1, 1), trend.Frequency.FirstOrderedPeriod);
        Assert.Equal(new DateOnly(2026, 4, 1), trend.Frequency.LastOrderedPeriod);
        Assert.Equal(0, trend.Frequency.MonthsSinceLastOrder);
        // The gaps are in calendar months, so January to March is two and March to April is one.
        Assert.Equal([2, 1], trend.Frequency.IntervalsInMonths);
        Assert.Equal(2, trend.Frequency.TypicalIntervalMonths);
        Assert.Equal(1, trend.Frequency.ShortestIntervalMonths);
        Assert.Equal(2, trend.Frequency.LongestIntervalMonths);
    }

    [PostgresFact]
    public async Task A_month_the_object_ordered_without_this_product_is_a_real_zero()
    {
        await using var db = database.CreateContext();
        var world = await HistoryWorldAsync(db);

        var trend = (await new OrderAnalyticsQueries(db).GetTrendAsync(
            world.LocationId, world.OtherVariantId, new TrendQuery(), None))!;

        var january = trend.Points.Single(point => point.Period == new DateOnly(2026, 1, 1));
        // The object ordered that month and did not order this: a real zero, not an unknown.
        Assert.Equal(0m, january.Quantity);
        Assert.Equal(0, january.ItemCount);

        // Three months exist; this product is in one of them.
        Assert.Equal(3, trend.Frequency.AvailableMonthCount);
        Assert.Equal(1, trend.Frequency.OrderedMonthCount);
        // Never ordered twice, so there is no interval and nothing typical is claimed.
        Assert.Empty(trend.Frequency.IntervalsInMonths);
        Assert.Null(trend.Frequency.TypicalIntervalMonths);
    }

    // ---- G. what it costs ----------------------------------------------------------------------------

    /// <summary>
    /// A window that depends on the data costs one query to find out which months exist, and that query is one
    /// row per month the company has ever ordered in — so it does not grow with the number of objects.
    /// </summary>
    [PostgresFact]
    public async Task Every_prior_month_costs_exactly_one_query_more_than_a_fixed_window()
    {
        await using var db = database.CreateContext();
        var world = await HistoryWorldAsync(db);

        var fixedWindow = await CountAsync(counted => new ManagementDashboardQueries(counted).GetAsync(
            world.April, new DashboardQuery(PageSize: 100), None));

        var everyMonth = await CountAsync(counted => new ManagementDashboardQueries(counted).GetAsync(
            world.April, new DashboardQuery(AnalyticsComparisonBasis.AllPriorMonths, PageSize: 100), None));

        // Task 13b's read of the approved spelling matches is one of them, in both.
        // One more than before Task 22: the month's classification split is read on its own, because the
        // snapshots beside it see monthly lines only and the split has to see the whole month.
        Assert.Equal(7, fixedWindow);
        Assert.Equal(8, everyMonth);
    }

    [PostgresFact]
    public async Task A_hand_picked_window_costs_no_extra_query_at_all()
    {
        await using var db = database.CreateContext();
        var world = await HistoryWorldAsync(db);

        var count = await CountAsync(counted => new ManagementDashboardQueries(counted).GetAsync(
            world.April,
            new DashboardQuery(
                AnalyticsComparisonBasis.CustomRange, PageSize: 100, CustomStart: "2026-01", CustomEnd: "2026-03"),
            None));

        // The months were named by the reader, so there is nothing to look up: the fixed window's seven.
        Assert.Equal(7, count);
    }

    /// <summary>
    /// The review queue is three queries whatever it holds: the counts over the whole queue, how many rows the
    /// filter and the search leave, then one page of them — including each row's workbook provenance, which is
    /// a join rather than a query per line.
    /// </summary>
    [PostgresFact]
    public async Task The_review_queue_is_three_queries_however_many_lines_it_holds()
    {
        await using var db = database.CreateContext();
        await WorldAsync(db);
        await WorldAsync(db);
        await WorldAsync(db);

        var count = await CountAsync(counted => new PricingModeReviewService(counted, TestCurrentUser.Anonymous())
            .GetAsync(new PricingModeReviewQuery(), None));

        Assert.Equal(3, count);
    }

    /// <summary>How often a product is ordered is counted from the points already fetched, so it is free.</summary>
    [PostgresFact]
    public async Task Order_frequency_costs_no_query_of_its_own()
    {
        await using var db = database.CreateContext();
        var world = await HistoryWorldAsync(db);

        var count = await CountAsync(counted => new OrderAnalyticsQueries(counted).GetTrendAsync(
            world.LocationId, world.VariantId, new TrendQuery(), None));

        // The location, the approved spelling matches (Task 13b), the variant, the months, the lines of those
        // months, and who supplied them (Task 10's one extra query). The frequency still adds none.
        Assert.Equal(6, count);
    }

    private static async Task<int> CountAsync(Func<BaxOrdersDbContext, Task> work)
    {
        var counter = new CountingCommandInterceptor();
        await using var counted = new BaxOrdersDbContext(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(PostgresDatabaseFixture.ConnectionString)
            .AddInterceptors(counter)
            .Options);

        await work(counted);
        return counter.Count;
    }

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

    // ---- fixture -------------------------------------------------------------------------------------

    private static async Task<OrderWorkflowDto> OrderAsync(BaxOrdersDbContext db, long orderRequestId) =>
        (await new OrderWorkflowService(db, TestCurrentUser.Anonymous(), new PostgresOrderRequestLock(db))
            .GetAsync(orderRequestId, None))!;

    private static Task<OrderRequestItem> ItemAsync(BaxOrdersDbContext db, long itemId) =>
        db.OrderRequestItems.AsNoTracking().SingleAsync(item => item.Id == itemId, None);

    private static Task<OrderRequest> LoadAsync(BaxOrdersDbContext db, long orderRequestId) =>
        db.OrderRequests.Include(order => order.Items).SingleAsync(order => order.Id == orderRequestId, None);

    /// <summary>Money, quantity and provenance exactly as they stand, so a decision can be proved not to move them.</summary>
    private static async Task<string> FingerprintAsync(BaxOrdersDbContext db, long orderRequestId)
    {
        var items = await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.OrderRequestId == orderRequestId)
            .OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.Quantity, item.UnitPrice, item.SupplierId, item.ProductVariantId })
            .ToListAsync(None);

        return string.Join('|', items.Select(item =>
            $"{item.Id}:{item.Quantity}:{item.UnitPrice}:{item.SupplierId}:{item.ProductVariantId}"));
    }

    private sealed record World(
        int LocationId,
        string LocationName,
        string ProductName,
        string SupplierName,
        DateOnly Period,
        long OrderId,
        long BoughtItemId,
        long FreeItemId,
        long PricedItemId,
        long UnresolvedItemId,
        long NoSupplierItemId);

    /// <summary>
    /// One order whose five lines are the five ways a price can be present or absent, four of them from the
    /// very same supplier.
    /// </summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var (location, first, second, third) = await CatalogueAsync(db, tag);

        var store = new Supplier($"Qarışıq anbar {tag}");
        db.Suppliers.Add(store);
        await db.SaveChangesAsync();

        var period = new DateOnly(2026, 9, 1);
        var order = new OrderRequest(location, period);
        var bought = order.AddItem(first, 5m, null, store);
        var free = order.AddItem(second, 9m, null, store);
        var priced = order.AddItem(third, 4m, 7.5m, store);
        var unresolved = order.AddItem(second, 11m, null, store);
        var orphan = order.AddItem(third, 3m, null);

        db.OrderRequests.Add(order);
        await db.SaveChangesAsync();

        // The two answers that can be given, set the only way they can be: by somebody saying so, line by
        // line. The priced line is not given one, because a price has already answered for it.
        var actor = WorkflowActor.User(Guid.NewGuid(), "Sınaq");
        free.SetPricingMode(PricingMode.InternalFreeSupply, actor, null, DateTime.UtcNow);
        unresolved.SetPricingMode(PricingMode.Unresolved, actor, null, DateTime.UtcNow);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        return new World(
            location.Id, location.Name, second.Product.Name, store.Name, period, order.Id,
            bought.Id, free.Id, priced.Id, unresolved.Id, orphan.Id);
    }

    private sealed record SimpleWorld(long OrderId);

    /// <summary>An order that owes nothing: every line is material the company supplies itself.</summary>
    private static async Task<SimpleWorld> FreeOnlyWorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var (location, first, second, _) = await CatalogueAsync(db, tag);

        var order = new OrderRequest(location, new DateOnly(2026, 9, 1));
        var one = order.AddItem(first, 5m, null);
        var two = order.AddItem(second, 6m, null);
        db.OrderRequests.Add(order);
        await db.SaveChangesAsync();

        var actor = WorkflowActor.User(Guid.NewGuid(), "Sınaq");
        one.SetPricingMode(PricingMode.InternalFreeSupply, actor, null, DateTime.UtcNow);
        two.SetPricingMode(PricingMode.InternalFreeSupply, actor, null, DateTime.UtcNow);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        return new SimpleWorld(order.Id);
    }

    private static async Task<SimpleWorld> UnresolvedOnlyWorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var (location, first, _, _) = await CatalogueAsync(db, tag);

        var order = new OrderRequest(location, new DateOnly(2026, 9, 1));
        var one = order.AddItem(first, 5m, null);
        db.OrderRequests.Add(order);
        await db.SaveChangesAsync();

        one.SetPricingMode(PricingMode.Unresolved, WorkflowActor.User(Guid.NewGuid(), "Sınaq"), null, DateTime.UtcNow);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        return new SimpleWorld(order.Id);
    }

    private sealed record HistoryWorld(
        int LocationId, string LocationName, DateOnly April, long VariantId, long OtherVariantId);

    /// <summary>
    /// One object with January, March and April but no February — the gap every averaging rule is tested on.
    /// </summary>
    private static async Task<HistoryWorld> HistoryWorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var (location, variant, other, _) = await CatalogueAsync(db, tag);

        var january = new OrderRequest(location, new DateOnly(2026, 1, 1));
        january.AddItem(variant, 10m, 10m);

        var march = new OrderRequest(location, new DateOnly(2026, 3, 1));
        march.AddItem(variant, 30m, 10m);

        var april = new OrderRequest(location, new DateOnly(2026, 4, 1));
        april.AddItem(variant, 40m, 10m);
        // Ordered in April and in no earlier month, so it is a product the comparison meets for the first time.
        april.AddItem(other, 1m, 100m);

        db.OrderRequests.AddRange(january, march, april);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        return new HistoryWorld(location.Id, location.Name, new DateOnly(2026, 4, 1), variant.Id, other.Id);
    }

    private static async Task<(Location Location, ProductVariant First, ProductVariant Second, ProductVariant Third)>
        CatalogueAsync(BaxOrdersDbContext db, string tag)
    {
        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Təsnifat obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS", None);
        var codes = new PostgresProductCodeGenerator(db);
        var first = new Product(await codes.NextAsync(None), $"Alınan mal {tag}");
        var second = new Product(await codes.NextAsync(None), $"Qarışıq mal {tag}");
        var third = new Product(await codes.NextAsync(None), $"Üçüncü mal {tag}");
        db.Products.AddRange(first, second, third);
        await db.SaveChangesAsync();

        var firstVariant = first.AddVariant(null, null, null, pieces);
        var secondVariant = second.AddVariant(null, null, null, pieces);
        var thirdVariant = third.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        return (location, firstVariant, secondVariant, thirdVariant);
    }

    /// <summary>The fixture database is shared by the whole run, so every world tags its own rows.</summary>
    private static string Unique() => Guid.NewGuid().ToString("N")[..8];
}
