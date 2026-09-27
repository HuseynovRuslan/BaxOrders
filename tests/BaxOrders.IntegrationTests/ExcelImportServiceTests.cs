using BaxOrders.Application.Imports;
using BaxOrders.Application.Imports.Matching;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Application.Imports.Reading;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

[Collection(PostgresCollection.Name)]
public sealed class ExcelImportServiceTests(PostgresDatabaseFixture database)
{
    [PostgresFact]
    public async Task Workbook_with_several_locations_and_months_is_grouped_by_location_and_period()
    {
        await using var db = database.CreateContext();
        var workbook = Orders(
            new OrderLine(Location: "H.Ə.M"),
            new OrderLine(Location: " h.ə.m ", Date: new DateTime(2026, 3, 1)),
            new OrderLine(Location: "Ramana", Date: "02.04.2026"),
            new OrderLine(Location: "Təhvil verdi"));

        var result = await Service(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);

        Assert.Equal(ImportOutcome.Staged, result.Outcome);
        var preview = result.Preview!;
        Assert.Equal(ImportStatus.NeedsReview, preview.Batch.Status);
        Assert.Equal((4, 0, 3, 1), (preview.Batch.TotalRows, preview.Batch.ValidRows, preview.Batch.WarningRows, preview.Batch.InvalidRows));
        Assert.Equal(1, preview.UngroupedRows);
        Assert.Equal(
            [("Heydər Əliyev Mərkəzi", new DateOnly(2026, 3, 1), 2), ("Ramana", new DateOnly(2026, 4, 1), 1)],
            preview.Groups.Select(g => (g.LocationName, g.Period, g.RowCount)));

        // "Tarix" is stored as the request period; the order workbook has no request date.
        var ramanaRow = await db.ImportRows.AsNoTracking()
            .SingleAsync(r => r.ImportBatchId == result.ImportBatchId && r.OriginalLocationName == "Ramana");
        Assert.Equal(new DateOnly(2026, 4, 1), ramanaRow.ParsedRequestPeriod);
        Assert.Null(ramanaRow.ParsedRequestDate);
        Assert.Equal("02.04.2026", ramanaRow.OriginalRequestDate);
        Assert.Contains(preview.IssueSummary, i => i is { IssueType: ImportIssueType.UnknownProduct, Count: 4 });
        Assert.Equal(3, Assert.Single(result.Sheets).HeaderRowNumber);
    }

    /// <summary>
    /// A workbook with no "Növ" column at all is staged, said plainly, and refused readiness.
    /// </summary>
    /// <remarks>
    /// The alternative is what this exists to stop: importing three thousand lines as "nobody classified
    /// this" when nobody was ever asked. The rows are kept exactly as they were read — the source is the
    /// evidence and is never discarded — and the batch simply cannot become ready to import until somebody
    /// deals with it.
    /// </remarks>
    [PostgresFact]
    public async Task A_workbook_with_no_classification_column_is_staged_but_cannot_be_imported()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersWithoutLineTypeColumn(
            new OrderLine(Location: "H.Ə.M"), new OrderLine(Location: "H.Ə.M"));

        var result = await Service(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);

        Assert.Equal(ImportOutcome.Staged, result.Outcome);

        // Said once where the person who uploaded the file reads it...
        Assert.Equal(
            "Növ sütunu tapılmadı. Sifariş növü təsnifatı oxuna bilmədi.",
            Assert.Single(result.Sheets).Problem);

        // ...and once on every row, as an error, which is what stops the batch.
        var preview = result.Preview!;
        Assert.Equal(ImportStatus.NeedsReview, preview.Batch.Status);
        Assert.Equal(2, preview.Batch.InvalidRows);
        Assert.Contains(preview.IssueSummary, issue => issue.IssueType == ImportIssueType.UnknownOrderLineType);

