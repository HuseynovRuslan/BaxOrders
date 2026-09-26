using System.Globalization;
using BaxOrders.Application.Imports.Matching;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Imports.Evaluation;

/// <param name="Quantity">Valid quantity (&gt; 0), otherwise null.</param>
/// <param name="UnitPrice">Valid unit price (≥ 0), otherwise null.</param>
/// <param name="LineTotal">The Excel total as a number, when readable. Never authoritative.</param>
/// <param name="RequestPeriod">First day of the month stated in "Tarix". The order workbook has no request date.</param>
public sealed record RowEvaluation(
    decimal? Quantity,
    decimal? UnitPrice,
    decimal? LineTotal,
    DateOnly? RequestPeriod,
    ImportRowMatches Matches,
    IReadOnlyList<ImportIssueDraft> Issues);

/// <summary>
/// Parses, validates and matches one workbook row. Pure and deterministic: no database access, no fuzzy matching,
/// and nothing is created. Identity matching is delegated to <see cref="ImportRowMatcher"/>, which can be re-run
/// later from staged text alone.
/// </summary>
public static class ImportRowEvaluator
{
    public static RowEvaluation Evaluate(IRowValues row, ImportCatalog catalog) => Evaluate(row, catalog, ImportResolutionSet.Empty);

    public static RowEvaluation Evaluate(IRowValues row, ImportCatalog catalog, ImportResolutionSet resolutions)
    {
        var issues = new List<ImportIssueDraft>();

        if (string.IsNullOrWhiteSpace(row.Text(ImportField.ProductName)))
        {
            issues.Add(Issue(ImportIssueType.MissingRequiredValue, IssueSeverity.Error, ImportIssueOrigin.Validation,
                ImportField.ProductName, "Product name is missing."));
        }

        var quantity = ParseQuantity(row, issues);
        var unitPrice = ParseUnitPrice(row, issues);
        var lineTotal = CheckLineTotal(row, quantity, unitPrice, issues);
        var requestPeriod = ParseRequestPeriod(row, issues);

        var matching = ImportRowMatcher.Match(MatchingInput.From(row), catalog, resolutions);
        issues.AddRange(matching.Issues);

        ReportCellsStoredAsDates(row, issues);
        ReportLineType(row, issues);

        return new RowEvaluation(quantity, unitPrice, lineTotal, requestPeriod, matching.Matches, issues);
    }

    private static decimal? ParseQuantity(IRowValues row, List<ImportIssueDraft> issues)
    {
        var result = ImportCellParser.ParseDecimal(row.Cell(ImportField.Quantity), OrderRequestItem.QuantityPrecision, OrderRequestItem.QuantityScale);

        var problem = result.Outcome switch
        {
            ParseOutcome.Blank => "Quantity is missing.",
            ParseOutcome.Invalid => result.Problem,
            _ when result.Value <= 0 => $"Quantity must be greater than zero (got {Format(result.Value)}).",
            _ => null,
        };

        if (problem is null)
        {
            return result.Value;
        }

        issues.Add(Issue(ImportIssueType.InvalidQuantity, IssueSeverity.Error, ImportIssueOrigin.Parsing, ImportField.Quantity, problem));
        return null;
    }

    private static decimal? ParseUnitPrice(IRowValues row, List<ImportIssueDraft> issues)
    {
        var result = ImportCellParser.ParseDecimal(row.Cell(ImportField.UnitPrice), OrderRequestItem.UnitPricePrecision, OrderRequestItem.UnitPriceScale);

        switch (result.Outcome)
        {
            case ParseOutcome.Blank:
                issues.Add(Issue(ImportIssueType.MissingPrice, IssueSeverity.Warning, ImportIssueOrigin.Parsing, ImportField.UnitPrice,
                    "Unit price is missing; the row stays usable for quantity comparisons."));
                return null;

            // Price is optional for a request item, so an unusable price never invalidates the row.
            // It is ignored (never replaced by zero) and the row stays usable for quantity comparisons.
            case ParseOutcome.Invalid:
                issues.Add(Issue(ImportIssueType.InvalidPrice, IssueSeverity.Warning, ImportIssueOrigin.Parsing, ImportField.UnitPrice,
                    $"{result.Problem} The price is ignored."));
                return null;

            case ParseOutcome.Parsed when result.Value < 0:
                issues.Add(Issue(ImportIssueType.InvalidPrice, IssueSeverity.Warning, ImportIssueOrigin.Parsing, ImportField.UnitPrice,
                    $"Unit price must not be negative (got {Format(result.Value)}). The price is ignored."));
                return null;

            default:
                return result.Value;
        }
    }

