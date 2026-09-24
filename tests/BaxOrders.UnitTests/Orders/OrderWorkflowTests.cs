using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;

namespace BaxOrders.UnitTests.Orders;

/// <summary>
/// The approval state machine, and the one rule that is not a simple yes or no: an order whose money is
/// partly unknown may still be approved, but only by someone who says they know that.
/// </summary>
public sealed class OrderWorkflowTests
{
    private static readonly DateTime Now = new(2026, 9, 22, 10, 0, 0, DateTimeKind.Utc);
    private static readonly DateOnly July = new(2026, 7, 1);

    // ---- legal transitions ---------------------------------------------------------------------------

    [Fact]
    public void A_draft_can_be_handed_to_the_approver()
    {
        var request = Priced();

        request.SubmitForApproval(Actor("Sınaq koordinatoru"), "İyul sifarişi yoxlanıldı", Now);

        Assert.Equal(OrderRequestStatus.PendingApproval, request.Status);
        Assert.Equal(Now, request.SubmittedAtUtc);
    }

    [Fact]
    public void A_returned_request_can_be_handed_over_again()
    {
        var request = Priced();
        request.SubmitForApproval(Actor("Sınaq koordinatoru"), null, Now);
        request.ReturnForCorrection(Actor("Sınaq rəhbəri"), "Miqdarlar yoxlanmalıdır", Now.AddHours(1));

        request.SubmitForApproval(Actor("Sınaq koordinatoru"), "Düzəldildi", Now.AddHours(2));

        Assert.Equal(OrderRequestStatus.PendingApproval, request.Status);
    }

    [Fact]
    public void A_waiting_request_can_be_approved()
    {
        var request = Submitted();

        request.Approve(Actor("Sınaq rəhbəri"), "Razıyam", false, Now.AddHours(1));

        Assert.Equal(OrderRequestStatus.Approved, request.Status);
        Assert.Equal(Now.AddHours(1), request.ApprovedAtUtc);
    }

    [Fact]
    public void A_waiting_request_can_be_handed_back()
    {
        var request = Submitted();

        request.ReturnForCorrection(Actor("Sınaq rəhbəri"), "Qiymətlər dəqiqləşdirilməlidir", Now.AddHours(1));

        Assert.Equal(OrderRequestStatus.ReturnedForCorrection, request.Status);
        Assert.Equal(Now.AddHours(1), request.ReturnedAtUtc);
    }

    // ---- illegal transitions -------------------------------------------------------------------------

    [Fact]
    public void A_draft_cannot_be_approved_without_being_submitted()
    {
        var request = Priced();

        Assert.Throws<DomainException>(() => request.Approve(Actor("Sınaq rəhbəri"), null, false, Now));
    }

    [Fact]
    public void An_approved_request_is_the_end_of_the_road()
    {
        // Correcting an approved month is a new version of the request, never a reopening of this one.
        var request = Approved();

        Assert.Throws<DomainException>(() => request.SubmitForApproval(Actor("Sınaq koordinatoru"), null, Now));
        Assert.Throws<DomainException>(() => request.Approve(Actor("Sınaq rəhbəri"), null, false, Now));
        Assert.Throws<DomainException>(() => request.ReturnForCorrection(Actor("Sınaq rəhbəri"), "Fikrimi dəyişdim", Now));
    }

    [Fact]
    public void A_waiting_request_cannot_be_submitted_again()
    {
        var request = Submitted();

        Assert.Throws<DomainException>(() => request.SubmitForApproval(Actor("Sınaq koordinatoru"), null, Now));
    }

    [Fact]
    public void An_empty_request_cannot_be_submitted()
    {
        var request = new OrderRequest(Location(), July);

        Assert.Throws<DomainException>(() => request.SubmitForApproval(Actor("Sınaq koordinatoru"), null, Now));
    }

    // ---- the reason ----------------------------------------------------------------------------------

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Handing_a_request_back_without_saying_why_is_refused(string? reason)
    {
        // "Returned" with no explanation tells the person who has to fix it nothing.
        var request = Submitted();

        Assert.Throws<DomainException>(() => request.ReturnForCorrection(Actor("Sınaq rəhbəri"), reason!, Now));
        Assert.Equal(OrderRequestStatus.PendingApproval, request.Status);
    }

    [Fact]
    public void The_reason_is_kept_exactly_as_written()
    {
        var request = Submitted();

        request.ReturnForCorrection(Actor("Sınaq rəhbəri"), "  Zibil paketi sayı çoxdur  ", Now);

        Assert.Equal("Zibil paketi sayı çoxdur", Assert.Single(request.WorkflowEvents, e => e.Action == OrderWorkflowAction.ReturnedForCorrection).Comment);
    }

