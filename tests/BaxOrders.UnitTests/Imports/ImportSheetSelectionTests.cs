using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Application.Imports.Reading;

namespace BaxOrders.UnitTests.Imports;

/// <summary>
/// Which sheet an order import reads, and which rows of it are lines somebody ordered.
/// </summary>
/// <remarks>
/// Both answers used to be wrong on the real workbook. It carries the same lines on two sheets, and reading
/// both staged everything twice; and it ends with a row holding only the sheet's total, which was staged as a
/// line with no product, no quantity, no object and no date.
/// </remarks>
public sealed class ImportSheetSelectionTests
{
    // ---- which sheet ----------------------------------------------------------------------------------

    [Theory]
    [InlineData("Aylıq")]
    [InlineData("aylıq")]
    [InlineData("AYLIQ")]
    [InlineData("  Aylıq  ")]
    public void The_authoritative_sheet_is_recognised_however_the_tab_is_written(string name)
    {
        Assert.True(ImportSheets.IsAuthoritative(name));
    }

    /// <summary>
    /// "Əsas" is the sheet this rule exists to exclude. It is not a fallback and not a near miss: the business
    /// named one sheet, and anything else is another sheet.
    /// </summary>
    [Theory]
    [InlineData("Əsas")]
    [InlineData("Aylıq sifarişlər")]
    [InlineData("Aylıqdan kənar")]
    [InlineData("Sheet1")]
    [InlineData("")]
    [InlineData(null)]
    public void Any_other_sheet_is_not_the_authoritative_one(string? name)
    {
        Assert.False(ImportSheets.IsAuthoritative(name));
    }

    [Fact]
    public void The_words_a_workbook_without_it_is_told_are_the_ones_the_business_asked_for()
    {
        Assert.Equal(
            "Aylıq vərəqi tapılmadı. Sifariş idxalı üçün əsas məlumat vərəqi mövcud deyil.",
            ImportSheets.MissingAuthoritativeSheet);
    }

    // ---- which rows -----------------------------------------------------------------------------------

    [Fact]
    public void An_ordinary_row_is_a_business_row()
    {
        Assert.True(ImportTestData.Row().IsBusinessRow);
    }

    /// <summary>A trailing row with nothing in it at all says nothing and is not a line.</summary>
    [Fact]
    public void A_blank_row_is_not_a_business_row()
    {
        var row = RowOf([]);

        Assert.True(row.IsBlank);
        Assert.False(row.IsBusinessRow);
    }

    /// <summary>
    /// The workbook's own total, which is what row 3623 of the real file holds. It is not blank — there is a
    /// number in "Cəmi" — and that is exactly why it used to be staged.
    /// </summary>
    [Fact]
    public void A_row_holding_only_the_sheet_total_is_not_a_business_row()
    {
        var row = RowOf([(ImportField.LineTotal, 430618.83404d)]);

        Assert.False(row.IsBlank);
        Assert.False(row.IsBusinessRow);
    }

    /// <summary>A numbered row with a total and nothing else is still the sheet's bookkeeping, not a line.</summary>
    [Fact]
    public void A_numbered_total_row_is_not_a_business_row()
    {
        var row = RowOf([(ImportField.SequenceNumber, 3618d), (ImportField.LineTotal, 430618.83404d)]);

        Assert.False(row.IsBusinessRow);
    }

    /// <summary>
    /// The refusal that matters: a sparse row is still a line. Somebody who typed a product and a quantity and
    /// left the rest for later has written a row, and it stages — with its gaps reported, not hidden.
    /// </summary>
    [Theory]
    [InlineData(ImportField.ProductName, "Makaron mop")]
    [InlineData(ImportField.Quantity, 3d)]
    [InlineData(ImportField.Location, "H.Ə.M")]
    [InlineData(ImportField.UnitPrice, 4.5d)]
    [InlineData(ImportField.Supplier, "Cleanfix MMC")]
    [InlineData(ImportField.ResponsiblePerson, "Eldar")]
    [InlineData(ImportField.OrderLineType, "Aylıq sifariş")]
    [InlineData(ImportField.ModelCode, "18216")]
    public void A_row_stating_one_business_value_is_still_a_business_row(ImportField field, object value)
    {
        var row = RowOf([(ImportField.SequenceNumber, 12d), (field, value)]);

        Assert.True(row.IsBusinessRow);
    }

    /// <summary>
    /// A real sparse line of the kind the import already knows how to complain about: a product and a quantity
    /// with no object and no date. It has to reach staging for those complaints to exist at all.
    /// </summary>
    [Fact]
    public void A_sparse_line_missing_required_values_still_stages_rather_than_disappearing()
    {
        var row = RowOf([(ImportField.ProductName, "Makaron mop"), (ImportField.Quantity, 3d)]);

        Assert.True(row.IsBusinessRow);
        var issues = ImportRowEvaluator.Evaluate(row, ImportTestData.TestCatalog()).Issues;
        Assert.Contains(issues, issue => issue.IssueType == Domain.Imports.ImportIssueType.MissingRequiredValue);
    }

    /// <summary>One row built from the given cells and nothing else, through the ordinary header layout.</summary>
    private static SourceRow RowOf((ImportField Field, object? Value)[] cells)
    {
        var fields = Enum.GetValues<ImportField>();
        var layout = new HeaderLayout(1, fields.Select((field, column) => (field, column))
            .ToDictionary(pair => pair.field, pair => pair.column));

        var values = fields.Select(field =>
            cells.Where(cell => cell.Field == field).Select(cell => cell.Value).FirstOrDefault()).ToArray();

        return new SourceRow(ImportSheets.Authoritative, new ExcelRow(9, values), layout);
    }
}
