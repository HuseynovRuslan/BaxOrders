using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class OrderRequestItemConfiguration : IEntityTypeConfiguration<OrderRequestItem>
{
    public void Configure(EntityTypeBuilder<OrderRequestItem> builder)
    {
        builder.ToTable("OrderRequestItems", table =>
        {
            table.HasCheckConstraint("CK_OrderRequestItems_Quantity", "[Quantity] > 0");
            table.HasCheckConstraint("CK_OrderRequestItems_UnitPrice", "[UnitPrice] IS NULL OR [UnitPrice] >= 0");
        });

        builder.Property(item => item.Quantity)
            .HasPrecision(OrderRequestItem.QuantityPrecision, OrderRequestItem.QuantityScale);
        builder.Property(item => item.UnitPrice)
            .HasPrecision(OrderRequestItem.UnitPricePrecision, OrderRequestItem.UnitPriceScale);
        builder.Property(item => item.OriginalProductName).HasMaxLength(OrderRequestItem.OriginalProductNameMaxLength);
        builder.Property(item => item.Notes).HasMaxLength(OrderRequestItem.NotesMaxLength);

        // Derived from Quantity x UnitPrice; storing it would create a second source of truth.
        builder.Ignore(item => item.LineTotal);

        builder.HasOne(item => item.ProductVariant)
            .WithMany()
            .HasForeignKey(item => item.ProductVariantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(item => item.Supplier)
            .WithMany()
            .HasForeignKey(item => item.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        // A copied line points at the line of the previous version it was copied from. Not cascading: a
        // reviewed version is never deleted while a correction descends from it, and the database says so.
        builder.HasOne(item => item.SourceOrderRequestItem)
            .WithMany()
            .HasForeignKey(item => item.SourceOrderRequestItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(item => item.OrderRequestId);
        builder.HasIndex(item => item.ProductVariantId);
        builder.HasIndex(item => item.SupplierId);
        builder.HasIndex(item => item.SourceOrderRequestItemId);
    }
}
