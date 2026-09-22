using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Domain;
using BaxOrders.Domain.Imports;

namespace BaxOrders.UnitTests.Imports;

public sealed class ImportLifecycleTests
{
    private static readonly DateTime Now = new(2026, 9, 14, 10, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Batch_moves_through_parsing_and_validating_to_review()
    {
        var batch = new ImportBatch("file.xlsx", null, Now);
        batch.StartParsing();
        batch.AddRow("Əsas", 4, new ImportRowOriginalValues());
        batch.AddRow("Əsas", 5, new ImportRowOriginalValues());
        batch.StartValidating();

        batch.CompleteValidation(validRows: 1, warningRows: 0, invalidRows: 1, requiresReview: true, Now);

        Assert.Equal(ImportStatus.NeedsReview, batch.Status);
        Assert.Equal((2, 1, 0, 1), (batch.TotalRows, batch.ValidRows, batch.WarningRows, batch.InvalidRows));
        Assert.Equal(Now, batch.CompletedAtUtc);
    }

    [Fact]
    public void Batch_with_only_non_blocking_warnings_is_ready_to_import()
    {
        var batch = ValidatingBatch(rows: 2);

        batch.CompleteValidation(validRows: 1, warningRows: 1, invalidRows: 0, requiresReview: false, Now);

        Assert.Equal(ImportStatus.ReadyToImport, batch.Status);
    }

    [Fact]
    public void Invalid_rows_can_never_be_ready_to_import()
    {
        Assert.Throws<DomainException>(() => ValidatingBatch(rows: 1).CompleteValidation(0, 0, 1, requiresReview: false, Now));
    }

    [Fact]
    public void Every_row_must_be_counted_exactly_once()
    {
        Assert.Throws<DomainException>(() => ValidatingBatch(rows: 2).CompleteValidation(2, 1, 0, requiresReview: false, Now));
    }

    [Fact]
    public void Steps_cannot_be_skipped()
    {
        var batch = new ImportBatch("file.xlsx", null, Now);

        Assert.Throws<DomainException>(batch.StartValidating);
        Assert.Throws<DomainException>(() => batch.CompleteValidation(0, 0, 0, false, Now));
    }

    [Fact]
    public void Processing_batch_can_fail_but_a_finished_one_cannot()
    {
        var failing = new ImportBatch("file.xlsx", null, Now);
        failing.StartParsing();
        failing.MarkFailed(new string('x', 3000), Now);

        var finished = ValidatingBatch(rows: 0);
        finished.CompleteValidation(0, 0, 0, false, Now);

        Assert.Equal(ImportStatus.Failed, failing.Status);
        Assert.Equal(ImportBatch.FailureReasonMaxLength, failing.FailureReason!.Length);
        Assert.Throws<DomainException>(() => finished.MarkFailed("late failure", Now));
    }

    [Fact]
    public void Row_status_follows_the_most_severe_issue()
    {
        var batch = new ImportBatch("file.xlsx", null, Now);
        batch.StartParsing();
        var clean = batch.AddRow("Əsas", 4, new ImportRowOriginalValues());
        var infoOnly = batch.AddRow("Əsas", 5, new ImportRowOriginalValues());
        var warning = batch.AddRow("Əsas", 6, new ImportRowOriginalValues());
        var error = batch.AddRow("Əsas", 7, new ImportRowOriginalValues());

        infoOnly.AddIssue(ImportIssueType.Other, IssueSeverity.Info, ImportIssueOrigin.Parsing, "note");
        warning.AddIssue(ImportIssueType.MissingPrice, IssueSeverity.Warning, ImportIssueOrigin.Parsing, "no price");
        error.AddIssue(ImportIssueType.MissingPrice, IssueSeverity.Warning, ImportIssueOrigin.Parsing, "no price");
        error.AddIssue(ImportIssueType.InvalidQuantity, IssueSeverity.Error, ImportIssueOrigin.Parsing, "bad quantity");

        Assert.Equal(ImportRowValidationStatus.Valid, clean.RefreshValidationStatus());
        Assert.Equal(ImportRowValidationStatus.Valid, infoOnly.RefreshValidationStatus());
        Assert.Equal(ImportRowValidationStatus.NeedsReview, warning.RefreshValidationStatus());
        Assert.Equal(ImportRowValidationStatus.Invalid, error.RefreshValidationStatus());
    }

    [Fact]
    public void Possible_duplicate_alone_keeps_a_row_valid()
    {
        var batch = new ImportBatch("file.xlsx", null, Now);
        batch.StartParsing();
        var row = batch.AddRow("Əsas", 4, new ImportRowOriginalValues());

        row.AddIssue(ImportIssueType.DuplicateRow, IssueSeverity.Info, ImportIssueOrigin.DuplicateDetection, "Possible duplicate: same business values as row 9.");

        Assert.Equal(ImportRowValidationStatus.Valid, row.RefreshValidationStatus());
    }

    [Theory]
    [InlineData(ImportIssueType.DuplicateRow, IssueSeverity.Info, false)]
    [InlineData(ImportIssueType.Other, IssueSeverity.Info, false)]
    [InlineData(ImportIssueType.InvalidPrice, IssueSeverity.Warning, false)]
    [InlineData(ImportIssueType.MissingPrice, IssueSeverity.Warning, false)]
    [InlineData(ImportIssueType.UnknownSupplier, IssueSeverity.Warning, false)]
    [InlineData(ImportIssueType.UnknownProductVariant, IssueSeverity.Warning, true)]
    [InlineData(ImportIssueType.InvalidQuantity, IssueSeverity.Error, true)]
    public void Only_errors_and_unresolved_products_block_ready_to_import(ImportIssueType issueType, IssueSeverity severity, bool blocking)
    {
        Assert.Equal(blocking, ImportIssueRules.IsBlocking(issueType, severity));
    }

    private static ImportBatch ValidatingBatch(int rows)
    {
        var batch = new ImportBatch("file.xlsx", null, Now);
        batch.StartParsing();
        for (var row = 1; row <= rows; row++)
        {
            batch.AddRow("Əsas", row + 3, new ImportRowOriginalValues());
        }

        batch.StartValidating();
        return batch;
    }
}
