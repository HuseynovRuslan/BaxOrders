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
/// <param name="BlockedByOwnContribution">
/// True when the only thing stopping a decision is that this person worked on the correction — changed a
/// line, added or removed one, or created the correction. Reported separately from
/// <paramref name="BlockedBySelfApproval"/> because the two are different reasons and the screen says which.
/// </param>
/// <param name="BlockedByMissingAuthority">
/// True when the state would allow a decision and this person sees the approval queue but does not hold
/// approval authority — an administrator. Reported before the other two reasons: somebody who may not approve
/// anything is told that, not that it happens to be their own submission.
/// </param>
public sealed record AllowedWorkflowActionsDto(
    bool CanSubmit,
    bool CanApprove,
    bool CanReturn,
    bool BlockedBySelfApproval = false,
    bool BlockedByOwnContribution = false,
    bool BlockedByMissingAuthority = false)
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
    /// <param name="superseded">
    /// True when a correction version has been made from this request. It then takes no further workflow
    /// action: the correction is the version that is live.
    /// </param>
    /// <param name="contributedEdits">
    /// True when this person appears in the request's edit history — they corrected it, or created the
    /// correction. They may then not decide on it either.
    /// </param>
    public static AllowedWorkflowActionsDto For(
        OrderRequestStatus status,
        Guid? submittedByUserId,
        ICurrentUserContext currentUser,
        bool superseded = false,
        bool contributedEdits = false)
    {
        ArgumentNullException.ThrowIfNull(currentUser);

        var state = ForState(status);
        if (!currentUser.IsAuthenticated || superseded)
        {
            return new AllowedWorkflowActionsDto(false, false, false);
        }

        var role = currentUser.Role;
        var maySubmit = role is BaxOrdersRoles.Coordinator or BaxOrdersRoles.Admin;
        var mayDecide = ApprovalAuthority.IsHeldBy(role);

        // Approving your own work is not a second pair of eyes, whatever role you hold — whether you authored
        // it by submitting it or by editing what it says.
        var ownSubmission = currentUser.UserId is { } userId && submittedByUserId == userId;
        var wouldDecide = state.CanApprove && mayDecide;
        var canDecide = wouldDecide && !ownSubmission && !contributedEdits;

        return new AllowedWorkflowActionsDto(
            state.CanSubmit && maySubmit,
            canDecide,
            state.CanReturn && mayDecide && !ownSubmission && !contributedEdits,
            BlockedBySelfApproval: wouldDecide && ownSubmission,
            // Only the reason that is actually left: somebody who both submitted and edited reads the first.
            BlockedByOwnContribution: wouldDecide && !ownSubmission && contributedEdits,
            // Not holding the authority at all comes first: the other two only matter to somebody who has it.
            // Said to whoever looks at the approval queue without it; a coordinator was never expected to decide,
            // and is not told why they do not.
            BlockedByMissingAuthority: state.CanApprove && !mayDecide && ApprovalAuthority.MayViewQueue(role));
    }
}

/// <summary>
/// One recorded moment the decision panel shows: who, when and — for a correction request — why.
/// </summary>
/// <param name="ActorDisplayName">The name as it read when it happened. A snapshot from the event, never looked up again.</param>
/// <param name="Reason">What the correction request said. Null for an approval.</param>
public sealed record WorkflowDecisionEventDto(
    OrderWorkflowAction Action,
    string ActorDisplayName,
    DateTime OccurredAtUtc,
    string? Reason);

