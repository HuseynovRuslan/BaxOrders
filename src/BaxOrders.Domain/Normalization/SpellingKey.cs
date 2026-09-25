namespace BaxOrders.Domain.Normalization;

/// <summary>
/// The comparison value behind a spelling-match suggestion ("Yazılış fərqi", Task 13): two texts are written
/// differently only by spaces, or by "/" against "\", exactly when their keys are equal.
/// </summary>
/// <remarks>
/// It is the existing normalization and two steps more — "\" is read as "/", and every space is removed — so
/// "Lampa 15 W" and "Lampa 15W" share a key, and "Kaplin 3/4" and "Kaplin 3\4" share one. Nothing else is
/// folded: no digit, letter, word order, suffix or number. "1,5" and "1.5" stay different, "Kist 2" and "Kist 3"
/// stay different, and two names in a different word order stay different.
/// <para>
/// A key is only ever a reason to <i>suggest</i> a match to a person. It never matches anything by itself.
/// </para>
/// </remarks>
public static class SpellingKey
{
    /// <summary>A product name: <see cref="TextNormalizer"/>, then "\" as "/" and no spaces.</summary>
    public static string Of(string? text) => Loosen(TextNormalizer.Normalize(text));

    /// <summary>A specification ("Ölçü"): <see cref="SpecificationNormalizer"/>, then "\" as "/" and no spaces.</summary>
    public static string OfSpecification(string? value) => Loosen(SpecificationNormalizer.Normalize(value));

    /// <summary>A model code: <see cref="ModelCodeNormalizer"/>, which already removes spaces, then "\" as "/".</summary>
    public static string OfModelCode(string? value) => ModelCodeNormalizer.Normalize(value).Replace('\\', '/');

    private static string Loosen(string normalized) =>
        normalized.Replace('\\', '/').Replace(" ", string.Empty, StringComparison.Ordinal);
}
