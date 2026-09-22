using BaxOrders.Domain.ResponsiblePeople;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ResponsiblePersonAliasConfiguration : IEntityTypeConfiguration<ResponsiblePersonAlias>
{
    public void Configure(EntityTypeBuilder<ResponsiblePersonAlias> builder)
    {
        builder.ToTable("ResponsiblePersonAliases");

        builder.Property(alias => alias.Alias).HasMaxLength(ResponsiblePersonAlias.AliasMaxLength);
        builder.Property(alias => alias.NormalizedAlias).HasMaxLength(ResponsiblePersonAlias.AliasMaxLength);

        builder.HasOne(alias => alias.ResponsiblePerson)
            .WithMany()
            .HasForeignKey(alias => alias.ResponsiblePersonId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(alias => alias.NormalizedAlias).IsUnique();
    }
}
