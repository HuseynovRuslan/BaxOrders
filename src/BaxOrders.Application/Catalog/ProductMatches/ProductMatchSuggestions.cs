using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Normalization;

namespace BaxOrders.Application.Catalog.ProductMatches;

/// <summary>
/// One product variant as the suggestion rules read it: its product's name, the fields of its identity, and how many
/// order lines it has in the versions every screen reads.
/// </summary>
/// <param name="LineCount">Lines in the highest version of some location and month. Zero means it takes no part.</param>
public sealed record MatchVariant(
    long VariantId,
    long ProductId,
    string ProductName,
    string? SpecificationValue,
    string? SpecificationUnitCode,
    string? SpecificationDescriptor,
    string? ModelCode,
    string? OrderUnitCode,
    int LineCount);

/// <summary>A decision that has not been undone, as the rules need it.</summary>
public sealed record LiveMatchDecision(
    ProductMatchKind Kind,
    ProductMatchOutcome Outcome,
    long? SourceVariantId,
    long? TargetVariantId,
    long SourceProductId,
    long TargetProductId);

/// <summary>What a spelling match's two sides differ by. Nothing else can differ.</summary>
public enum SpellingDifference
{
    Whitespace = 1,
    Slash = 2,
    WhitespaceAndSlash = 3,
}

/// <summary>"Yazılış fərqi": <paramref name="SourceVariantId"/> would count as <paramref name="TargetVariantId"/>.</summary>
public sealed record SameItemSuggestion(long SourceVariantId, long TargetVariantId, SpellingDifference Difference);

/// <summary>"Variant fərqi": <paramref name="VariantProductId"/> would be a variant of <paramref name="BaseProductId"/>.</summary>
public sealed record VariantSuggestion(long VariantProductId, long BaseProductId, string ProposedLabel);

public sealed record ProductMatchSuggestionSet(
    IReadOnlyList<SameItemSuggestion> SameItem,
    IReadOnlyList<VariantSuggestion> Variant)
{
    /// <summary>
    /// The suggested spelling pair of these two variants, whichever way round it was suggested: an administrator may
    /// keep either name.
    /// </summary>
    public SameItemSuggestion? SameItemPair(long firstVariantId, long secondVariantId) =>
        SameItem.FirstOrDefault(suggestion =>
            (suggestion.SourceVariantId == firstVariantId && suggestion.TargetVariantId == secondVariantId)
            || (suggestion.SourceVariantId == secondVariantId && suggestion.TargetVariantId == firstVariantId));

    /// <summary>The suggested variant link, only in the direction it was suggested.</summary>
    public VariantSuggestion? VariantLink(long variantProductId, long baseProductId) =>
        Variant.FirstOrDefault(suggestion =>
            suggestion.VariantProductId == variantProductId && suggestion.BaseProductId == baseProductId);
}

/// <summary>
/// Which products and variants look like a match to a person — the deterministic rule of Task 13, and nothing more.
/// </summary>
/// <remarks>
/// <para>
/// A pure function of the catalogue facts it is handed: no database, no clock, and nothing written. Computing
/// suggestions never approves, merges, renames or aliases anything; only an administrator's decision does, one pair
/// at a time (13.2). There is no similarity score, no edit distance, no word-order or token matching and no colour
/// or size parsing (TR-04, 13.1).
/// </para>
/// <para>
/// <b>Yazılış fərqi</b> — two variants whose product name, specification and model code agree once
/// <see cref="SpellingKey"/> has removed spaces and read "\" as "/", and whose specification unit, descriptor and
/// order unit are the same. Each group of such variants is suggested towards one target: the variant a live approval
/// already folds others into, or else the one with the most lines, then the lowest id.
/// </para>
/// <para>
/// <b>Variant fərqi</b> — a product whose normalized name begins with another product's whole name, followed by a
/// word boundary and more letters or digits ("Sabun elano lavanda ətirli" after "Sabun elano"). The shortest such
/// base that is still open to a decision is proposed, with the rest of the name as the variant's label.
/// </para>
/// <para>
/// Only variants that have order lines take part, and a pair already decided — approved or rejected, and for a
/// spelling pair either way round — is not suggested again until that decision is undone. The business's
/// do-not-merge pairs (<see cref="DoNotMergePairs"/>) are never suggested.
/// </para>
/// </remarks>
public static class ProductMatchSuggestions
{
    /// <summary>
    /// What may follow a base name for the rest to be a variant of it. The same punctuation
    /// <see cref="TextNormalizer"/> keeps tight, plus a space.
    /// </summary>
    private const string WordBoundaries = " /\\-.,;:()[]+&";

    /// <summary>Unit separator: cannot occur in normalized text, so joined keys cannot collide.</summary>
    private const char Separator = '\u001f';

