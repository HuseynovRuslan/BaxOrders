namespace BaxOrders.Domain.Orders;

/// <summary>
/// One decision about how a line was supplied: what it said before, what it says now, who decided and when.
/// </summary>
/// <remarks>
/// Append-only, and shaped like the catalogue's other decision records rather than like an edit. That
/// distinction matters: correcting a line's quantity changes what was ordered and only happens on a draft
/// correction, while this changes what the records <i>say about</i> a line that may be years old and approved.
/// It writes nothing about the order itself — no price, no quantity, no status.
/// <para>
/// It is worth keeping because of what it does. Marking a line as internally supplied removes it from every
/// missing-price warning and from the approval acknowledgement, so somebody must be answerable for it.
/// </para>
/// </remarks>
public sealed class OrderItemPricingDecision
{
    public const int ActorDisplayNameMaxLength = OrderRequestWorkflowEvent.ActorDisplayNameMaxLength;
    public const int ReasonMaxLength = 500;

    private OrderItemPricingDecision()
    {
    }

    internal OrderItemPricingDecision(
        OrderRequestItem item,
        PricingMode previousMode,
        PricingMode newMode,
        WorkflowActor actor,
        string? reason,
        DateTime occurredAtUtc)
    {
        ArgumentNullException.ThrowIfNull(item);
        ArgumentNullException.ThrowIfNull(actor);

        OrderRequestItem = item;
        OrderRequestItemId = item.Id;
        PreviousMode = previousMode;
        NewMode = newMode;

        ActorUserId = actor.UserId
            ?? throw new DomainException("A pricing decision is made by a signed-in person.");
        ActorDisplayName = Guard.RequiredText(actor.DisplayName, ActorDisplayNameMaxLength, nameof(actor));
        Reason = Guard.OptionalText(reason, ReasonMaxLength, nameof(reason));
        OccurredAtUtc = Guard.Utc(occurredAtUtc, nameof(occurredAtUtc));
    }

    public long Id { get; private set; }

    public long OrderRequestItemId { get; private set; }

    public OrderRequestItem OrderRequestItem { get; private set; } = null!;

    public PricingMode PreviousMode { get; private set; }

    public PricingMode NewMode { get; private set; }

    public Guid ActorUserId { get; private set; }

    /// <summary>The actor's name as it read when this happened. A snapshot: never refreshed, never rewritten.</summary>
    public string ActorDisplayName { get; private set; } = null!;

    /// <summary>Why, in the decider's own words.</summary>
    public string? Reason { get; private set; }

    public DateTime OccurredAtUtc { get; private set; }
}
