using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Common;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The approval workflow against a real SQL Server: what it writes, what it refuses, and what it leaves
/// alone. Every request here is synthetic — no company request is ever moved out of draft by a test.
/// </summary>
/// <remarks>
/// The actor comes from the signed-in person, so these tests supply one. A coordinator submits and a manager
/// decides, because the same person may not do both to the same request.
/// </remarks>
[Collection(SqlServerCollection.Name)]
public sealed class OrderWorkflowTests(SqlServerDatabaseFixture database)
{
    // ---- the happy path ------------------------------------------------------------------------------

    [SqlServerFact]
    public async Task Submitting_moves_the_request_and_records_who_did_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var state = await Service(db, world.Submitter).SubmitAsync(
            world.RequestId, new SubmitForApprovalCommand("İyul sifarişi yoxlanıldı"), CancellationToken.None);

        Assert.Equal(OrderRequestStatus.PendingApproval, state.Status);
        Assert.NotNull(state.SubmittedAtUtc);
        Assert.Equal(world.Submitter.UserId, state.SubmittedByUserId);

        await using var check = database.CreateContext();
        var stored = await check.OrderRequests.SingleAsync(request => request.Id == world.RequestId);
        var workflowEvent = Assert.Single(await check.OrderRequestWorkflowEvents
            .Where(item => item.OrderRequestId == world.RequestId).ToListAsync());

        Assert.Equal(OrderRequestStatus.PendingApproval, stored.Status);
        Assert.Equal(world.Submitter.UserId, stored.SubmittedByUserId);
        Assert.Equal(OrderWorkflowAction.SubmittedForApproval, workflowEvent.Action);
        Assert.Equal((OrderRequestStatus.Draft, OrderRequestStatus.PendingApproval),
            (workflowEvent.FromStatus, workflowEvent.ToStatus));