        // The source is kept whole, and what the sheet could not say is recorded as exactly that.
        var rows = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == result.ImportBatchId)
            .ToListAsync();
        Assert.Equal(2, rows.Count);
        Assert.All(rows, row => Assert.False(row.SourceHadOrderLineTypeColumn));
        Assert.All(rows, row => Assert.Null(row.OriginalOrderLineType));

        // Everything the sheet did say is still there, cell for cell: the block is about one missing column,
        // not a reason to throw the file away.
        Assert.All(rows, row => Assert.Equal("Test malı", row.OriginalProductName));
        Assert.All(rows, row => Assert.Equal("H.Ə.M", row.OriginalLocationName));
        Assert.All(rows, row => Assert.Equal("10", row.OriginalQuantity));
    }

    /// <summary>
    /// A workbook with no "Cavabdeh şəxs" column at all gets the same treatment, in its own words.
    /// </summary>
    /// <remarks>
    /// The same reasoning as the classification column. Such a workbook cannot say whose lines these are — for
    /// any of them — so importing it would create thousands of lines answerable to nobody and leave the orders
    /// they form reading as unassigned rather than unread. The rows are still staged whole, because the source
    /// is the evidence.
    /// </remarks>
    [PostgresFact]
    public async Task A_workbook_with_no_responsible_person_column_is_staged_but_cannot_be_imported()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersWithoutResponsiblePersonColumn(
            new OrderLine(Location: "H.Ə.M"), new OrderLine(Location: "H.Ə.M"));

        var result = await Service(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);

        Assert.Equal(ImportOutcome.Staged, result.Outcome);
        Assert.Equal(
            "Cavabdeh şəxs sütunu tapılmadı. Sətir üzrə cavabdeh oxuna bilmədi.",
            Assert.Single(result.Sheets).Problem);

        var preview = result.Preview!;
        Assert.Equal(ImportStatus.NeedsReview, preview.Batch.Status);
        Assert.Equal(2, preview.Batch.InvalidRows);
        Assert.Contains(preview.IssueSummary, issue => issue.IssueType == ImportIssueType.UnknownResponsiblePerson);

        var rows = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == result.ImportBatchId)
            .ToListAsync();
        Assert.Equal(2, rows.Count);
        Assert.All(rows, row => Assert.False(row.SourceHadResponsiblePersonColumn));
        Assert.All(rows, row => Assert.Null(row.OriginalResponsiblePersonName));

        // The classification column is there, so it is read as usual: one missing column is one problem.
        Assert.All(rows, row => Assert.True(row.SourceHadOrderLineTypeColumn));
        Assert.All(rows, row => Assert.Equal("Aylıq sifariş", row.OriginalOrderLineType));
        Assert.All(rows, row => Assert.Equal("Test malı", row.OriginalProductName));
    }

    /// <summary>
    /// Both columns missing is two problems, and the person who uploaded the file is told both. One message
    /// hiding the other would send somebody to fix half a workbook and upload it again.
    /// </summary>
    [PostgresFact]
    public async Task A_workbook_missing_both_columns_is_told_about_both()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersWithoutEitherColumn(new OrderLine(Location: "H.Ə.M"));

        var result = await Service(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);

        var problem = Assert.Single(result.Sheets).Problem;
        Assert.Contains("Növ sütunu tapılmadı", problem!, StringComparison.Ordinal);
        Assert.Contains("Cavabdeh şəxs sütunu tapılmadı", problem!, StringComparison.Ordinal);
        Assert.Equal(ImportStatus.NeedsReview, result.Preview!.Batch.Status);
    }

    /// <summary>
    /// The same workbook with the column present and its cells empty is a different answer: two lines waiting
    /// on somebody, not a workbook that cannot be read. Warnings, and the batch is not made invalid by them.
    /// </summary>
    [PostgresFact]
    public async Task A_workbook_whose_classification_cells_are_empty_is_a_warning_and_not_a_block()
    {
        await using var db = database.CreateContext();
        var workbook = Orders(
            new OrderLine(Location: "H.Ə.M", LineType: null), new OrderLine(Location: "H.Ə.M", LineType: null));

        var result = await Service(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);

        Assert.Null(Assert.Single(result.Sheets).Problem);
        Assert.Equal(0, result.Preview!.Batch.InvalidRows);

        var rows = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == result.ImportBatchId)
            .ToListAsync();
        Assert.All(rows, row => Assert.True(row.SourceHadOrderLineTypeColumn));
    }

    [PostgresFact]
    public async Task Existing_request_is_reported_but_never_changed()
    {
        await using var db = database.CreateContext();
        var mastaga = await db.Locations.SingleAsync(l => l.Code == "MASTAGA");
        db.OrderRequests.Add(new OrderRequest(mastaga, new DateOnly(2026, 5, 1)));
        await db.SaveChangesAsync();
        var requestsBefore = await db.OrderRequests.CountAsync();

        var result = await Service(db, () => Orders(new OrderLine(Location: "Maştağa", Date: new DateTime(2026, 5, 20))))
            .ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);

        var group = Assert.Single(result.Preview!.Groups);
        Assert.True(group.ExistingRequest);
        Assert.Equal(1, group.LatestVersion);
        Assert.Equal(GroupSuggestedAction.RequiresOperatorDecision, group.SuggestedAction);
        Assert.Equal(requestsBefore, await db.OrderRequests.CountAsync());
    }

    [PostgresFact]
    public async Task Fully_resolved_rows_make_the_import_ready()
    {
        await using var db = database.CreateContext();
        var pieces = await db.UnitsOfMeasure.SingleAsync(u => u.Code == "PCS");
        var name = $"Lapatka {Guid.NewGuid():N}";
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(CancellationToken.None), name);
        product.AddVariant(null, null, null, pieces);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        // A row with nothing left to decide, which now includes the person the workbook names on it: an empty
        // "Cavabdeh şəxs" cell is a warning of its own and would leave the row needing review.
        var person = await ResponsiblePersonAsync(db);

        var result = await Service(db, () => Orders(
                new OrderLine(Product: name, Quantity: 10d, OrderUnit: "əd.", Price: 3d, Total: 30d, Person: person)))
            .ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);

        Assert.Equal(ImportStatus.ReadyToImport, result.Preview!.Batch.Status);
        Assert.Equal(1, result.Preview.Batch.ValidRows);
        var row = await db.ImportRows.AsNoTracking().SingleAsync(r => r.ImportBatchId == result.ImportBatchId);
        Assert.Equal(product.Id, row.MatchedProductId);
        Assert.NotNull(row.MatchedProductVariantId);
        Assert.Equal("əd.", row.OriginalOrderUnit);
    }

    [PostgresFact]
    public async Task Possible_duplicates_and_invalid_prices_do_not_block_ready_to_import()
    {
        await using var db = database.CreateContext();
        var pieces = await db.UnitsOfMeasure.SingleAsync(u => u.Code == "PCS");
        var name = $"Vedrə {Guid.NewGuid():N}";
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(CancellationToken.None), name);
        product.AddVariant(null, null, null, pieces);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        // Every line names a person, so the only warning left is the one this test is about: the bad price.
        var person = await ResponsiblePersonAsync(db);

        var result = await Service(db, () => Orders(
                new OrderLine(Product: name, Price: 3, Total: 30, Person: person),
                new OrderLine(Product: name, Price: 3, Total: 30, Person: person),
                new OrderLine(Product: name, Quantity: 4, Price: -1, Total: 12, Person: person)))
            .ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);

        var preview = result.Preview!;
        Assert.Equal(ImportStatus.ReadyToImport, preview.Batch.Status);
        Assert.Equal((2, 1, 0), (preview.Batch.ValidRows, preview.Batch.WarningRows, preview.Batch.InvalidRows));
        Assert.Contains(preview.IssueSummary, i => i is { IssueType: ImportIssueType.DuplicateRow, Severity: IssueSeverity.Info, Count: 2 });
        Assert.Contains(preview.IssueSummary, i => i is { IssueType: ImportIssueType.InvalidPrice, Severity: IssueSeverity.Warning, Count: 1 });
        Assert.DoesNotContain(preview.IssueSummary, i => i.IssueType == ImportIssueType.LineTotalMismatch);

        var rows = await db.ImportRows.AsNoTracking().Where(r => r.ImportBatchId == result.ImportBatchId).OrderBy(r => r.RowNumber).ToListAsync();
        Assert.Equal(
            [ImportRowValidationStatus.Valid, ImportRowValidationStatus.Valid, ImportRowValidationStatus.NeedsReview],
            rows.Select(r => r.ValidationStatus));
        Assert.Null(rows[2].ParsedUnitPrice);
        Assert.Equal("-1", rows[2].OriginalUnitPrice);
    }

    [PostgresFact]
    public async Task Same_workbook_is_not_processed_twice()
    {
        await using var db = database.CreateContext();
        var content = UniqueXlsxBytes();
        var service = Service(db, () => Orders(new OrderLine()));

        var first = await service.ImportAsync(Upload(content), CancellationToken.None);
        var second = await service.ImportAsync(Upload(content), CancellationToken.None);

        Assert.Equal(ImportOutcome.Staged, first.Outcome);
        Assert.Equal(ImportOutcome.Duplicate, second.Outcome);
        Assert.Equal(first.ImportBatchId, second.ImportBatchId);
        var fileHash = await db.ImportBatches.Where(b => b.Id == first.ImportBatchId).Select(b => b.FileHash).SingleAsync();
        Assert.Equal(1, await db.ImportBatches.CountAsync(b => b.FileHash == fileHash));
    }

    [PostgresFact]
    public async Task Failed_workbook_can_be_retried()
    {
        await using var db = database.CreateContext();
        var content = UniqueXlsxBytes();

        var failed = await Service(db, () => throw new WorkbookReadException("The file could not be read."))
            .ImportAsync(Upload(content), CancellationToken.None);
        var retried = await Service(db, () => Orders(new OrderLine())).ImportAsync(Upload(content), CancellationToken.None);

        Assert.Equal(ImportOutcome.Failed, failed.Outcome);
        Assert.Equal(ImportStatus.Failed, failed.Preview!.Batch.Status);
        Assert.Equal("The file could not be read.", failed.Preview.Batch.FailureReason);
        Assert.Equal(ImportOutcome.Staged, retried.Outcome);
        Assert.NotEqual(failed.ImportBatchId, retried.ImportBatchId);
    }

    /// <summary>
    /// The authoritative sheet is there but its columns are not, and the failure says which ones.
    /// </summary>
    /// <remarks>
    /// The old monthly form — a tab per month, with "Şirkətlər" and no object or date — reaches this through a
    /// different door now: a workbook with no "Aylıq" sheet is refused for that, before its columns are read.
    /// Both are worth keeping apart, so this one puts the deficient header on the sheet that is read.
    /// </remarks>
    [PostgresFact]
    public async Task Workbook_without_the_required_columns_fails_with_details()
    {
        await using var db = database.CreateContext();
        var legacyForm = new ExcelWorkbook(
        [
            new ExcelSheet(
                ImportSheets.Authoritative,
                [new ExcelRow(7, ["№", "Malın adı", "Miqdarı", "Ö/v", "Qiyməti", "Cəmi", "Şirkətlər"])]),
        ]);

        var result = await Service(db, () => legacyForm).ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);

        Assert.Equal(ImportOutcome.Failed, result.Outcome);
        Assert.Contains("Obyekt", result.Message);
        Assert.Contains("Tarix", result.Message);
        Assert.Equal(0, await db.ImportRows.CountAsync(r => r.ImportBatchId == result.ImportBatchId));
    }

    /// <summary>
    /// A batch blocked only by a missing column says so in numbers as well as in its blocker.
    /// </summary>
    /// <remarks>
    /// It used to show a column of zeros under «Sətir xətaları» beside a blocker of three and a half thousand
    /// rows, because the count had buckets for five kinds of row error and this was none of them. It is one fact
    /// about the sheet carried on every row of it, so no value decision settles it — which is exactly why it
    /// belongs with the row errors rather than with the unresolved values.
    /// </remarks>
    [PostgresFact]
    public async Task A_batch_blocked_by_a_missing_column_counts_those_rows_as_well_as_naming_them()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersWithoutResponsiblePersonColumn(
            new OrderLine(Location: "H.Ə.M"), new OrderLine(Location: "H.Ə.M"), new OrderLine(Location: "H.Ə.M"));

        var result = await Service(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);
        var readiness = await ReadinessQueries(db).GetReadinessAsync(result.ImportBatchId!.Value, CancellationToken.None);

        Assert.NotNull(readiness);
        Assert.Equal(3, readiness!.RowIssues.MissingSourceColumn);
        Assert.Equal(0, readiness.RowIssues.OtherErrors);

        // And the blocker beside it says what the problem is rather than that there is one.
        var blocker = Assert.Single(readiness.Blockers,
            item => item.IssueType == ImportIssueType.UnknownResponsiblePerson);
        Assert.Equal(3, blocker.RowCount);
        Assert.Contains("responsible-person column", blocker.Message, StringComparison.Ordinal);
    }

    /// <summary>A blank cell is one line waiting on one person and is counted nowhere near a blocker.</summary>
    [PostgresFact]
    public async Task A_blank_cell_is_not_counted_as_a_missing_column()
    {
        await using var db = database.CreateContext();
        var workbook = Orders(new OrderLine(Location: "H.Ə.M", LineType: null, Person: null));

        var result = await Service(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);
        var readiness = await ReadinessQueries(db).GetReadinessAsync(result.ImportBatchId!.Value, CancellationToken.None);

        Assert.NotNull(readiness);
        Assert.Equal(0, readiness!.RowIssues.MissingSourceColumn);
    }

    /// <summary>
    /// The same old form under its own tab name is refused for the sheet, not for the columns — and is never
    /// read as a fallback just because it is the only sheet there.
    /// </summary>
    [PostgresFact]
    public async Task Workbook_whose_only_sheet_is_a_legacy_monthly_tab_is_refused_for_the_sheet()
    {
        await using var db = database.CreateContext();
        var legacyForm = new ExcelWorkbook(
        [
            new ExcelSheet("İyul", [new ExcelRow(7, ["№", "Malın adı", "Miqdarı", "Ö/v", "Qiyməti", "Cəmi", "Şirkətlər"])]),
        ]);

        var result = await Service(db, () => legacyForm).ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);

        Assert.Equal(ImportOutcome.Failed, result.Outcome);
        Assert.Equal(ImportSheets.MissingAuthoritativeSheet, result.Message);
        Assert.Equal(0, await db.ImportRows.CountAsync(r => r.ImportBatchId == result.ImportBatchId));
    }

    [PostgresFact]
    public async Task Invalid_uploads_are_rejected_before_a_batch_exists()
    {
        await using var db = database.CreateContext();
        var service = Service(db, () => Orders(new OrderLine()));
        var batchesBefore = await db.ImportBatches.CountAsync();

        var wrongExtension = await service.ImportAsync(Upload(UniqueXlsxBytes(), "sifaris.csv"), CancellationToken.None);
        var fakeContent = await service.ImportAsync(Upload("not a zip file"u8.ToArray()), CancellationToken.None);
        var empty = await service.ImportAsync(Upload([]), CancellationToken.None);

        Assert.All([wrongExtension, fakeContent, empty], result => Assert.Equal(ImportOutcome.Rejected, result.Outcome));
        Assert.Equal(batchesBefore, await db.ImportBatches.CountAsync());
    }

    [PostgresFact]
    public async Task Rows_are_paged_and_filtered_on_the_server()
    {
        await using var db = database.CreateContext();
        var result = await Service(db, () => Orders(
                new OrderLine(Product: "Makaron mop"),
                new OrderLine(Product: "Makaron mop", Price: null),
                new OrderLine(Product: "Rezin əlcək", Quantity: null),
                new OrderLine(Product: "Rezin əlcək", Location: "Ramana", Date: new DateTime(2026, 4, 2)),
                new OrderLine(Product: "Süpürgə"),
                new OrderLine(Product: "Süpürgə", Price: null),
                new OrderLine(Product: "Vedrə")))
            .ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);
        var queries = new ImportPreviewQueries(db);
        var id = result.ImportBatchId!.Value;
        var ramana = await db.Locations.SingleAsync(l => l.Code == "RAMANA");

        var secondPage = await queries.GetRowsAsync(id, new ImportRowQuery(Page: 2, PageSize: 3), CancellationToken.None);
        var invalid = await queries.GetRowsAsync(id, new ImportRowQuery(Status: ImportRowValidationStatus.Invalid), CancellationToken.None);
        var missingPrice = await queries.GetRowsAsync(id, new ImportRowQuery(IssueType: ImportIssueType.MissingPrice), CancellationToken.None);
        var atRamana = await queries.GetRowsAsync(id, new ImportRowQuery(LocationId: ramana.Id), CancellationToken.None);
        var april = await queries.GetRowsAsync(id, new ImportRowQuery(Period: new DateOnly(2026, 4, 1)), CancellationToken.None);
        var search = await queries.GetRowsAsync(id, new ImportRowQuery(Search: " MAKARON "), CancellationToken.None);
        var missingBatch = await queries.GetRowsAsync(long.MaxValue, new ImportRowQuery(), CancellationToken.None);

        Assert.Equal((7, 3), (secondPage!.TotalCount, secondPage.Items.Count));
        Assert.Equal([7, 8, 9], secondPage.Items.Select(r => r.RowNumber));
        Assert.Equal([6], invalid!.Items.Select(r => r.RowNumber));
        Assert.Equal([5, 9], missingPrice!.Items.Select(r => r.RowNumber));
        Assert.Equal([7], atRamana!.Items.Select(r => r.RowNumber));
        Assert.Equal([7], april!.Items.Select(r => r.RowNumber));
        Assert.Equal([4, 5], search!.Items.Select(r => r.RowNumber));
        Assert.All(search.Items, r => Assert.Contains(r.Issues, i => i.IssueType == ImportIssueType.UnknownProduct));
        Assert.Null(missingBatch);
    }

    private static ExcelImportService Service(BaxOrdersDbContext db, Func<ExcelWorkbook> workbook) =>
        new(
            db,
            new FakeWorkbookReader(workbook),
            new ImportCatalogLoader(db),
            new ImportPreviewQueries(db),
            Options.Create(new ImportOptions()),
            TimeProvider.System,
            NullLogger<ExcelImportService>.Instance);
}
