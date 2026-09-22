using System.Security.Cryptography;
using System.Text;
using BaxOrders.Domain.Normalization;

namespace BaxOrders.Domain.Imports;

/// <summary>
/// Deterministic keys that identify one distinct source value within an import batch. The same key is stored on
/// staged rows and on import resolutions, so one decision can be applied to every matching row.
/// </summary>
/// <remarks>
/// Location, supplier, responsible person, order unit and specification unit keys are the
/// <see cref="TextNormalizer"/> value of the cell. A category path key joins the normalized levels from the root
/// ("təmizlik|təmizlik ləvazimati|əlcək"); a blank level between filled levels is kept as an empty segment,
/// because such a path cannot be resolved by creating categories. Blank values have no key.
/// </remarks>
public static class ImportSourceKeys
{
    public const char CategoryPathSeparator = '|';

    /// <summary>Longest variant source key: "product=" + product id + separator + a full variant key.</summary>
    public const int ProductVariantMaxLength = 480;

    private const string ProductScope = "product=";

    public static string? Name(string? sourceText)
    {
        var normalized = TextNormalizer.Normalize(sourceText);
        return normalized.Length == 0 ? null : normalized;
    }

    public static string? CategoryPath(string? mainCategory, string? middleCategory, string? subCategory)
    {
        var levels = new[] { mainCategory, middleCategory, subCategory }.Select(TextNormalizer.Normalize).ToList();
        var lastFilled = levels.FindLastIndex(level => level.Length > 0);
        return lastFilled < 0
            ? null
            : string.Join(CategoryPathSeparator, levels.Take(lastFilled + 1).Select(Escape));
    }

    public static IReadOnlyList<string> CategoryLevels(string categoryPathKey) =>
        categoryPathKey.Split(CategoryPathSeparator).Select(Unescape).ToList();

    /// <summary>True when a level between filled levels is blank, so the hierarchy is unknown.</summary>
    public static bool HasMissingCategoryLevel(string categoryPathKey) =>
        CategoryLevels(categoryPathKey).Any(level => level.Length == 0);

    /// <summary>
    /// Identity of one product variant inside a batch: the canonical product it belongs to plus the variant key
    /// (normalized specification, specification unit code, model code and order unit code).
    /// </summary>
    /// <remarks>
    /// Built from canonical ids and unit codes, never from raw cell text, so "ədəd", "əd" and "pcs" resolved to the
    /// same unit produce one variant instead of three. It exists only after the product and its units are resolved.
    /// </remarks>
    public static string ProductVariant(long productId, string normalizedVariantKey)
    {
        if (productId <= 0)
        {
            throw new DomainException("A variant source key requires a saved product.");
        }

        var key = $"{ProductScope}{productId}|{normalizedVariantKey}";
        return key.Length <= ProductVariantMaxLength
            ? key
            : throw new DomainException($"A variant source key must not exceed {ProductVariantMaxLength} characters.");
    }

    /// <summary>Reads the product back out of a variant source key.</summary>
    public static bool TryReadProduct(string variantSourceKey, out long productId)
    {
        productId = 0;
        if (!variantSourceKey.StartsWith(ProductScope, StringComparison.Ordinal))
        {
            return false;
        }

        var separator = variantSourceKey.IndexOf('|', ProductScope.Length);
        return separator > ProductScope.Length
               && long.TryParse(variantSourceKey.AsSpan(ProductScope.Length, separator - ProductScope.Length), out productId);
    }

    /// <summary>The identity of the variant within its product, without the product scope.</summary>
    public static string ReadVariantKey(string variantSourceKey)
    {
        if (!TryReadProduct(variantSourceKey, out _))
        {
            throw new DomainException($"'{variantSourceKey}' is not a variant source key.");
        }

        return variantSourceKey[(variantSourceKey.IndexOf('|', ProductScope.Length) + 1)..];
    }

    /// <summary>SHA-256 of the key (lower-case hex), used for uniqueness because keys can be long.</summary>
    public static string Hash(string sourceKey) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(sourceKey)));

    private static string Escape(string level) =>
        level.Replace("%", "%25", StringComparison.Ordinal).Replace("|", "%7C", StringComparison.Ordinal);

    private static string Unescape(string level) =>
        level.Replace("%7C", "|", StringComparison.Ordinal).Replace("%25", "%", StringComparison.Ordinal);
}
