namespace BaxOrders.Domain.Normalization;

/// <summary>
/// Normalizes a supplier model / article code ("Model/Kod") for comparison:
/// <see cref="TextNormalizer"/> rules plus removal of all spaces ("AB 120" equals "ab120").
/// Hyphens and other punctuation stay significant.
/// </summary>
public static class ModelCodeNormalizer
{
    public static string Normalize(string? value) =>
        TextNormalizer.Normalize(value).Replace(" ", string.Empty, StringComparison.Ordinal);
}
