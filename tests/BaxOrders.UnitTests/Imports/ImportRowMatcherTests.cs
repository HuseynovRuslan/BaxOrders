using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using static BaxOrders.UnitTests.Imports.ImportTestData;

namespace BaxOrders.UnitTests.Imports;

public sealed class ImportRowMatcherTests
{
    [Fact]
    public void A_batch_decision_resolves_a_value_the_catalog_does_not_know()
    {
        var input = MatchingInput.From(Row((ImportField.Supplier, "Green Gardem")));
        var resolutions = Resolutions((ImportResolutionKind.Supplier, "green gardem", 55));

        var result = ImportRowMatcher.Match(input, TestCatalog(), resolutions);

        Assert.Equal(55, result.Matches.SupplierId);
        Assert.Empty(result.Issues);
    }

    [Fact]
    public void A_batch_decision_settles_an_ambiguous_value()
    {
        var catalog = TestCatalog();
        catalog.Suppliers.Add(N("Cleanfix"), 10);
        catalog.Suppliers.Add(N("Cleanfix"), 11);
        var input = MatchingInput.From(Row((ImportField.Supplier, "Cleanfix")));

        var result = ImportRowMatcher.Match(input, catalog, Resolutions((ImportResolutionKind.Supplier, "cleanfix", 11)));

        Assert.Equal(11, result.Matches.SupplierId);
        Assert.DoesNotContain(result.Issues, issue => issue.IssueType == ImportIssueType.AmbiguousMatch);
    }

    [Fact]
    public void An_order_unit_decision_also_identifies_the_variant()
    {
        var catalog = TestCatalog();
        catalog.AddVariant(MopProductId, ProductVariantKey.Create("50", "CM", null, "PACK"), 2000);
        var input = MatchingInput.From(Row((ImportField.OrderUnit, "kv")));

        var result = ImportRowMatcher.Match(input, catalog, Resolutions((ImportResolutionKind.OrderUnit, "kv", PackUnitId)));

        Assert.Equal(PackUnitId, result.Matches.OrderUnitId);
        Assert.Equal(2000, result.Matches.ProductVariantId);
        Assert.Empty(result.Issues);
    }

    [Fact]
    public void Specification_and_order_units_are_decided_separately()
    {
        var input = MatchingInput.From(Row((ImportField.SpecificationUnit, "lik")));

        var result = ImportRowMatcher.Match(input, TestCatalog(), Resolutions((ImportResolutionKind.SpecificationUnit, "lik", CentimeterUnitId)));

        Assert.Equal(CentimeterUnitId, result.Matches.SpecificationUnitId);
        Assert.Equal(PiecesUnitId, result.Matches.OrderUnitId);
        Assert.Equal(MopVariantId, result.Matches.ProductVariantId);
    }

    [Fact]
    public void A_category_path_decision_resolves_the_whole_path()
    {
        var input = MatchingInput.From(Row((ImportField.MainCategory, "Usta")));
        var key = ImportSourceKeys.CategoryPath("Usta", "Təmizlik ləvazimatı", "Döşəmə təmizlik ləvazimatı")!;

        var result = ImportRowMatcher.Match(input, TestCatalog(), Resolutions((ImportResolutionKind.CategoryPath, key, 42)));

        Assert.Equal(42, result.Matches.CategoryId);
        Assert.DoesNotContain(result.Issues, issue => issue.IssueType == ImportIssueType.UnknownCategory);
    }

    [Fact]
    public void Matching_issues_are_tagged_so_they_can_be_rebuilt()
    {
        var result = ImportRowMatcher.Match(MatchingInput.From(Row((ImportField.Location, "Naməlum obyekt"))), TestCatalog(), ImportResolutionSet.Empty);

        Assert.All(result.Issues, issue => Assert.Equal(ImportIssueOrigin.Matching, issue.Origin));
        Assert.Contains(result.Issues, issue => issue.IssueType == ImportIssueType.UnknownLocation);
    }

    [Fact]
    public void A_staged_row_matches_exactly_like_the_workbook_row_it_came_from()
    {
        var source = Row((ImportField.Supplier, " Cleanfix MMC "));
        var batch = new ImportBatch("file.xlsx", null, new DateTime(2026, 9, 21, 8, 0, 0, DateTimeKind.Utc));
        batch.StartParsing();
        var staged = batch.AddRow(source.SheetName, source.RowNumber, source.ToOriginalValues([]));

        var fromWorkbook = ImportRowMatcher.Match(MatchingInput.From(source), TestCatalog(), ImportResolutionSet.Empty);
        var fromStaging = ImportRowMatcher.Match(MatchingInput.From(staged), TestCatalog(), ImportResolutionSet.Empty);

        Assert.Equal(fromWorkbook.Matches, fromStaging.Matches);
        Assert.Equal(fromWorkbook.Issues.Count, fromStaging.Issues.Count);
    }

