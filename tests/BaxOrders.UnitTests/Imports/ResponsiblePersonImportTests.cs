using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Imports;

namespace BaxOrders.UnitTests.Imports;

/// <summary>
/// Reading the workbook's "Cavabdeh şəxs" column onto the line.
/// </summary>
/// <remarks>
/// The column can be in five states and they are not three: a name this system knows, a name it does not, a
/// cell somebody left empty, no such column at all, and a row staged before any of this existed. The one that
/// has to stand apart is the absent column — one line with nobody recorded is a warning about that line, a
/// workbook with no such column is an error about the workbook, because every one of its lines would arrive
/// answerable to nobody and the orders they form would read as unassigned rather than unread.
/// <para>
/// In none of the five is a person invented, renamed or merged with another. A name this system cannot resolve
/// goes to the import review, where a person deciding it can see the candidates.
/// </para>
/// </remarks>
public sealed class ResponsiblePersonImportTests
{
    // ---- the five states the column can be in ---------------------------------------------------------

    [Theory]
    [InlineData("Eldar")]
    [InlineData("eldar")]
    [InlineData("  ELDAR ")]
    public void A_name_this_system_knows_is_matched_and_raises_nothing(string cell)
    {
        var result = ImportRowEvaluator.Evaluate(
            ImportTestData.Row((ImportField.ResponsiblePerson, cell)), ImportTestData.TestCatalog());

        Assert.Equal(ImportTestData.EldarPersonId, result.Matches.ResponsiblePersonId);
        Assert.DoesNotContain(result.Issues, issue => issue.IssueType == ImportIssueType.UnknownResponsiblePerson);
    }

    /// <summary>
    /// A name nobody has a record for is a warning that quotes it: the line imports with no person, and the
    /// review is where somebody maps the name or creates the record. Nothing is created from the cell here.
    /// </summary>
    [Fact]
    public void A_name_with_no_canonical_record_is_a_warning_that_quotes_it()
    {
        var result = ImportRowEvaluator.Evaluate(
            ImportTestData.Row((ImportField.ResponsiblePerson, "Qədeş")), ImportTestData.TestCatalog());

        var issue = OnlyPersonIssue(result.Issues);
        Assert.Equal(IssueSeverity.Warning, issue.Severity);
        Assert.Equal("Cavabdeh şəxs", issue.FieldName);
        Assert.Contains("Qədeş", issue.Message, StringComparison.Ordinal);
        Assert.Null(result.Matches.ResponsiblePersonId);
    }

    /// <summary>
    /// An empty cell in a column that exists is one line waiting on one person: a warning. The line imports
    /// with nobody on it, which is what the source says, and nobody is chosen for it.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void An_empty_cell_in_a_column_that_exists_is_a_warning_about_that_one_line(string? cell)
    {
        var result = ImportRowEvaluator.Evaluate(
            ImportTestData.Row((ImportField.ResponsiblePerson, cell)), ImportTestData.TestCatalog());

        var issue = OnlyPersonIssue(result.Issues);
        Assert.Equal(IssueSeverity.Warning, issue.Severity);
        Assert.Equal("Cavabdeh şəxs", issue.FieldName);
        Assert.Contains("boşdur", issue.Message, StringComparison.Ordinal);
        Assert.Null(result.Matches.ResponsiblePersonId);
    }

    /// <summary>
    /// No such column anywhere in the sheet. An error, in the words the business asked for, so the batch
    /// carrying it cannot become ready to import.
    /// </summary>
    [Fact]
    public void A_sheet_with_no_such_column_is_an_error_in_the_words_the_business_asked_for()
    {
        var issue = OnlyPersonIssue(
            ImportRowEvaluator.Evaluate(ImportTestData.RowWithoutResponsiblePersonColumn(), ImportTestData.TestCatalog()).Issues);

        Assert.Equal(IssueSeverity.Error, issue.Severity);
        Assert.Equal("Cavabdeh şəxs", issue.FieldName);
        Assert.Equal("Cavabdeh şəxs sütunu tapılmadı. Sətir üzrə cavabdeh oxuna bilmədi.", issue.Message);
    }

    /// <summary>
    /// The distinction the whole rule rests on: an absent column and an empty cell must never produce the same
    /// answer, or a workbook that cannot say whose lines these are imports as though nobody had asked for them.
    /// </summary>
    [Fact]
    public void An_absent_column_and_an_empty_cell_are_never_the_same_answer()
    {
        var absent = OnlyPersonIssue(
            ImportRowEvaluator.Evaluate(ImportTestData.RowWithoutResponsiblePersonColumn(), ImportTestData.TestCatalog()).Issues);
        var empty = OnlyPersonIssue(
            ImportRowEvaluator.Evaluate(ImportTestData.Row((ImportField.ResponsiblePerson, null)), ImportTestData.TestCatalog()).Issues);

        Assert.Equal(IssueSeverity.Error, absent.Severity);
        Assert.Equal(IssueSeverity.Warning, empty.Severity);
        Assert.NotEqual(absent.Message, empty.Message);
    }

