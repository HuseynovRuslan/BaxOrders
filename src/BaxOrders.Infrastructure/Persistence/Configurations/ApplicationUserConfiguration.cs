using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ApplicationUserConfiguration : IEntityTypeConfiguration<ApplicationUser>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> builder)
    {
        builder.Property(user => user.DisplayName).HasMaxLength(ApplicationUser.DisplayNameMaxLength);
    }
}

/// <summary>
/// The link from a workflow event to the person who caused it.
/// </summary>
/// <remarks>
/// Nullable, because the events recorded before sign-in existed have no user and will not be given an
/// invented one. Not cascading, because a user is never deleted — and if one somehow were, the history of
/// what they did must not go with them.
/// </remarks>
internal sealed class WorkflowEventActorConfiguration : IEntityTypeConfiguration<OrderRequestWorkflowEvent>
{
    public void Configure(EntityTypeBuilder<OrderRequestWorkflowEvent> builder)
    {
        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(workflowEvent => workflowEvent.ActorUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // "Everything this person did", which is how an audit trail gets read.
        builder.HasIndex(workflowEvent => workflowEvent.ActorUserId);
    }
}

/// <summary>Who put a request into its current approval cycle, and therefore may not decide on it.</summary>
internal sealed class OrderRequestSubmitterConfiguration : IEntityTypeConfiguration<OrderRequest>
{
    public void Configure(EntityTypeBuilder<OrderRequest> builder)
    {
        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(request => request.SubmittedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(request => request.SubmittedByUserId);
    }
}