        // The actor came from the session, not from the command.
        Assert.Equal(world.Submitter.UserId, workflowEvent.ActorUserId);
        Assert.Equal("Sınaq koordinatoru", workflowEvent.ActorDisplayName);
        Assert.Equal("İyul sifarişi yoxlanıldı", workflowEvent.Comment);
        Assert.Equal(DateTimeKind.Utc, workflowEvent.OccurredAtUtc.Kind);
    }

    [SqlServerFact]
    public async Task Approving_moves_the_request_and_records_who_decided()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);
        var state = await Service(db, world.Approver).ApproveAsync(
            world.RequestId, new ApproveOrderCommand("Razıyam"), CancellationToken.None);

        Assert.Equal(OrderRequestStatus.Approved, state.Status);
        Assert.NotNull(state.ApprovedAtUtc);
        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false), state.AllowedActions);

        await using var check = database.CreateContext();
        var approval = await check.OrderRequestWorkflowEvents.SingleAsync(item =>
            item.OrderRequestId == world.RequestId && item.Action == OrderWorkflowAction.Approved);

        Assert.Equal(world.Approver.UserId, approval.ActorUserId);
        Assert.Equal("Sınaq rəhbəri", approval.ActorDisplayName);
    }

    [SqlServerFact]
    public async Task Returning_a_request_keeps_the_reason_it_was_returned_for()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);
        var state = await Service(db, world.Approver).ReturnAsync(
            world.RequestId, new ReturnForCorrectionCommand("Zibil paketi sayı çoxdur"), CancellationToken.None);

        Assert.Equal(OrderRequestStatus.ReturnedForCorrection, state.Status);
        Assert.NotNull(state.ReturnedAtUtc);

        await using var check = database.CreateContext();
        var returned = await check.OrderRequestWorkflowEvents.SingleAsync(item =>
            item.OrderRequestId == world.RequestId && item.Action == OrderWorkflowAction.ReturnedForCorrection);

        Assert.Equal("Zibil paketi sayı çoxdur", returned.Comment);
        Assert.Equal(world.Approver.UserId, returned.ActorUserId);
    }

    [SqlServerFact]
    public async Task A_returned_request_goes_round_again_and_the_whole_story_is_kept_in_order()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);
        await Service(db, world.Approver).ReturnAsync(world.RequestId, new ReturnForCorrectionCommand("Yenidən bax"), CancellationToken.None);
        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand("Düzəldildi"), CancellationToken.None);
        var state = await Service(db, world.Approver).ApproveAsync(world.RequestId, new ApproveOrderCommand(), CancellationToken.None);

        Assert.Equal(OrderRequestStatus.Approved, state.Status);
        Assert.Equal(
            [OrderWorkflowAction.SubmittedForApproval, OrderWorkflowAction.ReturnedForCorrection,
             OrderWorkflowAction.SubmittedForApproval, OrderWorkflowAction.Approved],
            state.History.Select(item => item.Action));

        // Oldest first, and the second submission comes from the returned state, not from draft.
        Assert.Equal(OrderRequestStatus.ReturnedForCorrection, state.History[2].FromStatus);
        Assert.True(state.History.Zip(state.History.Skip(1)).All(pair => pair.First.Id < pair.Second.Id));

        // Two people, each attributed to their own actions.
        Assert.Equal(
            [world.Submitter.UserId, world.Approver.UserId, world.Submitter.UserId, world.Approver.UserId],
            state.History.Select(item => item.ActorUserId));

        // The resubmission makes the coordinator the current submitter again.
        Assert.Equal(world.Submitter.UserId, state.SubmittedByUserId);
        Assert.Equal(1, state.Version);
    }

    [SqlServerFact]
    public async Task The_history_is_added_to_and_never_rewritten()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var submitted = await Service(db, world.Submitter).SubmitAsync(
            world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);
        var first = Assert.Single(submitted.History);

        await Service(db, world.Approver).ApproveAsync(world.RequestId, new ApproveOrderCommand(), CancellationToken.None);

        await using var check = database.CreateContext();
        var stored = await check.OrderRequestWorkflowEvents
            .Where(item => item.OrderRequestId == world.RequestId)
            .OrderBy(item => item.Id).ToListAsync();

        // The submission event still says what it said: approving added a second event rather than editing it.
        Assert.Equal(2, stored.Count);
        Assert.Equal(first.Id, stored[0].Id);
        Assert.Equal(OrderRequestStatus.PendingApproval, stored[0].ToStatus);
        Assert.Equal(first.OccurredAtUtc, stored[0].OccurredAtUtc);
        Assert.Equal(first.ActorDisplayName, stored[0].ActorDisplayName);
    }

    // ---- who may do what -----------------------------------------------------------------------------

    [SqlServerFact]
    public async Task The_person_who_submitted_a_request_cannot_decide_on_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        // An administrator, who may do both — and still not both to the same request.
        var admin = await TestCurrentUser.AdminAsync(db, "Admin");
        var service = Service(db, admin);

        await service.SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);

        await Assert.ThrowsAsync<SelfApprovalNotAllowedException>(() => service.ApproveAsync(
            world.RequestId, new ApproveOrderCommand(), CancellationToken.None));
        await Assert.ThrowsAsync<SelfApprovalNotAllowedException>(() => service.ReturnAsync(
            world.RequestId, new ReturnForCorrectionCommand("Fikrimi dəyişdim"), CancellationToken.None));

        await using var check = database.CreateContext();
        Assert.Equal(OrderRequestStatus.PendingApproval,
            (await check.OrderRequests.SingleAsync(request => request.Id == world.RequestId)).Status);
    }

    [SqlServerFact]
    public async Task Somebody_else_can_decide_on_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var admin = await TestCurrentUser.AdminAsync(db, "Admin");
        await Service(db, admin).SubmitAsync(
            world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);

        var state = await Service(db, world.Approver).ApproveAsync(world.RequestId, new ApproveOrderCommand(), CancellationToken.None);

        Assert.Equal(OrderRequestStatus.Approved, state.Status);
    }

    [SqlServerFact]
    public async Task A_resubmission_moves_the_rule_to_whoever_resubmitted()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var first = await TestCurrentUser.CoordinatorAsync(db, "Birinci");
        var second = await TestCurrentUser.AdminAsync(db, "İkinci");

        await Service(db, first).SubmitAsync(
            world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);
        await Service(db, world.Approver).ReturnAsync(
            world.RequestId, new ReturnForCorrectionCommand("Yenidən bax"), CancellationToken.None);
        await Service(db, second).SubmitAsync(
            world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);

        // The first submitter is no longer the current one, so they may now decide; the second may not.
        await Assert.ThrowsAsync<SelfApprovalNotAllowedException>(() =>
            Service(db, second).ApproveAsync(
                world.RequestId, new ApproveOrderCommand(), CancellationToken.None));

        var state = await Service(db, first.As(BaxOrdersRoles.Manager))
            .ApproveAsync(world.RequestId, new ApproveOrderCommand(), CancellationToken.None);

        Assert.Equal(OrderRequestStatus.Approved, state.Status);
    }

    [SqlServerFact]
    public async Task What_a_person_may_do_is_their_role_and_the_state_together()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        // A draft: a coordinator may send it, a manager may do nothing with it.
        Assert.Equal(new AllowedWorkflowActionsDto(true, false, false),
            (await Service(db, world.Submitter).GetAsync(world.RequestId, CancellationToken.None))!.AllowedActions);
        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false),
            (await Service(db, world.Approver).GetAsync(world.RequestId, CancellationToken.None))!.AllowedActions);

        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);

        // Waiting: the manager decides, the coordinator cannot.
        Assert.Equal(new AllowedWorkflowActionsDto(false, true, true),
            (await Service(db, world.Approver).GetAsync(world.RequestId, CancellationToken.None))!.AllowedActions);
        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false),
            (await Service(db, world.Submitter).GetAsync(world.RequestId, CancellationToken.None))!.AllowedActions);
    }

    [SqlServerFact]
    public async Task A_decider_who_is_the_submitter_is_told_why_they_cannot_act()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var admin = await TestCurrentUser.AdminAsync(db, "Admin");
        var service = Service(db, admin);
        await service.SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);

        var state = await service.GetAsync(world.RequestId, CancellationToken.None);

        Assert.False(state!.AllowedActions.CanApprove);
        Assert.False(state.AllowedActions.CanReturn);

        // Not "you have the wrong role": the screen can say which of the two it is.
        Assert.True(state.AllowedActions.BlockedBySelfApproval);
    }

    [SqlServerFact]
    public async Task An_anonymous_caller_cannot_act_even_if_it_reaches_the_service()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var anonymous = Service(db, TestCurrentUser.Anonymous());

        await Assert.ThrowsAsync<ForbiddenException>(() => anonymous.SubmitAsync(
            world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None));

        var state = await anonymous.GetAsync(world.RequestId, CancellationToken.None);
        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false), state!.AllowedActions);
    }

    // ---- what is refused -----------------------------------------------------------------------------

    [SqlServerFact]
    public async Task A_draft_cannot_be_approved_without_being_submitted()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        await Assert.ThrowsAsync<DomainException>(() => Service(db, world.Approver).ApproveAsync(
            world.RequestId, new ApproveOrderCommand(), CancellationToken.None));

        await using var check = database.CreateContext();
        Assert.Equal(OrderRequestStatus.Draft,
            (await check.OrderRequests.SingleAsync(request => request.Id == world.RequestId)).Status);
        Assert.Empty(await check.OrderRequestWorkflowEvents
            .Where(item => item.OrderRequestId == world.RequestId).ToListAsync());
    }

    [SqlServerFact]
    public async Task An_approved_request_cannot_be_moved_again()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);
        await Service(db, world.Approver).ApproveAsync(world.RequestId, new ApproveOrderCommand(), CancellationToken.None);

        await Assert.ThrowsAsync<DomainException>(() => Service(db, world.Submitter).SubmitAsync(
            world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None));
        await Assert.ThrowsAsync<DomainException>(() => Service(db, world.Approver).ReturnAsync(
            world.RequestId, new ReturnForCorrectionCommand("Fikrimi dəyişdim"), CancellationToken.None));

        await using var check = database.CreateContext();
        Assert.Equal(2, await check.OrderRequestWorkflowEvents.CountAsync(item => item.OrderRequestId == world.RequestId));
    }

    [SqlServerFact]
    public async Task Approving_twice_does_not_happen_twice()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);
        await Service(db, world.Approver).ApproveAsync(world.RequestId, new ApproveOrderCommand(), CancellationToken.None);

        // The second click finds the request already approved and is told so.
        await Assert.ThrowsAsync<DomainException>(() => Service(db, world.Approver).ApproveAsync(
            world.RequestId, new ApproveOrderCommand(), CancellationToken.None));

        await using var check = database.CreateContext();
        Assert.Single(await check.OrderRequestWorkflowEvents
            .Where(item => item.OrderRequestId == world.RequestId && item.Action == OrderWorkflowAction.Approved)
            .ToListAsync());
    }

    [SqlServerFact]
    public async Task Two_people_acting_at_once_do_not_both_win()
    {
        await using var setup = database.CreateContext();
        var world = await WorldAsync(setup);
        await Service(setup, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);

        // Both read the request while it is still waiting; only one of them can be the one who approved it.
        await using var first = database.CreateContext();
        await using var second = database.CreateContext();
        var firstRequest = await first.OrderRequests.Include(request => request.Items)
            .SingleAsync(request => request.Id == world.RequestId);
        var secondRequest = await second.OrderRequests.Include(request => request.Items)
            .SingleAsync(request => request.Id == world.RequestId);

        firstRequest.Approve(Actor(world.Approver), null, false, DateTime.UtcNow);
        await first.SaveChangesAsync();

        secondRequest.ReturnForCorrection(Actor(world.Approver), "Mən qaytarmaq istəyirdim", DateTime.UtcNow);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => second.SaveChangesAsync());

        await using var check = database.CreateContext();
        Assert.Equal(OrderRequestStatus.Approved,
            (await check.OrderRequests.SingleAsync(request => request.Id == world.RequestId)).Status);
        Assert.Single(await check.OrderRequestWorkflowEvents.Where(item => item.OrderRequestId == world.RequestId
            && item.Action != OrderWorkflowAction.SubmittedForApproval).ToListAsync());
    }

    [SqlServerFact]
    public async Task Handing_back_without_a_reason_is_refused()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);

        await Assert.ThrowsAsync<DomainException>(() => Service(db, world.Approver).ReturnAsync(
            world.RequestId, new ReturnForCorrectionCommand("   "), CancellationToken.None));

        await using var check = database.CreateContext();
        Assert.Equal(OrderRequestStatus.PendingApproval,
            (await check.OrderRequests.SingleAsync(request => request.Id == world.RequestId)).Status);
    }

    [SqlServerFact]
    public async Task An_unknown_request_is_answered_with_nothing()
    {
        await using var db = database.CreateContext();
        var somebody = await TestCurrentUser.CoordinatorAsync(db);

        Assert.Null(await Service(db, somebody).GetAsync(-1, CancellationToken.None));
        await Assert.ThrowsAsync<NotFoundException>(() => Service(db, somebody).SubmitAsync(
            -1, new SubmitForApprovalCommand(), CancellationToken.None));
    }

    // ---- unpriced lines ------------------------------------------------------------------------------

    [SqlServerFact]
    public async Task The_server_counts_the_unpriced_lines_itself()
    {
        await using var db = database.CreateContext();
        var world = await UnpricedWorldAsync(db);

        var state = await Service(db, world.Submitter).GetAsync(world.RequestId, CancellationToken.None);
        var actual = await db.OrderRequestItems
            .CountAsync(item => item.OrderRequestId == world.RequestId && item.UnitPrice == null);

        Assert.Equal(actual, state!.MissingPriceItemCount);
        Assert.True(state.RequiresMissingPriceAcknowledgement);
        Assert.False(state.AmountIsComplete);
    }

    [SqlServerFact]
    public async Task An_order_with_an_unpriced_line_is_not_approved_by_accident()
    {
        await using var db = database.CreateContext();
        var world = await UnpricedWorldAsync(db);

        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);

        // The command carries no count of its own; saying nothing about the unpriced lines is not a claim
        // that there are none.
        var error = await Assert.ThrowsAsync<MissingPriceAcknowledgementRequiredException>(
            () => Service(db, world.Approver).ApproveAsync(world.RequestId, new ApproveOrderCommand(), CancellationToken.None));

        Assert.Equal(1, error.MissingPriceItemCount);

        await using var check = database.CreateContext();
        Assert.Equal(OrderRequestStatus.PendingApproval,
            (await check.OrderRequests.SingleAsync(request => request.Id == world.RequestId)).Status);
    }

    [SqlServerFact]
    public async Task An_order_with_an_unpriced_line_is_approved_once_that_is_acknowledged()
    {
        await using var db = database.CreateContext();
        var world = await UnpricedWorldAsync(db);

        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);
        var state = await Service(db, world.Approver).ApproveAsync(
            world.RequestId,
            new ApproveOrderCommand("Qiymətlər sonra dəqiqləşəcək", AcknowledgeMissingPrices: true),
            CancellationToken.None);

        Assert.Equal(OrderRequestStatus.Approved, state.Status);

        await using var check = database.CreateContext();
        var approval = await check.OrderRequestWorkflowEvents
            .SingleAsync(item => item.OrderRequestId == world.RequestId && item.Action == OrderWorkflowAction.Approved);

        // What was acknowledged, and how much of it, is part of the record.
        Assert.True(approval.MissingPricesAcknowledged);
        Assert.Equal(1, approval.MissingPriceItemCount);
    }

    [SqlServerFact]
    public async Task Nothing_needs_acknowledging_when_every_line_has_a_price()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);
        var state = await Service(db, world.Approver).ApproveAsync(world.RequestId, new ApproveOrderCommand(), CancellationToken.None);

        Assert.Equal(OrderRequestStatus.Approved, state.Status);
        Assert.False(state.RequiresMissingPriceAcknowledgement);
        Assert.True(state.AmountIsComplete);
    }

    // ---- what the workflow leaves alone --------------------------------------------------------------

    [SqlServerFact]
    public async Task Moving_through_the_workflow_changes_no_line_and_no_version()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var before = await LinesAsync(db, world.RequestId);

        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);
        await Service(db, world.Approver).ReturnAsync(world.RequestId, new ReturnForCorrectionCommand("Səbəb"), CancellationToken.None);
        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);
        await Service(db, world.Approver).ApproveAsync(world.RequestId, new ApproveOrderCommand(), CancellationToken.None);

        await using var check = database.CreateContext();
        var request = await check.OrderRequests.SingleAsync(item => item.Id == world.RequestId);

        // A status change is not a revision: the version moves when the order itself changes, which is not
        // what approving it does.
        Assert.Equal(1, request.Version);
        Assert.Equal(before, await LinesAsync(check, world.RequestId));
    }

    [SqlServerFact]
    public async Task Analytics_reads_a_month_the_same_way_whatever_its_approval_status()
    {
        await using var db = database.CreateContext();
        var world = await ComparableWorldAsync(db);

        var beforeComparison = await Comparison(db, world);
        var beforeDashboard = await DashboardRow(db, world);

        await Service(db, world.Submitter).SubmitAsync(world.RequestId, new SubmitForApprovalCommand(), CancellationToken.None);
        await Service(db, world.Approver).ApproveAsync(world.RequestId, new ApproveOrderCommand(), CancellationToken.None);

        var afterComparison = await Comparison(db, world);
        var afterDashboard = await DashboardRow(db, world);

        // Approval is metadata about a request, not a filter on the figures. Every current company request is
        // a draft, so making analytics approved-only would empty it overnight; that stays a business decision.
        var before = beforeComparison.Summary;
        var after = afterComparison.Summary;

        Assert.Equal(before.CurrentRequestId, after.CurrentRequestId);
        Assert.Equal(before.CurrentVersion, after.CurrentVersion);
        Assert.Equal(before.CurrentItemCount, after.CurrentItemCount);
        Assert.Equal(before.CurrentKnownAmountTotal, after.CurrentKnownAmountTotal);
        Assert.Equal(before.BaselineKnownAmountTotal, after.BaselineKnownAmountTotal);
        Assert.Equal(before.KnownAmountDelta, after.KnownAmountDelta);
        Assert.Equal(before.KnownAmountPercentChange, after.KnownAmountPercentChange);
        Assert.Equal(before.AvailableBaselinePeriodCount, after.AvailableBaselinePeriodCount);
        Assert.Equal(before.NewVariantCount, after.NewVariantCount);
        Assert.Equal(before.IncreasedVariantCount, after.IncreasedVariantCount);
        Assert.Equal(before.TotalVariantCount, after.TotalVariantCount);
        Assert.Equal(beforeComparison.Rows.TotalCount, afterComparison.Rows.TotalCount);

        Assert.Equal(beforeDashboard.Current.KnownAmount, afterDashboard.Current.KnownAmount);
        Assert.Equal(beforeDashboard.NewVariantCount, afterDashboard.NewVariantCount);
        Assert.Equal(beforeDashboard.HistoryCoverage, afterDashboard.HistoryCoverage);
        Assert.Equal(beforeDashboard.ComparisonAvailability, afterDashboard.ComparisonAvailability);

        // The one thing that did change is the status the screens display.
        Assert.Equal(OrderRequestStatus.Draft, before.CurrentStatus);
        Assert.Equal(OrderRequestStatus.Approved, after.CurrentStatus);
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private static OrderWorkflowService Service(BaxOrdersDbContext db, ICurrentUserContext user) =>
        new(db, user, new SqlServerOrderRequestLock(db));

    private static WorkflowActor Actor(TestCurrentUser user) =>
        WorkflowActor.User(user.UserId!.Value, user.DisplayName!);

    private static async Task<List<(long Id, decimal Quantity, decimal? UnitPrice)>> LinesAsync(
        BaxOrdersDbContext db, long requestId) =>
        await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.OrderRequestId == requestId)
            .OrderBy(item => item.Id)
            .Select(item => new ValueTuple<long, decimal, decimal?>(item.Id, item.Quantity, item.UnitPrice))
            .ToListAsync();

    private static async Task<LocationComparisonDto> Comparison(BaxOrdersDbContext db, World world) =>
        await new OrderAnalyticsQueries(db).CompareAsync(
            world.LocationId, world.July, new ComparisonQuery(PageSize: 200), CancellationToken.None)
        ?? throw new InvalidOperationException("The fixture must be comparable.");

    private static async Task<LocationDashboardRowDto> DashboardRow(BaxOrdersDbContext db, World world)
    {
        var dashboard = await new ManagementDashboardQueries(db).GetAsync(
            world.July, new DashboardQuery(Search: world.Tag, PageSize: 100), CancellationToken.None);

        return dashboard!.Rows.Items.Single(row => row.LocationId == world.LocationId);
    }

    private sealed record World(
        string Tag, int LocationId, long RequestId, DateOnly June, DateOnly July,
        TestCurrentUser Submitter, TestCurrentUser Approver);

    /// <summary>One location with one fully priced July request, waiting in draft.</summary>
    private static Task<World> WorldAsync(BaxOrdersDbContext db) => BuildAsync(db, unpriced: false, withHistory: false);

    /// <summary>The same, but one of its lines has no price at all.</summary>
    private static Task<World> UnpricedWorldAsync(BaxOrdersDbContext db) => BuildAsync(db, unpriced: true, withHistory: false);

    /// <summary>The same, with a June behind it so analytics has something to compare July against.</summary>
    private static Task<World> ComparableWorldAsync(BaxOrdersDbContext db) => BuildAsync(db, unpriced: false, withHistory: true);

    private static async Task<World> BuildAsync(BaxOrdersDbContext db, bool unpriced, bool withHistory)
    {
        var tag = Guid.NewGuid().ToString("N")[..6];
        var (june, july) = (new DateOnly(2026, 6, 1), new DateOnly(2026, 7, 1));

        // Two people: one who sends orders and one who decides on them. The same person may not do both.
        var submitter = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");
        var approver = await TestCurrentUser.ManagerAsync(db, "Sınaq rəhbəri");

        var location = new Location(
            await new SqlServerLocationCodeGenerator(db).NextAsync(CancellationToken.None), $"İş axını obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Product(
            await new SqlServerProductCodeGenerator(db).NextAsync(CancellationToken.None), $"Mop {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        var other = product.AddVariant("50", null, null, pieces);
        await db.SaveChangesAsync();

        if (withHistory)
        {
            var previous = new OrderRequest(location, june);
            previous.AddItem(variant, 20m, 10m);
            db.OrderRequests.Add(previous);
        }

        var request = new OrderRequest(location, july);
        request.AddItem(variant, 30m, 10m);
        request.AddItem(other, 5m, unpriced ? null : 4m);
        db.OrderRequests.Add(request);
        await db.SaveChangesAsync();

        return new World(tag, location.Id, request.Id, june, july, submitter, approver);
    }
}
