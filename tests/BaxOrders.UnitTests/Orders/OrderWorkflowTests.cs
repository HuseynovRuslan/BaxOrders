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
    [InlineData(OrderRequestStatus.Draft, BaxOrdersRoles.Coordinator, true, false, false)]
    [InlineData(OrderRequestStatus.Draft, BaxOrdersRoles.Manager, false, false, false)]
    [InlineData(OrderRequestStatus.Draft, BaxOrdersRoles.Admin, true, false, false)]
    // Waiting: the decision is the manager's, and the coordinator who sent it has no say.
    [InlineData(OrderRequestStatus.PendingApproval, BaxOrdersRoles.Coordinator, false, false, false)]
    [InlineData(OrderRequestStatus.PendingApproval, BaxOrdersRoles.Manager, false, true, true)]
    [InlineData(OrderRequestStatus.PendingApproval, BaxOrdersRoles.Admin, false, true, true)]
    // Returned: back with whoever submits.
    [InlineData(OrderRequestStatus.ReturnedForCorrection, BaxOrdersRoles.Coordinator, true, false, false)]
    [InlineData(OrderRequestStatus.ReturnedForCorrection, BaxOrdersRoles.Manager, false, false, false)]
    // Approved: nothing, for anybody.
    [InlineData(OrderRequestStatus.Approved, BaxOrdersRoles.Admin, false, false, false)]
    public void What_a_role_may_do_in_a_state(
        OrderRequestStatus status, string role, bool submit, bool approve, bool @return)
    {
        var somebodyElse = Guid.NewGuid();
        var allowed = AllowedWorkflowActionsDto.For(status, somebodyElse, User(role, Guid.NewGuid()));

        Assert.Equal((submit, approve, @return), (allowed.CanSubmit, allowed.CanApprove, allowed.CanReturn));
        Assert.False(allowed.BlockedBySelfApproval);
    }

    [Theory]
    [InlineData(BaxOrdersRoles.Manager)]
    [InlineData(BaxOrdersRoles.Admin)]
    public void Nobody_may_decide_on_what_they_submitted_themselves(string role)
    {
        // The role says yes and the state says yes; being the submitter is what stops it.
        var me = Guid.NewGuid();
        var allowed = AllowedWorkflowActionsDto.For(OrderRequestStatus.PendingApproval, me, User(role, me));

        Assert.False(allowed.CanApprove);
        Assert.False(allowed.CanReturn);
        Assert.True(allowed.BlockedBySelfApproval);
    }

    [Fact]
    public void An_anonymous_caller_may_do_nothing_at_all()
    {
        var allowed = AllowedWorkflowActionsDto.For(OrderRequestStatus.PendingApproval, null, User(null, null));

        Assert.Equal((false, false, false), (allowed.CanSubmit, allowed.CanApprove, allowed.CanReturn));
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
