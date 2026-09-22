using BaxOrders.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Products");

        builder.Property(product => product.Code).HasMaxLength(Product.CodeMaxLength);
        builder.Property(product => product.Name).HasMaxLength(Product.NameMaxLength);
        builder.Property(product => product.NormalizedName).HasMaxLength(Product.NameMaxLength);

        builder.HasOne(product => product.Category)
            .WithMany()
            .HasForeignKey(product => product.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(product => product.Aliases)
            .WithOne(alias => alias.Product)
            .HasForeignKey(alias => alias.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(product => product.Variants)
            .WithOne(variant => variant.Product)
            .HasForeignKey(variant => variant.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(product => product.Code).IsUnique();
        builder.HasIndex(product => product.NormalizedName);
    }
}
