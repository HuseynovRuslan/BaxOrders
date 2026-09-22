using BaxOrders.Domain.Imports;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ImportRowIssueConfiguration : IEntityTypeConfiguration<ImportRowIssue>
{
    public void Configure(EntityTypeBuilder<ImportRowIssue> builder)
    {
        builder.ToTable("ImportRowIssues");

        builder.Property(issue => issue.FieldName).HasMaxLength(ImportRowIssue.FieldNameMaxLength);
        builder.Property(issue => issue.Message).HasMaxLength(ImportRowIssue.MessageMaxLength);

        builder.HasIndex(issue => issue.ImportRowId);
    }
}
