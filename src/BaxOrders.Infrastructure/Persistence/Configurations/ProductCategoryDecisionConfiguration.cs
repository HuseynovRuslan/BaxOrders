using BaxOrders.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ProductCategoryDecisionConfiguration : IEntityTypeConfiguration<ProductCategoryDecision>
{
    public void Configure(EntityTypeBuilder<ProductCategoryDecision> builder)
    {
        builder.ToTable("ProductCategoryDecisions", table =>
        {
            // A decision that changed nothing is not a decision.
            table.HasCheckConstraint(
                "CK_ProductCategoryDecisions_CategoryChanged",
                "\"PreviousCategoryId\" IS NULL OR \"PreviousCategoryId\" <> \"NewCategoryId\"");

            // The safe application only ever fills a blank; a product that already had one was chosen for.
            table.HasCheckConstraint(
                "CK_ProductCategoryDecisions_AutoFillsBlankOnly",
                "\"DecisionType\" <> 'AutoUniqueEvidence' OR \"PreviousCategoryId\" IS NULL");
        });

        builder.Property(decision => decision.DecisionType).HasConversion<string>().HasMaxLength(40);
        builder.Property(decision => decision.ActorDisplayName)
            .HasMaxLength(ProductCategoryDecision.ActorDisplayNameMaxLength);
        builder.Property(decision => decision.Reason).HasMaxLength(ProductCategoryDecision.ReasonMaxLength);

        builder.HasOne(decision => decision.Product)
            .WithMany()
            .HasForeignKey(decision => decision.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // Categories are never deleted, so both sides can be enforced. The previous one has no navigation:
        // it is what the record said at the time, not something the catalog still has to offer.
        builder.HasOne(decision => decision.NewCategory)
            .WithMany()
            .HasForeignKey(decision => decision.NewCategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Category>()
            .WithMany()
            .HasForeignKey(decision => decision.PreviousCategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // One product's decisions, in the order they were made: the way this table is read.
        builder.HasIndex(decision => new { decision.ProductId, decision.OccurredAtUtc });
    }
}
