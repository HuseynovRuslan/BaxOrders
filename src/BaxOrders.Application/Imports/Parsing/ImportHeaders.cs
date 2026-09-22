using BaxOrders.Application.Imports.Reading;
using BaxOrders.Domain.Normalization;

namespace BaxOrders.Application.Imports.Parsing;

/// <summary>Logical columns of the order request workbook.</summary>
public enum ImportField
{
    SequenceNumber,
    MainCategory,
    MiddleCategory,
    SubCategory,
    ProductName,
    SpecificationValue,
    SpecificationUnit,
    ModelCode,
    Quantity,
    OrderUnit,
    UnitPrice,
    LineTotal,
    Supplier,
    Location,
    RequestDate,
    ResponsiblePerson,
}

/// <param name="HeaderRowNumber">1-based worksheet row that holds the header.</param>
/// <param name="Columns">0-based column index of every recognised field.</param>
public sealed record HeaderLayout(int HeaderRowNumber, IReadOnlyDictionary<ImportField, int> Columns)
{
    public int? ColumnOf(ImportField field) => Columns.TryGetValue(field, out var column) ? column : null;
}

/// <param name="Layout">The detected header, or null when the sheet has none.</param>
/// <param name="CandidateRowNumber">The row that came closest to a header, for diagnostics.</param>
public sealed record SheetHeaderResult(
    string SheetName,
    HeaderLayout? Layout,
    int? CandidateRowNumber,
    IReadOnlyList<ImportField> RecognizedFields,
    IReadOnlyList<ImportField> MissingRequiredFields,
    string? Problem);

/// <summary>
/// Finds the header row by exact, normalized column names. Unknown headers are ignored, never guessed.
/// </summary>
/// <remarks>
/// Header text is normalized with <see cref="TextNormalizer"/> (trim, collapsed whitespace, Unicode NFKC,
/// culture-independent case), so "Alt  kateqoriya" and "alt kateqoriya" are the same column. A row is the
/// header when it contains every required column; the first such row within the search limit wins.
/// </remarks>
public static class ImportHeaders
{
    public static readonly IReadOnlyDictionary<ImportField, string> ExpectedHeaders = new Dictionary<ImportField, string>
    {
        [ImportField.SequenceNumber] = "№",
        [ImportField.MainCategory] = "Ana kateqoriya",
        [ImportField.MiddleCategory] = "Orta kateqoriya",
        [ImportField.SubCategory] = "Alt kateqoriya",
        [ImportField.ProductName] = "Malın adı",
        [ImportField.SpecificationValue] = "Ölçü",
        [ImportField.SpecificationUnit] = "Vahid",
        [ImportField.ModelCode] = "Model/Kod",
        [ImportField.Quantity] = "Miqdarı",
        [ImportField.OrderUnit] = "Ö/v",
        [ImportField.UnitPrice] = "Qiyməti",
        [ImportField.LineTotal] = "Cəmi",
        [ImportField.Supplier] = "Şirkət",
        [ImportField.Location] = "Obyekt",
        [ImportField.RequestDate] = "Tarix",
        [ImportField.ResponsiblePerson] = "Cavabdeh şəxs",
    };

    /// <summary>Columns a workbook must have. All other columns may be absent or blank.</summary>
    public static readonly IReadOnlyList<ImportField> RequiredFields =
    [
        ImportField.ProductName,
        ImportField.Quantity,
        ImportField.OrderUnit,
        ImportField.Location,
        ImportField.RequestDate,
    ];

    private static readonly Dictionary<string, ImportField> FieldByNormalizedHeader =
        ExpectedHeaders.ToDictionary(pair => TextNormalizer.Normalize(pair.Value), pair => pair.Key);

    public static SheetHeaderResult Detect(ExcelSheet sheet, int searchRowLimit)
    {
        (ExcelRow Row, Dictionary<ImportField, int> Found)? best = null;

        foreach (var row in sheet.Rows.Where(row => row.RowNumber <= searchRowLimit))
        {
            var found = new Dictionary<ImportField, int>();
            var duplicated = new HashSet<ImportField>();

            for (var column = 0; column < row.Cells.Count; column++)
            {
                if (row.Cells[column] is string text
                    && FieldByNormalizedHeader.TryGetValue(TextNormalizer.Normalize(text), out var field)
                    && !found.TryAdd(field, column))
                {
                    duplicated.Add(field);
                }
            }

            if (RequiredFields.All(found.ContainsKey))
            {
                return duplicated.Count > 0
                    ? new SheetHeaderResult(sheet.Name, null, row.RowNumber, [.. found.Keys], [],
                        $"Header row {row.RowNumber} contains duplicate columns: {string.Join(", ", duplicated)}.")
                    : new SheetHeaderResult(sheet.Name, new HeaderLayout(row.RowNumber, found), row.RowNumber, [.. found.Keys], [], null);
            }

            if (found.Count > 0 && (best is null || found.Count > best.Value.Found.Count))
            {
                best = (row, found);
            }
        }

        if (best is null)
        {
            return new SheetHeaderResult(sheet.Name, null, null, [], RequiredFields,
                $"No recognisable header in the first {searchRowLimit} rows.");
        }

        var (candidate, recognized) = best.Value;
        return new SheetHeaderResult(
            sheet.Name,
            null,
            candidate.RowNumber,
            [.. recognized.Keys],
            [.. RequiredFields.Where(field => !recognized.ContainsKey(field))],
            $"Row {candidate.RowNumber} looks like a header but required columns are missing.");
    }
}