    [Fact]
    public void A_comment_on_submitting_or_approving_is_optional()
    {
        var request = Priced();
        request.SubmitForApproval(Actor("Sınaq koordinatoru"), null, Now);
        request.Approve(Actor("Sınaq rəhbəri"), null, false, Now.AddHours(1));

        Assert.All(request.WorkflowEvents, workflowEvent => Assert.Null(workflowEvent.Comment));
    }

    // ---- unpriced lines ------------------------------------------------------------------------------

    [Fact]
    public void An_order_with_an_unpriced_line_is_not_approved_by_accident()
    {
        var request = SubmittedWithMissingPrice();

        var error = Assert.Throws<MissingPriceAcknowledgementRequiredException>(
            () => request.Approve(Actor("Sınaq rəhbəri"), null, false, Now));

        Assert.Equal(1, error.MissingPriceItemCount);
        Assert.Equal(OrderRequestStatus.PendingApproval, request.Status);
    }

    [Fact]
    public void An_order_with_an_unpriced_line_is_approved_once_that_is_acknowledged()
    {
        // A missing price does not make the order wrong; it makes the approved amount incomplete, and that
        // has to be somebody's decision rather than something nobody noticed.
        var request = SubmittedWithMissingPrice();

        request.Approve(Actor("Sınaq rəhbəri"), null, true, Now);

        Assert.Equal(OrderRequestStatus.Approved, request.Status);
        var approval = Assert.Single(request.WorkflowEvents, e => e.Action == OrderWorkflowAction.Approved);
        Assert.True(approval.MissingPricesAcknowledged);
        Assert.Equal(1, approval.MissingPriceItemCount);
    }

    [Fact]
    public void Nothing_needs_acknowledging_when_every_line_has_a_price()
    {
        var request = Submitted();

        request.Approve(Actor("Sınaq rəhbəri"), null, false, Now);

        Assert.Equal(OrderRequestStatus.Approved, request.Status);
        Assert.False(Assert.Single(request.WorkflowEvents, e => e.Action == OrderWorkflowAction.Approved).MissingPricesAcknowledged);
    }

    // ---- the audit trail -----------------------------------------------------------------------------

    [Fact]
    public void Every_transition_leaves_an_event_behind()
    {
        var request = Priced();
        request.SubmitForApproval(Actor("Sınaq koordinatoru"), null, Now);
        request.ReturnForCorrection(Actor("Sınaq rəhbəri"), "Yenidən bax", Now.AddHours(1));
        request.SubmitForApproval(Actor("Sınaq koordinatoru"), null, Now.AddHours(2));
        request.Approve(Actor("Sınaq rəhbəri"), null, false, Now.AddHours(3));

        Assert.Equal(
            [OrderWorkflowAction.SubmittedForApproval, OrderWorkflowAction.ReturnedForCorrection,
             OrderWorkflowAction.SubmittedForApproval, OrderWorkflowAction.Approved],
            request.WorkflowEvents.Select(workflowEvent => workflowEvent.Action));
    }

    [Fact]
    public void An_event_records_where_the_request_came_from_and_went_to()
    {
        var request = Submitted();
        request.ReturnForCorrection(Actor("Sınaq rəhbəri"), "Səbəb", Now.AddHours(1));

        var returned = request.WorkflowEvents.Last();

        Assert.Equal((OrderRequestStatus.PendingApproval, OrderRequestStatus.ReturnedForCorrection),
            (returned.FromStatus, returned.ToStatus));
        Assert.Equal("Sınaq rəhbəri", returned.ActorDisplayName);
        Assert.Equal(Now.AddHours(1), returned.OccurredAtUtc);
    }

    [Fact]
    public void A_refused_transition_leaves_no_event()
    {
        var request = Submitted();

        Assert.Throws<DomainException>(() => request.ReturnForCorrection(Actor("Sınaq rəhbəri"), "  ", Now));

        Assert.Single(request.WorkflowEvents);
    }

    [Theory]
    [InlineData(DateTimeKind.Local)]
    [InlineData(DateTimeKind.Unspecified)]
    public void A_transition_must_be_timestamped_in_utc(DateTimeKind kind)
    {
        var request = Priced();

        Assert.Throws<DomainException>(
            () => request.SubmitForApproval(Actor("Sınaq koordinatoru"), null, new DateTime(2026, 9, 22, 10, 0, 0, kind)));
    }

    [Fact]
    public void An_actor_must_be_named()
    {
        var request = Priced();

        Assert.Throws<DomainException>(() => request.SubmitForApproval(Actor("   "), null, Now));
    }

    // ---- the version ---------------------------------------------------------------------------------

