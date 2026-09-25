using BaxOrders.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ProductMatchDecisionConfiguration : IEntityTypeConfiguration<ProductMatchDecision>
{
    public const int EnumMaxLength = 20;

    /// <summary>A decision that has not been undone. Every uniqueness rule is about live decisions only.</summary>
    private const string Live = "\"UndoneAtUtc\" IS NULL";

    public void Configure(EntityTypeBuilder<ProductMatchDecision> builder)
    {
        builder.ToTable("ProductMatchDecisions", table =>
        {
            // A spelling match is between two variants; a variant link is between two products, and names none.
            table.HasCheckConstraint(
                "CK_ProductMatchDecisions_KindShape",
                "(\"Kind\" = 'SameItem' AND \"SourceVariantId\" IS NOT NULL AND \"TargetVariantId\" IS NOT NULL)"
                + " OR (\"Kind\" = 'Variant' AND \"SourceVariantId\" IS NULL AND \"TargetVariantId\" IS NULL)");

            table.HasCheckConstraint(
                "CK_ProductMatchDecisions_Outcome", "\"Outcome\" IN ('Approved', 'Rejected')");

            // Nothing is matched with itself.
            table.HasCheckConstraint(
                "CK_ProductMatchDecisions_DifferentSides",
                "(\"Kind\" = 'SameItem' AND \"SourceVariantId\" <> \"TargetVariantId\")"
                + " OR (\"Kind\" = 'Variant' AND \"SourceProductId\" <> \"TargetProductId\")");

            // The label names an approved variant under its base, so exactly those carry one.
            table.HasCheckConstraint(
                "CK_ProductMatchDecisions_VariantLabel",
                "(\"VariantLabel\" IS NOT NULL) = (\"Kind\" = 'Variant' AND \"Outcome\" = 'Approved')");

            // Undone by somebody, at some moment — or not undone at all.
            table.HasCheckConstraint(
                "CK_ProductMatchDecisions_Undo",
                "(\"UndoneByUserId\" IS NULL AND \"UndoneByDisplayName\" IS NULL AND \"UndoneAtUtc\" IS NULL AND \"UndoReason\" IS NULL)"
                + " OR (\"UndoneByUserId\" IS NOT NULL AND \"UndoneByDisplayName\" IS NOT NULL AND \"UndoneAtUtc\" IS NOT NULL)");
        });

        builder.Ignore(decision => decision.IsLive);

        builder.Property(decision => decision.Kind).HasConversion<string>().HasMaxLength(EnumMaxLength);
        builder.Property(decision => decision.Outcome).HasConversion<string>().HasMaxLength(EnumMaxLength);
        builder.Property(decision => decision.VariantLabel).HasMaxLength(ProductMatchDecision.VariantLabelMaxLength);
        builder.Property(decision => decision.Reason).HasMaxLength(ProductMatchDecision.ReasonMaxLength);
        builder.Property(decision => decision.DecidedByDisplayName)
            .HasMaxLength(ProductMatchDecision.ActorDisplayNameMaxLength);
        builder.Property(decision => decision.UndoneByDisplayName)
            .HasMaxLength(ProductMatchDecision.ActorDisplayNameMaxLength);
        builder.Property(decision => decision.UndoReason).HasMaxLength(ProductMatchDecision.ReasonMaxLength);

        // The catalogue is never deleted from under a decision: products and variants are deactivated, not removed.
        builder.HasOne<ProductVariant>()
            .WithMany()
            .HasForeignKey(decision => decision.SourceVariantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<ProductVariant>()
            .WithMany()
            .HasForeignKey(decision => decision.TargetVariantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Product>()
            .WithMany()
            .HasForeignKey(decision => decision.SourceProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Product>()
            .WithMany()
            .HasForeignKey(decision => decision.TargetProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // One live decision per pair and kind. Which way round a spelling pair was written is checked by the
        // service, under the product-match lock.
        builder.HasIndex(decision => new { decision.SourceVariantId, decision.TargetVariantId })
            .IsUnique()
            .HasFilter($"\"Kind\" = 'SameItem' AND {Live}");

        builder.HasIndex(decision => new { decision.SourceProductId, decision.TargetProductId })
            .IsUnique()
            .HasFilter($"\"Kind\" = 'Variant' AND {Live}");

        // A variant is folded into at most one other, and a product is a variant of at most one base.
        builder.HasIndex(decision => decision.SourceVariantId)
            .IsUnique()
            .HasFilter($"\"Kind\" = 'SameItem' AND \"Outcome\" = 'Approved' AND {Live}");

        builder.HasIndex(decision => decision.SourceProductId)
            .IsUnique()
            .HasFilter($"\"Kind\" = 'Variant' AND \"Outcome\" = 'Approved' AND {Live}");

        builder.HasIndex(decision => decision.TargetVariantId);
        builder.HasIndex(decision => decision.TargetProductId);
    }
}
