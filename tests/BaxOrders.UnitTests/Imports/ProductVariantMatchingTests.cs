using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using static BaxOrders.UnitTests.Imports.ImportTestData;

namespace BaxOrders.UnitTests.Imports;

/// <summary>
/// Variant identity during matching. A variant is built from the product and the unit codes a person decided on,
/// never from the raw cell text, so a row whose units are still unresolved keeps no variant at all.
/// </summary>
public sealed class ProductVariantMatchingTests
{
    private const long NewProductId = 777;

    [Fact]
    public void A_known_product_and_variant_need_no_decision()
    {
        var result = Match(Row());

        Assert.Equal((MopProductId, MopVariantId), (result.Matches.ProductId, result.Matches.ProductVariantId));
        Assert.Equal(ExpectedKey(MopProductId, "50", "CM", "PCS"), result.Matches.VariantSourceKey);
        Assert.Empty(result.Issues);
    }

    [Fact]
    public void An_unknown_product_has_no_variant_to_review()
    {
        var result = Match(Row((ImportField.ProductName, "Naməlum mal")));

        Assert.Null(result.Matches.ProductId);
        Assert.Null(result.Matches.VariantSourceKey);
        Assert.Contains(result.Issues, issue => issue.IssueType == ImportIssueType.UnknownProduct);
        Assert.DoesNotContain(result.Issues, issue => issue.IssueType == ImportIssueType.UnknownProductVariant);
    }

    [Fact]
    public void The_variant_waits_for_the_order_unit_and_says_so()
    {
        var result = Match(Row((ImportField.OrderUnit, "kv")));

        Assert.Equal(MopProductId, result.Matches.ProductId);
        Assert.Null(result.Matches.VariantSourceKey);
        Assert.Null(result.Matches.ProductVariantId);

        var reason = Assert.Single(result.Issues, issue => issue.IssueType == ImportIssueType.UnknownProductVariant);
        Assert.Contains("order unit", reason.Message);
        Assert.Equal("Ö/v", reason.FieldName);
    }

    [Fact]
    public void The_variant_waits_for_the_specification_unit_and_says_so()
    {
        var result = Match(Row((ImportField.SpecificationUnit, "lik")));

        Assert.Equal(MopProductId, result.Matches.ProductId);
        Assert.Null(result.Matches.VariantSourceKey);

        var reason = Assert.Single(result.Issues, issue => issue.IssueType == ImportIssueType.UnknownProductVariant);
        Assert.Contains("specification unit", reason.Message);
        Assert.Equal("Vahid", reason.FieldName);
    }

    [Fact]
    public void Spellings_that_resolve_to_one_unit_produce_one_variant()
    {
        // "ədəd" is the unit's own name, "əd" an approved alias, "pcs" its code: one canonical unit, one variant.
        var keys = new[] { "ədəd", "əd", "PCS" }
            .Select(spelling => Match(Row((ImportField.OrderUnit, spelling))).Matches.VariantSourceKey)
            .Distinct()
            .ToList();

        Assert.Equal([ExpectedKey(MopProductId, "50", "CM", "PCS")], keys);
    }

    [Fact]
    public void A_different_order_unit_is_a_different_variant()
    {
        var pieces = Match(Row((ImportField.OrderUnit, "ədəd"))).Matches.VariantSourceKey;
        var packs = Match(Row((ImportField.OrderUnit, "paçka"))).Matches.VariantSourceKey;

        Assert.NotEqual(pieces, packs);
    }

    [Fact]
    public void A_product_decision_makes_the_variant_reviewable()
    {
        var result = Match(
            Row((ImportField.ProductName, "Yeni mal")),
            (ImportResolutionKind.Product, N("Yeni mal"), NewProductId));

        Assert.Equal(NewProductId, result.Matches.ProductId);
        Assert.Null(result.Matches.ProductVariantId);
        Assert.Equal(ExpectedKey(NewProductId, "50", "CM", "PCS"), result.Matches.VariantSourceKey);
        Assert.Contains(result.Issues, issue => issue.IssueType == ImportIssueType.UnknownProductVariant);
    }

    [Fact]
    public void A_variant_decision_settles_the_row()
    {
        var sourceKey = ExpectedKey(NewProductId, "50", "CM", "PCS");

        var result = Match(
            Row((ImportField.ProductName, "Yeni mal")),
            (ImportResolutionKind.Product, N("Yeni mal"), NewProductId),
            (ImportResolutionKind.ProductVariant, sourceKey, 4242));

        Assert.Equal((NewProductId, (long?)4242), (result.Matches.ProductId, result.Matches.ProductVariantId));
        Assert.Equal(sourceKey, result.Matches.VariantSourceKey);
        Assert.DoesNotContain(result.Issues, issue => issue.IssueType == ImportIssueType.UnknownProductVariant);
    }

    [Fact]
    public void A_decision_of_another_batch_value_does_not_leak_into_this_variant()
    {
        // The same variant shape under a different product is a different source key.
        var otherKey = ExpectedKey(NewProductId, "50", "CM", "PCS");

        var result = Match(Row(), (ImportResolutionKind.ProductVariant, otherKey, 4242));

        Assert.Equal(MopVariantId, result.Matches.ProductVariantId);
    }

    [Fact]
    public void An_unknown_product_or_variant_blocks_the_import()
    {
        Assert.True(ImportIssueRules.IsBlocking(ImportIssueType.UnknownProduct, IssueSeverity.Warning));
        Assert.True(ImportIssueRules.IsBlocking(ImportIssueType.UnknownProductVariant, IssueSeverity.Warning));
    }

    [Fact]
    public void A_staged_row_produces_the_same_variant_key_as_the_workbook_row()
    {
        var source = Row((ImportField.ProductName, " Makaron   mop "));
        var batch = new ImportBatch("file.xlsx", null, new DateTime(2026, 9, 21, 8, 0, 0, DateTimeKind.Utc));
        batch.StartParsing();
        var staged = batch.AddRow(source.SheetName, source.RowNumber, source.ToOriginalValues([]));

        var fromWorkbook = ImportRowMatcher.Match(MatchingInput.From(source), TestCatalog(), ImportResolutionSet.Empty);
        var fromStaging = ImportRowMatcher.Match(MatchingInput.From(staged), TestCatalog(), ImportResolutionSet.Empty);

        Assert.Equal(fromWorkbook.Matches.VariantSourceKey, fromStaging.Matches.VariantSourceKey);
        Assert.Equal(ExpectedKey(MopProductId, "50", "CM", "PCS"), fromStaging.Matches.VariantSourceKey);
    }

    private static MatchingResult Match(SourceRow row, params (ImportResolutionKind Kind, string SourceKey, long TargetId)[] resolutions) =>
        ImportRowMatcher.Match(MatchingInput.From(row), TestCatalog(), new ImportResolutionSet(resolutions));

    private static string ExpectedKey(long productId, string? specification, string? specificationUnitCode, string orderUnitCode) =>
        ImportSourceKeys.ProductVariant(productId, ProductVariantKey.Create(specification, specificationUnitCode, null, orderUnitCode));
}
