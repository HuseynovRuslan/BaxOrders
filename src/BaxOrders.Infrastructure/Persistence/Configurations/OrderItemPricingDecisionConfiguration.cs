using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class OrderItemPricingDecisionConfiguration : IEntityTypeConfiguration<OrderItemPricingDecision>
{
    public void Configure(EntityTypeBuilder<OrderItemPricingDecision> builder)
    {
        builder.ToTable("OrderItemPricingDecisions", table =>
            // A decision that changed nothing is not a decision.
            table.HasCheckConstraint(
                "CK_OrderItemPricingDecisions_ModeChanged", "\"PreviousMode\" <> \"NewMode\""));

        builder.Property(decision => decision.PreviousMode).HasConversion<string>().HasMaxLength(30);
        builder.Property(decision => decision.NewMode).HasConversion<string>().HasMaxLength(30);
        builder.Property(decision => decision.ActorDisplayName)
            .HasMaxLength(OrderItemPricingDecision.ActorDisplayNameMaxLength);
        builder.Property(decision => decision.Reason).HasMaxLength(OrderItemPricingDecision.ReasonMaxLength);

        builder.HasOne(decision => decision.OrderRequestItem)
            .WithMany()
            .HasForeignKey(decision => decision.OrderRequestItemId)
            .OnDelete(DeleteBehavior.Restrict);

        // One line's decisions, in the order they were made.
        builder.HasIndex(decision => new { decision.OrderRequestItemId, decision.OccurredAtUtc });
    }
}
