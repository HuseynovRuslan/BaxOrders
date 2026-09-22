using System.Text;

namespace BaxOrders.Domain.Normalization;

/// <summary>
/// Deterministic normalization of free text (names, aliases) into a comparison value.
/// </summary>
/// <remarks>
/// The result is a matching key, never a display value. No fuzzy matching happens here:
/// two inputs are considered equal only if they normalize to exactly the same string.
/// Rules, in order:
/// <list type="number">
/// <item>Unicode NFKC, so "ə" typed as one code point or composed, non-breaking and full-width
/// spaces, ligatures and full-width digits all compare equal.</item>
/// <item>Zero-width characters and soft hyphens are removed. Quotation marks are removed from names
/// (<c>"Cleanfix" MMC</c> equals <c>Cleanfix MMC</c>); callers that must keep them, such as
/// specifications where <c>12"</c> can mean inches, get typographic quotes unified to straight ones instead.</item>
/// <item>Dash variants become '-'.</item>
/// <item>Lower-casing is culture-independent. Dotted and dotless i (I, İ, i, ı) all fold to 'i',
/// because Excel data is typed on both Azerbaijani and English keyboards and upper-case "I"
/// is ambiguous between them.</item>
/// <item>Whitespace runs collapse to one space, leading/trailing whitespace is removed, and
/// whitespace next to <c>/ \ - . , ; : ( ) [ ] + &amp;</c> is removed ("H. Ə. M" equals "H.Ə.M").</item>
/// </list>
/// Azerbaijani letters are otherwise preserved: "ə" is not folded to "e", "ş" is not folded to "s".
/// </remarks>
public static class TextNormalizer
{
    private const string TightPunctuation = "/\\-.,;:()[]+&";

    public static string Normalize(string? value) => Normalize(value, removeQuotes: true);

    internal static string Normalize(string? value, bool removeQuotes)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var composed = value.Normalize(NormalizationForm.FormKC);
        var builder = new StringBuilder(composed.Length);
        var pendingSpace = false;

        foreach (var character in composed)
        {
            if (IsInvisible(character))
            {
                continue;
            }

            if (char.IsWhiteSpace(character) || char.IsControl(character))
            {
                pendingSpace = true;
                continue;
            }

            var quote = StraightQuote(character);
            if (quote is not null && removeQuotes)
            {
                continue;
            }

            var folded = quote ?? Fold(character);
            if (pendingSpace && builder.Length > 0 && !IsTight(folded) && !IsTight(builder[^1]))
            {
                builder.Append(' ');
            }

            pendingSpace = false;
            builder.Append(folded);
        }

        return builder.ToString();
    }

    private static char Fold(char character) => character switch
    {
        'I' or 'İ' or 'ı' => 'i',
        >= '‐' and <= '―' or '−' => '-',
        _ => char.ToLowerInvariant(character),
    };

    private static bool IsTight(char character) => TightPunctuation.Contains(character);

    // Invisible formatting characters and the combining dot left over from a decomposed "İ".
    private static bool IsInvisible(char character) =>
        character is '​' or '‌' or '‍' or '⁠' or '﻿' or '­' or '̇';

    private static char? StraightQuote(char character) => character switch
    {
        '"' or '«' or '»' or '“' or '”' or '„' or '‟' => '"',
        '\'' or '`' or '‘' or '’' or '‚' or '‛' or '‹' or '›' => '\'',
        _ => null,
    };
}