    public static ProductMatchSuggestionSet Compute(
        IReadOnlyCollection<MatchVariant> variants, IReadOnlyCollection<LiveMatchDecision> liveDecisions)
    {
        ArgumentNullException.ThrowIfNull(variants);
        ArgumentNullException.ThrowIfNull(liveDecisions);

        var participating = variants.Where(variant => variant.LineCount > 0).ToList();

        return new ProductMatchSuggestionSet(
            SameItem(participating, [.. liveDecisions.Where(decision => decision.Kind == ProductMatchKind.SameItem)]),
            Variant(participating, [.. liveDecisions.Where(decision => decision.Kind == ProductMatchKind.Variant)]));
    }

    /// <summary>
    /// Whether <paramref name="prefix"/> is <paramref name="text"/>'s whole first word or words: a word boundary
    /// follows it, and after the boundary there is at least one letter or digit. Both are normalized names.
    /// </summary>
    public static bool IsWholeWordPrefix(string prefix, string text)
    {
        ArgumentNullException.ThrowIfNull(prefix);
        ArgumentNullException.ThrowIfNull(text);

        if (prefix.Length == 0 || text.Length <= prefix.Length || !text.StartsWith(prefix, StringComparison.Ordinal))
        {
            return false;
        }

        if (!WordBoundaries.Contains(text[prefix.Length]))
        {
            return false;
        }

        for (var index = prefix.Length + 1; index < text.Length; index++)
        {
            if (char.IsLetterOrDigit(text[index]))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// The variant's short name under its base: <paramref name="variantName"/> as it is displayed, without the leading
    /// part that normalizes to <paramref name="baseNormalizedName"/>, and without the spaces and separating punctuation
    /// after it. "Sabun elano, lavanda ətirli" under "sabun elano" is "lavanda ətirli". An opening bracket is kept, so
    /// "(lavanda)" stays readable. Empty when the name does not begin with the base.
    /// </summary>
    public static string LabelOf(string variantName, string baseNormalizedName)
    {
        ArgumentNullException.ThrowIfNull(variantName);
        ArgumentNullException.ThrowIfNull(baseNormalizedName);

        var name = variantName.Trim();
        for (var length = 1; length <= name.Length; length++)
        {
            if (TextNormalizer.Normalize(name[..length]) != baseNormalizedName)
            {
                continue;
            }

            var rest = name[length..].TrimStart(LeadingNoise).Trim();
            return rest.Length <= ProductMatchDecision.VariantLabelMaxLength
                ? rest
                : rest[..ProductMatchDecision.VariantLabelMaxLength].TrimEnd();
        }

        return string.Empty;
    }

    /// <summary>What is trimmed from the front of a label: spaces, quotes and separators, but not an opening bracket.</summary>
    private static readonly char[] LeadingNoise =
        [' ', '\t', '/', '\\', '-', '.', ',', ';', ':', ')', ']', '+', '&', '"', '\'', '«', '»', '“', '”', '–', '—'];

    // ---- Yazılış fərqi ---------------------------------------------------------------------------------------

    private static List<SameItemSuggestion> SameItem(
        IReadOnlyList<MatchVariant> variants, IReadOnlyList<LiveMatchDecision> live)
    {
        var approved = live.Where(decision => decision.Outcome == ProductMatchOutcome.Approved).ToList();
        var foldedSources = approved.Select(decision => decision.SourceVariantId!.Value).ToHashSet();
        var foldTargets = approved.Select(decision => decision.TargetVariantId!.Value).ToHashSet();

        // Either way round: a rejected a → b also answers b → a.
        var decidedPairs = live
            .Select(decision => Unordered(decision.SourceVariantId!.Value, decision.TargetVariantId!.Value))
            .ToHashSet();

        var suggestions = new List<SameItemSuggestion>();

        foreach (var group in variants.GroupBy(LooseIdentity, StringComparer.Ordinal))
        {
            var members = group.OrderByDescending(variant => variant.LineCount).ThenBy(variant => variant.VariantId).ToList();
            if (members.Count < 2)
            {
                continue;
            }

            // The variant others are already folded into, if there is one; otherwise the most ordered, then the oldest.
            // A variant that is itself folded into another can never be a target: that would be a chain.
            var open = members.Where(variant => !foldedSources.Contains(variant.VariantId)).ToList();
            var target = open.FirstOrDefault(variant => foldTargets.Contains(variant.VariantId)) ?? open.FirstOrDefault();
            if (target is null)
            {
                continue;
            }

            foreach (var member in open)
            {
                if (member.VariantId == target.VariantId
                    || foldTargets.Contains(member.VariantId)
                    || decidedPairs.Contains(Unordered(member.VariantId, target.VariantId))
                    || DoNotMergePairs.Forbids(member.ProductName, target.ProductName))
                {
                    continue;
                }

                if (DifferenceOf(member, target) is { } difference)
                {
                    suggestions.Add(new SameItemSuggestion(member.VariantId, target.VariantId, difference));
                }
            }
        }

        return suggestions;
    }

    /// <summary>
    /// Everything a spelling match compares, loosened by <see cref="SpellingKey"/>. Units and descriptors are compared
    /// exactly: they are codes, not spellings.
    /// </summary>
    private static string LooseIdentity(MatchVariant variant) => string.Join(
        Separator,
        SpellingKey.Of(variant.ProductName),
        SpellingKey.OfSpecification(variant.SpecificationValue),
        variant.SpecificationUnitCode ?? string.Empty,
        variant.SpecificationDescriptor ?? string.Empty,
        SpellingKey.OfModelCode(variant.ModelCode),
        variant.OrderUnitCode ?? string.Empty);

    /// <summary>
    /// What two variants with the same loose identity differ by. Null when they differ by nothing at all once
    /// normalized: two names that normalization already makes one are not a spelling difference (DB-03).
    /// </summary>
    private static SpellingDifference? DifferenceOf(MatchVariant first, MatchVariant second)
    {
        var a = NormalizedText(first);
        var b = NormalizedText(second);

        // The keys are equal, so whatever survives unifying the slashes is spacing, and whatever survives removing the
        // spaces is a slash.
        var spaces = !string.Equals(a.Replace('\\', '/'), b.Replace('\\', '/'), StringComparison.Ordinal);
        var slashes = !string.Equals(
            a.Replace(" ", string.Empty, StringComparison.Ordinal),
            b.Replace(" ", string.Empty, StringComparison.Ordinal),
            StringComparison.Ordinal);

        return (spaces, slashes) switch
        {
            (true, true) => SpellingDifference.WhitespaceAndSlash,
            (true, false) => SpellingDifference.Whitespace,
            (false, true) => SpellingDifference.Slash,
            _ => null,
        };
    }

    private static string NormalizedText(MatchVariant variant) => string.Join(
        Separator,
        TextNormalizer.Normalize(variant.ProductName),
        SpecificationNormalizer.Normalize(variant.SpecificationValue),
        ModelCodeNormalizer.Normalize(variant.ModelCode));

    private static (long, long) Unordered(long first, long second) =>
        first < second ? (first, second) : (second, first);

    // ---- Variant fərqi ---------------------------------------------------------------------------------------

    private sealed record ProductName(long ProductId, string Name, string Normalized);

    private static List<VariantSuggestion> Variant(
        IReadOnlyList<MatchVariant> variants, IReadOnlyList<LiveMatchDecision> live)
    {
        var products = variants
            .GroupBy(variant => variant.ProductId)
            .Select(group => new ProductName(group.Key, group.First().ProductName, TextNormalizer.Normalize(group.First().ProductName)))
            .Where(product => product.Normalized.Length > 0)
            .OrderBy(product => product.Normalized.Length)
            .ThenBy(product => product.ProductId)
            .ToList();

        var approved = live.Where(decision => decision.Outcome == ProductMatchOutcome.Approved).ToList();
        var linkedVariants = approved.Select(decision => decision.SourceProductId).ToHashSet();
        var linkedBases = approved.Select(decision => decision.TargetProductId).ToHashSet();

        // The direction matters here: "a is a variant of b" and "b is a variant of a" are different claims.
        var decidedPairs = live.Select(decision => (decision.SourceProductId, decision.TargetProductId)).ToHashSet();

        var suggestions = new List<VariantSuggestion>();

        foreach (var variant in products)
        {
            // Already a variant of something, or already a base of others: one level only, never a chain.
            if (linkedVariants.Contains(variant.ProductId) || linkedBases.Contains(variant.ProductId))
            {
                continue;
            }

            // The shortest base still open to a decision. Rejecting a base therefore brings up the next one, and
            // a base that is itself somebody's variant is never offered.
            var candidate = products.FirstOrDefault(product =>
                product.ProductId != variant.ProductId
                && !linkedVariants.Contains(product.ProductId)
                && !decidedPairs.Contains((variant.ProductId, product.ProductId))
                && IsWholeWordPrefix(product.Normalized, variant.Normalized)
                && !DoNotMergePairs.Forbids(variant.Name, product.Name));

            if (candidate is null)
            {
                continue;
            }

            var label = LabelOf(variant.Name, candidate.Normalized);
            if (label.Length > 0)
            {
                suggestions.Add(new VariantSuggestion(variant.ProductId, candidate.ProductId, label));
            }
        }

        return suggestions;
    }
}
