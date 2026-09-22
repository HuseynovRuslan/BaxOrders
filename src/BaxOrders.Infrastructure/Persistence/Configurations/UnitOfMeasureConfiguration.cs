using BaxOrders.Domain.Catalog;
using BaxOrders.Infrastructure.Persistence.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class UnitOfMeasureConfiguration : IEntityTypeConfiguration<UnitOfMeasure>
{
    public void Configure(EntityTypeBuilder<UnitOfMeasure> builder)
    {
        builder.ToTable("UnitsOfMeasure");

        builder.Property(unit => unit.Code).HasMaxLength(UnitOfMeasure.CodeMaxLength);
        builder.Property(unit => unit.Name).HasMaxLength(UnitOfMeasure.NameMaxLength);
        builder.Property(unit => unit.Symbol).HasMaxLength(UnitOfMeasure.SymbolMaxLength);

        builder.HasIndex(unit => unit.Code).IsUnique();

        builder.HasData(ReferenceData.Units());
    }
}
