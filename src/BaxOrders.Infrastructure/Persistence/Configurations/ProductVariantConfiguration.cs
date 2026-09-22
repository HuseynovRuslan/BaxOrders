using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Normalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ProductVariantConfiguration : IEntityTypeConfiguration<ProductVariant>
{
    public void Configure(EntityTypeBuilder<ProductVariant> builder)
    {
        builder.ToTable("ProductVariants", table =>
        {
            table.HasCheckConstraint(
                "CK_ProductVariants_SpecificationUnitRequiresValue",
                "[SpecificationUnitId] IS NULL OR [SpecificationValue] IS NOT NULL");
            table.HasCheckConstraint(
                "CK_ProductVariants_SpecificationDescriptorRequiresValue",
                "[SpecificationDescriptor] IS NULL OR [SpecificationValue] IS NOT NULL");

            // A specification is measured by a unit or described by a word, never both.
            table.HasCheckConstraint(
                "CK_ProductVariants_SpecificationUnitOrDescriptor",
                "[SpecificationUnitId] IS NULL OR [SpecificationDescriptor] IS NULL");
        });

        builder.Property(variant => variant.SpecificationValue).HasMaxLength(ProductVariant.SpecificationValueMaxLength);
        builder.Property(variant => variant.SpecificationDescriptor).HasMaxLength(SpecificationDescriptorNormalizer.MaxLength);
        builder.Property(variant => variant.ModelCode).HasMaxLength(ProductVariant.ModelCodeMaxLength);
        builder.Property(variant => variant.NormalizedVariantKey).HasMaxLength(ProductVariantKey.MaxLength);

        builder.HasOne(variant => variant.SpecificationUnit)
            .WithMany()
            .HasForeignKey(variant => variant.SpecificationUnitId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(variant => variant.OrderUnit)
            .WithMany()
            .HasForeignKey(variant => variant.OrderUnitId)
            .OnDelete(DeleteBehavior.Restrict);

        // A product cannot have two variants with the same comparison identity.
        builder.HasIndex(variant => new { variant.ProductId, variant.NormalizedVariantKey }).IsUnique();
    }
}