    /// <summary>
    /// An error the batch cannot be talked out of. A missing column is an Error, and an import holding an
    /// Error-severity row issue cannot be ready to import — that is what actually blocks it.
    /// </summary>
    [Fact]
    public void The_missing_column_is_the_kind_of_issue_that_blocks_an_import()
    {
        var issue = OnlyPersonIssue(
            ImportRowEvaluator.Evaluate(ImportTestData.RowWithoutResponsiblePersonColumn(), ImportTestData.TestCatalog()).Issues);

        Assert.True(ImportIssueRules.IsBlocking(issue.IssueType, issue.Severity));
    }

    /// <summary>A line whose cell is merely empty still imports: the warning is not a block.</summary>
    [Fact]
    public void An_empty_cell_does_not_block_the_import()
    {
        var issue = OnlyPersonIssue(
            ImportRowEvaluator.Evaluate(ImportTestData.Row((ImportField.ResponsiblePerson, "")), ImportTestData.TestCatalog()).Issues);

        Assert.False(ImportIssueRules.IsBlocking(issue.IssueType, issue.Severity));
    }

    // ---- what staging remembers -----------------------------------------------------------------------

    /// <summary>
    /// The error has to survive staging. A staged row is revalidated from what it remembers rather than from
    /// the workbook, so a row that recorded a sheet without the column raises the error again — otherwise the
    /// block would disappear the first time anybody opened the batch for review.
    /// </summary>
    [Fact]
    public void A_staged_row_remembers_that_its_sheet_had_no_such_column()
    {
        var staged = ImportTestData.StagedRow(
            hasOrderLineTypeColumn: true, cell: "Aylıq sifariş", hasResponsiblePersonColumn: false);

        var issue = OnlyPersonIssue(
            ImportRowEvaluator.Evaluate(EffectiveRowValues.Of(staged), ImportTestData.TestCatalog()).Issues);

        Assert.Equal(IssueSeverity.Error, issue.Severity);
        Assert.Equal(ImportRowEvaluator.MissingResponsiblePersonColumn, issue.Message);
    }

    /// <summary>
    /// A row staged before any of this existed remembers nothing about it, and nothing is what it is read as: a
    /// batch already in review is not made invalid by a rule written after it was staged. Its line still has
    /// nobody on it and is still in front of somebody — as a warning, not as a block.
    /// </summary>
    [Fact]
    public void A_row_staged_before_this_was_recorded_is_not_blocked_by_it()
    {
        var staged = ImportTestData.StagedRow(
            hasOrderLineTypeColumn: true, cell: "Aylıq sifariş", hasResponsiblePersonColumn: null);

        var issue = OnlyPersonIssue(
            ImportRowEvaluator.Evaluate(EffectiveRowValues.Of(staged), ImportTestData.TestCatalog()).Issues);

        Assert.Equal(IssueSeverity.Warning, issue.Severity);
    }

    /// <summary>A sheet that does have the column, with a name in it, is read exactly as it always was.</summary>
    [Fact]
    public void A_staged_row_from_a_sheet_that_had_the_column_is_read_as_before()
    {
        var staged = ImportTestData.StagedRow(
            hasOrderLineTypeColumn: true, cell: "Aylıq sifariş", hasResponsiblePersonColumn: true, person: "Eldar");

        var result = ImportRowEvaluator.Evaluate(EffectiveRowValues.Of(staged), ImportTestData.TestCatalog());

        Assert.Equal(ImportTestData.EldarPersonId, result.Matches.ResponsiblePersonId);
        Assert.DoesNotContain(result.Issues, issue => issue.IssueType == ImportIssueType.UnknownResponsiblePerson);
    }

    // ---- what reaches staging -------------------------------------------------------------------------

    /// <summary>The cell reaches staging word for word, and beside it what the sheet itself had.</summary>
    [Theory]
    [InlineData("Eldar")]
    [InlineData("Qədeş")]
    public void The_cell_and_the_shape_of_the_sheet_both_reach_the_import_row(string cell)
    {
        var values = ImportTestData.Row((ImportField.ResponsiblePerson, cell)).ToOriginalValues([]);

        Assert.Equal(cell, values.ResponsiblePersonName);
        Assert.True(values.HasResponsiblePersonColumn);
    }

    [Fact]
    public void A_sheet_without_the_column_records_that_it_had_none()
    {
        var values = ImportTestData.RowWithoutResponsiblePersonColumn().ToOriginalValues([]);

        Assert.Null(values.ResponsiblePersonName);
        Assert.False(values.HasResponsiblePersonColumn);
    }

    /// <summary>
    /// Both columns can be missing at once, and then both are reported. One error hiding the other would send
    /// somebody to fix half a workbook.
    /// </summary>
    [Fact]
    public void A_sheet_missing_both_columns_is_told_about_both()
    {
        var row = ImportTestData.RowWithout(ImportField.OrderLineType, ImportField.ResponsiblePerson);

        var errors = ImportRowEvaluator.Evaluate(row, ImportTestData.TestCatalog()).Issues
            .Where(issue => issue.Severity == IssueSeverity.Error)
            .Select(issue => issue.Message)
            .ToList();

        Assert.Equal(2, errors.Count);
        Assert.Contains(ImportRowEvaluator.MissingOrderLineTypeColumn, errors);
        Assert.Contains(ImportRowEvaluator.MissingResponsiblePersonColumn, errors);
    }

    private static ImportIssueDraft OnlyPersonIssue(IReadOnlyList<ImportIssueDraft> issues) =>
        Assert.Single(issues, issue => issue.IssueType == ImportIssueType.UnknownResponsiblePerson);
}
