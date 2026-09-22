using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class OrderRequestRevisionConfiguration : IEntityTypeConfiguration<OrderRequestRevision>
{
    public void Configure(EntityTypeBuilder<OrderRequestRevision> builder)
    {
        builder.ToTable("OrderRequestRevisions", table =>
            table.HasCheckConstraint(
                "CK_OrderRequestRevisions_NotItself", "[SourceOrderRequestId] <> [RevisionOrderRequestId]"));

        builder.Property(revision => revision.CreatedByDisplayName)
            .HasMaxLength(OrderRequestRevision.CreatedByDisplayNameMaxLength);

        // One returned version is corrected once. The unique index is what stops a double click, or two people
        // at once, from making two competing corrections of the same month; the service's lock is the polite
        // way to the same answer, this is the one that cannot be talked round.
        builder.HasOne(revision => revision.SourceOrderRequest)
            .WithOne()
            .HasForeignKey<OrderRequestRevision>(revision => revision.SourceOrderRequestId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(revision => revision.SourceOrderRequestId).IsUnique();

        // And a correction has exactly one source.
        builder.HasOne(revision => revision.RevisionOrderRequest)
            .WithOne(request => request.RevisedFrom)
            .HasForeignKey<OrderRequestRevision>(revision => revision.RevisionOrderRequestId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(revision => revision.RevisionOrderRequestId).IsUnique();
    }
}
