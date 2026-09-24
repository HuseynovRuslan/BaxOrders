namespace BaxOrders.Domain.Orders;

/// <summary>What was done to a request. One value per legal transition, so an event says what happened.</summary>
public enum OrderWorkflowAction
{
    SubmittedForApproval = 1,
    Approved = 2,
    ReturnedForCorrection = 3,

    /// <summary>
    /// A request that was already approved in real life before this system existed, carried in as approved.
    /// </summary>
    /// <remarks>
    /// Deliberately not <see cref="Approved"/>. Nobody approved these through this application, and an event
    /// that said they did would put a decision in the history that never happened here. It has no actor id,
    /// because there is no person in this system to attribute it to.
    /// </remarks>
    ImportedAsApproved = 4,
}

/// <summary>
/// One workflow action on one request: who did what, when, and from which state to which.
/// </summary>
/// <remarks>
/// Append-only. An event records what was true at the moment it happened and is never edited or deleted
/// afterwards — a later transition adds another event rather than rewriting this one. There is no API to
/// change one, which is the point of keeping it.
/// <para>
/// The actor is recorded twice on purpose. <see cref="ActorUserId"/> is the signed-in user, stable across a
/// rename; <see cref="ActorDisplayName"/> is the name as it read when the action happened, and is never
/// rewritten afterwards — renaming somebody does not change what the history says about what they did.
/// </para>
/// <para>
/// <see cref="ActorUserId"/> is null for the events recorded before authentication existed, and would be null
/// for a system-generated action. That is a fact about the action, not a gap to fill with an invented user.
/// </para>
/// </remarks>
public sealed class OrderRequestWorkflowEvent
{
    public const int ActorDisplayNameMaxLength = 200;
    public const int CommentMaxLength = 2000;

    private OrderRequestWorkflowEvent()
    {
    }

    internal OrderRequestWorkflowEvent(
        OrderRequest orderRequest,
        OrderWorkflowAction action,
        OrderRequestStatus fromStatus,
        OrderRequestStatus toStatus,
        WorkflowActor actor,
        string? comment,
        int missingPriceItemCount,
        bool missingPricesAcknowledged,
        DateTime occurredAtUtc)
    {
        ArgumentNullException.ThrowIfNull(orderRequest);
        ArgumentNullException.ThrowIfNull(actor);

        OrderRequest = orderRequest;
        OrderRequestId = orderRequest.Id;
        Action = action;
        FromStatus = fromStatus;
        ToStatus = toStatus;
        ActorUserId = actor.UserId;
        ActorDisplayName = Guard.RequiredText(actor.DisplayName, ActorDisplayNameMaxLength, nameof(actor));
        Comment = Guard.OptionalText(comment, CommentMaxLength, nameof(comment));
        MissingPriceItemCount = missingPriceItemCount;
        MissingPricesAcknowledged = missingPricesAcknowledged;
        OccurredAtUtc = Guard.Utc(occurredAtUtc, nameof(occurredAtUtc));
    }

    public long Id { get; private set; }

    public long OrderRequestId { get; private set; }

    public OrderRequest OrderRequest { get; private set; } = null!;

    public OrderWorkflowAction Action { get; private set; }

    public OrderRequestStatus FromStatus { get; private set; }

    public OrderRequestStatus ToStatus { get; private set; }

    /// <summary>The signed-in user who acted. Null for an action with no person behind it.</summary>
    public Guid? ActorUserId { get; private set; }

    /// <summary>The actor's name as it read when this happened. A snapshot: never refreshed, never rewritten.</summary>
    public string ActorDisplayName { get; private set; } = null!;

    /// <summary>The reason a request was returned, or the optional note left when submitting or approving.</summary>
    public string? Comment { get; private set; }

    /// <summary>
    /// How many lines had no price when this happened, counted from the stored items at that moment. Kept on
    /// the event because it is why an acknowledgement was needed, and the items may change later.
    /// </summary>
    public int MissingPriceItemCount { get; private set; }

    /// <summary>True when the actor was asked to confirm they knew about unpriced lines, and did.</summary>
    public bool MissingPricesAcknowledged { get; private set; }

    public DateTime OccurredAtUtc { get; private set; }
}
