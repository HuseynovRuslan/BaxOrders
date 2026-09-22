using BaxOrders.Application.Imports;
using BaxOrders.Application.Imports.Matching;
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

        var result = await Service(db, () => Orders(new OrderLine(Product: name, Quantity: 10d, OrderUnit: "əd.", Price: 3d, Total: 30d)))
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

        var result = await Service(db, () => Orders(
                new OrderLine(Product: name, Price: 3, Total: 30),
                new OrderLine(Product: name, Price: 3, Total: 30),
                new OrderLine(Product: name, Quantity: 4, Price: -1, Total: 12)))
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

    [PostgresFact]
    public async Task Workbook_without_the_required_columns_fails_with_details()
    {
        await using var db = database.CreateContext();
        var legacyForm = new ExcelWorkbook(
        [
            new ExcelSheet("İyul", [new ExcelRow(7, ["№", "Malın adı", "Miqdarı", "Ö/v", "Qiyməti", "Cəmi", "Şirkətlər"])]),
        ]);

        var result = await Service(db, () => legacyForm).ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);

        Assert.Equal(ImportOutcome.Failed, result.Outcome);
        Assert.Contains("Obyekt", result.Message);
        Assert.Contains("Tarix", result.Message);
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
