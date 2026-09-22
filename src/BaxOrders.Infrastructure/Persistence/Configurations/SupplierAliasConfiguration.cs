using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class SupplierAliasConfiguration : IEntityTypeConfiguration<SupplierAlias>
{
    public void Configure(EntityTypeBuilder<SupplierAlias> builder)
    {
        builder.ToTable("SupplierAliases");

        builder.Property(alias => alias.Alias).HasMaxLength(SupplierAlias.AliasMaxLength);
        builder.Property(alias => alias.NormalizedAlias).HasMaxLength(SupplierAlias.AliasMaxLength);

        builder.HasOne(alias => alias.Supplier)
            .WithMany()
            .HasForeignKey(alias => alias.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(alias => alias.NormalizedAlias).IsUnique();
    }
}
