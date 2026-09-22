using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using static BaxOrders.UnitTests.Imports.ImportTestData;

namespace BaxOrders.UnitTests.Imports;

public sealed class ImportRowEvaluatorTests
{
    [Fact]
    public void Fully_known_row_is_parsed_and_matched_without_issues()
    {
        var result = ImportRowEvaluator.Evaluate(Row(), TestCatalog());

        Assert.Empty(result.Issues);
        Assert.Equal(43m, result.Quantity);
        Assert.Equal(4.5m, result.UnitPrice);
        Assert.Equal(new DateOnly(2026, 3, 1), result.RequestPeriod);
        Assert.Equal(
            new ImportRowMatches(
                HemLocationId, CleanfixSupplierId, EldarPersonId, FloorCategoryId, MopProductId, MopVariantId, PiecesUnitId, CentimeterUnitId,
                ImportSourceKeys.ProductVariant(MopProductId, ProductVariantKey.Create("50", "CM", null, "PCS"))),
            result.Matches);
    }

    [Fact]
    public void Spacing_and_case_variations_still_match()
    {
        var result = ImportRowEvaluator.Evaluate(
            Row((ImportField.Location, "h.ə.m "), (ImportField.OrderUnit, " Ədəd "), (ImportField.ResponsiblePerson, " ELDAR"),
                (ImportField.Supplier, "Cleanfix  MMC ")),
            TestCatalog());

        Assert.Empty(result.Issues);
    }

