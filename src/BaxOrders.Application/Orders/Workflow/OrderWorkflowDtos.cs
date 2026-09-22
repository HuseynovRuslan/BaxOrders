using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Orders.Workflow;

/// <summary>
/// What the request's current state allows.
/// </summary>
/// <remarks>
/// These are <b>state</b> permissions and nothing else: they say what the workflow allows from here, not who
/// is allowed to do it. There is no authentication yet, so nobody is being checked. When users and roles
/// arrive they will narrow these further — a caller must keep treating them as the most that is possible,
/// never as proof that this particular person may act.
/// </remarks>
public sealed record AllowedWorkflowActionsDto(bool CanSubmit, bool CanApprove, bool CanReturn)
{
    public static AllowedWorkflowActionsDto For(OrderRequestStatus status) => status switch
    {
        OrderRequestStatus.Draft => new AllowedWorkflowActionsDto(true, false, false),
        OrderRequestStatus.ReturnedForCorrection => new AllowedWorkflowActionsDto(true, false, false),
        OrderRequestStatus.PendingApproval => new AllowedWorkflowActionsDto(false, true, true),
        // Approval is the end of the road; a correction is a new version, not a reopening of this one.
        _ => new AllowedWorkflowActionsDto(false, false, false),
    };
}

/// <param name="ActorDisplayName">A name the caller stated. Temporary: nothing authenticates it yet.</param>
public sealed record WorkflowEventDto(
    long Id,
    OrderWorkflowAction Action,
    OrderRequestStatus FromStatus,
    OrderRequestStatus ToStatus,
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
public sealed record OrderWorkflowDto(
    long OrderRequestId,
    int LocationId,
    string LocationName,
    DateOnly RequestPeriod,
    int Version,
    OrderRequestStatus Status,
    AllowedWorkflowActionsDto AllowedActions,
    DateTime? SubmittedAtUtc,
    DateTime? ApprovedAtUtc,
    DateTime? ReturnedAtUtc,
    int ItemCount,
    int MissingPriceItemCount,
    decimal? KnownAmountTotal,
    bool AmountIsComplete,
    bool RequiresMissingPriceAcknowledgement,
    IReadOnlyList<WorkflowEventDto> History);

/// <param name="ActorDisplayName">
/// Who is doing this. Required, and stored in the audit trail as text. Temporary until authentication exists.
/// </param>
public sealed record SubmitForApprovalCommand(string ActorDisplayName, string? Comment = null);

/// <param name="AcknowledgeMissingPrices">
/// Required when the request has lines without a price. The server counts those lines itself; a caller
/// claiming there are none does not make it so.
/// </param>
public sealed record ApproveOrderCommand(
    string ActorDisplayName,
    string? Comment = null,
    bool AcknowledgeMissingPrices = false);

/// <param name="Reason">Why it is being handed back. Required: it is the whole point of the action.</param>
public sealed record ReturnForCorrectionCommand(string ActorDisplayName, string Reason);
