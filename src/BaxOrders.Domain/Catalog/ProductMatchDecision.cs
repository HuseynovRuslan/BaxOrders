using BaxOrders.Domain.Orders;

namespace BaxOrders.Domain.Catalog;

/// <summary>What kind of match a decision is about.</summary>
public enum ProductMatchKind
{
    /// <summary>
    /// "Yazılış fərqi": two variants that are one comparable item written two ways — a space more or less, or "/"
    /// against "\". Once approved, they count as one item.
    /// </summary>
    SameItem = 1,

    /// <summary>
    /// "Variant fərqi": a product that is a scent, a colour or a size of a base product ("Sabun elano lavanda ətirli"
    /// of "Sabun elano"). Once approved, the two are linked as separate variants of one base — never merged (13.1).
    /// </summary>
    Variant = 2,
}

public enum ProductMatchOutcome
{
    Approved = 1,
    Rejected = 2,
}

/// <summary>
/// One person's decision about one pair of products or variants: that they match, or that they do not.
/// </summary>
/// <remarks>
/// <para>
/// A decision is a record and nothing more. It never renames, deactivates, re-points or merges a product, a
/// variant, an alias or an order line: every order keeps exactly the line it had, and whatever reads matches
/// reads them from here. That is what makes a wrong approval exactly reversible — the row is the whole change.
/// </para>
/// <para>
/// Never deleted and never overwritten. Undoing a decision fills in who undid it, when and why, and the row
/// stays, so the history of what was decided about a pair is always complete. A decision that has not been
/// undone is <i>live</i>.
/// </para>
/// <para>
/// Only a person decides (13.2): nothing here can be created without a signed-in actor, and nothing in the
/// application creates one on its own.
/// </para>
/// </remarks>
public sealed class ProductMatchDecision
{
    public const int ActorDisplayNameMaxLength = OrderRequestWorkflowEvent.ActorDisplayNameMaxLength;
    public const int VariantLabelMaxLength = 100;
    public const int ReasonMaxLength = 500;

    private ProductMatchDecision()
    {
    }

    private ProductMatchDecision(
        ProductMatchKind kind,
        ProductMatchOutcome outcome,
        long? sourceVariantId,
        long? targetVariantId,
        long sourceProductId,
        long targetProductId,
        string? variantLabel,
        WorkflowActor actor,
        string? reason,
        DateTime decidedAtUtc)
    {
        ArgumentNullException.ThrowIfNull(actor);

        Kind = Guard.DefinedEnum(kind, nameof(kind));
        Outcome = Guard.DefinedEnum(outcome, nameof(outcome));
        SourceVariantId = sourceVariantId;
        TargetVariantId = targetVariantId;
        SourceProductId = sourceProductId;
        TargetProductId = targetProductId;
        VariantLabel = variantLabel;

        DecidedByUserId = actor.UserId
            ?? throw new DomainException("A product match is decided by a signed-in person.");
        DecidedByDisplayName = Guard.RequiredText(actor.DisplayName, ActorDisplayNameMaxLength, nameof(actor));
        Reason = Guard.OptionalText(reason, ReasonMaxLength, nameof(reason));
        DecidedAtUtc = Guard.Utc(decidedAtUtc, nameof(decidedAtUtc));
    }

    public long Id { get; private set; }

    public ProductMatchKind Kind { get; private set; }

    public ProductMatchOutcome Outcome { get; private set; }

    /// <summary>
    /// <see cref="ProductMatchKind.SameItem"/> only: the variant whose lines, once approved, count as the target's.
    /// </summary>
    public long? SourceVariantId { get; private set; }

    /// <summary><see cref="ProductMatchKind.SameItem"/> only: the variant whose name is kept.</summary>
    public long? TargetVariantId { get; private set; }

    /// <summary>
    /// Always set. For a spelling match, the source variant's product; for a variant link, the variant product
    /// ("Sabun elano lavanda ətirli").
    /// </summary>
    public long SourceProductId { get; private set; }

    /// <summary>
    /// Always set. For a spelling match, the target variant's product (it may be the source's own); for a variant
    /// link, the base product ("Sabun elano").
    /// </summary>
    public long TargetProductId { get; private set; }

    /// <summary>
    /// An approved variant link only: the variant's short name under its base ("lavanda ətirli").
    /// </summary>
    public string? VariantLabel { get; private set; }

    /// <summary>Why, in the decider's own words.</summary>
    public string? Reason { get; private set; }

    public Guid DecidedByUserId { get; private set; }

    /// <summary>The decider's name as it read when this happened. A snapshot: never refreshed, never rewritten.</summary>
    public string DecidedByDisplayName { get; private set; } = null!;

    public DateTime DecidedAtUtc { get; private set; }

    public Guid? UndoneByUserId { get; private set; }

