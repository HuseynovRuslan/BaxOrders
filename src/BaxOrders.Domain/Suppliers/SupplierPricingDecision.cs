using BaxOrders.Domain.Orders;

namespace BaxOrders.Domain.Suppliers;

/// <summary>
/// One decision about whether a supplier's lines need a purchase price: what it was, what it became, who
/// decided and when.
/// </summary>
/// <remarks>
/// Append-only, and modelled on <c>ProductCategoryDecision</c> for the same reason: this is a claim the
/// catalogue makes, not evidence from an import, and it can be made, changed and re-made long afterwards.
/// <para>
/// It is worth recording because of what it does. Flipping one supplier to
/// <see cref="SupplierPriceRequirement.NotRequired"/> silently removes its lines from every missing-price
/// warning and from the approval acknowledgement in the whole system. Somebody must be answerable for that,
/// so the actor is a signed-in person and their name is snapshotted here, never looked up again.
/// </para>
/// </remarks>
public sealed class SupplierPricingDecision
{
    public const int ActorDisplayNameMaxLength = OrderRequestWorkflowEvent.ActorDisplayNameMaxLength;
    public const int ReasonMaxLength = 500;

    private SupplierPricingDecision()
    {
    }

    private SupplierPricingDecision(
        Supplier supplier,
        SupplierPriceRequirement previousRequirement,
        SupplierPriceRequirement newRequirement,
        WorkflowActor actor,
        string? reason,
        DateTime occurredAtUtc)
    {
        ArgumentNullException.ThrowIfNull(supplier);
        ArgumentNullException.ThrowIfNull(actor);

        Supplier = supplier;
        SupplierId = supplier.Id;
        PreviousRequirement = previousRequirement;
        NewRequirement = newRequirement;

        ActorUserId = actor.UserId
            ?? throw new DomainException("A supplier pricing decision is made by a signed-in person.");
        ActorDisplayName = Guard.RequiredText(actor.DisplayName, ActorDisplayNameMaxLength, nameof(actor));
        Reason = Guard.OptionalText(reason, ReasonMaxLength, nameof(reason));
        OccurredAtUtc = Guard.Utc(occurredAtUtc, nameof(occurredAtUtc));
    }

    public long Id { get; private set; }

    public int SupplierId { get; private set; }

    public Supplier Supplier { get; private set; } = null!;

    public SupplierPriceRequirement PreviousRequirement { get; private set; }

    public SupplierPriceRequirement NewRequirement { get; private set; }

    public Guid ActorUserId { get; private set; }

    /// <summary>The actor's name as it read when this happened. A snapshot: never refreshed, never rewritten.</summary>
    public string ActorDisplayName { get; private set; } = null!;

    /// <summary>Why, in the decider's own words.</summary>
    public string? Reason { get; private set; }

    public DateTime OccurredAtUtc { get; private set; }

    /// <summary>
    /// Records somebody changing what a supplier's lines require, and changes it.
    /// </summary>
    /// <returns>Null when the supplier already says this, so nothing is written for a decision nobody made.</returns>
    public static SupplierPricingDecision? Change(
        Supplier supplier,
        SupplierPriceRequirement requirement,
        WorkflowActor actor,
        string? reason,
        DateTime utcNow)
    {
        ArgumentNullException.ThrowIfNull(supplier);

        var previous = supplier.PriceRequirement;
        if (!supplier.ChangePriceRequirement(requirement))
        {
            return null;
        }

        return new SupplierPricingDecision(supplier, previous, requirement, actor, reason, utcNow);
    }
}
