using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ImportResolutionConfiguration : IEntityTypeConfiguration<ImportResolution>
{
    public void Configure(EntityTypeBuilder<ImportResolution> builder)
    {
        // Every decision points at exactly one record — except "this value is not a unit", which has no record
        // to point at and must therefore have none of them set.
        builder.ToTable("ImportResolutions", table =>
            table.HasCheckConstraint(
                "CK_ImportResolutions_SingleTarget",
                "(CASE WHEN \"LocationId\" IS NULL THEN 0 ELSE 1 END + CASE WHEN \"SupplierId\" IS NULL THEN 0 ELSE 1 END + " +
                "CASE WHEN \"ResponsiblePersonId\" IS NULL THEN 0 ELSE 1 END + CASE WHEN \"UnitOfMeasureId\" IS NULL THEN 0 ELSE 1 END + " +
                "CASE WHEN \"CategoryId\" IS NULL THEN 0 ELSE 1 END + CASE WHEN \"ProductId\" IS NULL THEN 0 ELSE 1 END + " +
                "CASE WHEN \"ProductVariantId\" IS NULL THEN 0 ELSE 1 END) = " +
                "CASE WHEN \"Action\" = 'MarkNotAUnit' THEN 0 ELSE 1 END"));

        builder.Property(resolution => resolution.SourceKey).HasMaxLength(ImportResolution.SourceKeyMaxLength);
        builder.Property(resolution => resolution.SourceKeyHash)
            .HasMaxLength(ImportResolution.SourceKeyHashLength)
            .IsFixedLength()
            .IsUnicode(false);

        // Decisions belong to their batch: discarding a batch discards them with it.
        builder.HasOne<ImportBatch>()
            .WithMany()
            .HasForeignKey(resolution => resolution.ImportBatchId)
            .OnDelete(DeleteBehavior.Cascade);

        // Targets are canonical records and are never deleted because of an import decision.
        builder.HasOne<Location>().WithMany().HasForeignKey(r => r.LocationId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Supplier>().WithMany().HasForeignKey(r => r.SupplierId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<ResponsiblePerson>().WithMany().HasForeignKey(r => r.ResponsiblePersonId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<UnitOfMeasure>().WithMany().HasForeignKey(r => r.UnitOfMeasureId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Category>().WithMany().HasForeignKey(r => r.CategoryId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Product>().WithMany().HasForeignKey(r => r.ProductId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<ProductVariant>().WithMany().HasForeignKey(r => r.ProductVariantId).OnDelete(DeleteBehavior.Restrict);

        // One decision per distinct value of a batch. The key is hashed because category paths can be long.
        builder.HasIndex(resolution => new { resolution.ImportBatchId, resolution.Kind, resolution.SourceKeyHash }).IsUnique();
    }
}
