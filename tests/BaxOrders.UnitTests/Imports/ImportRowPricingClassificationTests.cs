using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Orders;
using static BaxOrders.UnitTests.Imports.ImportTestData;

namespace BaxOrders.UnitTests.Imports;

/// <summary>
/// A pricing classification made during import review (brief 16.1): who said a staged row with no price is bought or
/// supplied free, and when. It is set, changed and cleared by a person, and touches nothing else on the row.
/// </summary>
public sealed class ImportRowPricingClassificationTests
{
    private static readonly DateTime Monday = new(2026, 9, 28, 9, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime Tuesday = new(2026, 9, 29, 11, 30, 0, DateTimeKind.Utc);

    private static readonly WorkflowActor Leyla = WorkflowActor.User(Guid.NewGuid(), "Leyla Koordinator");
    private static readonly WorkflowActor Rauf = WorkflowActor.User(Guid.NewGuid(), "Rauf Admin");

    [Fact]
    public void An_unclassified_row_says_nothing()
    {
        var row = Unpriced();

        Assert.Equal((null, null, null, null),
            (row.PricingClassification, row.PricingClassifiedByUserId, row.PricingClassifiedByDisplayName, row.PricingClassifiedAtUtc));
    }

    [Theory]
    [InlineData(PricingMode.PriceRequired)]
    [InlineData(PricingMode.InternalFreeSupply)]
    public void Classifying_records_the_answer_who_gave_it_and_when(PricingMode mode)
    {
        var row = Unpriced();

        Assert.True(row.ClassifyPricing(mode, Leyla, Monday));

        Assert.Equal(mode, row.PricingClassification);
        Assert.Equal(Leyla.UserId, row.PricingClassifiedByUserId);
        Assert.Equal("Leyla Koordinator", row.PricingClassifiedByDisplayName);
        Assert.Equal(Monday, row.PricingClassifiedAtUtc);
    }

    [Fact]
    public void Saying_the_same_again_changes_nothing_not_even_the_person_or_the_time()
    {
        var row = Unpriced();
        row.ClassifyPricing(PricingMode.InternalFreeSupply, Leyla, Monday);

        Assert.False(row.ClassifyPricing(PricingMode.InternalFreeSupply, Rauf, Tuesday));

        Assert.Equal(PricingMode.InternalFreeSupply, row.PricingClassification);
        Assert.Equal(Leyla.UserId, row.PricingClassifiedByUserId);
        Assert.Equal("Leyla Koordinator", row.PricingClassifiedByDisplayName);
        Assert.Equal(Monday, row.PricingClassifiedAtUtc);
    }

    [Fact]
    public void Changing_the_answer_makes_the_new_person_answerable()
    {
        var row = Unpriced();
        row.ClassifyPricing(PricingMode.InternalFreeSupply, Leyla, Monday);

        Assert.True(row.ClassifyPricing(PricingMode.PriceRequired, Rauf, Tuesday));

        Assert.Equal(PricingMode.PriceRequired, row.PricingClassification);
        Assert.Equal(Rauf.UserId, row.PricingClassifiedByUserId);
        Assert.Equal("Rauf Admin", row.PricingClassifiedByDisplayName);
        Assert.Equal(Tuesday, row.PricingClassifiedAtUtc);
    }

    [Fact]
    public void Clearing_takes_all_of_it_away_and_clearing_again_does_nothing()
    {
        var row = Unpriced();
        row.ClassifyPricing(PricingMode.PriceRequired, Leyla, Monday);

        Assert.True(row.ClearPricingClassification());
        Assert.Equal((null, null, null, null),
            (row.PricingClassification, row.PricingClassifiedByUserId, row.PricingClassifiedByDisplayName, row.PricingClassifiedAtUtc));

        Assert.False(row.ClearPricingClassification());
        Assert.Null(row.PricingClassification);
    }

    [Fact]
    public void Clearing_a_row_nobody_classified_does_nothing()
    {
        Assert.False(Unpriced().ClearPricingClassification());
    }

    [Fact]
    public void Unresolved_is_never_stored_it_is_what_an_unclassified_row_already_is()
    {
        var row = Unpriced();

        var refused = Assert.Throws<DomainException>(() => row.ClassifyPricing(PricingMode.Unresolved, Leyla, Monday));

        Assert.Contains("not a classification", refused.Message, StringComparison.Ordinal);
        Assert.Null(row.PricingClassification);
    }

    [Fact]
    public void A_mode_the_system_does_not_know_is_refused()
    {
        var row = Unpriced();

        Assert.Throws<DomainException>(() => row.ClassifyPricing((PricingMode)99, Leyla, Monday));
        Assert.Null(row.PricingClassification);
    }

    [Fact]
    public void Nobody_signed_in_cannot_classify()
    {
        var row = Unpriced();

        var refused = Assert.Throws<DomainException>(() =>
            row.ClassifyPricing(PricingMode.InternalFreeSupply, WorkflowActor.System(), Monday));

        Assert.Equal("A pricing decision is made by a signed-in person.", refused.Message);
        Assert.Null(row.PricingClassification);
    }

    [Theory]
    [InlineData(PricingMode.PriceRequired)]
    [InlineData(PricingMode.InternalFreeSupply)]
    public void A_row_with_a_price_has_nothing_to_classify(PricingMode mode)
    {
        var row = Unpriced();
        row.SetParsedValues(10m, 4.50m, 45m, new DateOnly(2026, 3, 1));

        Assert.Throws<DomainException>(() => row.ClassifyPricing(mode, Leyla, Monday));
        Assert.Null(row.PricingClassification);
    }

    [Fact]
    public void A_classification_kept_on_a_row_that_later_got_a_price_stays_where_it_was()
    {
        var row = Unpriced();
        row.ClassifyPricing(PricingMode.InternalFreeSupply, Leyla, Monday);

        // A correction gives the row a price; the classification is kept, and nothing reads it any more.
        row.SetParsedValues(10m, 4.50m, 45m, new DateOnly(2026, 3, 1));

        Assert.Equal(PricingMode.InternalFreeSupply, row.PricingClassification);
    }

    [Fact]
    public void Classifying_touches_no_value_issue_match_correction_exclusion_or_status()
    {
        var row = Unpriced();
        row.AddIssue(ImportIssueType.MissingPrice, IssueSeverity.Warning, ImportIssueOrigin.Parsing, "Qiymət yoxdur.");
        row.ApplyMatches(new ImportRowMatches(
            LocationId: HemLocationId,
            SupplierId: CleanfixSupplierId,
            ResponsiblePersonId: EldarPersonId,
            CategoryId: FloorCategoryId,
            ProductId: MopProductId,
            ProductVariantId: MopVariantId,
            OrderUnitId: PiecesUnitId,
            SpecificationUnitId: CentimeterUnitId));
        row.SetCorrection(ImportCorrectionField.Supplier, "Qala baza");
        row.RefreshValidationStatus();
        var before = Snapshot(row);

        row.ClassifyPricing(PricingMode.InternalFreeSupply, Leyla, Monday);
        Assert.Equal(before, Snapshot(row));

        row.ClearPricingClassification();
        Assert.Equal(before, Snapshot(row));
    }

    private static string Snapshot(ImportRow row) => string.Join('|',
        row.ParsedQuantity, row.ParsedUnitPrice, row.ParsedLineTotal, row.ParsedRequestPeriod,
        row.MatchedLocationId, row.MatchedSupplierId, row.MatchedProductId, row.MatchedProductVariantId,
        row.MatchedResponsiblePersonId, row.MatchedCategoryId, row.MatchedOrderUnitId, row.MatchedSpecificationUnitId,
        row.NormalizedSupplierName, row.Effective(ImportCorrectionField.Supplier), row.OriginalSupplierName,
        row.IsExcluded, row.ValidationStatus,
        string.Join(',', row.Issues.Select(issue => issue.IssueType)),
        string.Join(',', row.Corrections.Select(correction => $"{correction.Field}={correction.CorrectedValue}")));

    /// <summary>A staged row whose price cell was blank, parsed as the importer parses it.</summary>
    private static ImportRow Unpriced()
    {
        var source = Row((ImportField.UnitPrice, null), (ImportField.LineTotal, null));
        var batch = new ImportBatch("file.xlsx", null, new DateTime(2026, 9, 21, 8, 0, 0, DateTimeKind.Utc));
        batch.StartParsing();
        var row = batch.AddRow(source.SheetName, source.RowNumber, source.ToOriginalValues([]));
        row.SetParsedValues(10m, null, null, new DateOnly(2026, 3, 1));
        return row;
    }
}
