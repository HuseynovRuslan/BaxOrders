using BaxOrders.Domain.Normalization;

namespace BaxOrders.Application.Catalog.ProductMatches;

/// <summary>One pair of product names the business has said are different products.</summary>
/// <param name="Rule">The rule in <c>docs/business-decisions.md</c>, "Explicit «Do Not Merge» Rules".</param>
public sealed record DoNotMergePair(string Rule, string First, string Second);

/// <summary>
/// The pairs that are never suggested as a match of either kind, whatever the rules would otherwise find.
/// </summary>
/// <remarks>
/// <para>
/// <c>docs/business-decisions.md</c> says of its "Do Not Merge" list: "A future suggestion engine must not propose
/// them." Every rule there whose two product names are written out is encoded here, compared through
/// <see cref="TextNormalizer"/> and in either order. The others cannot be written as a pair of names:
/// </para>
/// <list type="bullet">
/// <item>NM-01 (Gardena 12300 / 12304 / 14730) — the products differ by model code, and a spelling match needs
/// the model codes to be equal up to spaces and slashes.</item>
/// <item>NM-03 (Rain Bird başlıq / sprink) and NM-04 (Fəhlə əlcəyi / the MM Elektrik glove) — the full names are not
/// written out: NM-03 gives two words and two prices, NM-04 does not name the second glove. A spelling match never
/// pairs them, since they differ by more than spaces and slashes. The variant rule can, when one name is the other
/// plus more words; such a suggestion is only ever a suggestion, and an administrator rejects it. Encoding them needs
/// the business to name the two products.</item>
/// <item>NM-07 (Viking 5097) — forbids matching on a model code alone. Neither rule does: a spelling match needs
/// the names to agree as well, and a variant link reads names only.</item>
/// <item>NM-13, NM-14, NM-15, NM-17 — people, suppliers and locations, not products.</item>
/// </list>
/// </remarks>
public static class DoNotMergePairs
{
    public static IReadOnlyList<DoNotMergePair> All { get; } =
    [
        new("NM-02", "Metlaq Boz", "Metlaq boz rəng"),
        new("NM-05", "Şampun qab üçün", "D3"),
        new("NM-06", "Leska 3mm", "Leska 2,4mm"),
        new("NM-08", "Kist 2", "Kist 3"),
        new("NM-09", "1 gözlü troynik", "3 gözlü troynik"),
        new("NM-10", "Əl arabası", "Əl arabası qaynaqlı"),
        new("NM-11", "Mop eko", "Mop əskisi"),
        new("NM-12", "Laqonda nasadkası şkurka üçün", "Laqonda nasadkası üçün şkurka"),
        new("NM-16", "FAB", "Şampun əl üçün D2"),
    ];

    private static readonly HashSet<(string, string)> Normalized =
    [
        .. All.SelectMany(pair => new[]
        {
            (TextNormalizer.Normalize(pair.First), TextNormalizer.Normalize(pair.Second)),
            (TextNormalizer.Normalize(pair.Second), TextNormalizer.Normalize(pair.First)),
        }),
    ];

    /// <summary>Whether the business has said these two product names are different products.</summary>
    public static bool Forbids(string firstName, string secondName) =>
        Normalized.Contains((TextNormalizer.Normalize(firstName), TextNormalizer.Normalize(secondName)));
}
