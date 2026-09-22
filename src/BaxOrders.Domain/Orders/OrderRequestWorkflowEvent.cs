namespace BaxOrders.Domain.Orders;

/// <summary>What was done to a request. One value per legal transition, so an event says what happened.</summary>
public enum OrderWorkflowAction
{
    SubmittedForApproval = 1,
    Approved = 2,
    ReturnedForCorrection = 3,
}

/// <summary>
/// One workflow action on one request: who did what, when, and from which state to which.
/// </summary>
/// <remarks>
/// Append-only. An event records what was true at the moment it happened and is never edited or deleted
/// afterwards — a later transition adds another event rather than rewriting this one. There is no API to
/// change one, which is the point of keeping it.
/// <para>
/// <b>The actor is temporary.</b> Until authentication exists there is no user to attribute an action to, so
/// the caller states a name and it is stored as text. It is a label, not an identity: nothing verifies it.
/// When authentication arrives it will be replaced by the id of the user who acted, and this text becomes the
/// historical record of what was claimed before then.
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
        string actorDisplayName,
        string? comment,
        int missingPriceItemCount,
        bool missingPricesAcknowledged,
        DateTime occurredAtUtc)
    {
        ArgumentNullException.ThrowIfNull(orderRequest);

        OrderRequest = orderRequest;
        OrderRequestId = orderRequest.Id;
        Action = action;
        FromStatus = fromStatus;
        ToStatus = toStatus;
        ActorDisplayName = Guard.RequiredText(actorDisplayName, ActorDisplayNameMaxLength, nameof(actorDisplayName));
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

    /// <summary>A name the caller stated. Temporary: nothing authenticates it until Task 8B.</summary>
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
