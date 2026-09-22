using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class OrderRequestConfiguration : IEntityTypeConfiguration<OrderRequest>
{
    public void Configure(EntityTypeBuilder<OrderRequest> builder)
    {
        builder.ToTable("OrderRequests", table =>
        {
            table.HasCheckConstraint("CK_OrderRequests_RequestPeriodIsMonthStart", "DATEPART(day, [RequestPeriod]) = 1");
            table.HasCheckConstraint("CK_OrderRequests_Version", "[Version] >= 1");
        });

        builder.HasOne(request => request.Location)
            .WithMany()
            .HasForeignKey(request => request.LocationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(request => request.ResponsiblePerson)
            .WithMany()
            .HasForeignKey(request => request.ResponsiblePersonId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(request => request.SourceImportBatch)
            .WithMany()
            .HasForeignKey(request => request.SourceImportBatchId)
            .OnDelete(DeleteBehavior.Restrict);

        // Items are part of the request; they have no meaning on their own.
        builder.HasMany(request => request.Items)
            .WithOne(item => item.OrderRequest)
            .HasForeignKey(item => item.OrderRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        // Identity of a request version. Leads with (LocationId, RequestPeriod), so it also serves period lookups.
        builder.HasIndex(request => new { request.LocationId, request.RequestPeriod, request.Version }).IsUnique();
        builder.HasIndex(request => request.Status);

        // Two people acting on the same request at once: the second write finds the row changed and fails
        // rather than quietly overwriting the first.
        builder.Property(request => request.RowVersion).IsRowVersion();
    }
}
