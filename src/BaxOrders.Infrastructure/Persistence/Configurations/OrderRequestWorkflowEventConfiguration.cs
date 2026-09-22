using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class OrderRequestWorkflowEventConfiguration : IEntityTypeConfiguration<OrderRequestWorkflowEvent>
{
    public void Configure(EntityTypeBuilder<OrderRequestWorkflowEvent> builder)
    {
        builder.ToTable("OrderRequestWorkflowEvents", table =>
            table.HasCheckConstraint(
                "CK_OrderRequestWorkflowEvents_StatusChanged", "\"FromStatus\" <> \"ToStatus\""));

        builder.Property(workflowEvent => workflowEvent.ActorDisplayName)
            .HasMaxLength(OrderRequestWorkflowEvent.ActorDisplayNameMaxLength);

        builder.Property(workflowEvent => workflowEvent.Comment)
            .HasMaxLength(OrderRequestWorkflowEvent.CommentMaxLength);

        // The history belongs to the request: deleting one would leave events describing nothing. Requests are
        // not deleted anyway, but the cascade keeps the two consistent if one ever is.
        builder.HasOne(workflowEvent => workflowEvent.OrderRequest)
            .WithMany(request => request.WorkflowEvents)
            .HasForeignKey(workflowEvent => workflowEvent.OrderRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        // The history of one request, in the order it happened: the only way this table is ever read.
        builder.HasIndex(workflowEvent => new { workflowEvent.OrderRequestId, workflowEvent.OccurredAtUtc });
    }
}
