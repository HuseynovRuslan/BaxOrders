using BaxOrders.Application.Imports;
using BaxOrders.Application.Imports.Confirmation;
using BaxOrders.Application.Imports.Matching;
using BaxOrders.Application.Imports.Reading;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BaxOrders.IntegrationTests;

/// <summary>One synthetic order line. Null date means 1 March 2026 (Tarix holds the period start).</summary>
internal sealed record OrderLine(
    string? Product = "Test malı",
    double? Quantity = 10,
    string? OrderUnit = "ədəd",
    double? Price = 2,
    double? Total = null,
    string? Location = "H.Ə.M",
    object? Date = null,
    string? Supplier = null,
    string? Person = null,
    string? MainCategory = null,
    string? MiddleCategory = null,
    string? SubCategory = null,
    string? SpecificationValue = null,
    string? SpecificationUnit = null);

internal sealed class FakeWorkbookReader(Func<ExcelWorkbook> read) : IExcelWorkbookReader
{
    public ExcelWorkbook Read(Stream content, ExcelFileFormat format, CancellationToken cancellationToken) => read();
}

internal static class ImportWorkbooks
{
    private static readonly object?[] Header =
    [
        "№", "Ana kateqoriya", "Orta kateqoriya", "Alt kateqoriya", "Malın adı", "Ölçü", "Vahid",
        "Miqdarı", "Ö/v", "Qiyməti", "Cəmi", "Şirkət", "Obyekt", "Tarix", "Cavabdeh şəxs",
    ];

    /// <summary>A workbook shaped like the real one: two title rows, header on row 3, data from row 4.</summary>
    public static ExcelWorkbook Orders(params OrderLine[] lines)
    {
        var rows = new List<ExcelRow> { new(1, []), new(2, []), new(3, Header) };
        rows.AddRange(lines.Select((line, index) => new ExcelRow(index + 4,
        [
            (double)(index + 1), line.MainCategory, line.MiddleCategory, line.SubCategory, line.Product,
            line.SpecificationValue, line.SpecificationUnit, line.Quantity, line.OrderUnit, line.Price, line.Total,
            line.Supplier, line.Location, line.Date ?? new DateTime(2026, 3, 1), line.Person,
        ])));

        return new ExcelWorkbook([new ExcelSheet("Əsas", rows)]);
    }

    /// <summary>Unique content with a valid .xlsx (ZIP) signature; the fake reader supplies the cells.</summary>
    public static byte[] UniqueXlsxBytes() => [0x50, 0x4B, 0x03, 0x04, .. Guid.NewGuid().ToByteArray()];

    public static ExcelUpload Upload(byte[] content, string fileName = "sifarisler.xlsx") =>
        new(fileName, content.Length, new MemoryStream(content));

    public static ExcelImportService ImportService(BaxOrdersDbContext db, Func<ExcelWorkbook> workbook) =>
        new(
            db,
            new FakeWorkbookReader(workbook),
            new ImportCatalogLoader(db),
            new ImportPreviewQueries(db),
            Options.Create(new ImportOptions()),
            TimeProvider.System,
            NullLogger<ExcelImportService>.Instance);

    public static BulkResolutionPlanner Planner(BaxOrdersDbContext db, int maxItems = 150) =>
        new(db, new ImportReviewQueries(db), Options.Create(new ImportOptions { MaxBulkResolutionItems = maxItems }));

    public static BulkResolutionService BulkService(BaxOrdersDbContext db, int maxItems = 150) =>
        new(
            db,
            Planner(db, maxItems),
            new ImportRevalidator(db, new ImportCatalogLoader(db)),
            new ImportPreviewQueries(db),
            new PostgresLocationCodeGenerator(db),
            new PostgresProductCodeGenerator(db),
            new PostgresImportBatchLock(db),
            NullLogger<BulkResolutionService>.Instance);

    public static ImportRowCorrectionService CorrectionService(BaxOrdersDbContext db) =>
        new(
            db,
            new ImportRevalidator(db, new ImportCatalogLoader(db)),
            new ImportRowDetailQueries(db),
            new ImportPreviewQueries(db),
            new PostgresImportBatchLock(db),
            TimeProvider.System,
            NullLogger<ImportRowCorrectionService>.Instance);

    public static ImportResolutionService ResolutionService(BaxOrdersDbContext db) =>
        new(
            db,
            new ImportRevalidator(db, new ImportCatalogLoader(db)),
            new ImportPreviewQueries(db),
            new PostgresLocationCodeGenerator(db),
            new PostgresProductCodeGenerator(db),
            new PostgresImportBatchLock(db),
            NullLogger<ImportResolutionService>.Instance);

    public static ImportConfirmationPlanner ConfirmationPlanner(BaxOrdersDbContext db) => new(db);

    public static ImportConfirmationService ConfirmationService(BaxOrdersDbContext db, TimeProvider? clock = null) =>
        new(
            db,
            ConfirmationPlanner(db),
            new PostgresImportBatchLock(db),
            clock ?? TimeProvider.System,
            NullLogger<ImportConfirmationService>.Instance);

    /// <summary>Stages a workbook and returns the import batch id.</summary>
    public static async Task<long> StageAsync(BaxOrdersDbContext db, params OrderLine[] lines)
    {
        var result = await ImportService(db, () => Orders(lines)).ImportAsync(Upload(UniqueXlsxBytes()), CancellationToken.None);
        return result.ImportBatchId ?? throw new InvalidOperationException($"Staging failed: {result.Message}");
    }
}
