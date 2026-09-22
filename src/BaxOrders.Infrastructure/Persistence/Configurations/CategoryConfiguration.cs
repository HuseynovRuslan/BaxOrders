using BaxOrders.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("Categories", table =>
        {
            table.HasCheckConstraint("CK_Categories_NotOwnParent", "[ParentId] IS NULL OR [ParentId] <> [Id]");
            table.HasCheckConstraint(
                "CK_Categories_Level",
                $"([ParentId] IS NULL AND [Level] = {Category.RootLevel}) OR ([ParentId] IS NOT NULL AND [Level] > {Category.RootLevel})");
        });

        builder.Property(category => category.Name).HasMaxLength(Category.NameMaxLength);
        builder.Property(category => category.NormalizedName).HasMaxLength(Category.NameMaxLength);

        builder.HasOne(category => category.Parent)
            .WithMany(category => category.Children)
            .HasForeignKey(category => category.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Sibling names are unique. The index leads with ParentId, so it also serves parent lookups.
        // No filter: SQL Server treats NULLs as equal here, which keeps root names unique as well.
        builder.HasIndex(category => new { category.ParentId, category.NormalizedName })
            .IsUnique()
            .HasFilter(null);
    }
}