/// <summary>
/// What an approver needs to know before deciding: who sent it, when, which time it is being sent, what the
/// last correction request said, and — once decided — who decided and when.
/// </summary>
/// <remarks>
/// Every field comes from a recorded workflow event. Where there is no event there is no value: nothing here
/// is ever filled with a placeholder name or date.
/// </remarks>
/// <param name="IsHistoricalImport">
/// Carried in from Excel as already approved, and never sent through this application. Every other field is
/// then empty: who sent it and who approved it were never recorded, and are not invented.
/// </param>
/// <param name="SubmissionNumber">
/// Which time this is being sent, counted along the correction chain up to and including the current cycle.
/// Zero when this request has not been sent.
/// </param>
/// <param name="SubmittedByDisplayName">Who sent the current cycle. Null when this request has not been sent.</param>
/// <param name="PreviousReturn">The most recent correction request before the current cycle, when there is one.</param>
/// <param name="Decision">The approval or the correction request that closed the current cycle, when there is one.</param>
public sealed record WorkflowDecisionFactsDto(
    bool IsHistoricalImport,
    int SubmissionNumber,
    string? SubmittedByDisplayName,
    DateTime? SubmittedAtUtc,
    WorkflowDecisionEventDto? PreviousReturn,
    WorkflowDecisionEventDto? Decision)
{
    public static WorkflowDecisionFactsDto HistoricalImport { get; } = new(true, 0, null, null, null, null);

    /// <summary>
    /// Reads the facts off the recorded events of one request and of the versions it corrects.
    /// </summary>
    /// <param name="status">Where the request stands now.</param>
    /// <param name="ownHistory">This request's own events, oldest first.</param>
    /// <param name="earlierVersionsHistory">
    /// The events of every request this one corrects, followed back through the revision links to the first,
    /// oldest first. Empty for a request that corrects nothing — including a new version made by a second
    /// import, which starts its own count.
    /// </param>
    public static WorkflowDecisionFactsDto Compute(
        OrderRequestStatus status,
        IReadOnlyList<WorkflowEventDto> ownHistory,
        IReadOnlyList<WorkflowEventDto> earlierVersionsHistory)
    {
        ArgumentNullException.ThrowIfNull(ownHistory);
        ArgumentNullException.ThrowIfNull(earlierVersionsHistory);

        // The versions of a chain follow one another: a correction is made only after its source was handed
        // back, and the source takes no action after that. So the chain reads in order as earlier, then own.
        List<WorkflowEventDto> chain = [.. earlierVersionsHistory, .. ownHistory];

        if (HistoricalImportRule.Holds(
            ownHistory.Select(entry => entry.Action), earlierVersionsHistory.Select(entry => entry.Action)))
        {
            return HistoricalImport;
        }

        var currentSubmission = ownHistory.LastOrDefault(entry => entry.Action == OrderWorkflowAction.SubmittedForApproval);

        // For a request not yet sent, everything in the chain happened before it would be; for one that has
        // been, only what came before its current cycle is "previous".
        var beforeCurrentCycle = currentSubmission is null
            ? chain
            : chain.TakeWhile(entry => !ReferenceEquals(entry, currentSubmission)).ToList();

        var previousReturn = beforeCurrentCycle.LastOrDefault(entry => entry.Action == OrderWorkflowAction.ReturnedForCorrection);

        var decisionAction = status switch
        {
            OrderRequestStatus.Approved => OrderWorkflowAction.Approved,
            OrderRequestStatus.ReturnedForCorrection => OrderWorkflowAction.ReturnedForCorrection,
            _ => (OrderWorkflowAction?)null,
        };

        var decision = decisionAction is { } action
            ? ownHistory.LastOrDefault(entry => entry.Action == action)
            : null;

        return new WorkflowDecisionFactsDto(
            IsHistoricalImport: false,
            SubmissionNumber: currentSubmission is null
                ? 0
                : beforeCurrentCycle.Count(entry => entry.Action == OrderWorkflowAction.SubmittedForApproval) + 1,
            currentSubmission?.ActorDisplayName,
            currentSubmission?.OccurredAtUtc,
            Describe(previousReturn),
            Describe(decision));
    }

    private static WorkflowDecisionEventDto? Describe(WorkflowEventDto? entry) => entry is null
        ? null
        : new WorkflowDecisionEventDto(
            entry.Action,
            entry.ActorDisplayName,
            entry.OccurredAtUtc,
            entry.Action == OrderWorkflowAction.ReturnedForCorrection ? entry.Comment : null);
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
/// <param name="DecisionFacts">What the decision panel says about who sent it and who decided, from the recorded events only.</param>
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
    int PriceNotRequiredItemCount,
    decimal? KnownAmountTotal,
    bool AmountIsComplete,
    bool RequiresMissingPriceAcknowledgement,
    IReadOnlyList<WorkflowEventDto> History,
    WorkflowDecisionFactsDto DecisionFacts);

/// <remarks>
/// No actor. Who is doing this comes from the authenticated session, so a browser cannot claim to be someone
/// else by putting a name in the body.
/// </remarks>
public sealed record SubmitForApprovalCommand(string? Comment = null);

/// <param name="OrderRequestIds">The drafts to hand over. Duplicates are collapsed; the order is kept.</param>
/// <param name="Comment">Said once, and written onto every order's own workflow event.</param>
public sealed record BulkSubmitCommand(IReadOnlyList<long> OrderRequestIds, string? Comment = null);

/// <param name="Problem">Why this one was not submitted, in the words the single action would have used.</param>
public sealed record BulkSubmitOutcome(long OrderRequestId, bool Submitted, string? Problem);

/// <summary>What a bulk submission did, order by order — a coordinator has to know which ones still want them.</summary>
public sealed record BulkSubmitResult(int Submitted, int Refused, IReadOnlyList<BulkSubmitOutcome> Outcomes);

/// <param name="AcknowledgeMissingPrices">
/// Required when the request has lines without a price. The server counts those lines itself; a caller
/// claiming there are none does not make it so.
/// </param>
public sealed record ApproveOrderCommand(
    string? Comment = null,
    bool AcknowledgeMissingPrices = false);

/// <param name="Reason">Why it is being handed back. Required: it is the whole point of the action.</param>
public sealed record ReturnForCorrectionCommand(string Reason);