    [Fact]
    public void Moving_through_the_workflow_is_not_a_new_revision()
    {
        var request = Priced();
        var version = request.Version;

        request.SubmitForApproval(Actor("Sınaq koordinatoru"), null, Now);
        request.ReturnForCorrection(Actor("Sınaq rəhbəri"), "Səbəb", Now.AddHours(1));
        request.SubmitForApproval(Actor("Sınaq koordinatoru"), null, Now.AddHours(2));
        request.Approve(Actor("Sınaq rəhbəri"), null, false, Now.AddHours(3));

        Assert.Equal(version, request.Version);
    }

    // ---- what the state allows -----------------------------------------------------------------------

    [Theory]
    [InlineData(OrderRequestStatus.Draft, true, false, false)]
    [InlineData(OrderRequestStatus.ReturnedForCorrection, true, false, false)]
    [InlineData(OrderRequestStatus.PendingApproval, false, true, true)]
    [InlineData(OrderRequestStatus.Approved, false, false, false)]
    public void What_a_state_allows_before_anybody_is_considered(
        OrderRequestStatus status, bool submit, bool approve, bool @return)
    {
        var allowed = AllowedWorkflowActionsDto.ForState(status);

        Assert.Equal((submit, approve, @return), (allowed.CanSubmit, allowed.CanApprove, allowed.CanReturn));
    }

    // ---- what a person may do ------------------------------------------------------------------------

    [Theory]
    // A draft: whoever may submit, may send it. A manager has nothing to do with it yet.
    [InlineData(OrderRequestStatus.Draft, BaxOrdersRoles.Coordinator, true, false, false, false)]
    [InlineData(OrderRequestStatus.Draft, BaxOrdersRoles.Manager, false, false, false, false)]
    [InlineData(OrderRequestStatus.Draft, BaxOrdersRoles.Admin, true, false, false, false)]
    // Waiting: the decision is the Rəhbər's alone. An administrator holds no approval authority either (4.3),
    // and — seeing the queue — is told that is why nothing is offered. A coordinator was never expected to
    // decide, and is told nothing.
    [InlineData(OrderRequestStatus.PendingApproval, BaxOrdersRoles.Coordinator, false, false, false, false)]
    [InlineData(OrderRequestStatus.PendingApproval, BaxOrdersRoles.Manager, false, true, true, false)]
    [InlineData(OrderRequestStatus.PendingApproval, BaxOrdersRoles.Admin, false, false, false, true)]
    // Returned: back with whoever submits.
    [InlineData(OrderRequestStatus.ReturnedForCorrection, BaxOrdersRoles.Coordinator, true, false, false, false)]
    [InlineData(OrderRequestStatus.ReturnedForCorrection, BaxOrdersRoles.Manager, false, false, false, false)]
    // Approved: nothing, for anybody.
    [InlineData(OrderRequestStatus.Approved, BaxOrdersRoles.Admin, false, false, false, false)]
    [InlineData(OrderRequestStatus.Approved, BaxOrdersRoles.Manager, false, false, false, false)]
    public void What_a_role_may_do_in_a_state(
        OrderRequestStatus status, string role, bool submit, bool approve, bool @return, bool missingAuthority)
    {
        var somebodyElse = Guid.NewGuid();
        var allowed = AllowedWorkflowActionsDto.For(status, somebodyElse, User(role, Guid.NewGuid()));

        Assert.Equal((submit, approve, @return), (allowed.CanSubmit, allowed.CanApprove, allowed.CanReturn));
        Assert.Equal(missingAuthority, allowed.BlockedByMissingAuthority);
        Assert.False(allowed.BlockedBySelfApproval);
        Assert.False(allowed.BlockedByOwnContribution);
    }

    [Fact]
    public void A_manager_may_not_decide_on_what_they_submitted_themselves()
    {
        // The authority says yes and the state says yes; being the submitter is what stops it.
        var me = Guid.NewGuid();
        var allowed = AllowedWorkflowActionsDto.For(OrderRequestStatus.PendingApproval, me, User(BaxOrdersRoles.Manager, me));

        Assert.False(allowed.CanApprove);
        Assert.False(allowed.CanReturn);
        Assert.True(allowed.BlockedBySelfApproval);
        Assert.False(allowed.BlockedByMissingAuthority);
    }

    [Fact]
    public void A_manager_may_not_decide_on_a_correction_they_worked_on()
    {
        var allowed = AllowedWorkflowActionsDto.For(
            OrderRequestStatus.PendingApproval, Guid.NewGuid(), User(BaxOrdersRoles.Manager, Guid.NewGuid()), contributedEdits: true);

        Assert.False(allowed.CanApprove);
        Assert.True(allowed.BlockedByOwnContribution);
        Assert.False(allowed.BlockedByMissingAuthority);
    }

