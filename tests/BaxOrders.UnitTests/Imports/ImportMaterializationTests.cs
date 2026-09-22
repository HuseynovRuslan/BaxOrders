using BaxOrders.Domain;
using BaxOrders.Domain.Imports;

namespace BaxOrders.UnitTests.Imports;

public sealed class ImportMaterializationTests
{
    private static readonly DateTime Now = new(2026, 9, 22, 8, 0, 0, DateTimeKind.Utc);
    private static readonly DateOnly September = new(2026, 9, 1);

    [Fact]
    public void A_skipped_group_needs_a_reason()
    {
        var materialization = new ImportMaterialization(Batch(), Now);

        Assert.Throws<DomainException>(() =>
            materialization.AddGroup(1, September, MaterializationAction.Skipped, null, 12, skipReason: null));
    }

    [Fact]
    public void A_skipped_group_records_what_was_left_out_and_why()
    {
        var materialization = new ImportMaterialization(Batch(), Now);

        var group = materialization.AddGroup(1, September, MaterializationAction.Skipped, null, 12, "sifariş deyil");

        // "Not imported on purpose" must stay distinguishable from "the system forgot these rows".
        Assert.Equal(("sifariş deyil", 12), (group.SkipReason, group.SourceRowCount));
        Assert.Null(group.OrderRequestId);
        Assert.Null(group.Version);
        Assert.Equal(1, materialization.SkippedGroups);
        Assert.Equal(12, materialization.SkippedRows);
        Assert.Equal(0, materialization.CreatedRequests);
    }

    [Fact]
    public void A_created_group_needs_the_request_it_created()
    {
        var materialization = new ImportMaterialization(Batch(), Now);

        Assert.Throws<ArgumentNullException>(() =>
            materialization.AddGroup(1, September, MaterializationAction.Created, null, 5, skipReason: null));
    }

    [Fact]
    public void Only_a_skipped_group_carries_a_reason()
    {
        var materialization = new ImportMaterialization(Batch(), Now);

        Assert.Throws<DomainException>(() =>
            materialization.AddGroup(1, September, MaterializationAction.Created, null, 5, "səbəb"));
    }

    [Fact]
    public void A_group_period_must_be_the_first_day_of_a_month()
    {
        var materialization = new ImportMaterialization(Batch(), Now);

        Assert.Throws<DomainException>(() =>
            materialization.AddGroup(1, new DateOnly(2026, 9, 15), MaterializationAction.Skipped, null, 1, "səbəb"));
    }

    [Fact]
    public void Only_a_ready_import_can_be_confirmed()
    {
        var batch = Batch();

        // Straight from Uploaded: nothing has been read, let alone reviewed.
        Assert.Throws<DomainException>(() => batch.MarkImported(Now));
        Assert.Equal(ImportStatus.Uploaded, batch.Status);
    }

    [Fact]
    public void Confirming_finishes_the_batch()
    {
        var batch = Ready();

        batch.MarkImported(Now);

        Assert.Equal(ImportStatus.Imported, batch.Status);
        Assert.Equal(Now, batch.CompletedAtUtc);

        // An imported batch accepts no further review decision, and cannot be imported a second time.
        Assert.Throws<DomainException>(batch.EnsureReviewable);
        Assert.Throws<DomainException>(() => batch.MarkImported(Now));
    }

    private static ImportBatch Batch() => new("kamran.xlsx", new string('a', 64), Now);

    private static ImportBatch Ready()
    {
        var batch = Batch();
        batch.StartParsing();
        batch.StartValidating();
        // No staged rows in this fixture: the summary only has to add up to the batch total, which is zero.
        batch.CompleteValidation(validRows: 0, warningRows: 0, invalidRows: 0, requiresReview: false, completedAtUtc: Now);
        return batch;
    }
}
