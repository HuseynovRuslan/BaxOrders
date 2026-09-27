using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports;
using BaxOrders.Application.Imports.Confirmation;
using BaxOrders.Application.Imports.Matching;
using BaxOrders.Application.Imports.Pricing;
using BaxOrders.Application.Imports.Reading;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.ResponsiblePeople;
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
    string? SpecificationUnit = null,
    /// <summary>
    /// The "Növ" cell. Defaults to the month's planned material, which is what almost every line of a real
    /// workbook is and what these fixtures mean; a test about an unclassified or an unreadable line says so.
    /// </summary>
    string? LineType = "Aylıq sifariş");

internal sealed class FakeWorkbookReader(Func<ExcelWorkbook> read) : IExcelWorkbookReader
{
    public ExcelWorkbook Read(Stream content, ExcelFileFormat format, CancellationToken cancellationToken) => read();
}

internal static class ImportWorkbooks
{
    private static readonly object?[] Header =
    [
        "№", "Ana kateqoriya", "Orta kateqoriya", "Alt kateqoriya", "Malın adı", "Ölçü", "Vahid",
        "Miqdarı", "Ö/v", "Qiyməti", "Cəmi", "Şirkət", "Obyekt", "Tarix", "Cavabdeh şəxs", "Növ",
    ];

    /// <summary>A workbook shaped like the real one: two title rows, header on row 3, data from row 4.</summary>
    public static ExcelWorkbook Orders(params OrderLine[] lines) => Build(lines, []);

    /// <summary>
    /// The same workbook as an older one: every column an import needs, and no "Növ" column at all.
    /// </summary>
    /// <remarks>
    /// Not the same thing as a workbook whose "Növ" cells are empty. This one cannot say which of its lines
    /// are the month's plan and which are not, and the import is expected to say so rather than decide.
    /// </remarks>
    public static ExcelWorkbook OrdersWithoutLineTypeColumn(params OrderLine[] lines) =>
        Build(lines, [LineTypeColumn]);

    /// <summary>
    /// The same workbook with no "Cavabdeh şəxs" column at all.
    /// </summary>
    /// <remarks>
    /// Not the same thing as a workbook whose "Cavabdeh şəxs" cells are empty. This one cannot say whose lines
    /// these are — for any of them — and the import is expected to say so rather than import them as nobody's.
    /// </remarks>
    public static ExcelWorkbook OrdersWithoutResponsiblePersonColumn(params OrderLine[] lines) =>
        Build(lines, [PersonColumn]);

    /// <summary>A workbook missing both columns, which is two problems and not one.</summary>
    public static ExcelWorkbook OrdersWithoutEitherColumn(params OrderLine[] lines) =>
        Build(lines, [PersonColumn, LineTypeColumn]);

    private const int PersonColumn = 14;
    private const int LineTypeColumn = 15;

    /// <summary>
    /// The workbook, with the named columns left out of the header and of every row alike — which is what a
    /// sheet that never had the column looks like, as opposed to one whose cells are blank.
    /// </summary>
    private static ExcelWorkbook Build(OrderLine[] lines, int[] without)
    {
        int[] columns = [.. Enumerable.Range(0, Header.Length).Where(column => !without.Contains(column))];

        var rows = new List<ExcelRow> { new(1, []), new(2, []), new(3, [.. columns.Select(column => Header[column])]) };
        rows.AddRange(lines.Select((line, index) =>
        {
            object?[] cells =
            [
                (double)(index + 1), line.MainCategory, line.MiddleCategory, line.SubCategory, line.Product,
                line.SpecificationValue, line.SpecificationUnit, line.Quantity, line.OrderUnit, line.Price, line.Total,
                line.Supplier, line.Location, line.Date ?? new DateTime(2026, 3, 1), line.Person, line.LineType,
            ];

            return new ExcelRow(index + 4, [.. columns.Select(column => cells[column])]);
        }));

        return new ExcelWorkbook([new ExcelSheet("Əsas", rows)]);
    }

    /// <summary>
    /// A canonical responsible person, so a fixture line can name somebody the import resolves.
    /// </summary>
    /// <remarks>
    /// A workbook the import reads without a single warning names a person on every line, because that is what
    /// the real workbook does — the history has one on all 3618 of its lines. A fixture that wants that state
    /// needs a record for the name to resolve to, and this is it. Unique per call, so tests do not share one.
    /// </remarks>
    public static async Task<string> ResponsiblePersonAsync(BaxOrdersDbContext db)
    {
        var name = $"Sınaq cavabdehi {Guid.NewGuid():N}"[..26];
        db.ResponsiblePeople.Add(new ResponsiblePerson(name));
        await db.SaveChangesAsync();
        return name;
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

    /// <summary>
    /// Who reviews an import when a test does not say: the Koordinator, whose work the review is. The review writes no
    /// actor, so this person needs no row in the directory.
    /// </summary>
    public static readonly ICurrentUserContext ReviewingCoordinator =
        new TestCurrentUser(Guid.NewGuid(), "Koordinator", BaxOrdersRoles.Coordinator);

    /// <summary>The administrator, who alone saves a product's alternative name (13.2).</summary>
    public static readonly ICurrentUserContext ReviewingAdmin =
        new TestCurrentUser(Guid.NewGuid(), "Administrator", BaxOrdersRoles.Admin);

    public static BulkResolutionService BulkService(BaxOrdersDbContext db, int maxItems = 150, ICurrentUserContext? user = null) =>
        new(
            db,
            Planner(db, maxItems),
            new ImportRevalidator(db, new ImportCatalogLoader(db)),
            new ImportPreviewQueries(db),
            new PostgresLocationCodeGenerator(db),
            new PostgresProductCodeGenerator(db),
            new PostgresImportBatchLock(db),
            user ?? ReviewingCoordinator,
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

    public static ImportResolutionService ResolutionService(BaxOrdersDbContext db, ICurrentUserContext? user = null) =>
        new(
            db,
            new ImportRevalidator(db, new ImportCatalogLoader(db)),
            new ImportPreviewQueries(db),
            new PostgresLocationCodeGenerator(db),
            new PostgresProductCodeGenerator(db),
            new PostgresImportBatchLock(db),
            user ?? ReviewingCoordinator,
            NullLogger<ImportResolutionService>.Instance);

    public static ImportConfirmationPlanner ConfirmationPlanner(BaxOrdersDbContext db) => new(db);

    public static ImportReadinessQueries ReadinessQueries(BaxOrdersDbContext db) => new(db, new ImportReviewQueries(db));

    /// <summary>Pricing classification during review (brief 16.1), as <paramref name="user"/> — the Koordinator by default.</summary>
    public static ImportPricingService PricingService(BaxOrdersDbContext db, ICurrentUserContext? user = null) =>
        new(
            db,
            new ImportPreviewQueries(db),
            new PostgresImportBatchLock(db),
            user ?? ReviewingCoordinator,
            TimeProvider.System,
            NullLogger<ImportPricingService>.Instance);

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