    /// <summary>The name of whoever undid it, as it read then.</summary>
    public string? UndoneByDisplayName { get; private set; }

    public DateTime? UndoneAtUtc { get; private set; }

    public string? UndoReason { get; private set; }

    /// <summary>Not undone: the decision still stands.</summary>
    public bool IsLive => UndoneAtUtc is null;

    /// <summary>
    /// Records that <paramref name="source"/> is the same item as <paramref name="target"/>, written differently.
    /// The target's name is the one kept.
    /// </summary>
    public static ProductMatchDecision ApproveSameItem(
        ProductVariant source, ProductVariant target, WorkflowActor actor, string? reason, DateTime utcNow) =>
        SameItem(ProductMatchOutcome.Approved, source, target, actor, reason, utcNow);

    /// <summary>Records that <paramref name="source"/> and <paramref name="target"/> are not the same item.</summary>
    public static ProductMatchDecision RejectSameItem(
        ProductVariant source, ProductVariant target, WorkflowActor actor, string? reason, DateTime utcNow) =>
        SameItem(ProductMatchOutcome.Rejected, source, target, actor, reason, utcNow);

    /// <summary>
    /// Records that <paramref name="variant"/> is a variant of <paramref name="baseProduct"/>, shown under it as
    /// <paramref name="label"/>. The two stay two products.
    /// </summary>
    public static ProductMatchDecision ApproveVariant(
        Product variant, Product baseProduct, string label, WorkflowActor actor, string? reason, DateTime utcNow)
    {
        EnsureDifferent(variant, baseProduct);

        // The label is what makes the link readable ("Sabun elano — lavanda ətirli"), so a link without one is refused.
        var trimmed = Guard.RequiredText(label, VariantLabelMaxLength, "Variant label");

        return new ProductMatchDecision(
            ProductMatchKind.Variant, ProductMatchOutcome.Approved, null, null,
            variant.Id, baseProduct.Id, trimmed, actor, reason, utcNow);
    }

    /// <summary>Records that <paramref name="variant"/> is not a variant of <paramref name="baseProduct"/>.</summary>
    public static ProductMatchDecision RejectVariant(
        Product variant, Product baseProduct, WorkflowActor actor, string? reason, DateTime utcNow)
    {
        EnsureDifferent(variant, baseProduct);

        return new ProductMatchDecision(
            ProductMatchKind.Variant, ProductMatchOutcome.Rejected, null, null,
            variant.Id, baseProduct.Id, null, actor, reason, utcNow);
    }

    /// <summary>
    /// Takes the decision back. The row stays, with who undid it and when; the pair is then as undecided as it was
    /// before.
    /// </summary>
    public void Undo(WorkflowActor actor, string? reason, DateTime utcNow)
    {
        ArgumentNullException.ThrowIfNull(actor);

        if (!IsLive)
        {
            throw new DomainException("This decision has already been undone.");
        }

        var userId = actor.UserId
            ?? throw new DomainException("A product match decision is undone by a signed-in person.");
        var displayName = Guard.RequiredText(actor.DisplayName, ActorDisplayNameMaxLength, nameof(actor));
        var undoneAt = Guard.Utc(utcNow, nameof(utcNow));

        UndoReason = Guard.OptionalText(reason, ReasonMaxLength, nameof(reason));
        UndoneByUserId = userId;
        UndoneByDisplayName = displayName;
        UndoneAtUtc = undoneAt;
    }

    private static ProductMatchDecision SameItem(
        ProductMatchOutcome outcome,
        ProductVariant source,
        ProductVariant target,
        WorkflowActor actor,
        string? reason,
        DateTime utcNow)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(target);

        if (ReferenceEquals(source, target) || (source.Id != 0 && source.Id == target.Id))
        {
            throw new DomainException("A variant cannot be matched with itself.");
        }

        // A spelling match adds the two variants' quantities together, and 30 pieces plus 30 packs is not 60 of
        // anything. No order unit at all (a service) is a value of its own and matches only itself.
        if (source.OrderUnitId != target.OrderUnitId)
        {
            throw new DomainException(
                "The two variants are ordered in different units, so they cannot be the same item: quantities of different order units cannot be added together.");
        }

        return new ProductMatchDecision(
            ProductMatchKind.SameItem, outcome, source.Id, target.Id,
            source.ProductId, target.ProductId, null, actor, reason, utcNow);
    }

    private static void EnsureDifferent(Product variant, Product baseProduct)
    {
        ArgumentNullException.ThrowIfNull(variant);
        ArgumentNullException.ThrowIfNull(baseProduct);

        if (ReferenceEquals(variant, baseProduct) || (variant.Id != 0 && variant.Id == baseProduct.Id))
        {
            throw new DomainException("A product cannot be a variant of itself.");
        }
    }
}
