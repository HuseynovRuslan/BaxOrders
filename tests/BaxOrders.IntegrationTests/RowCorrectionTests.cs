using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Row-level corrections and exclusions against a real SQL Server database. Every fixture is synthetic: no company
/// workbook is read, and the staged original values are expected to survive every operation.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class RowCorrectionTests(PostgresDatabaseFixture database)
{
    [PostgresFact]
    public async Task A_correction_resolves_the_row_and_keeps_the_workbook_value()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine(Location: "Təhvil verdi"));
        var row = Assert.Single(await RowsAsync(db, batchId));

        Assert.Null(row.MatchedLocationId);
        Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownLocation);

        var result = await CorrectionService(db).ApplyAsync(
            new ApplyCorrectionCommand(batchId, row.Id, ImportCorrectionField.Location, "H.Ə.M"), CancellationToken.None);

        var field = Assert.Single(result.Row.Fields, item => item.Field == ImportCorrectionField.Location);
        Assert.Equal(("Təhvil verdi", "H.Ə.M", "H.Ə.M", true), (field.SourceValue, field.CorrectedValue, field.EffectiveValue, field.IsCorrected));
        Assert.Contains("Heydər Əliyev Mərkəzi", result.Row.Matches.Location!);

        await using var check = database.CreateContext();
        var corrected = Assert.Single(await RowsAsync(check, batchId));

        // The workbook value is untouched; only the effective value changed.
        Assert.Equal("Təhvil verdi", corrected.OriginalLocationName);
        Assert.NotNull(corrected.MatchedLocationId);
        Assert.DoesNotContain(corrected.Issues, issue => issue.IssueType == ImportIssueType.UnknownLocation);
        Assert.Equal("H.Ə.M", Assert.Single(await check.ImportRowCorrections.Where(item => item.ImportRowId == row.Id).ToListAsync()).CorrectedValue);
    }

    [PostgresFact]
    public async Task Correcting_a_value_reparses_the_row_and_leaves_unrelated_issues_alone()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine(Quantity: 0, Price: null, Total: 500));
        var row = Assert.Single(await RowsAsync(db, batchId));

        Assert.Equal(ImportRowValidationStatus.Invalid, row.ValidationStatus);
        Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.InvalidQuantity);
        Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.MissingPrice);

        await CorrectionService(db).ApplyAsync(
            new ApplyCorrectionCommand(batchId, row.Id, ImportCorrectionField.Quantity, "12,5"), CancellationToken.None);

        await using var check = database.CreateContext();
        var corrected = Assert.Single(await RowsAsync(check, batchId));

        Assert.Equal(12.5m, corrected.ParsedQuantity);
        Assert.DoesNotContain(corrected.Issues, issue => issue.IssueType == ImportIssueType.InvalidQuantity);

        // A quantity says nothing about the price, so that warning is still there.
        Assert.Contains(corrected.Issues, issue => issue.IssueType == ImportIssueType.MissingPrice);
        Assert.Equal("0", corrected.OriginalQuantity);
    }

    [PostgresFact]
    public async Task A_correction_is_held_to_the_same_rules_as_a_workbook_cell()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine());
        var row = Assert.Single(await RowsAsync(db, batchId));
        var service = CorrectionService(db);

        foreach (var (field, value) in new[]
                 {
                     (ImportCorrectionField.Quantity, "abc"),
                     (ImportCorrectionField.Quantity, "0"),
                     (ImportCorrectionField.Quantity, "-3"),
                     (ImportCorrectionField.Quantity, "1,2345"),
                     (ImportCorrectionField.UnitPrice, "-1"),
                     (ImportCorrectionField.RequestPeriod, "mart"),
                     (ImportCorrectionField.Location, "   "),
                 })
        {
            await Assert.ThrowsAsync<ValidationException>(() => service.ApplyAsync(
                new ApplyCorrectionCommand(batchId, row.Id, field, value), CancellationToken.None));
        }

        await using var check = database.CreateContext();
        Assert.Empty(await check.ImportRowCorrections.Where(item => item.ImportRowId == row.Id).ToListAsync());
    }

    [PostgresFact]
    public async Task A_corrected_row_stops_inheriting_the_decision_made_for_the_old_value()
    {
        await using var db = database.CreateContext();
        var ramana = await AddSupplierAsync(db, $"Ramana MMC {Unique()}");
        var cleanfix = await AddSupplierAsync(db, $"Cleanfix {Unique()}");
        var spelling = $"Ramana {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Supplier: spelling), new OrderLine(Supplier: spelling, Product: "Başqa mal"));

        await ResolutionService(db).ResolveSupplierToExistingAsync(
            new ResolveToExistingCommand(batchId, ImportSourceKeys.Name(spelling)!, ramana.Id, ResolutionScope.BatchOnly),
            CancellationToken.None);

        var rows = await RowsAsync(db, batchId);
        Assert.All(rows, row => Assert.Equal<int?>(ramana.Id, row.MatchedSupplierId));

        // The first row's supplier cell was wrong: it holds another company's name.
        await CorrectionService(db).ApplyAsync(
            new ApplyCorrectionCommand(batchId, rows[0].Id, ImportCorrectionField.Supplier, cleanfix.Name), CancellationToken.None);

        await using var check = database.CreateContext();
        var corrected = await RowsAsync(check, batchId);

        Assert.Equal<int?>(cleanfix.Id, corrected[0].MatchedSupplierId);
        Assert.Equal(ImportSourceKeys.Name(cleanfix.Name), corrected[0].NormalizedSupplierName);
        Assert.Equal(spelling, corrected[0].OriginalSupplierName);

        // The other row still carries the value the decision was made for.
        Assert.Equal<int?>(ramana.Id, corrected[1].MatchedSupplierId);

        // Reverting puts the row back under the batch decision.
        await CorrectionService(check).RevertAsync(batchId, corrected[0].Id, ImportCorrectionField.Supplier, CancellationToken.None);

        await using var reverted = database.CreateContext();
        Assert.All(await RowsAsync(reverted, batchId), row => Assert.Equal<int?>(ramana.Id, row.MatchedSupplierId));
        Assert.Empty(await reverted.ImportRowCorrections.Where(item => item.ImportRowId == corrected[0].Id).ToListAsync());
    }

    [PostgresFact]
    public async Task Correcting_a_row_refreshes_the_possible_duplicates_of_both_groups()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine(), new OrderLine(), new OrderLine(Quantity: 99));
        var rows = await RowsAsync(db, batchId);

        Assert.All(rows.Take(2), row => Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.DuplicateRow));
        Assert.DoesNotContain(rows[2].Issues, issue => issue.IssueType == ImportIssueType.DuplicateRow);

        // The second row is corrected to the third row's quantity: it leaves one group and joins another.
        await CorrectionService(db).ApplyAsync(
            new ApplyCorrectionCommand(batchId, rows[1].Id, ImportCorrectionField.Quantity, "99"), CancellationToken.None);

        await using var check = database.CreateContext();
        var refreshed = await RowsAsync(check, batchId);

        Assert.DoesNotContain(refreshed[0].Issues, issue => issue.IssueType == ImportIssueType.DuplicateRow);
        Assert.All(refreshed.Skip(1), row => Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.DuplicateRow));

        // Possible duplicates stay informational: nothing was merged, removed or invalidated.
        Assert.All(refreshed, row => Assert.NotEqual(ImportRowValidationStatus.Invalid, row.ValidationStatus));
    }

    [PostgresFact]
    public async Task An_excluded_row_stays_staged_and_stops_holding_the_batch_back()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db,
            new OrderLine(Location: "Təhvil verdi", Product: $"Naməlum {Unique()}"),
            new OrderLine(Product: $"Yaxşı mal {Unique()}"));
        var rows = await RowsAsync(db, batchId);
        var service = CorrectionService(db);

        var excluded = await service.ExcludeAsync(
            new ExcludeRowCommand(batchId, rows[0].Id, "Anbar sətri, sifariş deyil"), CancellationToken.None);

        Assert.True(excluded.Row.IsExcluded);
        Assert.Equal("Anbar sətri, sifariş deyil", excluded.Row.ExclusionReason);

        await using var check = database.CreateContext();
        var batch = await check.ImportBatches.SingleAsync(item => item.Id == batchId);

        // The row is still there, with its original values and its issues.
        Assert.Equal(2, batch.TotalRows);
        Assert.Equal(1, batch.ExcludedRows);
        Assert.Equal(1, batch.ValidRows + batch.WarningRows + batch.InvalidRows);
        var stored = await RowsAsync(check, batchId);
        Assert.Equal("Təhvil verdi", stored[0].OriginalLocationName);
        Assert.Contains(stored[0].Issues, issue => issue.IssueType == ImportIssueType.UnknownLocation);

        // Its unresolved values no longer ask for a decision.
        var summary = await new ImportReviewQueries(check).GetSummaryAsync(batchId, CancellationToken.None) ?? [];
        Assert.Equal(0, Assert.Single(summary, item => item.Kind == ImportResolutionKind.Location).DistinctValues);
        Assert.Equal(1, Assert.Single(summary, item => item.Kind == ImportResolutionKind.Product).DistinctValues);

        // Putting it back brings its problems back too.
        await CorrectionService(check).IncludeAsync(batchId, stored[0].Id, CancellationToken.None);

        await using var included = database.CreateContext();
        var after = await included.ImportBatches.SingleAsync(item => item.Id == batchId);
        Assert.Equal((0, 2), (after.ExcludedRows, after.TotalRows));
        Assert.Equal(1, Assert.Single(
            await new ImportReviewQueries(included).GetSummaryAsync(batchId, CancellationToken.None) ?? [],
            item => item.Kind == ImportResolutionKind.Location).DistinctValues);
    }

    [PostgresFact]
    public async Task Excluding_the_last_blocking_row_makes_the_batch_ready()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Mop {Unique()}");
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var batchId = await StageAsync(db,
            new OrderLine(Product: product.Name),
            new OrderLine(Product: $"Naməlum {Unique()}", Location: "Təhvil verdi"));
        var rows = await RowsAsync(db, batchId);

        var readiness = new ImportReadinessQueries(db, new ImportReviewQueries(db));
        var before = await readiness.GetReadinessAsync(batchId, CancellationToken.None);
        Assert.False(before!.CanImport);
        Assert.Contains(before.Blockers, blocker => blocker.IssueType == ImportIssueType.UnknownLocation);
        Assert.Contains(before.Blockers, blocker => blocker.IssueType == ImportIssueType.UnknownProduct);

        var result = await CorrectionService(db).ExcludeAsync(
            new ExcludeRowCommand(batchId, rows[1].Id, "Bu sətir başqa fayldan yapışdırılıb"), CancellationToken.None);

        Assert.Equal(ImportStatus.ReadyToImport, result.Preview.Batch.Status);

        await using var check = database.CreateContext();
        var after = await new ImportReadinessQueries(check, new ImportReviewQueries(check)).GetReadinessAsync(batchId, CancellationToken.None);

        Assert.True(after!.CanImport);
        Assert.Empty(after.Blockers);
        Assert.Equal((2, 1, 1), (after.TotalRows, after.IncludedRows, after.ExcludedRows));
    }

    [PostgresFact]
    public async Task Readiness_explains_what_is_still_missing()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db,
            new OrderLine(Price: null, Total: 999),
            new OrderLine(OrderUnit: $"kv{Unique()}", Product: "Başqa mal"),
            new OrderLine(Quantity: 0, Product: "Üçüncü mal"));

        var readiness = await new ImportReadinessQueries(db, new ImportReviewQueries(db))
            .GetReadinessAsync(batchId, CancellationToken.None);

        Assert.False(readiness!.CanImport);
        Assert.Equal((3, 3, 0), (readiness.TotalRows, readiness.IncludedRows, readiness.ExcludedRows));
        Assert.Equal(1, readiness.UnresolvedReferences.OrderUnits);
        Assert.Equal(3, readiness.Products.UnresolvedProducts);
        Assert.Equal(3, readiness.Products.DependencyBlockedRows);
        Assert.Equal(1, readiness.RowIssues.InvalidQuantity);

        // Warnings and information never block.
        Assert.Equal(1, readiness.Warnings.MissingPrice);
        Assert.DoesNotContain(readiness.Blockers, blocker => blocker.IssueType == ImportIssueType.MissingPrice);
        Assert.DoesNotContain(readiness.Blockers, blocker => blocker.IssueType == ImportIssueType.DuplicateRow);
        Assert.DoesNotContain(readiness.Blockers, blocker => blocker.IssueType == ImportIssueType.LineTotalMismatch);

        // Every blocker points at the screen where it is decided.
        Assert.Contains(readiness.Blockers, blocker => blocker.Area == nameof(ImportResolutionKind.OrderUnit));
        Assert.Contains(readiness.Blockers, blocker => blocker.Area == nameof(ImportResolutionKind.Product));
        Assert.Contains(readiness.Blockers, blocker => blocker.Area == ImportReadinessQueries.RowArea);
    }

    [PostgresFact]
    public async Task The_candidate_queue_lists_rows_that_need_a_row_specific_decision()
    {
        await using var db = database.CreateContext();
        var marker = Unique();
        var batchId = await StageAsync(db,
            new OrderLine(Quantity: 0, Product: $"Pis miqdar {marker}"),
            new OrderLine(Product: $"Yaxşı mal {marker}"),
            new OrderLine(Product: $"Üçüncü mal {marker}", Date: "abc"));
        var queries = new ImportRowDetailQueries(db);

        var candidates = await queries.GetCandidatesAsync(batchId, new CorrectionCandidateQuery(), CancellationToken.None);
        Assert.Equal(2, candidates!.TotalCount);

        var byIssue = await queries.GetCandidatesAsync(
            batchId, new CorrectionCandidateQuery(IssueType: ImportIssueType.InvalidQuantity), CancellationToken.None);
        Assert.Contains("Pis miqdar", Assert.Single(byIssue!.Items).ProductName!);

        var bySearch = await queries.GetCandidatesAsync(
            batchId, new CorrectionCandidateQuery(Search: $"Üçüncü mal {marker}"), CancellationToken.None);
        Assert.Single(bySearch!.Items);

        // An excluded row stays queryable, and can be found on purpose.
        var rows = await RowsAsync(db, batchId);
        await CorrectionService(db).ExcludeAsync(new ExcludeRowCommand(batchId, rows[0].Id, "Səhv sətir"), CancellationToken.None);

        await using var check = database.CreateContext();
        var excluded = await new ImportRowDetailQueries(check).GetCandidatesAsync(
            batchId, new CorrectionCandidateQuery(Excluded: true), CancellationToken.None);
        var candidate = Assert.Single(excluded!.Items);
        Assert.True(candidate.IsExcluded);
        Assert.Contains("Pis miqdar", candidate.ProductName!);
    }

    [PostgresFact]
    public async Task One_cell_never_holds_two_corrections()
    {
        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine());
        var row = Assert.Single(await RowsAsync(db, batchId));
        var service = CorrectionService(db);

        await service.ApplyAsync(new ApplyCorrectionCommand(batchId, row.Id, ImportCorrectionField.Quantity, "5"), CancellationToken.None);
        await service.ApplyAsync(new ApplyCorrectionCommand(batchId, row.Id, ImportCorrectionField.Quantity, "7"), CancellationToken.None);

        await using var check = database.CreateContext();
        var stored = Assert.Single(await check.ImportRowCorrections.Where(item => item.ImportRowId == row.Id).ToListAsync());
        Assert.Equal("7", stored.CorrectedValue);
        Assert.Equal(7m, Assert.Single(await RowsAsync(check, batchId)).ParsedQuantity);

        // Another session that never saw the first correction: the unique index refuses its write instead of
        // silently replacing the decision already stored.
        await using var other = database.CreateContext();
        var staleRow = await other.ImportRows.FirstAsync(item => item.Id == row.Id);
        staleRow.SetCorrection(ImportCorrectionField.Quantity, "9");
        await Assert.ThrowsAsync<DbUpdateException>(() => other.SaveChangesAsync());
    }

    [PostgresFact]
    public async Task A_row_of_another_import_is_never_touched()
    {
        await using var db = database.CreateContext();
        var first = await StageAsync(db, new OrderLine());
        var second = await StageAsync(db, new OrderLine(Product: "Başqa mal"));
        var row = Assert.Single(await RowsAsync(db, second));

        await Assert.ThrowsAsync<NotFoundException>(() => CorrectionService(db).ApplyAsync(
            new ApplyCorrectionCommand(first, row.Id, ImportCorrectionField.Quantity, "5"), CancellationToken.None));
    }

    private static async Task<Domain.Catalog.Product> AddProductAsync(BaxOrdersDbContext db, string name)
    {
        var product = new Domain.Catalog.Product(await new PostgresProductCodeGenerator(db).NextAsync(CancellationToken.None), name);
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return product;
    }

    private static async Task<Supplier> AddSupplierAsync(BaxOrdersDbContext db, string name)
    {
        var supplier = new Supplier(name);
        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();
        return supplier;
    }

    private static Task<List<ImportRow>> RowsAsync(BaxOrdersDbContext db, long importBatchId) =>
        db.ImportRows.AsNoTracking()
            .Include(row => row.Issues)
            .Include(row => row.Corrections)
            .Where(row => row.ImportBatchId == importBatchId)
            .OrderBy(row => row.RowNumber)
            .ToListAsync();

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];
}