    private static decimal? CheckLineTotal(IRowValues row, decimal? quantity, decimal? unitPrice, List<ImportIssueDraft> issues)
    {
        var result = ImportCellParser.ParseDecimal(row.Cell(ImportField.LineTotal), ImportRow.LineTotalPrecision, ImportRow.LineTotalScale);

        if (result.Outcome == ParseOutcome.Invalid)
        {
            issues.Add(Issue(ImportIssueType.InvalidLineTotal, IssueSeverity.Warning, ImportIssueOrigin.Parsing, ImportField.LineTotal, result.Problem!));
            return null;
        }

        if (result.Outcome == ParseOutcome.Parsed && quantity is { } q && unitPrice is { } p)
        {
            var calculated = q * p;
            var difference = result.Value - calculated;
            if (Math.Abs(difference) > ImportIssueRules.LineTotalTolerance)
            {
                issues.Add(Issue(ImportIssueType.LineTotalMismatch, IssueSeverity.Warning, ImportIssueOrigin.Validation, ImportField.LineTotal,
                    $"Excel total {Format(result.Value)} differs from calculated total {Format(calculated)} " +
                    $"({Format(q)} × {Format(p)}) by {Format(difference)}."));
            }
        }

        return result.ValueOrNull;
    }

    /// <summary>
    /// The order workbook's "Tarix" is the request period (the first day of a month in real files), not the day the
    /// request was written. A date on another day is read as its month and noted as Info.
    /// </summary>
    private static DateOnly? ParseRequestPeriod(IRowValues row, List<ImportIssueDraft> issues)
    {
        var result = ImportCellParser.ParseDate(row.Cell(ImportField.RequestDate));
        if (result.Outcome != ParseOutcome.Parsed)
        {
            issues.Add(Issue(ImportIssueType.InvalidDate, IssueSeverity.Error, ImportIssueOrigin.Parsing, ImportField.RequestDate,
                result.Outcome == ParseOutcome.Blank ? "The request period (Tarix) is missing." : result.Problem!));
            return null;
        }

        var period = OrderRequest.PeriodOf(result.Value);
        if (period != result.Value)
        {
            issues.Add(Issue(ImportIssueType.Other, IssueSeverity.Info, ImportIssueOrigin.Parsing, ImportField.RequestDate,
                $"Tarix {result.Value.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture)} is used as the request period " +
                $"{period.ToString("yyyy-MM", CultureInfo.InvariantCulture)}; this workbook has no separate request date."));
        }

        return period;
    }

    private static void ReportCellsStoredAsDates(IRowValues row, List<ImportIssueDraft> issues)
    {
        foreach (var field in new[] { ImportField.SpecificationValue, ImportField.SpecificationUnit, ImportField.ModelCode })
        {
            if (row.StoredAsDate(field))
            {
                issues.Add(Issue(ImportIssueType.Other, IssueSeverity.Warning, ImportIssueOrigin.Parsing, field,
                    $"Excel stored this cell as a date ({row.Text(field)}); the value typed by the author may have been converted."));
            }
        }
    }

    /// <summary>
    /// What the "Növ" column says about this line, and what it means when it says nothing.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Three different silences, and they are not the same thing. A column that is not there at all is a
    /// workbook that cannot answer the question for any of its lines: that is an <b>error</b>, and an import
    /// carrying one cannot be ready to import, because bringing it in would write "nobody classified this"
    /// over three thousand lines as though somebody had decided it.
    /// </para>
    /// <para>
    /// An empty cell in a column that exists, and a word nobody can read, are both one line waiting on one
    /// person. Those are <b>warnings</b>: the line imports, arrives unclassified — which is true — and is put
    /// in front of somebody. Either way the classification is never guessed at.
    /// </para>
    /// </remarks>
    private static void ReportLineType(IRowValues row, List<ImportIssueDraft> issues)
    {
        if (!row.HasColumn(ImportField.OrderLineType))
        {
            issues.Add(Issue(ImportIssueType.UnknownOrderLineType, IssueSeverity.Error, ImportIssueOrigin.Parsing,
                ImportField.OrderLineType, MissingOrderLineTypeColumn));
            return;
        }

        var cell = row.Text(ImportField.OrderLineType);
        if (string.IsNullOrWhiteSpace(cell))
        {
            issues.Add(Issue(ImportIssueType.UnknownOrderLineType, IssueSeverity.Warning, ImportIssueOrigin.Validation,
                ImportField.OrderLineType,
                "Sifariş növü boşdur; sətir təsnif edilməmiş qalır. " +
                $"Gözlənilən dəyərlər: {string.Join(", ", OrderLineTypes.Recognized.Keys)}."));
            return;
        }

        if (OrderLineTypes.IsUnrecognized(cell))
        {
            issues.Add(Issue(ImportIssueType.UnknownOrderLineType, IssueSeverity.Warning, ImportIssueOrigin.Validation,
                ImportField.OrderLineType,
                $"'{cell}' tanınan sifariş növü deyil; sətir təsnif edilməmiş qalır. " +
                $"Gözlənilən dəyərlər: {string.Join(", ", OrderLineTypes.Recognized.Keys)}."));
        }
    }

    /// <summary>What a workbook with no "Növ" column is told, in one sentence, wherever it is told.</summary>
    public const string MissingOrderLineTypeColumn =
        "Növ sütunu tapılmadı. Sifariş növü təsnifatı oxuna bilmədi.";

    private static ImportIssueDraft Issue(ImportIssueType type, IssueSeverity severity, ImportIssueOrigin origin, ImportField field, string message) =>
        new(type, severity, origin, ImportHeaders.ExpectedHeaders[field], message);

    private static string Format(decimal value) => value.ToString("0.#######", CultureInfo.InvariantCulture);
}