    [Fact]
    public void A_word_in_the_Vahid_column_that_is_not_a_unit_becomes_a_descriptor()
    {
        var input = MatchingInput.From(Row((ImportField.SpecificationValue, "28d"), (ImportField.SpecificationUnit, "diş")));
        var resolutions = NotAUnit((ImportResolutionKind.SpecificationUnit, "diş"));

        var result = ImportRowMatcher.Match(input, TestCatalog(), resolutions);

        Assert.Equal("diş", result.Matches.SpecificationDescriptor);
        Assert.Null(result.Matches.SpecificationUnitId);
        Assert.DoesNotContain(result.Issues, issue => issue.IssueType == ImportIssueType.UnknownUnit);
    }

    [Fact]
    public void A_descriptor_keeps_the_variant_apart_from_the_plain_number()
    {
        var withDescriptor = ImportRowMatcher.Match(
            MatchingInput.From(Row((ImportField.SpecificationValue, "28d"), (ImportField.SpecificationUnit, "diş"))),
            TestCatalog(),
            NotAUnit((ImportResolutionKind.SpecificationUnit, "diş")));

        var plain = ImportRowMatcher.Match(
            MatchingInput.From(Row((ImportField.SpecificationValue, "28d"), (ImportField.SpecificationUnit, null))),
            TestCatalog(),
            ImportResolutionSet.Empty);

        Assert.NotEqual(plain.Matches.VariantSourceKey, withDescriptor.Matches.VariantSourceKey);
        Assert.NotNull(withDescriptor.Matches.VariantSourceKey);
    }

    [Fact]
    public void A_missing_order_unit_still_blocks_the_row()
    {
        var input = MatchingInput.From(Row((ImportField.OrderUnit, null)));

        var result = ImportRowMatcher.Match(input, TestCatalog(), ImportResolutionSet.Empty);

        Assert.Contains(result.Issues, issue =>
            issue.IssueType == ImportIssueType.MissingRequiredValue && issue.Severity == IssueSeverity.Error);
        Assert.Null(result.Matches.VariantSourceKey);
    }

    [Fact]
    public void A_cell_reviewed_as_empty_on_purpose_carries_a_unitless_variant()
    {
        var input = MatchingInput.From(Row((ImportField.OrderUnit, null))) with { OrderUnitExplicitlyEmpty = true };

        var result = ImportRowMatcher.Match(input, TestCatalog(), ImportResolutionSet.Empty);

        // The cell is no longer a missing value, and the row reaches the variant stage like any other row:
        // the variant itself still has to be created through review, exactly as for a row with a unit.
        Assert.DoesNotContain(result.Issues, issue => issue.IssueType == ImportIssueType.MissingRequiredValue);
        Assert.Null(result.Matches.OrderUnitId);
        Assert.NotNull(result.Matches.VariantSourceKey);
    }

    [Fact]
    public void A_unitless_variant_is_not_the_same_as_one_ordered_in_pieces()
    {
        var unitless = ImportRowMatcher.Match(
            MatchingInput.From(Row((ImportField.OrderUnit, null))) with { OrderUnitExplicitlyEmpty = true },
            TestCatalog(),
            ImportResolutionSet.Empty);

        var pieces = ImportRowMatcher.Match(
            MatchingInput.From(Row((ImportField.OrderUnit, "ədəd"))),
            TestCatalog(),
            ImportResolutionSet.Empty);

        Assert.NotEqual(pieces.Matches.VariantSourceKey, unitless.Matches.VariantSourceKey);
    }

    [Fact]
    public void A_currency_in_the_order_unit_column_is_still_unknown_until_it_is_reviewed()
    {
        // AZN is money, not a unit. Nothing turns it into one on its own.
        var input = MatchingInput.From(Row((ImportField.OrderUnit, "azn")));

        var result = ImportRowMatcher.Match(input, TestCatalog(), ImportResolutionSet.Empty);

        Assert.Contains(result.Issues, issue => issue.IssueType == ImportIssueType.UnknownUnit);
        Assert.Null(result.Matches.OrderUnitId);
    }

    private static ImportResolutionSet Resolutions(params (ImportResolutionKind Kind, string SourceKey, long TargetId)[] resolutions) => new(resolutions);

    private static ImportResolutionSet NotAUnit(params (ImportResolutionKind Kind, string SourceKey)[] values) => new([], values);
}
