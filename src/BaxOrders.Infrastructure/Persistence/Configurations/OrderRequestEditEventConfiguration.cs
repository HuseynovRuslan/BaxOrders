using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class OrderRequestEditEventConfiguration : IEntityTypeConfiguration<OrderRequestEditEvent>
{
    /// <summary>
    /// The actions that name a field, which is every action that changes one value of a line.
    /// </summary>
    /// <remarks>
    /// Every entry here has to be listed, because the constraint below reads the list both ways: an action in it
    /// must carry a field and an action outside it must not. A "changed" action left out of it cannot be saved
    /// at all — which is what happened to the classification when it was added, and is why it is named here now.
    /// </remarks>
    internal const string ChangedActions =
        "'ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged', 'ItemOrderLineTypeChanged'";

    public void Configure(EntityTypeBuilder<OrderRequestEditEvent> builder)
    {
        builder.ToTable("OrderRequestEditEvents", table =>
        {
            // A "changed" entry says which field changed, and nothing else carries a field.
            table.HasCheckConstraint(
                "CK_OrderRequestEditEvents_FieldMatchesAction",
                $"(\"Action\" IN ({ChangedActions}) AND \"Field\" IS NOT NULL) OR (\"Action\" NOT IN ({ChangedActions}) AND \"Field\" IS NULL)");

            // Everything but the creation of the version is about one line.
            table.HasCheckConstraint(
                "CK_OrderRequestEditEvents_ItemEventNamesItem",
                "\"Action\" = 'RevisionCreated' OR (\"OrderRequestItemId\" IS NOT NULL AND \"ProductVariantId\" IS NOT NULL)");
        });

        builder.Property(editEvent => editEvent.ActorDisplayName)
            .HasMaxLength(OrderRequestEditEvent.ActorDisplayNameMaxLength);
        builder.Property(editEvent => editEvent.OldValue).HasMaxLength(OrderRequestEditEvent.ValueMaxLength);
        builder.Property(editEvent => editEvent.NewValue).HasMaxLength(OrderRequestEditEvent.ValueMaxLength);

        // The history belongs to the request, as the workflow history does.
        builder.HasOne(editEvent => editEvent.OrderRequest)
            .WithMany(request => request.EditEvents)
            .HasForeignKey(editEvent => editEvent.OrderRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        // Deliberately no foreign key to the line: a line removed from a draft is deleted, and what was done to
        // it must still be on record afterwards. The id is kept as the fact it is.
        builder.HasIndex(editEvent => editEvent.OrderRequestItemId);

        // Variants are never deleted, so this one can be enforced.
        builder.HasOne<ProductVariant>()
            .WithMany()
            .HasForeignKey(editEvent => editEvent.ProductVariantId)
            .OnDelete(DeleteBehavior.Restrict);

        // The history of one request, in the order it happened: the way this table is read.
        builder.HasIndex(editEvent => new { editEvent.OrderRequestId, editEvent.OccurredAtUtc });
    }
}
