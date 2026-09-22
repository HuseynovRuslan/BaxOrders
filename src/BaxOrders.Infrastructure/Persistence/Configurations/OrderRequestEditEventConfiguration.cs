using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class OrderRequestEditEventConfiguration : IEntityTypeConfiguration<OrderRequestEditEvent>
{
    private const string ChangedActions = "'ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged'";

    public void Configure(EntityTypeBuilder<OrderRequestEditEvent> builder)
    {
        builder.ToTable("OrderRequestEditEvents", table =>
        {
            // A "changed" entry says which field changed, and nothing else carries a field.
            table.HasCheckConstraint(
                "CK_OrderRequestEditEvents_FieldMatchesAction",
                $"([Action] IN ({ChangedActions}) AND [Field] IS NOT NULL) OR ([Action] NOT IN ({ChangedActions}) AND [Field] IS NULL)");

            // Everything but the creation of the version is about one line.
            table.HasCheckConstraint(
                "CK_OrderRequestEditEvents_ItemEventNamesItem",
                "[Action] = 'RevisionCreated' OR ([OrderRequestItemId] IS NOT NULL AND [ProductVariantId] IS NOT NULL)");
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
