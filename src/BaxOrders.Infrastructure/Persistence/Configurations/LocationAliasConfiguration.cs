using BaxOrders.Domain.Locations;
using BaxOrders.Infrastructure.Persistence.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class LocationAliasConfiguration : IEntityTypeConfiguration<LocationAlias>
{
    public void Configure(EntityTypeBuilder<LocationAlias> builder)
    {
        builder.ToTable("LocationAliases");

        builder.Property(alias => alias.Alias).HasMaxLength(LocationAlias.AliasMaxLength);
        builder.Property(alias => alias.NormalizedAlias).HasMaxLength(LocationAlias.AliasMaxLength);

        builder.HasOne(alias => alias.Location)
            .WithMany()
            .HasForeignKey(alias => alias.LocationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(alias => alias.NormalizedAlias).IsUnique();

        builder.HasData(ReferenceData.LocationAliases());
    }
}
