using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ImportRowConfiguration : IEntityTypeConfiguration<ImportRow>
{
    public void Configure(EntityTypeBuilder<ImportRow> builder)
    {
        builder.ToTable("ImportRows", table =>
        {
            table.HasCheckConstraint("CK_ImportRows_RowNumber", "\"RowNumber\" > 0");
            table.HasCheckConstraint(
                "CK_ImportRows_ParsedRequestPeriodIsMonthStart",
                "\"ParsedRequestPeriod\" IS NULL OR EXTRACT(DAY FROM \"ParsedRequestPeriod\") = 1");

            // "Not classified" is the null; Unresolved is never stored on a staged row.
            table.HasCheckConstraint(
                "CK_ImportRows_PricingClassification",
                "\"PricingClassification\" IS NULL OR \"PricingClassification\" IN ('PriceRequired', 'InternalFreeSupply')");

            // A classification always says who gave it and when, and clearing it clears all of that.
            table.HasCheckConstraint(
                "CK_ImportRows_PricingClassificationActor",
                "(\"PricingClassification\" IS NULL AND \"PricingClassifiedByUserId\" IS NULL AND \"PricingClassifiedByDisplayName\" IS NULL AND \"PricingClassifiedAtUtc\" IS NULL) "
                + "OR (\"PricingClassification\" IS NOT NULL AND \"PricingClassifiedByUserId\" IS NOT NULL AND \"PricingClassifiedByDisplayName\" IS NOT NULL AND \"PricingClassifiedAtUtc\" IS NOT NULL)");
        });

        builder.Property(row => row.SheetName).HasMaxLength(ImportRow.SheetNameMaxLength);

        builder.Property(row => row.OriginalSequenceNumber).HasMaxLength(ImportRow.SourceValueMaxLength);
        builder.Property(row => row.OriginalMainCategory).HasMaxLength(ImportRow.SourceTextMaxLength);
        builder.Property(row => row.OriginalMiddleCategory).HasMaxLength(ImportRow.SourceTextMaxLength);
        builder.Property(row => row.OriginalSubCategory).HasMaxLength(ImportRow.SourceTextMaxLength);
        builder.Property(row => row.OriginalProductName).HasMaxLength(ImportRow.SourceTextMaxLength);
        builder.Property(row => row.OriginalSpecificationValue).HasMaxLength(ImportRow.SourceValueMaxLength);
        builder.Property(row => row.OriginalSpecificationUnit).HasMaxLength(ImportRow.SourceValueMaxLength);
        builder.Property(row => row.OriginalModelCode).HasMaxLength(ImportRow.SourceValueMaxLength);
        builder.Property(row => row.OriginalQuantity).HasMaxLength(ImportRow.SourceValueMaxLength);
        builder.Property(row => row.OriginalOrderUnit).HasMaxLength(ImportRow.SourceValueMaxLength);
        builder.Property(row => row.OriginalUnitPrice).HasMaxLength(ImportRow.SourceValueMaxLength);
        builder.Property(row => row.OriginalLineTotal).HasMaxLength(ImportRow.SourceValueMaxLength);
        builder.Property(row => row.OriginalSupplierName).HasMaxLength(ImportRow.SourceTextMaxLength);
        builder.Property(row => row.OriginalLocationName).HasMaxLength(ImportRow.SourceTextMaxLength);
        builder.Property(row => row.OriginalRequestDate).HasMaxLength(ImportRow.SourceValueMaxLength);
        builder.Property(row => row.OriginalResponsiblePersonName).HasMaxLength(ImportRow.SourceTextMaxLength);

        builder.Property(row => row.NormalizedProductName).HasMaxLength(ImportRow.SourceTextMaxLength);
        builder.Property(row => row.NormalizedSupplierName).HasMaxLength(ImportRow.SourceTextMaxLength);
        builder.Property(row => row.NormalizedLocationName).HasMaxLength(ImportRow.SourceTextMaxLength);
        builder.Property(row => row.NormalizedResponsiblePersonName).HasMaxLength(ImportRow.SourceTextMaxLength);
        builder.Property(row => row.NormalizedOrderUnit).HasMaxLength(ImportRow.SourceValueMaxLength);
        builder.Property(row => row.SpecificationDescriptor).HasMaxLength(SpecificationDescriptorNormalizer.MaxLength);
        builder.Property(row => row.NormalizedSpecificationUnit).HasMaxLength(ImportRow.SourceValueMaxLength);

        // Source keys for distinct-value review; the category path holds up to three normalized levels, and a
        // variant key holds the resolved product plus its canonical specification, model and unit codes.
        builder.Property(row => row.VariantSourceKey).HasMaxLength(ImportSourceKeys.ProductVariantMaxLength);

        builder.HasOne<UnitOfMeasure>().WithMany().HasForeignKey(row => row.MatchedOrderUnitId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<UnitOfMeasure>().WithMany().HasForeignKey(row => row.MatchedSpecificationUnitId).OnDelete(DeleteBehavior.Restrict);

        builder.Property(row => row.ParsedQuantity)
            .HasPrecision(OrderRequestItem.QuantityPrecision, OrderRequestItem.QuantityScale);
        builder.Property(row => row.ParsedUnitPrice)
            .HasPrecision(OrderRequestItem.UnitPricePrecision, OrderRequestItem.UnitPriceScale);
        builder.Property(row => row.ParsedLineTotal)
            .HasPrecision(ImportRow.LineTotalPrecision, ImportRow.LineTotalScale);

        builder.Ignore(row => row.CalculatedLineTotal);

        builder.HasOne<Product>().WithMany().HasForeignKey(row => row.MatchedProductId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<ProductVariant>().WithMany().HasForeignKey(row => row.MatchedProductVariantId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Supplier>().WithMany().HasForeignKey(row => row.MatchedSupplierId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Location>().WithMany().HasForeignKey(row => row.MatchedLocationId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<ResponsiblePerson>().WithMany().HasForeignKey(row => row.MatchedResponsiblePersonId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Category>().WithMany().HasForeignKey(row => row.MatchedCategoryId).OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(row => row.Issues)
            .WithOne(issue => issue.ImportRow)
            .HasForeignKey(issue => issue.ImportRowId)
            .OnDelete(DeleteBehavior.Cascade);

        // Corrections belong to their row: discarding a batch discards them with it.
        builder.HasMany(row => row.Corrections)
            .WithOne(correction => correction.ImportRow)
            .HasForeignKey(correction => correction.ImportRowId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(row => row.ExclusionReason).HasMaxLength(ImportRow.ExclusionReasonMaxLength);

        // Stored by name, at the length the line's own PricingMode uses.
        builder.Property(row => row.PricingClassification).HasConversion<string>().HasMaxLength(30);
        builder.Property(row => row.PricingClassifiedByDisplayName)
            .HasMaxLength(OrderItemPricingDecision.ActorDisplayNameMaxLength);

        // The possible-duplicate fingerprint is stored hashed, so one correction refreshes only its own groups.
        builder.Property(row => row.DuplicateFingerprint)
            .HasMaxLength(ImportResolution.SourceKeyHashLength)
            .IsFixedLength()
            .IsUnicode(false);

        // A worksheet row is staged once per batch; the index also serves lookups by batch.
        builder.HasIndex(row => new { row.ImportBatchId, row.SheetName, row.RowNumber }).IsUnique();
        builder.HasIndex(row => new { row.ImportBatchId, row.ValidationStatus });

        // Preview grouping by location + request period.
        builder.HasIndex(row => new { row.ImportBatchId, row.MatchedLocationId, row.ParsedRequestPeriod });

        // Variant review works on the distinct variant keys of one batch.
        builder.HasIndex(row => new { row.ImportBatchId, row.VariantSourceKey });

        // Refreshing one fingerprint group, and counting the rows an operator kept out of the import.
        builder.HasIndex(row => new { row.ImportBatchId, row.DuplicateFingerprint });
        builder.HasIndex(row => new { row.ImportBatchId, row.IsExcluded });
    }
}
