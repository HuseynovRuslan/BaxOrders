using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Application.Imports.Reading;
using BaxOrders.Domain.Imports;

namespace BaxOrders.Application.Imports.Evaluation;

/// <summary>One worksheet row read through a detected header layout.</summary>
public sealed record SourceRow(string SheetName, ExcelRow Row, HeaderLayout Layout) : IRowValues
{
    public int RowNumber => Row.RowNumber;

    /// <summary>A row is blank when every recognised column is empty. Blank rows are skipped.</summary>
    public bool IsBlank => Layout.Columns.Values.All(column => ImportCellParser.IsBlank(Row[column]));

    public object? Cell(ImportField field) => Layout.ColumnOf(field) is { } column ? Row[column] : null;

    public string? Text(ImportField field) => ImportCellParser.ToSourceText(Cell(field));

    public bool StoredAsDate(ImportField field) => Cell(field) is DateTime;

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
