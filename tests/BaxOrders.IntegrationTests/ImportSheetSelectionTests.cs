using BaxOrders.Application.Imports;
using BaxOrders.Infrastructure.Persistence;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Imports;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Reading the one sheet the business named, through the real import service against a real PostgreSQL.
/// </summary>
/// <remarks>
/// The order workbook carries the same lines twice: on "Aylıq", which has the "Növ" column, and on "Əsas",
/// which does not. Reading both staged every line twice, made each one the other's duplicate, and blocked the
/// whole import on three and a half thousand rows that were never asked to state a classification. What these
/// tests pin is that only "Aylıq" is read, that nothing falls back to "Əsas", and that a workbook without
/// "Aylıq" is refused in the words the business asked for rather than quietly importing the other sheet.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ImportSheetSelectionTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    // ---- which sheet is read --------------------------------------------------------------------------

    /// <summary>
    /// The real file's shape. Only the authoritative sheet reaches staging, and the other is reported as left
    /// alone rather than silently omitted.
    /// </summary>
    [PostgresFact]
    public async Task A_workbook_with_both_sheets_stages_only_the_authoritative_one()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersOnBothSheets(new OrderLine(), new OrderLine(), new OrderLine());

        var result = await ImportService(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), None);

        Assert.Equal(ImportOutcome.Staged, result.Outcome);
        Assert.Equal(3, result.Preview!.Batch.TotalRows);

        var sheets = await StagedSheetsAsync(db, result.ImportBatchId!.Value);
        Assert.Equal([ImportSheets.Authoritative], sheets);

        // Both sheets are accounted for in what the uploader is shown; one of them simply read nothing.
        var reported = result.Sheets.ToDictionary(sheet => sheet.SheetName);
        Assert.Equal(2, reported.Count);
        Assert.Equal(3, reported[ImportSheets.Authoritative].DataRows);
        Assert.Equal(0, reported["Əsas"].DataRows);
        Assert.Null(reported["Əsas"].HeaderRowNumber);
        Assert.Equal(ImportSheets.NotTheAuthoritativeSheet, reported["Əsas"].Problem);
    }

    /// <summary>
    /// Not one row, not one issue, nothing. "Əsas" has no "Növ" column, so a single staged row of it would put
    /// a blocking error on the batch — which is how the bug showed itself.
    /// </summary>
    [PostgresFact]
    public async Task No_row_and_no_issue_of_the_other_sheet_reaches_the_batch()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersOnBothSheets(new OrderLine(), new OrderLine());

        var result = await ImportService(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), None);

        var batchId = result.ImportBatchId!.Value;
        Assert.Empty(await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId && row.SheetName != ImportSheets.Authoritative)
            .ToListAsync(None));
        Assert.DoesNotContain(result.Preview!.IssueSummary,
            issue => issue.IssueType == ImportIssueType.UnknownOrderLineType && issue.Severity == IssueSeverity.Error);
    }

    /// <summary>
    /// The heart of it: the same line on two sheets is not a duplicate of itself. Before this, every line of the
    /// real workbook was reported as a possible duplicate of its twin on the other sheet.
    /// </summary>
    [PostgresFact]
    public async Task The_same_line_on_two_sheets_is_not_reported_as_its_own_duplicate()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersOnBothSheets(
            new OrderLine(Product: "Test malı", Quantity: 10, Price: 2),
            new OrderLine(Product: "Test malı", Quantity: 7, Price: 2));

        var result = await ImportService(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), None);

        Assert.DoesNotContain(result.Preview!.IssueSummary, issue => issue.IssueType == ImportIssueType.DuplicateRow);
    }

    /// <summary>Two identical lines inside the authoritative sheet are still reported. The rule is not weakened.</summary>
    [PostgresFact]
    public async Task Two_identical_lines_inside_the_authoritative_sheet_are_still_reported()
    {
        await using var db = database.CreateContext();
        var line = new OrderLine(Product: "Test malı", Quantity: 10, Price: 2);
        var workbook = OrdersOnBothSheets(line, line);

        var result = await ImportService(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), None);

        var duplicates = Assert.Single(result.Preview!.IssueSummary,
            issue => issue.IssueType == ImportIssueType.DuplicateRow);
        Assert.Equal((IssueSeverity.Info, 2), (duplicates.Severity, duplicates.Count));
    }

    // ---- when it is not there -------------------------------------------------------------------------

    /// <summary>
    /// A workbook whose only sheet is "Əsas" is refused, and is told which sheet is missing. The alternative —
    /// falling back to the sheet that is there — is the mistake this whole rule exists to prevent.
    /// </summary>
    [PostgresFact]
    public async Task A_workbook_without_the_authoritative_sheet_is_refused_in_those_words()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersOnSheet("Əsas", new OrderLine(), new OrderLine());

        var result = await ImportService(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), None);

        Assert.Equal(ImportOutcome.Failed, result.Outcome);
        Assert.Equal(ImportSheets.MissingAuthoritativeSheet, result.Message);

        var batch = await db.ImportBatches.AsNoTracking().SingleAsync(item => item.Id == result.ImportBatchId, None);
        Assert.Equal(ImportStatus.Failed, batch.Status);
        Assert.Equal(ImportSheets.MissingAuthoritativeSheet, batch.FailureReason);
        Assert.Empty(await db.ImportRows.AsNoTracking().Where(row => row.ImportBatchId == batch.Id).ToListAsync(None));
    }

    [PostgresFact]
    public async Task A_sheet_named_almost_right_is_not_read_instead()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersOnSheet("Aylıq sifarişlər", new OrderLine());

        var result = await ImportService(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), None);

        Assert.Equal(ImportOutcome.Failed, result.Outcome);
        Assert.Equal(ImportSheets.MissingAuthoritativeSheet, result.Message);
    }

    /// <summary>A tab somebody typed with a stray space is the same sheet, and is read.</summary>
    [PostgresFact]
    public async Task The_sheet_is_found_however_its_tab_is_typed()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersOnSheet(" AYLIQ ", new OrderLine(), new OrderLine());

        var result = await ImportService(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), None);

        Assert.Equal(ImportOutcome.Staged, result.Outcome);
        Assert.Equal(2, result.Preview!.Batch.TotalRows);
    }

    // ---- the header and the footer of the sheet that is read -------------------------------------------

    [PostgresFact]
    public async Task The_header_row_of_the_authoritative_sheet_is_recognised()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersOnBothSheets(new OrderLine());

        var result = await ImportService(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), None);

        var sheet = Assert.Single(result.Sheets, item => item.SheetName == ImportSheets.Authoritative);
        Assert.Equal(3, sheet.HeaderRowNumber);
        Assert.Empty(sheet.MissingRequiredColumns);
        Assert.Null(sheet.Problem);
        Assert.Equal(4, (await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == result.ImportBatchId).SingleAsync(None)).RowNumber);
    }

    /// <summary>
    /// The sheet's own total is not a line. The real file ends with a blank row and a row holding nothing but
    /// the total in "Cəmi"; staging that produced a row with four errors describing an order nobody placed.
    /// </summary>
    [PostgresFact]
    public async Task A_blank_row_and_the_sheet_total_are_not_staged()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersWithSummaryFooter(
            new OrderLine(Quantity: 10, Price: 2), new OrderLine(Quantity: 5, Price: 3));

        var result = await ImportService(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), None);

        Assert.Equal(2, result.Preview!.Batch.TotalRows);
        Assert.Equal([4, 5], await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == result.ImportBatchId)
            .OrderBy(row => row.RowNumber).Select(row => row.RowNumber).ToListAsync(None));

        // And none of the complaints the footer used to raise about itself.
        Assert.DoesNotContain(result.Preview.IssueSummary,
            issue => issue.IssueType == ImportIssueType.MissingRequiredValue);
        Assert.DoesNotContain(result.Preview.IssueSummary, issue => issue.IssueType == ImportIssueType.InvalidDate);
    }

    /// <summary>
    /// A line somebody left half-written is still a line: it stages, and what it is missing is reported. The
    /// footer rule must not become a way for real rows to vanish.
    /// </summary>
    [PostgresFact]
    public async Task A_sparse_business_row_is_staged_and_its_gaps_are_reported()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersWithSummaryFooter(
            new OrderLine(Quantity: 10, Price: 2),
            new OrderLine(Product: "Test malı", Quantity: null, OrderUnit: null, Price: null, Total: null));

        var result = await ImportService(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), None);

        Assert.Equal(2, result.Preview!.Batch.TotalRows);
        var sparse = await db.ImportRows.AsNoTracking()
            .Include(row => row.Issues)
            .SingleAsync(row => row.ImportBatchId == result.ImportBatchId && row.RowNumber == 5, None);
        Assert.Equal("Test malı", sparse.OriginalProductName);
        Assert.Contains(sparse.Issues, issue => issue.IssueType == ImportIssueType.InvalidQuantity);
        Assert.Equal(ImportRowValidationStatus.Invalid, sparse.ValidationStatus);
    }

    // ---- what still works ----------------------------------------------------------------------------

    /// <summary>The classification is read from the sheet that is read, exactly as before.</summary>
    [PostgresFact]
    public async Task The_classification_is_still_read_and_still_complained_about()
    {
        await using var db = database.CreateContext();
        var workbook = OrdersOnBothSheets(
            new OrderLine(LineType: "Aylıq sifariş"),
            new OrderLine(LineType: "Aylıqdan kənar"),
            new OrderLine(LineType: null),
            new OrderLine(LineType: "Təcili"));

        var result = await ImportService(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), None);

        var rows = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == result.ImportBatchId)
            .OrderBy(row => row.RowNumber)
            .Select(row => row.OriginalOrderLineType)
            .ToListAsync(None);
        Assert.Equal(["Aylıq sifariş", "Aylıqdan kənar", null, "Təcili"], rows);

        // Two warnings — the blank cell and the word nobody can read — and no error, because the column is there.
        var classification = Assert.Single(result.Preview!.IssueSummary,
            issue => issue.IssueType == ImportIssueType.UnknownOrderLineType);
        Assert.Equal((IssueSeverity.Warning, 2), (classification.Severity, classification.Count));
    }

    /// <summary>And so is the responsible person, from the same sheet and no other.</summary>
    [PostgresFact]
    public async Task The_responsible_person_is_still_read_and_still_complained_about()
    {
        await using var db = database.CreateContext();
        var person = await ResponsiblePersonAsync(db);
        var workbook = OrdersOnBothSheets(
            new OrderLine(Person: person), new OrderLine(Person: "Kimsə"), new OrderLine(Person: null));

        var result = await ImportService(db, () => workbook).ImportAsync(Upload(UniqueXlsxBytes()), None);

        var rows = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == result.ImportBatchId)
            .OrderBy(row => row.RowNumber)
            .ToListAsync(None);
        Assert.Equal([person, "Kimsə", null], rows.Select(row => row.OriginalResponsiblePersonName));
        Assert.NotNull(rows[0].MatchedResponsiblePersonId);
        Assert.Null(rows[1].MatchedResponsiblePersonId);

        // The unresolvable name and the empty cell, both warnings; nothing from the other sheet.
        var people = Assert.Single(result.Preview!.IssueSummary,
            issue => issue.IssueType == ImportIssueType.UnknownResponsiblePerson);
        Assert.Equal((IssueSeverity.Warning, 2), (people.Severity, people.Count));
    }

    private static async Task<List<string>> StagedSheetsAsync(BaxOrdersDbContext db, long batchId) =>
        await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId)
            .Select(row => row.SheetName)
            .Distinct()
            .ToListAsync(None);
}
