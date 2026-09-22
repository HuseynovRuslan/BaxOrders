using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Orders.Workflow;

/// <summary>
/// What this person may do to this request right now.
/// </summary>
/// <remarks>
/// Three things have to agree: the workflow state allows the action, the signed-in person's role allows it,
/// and they are not deciding on their own submission. It is computed here so a screen never has to work it
/// out — but it is <b>not</b> the security check. The endpoints enforce the same rules again, because a
/// browser can post whatever it likes whatever this said.
/// </remarks>
/// <param name="BlockedBySelfApproval">
/// True when the state and the role would both allow a decision, and the only thing stopping it is that this
/// person submitted the request. The screen says so rather than silently offering nothing.
/// </param>
public sealed record AllowedWorkflowActionsDto(
    bool CanSubmit, bool CanApprove, bool CanReturn, bool BlockedBySelfApproval = false)
{
    /// <summary>What the workflow state allows, before anything is known about who is asking.</summary>
    public static AllowedWorkflowActionsDto ForState(OrderRequestStatus status) => status switch
    {
        OrderRequestStatus.Draft => new AllowedWorkflowActionsDto(true, false, false),
        OrderRequestStatus.ReturnedForCorrection => new AllowedWorkflowActionsDto(true, false, false),
        OrderRequestStatus.PendingApproval => new AllowedWorkflowActionsDto(false, true, true),
        // Approval is the end of the road; a correction is a new version, not a reopening of this one.
        _ => new AllowedWorkflowActionsDto(false, false, false),
    };

    /// <summary>The state narrowed by the role, and then by whether this is the person's own submission.</summary>
    public static AllowedWorkflowActionsDto For(
        OrderRequestStatus status, Guid? submittedByUserId, ICurrentUserContext currentUser)
    {
        ArgumentNullException.ThrowIfNull(currentUser);

        var state = ForState(status);
        if (!currentUser.IsAuthenticated)
        {
            return new AllowedWorkflowActionsDto(false, false, false);
        }

        var role = currentUser.Role;
        var maySubmit = role is BaxOrdersRoles.Coordinator or BaxOrdersRoles.Admin;
        var mayDecide = role is BaxOrdersRoles.Manager or BaxOrdersRoles.Admin;

        // Approving your own submission is not a second pair of eyes, whatever role you hold.
        var ownSubmission = currentUser.UserId is { } userId && submittedByUserId == userId;
        var canDecide = state.CanApprove && mayDecide && !ownSubmission;

        return new AllowedWorkflowActionsDto(
            state.CanSubmit && maySubmit,
            canDecide,
            state.CanReturn && mayDecide && !ownSubmission,
            BlockedBySelfApproval: state.CanApprove && mayDecide && ownSubmission);
    }
}

/// <param name="ActorUserId">The signed-in user who acted, or null for an action recorded before sign-in existed.</param>
/// <param name="ActorDisplayName">Their name as it read at the time. A snapshot: never refreshed.</param>
public sealed record WorkflowEventDto(
    long Id,
    OrderWorkflowAction Action,
    OrderRequestStatus FromStatus,
    OrderRequestStatus ToStatus,
    Guid? ActorUserId,
    string ActorDisplayName,
    string? Comment,
    int MissingPriceItemCount,
    bool MissingPricesAcknowledged,
    DateTime OccurredAtUtc);

/// <summary>
/// Where one request stands, what may be done to it, and everything that has been done to it.
/// </summary>
/// <param name="MissingPriceItemCount">
/// Counted from the stored items every time this is read; a caller never supplies it and is never believed
/// about it.
/// </param>
/// <param name="RequiresMissingPriceAcknowledgement">
/// True when approving would cover lines whose price nobody knows. It does not block approval — it means the
/// approver has to say they know.
/// </param>
/// <param name="History">Oldest first, so it reads as the story of the request.</param>
/// <param name="SubmittedByUserId">
/// Who put the request into its current approval cycle. Null for one nobody has submitted — including every
/// request imported before sign-in existed.
/// </param>
public sealed record OrderWorkflowDto(
    long OrderRequestId,
    int LocationId,
    string LocationName,
    DateOnly RequestPeriod,
    int Version,
    OrderRequestStatus Status,
    AllowedWorkflowActionsDto AllowedActions,
    Guid? SubmittedByUserId,
    DateTime? SubmittedAtUtc,
    DateTime? ApprovedAtUtc,
    DateTime? ReturnedAtUtc,
    int ItemCount,
    int MissingPriceItemCount,
    decimal? KnownAmountTotal,
    bool AmountIsComplete,
    bool RequiresMissingPriceAcknowledgement,
    IReadOnlyList<WorkflowEventDto> History);

/// <remarks>
/// No actor. Who is doing this comes from the authenticated session, so a browser cannot claim to be someone
/// else by putting a name in the body.
/// </remarks>
public sealed record SubmitForApprovalCommand(string? Comment = null);

/// <param name="AcknowledgeMissingPrices">
/// Required when the request has lines without a price. The server counts those lines itself; a caller
/// claiming there are none does not make it so.
/// </param>
public sealed record ApproveOrderCommand(
    string? Comment = null,
    bool AcknowledgeMissingPrices = false);

/// <param name="Reason">Why it is being handed back. Required: it is the whole point of the action.</param>
public sealed record ReturnForCorrectionCommand(string Reason);
