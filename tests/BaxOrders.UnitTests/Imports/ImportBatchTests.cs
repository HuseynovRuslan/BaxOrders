using BaxOrders.Domain;
using BaxOrders.Domain.Imports;

namespace BaxOrders.UnitTests.Imports;

public sealed class ImportBatchTests
{
    private static readonly DateTime UploadedAt = new(2026, 3, 18, 8, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Original_cell_text_is_preserved_verbatim()
    {
        var batch = new ImportBatch("HEM mart.xlsx", fileHash: null, UploadedAt);

        var row = batch.AddRow("Sheet1", 5, new ImportRowOriginalValues
        {
            ProductName = "  Makaron Mop ",
            SpecificationValue = "50",
            SpecificationUnit = "sm",
            Quantity = "43 ",
            OrderUnit = "ədəd",
            UnitPrice = "4,50",
            LineTotal = "193.5",
            SupplierName = " Cleanfix MMC",
            LocationName = "H.Ə.M",
            ResponsiblePersonName = "Eldar",
        });

        Assert.Equal("  Makaron Mop ", row.OriginalProductName);
        Assert.Equal("43 ", row.OriginalQuantity);
        Assert.Equal("4,50", row.OriginalUnitPrice);
        Assert.Equal(" Cleanfix MMC", row.OriginalSupplierName);
        Assert.Equal("makaron mop", row.NormalizedProductName);
        Assert.Equal("cleanfix mmc", row.NormalizedSupplierName);
        Assert.Equal("h.ə.m", row.NormalizedLocationName);
        Assert.Equal(ImportRowValidationStatus.Pending, row.ValidationStatus);
        Assert.Equal(1, batch.TotalRows);
    }

    [Fact]
    public void Row_can_carry_several_issues_at_once()
    {
        var row = NewBatch().AddRow("Sheet1", 2, new ImportRowOriginalValues { ProductName = "Naməlum mal" });

        row.AddIssue(ImportIssueType.UnknownProduct, IssueSeverity.Error, ImportIssueOrigin.Matching, "Product is not in the catalog.", "Malın adı");
        row.AddIssue(ImportIssueType.UnknownSupplier, IssueSeverity.Warning, ImportIssueOrigin.Matching, "Supplier is not registered.", "Şirkət");
        row.AddIssue(ImportIssueType.InvalidQuantity, IssueSeverity.Error, ImportIssueOrigin.Parsing, "Quantity is not a number.", "Miqdarı");

        Assert.Equal(3, row.Issues.Count);
    }

    [Fact]
    public void Calculated_line_total_exposes_a_mismatch_with_excel_total()
    {
        var row = NewBatch().AddRow("Sheet1", 2, new ImportRowOriginalValues());

        row.SetParsedValues(quantity: 43m, unitPrice: 4.50m, lineTotal: 190m, requestPeriod: new DateOnly(2026, 3, 1));

        Assert.Equal(193.50m, row.CalculatedLineTotal);
        Assert.NotEqual(row.ParsedLineTotal, row.CalculatedLineTotal);
    }

    [Fact]
    public void Calculated_line_total_is_unknown_without_price()
    {
        var row = NewBatch().AddRow("Sheet1", 2, new ImportRowOriginalValues());

        row.SetParsedValues(quantity: 43m, unitPrice: null, lineTotal: null, requestPeriod: null);

        Assert.Null(row.CalculatedLineTotal);
    }

    [Fact]
    public void Order_workbook_rows_carry_a_period_and_no_request_date()
    {
        var row = NewBatch().AddRow("Sheet1", 2, new ImportRowOriginalValues { RequestDate = "2026-03-01" });

        row.SetParsedValues(quantity: 1m, unitPrice: null, lineTotal: null, requestPeriod: new DateOnly(2026, 3, 1));

        Assert.Equal(new DateOnly(2026, 3, 1), row.ParsedRequestPeriod);
        Assert.Null(row.ParsedRequestDate);
        Assert.Equal("2026-03-01", row.OriginalRequestDate);
    }

    [Fact]
    public void Parsed_request_period_must_start_a_month()
    {
        var row = NewBatch().AddRow("Sheet1", 2, new ImportRowOriginalValues());

        Assert.Throws<DomainException>(() => row.SetParsedValues(1m, null, null, requestPeriod: new DateOnly(2026, 3, 18)));
    }

    [Fact]
    public void Same_row_number_is_allowed_once_per_sheet()
    {
        var batch = NewBatch();
        batch.AddRow("Ramana", 2, new ImportRowOriginalValues());
        batch.AddRow("Maştağa", 2, new ImportRowOriginalValues());

        Assert.Throws<DomainException>(() => batch.AddRow("Ramana", 2, new ImportRowOriginalValues()));
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("zz4e1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f")]
    public void File_hash_must_be_sha256_hex(string fileHash)
    {
        Assert.Throws<DomainException>(() => new ImportBatch("file.xlsx", fileHash, UploadedAt));
    }

    [Fact]
    public void Upload_time_must_be_utc()
    {
        Assert.Throws<DomainException>(() =>
            new ImportBatch("file.xlsx", null, new DateTime(2026, 3, 18, 8, 0, 0, DateTimeKind.Unspecified)));
    }

    private static ImportBatch NewBatch() => new("file.xlsx", fileHash: null, UploadedAt);
}
