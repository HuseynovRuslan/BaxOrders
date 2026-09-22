using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Application.Imports.Reading;

namespace BaxOrders.UnitTests.Imports;

public sealed class ImportHeadersTests
{
    // Layout of the real order workbook: empty column A, header on row 3, double space in "Alt  kateqoriya".
    internal static readonly object?[] RealHeader =
    [
        null, "№", "Ana kateqoriya", "Orta kateqoriya", "Alt  kateqoriya", "Malın adı", "Ölçü", "Vahid", "Model/Kod",
        "Miqdarı", "Ö/v", "Qiyməti", "Cəmi", "Şirkət", "Obyekt", "Tarix", "Cavabdeh şəxs",
    ];

    [Fact]
    public void Header_on_row_three_with_an_empty_first_column_is_detected()
    {
        var result = ImportHeaders.Detect(Sheet([], [], RealHeader), searchRowLimit: 30);

        Assert.NotNull(result.Layout);
        Assert.Equal(3, result.Layout.HeaderRowNumber);
        Assert.Equal(1, result.Layout.ColumnOf(ImportField.SequenceNumber));
        Assert.Equal(4, result.Layout.ColumnOf(ImportField.SubCategory));
        Assert.Equal(5, result.Layout.ColumnOf(ImportField.ProductName));
        Assert.Equal(16, result.Layout.ColumnOf(ImportField.ResponsiblePerson));
    }

    [Fact]
    public void Header_row_is_not_hard_coded()
    {
        var result = ImportHeaders.Detect(Sheet(RealHeader), searchRowLimit: 30);

        Assert.Equal(1, result.Layout?.HeaderRowNumber);
    }

    [Theory]
    [InlineData("MALIN ADI")]
    [InlineData("  Malın   adı ")]
    [InlineData("malın adı")]
    public void Header_text_ignores_case_spacing_and_dotless_i(string productHeader)
    {
        var header = (object?[])RealHeader.Clone();
        header[5] = productHeader;

        Assert.Equal(5, ImportHeaders.Detect(Sheet(header), 30).Layout?.ColumnOf(ImportField.ProductName));
    }

    [Fact]
    public void Header_text_ignores_unicode_composition()
    {
        var header = (object?[])RealHeader.Clone();
        header[10] = "Ö/v";

        Assert.Equal(10, ImportHeaders.Detect(Sheet(header), 30).Layout?.ColumnOf(ImportField.OrderUnit));
    }

    [Fact]
    public void Only_required_columns_are_needed()
    {
        var result = ImportHeaders.Detect(Sheet(["Malın adı", "Miqdarı", "Ö/v", "Obyekt", "Tarix"]), 30);

        Assert.NotNull(result.Layout);
        Assert.Null(result.Layout.ColumnOf(ImportField.UnitPrice));
    }

    [Fact]
    public void Missing_required_columns_are_reported()
    {
        var result = ImportHeaders.Detect(Sheet(["№", "Malın adı", "Miqdarı", "Ö/v", "Qiyməti"]), 30);

        Assert.Null(result.Layout);
        Assert.Equal(1, result.CandidateRowNumber);
        Assert.Equal([ImportField.Location, ImportField.RequestDate], result.MissingRequiredFields);
    }

    [Fact]
    public void Similar_headers_are_not_guessed()
    {
        var result = ImportHeaders.Detect(Sheet(["Malın ad", "Miqdarı", "Ö/v", "Obyekt", "Tarix"]), 30);

        Assert.Null(result.Layout);
        Assert.Contains(ImportField.ProductName, result.MissingRequiredFields);
    }

    [Fact]
    public void Duplicate_columns_are_rejected()
    {
        var result = ImportHeaders.Detect(Sheet(["Malın adı", "Miqdarı", "Ö/v", "Obyekt", "Tarix", "Miqdarı"]), 30);

        Assert.Null(result.Layout);
        Assert.Contains("duplicate", result.Problem);
    }

    [Fact]
    public void Header_below_the_search_limit_is_not_used()
    {
        Assert.Null(ImportHeaders.Detect(Sheet([], [], RealHeader), searchRowLimit: 2).Layout);
    }

    [Fact]
    public void Legacy_request_form_layout_is_not_forced_into_the_order_schema()
    {
        var result = ImportHeaders.Detect(Sheet(["№", "Malın adı", "Miqdarı", "Ö/v", "Qiyməti", "Cəmi", "Şirkətlər"]), 30);

        Assert.Null(result.Layout);
        Assert.Equal([ImportField.Location, ImportField.RequestDate], result.MissingRequiredFields);
    }

    internal static ExcelSheet Sheet(params object?[][] rows) =>
        new("Əsas", rows.Select((cells, index) => new ExcelRow(index + 1, cells)).ToList());
}
