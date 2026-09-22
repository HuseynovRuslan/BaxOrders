using BaxOrders.Domain.Imports;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ImportBatchConfiguration : IEntityTypeConfiguration<ImportBatch>
{
    public void Configure(EntityTypeBuilder<ImportBatch> builder)
    {
        builder.ToTable("ImportBatches", table =>
        {
            table.HasCheckConstraint(
                "CK_ImportBatches_RowCounts",
                "[TotalRows] >= 0 AND [ValidRows] >= 0 AND [WarningRows] >= 0 AND [InvalidRows] >= 0 " +
                "AND [ValidRows] + [WarningRows] + [InvalidRows] <= [TotalRows]");
        });

        builder.Property(batch => batch.OriginalFileName).HasMaxLength(ImportBatch.OriginalFileNameMaxLength);
        builder.Property(batch => batch.FileHash)
            .HasMaxLength(ImportBatch.FileHashLength)
            .IsFixedLength()
            .IsUnicode(false);

        // Staging rows belong to their batch; deleting a discarded batch removes its rows and issues.
        builder.HasMany(batch => batch.Rows)
            .WithOne(row => row.ImportBatch)
            .HasForeignKey(row => row.ImportBatchId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(batch => batch.FailureReason).HasMaxLength(ImportBatch.FailureReasonMaxLength);

        // At most one active import per file content. Failed imports drop out of the filter, so the same file can
        // be retried; concurrent uploads of the same file cannot both be staged.
        builder.HasIndex(batch => batch.FileHash)
            .IsUnique()
            .HasFilter("[FileHash] IS NOT NULL AND [Status] <> 'Failed'");
    }
}
