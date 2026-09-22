namespace BaxOrders.Domain.Normalization;

/// <summary>
/// Normalizes a word that stands in the workbook's "Vahid" column but is not a unit of measure — it describes
/// what the number next to it counts: <c>28 diş</c>, <c>2 qat</c>, <c>20 lik</c>.
/// </summary>
/// <remarks>
/// The only family rule is the Azerbaijani suffix <c>-lik / -lıq / -lük / -luq</c>: these are the four
/// vowel-harmony forms of one suffix, proven by the same product appearing with different forms
/// ("Şkurka lük 100" and "Şkurka lik 120"), so they normalize to a single descriptor. Every other word
/// normalizes to itself. There is no other folding, no stemming and no fuzzy matching: an unknown word stays
/// exactly what it is, and the workbook value itself is never changed.
/// </remarks>
public static class SpecificationDescriptorNormalizer
{
    public const int MaxLength = 50;

    /// <summary>The single form the -lik family normalizes to.</summary>
    public const string SuffixFamily = "lik";

    // Written -lik / -lıq / -lük / -luq. TextNormalizer folds the dotless ı to i, so "lıq" arrives here as "liq".
    private static readonly HashSet<string> SuffixForms = new(StringComparer.Ordinal)
    {
        "lik", "liq", "lük", "luq",
    };

    /// <returns>The canonical descriptor, or null when there is no descriptor.</returns>
    public static string? Normalize(string? value)
    {
        var normalized = TextNormalizer.Normalize(value);
        if (normalized.Length == 0)
        {
            return null;
        }

        if (SuffixForms.Contains(normalized))
        {
            return SuffixFamily;
        }

        return normalized.Length <= MaxLength
            ? normalized
            : throw new DomainException($"A specification descriptor must not exceed {MaxLength} characters.");
    }
}
