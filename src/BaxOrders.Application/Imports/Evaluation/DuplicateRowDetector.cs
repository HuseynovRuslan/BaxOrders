using System.Globalization;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Normalization;

namespace BaxOrders.Application.Imports.Evaluation;

/// <summary>
/// Finds rows inside one import with identical business values ("possible duplicates"). This is only a review
/// signal: two legitimate request lines can be identical, so rows are never merged, removed or invalidated.
/// </summary>
/// <remarks>
/// The fingerprint joins these normalized values: location, request period, category path (main, middle, sub),
/// product name, specification value, specification unit, model code, quantity, order unit, unit price, supplier
/// and responsible person. The Excel "№" and "Cəmi" columns are not part of it.
/// Rows without a location, product name, order unit, valid quantity or valid date get no fingerprint and are never
/// reported as duplicates. Same product alone is never enough.
/// </remarks>
public static class DuplicateRowDetector
{
    private const char Separator = '';

    public static string? Fingerprint(IRowValues row, RowEvaluation evaluation)
    {
        if (evaluation.Quantity is not { } quantity || evaluation.RequestPeriod is not { } requestPeriod)
        {
            return null;
        }

        var location = TextNormalizer.Normalize(row.Text(ImportField.Location));
        var product = TextNormalizer.Normalize(row.Text(ImportField.ProductName));
        var orderUnit = TextNormalizer.Normalize(row.Text(ImportField.OrderUnit));
        if (location.Length == 0 || product.Length == 0 || orderUnit.Length == 0)
        {
            return null;
        }

        var price = evaluation.UnitPrice is { } unitPrice
            ? Canonical(unitPrice)
            : TextNormalizer.Normalize(row.Text(ImportField.UnitPrice));

        return string.Join(
            Separator,
            location,
            requestPeriod.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            TextNormalizer.Normalize(row.Text(ImportField.MainCategory)),
            TextNormalizer.Normalize(row.Text(ImportField.MiddleCategory)),
            TextNormalizer.Normalize(row.Text(ImportField.SubCategory)),
            product,
            SpecificationNormalizer.Normalize(row.Text(ImportField.SpecificationValue)),
            TextNormalizer.Normalize(row.Text(ImportField.SpecificationUnit)),
            ModelCodeNormalizer.Normalize(row.Text(ImportField.ModelCode)),
            Canonical(quantity),
            orderUnit,
            price,
            TextNormalizer.Normalize(row.Text(ImportField.Supplier)),
            TextNormalizer.Normalize(row.Text(ImportField.ResponsiblePerson)));
    }

    /// <summary>Maps every duplicated row to the other rows with the same fingerprint.</summary>
    public static IReadOnlyDictionary<TKey, IReadOnlyList<TKey>> FindDuplicates<TKey>(IEnumerable<(TKey Key, string? Fingerprint)> rows)
        where TKey : notnull
    {
        var duplicates = new Dictionary<TKey, IReadOnlyList<TKey>>();

        foreach (var group in rows.Where(row => row.Fingerprint is not null).GroupBy(row => row.Fingerprint, StringComparer.Ordinal))
        {
            var keys = group.Select(row => row.Key).ToList();
            if (keys.Count < 2)
            {
                continue;
            }

            foreach (var key in keys)
            {
                duplicates[key] = keys.Where(other => !EqualityComparer<TKey>.Default.Equals(other, key)).ToList();
            }
        }

        return duplicates;
    }

    // 10, 10.0 and 10.000 must produce the same text.
    private static string Canonical(decimal value) => value.ToString("0.############################", CultureInfo.InvariantCulture);
}
