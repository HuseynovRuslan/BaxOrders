using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Parsing;
using static BaxOrders.UnitTests.Imports.ImportTestData;

namespace BaxOrders.UnitTests.Imports;

public sealed class DuplicateRowDetectorTests
{
    [Fact]
    public void Identical_business_lines_are_flagged_against_each_other()
    {
        var duplicates = Detect(RowAt(4), RowAt(9), RowAt(12, (ImportField.Quantity, 44d)));

        Assert.Equal([9], duplicates[4]);
        Assert.Equal([4], duplicates[9]);
        Assert.False(duplicates.ContainsKey(12));
    }

    [Fact]
    public void Cosmetic_differences_do_not_hide_a_duplicate()
    {
        var duplicates = Detect(
            RowAt(4),
            RowAt(5, (ImportField.Location, " h.ə.m "), (ImportField.Quantity, "43,0"), (ImportField.Supplier, "CLEANFIX MMC"),
                (ImportField.SequenceNumber, 2d), (ImportField.LineTotal, null)));

        Assert.True(duplicates.ContainsKey(4));
    }

    [Theory]
    [InlineData(ImportField.Location, "Dədə Qorqud")]
    [InlineData(ImportField.OrderUnit, "paçka")]
    [InlineData(ImportField.UnitPrice, 5d)]
    [InlineData(ImportField.Supplier, "Azclean")]
    [InlineData(ImportField.SpecificationValue, 60d)]
    [InlineData(ImportField.ResponsiblePerson, "Elmir")]
    [InlineData(ImportField.SubCategory, "Əlcək")]
    [InlineData(ImportField.RequestDate, "01.04.2026")]
    public void Same_product_with_a_different_business_field_is_not_a_duplicate(ImportField field, object value)
    {
        Assert.Empty(Detect(RowAt(4), RowAt(5, (field, value))));
    }

    [Fact]
    public void Rows_without_a_valid_quantity_or_date_are_never_duplicates()
    {
        Assert.Empty(Detect(RowAt(4, (ImportField.Quantity, null)), RowAt(5, (ImportField.Quantity, null))));
        Assert.Empty(Detect(RowAt(4, (ImportField.RequestDate, "x")), RowAt(5, (ImportField.RequestDate, "x"))));
    }

    private static IReadOnlyDictionary<int, IReadOnlyList<int>> Detect(params SourceRow[] rows)
    {
        var catalog = TestCatalog();
        return DuplicateRowDetector.FindDuplicates(
            rows.Select(row => (row.RowNumber, DuplicateRowDetector.Fingerprint(row, ImportRowEvaluator.Evaluate(row, catalog)))));
    }
}
