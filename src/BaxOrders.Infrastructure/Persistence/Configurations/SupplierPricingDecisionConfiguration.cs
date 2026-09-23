using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class SupplierPricingDecisionConfiguration : IEntityTypeConfiguration<SupplierPricingDecision>
{
    public void Configure(EntityTypeBuilder<SupplierPricingDecision> builder)
    {
        builder.ToTable("SupplierPricingDecisions", table =>
        {
            // A decision that changed nothing is not a decision.
            table.HasCheckConstraint(
                "CK_SupplierPricingDecisions_RequirementChanged",
                "\"PreviousRequirement\" <> \"NewRequirement\"");
        });

        builder.Property(decision => decision.PreviousRequirement).HasConversion<string>().HasMaxLength(20);
        builder.Property(decision => decision.NewRequirement).HasConversion<string>().HasMaxLength(20);
        builder.Property(decision => decision.ActorDisplayName)
            .HasMaxLength(SupplierPricingDecision.ActorDisplayNameMaxLength);
        builder.Property(decision => decision.Reason).HasMaxLength(SupplierPricingDecision.ReasonMaxLength);

        builder.HasOne(decision => decision.Supplier)
            .WithMany()
            .HasForeignKey(decision => decision.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        // One supplier's decisions, in the order they were made: the way this table is read.
        builder.HasIndex(decision => new { decision.SupplierId, decision.OccurredAtUtc });
    }
}
