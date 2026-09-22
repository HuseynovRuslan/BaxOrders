using BaxOrders.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ProductAliasConfiguration : IEntityTypeConfiguration<ProductAlias>
{
    public void Configure(EntityTypeBuilder<ProductAlias> builder)
    {
        builder.ToTable("ProductAliases");

        builder.Property(alias => alias.Alias).HasMaxLength(ProductAlias.AliasMaxLength);
        builder.Property(alias => alias.NormalizedAlias).HasMaxLength(ProductAlias.AliasMaxLength);

        // One spelling can identify only one product.
        builder.HasIndex(alias => alias.NormalizedAlias).IsUnique();
    }
}
