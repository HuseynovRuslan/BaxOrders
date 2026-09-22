using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The two decisions a real workbook forced into the model: a word in the "Vahid" column that is not a unit of
/// measure, and a line that legitimately has no order unit. Every fixture is synthetic; no company workbook is
/// read, and the staged <c>Original*</c> values are expected to survive every operation.
/// </summary>
[Collection(SqlServerCollection.Name)]
public sealed class UnitlessAndDescriptorTests(SqlServerDatabaseFixture database)
{
    [SqlServerFact]
    public async Task A_word_that_is_not_a_unit_stops_blocking_without_becoming_one()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine(SpecificationValue: "28", SpecificationUnit: "diş"));
        var row = Assert.Single(await RowsAsync(db, batchId));

        Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownUnit);

        var unitsBefore = await db.UnitsOfMeasure.CountAsync();
        var result = await ResolutionService(db).MarkNotAUnitAsync(
            new MarkNotAUnitCommand(batchId, ImportResolutionKind.SpecificationUnit, "diş"), CancellationToken.None);

        Assert.Equal(ResolutionOutcome.Applied, result.Outcome);
        Assert.Equal(0, result.TargetId);
        Assert.False(result.AliasSaved);

        await using var check = database.CreateContext();

        // Nothing was invented: no unit, no alias, and the workbook value is still what the sheet said.
        Assert.Equal(unitsBefore, await check.UnitsOfMeasure.CountAsync());
        Assert.Empty(await check.UnitOfMeasureAliases.Where(alias => alias.NormalizedAlias == "diş").ToListAsync());

        var resolved = Assert.Single(await RowsAsync(check, batchId));
        Assert.Equal("diş", resolved.OriginalSpecificationUnit);
        Assert.Null(resolved.MatchedSpecificationUnitId);
        Assert.Equal("diş", resolved.SpecificationDescriptor);
        Assert.DoesNotContain(resolved.Issues, issue => issue.IssueType == ImportIssueType.UnknownUnit);
    }

    [SqlServerFact]
    public async Task The_descriptor_keeps_the_variant_apart_from_the_plain_number()
    {
        await using var db = database.CreateContext();
        var product = $"Sep {Unique()}";
        var batchId = await StageAsync(
            db,
            new OrderLine(Product: product, SpecificationValue: "28", SpecificationUnit: "diş"),
            new OrderLine(Product: product, SpecificationValue: "28"));

        var service = ResolutionService(db);
        await service.CreateProductAsync(
            new CreateProductCommand(batchId, TextNormalizer.Normalize(product), product, null, ResolutionScope.BatchOnly),
            CancellationToken.None);
        await service.MarkNotAUnitAsync(
            new MarkNotAUnitCommand(batchId, ImportResolutionKind.SpecificationUnit, "diş"), CancellationToken.None);

        await using var check = database.CreateContext();
        var rows = await RowsAsync(check, batchId);

        // Same product, same number, same order unit: only the descriptor tells the two variants apart.
        var keys = rows.Select(row => row.VariantSourceKey).Distinct().ToList();
        Assert.Equal(2, keys.Count);
        Assert.DoesNotContain(null, keys);
    }

    [SqlServerFact]
    public async Task The_suffix_forms_resolve_to_one_descriptor()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(
            db,
            new OrderLine(Product: "Şkurka", SpecificationValue: "100", SpecificationUnit: "lik"),
            new OrderLine(Product: "Şkurka", SpecificationValue: "100", SpecificationUnit: "luq"));

        var service = ResolutionService(db);
        await service.MarkNotAUnitAsync(new MarkNotAUnitCommand(batchId, ImportResolutionKind.SpecificationUnit, "lik"), CancellationToken.None);
        await service.MarkNotAUnitAsync(new MarkNotAUnitCommand(batchId, ImportResolutionKind.SpecificationUnit, "luq"), CancellationToken.None);

        await using var check = database.CreateContext();
        var rows = await RowsAsync(check, batchId);

        // Two spellings of one suffix: one descriptor, one variant identity, two untouched workbook values.
        Assert.Equal(["lik", "luq"], rows.Select(row => row.OriginalSpecificationUnit).Order().ToList());
        Assert.Equal(["lik"], rows.Select(row => row.SpecificationDescriptor).Distinct().ToList());
        Assert.Single(rows.Select(row => row.VariantSourceKey).Distinct());
    }

    [SqlServerFact]
    public async Task Marking_a_value_that_is_already_a_unit_is_refused()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine(SpecificationValue: "50", SpecificationUnit: "santimetr"));

        await Assert.ThrowsAsync<ConflictException>(() => ResolutionService(db).MarkNotAUnitAsync(
            new MarkNotAUnitCommand(batchId, ImportResolutionKind.SpecificationUnit, "santimetr"), CancellationToken.None));
    }

    [SqlServerFact]
    public async Task Marking_the_same_value_twice_changes_nothing()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine(SpecificationValue: "2", SpecificationUnit: "qat"));
        var command = new MarkNotAUnitCommand(batchId, ImportResolutionKind.SpecificationUnit, "qat");

        var first = await ResolutionService(db).MarkNotAUnitAsync(command, CancellationToken.None);
        var second = await ResolutionService(db).MarkNotAUnitAsync(command, CancellationToken.None);

        Assert.Equal(ResolutionOutcome.Applied, first.Outcome);
        Assert.Equal(ResolutionOutcome.AlreadyApplied, second.Outcome);
        Assert.Equal(first.ResolutionId, second.ResolutionId);

        await using var check = database.CreateContext();
        Assert.Single(await check.ImportResolutions.Where(item => item.ImportBatchId == batchId).ToListAsync());
    }

    [SqlServerFact]
    public async Task An_order_unit_cell_is_only_unitless_once_someone_says_so()
    {
        await using var db = database.CreateContext();
        var product = $"Təmir işləri {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Product: product, OrderUnit: null));
        var row = Assert.Single(await RowsAsync(db, batchId));

        // Until it is reviewed, an empty order unit is a missing value and blocks the row.
        Assert.Contains(row.Issues, issue =>
            issue.IssueType == ImportIssueType.MissingRequiredValue && issue.Severity == IssueSeverity.Error);
        Assert.Null(row.VariantSourceKey);

        await ResolutionService(db).CreateProductAsync(
            new CreateProductCommand(batchId, TextNormalizer.Normalize(product), product, null, ResolutionScope.BatchOnly),
            CancellationToken.None);
        await CorrectionService(db).ClearAsync(batchId, row.Id, ImportCorrectionField.OrderUnit, CancellationToken.None);

        await using var check = database.CreateContext();
        var reviewed = Assert.Single(await RowsAsync(check, batchId));

        // The row reaches the variant stage like any other; it simply has no order unit in its identity.
        Assert.DoesNotContain(reviewed.Issues, issue => issue.IssueType == ImportIssueType.MissingRequiredValue);
        Assert.Null(reviewed.MatchedOrderUnitId);
        Assert.NotNull(reviewed.VariantSourceKey);

        var correction = Assert.Single(reviewed.Corrections);
        Assert.True(correction.IsIntentionallyEmpty);
        Assert.Null(correction.CorrectedValue);
    }

    [SqlServerFact]
    public async Task A_currency_in_the_order_unit_column_never_becomes_a_unit()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine(Product: "Təmir işləri", OrderUnit: "azn"));
        var row = Assert.Single(await RowsAsync(db, batchId));

        Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownUnit);

        var unitsBefore = await db.UnitsOfMeasure.CountAsync();
        await CorrectionService(db).ClearAsync(batchId, row.Id, ImportCorrectionField.OrderUnit, CancellationToken.None);

        await using var check = database.CreateContext();
        var reviewed = Assert.Single(await RowsAsync(check, batchId));

        Assert.Equal(unitsBefore, await check.UnitsOfMeasure.CountAsync());
        Assert.Empty(await check.UnitsOfMeasure.Where(unit => unit.Code == "AZN").ToListAsync());

        // The sheet still says "azn"; only the effective value is empty.
        Assert.Equal("azn", reviewed.OriginalOrderUnit);
        Assert.Null(reviewed.MatchedOrderUnitId);
        Assert.DoesNotContain(reviewed.Issues, issue => issue.IssueType == ImportIssueType.UnknownUnit);
    }

    [SqlServerFact]
    public async Task Reverting_the_decision_puts_the_blocker_back()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine(OrderUnit: null));
        var row = Assert.Single(await RowsAsync(db, batchId));

        await CorrectionService(db).ClearAsync(batchId, row.Id, ImportCorrectionField.OrderUnit, CancellationToken.None);
        await CorrectionService(db).RevertAsync(batchId, row.Id, ImportCorrectionField.OrderUnit, CancellationToken.None);

        await using var check = database.CreateContext();
        var reverted = Assert.Single(await RowsAsync(check, batchId));

        Assert.Empty(reverted.Corrections);
        Assert.Contains(reverted.Issues, issue => issue.IssueType == ImportIssueType.MissingRequiredValue);
    }

    [SqlServerFact]
    public async Task Only_the_order_unit_may_be_left_empty_on_purpose()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine(Location: "Təhvil verdi"));
        var row = Assert.Single(await RowsAsync(db, batchId));

        await Assert.ThrowsAsync<ValidationException>(() => CorrectionService(db).ClearAsync(
            batchId, row.Id, ImportCorrectionField.Location, CancellationToken.None));
    }

    [SqlServerFact]
    public async Task Unrelated_problems_of_the_row_are_left_alone()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine(OrderUnit: null, Price: null, Supplier: "Bilinməyən MMC"));
        var row = Assert.Single(await RowsAsync(db, batchId));

        await CorrectionService(db).ClearAsync(batchId, row.Id, ImportCorrectionField.OrderUnit, CancellationToken.None);

        await using var check = database.CreateContext();
        var reviewed = Assert.Single(await RowsAsync(check, batchId));

        Assert.DoesNotContain(reviewed.Issues, issue => issue.IssueType == ImportIssueType.MissingRequiredValue);
        Assert.Contains(reviewed.Issues, issue => issue.IssueType == ImportIssueType.MissingPrice);
        Assert.Contains(reviewed.Issues, issue => issue.IssueType == ImportIssueType.UnknownSupplier);
    }

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];

    private static Task<List<ImportRow>> RowsAsync(BaxOrdersDbContext db, long importBatchId) =>
        db.ImportRows.AsNoTracking()
            .Include(row => row.Issues)
            .Include(row => row.Corrections)
            .Where(row => row.ImportBatchId == importBatchId)
            .OrderBy(row => row.RowNumber)
            .ToListAsync();
}
