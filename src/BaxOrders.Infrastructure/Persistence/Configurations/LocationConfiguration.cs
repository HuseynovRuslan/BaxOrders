using BaxOrders.Domain.Locations;
using BaxOrders.Infrastructure.Persistence.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class LocationConfiguration : IEntityTypeConfiguration<Location>
{
    public void Configure(EntityTypeBuilder<Location> builder)
    {
        builder.ToTable("Locations");

        builder.Property(location => location.Code).HasMaxLength(Location.CodeMaxLength);
        builder.Property(location => location.Name).HasMaxLength(Location.NameMaxLength);
        builder.Property(location => location.NormalizedName).HasMaxLength(Location.NameMaxLength);

        builder.HasIndex(location => location.Code).IsUnique();
        builder.HasIndex(location => location.NormalizedName).IsUnique();

        builder.HasData(ReferenceData.Locations());
    }
}