    [Fact]
    public void Missing_price_is_a_warning_and_keeps_the_quantity()
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.UnitPrice, null), (ImportField.LineTotal, null)), TestCatalog());

        var issue = Assert.Single(result.Issues);
        Assert.Equal((ImportIssueType.MissingPrice, IssueSeverity.Warning), (issue.IssueType, issue.Severity));
        Assert.Equal(43m, result.Quantity);
        Assert.Null(result.UnitPrice);
    }

    [Theory]
    [InlineData("abc")]
    [InlineData(-1d)]
    public void Invalid_present_price_is_a_warning_and_is_never_replaced_by_zero(object price)
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.UnitPrice, price)), TestCatalog());

        var issue = Assert.Single(result.Issues);
        Assert.Equal((ImportIssueType.InvalidPrice, IssueSeverity.Warning), (issue.IssueType, issue.Severity));
        Assert.Null(result.UnitPrice);
        Assert.Equal(43m, result.Quantity);
        Assert.False(ImportIssueRules.IsBlocking(issue.IssueType, issue.Severity));
    }

    [Fact]
    public void Text_decimal_quantity_is_accepted()
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.Quantity, "43,5"), (ImportField.LineTotal, null)), TestCatalog());

        Assert.Equal(43.5m, result.Quantity);
        Assert.Empty(result.Issues);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(0d)]
    [InlineData(1.2345d)]
    [InlineData("çox")]
    public void Missing_zero_imprecise_or_unreadable_quantity_is_an_error(object? quantity)
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.Quantity, quantity)), TestCatalog());

        Assert.Contains(result.Issues, i => i is { IssueType: ImportIssueType.InvalidQuantity, Severity: IssueSeverity.Error });
        Assert.Null(result.Quantity);
    }

    [Fact]
    public void Total_within_tolerance_is_accepted()
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.LineTotal, 193.51d)), TestCatalog());

        Assert.DoesNotContain(result.Issues, i => i.IssueType == ImportIssueType.LineTotalMismatch);
    }

    [Fact]
    public void Total_mismatch_is_a_warning_with_both_totals_and_the_difference()
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.LineTotal, 190d)), TestCatalog());

        var issue = Assert.Single(result.Issues);
        Assert.Equal((ImportIssueType.LineTotalMismatch, IssueSeverity.Warning), (issue.IssueType, issue.Severity));
        Assert.Contains("190", issue.Message);
        Assert.Contains("193.5", issue.Message);
        Assert.Contains("-3.5", issue.Message);
        Assert.Equal(190m, result.LineTotal);
    }

    [Fact]
    public void Missing_total_is_not_compared()
    {
        Assert.Empty(ImportRowEvaluator.Evaluate(Row((ImportField.LineTotal, null)), TestCatalog()).Issues);
    }

    [Theory]
    [InlineData("01.03.2026")]
    [InlineData("2026-03-01")]
    public void Tarix_is_read_as_the_request_period(string tarix)
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.RequestDate, tarix)), TestCatalog());

        Assert.Equal(new DateOnly(2026, 3, 1), result.RequestPeriod);
        Assert.Empty(result.Issues);
    }

    [Fact]
    public void Tarix_on_another_day_becomes_its_month_with_an_info_note()
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.RequestDate, new DateTime(2026, 3, 18))), TestCatalog());

        Assert.Equal(new DateOnly(2026, 3, 1), result.RequestPeriod);
        var issue = Assert.Single(result.Issues);
        Assert.Equal((ImportIssueType.Other, IssueSeverity.Info, "Tarix"), (issue.IssueType, issue.Severity, issue.FieldName));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("18-mart")]
    public void Missing_or_unreadable_date_is_an_error(string? date)
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.RequestDate, date)), TestCatalog());

        Assert.Contains(result.Issues, i => i is { IssueType: ImportIssueType.InvalidDate, Severity: IssueSeverity.Error });
    }

    [Fact]
    public void Missing_product_name_is_an_error()
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.ProductName, "  ")), TestCatalog());

        Assert.Contains(result.Issues, i => i is { IssueType: ImportIssueType.MissingRequiredValue, Severity: IssueSeverity.Error, FieldName: "Malın adı" });
    }

    [Fact]
    public void Unknown_and_missing_location_are_errors()
    {
        var unknown = ImportRowEvaluator.Evaluate(Row((ImportField.Location, "Təhvil verdi")), TestCatalog());
        var missing = ImportRowEvaluator.Evaluate(Row((ImportField.Location, null)), TestCatalog());

        Assert.Contains(unknown.Issues, i => i is { IssueType: ImportIssueType.UnknownLocation, Severity: IssueSeverity.Error });
        Assert.Contains(missing.Issues, i => i is { IssueType: ImportIssueType.MissingRequiredValue, Severity: IssueSeverity.Error });
    }

    [Fact]
    public void Unit_alias_resolves_the_order_unit()
    {
        var catalog = TestCatalog();
        catalog.AddVariant(MopProductId, Domain.Catalog.ProductVariantKey.Create("50", "CM", null, "PACK"), 2000);

        var result = ImportRowEvaluator.Evaluate(Row((ImportField.OrderUnit, "paçqa")), catalog);

        Assert.Equal(2000, result.Matches.ProductVariantId);
    }

    [Fact]
    public void Packs_never_resolve_to_the_pieces_variant()
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.OrderUnit, "paçka")), TestCatalog());

        Assert.Equal(MopProductId, result.Matches.ProductId);
        Assert.Null(result.Matches.ProductVariantId);
        Assert.Contains(result.Issues, i => i is { IssueType: ImportIssueType.UnknownProductVariant, Severity: IssueSeverity.Warning });
    }

    [Fact]
    public void Unknown_order_unit_is_an_error()
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.OrderUnit, "kv")), TestCatalog());

        Assert.Contains(result.Issues, i => i is { IssueType: ImportIssueType.UnknownUnit, Severity: IssueSeverity.Error, FieldName: "Ö/v" });
    }

    [Fact]
    public void Unknown_specification_unit_is_a_warning_and_leaves_the_variant_open()
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.SpecificationUnit, "lik")), TestCatalog());

        Assert.Contains(result.Issues, i => i is { IssueType: ImportIssueType.UnknownUnit, Severity: IssueSeverity.Warning, FieldName: "Vahid" });
        Assert.Contains(result.Issues, i => i.IssueType == ImportIssueType.UnknownProductVariant);
        Assert.DoesNotContain(result.Issues, i => i.Severity == IssueSeverity.Error);
    }

    [Fact]
    public void Unknown_optional_identities_are_warnings_and_blank_ones_are_fine()
    {
        var unknown = ImportRowEvaluator.Evaluate(Row((ImportField.Supplier, "Azclean"), (ImportField.ResponsiblePerson, "Xəyal - Əbülfəz")), TestCatalog());
        var blank = ImportRowEvaluator.Evaluate(Row((ImportField.Supplier, null), (ImportField.ResponsiblePerson, "")), TestCatalog());

        Assert.Contains(unknown.Issues, i => i is { IssueType: ImportIssueType.UnknownSupplier, Severity: IssueSeverity.Warning });
        Assert.Contains(unknown.Issues, i => i is { IssueType: ImportIssueType.UnknownResponsiblePerson, Severity: IssueSeverity.Warning });
        Assert.Empty(blank.Issues);
    }

    [Fact]
    public void Unknown_product_is_a_blocking_warning()
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.ProductName, "Lapatka")), TestCatalog());

        var issue = Assert.Single(result.Issues);
        Assert.Equal((ImportIssueType.UnknownProduct, IssueSeverity.Warning), (issue.IssueType, issue.Severity));
        Assert.True(ImportIssueRules.IsBlocking(issue.IssueType, issue.Severity));
    }

    [Fact]
    public void Canonical_supplier_and_foreign_alias_make_the_supplier_ambiguous()
    {
        var catalog = TestCatalog();
        catalog.Suppliers.Add(N("Cleanfix"), 11);
        catalog.Suppliers.Add(N("Cleanfix"), CleanfixSupplierId);

        var result = ImportRowEvaluator.Evaluate(Row((ImportField.Supplier, "Cleanfix")), catalog);

        Assert.Null(result.Matches.SupplierId);
        Assert.Contains(result.Issues, i => i is { IssueType: ImportIssueType.AmbiguousMatch, Severity: IssueSeverity.Warning, FieldName: "Şirkət" });
    }

    [Fact]
    public void Ambiguous_location_and_product_block_the_row_as_errors()
    {
        var catalog = TestCatalog();
        catalog.Locations.Add(N("H.Ə.M"), 99);
        catalog.Products.Add(N("Makaron mop"), 101);

        var result = ImportRowEvaluator.Evaluate(Row(), catalog);

        Assert.Equal(2, result.Issues.Count(i => i is { IssueType: ImportIssueType.AmbiguousMatch, Severity: IssueSeverity.Error }));
        Assert.Null(result.Matches.LocationId);
        Assert.Null(result.Matches.ProductId);
    }

    [Fact]
    public void Category_is_matched_only_through_its_parent_path()
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.MainCategory, "Usta")), TestCatalog());

        Assert.Null(result.Matches.CategoryId);
        Assert.Contains(result.Issues, i => i is { IssueType: ImportIssueType.UnknownCategory, Severity: IssueSeverity.Warning });
    }

    [Fact]
    public void Specification_stored_as_a_date_is_flagged()
    {
        var result = ImportRowEvaluator.Evaluate(Row((ImportField.SpecificationValue, new DateTime(2026, 5, 1))), TestCatalog());

        Assert.Contains(result.Issues, i => i is { IssueType: ImportIssueType.Other, FieldName: "Ölçü" });
    }
}
