using BaxOrders.Domain.Catalog;
using BaxOrders.Infrastructure.Persistence.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class UnitOfMeasureAliasConfiguration : IEntityTypeConfiguration<UnitOfMeasureAlias>
{
    public void Configure(EntityTypeBuilder<UnitOfMeasureAlias> builder)
    {
        builder.ToTable("UnitOfMeasureAliases");

        builder.Property(alias => alias.Alias).HasMaxLength(UnitOfMeasureAlias.AliasMaxLength);
        builder.Property(alias => alias.NormalizedAlias).HasMaxLength(UnitOfMeasureAlias.AliasMaxLength);

        builder.HasOne(alias => alias.UnitOfMeasure)
            .WithMany()
            .HasForeignKey(alias => alias.UnitOfMeasureId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(alias => alias.NormalizedAlias).IsUnique();

        builder.HasData(ReferenceData.UnitAliases());
    }
}
