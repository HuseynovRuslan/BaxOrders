using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Orders;

namespace BaxOrders.UnitTests.Imports;

/// <summary>
/// Reading the workbook's "Növ" column. Two values are recognised and nothing else is guessed at, because a
/// guess here would put an unplanned purchase into — or out of — the monthly figures.
/// </summary>
/// <remarks>
/// The column can be in five states and they are not three: a value this system knows, a word it does not, a
/// cell somebody left empty, no such column at all, and a row staged before any of this existed. The last two
/// are the ones worth keeping apart — one line nobody classified is a warning about that line, a workbook
/// that cannot classify any of its lines is an error about the workbook.
/// </remarks>
public sealed class OrderLineTypeImportTests
{
    // ---- what the parser reads ------------------------------------------------------------------------

    [Theory]
    [InlineData("Aylıq sifariş")]
    [InlineData("aylıq sifariş")]
    [InlineData("AYLIQ SİFARİŞ")]
    [InlineData("  Aylıq   sifariş  ")]
    public void The_month_s_planned_material_is_read_however_it_is_typed(string cell)
    {
        Assert.Equal(OrderLineType.Monthly, OrderLineTypes.Read(cell));
    }

    [Theory]
    [InlineData("Aylıqdan kənar")]
    [InlineData("aylıqdan kənar")]
    [InlineData(" Aylıqdan Kənar ")]
    // The label this application itself shows, so a sheet built from one of its own screens reads back.
    [InlineData("Aylıqdan Kənar sifarişlər")]
    public void Material_ordered_on_top_of_the_plan_is_read_however_it_is_typed(string cell)
    {
        Assert.Equal(OrderLineType.OutsideMonthly, OrderLineTypes.Read(cell));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void An_empty_cell_classifies_nothing_and_is_not_an_unreadable_one(string? cell)
    {
        Assert.Null(OrderLineTypes.Read(cell));
        Assert.False(OrderLineTypes.IsUnrecognized(cell));
    }

    [Theory]
    [InlineData("Aylıq")]
    [InlineData("kənar")]
    [InlineData("Təcili")]
    [InlineData("1")]
    public void A_word_this_system_does_not_know_classifies_nothing_and_is_reported(string cell)
    {
        Assert.Null(OrderLineTypes.Read(cell));
        Assert.True(OrderLineTypes.IsUnrecognized(cell));
    }

    // ---- the five states the column can be in ---------------------------------------------------------

    [Theory]
    [InlineData("Aylıq sifariş")]
    [InlineData("Aylıqdan kənar")]
    public void A_cell_this_system_can_read_raises_nothing(string cell)
    {
        var row = ImportTestData.Row((ImportField.OrderLineType, cell));

        Assert.DoesNotContain(
            ImportRowEvaluator.Evaluate(row, ImportTestData.TestCatalog()).Issues,
            issue => issue.IssueType == ImportIssueType.UnknownOrderLineType);
    }

    /// <summary>
    /// A warning, not an error: the line still imports, it arrives unclassified, and the cell that could not be
    /// read is quoted so the person deciding has the evidence in front of them.
    /// </summary>
    [Fact]
    public void An_unreadable_cell_is_a_warning_that_quotes_it_and_names_what_is_known()
    {
        var row = ImportTestData.Row((ImportField.OrderLineType, "Təcili"));

        var issue = Assert.Single(
            ImportRowEvaluator.Evaluate(row, ImportTestData.TestCatalog()).Issues,
            issue => issue.IssueType == ImportIssueType.UnknownOrderLineType);

        Assert.Equal(IssueSeverity.Warning, issue.Severity);
        Assert.Equal("Növ", issue.FieldName);
        Assert.Contains("Təcili", issue.Message, StringComparison.Ordinal);
        Assert.Contains("Aylıq sifariş", issue.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// An empty cell in a column that exists is one line waiting on one person, so it is a warning: the line
    /// imports, arrives unclassified — which is true — and is put in front of somebody.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void An_empty_cell_in_a_column_that_exists_is_a_warning_about_that_one_line(string? cell)
    {
        var row = ImportTestData.Row((ImportField.OrderLineType, cell));

        var issue = Assert.Single(
            ImportRowEvaluator.Evaluate(row, ImportTestData.TestCatalog()).Issues,
            issue => issue.IssueType == ImportIssueType.UnknownOrderLineType);

        Assert.Equal(IssueSeverity.Warning, issue.Severity);
        Assert.Equal("Növ", issue.FieldName);
        Assert.Contains("boşdur", issue.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// No such column anywhere in the sheet. That is not one line waiting on somebody: it is a workbook that
    /// cannot say which of its lines are the month's plan and which are not. An error, so the batch carrying
    /// it cannot become ready to import and nothing is written as though somebody had decided it.
    /// </summary>
    [Fact]
    public void A_sheet_with_no_such_column_is_an_error_in_the_words_the_business_asked_for()
    {
        var row = ImportTestData.RowWithoutLineTypeColumn();

        var issue = Assert.Single(
            ImportRowEvaluator.Evaluate(row, ImportTestData.TestCatalog()).Issues,
            issue => issue.IssueType == ImportIssueType.UnknownOrderLineType);

        Assert.Equal(IssueSeverity.Error, issue.Severity);
        Assert.Equal("Növ", issue.FieldName);
        Assert.Equal("Növ sütunu tapılmadı. Sifariş növü təsnifatı oxuna bilmədi.", issue.Message);
    }

    /// <summary>
    /// The distinction the whole hardening rests on: an absent column and an empty cell must never produce the
    /// same answer, or a workbook that cannot be classified imports as though somebody had classified it.
    /// </summary>
    [Fact]
    public void An_absent_column_and_an_empty_cell_are_never_the_same_answer()
    {
        var absent = OnlyLineTypeIssue(ImportTestData.RowWithoutLineTypeColumn());
        var empty = OnlyLineTypeIssue(ImportTestData.Row((ImportField.OrderLineType, null)));

        Assert.Equal(IssueSeverity.Error, absent.Severity);
        Assert.Equal(IssueSeverity.Warning, empty.Severity);
        Assert.NotEqual(absent.Message, empty.Message);
    }

    /// <summary>
    /// The error has to survive staging. A staged row is revalidated from what it remembers rather than from
    /// the workbook, so a row that recorded a sheet without the column raises the error again — otherwise the
    /// block would disappear the first time anybody opened the batch for review.
    /// </summary>
    [Fact]
    public void A_staged_row_remembers_that_its_sheet_had_no_such_column()
    {
        var staged = ImportTestData.StagedRow(hasOrderLineTypeColumn: false);

        var issue = OnlyLineTypeIssue(EffectiveRowValues.Of(staged));

        Assert.Equal(IssueSeverity.Error, issue.Severity);
        Assert.Equal(ImportRowEvaluator.MissingOrderLineTypeColumn, issue.Message);
    }

    /// <summary>
    /// A row staged before any of this existed remembers nothing about it, and nothing is what it is read as:
    /// a batch already in review is not made invalid by a rule written after it was staged. The line is still
    /// unclassified and still in front of somebody — as a warning, not as a block.
    /// </summary>
    [Fact]
    public void A_row_staged_before_this_was_recorded_is_not_blocked_by_it()
    {
        var staged = ImportTestData.StagedRow(hasOrderLineTypeColumn: null);

        Assert.Equal(IssueSeverity.Warning, OnlyLineTypeIssue(EffectiveRowValues.Of(staged)).Severity);
    }

    /// <summary>A sheet that does have the column is read exactly as it always was.</summary>
    [Fact]
    public void A_staged_row_from_a_sheet_that_had_the_column_is_read_as_before()
    {
        var staged = ImportTestData.StagedRow(hasOrderLineTypeColumn: true, cell: "Aylıqdan kənar");

        Assert.DoesNotContain(
            ImportRowEvaluator.Evaluate(EffectiveRowValues.Of(staged), ImportTestData.TestCatalog()).Issues,
            issue => issue.IssueType == ImportIssueType.UnknownOrderLineType);
    }

    // ---- what reaches staging -------------------------------------------------------------------------

    /// <summary>The cell reaches staging exactly as written, whether or not this system could read it.</summary>
    [Theory]
    [InlineData("Aylıqdan kənar")]
    [InlineData("Təcili")]
    public void The_cell_is_kept_on_the_import_row_word_for_word(string cell)
    {
        var row = ImportTestData.Row((ImportField.OrderLineType, cell));

        Assert.Equal(cell, row.ToOriginalValues([]).OrderLineType);
    }

    /// <summary>And so does whether there was a column to read it from.</summary>
    [Fact]
    public void Whether_the_sheet_had_the_column_reaches_staging_too()
    {
        Assert.True(ImportTestData.Row().ToOriginalValues([]).HasOrderLineTypeColumn);
        Assert.False(ImportTestData.RowWithoutLineTypeColumn().ToOriginalValues([]).HasOrderLineTypeColumn);
    }

    private static ImportIssueDraft OnlyLineTypeIssue(IRowValues row) =>
        Assert.Single(
            ImportRowEvaluator.Evaluate(row, ImportTestData.TestCatalog()).Issues,
            issue => issue.IssueType == ImportIssueType.UnknownOrderLineType);
}
