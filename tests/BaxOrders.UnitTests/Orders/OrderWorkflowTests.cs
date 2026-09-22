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

        request.SubmitForApproval("Ruslan", "İyul sifarişi yoxlanıldı", Now);

        Assert.Equal(OrderRequestStatus.PendingApproval, request.Status);
        Assert.Equal(Now, request.SubmittedAtUtc);
    }

    [Fact]
    public void A_returned_request_can_be_handed_over_again()
    {
        var request = Priced();
        request.SubmitForApproval("Ruslan", null, Now);
        request.ReturnForCorrection("Ənvər", "Miqdarlar yoxlanmalıdır", Now.AddHours(1));

        request.SubmitForApproval("Ruslan", "Düzəldildi", Now.AddHours(2));

        Assert.Equal(OrderRequestStatus.PendingApproval, request.Status);
    }

    [Fact]
    public void A_waiting_request_can_be_approved()
    {
        var request = Submitted();

        request.Approve("Ənvər", "Razıyam", false, Now.AddHours(1));

        Assert.Equal(OrderRequestStatus.Approved, request.Status);
        Assert.Equal(Now.AddHours(1), request.ApprovedAtUtc);
    }

    [Fact]
    public void A_waiting_request_can_be_handed_back()
    {
        var request = Submitted();

        request.ReturnForCorrection("Ənvər", "Qiymətlər dəqiqləşdirilməlidir", Now.AddHours(1));

        Assert.Equal(OrderRequestStatus.ReturnedForCorrection, request.Status);
        Assert.Equal(Now.AddHours(1), request.ReturnedAtUtc);
    }

    // ---- illegal transitions -------------------------------------------------------------------------

    [Fact]
    public void A_draft_cannot_be_approved_without_being_submitted()
    {
        var request = Priced();

        Assert.Throws<DomainException>(() => request.Approve("Ənvər", null, false, Now));
    }

    [Fact]
    public void An_approved_request_is_the_end_of_the_road()
    {
        // Correcting an approved month is a new version of the request, never a reopening of this one.
        var request = Approved();

        Assert.Throws<DomainException>(() => request.SubmitForApproval("Ruslan", null, Now));
        Assert.Throws<DomainException>(() => request.Approve("Ənvər", null, false, Now));
        Assert.Throws<DomainException>(() => request.ReturnForCorrection("Ənvər", "Fikrimi dəyişdim", Now));
    }

    [Fact]
    public void A_waiting_request_cannot_be_submitted_again()
    {
        var request = Submitted();

        Assert.Throws<DomainException>(() => request.SubmitForApproval("Ruslan", null, Now));
    }

    [Fact]
    public void An_empty_request_cannot_be_submitted()
    {
        var request = new OrderRequest(Location(), July);

        Assert.Throws<DomainException>(() => request.SubmitForApproval("Ruslan", null, Now));
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

        Assert.Throws<DomainException>(() => request.ReturnForCorrection("Ənvər", reason!, Now));
        Assert.Equal(OrderRequestStatus.PendingApproval, request.Status);
    }

    [Fact]
    public void The_reason_is_kept_exactly_as_written()
    {
        var request = Submitted();

        request.ReturnForCorrection("Ənvər", "  Zibil paketi sayı çoxdur  ", Now);

        Assert.Equal("Zibil paketi sayı çoxdur", Assert.Single(request.WorkflowEvents, e => e.Action == OrderWorkflowAction.ReturnedForCorrection).Comment);
    }

    [Fact]
    public void A_comment_on_submitting_or_approving_is_optional()
    {
        var request = Priced();
        request.SubmitForApproval("Ruslan", null, Now);
        request.Approve("Ənvər", null, false, Now.AddHours(1));

        Assert.All(request.WorkflowEvents, workflowEvent => Assert.Null(workflowEvent.Comment));
    }

    // ---- unpriced lines ------------------------------------------------------------------------------

    [Fact]
    public void An_order_with_an_unpriced_line_is_not_approved_by_accident()
    {
        var request = SubmittedWithMissingPrice();

        var error = Assert.Throws<MissingPriceAcknowledgementRequiredException>(
            () => request.Approve("Ənvər", null, false, Now));

        Assert.Equal(1, error.MissingPriceItemCount);
        Assert.Equal(OrderRequestStatus.PendingApproval, request.Status);
    }

    [Fact]
    public void An_order_with_an_unpriced_line_is_approved_once_that_is_acknowledged()
    {
        // A missing price does not make the order wrong; it makes the approved amount incomplete, and that
        // has to be somebody's decision rather than something nobody noticed.
        var request = SubmittedWithMissingPrice();

        request.Approve("Ənvər", null, true, Now);

        Assert.Equal(OrderRequestStatus.Approved, request.Status);
        var approval = Assert.Single(request.WorkflowEvents, e => e.Action == OrderWorkflowAction.Approved);
        Assert.True(approval.MissingPricesAcknowledged);
        Assert.Equal(1, approval.MissingPriceItemCount);
    }

    [Fact]
    public void Nothing_needs_acknowledging_when_every_line_has_a_price()
    {
        var request = Submitted();

        request.Approve("Ənvər", null, false, Now);

        Assert.Equal(OrderRequestStatus.Approved, request.Status);
        Assert.False(Assert.Single(request.WorkflowEvents, e => e.Action == OrderWorkflowAction.Approved).MissingPricesAcknowledged);
    }

    // ---- the audit trail -----------------------------------------------------------------------------

    [Fact]
    public void Every_transition_leaves_an_event_behind()
    {
        var request = Priced();
        request.SubmitForApproval("Ruslan", null, Now);
        request.ReturnForCorrection("Ənvər", "Yenidən bax", Now.AddHours(1));
        request.SubmitForApproval("Ruslan", null, Now.AddHours(2));
        request.Approve("Ənvər", null, false, Now.AddHours(3));

        Assert.Equal(
            [OrderWorkflowAction.SubmittedForApproval, OrderWorkflowAction.ReturnedForCorrection,
             OrderWorkflowAction.SubmittedForApproval, OrderWorkflowAction.Approved],
            request.WorkflowEvents.Select(workflowEvent => workflowEvent.Action));
    }

    [Fact]
    public void An_event_records_where_the_request_came_from_and_went_to()
    {
        var request = Submitted();
        request.ReturnForCorrection("Ənvər", "Səbəb", Now.AddHours(1));

        var returned = request.WorkflowEvents.Last();

        Assert.Equal((OrderRequestStatus.PendingApproval, OrderRequestStatus.ReturnedForCorrection),
            (returned.FromStatus, returned.ToStatus));
        Assert.Equal("Ənvər", returned.ActorDisplayName);
        Assert.Equal(Now.AddHours(1), returned.OccurredAtUtc);
    }

    [Fact]
    public void A_refused_transition_leaves_no_event()
    {
        var request = Submitted();

        Assert.Throws<DomainException>(() => request.ReturnForCorrection("Ənvər", "  ", Now));

        Assert.Single(request.WorkflowEvents);
    }

    [Theory]
    [InlineData(DateTimeKind.Local)]
    [InlineData(DateTimeKind.Unspecified)]
    public void A_transition_must_be_timestamped_in_utc(DateTimeKind kind)
    {
        var request = Priced();

        Assert.Throws<DomainException>(
            () => request.SubmitForApproval("Ruslan", null, new DateTime(2026, 9, 22, 10, 0, 0, kind)));
    }

    [Fact]
    public void An_actor_must_be_named()
    {
        var request = Priced();

        Assert.Throws<DomainException>(() => request.SubmitForApproval("   ", null, Now));
    }

    // ---- the version ---------------------------------------------------------------------------------

    [Fact]
    public void Moving_through_the_workflow_is_not_a_new_revision()
    {
        var request = Priced();
        var version = request.Version;

        request.SubmitForApproval("Ruslan", null, Now);
        request.ReturnForCorrection("Ənvər", "Səbəb", Now.AddHours(1));
        request.SubmitForApproval("Ruslan", null, Now.AddHours(2));
        request.Approve("Ənvər", null, false, Now.AddHours(3));

        Assert.Equal(version, request.Version);
    }

    // ---- what the state allows -----------------------------------------------------------------------

    [Theory]
    [InlineData(OrderRequestStatus.Draft, true, false, false)]
    [InlineData(OrderRequestStatus.ReturnedForCorrection, true, false, false)]
    [InlineData(OrderRequestStatus.PendingApproval, false, true, true)]
    [InlineData(OrderRequestStatus.Approved, false, false, false)]
    public void What_a_state_allows(OrderRequestStatus status, bool submit, bool approve, bool @return)
    {
        var allowed = AllowedWorkflowActionsDto.For(status);

        Assert.Equal((submit, approve, @return), (allowed.CanSubmit, allowed.CanApprove, allowed.CanReturn));
    }

    // ---- fixture -------------------------------------------------------------------------------------

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
        request.SubmitForApproval("Ruslan", null, Now);
        return request;
    }

    private static OrderRequest Approved()
    {
        var request = Submitted();
        request.Approve("Ənvər", null, false, Now.AddHours(1));
        return request;
    }

    private static OrderRequest SubmittedWithMissingPrice()
    {
        var request = new OrderRequest(Location(), July);
        request.AddItem(Variant(), 10m, 7m);
        request.AddItem(Variant(), 5m, null);
        request.SubmitForApproval("Ruslan", null, Now);
        return request;
    }
}
