using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain;
using BaxOrders.Domain.Imports;
using static BaxOrders.UnitTests.Imports.ImportTestData;

namespace BaxOrders.UnitTests.Imports;

/// <summary>
/// Row-level corrections. The workbook value is immutable: a correction only says what the cell should have said,
/// and everything downstream — keys, matching, duplicates — follows the effective value from there.
/// </summary>
public sealed class ImportRowCorrectionTests
{
    [Fact]
    public void A_correction_never_touches_the_workbook_value()
    {
        var row = Staged((ImportField.Location, "Təhvil verdi"));

        row.SetCorrection(ImportCorrectionField.Location, "  Dədə Qorqud  ");

        Assert.Equal("Təhvil verdi", row.OriginalLocationName);
        Assert.Equal("Təhvil verdi", row.Source(ImportCorrectionField.Location));
        Assert.Equal("Dədə Qorqud", row.Effective(ImportCorrectionField.Location));
        Assert.Equal("Dədə Qorqud", EffectiveRowValues.Of(row).Text(ImportField.Location));
    }

    [Fact]
    public void The_source_keys_follow_the_effective_value()
    {
        var row = Staged((ImportField.Location, "Təhvil verdi"), (ImportField.Supplier, "Ramana"));

        Assert.Equal(N("təhvil verdi"), row.NormalizedLocationName);

        row.SetCorrection(ImportCorrectionField.Location, "H.Ə.M");
        Assert.Equal(N("H.Ə.M"), row.NormalizedLocationName);

        // A category path is rebuilt from all three levels.
        row.SetCorrection(ImportCorrectionField.MiddleCategory, "Başqa orta");
        Assert.Contains(N("Başqa orta"), row.NormalizedCategoryPath);

        row.RemoveCorrection(ImportCorrectionField.Location);
        Assert.Equal(N("təhvil verdi"), row.NormalizedLocationName);
    }

    [Fact]
    public void A_corrected_row_is_matched_by_the_corrected_value()
    {
        var row = Staged((ImportField.Location, "Təhvil verdi"));

        var before = ImportRowEvaluator.Evaluate(EffectiveRowValues.Of(row), TestCatalog());
        Assert.Null(before.Matches.LocationId);
        Assert.Contains(before.Issues, issue => issue.IssueType == ImportIssueType.UnknownLocation);

        row.SetCorrection(ImportCorrectionField.Location, "H.Ə.M");

        var after = ImportRowEvaluator.Evaluate(EffectiveRowValues.Of(row), TestCatalog());
        Assert.Equal(HemLocationId, after.Matches.LocationId);
        Assert.DoesNotContain(after.Issues, issue => issue.IssueType == ImportIssueType.UnknownLocation);
    }

    [Fact]
    public void One_cell_carries_one_correction()
    {
        var row = Staged();

        var first = row.SetCorrection(ImportCorrectionField.Quantity, "12");
        var second = row.SetCorrection(ImportCorrectionField.Quantity, "15");

        Assert.Same(first, second);
        Assert.Equal("15", Assert.Single(row.Corrections).CorrectedValue);
        Assert.Equal("15", row.Effective(ImportCorrectionField.Quantity));
    }

    [Fact]
    public void A_correction_needs_a_value()
    {
        var row = Staged();

        Assert.Throws<DomainException>(() => row.SetCorrection(ImportCorrectionField.Location, "   "));
        Assert.Throws<DomainException>(() => row.SetCorrection(ImportCorrectionField.Location, new string('x', 1001)));
        Assert.Empty(row.Corrections);
    }

    [Fact]
    public void Reverting_a_correction_that_is_not_there_changes_nothing()
    {
        var row = Staged();

        Assert.Null(row.RemoveCorrection(ImportCorrectionField.Supplier));
    }

    [Fact]
    public void An_excluded_row_keeps_everything_and_only_stops_counting()
    {
        var row = Staged();
        row.SetCorrection(ImportCorrectionField.Location, "H.Ə.M");
        var excludedAt = new DateTime(2026, 9, 21, 10, 0, 0, DateTimeKind.Utc);

        row.Exclude("Anbar sətri, sifariş deyil", excludedAt);

        Assert.True(row.IsExcluded);
        Assert.Equal(("Anbar sətri, sifariş deyil", excludedAt), (row.ExclusionReason, row.ExcludedAtUtc));
        Assert.Equal("Makaron mop", row.OriginalProductName);
        Assert.Single(row.Corrections);

        row.Include();

        Assert.False(row.IsExcluded);
        Assert.Null(row.ExclusionReason);

        // The corrections survive, so nobody has to type them again.
        Assert.Single(row.Corrections);
    }

    [Fact]
    public void Excluding_a_row_needs_a_reason()
    {
        var row = Staged();

        Assert.Throws<DomainException>(() => row.Exclude("  ", DateTime.UtcNow));
        Assert.False(row.IsExcluded);
    }

    [Fact]
    public void A_cell_Excel_turned_into_a_date_is_reported_until_it_is_corrected()
    {
        // Rows like these exist in the real workbook: the author's size became a date.
        var row = Staged((ImportField.SpecificationValue, "2026-02-01"));
        var values = EffectiveRowValues.Of(row);

        Assert.True(values.StoredAsDate(ImportField.SpecificationValue));
        Assert.Contains(
            ImportRowEvaluator.Evaluate(values, TestCatalog()).Issues,
            issue => issue.IssueType == ImportIssueType.Other && issue.Message.Contains("stored this cell as a date"));

        row.SetCorrection(ImportCorrectionField.SpecificationValue, "1x5");

        Assert.False(EffectiveRowValues.Of(row).StoredAsDate(ImportField.SpecificationValue));
        Assert.DoesNotContain(
            ImportRowEvaluator.Evaluate(EffectiveRowValues.Of(row), TestCatalog()).Issues,
            issue => issue.Message.Contains("stored this cell as a date"));
    }

    [Fact]
    public void The_duplicate_fingerprint_follows_the_effective_values()
    {
        var first = Staged();
        var second = Staged();

        Assert.Equal(Fingerprint(first), Fingerprint(second));

        second.SetCorrection(ImportCorrectionField.Quantity, "11");

        Assert.NotEqual(Fingerprint(first), Fingerprint(second));
    }

    [Fact]
    public void A_staged_row_reads_the_same_values_as_the_workbook_row_it_came_from()
    {
        var source = Row();
        var staged = Staged();

        foreach (var field in Enum.GetValues<ImportField>())
        {
            Assert.Equal(source.Text(field), EffectiveRowValues.Of(staged).Text(field));
        }
    }

    private static string? Fingerprint(ImportRow row)
    {
        var values = EffectiveRowValues.Of(row);
        return DuplicateRowDetector.Fingerprint(values, ImportRowEvaluator.Evaluate(values, TestCatalog()));
    }

    /// <summary>A staged row built from the same synthetic workbook row the other tests use.</summary>
    private static ImportRow Staged(params (ImportField Field, object? Value)[] overrides)
    {
        var source = Row(overrides);
        var batch = new ImportBatch("file.xlsx", null, new DateTime(2026, 9, 21, 8, 0, 0, DateTimeKind.Utc));
        batch.StartParsing();
        return batch.AddRow(source.SheetName, source.RowNumber, source.ToOriginalValues([]));
    }
}