    [Fact]
    public void Missing_authority_is_the_reason_given_before_self_approval_and_own_contribution()
    {
        // An administrator who may approve nothing is told that — not that it happens to be their own
        // submission, or a correction they edited. The other two reasons only matter to somebody who holds the
        // authority.
        var me = Guid.NewGuid();
        var allowed = AllowedWorkflowActionsDto.For(
            OrderRequestStatus.PendingApproval, me, User(BaxOrdersRoles.Admin, me), contributedEdits: true);

        Assert.Equal((false, false), (allowed.CanApprove, allowed.CanReturn));
        Assert.True(allowed.BlockedByMissingAuthority);
        Assert.False(allowed.BlockedBySelfApproval);
        Assert.False(allowed.BlockedByOwnContribution);
    }

    [Fact]
    public void A_coordinator_is_offered_no_decision_and_told_no_reason_even_on_their_own_submission()
    {
        var me = Guid.NewGuid();
        var allowed = AllowedWorkflowActionsDto.For(
            OrderRequestStatus.PendingApproval, me, User(BaxOrdersRoles.Coordinator, me), contributedEdits: true);

        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false), allowed);
    }

    [Fact]
    public void An_anonymous_caller_may_do_nothing_at_all()
    {
        var allowed = AllowedWorkflowActionsDto.For(OrderRequestStatus.PendingApproval, null, User(null, null));

        Assert.Equal((false, false, false), (allowed.CanSubmit, allowed.CanApprove, allowed.CanReturn));
        Assert.False(allowed.BlockedByMissingAuthority);
    }

    // ---- who holds approval authority ----------------------------------------------------------------

    [Fact]
    public void Only_the_manager_role_holds_approval_authority()
    {
        Assert.True(ApprovalAuthority.IsHeldBy(BaxOrdersRoles.Manager));
    }

    [Theory]
    [InlineData(BaxOrdersRoles.Admin)]
    [InlineData(BaxOrdersRoles.Coordinator)]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("manager")]
    [InlineData("SuperUser")]
    public void No_other_role_holds_approval_authority_an_administrator_included(string? role)
    {
        // 4.3: being an administrator does not make somebody an approver.
        Assert.False(ApprovalAuthority.IsHeldBy(role));
    }

    [Theory]
    [InlineData(BaxOrdersRoles.Manager, true)]
    [InlineData(BaxOrdersRoles.Admin, true)]
    [InlineData(BaxOrdersRoles.Coordinator, false)]
    [InlineData(null, false)]
    public void The_approval_queue_is_seen_by_the_approver_and_by_an_administrator(string? role, bool mayView)
    {
        Assert.Equal(mayView, ApprovalAuthority.MayViewQueue(role));
    }

    private static ICurrentUserContext User(string? role, Guid? userId) => new StubUser(role, userId);

    private sealed class StubUser(string? role, Guid? userId) : ICurrentUserContext
    {
        public bool IsAuthenticated => userId is not null;

        public Guid? UserId => userId;

        public string? UserName => role;

        public string? DisplayName => role;

        public string? Role => role;
    }

    // ---- fixture -------------------------------------------------------------------------------------

    /// <summary>Two names, two people: a submitter and an approver are never the same user here.</summary>
    private static readonly Dictionary<string, Guid> Ids = [];

    private static WorkflowActor Actor(string name)
    {
        if (!Ids.TryGetValue(name, out var id))
        {
            Ids[name] = id = Guid.NewGuid();
        }

        return WorkflowActor.User(id, name);
    }

    private static Location Location() => new("MASTAGA", "Maştağa");

    private static ProductVariant Variant()
    {
        var product = new Product("PRD-000001", "Bel");
        return product.AddVariant(null, null, null, new UnitOfMeasure("PCS", "Ədəd", "ədəd", UnitType.Count));
    }

    private static OrderRequest Priced()
    {
        var request = new OrderRequest(Location(), July);
        request.AddItem(Variant(), 10m, 7m);
        return request;
    }

    private static OrderRequest Submitted()
    {
        var request = Priced();
        request.SubmitForApproval(Actor("Sınaq koordinatoru"), null, Now);
        return request;
    }

    private static OrderRequest Approved()
    {
        var request = Submitted();
        request.Approve(Actor("Sınaq rəhbəri"), null, false, Now.AddHours(1));
        return request;
    }

    private static OrderRequest SubmittedWithMissingPrice()
    {
        var request = new OrderRequest(Location(), July);
        request.AddItem(Variant(), 10m, 7m);
        request.AddItem(Variant(), 5m, null);
        request.SubmitForApproval(Actor("Sınaq koordinatoru"), null, Now);
        return request;
    }
}
