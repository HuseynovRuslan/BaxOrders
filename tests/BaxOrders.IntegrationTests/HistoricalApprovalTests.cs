using System.Text.Json;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Approvals;
using BaxOrders.Application.Orders;
using BaxOrders.Application.Orders.Revisions;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Application.Reports;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using BaxOrders.Infrastructure.Persistence.Migrations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using Microsoft.Extensions.Logging.Abstractions;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// An order that was approved before this system existed.
/// </summary>
/// <remarks>
/// Task 11D carried the company's real history in as approved, and that history is a state the domain itself
/// cannot produce: <c>Approved</c> with no <c>SubmittedAtUtc</c> and no <c>ApprovedAtUtc</c>. Both are null on
/// purpose — these orders were approved at some real moment nobody recorded, and stamping them with the moment
/// the migration ran would be a date nobody could stand behind.
/// <para>
/// That makes the state easy to mistake for corrupt data, which is what these tests exist to prevent. Every
/// read model has to take it as an ordinary approved order, the approval queue has to leave it alone, and
/// nothing anywhere may fill the two missing moments with an invented one. The normal workflow is checked
/// beside it, unchanged: nothing here was loosened to let the historical rows through.
/// </para>
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class HistoricalApprovalTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    /// <summary>The comment the migration writes beside each carried-over request.</summary>
    private const string HistoricalComment = "Tarixi sifariş sistemə artıq təsdiqlənmiş kimi köçürülüb.";

    /// <summary>What ASP.NET Core serialises with, so these tests read the wire format the browser gets.</summary>
    private static readonly JsonSerializerOptions Wire = new(JsonSerializerDefaults.Web);

    // ---- 1. it loads -----------------------------------------------------------------------------------

    [PostgresFact]
    public async Task An_imported_historical_request_is_approved_with_neither_moment_recorded()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var request = await db.OrderRequests.AsNoTracking().SingleAsync(order => order.Id == world.OrderId, None);

        Assert.Equal(OrderRequestStatus.Approved, request.Status);
        Assert.Null(request.SubmittedAtUtc);
        Assert.Null(request.ApprovedAtUtc);
        Assert.NotNull(request.SourceImportBatchId);
    }

    /// <summary>Loading it with its lines and its history is what every screen does; none of it throws.</summary>
    [PostgresFact]
    public async Task It_loads_with_its_lines_and_its_history()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var request = await db.OrderRequests
            .Include(order => order.Items)
            .Include(order => order.WorkflowEvents)
            .SingleAsync(order => order.Id == world.OrderId, None);

        Assert.Single(request.Items);
        Assert.Single(request.WorkflowEvents);
    }

    // ---- 2. it serializes ------------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_order_detail_read_model_answers_about_it_without_failing()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var detail = await new OrderRequestQueries(db, TestCurrentUser.Anonymous())
            .GetAsync(world.OrderId, new OrderItemQuery(), None);

        Assert.NotNull(detail);
        Assert.Equal(OrderRequestStatus.Approved, detail.Status);
        // Serialising is what the API does next, and a null date must travel as null rather than as anything else.
        var json = JsonSerializer.Serialize(detail, Wire);
        Assert.Contains(world.ProductName, json, StringComparison.Ordinal);
    }

    [PostgresFact]
    public async Task The_workflow_read_model_serializes_it_with_both_moments_null()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var workflow = await WorkflowAsync(db, world.OrderId);

        Assert.Equal(OrderRequestStatus.Approved, workflow.Status);
        Assert.Null(workflow.SubmittedAtUtc);
        Assert.Null(workflow.ApprovedAtUtc);
        Assert.Null(workflow.SubmittedByUserId);

        var json = JsonSerializer.Serialize(workflow, Wire);
        Assert.Contains("\"submittedAtUtc\":null", json, StringComparison.Ordinal);
        Assert.Contains("\"approvedAtUtc\":null", json, StringComparison.Ordinal);
    }

    // ---- 3. the history it carries ---------------------------------------------------------------------

    /// <summary>
    /// The event says what actually happened and names nobody. It is deliberately not <c>Approved</c>: that
    /// would put a decision in the history that was never taken in this system.
    /// </summary>
    [PostgresFact]
    public async Task Its_history_is_one_imported_event_with_no_person_behind_it()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var workflow = await WorkflowAsync(db, world.OrderId);
        var entry = Assert.Single(workflow.History);

        Assert.Equal(OrderWorkflowAction.ImportedAsApproved, entry.Action);
        Assert.Null(entry.ActorUserId);
        Assert.Equal("Sistem", entry.ActorDisplayName);
        Assert.Equal(OrderRequestStatus.Draft, entry.FromStatus);
        Assert.Equal(OrderRequestStatus.Approved, entry.ToStatus);
        Assert.Equal(HistoricalComment, entry.Comment);
        // Nobody acknowledged anything, because nobody was asked: this was not an approval given here.
        Assert.False(entry.MissingPricesAcknowledged);
    }

    /// <summary>
    /// 4.1: the decision panel says "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." and
    /// nothing else. The facts behind it say only that — no submitter, no approver, no moment, and in
    /// particular not the "Sistem" the carried-over event is written under.
    /// </summary>
    [PostgresFact]
    public async Task Its_decision_facts_say_it_was_carried_in_and_name_nobody()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var facts = (await WorkflowAsync(db, world.OrderId)).DecisionFacts;

        Assert.True(facts.IsHistoricalImport);
        Assert.Equal(0, facts.SubmissionNumber);
        Assert.Null(facts.SubmittedByDisplayName);
        Assert.Null(facts.SubmittedAtUtc);
        Assert.Null(facts.PreviousReturn);
        Assert.Null(facts.Decision);

        var json = JsonSerializer.Serialize(facts, Wire);
        Assert.DoesNotContain("Sistem", json, StringComparison.Ordinal);
    }

    // ---- 4. the approval queue leaves it alone ---------------------------------------------------------

    [PostgresFact]
    public async Task The_approval_inbox_does_not_include_it()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);
        var manager = await TestCurrentUser.ManagerAsync(db, "Sınaq rəhbəri");

        var inbox = await new ApprovalInboxQueries(db, manager)
            .GetAsync(new ApprovalInboxQuery(Search: world.LocationName), None);

        Assert.DoesNotContain(inbox.Rows.Items, row => row.OrderRequestId == world.OrderId);
        Assert.Empty(inbox.Rows.Items);
    }

    /// <summary>Approved is the end of the road, so it offers no action — the same as any approved request.</summary>
    [PostgresFact]
    public async Task It_offers_no_further_workflow_action()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var workflow = await WorkflowAsync(db, world.OrderId);

        Assert.False(workflow.AllowedActions.CanSubmit);
        Assert.False(workflow.AllowedActions.CanApprove);
        Assert.False(workflow.AllowedActions.CanReturn);
    }

    // ---- 5. every other screen reads it as approved ----------------------------------------------------

    [PostgresFact]
    public async Task The_dashboard_reports_it_as_an_approved_month()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var dashboard = await new ManagementDashboardQueries(db).GetAsync(
            world.Period, new DashboardQuery(Search: world.LocationName, PageSize: 100), None);

        var row = Assert.Single(dashboard!.Rows.Items);
        Assert.True(row.HasCurrentRequest);
        Assert.Equal(OrderRequestStatus.Approved, row.CurrentStatus);
        Assert.Equal(100m, row.Current.KnownAmount);
    }

    [PostgresFact]
    public async Task The_monthly_report_reports_it_as_an_approved_month()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var report = await new MonthlyReportQueries(db).GetAsync(
            new MonthlyReportQuery(world.Period.Year, Search: world.LocationName), None);

        var row = Assert.Single(report.Rows);
        var cell = row.Months[world.Period.Month - 1];
        Assert.Equal(world.OrderId, cell.OrderRequestId);
        Assert.Equal(OrderRequestStatus.Approved, cell.Status);
        Assert.Equal(100m, cell.KnownAmount);
    }

    [PostgresFact]
    public async Task The_objects_list_reports_it_as_an_approved_month()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var list = await new LocationOrderQueries(db)
            .ListAsync(new LocationOrderListQuery(Search: world.LocationName), None);

        var row = Assert.Single(list.Locations.Items);
        Assert.Equal(OrderRequestStatus.Approved, row.LatestRequestStatus);
    }

    // ---- 6. nothing invents a date ---------------------------------------------------------------------

    /// <summary>
    /// The one thing that would turn an honest gap into a lie. Every read model that could carry a moment for
    /// this request is checked at once, because it only takes one of them to put a date on the screen.
    /// </summary>
    [PostgresFact]
    public async Task No_read_model_fills_in_a_submission_or_approval_moment()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var workflow = await WorkflowAsync(db, world.OrderId);
        Assert.Null(workflow.SubmittedAtUtc);
        Assert.Null(workflow.ApprovedAtUtc);
        Assert.Null(workflow.ReturnedAtUtc);

        var history = await new LocationOrderQueries(db)
            .GetHistoryAsync(world.LocationId, new LocationHistoryQuery(), None);
        var entry = Assert.Single(history!.Requests.Items);
        Assert.Equal(world.OrderId, entry.OrderRequestId);
        Assert.Equal(OrderRequestStatus.Approved, entry.Status);

        var stored = await db.OrderRequests.AsNoTracking().SingleAsync(order => order.Id == world.OrderId, None);
        Assert.Null(stored.SubmittedAtUtc);
        Assert.Null(stored.ApprovedAtUtc);
        Assert.Null(stored.SubmittedByUserId);
    }

    // ---- 7 and 8. the normal workflow is untouched -----------------------------------------------------

    [PostgresFact]
    public async Task A_request_approved_through_the_workflow_still_records_both_moments()
    {
        await using var db = database.CreateContext();
        var world = await WorkflowWorldAsync(db);

        var request = await db.OrderRequests.Include(order => order.Items)
            .SingleAsync(order => order.Id == world.OrderId, None);

        var submittedAt = new DateTime(2026, 9, 10, 8, 0, 0, DateTimeKind.Utc);
        var approvedAt = new DateTime(2026, 9, 11, 9, 30, 0, DateTimeKind.Utc);
        request.SubmitForApproval(WorkflowActor.System("Sınaq"), null, submittedAt);
        request.Approve(WorkflowActor.System("Sınaq"), null, missingPricesAcknowledged: false, approvedAt);
        await db.SaveChangesAsync(None);

        Assert.Equal(OrderRequestStatus.Approved, request.Status);
        Assert.Equal(submittedAt, request.SubmittedAtUtc);
        Assert.Equal(approvedAt, request.ApprovedAtUtc);

        // And its history is a real decision, not a carried-over record.
        var actions = request.WorkflowEvents.Select(item => item.Action).ToList();
        Assert.Equal([OrderWorkflowAction.SubmittedForApproval, OrderWorkflowAction.Approved], actions);
        Assert.DoesNotContain(OrderWorkflowAction.ImportedAsApproved, actions);
    }

    /// <summary>
    /// Nothing was relaxed to let the historical rows in. A new request still cannot be approved without being
    /// submitted, and the domain still refuses to approve one twice.
    /// </summary>
    [PostgresFact]
    public async Task A_new_request_still_cannot_skip_the_workflow()
    {
        await using var db = database.CreateContext();
        var world = await WorkflowWorldAsync(db);

        var request = await db.OrderRequests.Include(order => order.Items)
            .SingleAsync(order => order.Id == world.OrderId, None);

        Assert.Equal(OrderRequestStatus.Draft, request.Status);
        Assert.Throws<DomainException>(() =>
            request.Approve(WorkflowActor.System("Sınaq"), null, missingPricesAcknowledged: false, DateTime.UtcNow));

        request.SubmitForApproval(WorkflowActor.System("Sınaq"), null, DateTime.UtcNow);
        request.Approve(WorkflowActor.System("Sınaq"), null, missingPricesAcknowledged: false, DateTime.UtcNow);

        Assert.Throws<DomainException>(() =>
            request.Approve(WorkflowActor.System("Sınaq"), null, missingPricesAcknowledged: false, DateTime.UtcNow));
    }

    /// <summary>The historical state is not a state the domain will produce, and it is not meant to be.</summary>
    [PostgresFact]
    public async Task Approving_through_the_domain_always_records_a_moment()
    {
        await using var db = database.CreateContext();
        var world = await WorkflowWorldAsync(db);

        var request = await db.OrderRequests.Include(order => order.Items)
            .SingleAsync(order => order.Id == world.OrderId, None);

        request.SubmitForApproval(WorkflowActor.System("Sınaq"), null, DateTime.UtcNow);
        request.Approve(WorkflowActor.System("Sınaq"), null, missingPricesAcknowledged: false, DateTime.UtcNow);

        Assert.NotNull(request.SubmittedAtUtc);
        Assert.NotNull(request.ApprovedAtUtc);
    }

    // ---- 9. the lists say it the way the order page does (22.4) ----------------------------------------

    [PostgresFact]
    public async Task The_objects_list_says_its_latest_order_is_a_historical_import()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var row = await ListRowAsync(db, world);

        Assert.Equal(world.OrderId, row.LatestRequestId);
        Assert.Equal(OrderRequestStatus.Approved, row.LatestRequestStatus);
        Assert.True(row.LatestRequestIsHistoricalImport);
    }

    [PostgresFact]
    public async Task The_object_page_says_its_period_row_is_a_historical_import()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var entry = await HistoryEntryAsync(db, world, world.OrderId);

        Assert.Equal(OrderRequestStatus.Approved, entry.Status);
        Assert.True(entry.IsHistoricalImport);
    }

    [PostgresFact]
    public async Task The_monthly_report_says_its_cell_is_a_historical_import()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var cell = await ReportCellAsync(db, world);

        Assert.Equal(world.OrderId, cell.OrderRequestId);
        Assert.Equal(OrderRequestStatus.Approved, cell.Status);
        Assert.True(cell.IsHistoricalImport);
    }

    /// <summary>Approved the same way, but through this application: no list may call it historical.</summary>
    [PostgresFact]
    public async Task An_order_approved_through_the_workflow_is_not_a_historical_import_on_any_list()
    {
        await using var db = database.CreateContext();
        var world = await WorkflowWorldAsync(db);

        var request = await db.OrderRequests.Include(order => order.Items)
            .SingleAsync(order => order.Id == world.OrderId, None);
        request.SubmitForApproval(WorkflowActor.System("Sınaq"), null, DateTime.UtcNow);
        request.Approve(WorkflowActor.System("Sınaq"), null, missingPricesAcknowledged: false, DateTime.UtcNow);
        await db.SaveChangesAsync(None);
        db.ChangeTracker.Clear();

        var row = await ListRowAsync(db, world);
        Assert.Equal(OrderRequestStatus.Approved, row.LatestRequestStatus);
        Assert.False(row.LatestRequestIsHistoricalImport);

        var entry = await HistoryEntryAsync(db, world, world.OrderId);
        Assert.Equal(OrderRequestStatus.Approved, entry.Status);
        Assert.False(entry.IsHistoricalImport);

        var cell = await ReportCellAsync(db, world);
        Assert.Equal(OrderRequestStatus.Approved, cell.Status);
        Assert.False(cell.IsHistoricalImport);
    }

    [PostgresFact]
    public async Task A_draft_is_not_a_historical_import_on_any_list()
    {
        await using var db = database.CreateContext();
        var world = await WorkflowWorldAsync(db);

        var row = await ListRowAsync(db, world);
        Assert.Equal(OrderRequestStatus.Draft, row.LatestRequestStatus);
        Assert.False(row.LatestRequestIsHistoricalImport);

        Assert.False((await HistoryEntryAsync(db, world, world.OrderId)).IsHistoricalImport);
        Assert.False((await ReportCellAsync(db, world)).IsHistoricalImport);
    }

    [PostgresFact]
    public async Task The_three_lists_carry_the_flag_on_the_wire()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);

        var list = await new LocationOrderQueries(db)
            .ListAsync(new LocationOrderListQuery(Search: world.LocationName), None);
        var history = await new LocationOrderQueries(db)
            .GetHistoryAsync(world.LocationId, new LocationHistoryQuery(), None);
        var report = await new MonthlyReportQueries(db).GetAsync(
            new MonthlyReportQuery(world.Period.Year, Search: world.LocationName), None);

        Assert.Contains("\"latestRequestIsHistoricalImport\":true", JsonSerializer.Serialize(list, Wire), StringComparison.Ordinal);
        Assert.Contains("\"isHistoricalImport\":true", JsonSerializer.Serialize(history, Wire), StringComparison.Ordinal);
        Assert.Contains("\"isHistoricalImport\":true", JsonSerializer.Serialize(report, Wire), StringComparison.Ordinal);
    }

    /// <summary>
    /// 22.4: the lists and the order page can never disagree. Every kind of order is asked in every place it is
    /// shown, and each list's flag must equal the order page's <c>DecisionFacts.IsHistoricalImport</c>.
    /// </summary>
    /// <remarks>
    /// The correction carries the carried-over event too, and is set to Approved, both written by SQL the way the
    /// fixture writes a historical order. It is still not historical: a version below it was sent for approval,
    /// and only the rule's reading of the whole chain says so.
    /// </remarks>
    [PostgresFact]
    public async Task Every_list_agrees_with_the_order_page_about_every_kind_of_order()
    {
        var kinds = await KindsAsync();
        await using var db = database.CreateContext();

        // What each one is, by the order page.
        (World World, long OrderId, bool Expected, bool Latest)[] cases =
        [
            (kinds.Historical, kinds.Historical.OrderId, true, true),
            (kinds.Approved, kinds.Approved.OrderId, false, true),
            (kinds.Draft, kinds.Draft.OrderId, false, true),
            (kinds.Pending, kinds.Pending.OrderId, false, true),
            (kinds.Corrected, kinds.Corrected.OrderId, false, false),
            (kinds.Corrected, kinds.Correction, false, true),
        ];

        foreach (var (world, orderId, expected, latest) in cases)
        {
            var facts = (await WorkflowAsync(db, orderId)).DecisionFacts.IsHistoricalImport;
            Assert.Equal(expected, facts);

            Assert.Equal(facts, (await HistoryEntryAsync(db, world, orderId)).IsHistoricalImport);

            // The returned version is overtaken by its correction, so only the object page lists it.
            if (!latest)
            {
                continue;
            }

            var row = await ListRowAsync(db, world);
            Assert.Equal(orderId, row.LatestRequestId);
            Assert.Equal(facts, row.LatestRequestIsHistoricalImport);

            var cell = await ReportCellAsync(db, world);
            Assert.Equal(orderId, cell.OrderRequestId);
            Assert.Equal(facts, cell.IsHistoricalImport);
        }

        // The correction really is Approved with the carried-over event, so only the chain keeps it from being historical.
        var correction = await db.OrderRequests.AsNoTracking().SingleAsync(order => order.Id == kinds.Correction, None);
        Assert.Equal(OrderRequestStatus.Approved, correction.Status);
        Assert.Contains(OrderWorkflowAction.ImportedAsApproved,
            (await WorkflowAsync(db, kinds.Correction)).History.Select(entry => entry.Action));
    }

    /// <summary>Asking is reading: the historical order keeps its status, version, history and its three empty moments.</summary>
    [PostgresFact]
    public async Task Reading_the_three_lists_changes_nothing_about_the_historical_order()
    {
        await using var db = database.CreateContext();
        var world = await HistoricalWorldAsync(db);
        var before = await StoredAsync(db, world.OrderId);

        await ListRowAsync(db, world);
        await HistoryEntryAsync(db, world, world.OrderId);
        await ReportCellAsync(db, world);

        var after = await StoredAsync(db, world.OrderId);
        Assert.Equal(before, after);
        Assert.Equal((OrderRequestStatus.Approved, 1, 1, (DateTime?)null, (DateTime?)null, (Guid?)null), after);
    }

    /// <summary>A page of orders costs two queries, whatever its size and however long its chains — never one per row.</summary>
    [PostgresFact]
    public async Task Asking_about_a_page_costs_nothing_for_none_and_two_queries_for_any_number()
    {
        var kinds = await KindsAsync();

        var (none, noneQueries) = await CountedAmongAsync([]);
        Assert.Empty(none);
        Assert.Equal(0, noneQueries);

        var (one, oneQueries) = await CountedAmongAsync([kinds.Historical.OrderId]);
        Assert.Equal(new[] { kinds.Historical.OrderId }, one.Order());
        Assert.Equal(2, oneQueries);

        var (many, manyQueries) = await CountedAmongAsync(
        [
            kinds.Historical.OrderId, kinds.Approved.OrderId, kinds.Draft.OrderId, kinds.Pending.OrderId,
            kinds.Corrected.OrderId, kinds.Correction,
        ]);
        Assert.Equal(new[] { kinds.Historical.OrderId }, many.Order());
        Assert.Equal(2, manyQueries);

        var (chained, chainedQueries) = await CountedAmongAsync([kinds.Correction]);
        Assert.Empty(chained);
        Assert.Equal(2, chainedQueries);
    }

    // ---- the backfill itself ---------------------------------------------------------------------------

    /// <summary>
    /// The migration's own statements, run against an imported draft this test seeds.
    /// </summary>
    /// <remarks>
    /// The SQL is taken from the migration class rather than copied, so a change to the migration changes what
    /// is under test here. Only its <see cref="SqlOperation"/>s are run: the column it adds is already on the
    /// test database, and re-adding it is not what this is about.
    /// <para>
    /// It runs inside a transaction that is never committed. The statements are company-wide by nature, and
    /// the test database is shared by the whole run, so rolling back is what keeps this test from rewriting
    /// somebody else's fixture.
    /// </para>
    /// </remarks>
    [PostgresFact]
    public async Task The_migration_approves_an_imported_draft_without_inventing_an_approver_or_a_date()
    {
        await using var db = database.CreateContext();
        var world = await ImportedDraftWorldAsync(db);

        await using var transaction = await db.Database.BeginTransactionAsync(None);

        var migration = new AddLinePricingModeAndHistoricalApproval();
        foreach (var operation in migration.UpOperations.OfType<SqlOperation>())
        {
            await db.Database.ExecuteSqlRawAsync(operation.Sql, None);
        }

        db.ChangeTracker.Clear();

        var request = await db.OrderRequests.AsNoTracking()
            .SingleAsync(order => order.Id == world.OrderId, None);

        Assert.Equal(OrderRequestStatus.Approved, request.Status);
        // The two moments the system does not know stay unknown.
        Assert.Null(request.SubmittedAtUtc);
        Assert.Null(request.ApprovedAtUtc);
        Assert.Null(request.SubmittedByUserId);

        var events = await db.Set<OrderRequestWorkflowEvent>().AsNoTracking()
            .Where(item => item.OrderRequestId == world.OrderId)
            .ToListAsync(None);

        var carried = Assert.Single(events);
        Assert.Equal(OrderWorkflowAction.ImportedAsApproved, carried.Action);
        Assert.Null(carried.ActorUserId);
        Assert.Equal("Sistem", carried.ActorDisplayName);
        Assert.Equal(OrderRequestStatus.Draft, carried.FromStatus);
        Assert.Equal(OrderRequestStatus.Approved, carried.ToStatus);
        Assert.Equal(HistoricalComment, carried.Comment);
        Assert.False(carried.MissingPricesAcknowledged);

        await transaction.RollbackAsync(None);
    }

    /// <summary>A request this application created is not history, and the backfill leaves it where it is.</summary>
    [PostgresFact]
    public async Task The_migration_leaves_a_request_that_came_from_no_import_alone()
    {
        await using var db = database.CreateContext();
        var world = await WorkflowWorldAsync(db);

        await using var transaction = await db.Database.BeginTransactionAsync(None);

        var migration = new AddLinePricingModeAndHistoricalApproval();
        foreach (var operation in migration.UpOperations.OfType<SqlOperation>())
        {
            await db.Database.ExecuteSqlRawAsync(operation.Sql, None);
        }

        db.ChangeTracker.Clear();

        var request = await db.OrderRequests.AsNoTracking()
            .SingleAsync(order => order.Id == world.OrderId, None);

        Assert.Equal(OrderRequestStatus.Draft, request.Status);
        Assert.Empty(await db.Set<OrderRequestWorkflowEvent>().AsNoTracking()
            .Where(item => item.OrderRequestId == world.OrderId).ToListAsync(None));

        await transaction.RollbackAsync(None);
    }

    // ---- fixture ---------------------------------------------------------------------------------------

    private static Task<OrderWorkflowDto> WorkflowAsync(BaxOrdersDbContext db, long orderRequestId) =>
        new OrderWorkflowService(db, TestCurrentUser.Anonymous(), new PostgresOrderRequestLock(db))
            .GetAsync(orderRequestId, None)!;

    private sealed record World(
        long OrderId, int LocationId, string LocationName, DateOnly Period, string ProductName);

    /// <summary>
    /// A request in the state the migration left the company's real history in.
    /// </summary>
    /// <remarks>
    /// Written with SQL because the domain cannot produce it, which is exactly the point: approving through
    /// the domain always records a moment, and these orders have none. The statements mirror the migration's,
    /// but are scoped to this one request so the shared test database is left alone.
    /// </remarks>
    private static async Task<World> HistoricalWorldAsync(BaxOrdersDbContext db)
    {
        var world = await ImportedDraftWorldAsync(db);
        await CarryOverAsync(db, world.OrderId);
        return world;
    }

    /// <summary>The migration's two statements, scoped to one request: the carried-over event, and Approved.</summary>
    private static async Task CarryOverAsync(BaxOrdersDbContext db, long orderId)
    {
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO "OrderRequestWorkflowEvents"
                ("OrderRequestId", "Action", "FromStatus", "ToStatus", "ActorUserId", "ActorDisplayName",
                 "Comment", "MissingPriceItemCount", "MissingPricesAcknowledged", "OccurredAtUtc")
            VALUES ({orderId}, 'ImportedAsApproved', 'Draft', 'Approved', NULL, 'Sistem',
                    {HistoricalComment}, 0, FALSE, NOW() AT TIME ZONE 'UTC');
            """,
            None);

        await db.Database.ExecuteSqlInterpolatedAsync(
            $"""UPDATE "OrderRequests" SET "Status" = 'Approved' WHERE "Id" = {orderId};""", None);

        db.ChangeTracker.Clear();
    }

    private static async Task<LocationOrderSummaryDto> ListRowAsync(BaxOrdersDbContext db, World world)
    {
        var list = await new LocationOrderQueries(db)
            .ListAsync(new LocationOrderListQuery(Search: world.LocationName), None);
        return Assert.Single(list.Locations.Items);
    }

    private static async Task<LocationOrderHistoryEntryDto> HistoryEntryAsync(BaxOrdersDbContext db, World world, long orderId)
    {
        var history = await new LocationOrderQueries(db)
            .GetHistoryAsync(world.LocationId, new LocationHistoryQuery(), None);
        return history!.Requests.Items.Single(entry => entry.OrderRequestId == orderId);
    }

    private static async Task<MonthlyReportCellDto> ReportCellAsync(BaxOrdersDbContext db, World world)
    {
        var report = await new MonthlyReportQueries(db).GetAsync(
            new MonthlyReportQuery(world.Period.Year, Search: world.LocationName), None);
        return Assert.Single(report.Rows).Months[world.Period.Month - 1];
    }

    private static async Task<(OrderRequestStatus Status, int Version, int EventCount, DateTime? SubmittedAtUtc, DateTime? ApprovedAtUtc, Guid? SubmittedByUserId)>
        StoredAsync(BaxOrdersDbContext db, long orderId)
    {
        var stored = await db.OrderRequests.AsNoTracking().SingleAsync(order => order.Id == orderId, None);
        var events = await db.OrderRequestWorkflowEvents.AsNoTracking().CountAsync(item => item.OrderRequestId == orderId, None);
        return (stored.Status, stored.Version, events, stored.SubmittedAtUtc, stored.ApprovedAtUtc, stored.SubmittedByUserId);
    }

    /// <param name="Corrected">A returned version 1.</param>
    /// <param name="Correction">Its correction, version 2, which also carries the carried-over event and is Approved.</param>
    private sealed record Kinds(World Historical, World Approved, World Draft, World Pending, World Corrected, long Correction);

    /// <summary>
    /// One order of every kind the flag has to tell apart, each at its own location except the two versions of
    /// the corrected month. The workflow ones go through the real services, as a coordinator and a Rəhbər.
    /// </summary>
    private async Task<Kinds> KindsAsync()
    {
        TestCurrentUser coordinator;
        TestCurrentUser rehber;
        World historical, approved, draft, pending, corrected;
        await using (var db = database.CreateContext())
        {
            coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");
            rehber = await TestCurrentUser.ManagerAsync(db, "Sınaq rəhbəri");
            historical = await HistoricalWorldAsync(db);
            approved = await WorkflowWorldAsync(db);
            draft = await WorkflowWorldAsync(db);
            pending = await WorkflowWorldAsync(db);
            corrected = await WorkflowWorldAsync(db);
        }

        await WorkflowAs(coordinator, service => service.SubmitAsync(approved.OrderId, new SubmitForApprovalCommand(), None));
        await WorkflowAs(rehber, service => service.ApproveAsync(approved.OrderId, new ApproveOrderCommand(), None));

        await WorkflowAs(coordinator, service => service.SubmitAsync(pending.OrderId, new SubmitForApprovalCommand(), None));

        await WorkflowAs(coordinator, service => service.SubmitAsync(corrected.OrderId, new SubmitForApprovalCommand(), None));
        await WorkflowAs(rehber, service =>
            service.ReturnAsync(corrected.OrderId, new ReturnForCorrectionCommand("Miqdar çoxdur"), None));

        long correction;
        await using (var db = database.CreateContext())
        {
            var revisions = new OrderRevisionService(
                db, coordinator, new PostgresOrderRequestLock(db), NullLogger<OrderRevisionService>.Instance);
            correction = (await revisions.CreateAsync(corrected.OrderId, None)).OrderRequestId;
            await CarryOverAsync(db, correction);
        }

        return new Kinds(historical, approved, draft, pending, corrected, correction);
    }

    private async Task<T> WorkflowAs<T>(TestCurrentUser user, Func<OrderWorkflowService, Task<T>> work)
    {
        await using var db = database.CreateContext();
        return await work(new OrderWorkflowService(db, user, new PostgresOrderRequestLock(db)));
    }

    private static async Task<(IReadOnlySet<long> Historical, int Queries)> CountedAmongAsync(long[] orderRequestIds)
    {
        var counter = new CountingCommandInterceptor();
        await using var counted = new BaxOrdersDbContext(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(PostgresDatabaseFixture.ConnectionString)
            .AddInterceptors(counter)
            .Options);

        var historical = await HistoricalImportRule.AmongAsync(counted, orderRequestIds, None);
        return (historical, counter.Count);
    }

    /// <summary>Counts the SQL statements a unit of work sends.</summary>
    private sealed class CountingCommandInterceptor : DbCommandInterceptor
    {
        public int Count { get; private set; }

        public override ValueTask<InterceptionResult<System.Data.Common.DbDataReader>> ReaderExecutingAsync(
            System.Data.Common.DbCommand command, CommandEventData eventData,
            InterceptionResult<System.Data.Common.DbDataReader> result, CancellationToken cancellationToken = default)
        {
            Count++;
            return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
        }
    }

    /// <summary>An imported draft, exactly as it stood the moment before the migration ran.</summary>
    private static Task<World> ImportedDraftWorldAsync(BaxOrdersDbContext db) => SeedAsync(db, imported: true);

    /// <summary>A draft this application created, which is not history and must not be treated as any.</summary>
    private static Task<World> WorkflowWorldAsync(BaxOrdersDbContext db) => SeedAsync(db, imported: false);

    private static async Task<World> SeedAsync(BaxOrdersDbContext db, bool imported)
    {
        var tag = Guid.NewGuid().ToString("N")[..8];

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Tarixi obyekt {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync(None);

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS", None);
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"Tarixi mal {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync(None);

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync(None);

        ImportBatch? batch = null;
        if (imported)
        {
            batch = new ImportBatch($"tarix-{tag}.xlsx", null, DateTime.UtcNow);
            db.ImportBatches.Add(batch);
            await db.SaveChangesAsync(None);
        }

        var period = new DateOnly(2026, 3, 1);
        var request = new OrderRequest(location, period, null, null, batch);
        request.AddItem(variant, 10m, 10m);
        db.OrderRequests.Add(request);
        await db.SaveChangesAsync(None);
        db.ChangeTracker.Clear();

        return new World(request.Id, location.Id, location.Name, period, product.Name);
    }
}
