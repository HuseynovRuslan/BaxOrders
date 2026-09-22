using System.Text.RegularExpressions;

namespace BaxOrders.Domain.Normalization;

/// <summary>
/// Normalizes a product specification ("Ölçü": 50, 120, 40x40, 1x5) for comparison without interpreting it.
/// The original value is stored separately; this output is only used inside variant keys.
/// </summary>
/// <remarks>
/// Specifications are text, not numbers. Only differences that cannot change the meaning are removed:
/// <list type="bullet">
/// <item>Whitespace, letter case and Unicode form, as in <see cref="TextNormalizer"/>. Quotation marks are
/// kept (unified to straight quotes) because <c>12"</c> can mean inches.</item>
/// <item>Multiplication signs between digits: "40 X 40", "40 × 40", "40*40" → "40x40".</item>
/// </list>
/// Numbers are never parsed: "1,5" and "1.5" stay different and "1.000" is not "1".
/// Such equivalences need an explicit, approved business rule.
/// </remarks>
public static partial class SpecificationNormalizer
{
    public static string Normalize(string? value)
    {
        var text = TextNormalizer.Normalize(value, removeQuotes: false);
        return text.Length == 0 ? text : MultiplicationSign().Replace(text, "x");
    }

    // x, multiplication sign, asterisk, Cyrillic "х" (already lower-cased).
    [GeneratedRegex(@"(?<=\d)\s*[x×*х]\s*(?=\d)")]
    private static partial Regex MultiplicationSign();
}
