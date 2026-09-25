using BaxOrders.Application.Imports;
using BaxOrders.Domain.Catalog;

namespace BaxOrders.Application.Catalog.ProductMatches;

/// <summary>
/// One side of a suggested match. For a spelling match it is a variant, with the fields that identify it; for a
/// variant link it is a whole product, and the variant fields are empty.
/// </summary>
/// <param name="LineCount">Order lines in the versions every screen reads.</param>
/// <param name="FirstMonth">The first month it was ordered in, as the first day of that month.</param>
public sealed record ProductMatchSideDto(
    long ProductId,
    string ProductCode,
    string ProductName,
    long? VariantId,
    string? SpecificationValue,
    string? SpecificationUnitCode,
    string? SpecificationDescriptor,
    string? ModelCode,
    string? OrderUnitCode,
    int LineCount,
    int LocationCount,
    DateOnly FirstMonth,
    DateOnly LastMonth);

/// <summary>
/// A pair the rules suggest to an administrator. Nothing about it has been decided, and nothing changes until
/// somebody does.
/// </summary>
/// <param name="Source">
/// For a spelling match, the variant that would count as the target. For a variant link, the variant product.
/// </param>
/// <param name="Target">For a spelling match, the variant whose name would be kept. For a variant link, the base.</param>
/// <param name="Difference">A spelling match only: what the two sides differ by.</param>
/// <param name="ProposedLabel">A variant link only: the variant's short name under its base.</param>
public sealed record ProductMatchSuggestionDto(
    ProductMatchKind Kind,
    ProductMatchSideDto Source,
    ProductMatchSideDto Target,
    SpellingDifference? Difference,
    string? ProposedLabel);

/// <param name="SameItemCount">Every spelling suggestion there is, whatever the search.</param>
/// <param name="VariantCount">Every variant suggestion there is, whatever the search.</param>
/// <param name="FilteredCount">Suggestions of the requested kind that match the search.</param>
public sealed record ProductMatchSuggestionListDto(
    ProductMatchKind Kind,
    int SameItemCount,
    int VariantCount,
    int FilteredCount,
    PagedResult<ProductMatchSuggestionDto> Suggestions);

/// <param name="Search">Matches either side's product name.</param>
public sealed record ProductMatchSuggestionQuery(
    ProductMatchKind Kind = ProductMatchKind.SameItem,
    string? Search = null,
    int Page = 1,
    int PageSize = ProductMatchQueries.DefaultPageSize);

/// <param name="Kind">Null lists both kinds.</param>
/// <param name="Outcome">Null lists both outcomes.</param>
/// <param name="IncludeUndone">False lists only the decisions that still stand.</param>
public sealed record ProductMatchDecisionQuery(
    ProductMatchKind? Kind = null,
    ProductMatchOutcome? Outcome = null,
    bool IncludeUndone = false,
    int Page = 1,
    int PageSize = ProductMatchQueries.DefaultPageSize);

/// <summary>One decision about a pair, as it was made and — if it was — as it was undone.</summary>
/// <param name="SourceVariantDescription">A spelling match only: "15 W · PCS".</param>
/// <param name="IsLive">Not undone: the decision still stands.</param>
public sealed record ProductMatchDecisionDto(
    long Id,
    ProductMatchKind Kind,
    ProductMatchOutcome Outcome,
    long SourceProductId,
    string SourceProductName,
    long TargetProductId,
    string TargetProductName,
    long? SourceVariantId,
    string? SourceVariantDescription,
    long? TargetVariantId,
    string? TargetVariantDescription,
    string? VariantLabel,
    string? Reason,
    Guid DecidedByUserId,
    string DecidedByDisplayName,
    DateTime DecidedAtUtc,
    Guid? UndoneByUserId,
    string? UndoneByDisplayName,
    DateTime? UndoneAtUtc,
    string? UndoReason,
    bool IsLive);

/// <summary>
/// A base product and the products an administrator approved as its variants (13.1). A view of the decisions, not a
/// change to the catalogue: every product here is still a product of its own, with its own lines and history.
/// </summary>
/// <param name="Usage">Where the base was ordered; null when it has no line in the versions every screen reads.</param>
/// <param name="Variants">By label, in the Azerbaijani order.</param>
public sealed record ProductFamilyDto(
    long ProductId,
    string ProductName,
    MatchUsage? Usage,
    IReadOnlyList<ProductFamilyMemberDto> Variants);

/// <summary>One approved variant under its base, and who linked it when.</summary>
/// <param name="DecisionId">The live approval behind the link — what "Geri al" takes back.</param>
/// <param name="VariantLabel">The variant's short name under its base ("lavanda ətirli").</param>
/// <param name="Usage">Where the variant product was ordered; null when it has no line the screens read.</param>
public sealed record ProductFamilyMemberDto(
    long DecisionId,
    long ProductId,
    string ProductName,
    string VariantLabel,
    string DecidedByDisplayName,
    DateTime DecidedAtUtc,
    MatchUsage? Usage);

/// <param name="Search">Matches the base's or any variant's product name.</param>
/// <param name="PageSize">Families per page.</param>
public sealed record ProductFamilyQuery(
    string? Search = null,
    int Page = 1,
    int PageSize = ProductMatchQueries.DefaultPageSize);

/// <summary>Approving a suggested pair.</summary>
/// <param name="SourceId">
/// A spelling match: the variant that will count as the target. A variant link: the variant product.
/// </param>
/// <param name="TargetId">
/// A spelling match: the variant whose name is kept — either side of a suggested pair may be chosen. A variant link:
/// the base product, as suggested.
/// </param>
/// <param name="VariantLabel">A variant link only. Omitted, it is the suggestion's proposed label.</param>
/// <remarks>
/// No actor. Who is deciding comes from the authenticated session, so a browser cannot put somebody else's name on a
/// decision by writing it in the body.
/// </remarks>
public sealed record ApproveProductMatchCommand(
    ProductMatchKind Kind,
    long SourceId,
    long TargetId,
    string? VariantLabel = null,
    string? Reason = null);

/// <summary>Rejecting a suggested pair: the two are not a match, and the pair is not suggested again.</summary>
public sealed record RejectProductMatchCommand(
    ProductMatchKind Kind,
    long SourceId,
    long TargetId,
    string? Reason = null);

public sealed record UndoProductMatchCommand(string? Reason = null);
