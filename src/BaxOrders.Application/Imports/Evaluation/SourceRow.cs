using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Application.Imports.Reading;
using BaxOrders.Domain.Imports;

namespace BaxOrders.Application.Imports.Evaluation;

/// <summary>One worksheet row read through a detected header layout.</summary>
public sealed record SourceRow(string SheetName, ExcelRow Row, HeaderLayout Layout) : IRowValues
{
    public int RowNumber => Row.RowNumber;

    /// <summary>A row is blank when every recognised column is empty.</summary>
    public bool IsBlank => Layout.Columns.Values.All(column => ImportCellParser.IsBlank(Row[column]));

    /// <summary>
    /// The columns that say nothing about what was ordered.
    /// </summary>
    /// <remarks>
    /// "№" numbers the lines and "Cəmi" is quantity × price restated; neither is a request. Everything else —
    /// the product, its size and unit, the model, the quantity, the price, the supplier, the object, the date,
    /// the responsible person, the kind — is something somebody stated about a line.
    /// </remarks>
    private static readonly ImportField[] Bookkeeping = [ImportField.SequenceNumber, ImportField.LineTotal];

    /// <summary>
    /// Whether this row says anything about an order at all.
    /// </summary>
    /// <remarks>
    /// The rule a summary line fails: a row is business data when at least one column outside
    /// <see cref="Bookkeeping"/> carries something. The workbook ends with a row holding only the sheet's own
    /// total in "Cəmi", and that is not a line somebody ordered — staging it produced a row with no product, no
    /// quantity, no object and no date, and four errors describing a line that never existed.
    /// <para>
    /// Deliberately not "the row is near the bottom" and not a row number: where a total sits is a matter of
    /// layout. And deliberately not "a required column is empty" either, which would silently swallow a real
    /// line somebody forgot to finish — such a row still stages, and its missing values are still reported.
    /// A sparse row that names a product, or a quantity, or an object, is a line and is read as one.
    /// </para>
    /// </remarks>
    public bool IsBusinessRow => Layout.Columns
        .Where(column => !Bookkeeping.Contains(column.Key))
        .Any(column => !ImportCellParser.IsBlank(Row[column.Value]));

    public object? Cell(ImportField field) => Layout.ColumnOf(field) is { } column ? Row[column] : null;

    public string? Text(ImportField field) => ImportCellParser.ToSourceText(Cell(field));

    public bool StoredAsDate(ImportField field) => Cell(field) is DateTime;

    public bool HasColumn(ImportField field) => Layout.ColumnOf(field) is not null;

    /// <summary>
    /// Source text for staging. Text longer than the staging column is cut to fit and reported as an error,
    /// so one oversized cell never aborts the import.
    /// </summary>
    public ImportRowOriginalValues ToOriginalValues(List<ImportIssueDraft> issues) => new()
    {
        SequenceNumber = Fit(ImportField.SequenceNumber, ImportRow.SourceValueMaxLength, issues),
        MainCategory = Fit(ImportField.MainCategory, ImportRow.SourceTextMaxLength, issues),
        MiddleCategory = Fit(ImportField.MiddleCategory, ImportRow.SourceTextMaxLength, issues),
        SubCategory = Fit(ImportField.SubCategory, ImportRow.SourceTextMaxLength, issues),
        ProductName = Fit(ImportField.ProductName, ImportRow.SourceTextMaxLength, issues),
        SpecificationValue = Fit(ImportField.SpecificationValue, ImportRow.SourceValueMaxLength, issues),
        SpecificationUnit = Fit(ImportField.SpecificationUnit, ImportRow.SourceValueMaxLength, issues),
        ModelCode = Fit(ImportField.ModelCode, ImportRow.SourceValueMaxLength, issues),
        Quantity = Fit(ImportField.Quantity, ImportRow.SourceValueMaxLength, issues),
        OrderUnit = Fit(ImportField.OrderUnit, ImportRow.SourceValueMaxLength, issues),
        UnitPrice = Fit(ImportField.UnitPrice, ImportRow.SourceValueMaxLength, issues),
        LineTotal = Fit(ImportField.LineTotal, ImportRow.SourceValueMaxLength, issues),
        SupplierName = Fit(ImportField.Supplier, ImportRow.SourceTextMaxLength, issues),
        LocationName = Fit(ImportField.Location, ImportRow.SourceTextMaxLength, issues),
        RequestDate = Fit(ImportField.RequestDate, ImportRow.SourceValueMaxLength, issues),
        ResponsiblePersonName = Fit(ImportField.ResponsiblePerson, ImportRow.SourceTextMaxLength, issues),
        HasResponsiblePersonColumn = HasColumn(ImportField.ResponsiblePerson),
        OrderLineType = Fit(ImportField.OrderLineType, ImportRow.SourceValueMaxLength, issues),
        HasOrderLineTypeColumn = HasColumn(ImportField.OrderLineType),
    };

    private string? Fit(ImportField field, int maxLength, List<ImportIssueDraft> issues)
    {
        var text = Text(field);
        if (text is null || text.Length <= maxLength)
        {
            return text;
        }

        issues.Add(new ImportIssueDraft(ImportIssueType.Other, IssueSeverity.Error, ImportIssueOrigin.Staging, ImportHeaders.ExpectedHeaders[field],
            $"The cell has {text.Length} characters; only the first {maxLength} were stored."));
        return text[..maxLength];
    }
}
