using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class SupplierConfiguration : IEntityTypeConfiguration<Supplier>
{
    public void Configure(EntityTypeBuilder<Supplier> builder)
    {
        builder.ToTable("Suppliers");

        builder.Property(supplier => supplier.Code).HasMaxLength(Supplier.CodeMaxLength);
        builder.Property(supplier => supplier.Name).HasMaxLength(Supplier.NameMaxLength);
        builder.Property(supplier => supplier.NormalizedName).HasMaxLength(Supplier.NameMaxLength);

        // Stored as text, like every other enum here, so a migration can read and set it by name.
        builder.Property(supplier => supplier.PriceRequirement)
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(SupplierPriceRequirement.Required);

        // Filtered to non-null codes: many suppliers will not have a code.
        builder.HasIndex(supplier => supplier.Code).IsUnique();
        builder.HasIndex(supplier => supplier.NormalizedName).IsUnique();
    }
}
