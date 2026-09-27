using BaxOrders.Application.Imports;
using BaxOrders.Application.Imports.Confirmation;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// A workbook shaped like the company's own, carried from upload to ready-to-import through the review's own
/// actions and nothing else.
/// </summary>
/// <remarks>
/// This exists because the same walk was done by hand against the real file, in a copy of the development
/// database, and a walk done by hand is not a regression test. Everything the real workbook does that matters is
/// reproduced synthetically here: the same lines on two sheets where only «Aylıq» is authoritative, a summary
/// row at the bottom, a specification suffix standing in the «Vahid» column, a blank «Növ» cell, and a service
/// line whose «Ö/v» holds a currency.
/// <para>
/// Every step is a real service call. Nothing is inserted behind the application's back, no unit is invented and
/// no classification is guessed, which is the whole point: if the path ever stops working, the failure should be
/// here rather than in somebody's afternoon.
/// </para>
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class AuthoritativeWorkbookEndToEndTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    [PostgresFact]
    public async Task The_workbook_reaches_ready_to_import_through_review_actions_alone()
    {
        await using var db = database.CreateContext();
        var product = $"Şkurka {Guid.NewGuid():N}"[..20];
        var location = $"Sınaq obyekti {Guid.NewGuid():N}"[..24];
        var person = await ResponsiblePersonAsync(db);

        // Five lines of the authoritative sheet, and the same five on the other one, plus a summary row.
        var lines = new[]
        {
            new OrderLine(Product: product, Location: location, Person: person, SpecificationValue: "100", SpecificationUnit: "lik"),
            new OrderLine(Product: product, Location: location, Person: person, SpecificationValue: "100", SpecificationUnit: "luq"),
            new OrderLine(Product: product, Location: location, Person: person, LineType: "Aylıqdan kənar"),
            new OrderLine(Product: product, Location: location, Person: person, LineType: null),
            new OrderLine(Product: product, Location: location, Person: person),
        };

        var upload = await ImportService(db, () => OrdersOnBothSheets(lines)).ImportAsync(Upload(UniqueXlsxBytes()), None);
        var batchId = upload.ImportBatchId!.Value;

        // ---- 1. only the authoritative sheet was read, and the summary row was not a line -----------------
        Assert.Equal(ImportOutcome.Staged, upload.Outcome);
        Assert.Equal(lines.Length, upload.Preview!.Batch.TotalRows);
        Assert.Equal([ImportSheets.Authoritative], await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId).Select(row => row.SheetName).Distinct().ToListAsync(None));

        // ---- 2. what stands in the way, in the order the review meets it --------------------------------
        var before = await ReadinessQueries(db).GetReadinessAsync(batchId, None);
        Assert.NotNull(before);
        Assert.False(before!.CanImport);
        // Two spellings are two decisions. They become one descriptor only once both have been made — which is
        // why the real workbook offers eight values for what are five descriptors.
        Assert.Equal(2, before.UnresolvedReferences.SpecificationUnits);
        Assert.Equal(
            ["UnknownLocation", "UnknownProduct"],
            before.Blockers.Select(blocker => blocker.IssueType.ToString()).Order());

        // The classification is a warning, never a blocker: three lines state one, two do not.
        Assert.DoesNotContain(before.Blockers, blocker => blocker.IssueType == ImportIssueType.UnknownOrderLineType);

        // ---- 3. the object and the product, then the suffix, then the variant — each a real action -------
        var review = ResolutionService(db);
        await review.CreateLocationAsync(
            new CreateLocationCommand(batchId, TextNormalizer.Normalize(location), location, ResolutionScope.BatchOnly), None);
        await review.CreateProductAsync(
            new CreateProductCommand(batchId, TextNormalizer.Normalize(product), product, null, ResolutionScope.BatchOnly), None);

        // Only now can a variant even be computed, so only now is the suffix what stands in the way.
        var afterProduct = await ReadinessQueries(db).GetReadinessAsync(batchId, None);
        Assert.Contains(afterProduct!.Blockers, blocker => blocker.IssueType == ImportIssueType.UnknownProductVariant);

        var unitsBefore = await db.UnitsOfMeasure.CountAsync(None);
        foreach (var suffix in new[] { "lik", "luq" })
        {
            await review.MarkNotAUnitAsync(new MarkNotAUnitCommand(batchId, ImportResolutionKind.SpecificationUnit, suffix), None);
        }

        // Two spellings of one suffix are one descriptor, and no unit of measure was created for either.
        Assert.Equal(unitsBefore, await db.UnitsOfMeasure.CountAsync(None));
        var descriptors = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId && row.SpecificationDescriptor != null)
            .Select(row => row.SpecificationDescriptor)
            .Distinct()
            .ToListAsync(None);
        Assert.Equal(["lik"], descriptors);

        foreach (var key in await UnresolvedVariantKeysAsync(db, batchId))
        {
            await review.CreateProductVariantAsync(new CreateProductVariantCommand(batchId, key), None);
        }

        // ---- 4. ready, and every line kept what its source said -----------------------------------------
        await using var check = database.CreateContext();
        var after = await ReadinessQueries(check).GetReadinessAsync(batchId, None);
        Assert.NotNull(after);
        Assert.True(after!.CanImport, $"still blocked by: {string.Join(", ", after.Blockers.Select(b => b.IssueType))}");
        Assert.Empty(after.Blockers);

        var rows = await check.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId)
            .OrderBy(row => row.RowNumber)
            .ToListAsync(None);
        Assert.All(rows, row => Assert.NotNull(row.MatchedProductVariantId));
        Assert.All(rows, row => Assert.NotNull(row.MatchedResponsiblePersonId));
        // The workbook text is exactly what it always was: the decisions changed what it resolves to, not what it says.
        Assert.Equal(["lik", "luq", null, null, null], rows.Select(row => row.OriginalSpecificationUnit));
        Assert.Equal(
            ["Aylıq sifariş", "Aylıq sifariş", "Aylıqdan kənar", null, "Aylıq sifariş"],
            rows.Select(row => row.OriginalOrderLineType));

        // ---- 5. and the confirmation preview says what it would write ------------------------------------
        var preview = await ConfirmationPlanner(check).PreviewAsync(batchId, None);
        Assert.NotNull(preview);
        Assert.True(preview!.CanConfirm);
        Assert.Equal((3, 1, 1),
            (preview.MonthlyRows, preview.OutsideMonthlyRows, preview.UnclassifiedLineTypeRows));
        Assert.Equal(lines.Length, preview.RowsToImport);
    }

    /// <summary>
    /// A service line whose «Ö/v» holds a currency is carried through by the row correction, not by inventing a unit.
    /// </summary>
    [PostgresFact]
    public async Task A_service_line_whose_order_unit_is_a_currency_is_carried_through_by_a_correction()
    {
        await using var db = database.CreateContext();
        var product = $"Təmir işləri {Guid.NewGuid():N}"[..24];
        var person = await ResponsiblePersonAsync(db);

        var upload = await ImportService(db, () => OrdersOnBothSheets(
                new OrderLine(Product: product, Person: person, OrderUnit: "azn", Quantity: 1, Price: 200)))
            .ImportAsync(Upload(UniqueXlsxBytes()), None);
        var batchId = upload.ImportBatchId!.Value;

        var row = Assert.Single(await db.ImportRows.AsNoTracking()
            .Include(item => item.Issues)
            .Where(item => item.ImportBatchId == batchId)
            .ToListAsync(None));
        Assert.Equal(ImportRowValidationStatus.Invalid, row.ValidationStatus);
        Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownUnit && issue.Severity == IssueSeverity.Error);

        var unitsBefore = await db.UnitsOfMeasure.CountAsync(None);
        await ResolutionService(db).CreateProductAsync(
            new CreateProductCommand(batchId, TextNormalizer.Normalize(product), product, null, ResolutionScope.BatchOnly), None);
        await CorrectionService(db).ClearAsync(batchId, row.Id, ImportCorrectionField.OrderUnit, None);

        await using var check = database.CreateContext();
        var reviewed = await check.ImportRows.AsNoTracking().SingleAsync(item => item.Id == row.Id, None);

        // No unit was created for a currency, the workbook still says «azn», and the line is unitless on purpose.
        Assert.Equal(unitsBefore, await check.UnitsOfMeasure.CountAsync(None));
        Assert.Equal("azn", reviewed.OriginalOrderUnit);
        Assert.Null(reviewed.MatchedOrderUnitId);
        Assert.NotEqual(ImportRowValidationStatus.Invalid, reviewed.ValidationStatus);
    }

    /// <summary>The distinct variant keys of the batch that have no variant behind them yet.</summary>
    private static async Task<List<string>> UnresolvedVariantKeysAsync(BaxOrdersDbContext db, long batchId) =>
        await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId
                          && row.VariantSourceKey != null
                          && row.MatchedProductVariantId == null)
            .Select(row => row.VariantSourceKey!)
            .Distinct()
            .ToListAsync(None);
}
