using BaxOrders.Domain.Orders;

namespace BaxOrders.Domain.Catalog;

/// <summary>How a product came by its canonical category.</summary>
public enum ProductCategoryDecisionType
{
    /// <summary>
    /// Applied in bulk because every usable piece of import history pointed at one and the same category.
    /// Nothing was chosen: there was only ever one candidate.
    /// </summary>
    AutoUniqueEvidence = 1,

    /// <summary>Somebody chose it. The only way a product with conflicting history gets a category.</summary>
    Manual = 2,
}

/// <summary>
/// One decision about a product's canonical category: what it was, what it became, who decided and when.
/// </summary>
/// <remarks>
/// Append-only, and deliberately separate from the import history. The import rows say what the workbook
/// contained — evidence, never overwritten. This says what the catalog decided, which is a different claim and
/// can be made, changed and re-made long after the import that suggested it.
/// <para>
/// A decision is always somebody's: the bulk application records whoever pressed it, not "the system". The
/// name is a snapshot taken at the time, like the workflow and edit histories, and is never refreshed.
/// </para>
/// </remarks>
public sealed class ProductCategoryDecision
{
    public const int ActorDisplayNameMaxLength = OrderRequestWorkflowEvent.ActorDisplayNameMaxLength;
    public const int ReasonMaxLength = 500;

    private ProductCategoryDecision()
    {
    }

    private ProductCategoryDecision(
        Product product,
        int? previousCategoryId,
        Category newCategory,
        ProductCategoryDecisionType decisionType,
        WorkflowActor actor,
        string? reason,
        DateTime occurredAtUtc)
    {
        ArgumentNullException.ThrowIfNull(product);
        ArgumentNullException.ThrowIfNull(newCategory);
        ArgumentNullException.ThrowIfNull(actor);

        Product = product;
        ProductId = product.Id;
        PreviousCategoryId = previousCategoryId;
        NewCategory = newCategory;
        NewCategoryId = newCategory.Id;
        DecisionType = decisionType;

        // Changing what the catalog says is a person's decision, including when it is applied in bulk.
        ActorUserId = actor.UserId ?? throw new DomainException("A category decision is made by a signed-in person.");
        ActorDisplayName = Guard.RequiredText(actor.DisplayName, ActorDisplayNameMaxLength, nameof(actor));
        Reason = Guard.OptionalText(reason, ReasonMaxLength, nameof(reason));
        OccurredAtUtc = Guard.Utc(occurredAtUtc, nameof(occurredAtUtc));
    }

    public long Id { get; private set; }

    public long ProductId { get; private set; }

    public Product Product { get; private set; } = null!;

    /// <summary>The category the product carried before. Null for a product that had none.</summary>
    public int? PreviousCategoryId { get; private set; }

    public int NewCategoryId { get; private set; }

    public Category NewCategory { get; private set; } = null!;

    public ProductCategoryDecisionType DecisionType { get; private set; }

    public Guid ActorUserId { get; private set; }

    /// <summary>The actor's name as it read when this happened. A snapshot: never refreshed, never rewritten.</summary>
    public string ActorDisplayName { get; private set; } = null!;

    /// <summary>Why, in the decider's own words. Only ever offered on a manual decision.</summary>
    public string? Reason { get; private set; }

    public DateTime OccurredAtUtc { get; private set; }

    /// <summary>
    /// Records the bulk application of the one category a product's whole history agreed on, and sets it.
    /// </summary>
    public static ProductCategoryDecision AutoAssign(
        Product product, Category category, WorkflowActor actor, DateTime utcNow)
    {
        ArgumentNullException.ThrowIfNull(product);

        // The safe path only ever fills a blank. Anything already decided is somebody's decision to change.
        if (product.CategoryId is not null)
        {
            throw new DomainException(
                $"Product '{product.Code}' already has a category; a safe application never overwrites one.");
        }

        var decision = new ProductCategoryDecision(
            product, null, category, ProductCategoryDecisionType.AutoUniqueEvidence, actor, null, utcNow);
        product.ChangeCategory(category);
        return decision;
    }

    /// <summary>Records somebody choosing a product's category, and sets it.</summary>
    public static ProductCategoryDecision Assign(
        Product product, Category category, WorkflowActor actor, string? reason, DateTime utcNow)
    {
        ArgumentNullException.ThrowIfNull(product);
        ArgumentNullException.ThrowIfNull(category);

        if (product.CategoryId == category.Id)
        {
            throw new DomainException(
                $"Product '{product.Code}' is already in category '{category.Name}'.");
        }

        var previous = product.CategoryId;
        var decision = new ProductCategoryDecision(
            product, previous, category, ProductCategoryDecisionType.Manual, actor, reason, utcNow);
        product.ChangeCategory(category);
        return decision;
    }
}
