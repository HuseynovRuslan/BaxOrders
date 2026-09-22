using BaxOrders.Domain.Imports;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ImportMaterializationConfiguration : IEntityTypeConfiguration<ImportMaterialization>
{
    public void Configure(EntityTypeBuilder<ImportMaterialization> builder)
    {
        builder.ToTable("ImportMaterializations");

        // A batch becomes permanent orders exactly once. This is the last line of defence behind the batch
        // lock and the status check: a retry or a second operator can never produce a second set of orders.
        builder.HasIndex(materialization => materialization.ImportBatchId).IsUnique();

        builder.HasOne(materialization => materialization.ImportBatch)
            .WithMany()
            .HasForeignKey(materialization => materialization.ImportBatchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(materialization => materialization.Groups)
            .WithOne(group => group.Materialization)
            .HasForeignKey(group => group.ImportMaterializationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(materialization => materialization.Rows)
            .WithOne(row => row.Materialization)
            .HasForeignKey(row => row.ImportMaterializationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Ignore(materialization => materialization.CreatedRequests);
        builder.Ignore(materialization => materialization.CreatedItems);
        builder.Ignore(materialization => materialization.SkippedGroups);
        builder.Ignore(materialization => materialization.SkippedRows);
    }
}

internal sealed class ImportMaterializationGroupConfiguration : IEntityTypeConfiguration<ImportMaterializationGroup>
{
    public void Configure(EntityTypeBuilder<ImportMaterializationGroup> builder)
    {
        builder.ToTable("ImportMaterializationGroups", table =>
            // A skipped group has a reason and no request; every other group has a request and no reason.
            table.HasCheckConstraint(
                "CK_ImportMaterializationGroups_SkipOrRequest",
                "([Action] = 'Skipped' AND [OrderRequestId] IS NULL AND [SkipReason] IS NOT NULL)" +
                " OR ([Action] <> 'Skipped' AND [OrderRequestId] IS NOT NULL AND [SkipReason] IS NULL)"));

        builder.Property(group => group.SkipReason).HasMaxLength(ImportMaterializationGroup.SkipReasonMaxLength);

        builder.HasOne(group => group.OrderRequest)
            .WithMany()
            .HasForeignKey(group => group.OrderRequestId)
            .OnDelete(DeleteBehavior.Restrict);

        // One decision per location and period inside one confirmation.
        builder.HasIndex(group => new { group.ImportMaterializationId, group.LocationId, group.RequestPeriod }).IsUnique();
    }
}

internal sealed class ImportRowMaterializationConfiguration : IEntityTypeConfiguration<ImportRowMaterialization>
{
    public void Configure(EntityTypeBuilder<ImportRowMaterialization> builder)
    {
        builder.ToTable("ImportRowMaterializations");

        // One staged row becomes at most one permanent item, and an item comes from exactly one row.
        builder.HasIndex(row => row.ImportRowId).IsUnique();
        builder.HasIndex(row => row.OrderRequestItemId).IsUnique();

        builder.HasOne(row => row.ImportRow)
            .WithMany()
            .HasForeignKey(row => row.ImportRowId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(row => row.OrderRequestItem)
            .WithMany()
            .HasForeignKey(row => row.OrderRequestItemId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
