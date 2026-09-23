using BaxOrders.Application.Imports;
using BaxOrders.Domain.Catalog;

namespace BaxOrders.Application.Catalog;

/// <summary>
/// Where a product stands on having a canonical category, decided by what the import history actually says.
/// </summary>
/// <remarks>
/// The four are kept apart deliberately. A product nobody has categorised is not a product whose history
/// disagrees with itself, and neither is a product the history says nothing about — and only one of the three
/// can ever be filled in without somebody deciding.
/// </remarks>
public enum ProductCategoryState
{
    /// <summary>The product already carries a canonical category. Changing it is a person's decision.</summary>
    Assigned = 1,

    /// <summary>No category yet, and every usable piece of history points at one and the same one.</summary>
    UniqueEvidence = 2,

    /// <summary>No category yet, and the history points at more than one. Nothing is chosen automatically.</summary>
    Ambiguous = 3,

    /// <summary>No category yet, and no usable history to suggest one.</summary>
    NoEvidence = 4,
}

/// <summary>Which products to list. <see cref="ProductCategoryFilter.All"/> lists every product.</summary>
public enum ProductCategoryFilter
{
    All = 0,
    Assigned = 1,
    UniqueEvidence = 2,
    Ambiguous = 3,
    NoEvidence = 4,
}

/// <summary>
/// One canonical category the import history named for a product, and how often it named it.
/// </summary>
/// <param name="Path">The whole category path, root first — the tree is read, never a single leaf name.</param>
/// <param name="Occurrences">
/// How many imported rows of this product's history resolved to this category. It is a count of evidence, not
/// a vote: a category with more occurrences is not thereby the right one, and nothing picks the largest.
/// </param>
public sealed record ProductCategoryEvidenceDto(
    int CategoryId,
    IReadOnlyList<string> Path,
    int Occurrences);

/// <param name="CurrentCategoryPath">The canonical category the catalog carries now, root first. Empty for none.</param>
/// <param name="Evidence">
/// Every distinct category this product's imported history named, most-seen first. Shown for an already
/// assigned product too: the history is what it is, whether or not the catalog now agrees with it.
/// </param>
public sealed record ProductCategoryRowDto(
    long ProductId,
    string ProductCode,
    string ProductName,
    int? CurrentCategoryId,
    IReadOnlyList<string> CurrentCategoryPath,
    ProductCategoryState State,
    IReadOnlyList<ProductCategoryEvidenceDto> Evidence);

/// <summary>
/// The whole catalog's standing, whatever the search or filter narrowed the rows to — and, for the three
/// counts a safe application cares about, exactly what that application would do if it ran now.
/// </summary>
public sealed record ProductCategorySummaryDto(
    int TotalProductCount,
    int AssignedCount,
    int UniqueEvidenceCount,
    int AmbiguousCount,
    int NoEvidenceCount);

public sealed record ProductCategoryListDto(
    ProductCategorySummaryDto Summary,
    int FilteredCount,
    PagedResult<ProductCategoryRowDto> Rows);

/// <param name="Search">Matches the product name or its code.</param>
public sealed record ProductCategoryQuery(
    string? Search = null,
    ProductCategoryFilter Filter = ProductCategoryFilter.All,
    int Page = 1,
    int PageSize = ProductCategoryQueries.DefaultPageSize);

/// <summary>
/// What a safe application did: the products it filled in, and the ones it deliberately left alone.
/// </summary>
/// <param name="AssignedCount">Products that had no category and whose history named exactly one.</param>
/// <param name="SkippedAmbiguousCount">Left alone because the history disagrees with itself.</param>
/// <param name="SkippedNoEvidenceCount">Left alone because there is nothing to go on.</param>
/// <param name="SkippedAlreadyAssignedCount">Left alone because a category is already recorded.</param>
public sealed record ApplySafeCategoriesResultDto(
    int AssignedCount,
    int SkippedAmbiguousCount,
    int SkippedNoEvidenceCount,
    int SkippedAlreadyAssignedCount);

/// <param name="Reason">Why, in the decider's own words. Optional, and kept on the record when given.</param>
/// <remarks>
/// No actor. Who is deciding comes from the authenticated session, so a browser cannot put somebody else's
/// name on a decision by writing it in the body.
/// </remarks>
public sealed record AssignProductCategoryCommand(int CategoryId, string? Reason = null);

/// <summary>What a product's category is now, and the decision that made it so.</summary>
public sealed record ProductCategoryDecisionDto(
    long Id,
    long ProductId,
    int? PreviousCategoryId,
    int NewCategoryId,
    IReadOnlyList<string> NewCategoryPath,
    ProductCategoryDecisionType DecisionType,
    Guid ActorUserId,
    string ActorDisplayName,
    string? Reason,
    DateTime OccurredAtUtc);
