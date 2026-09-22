using BaxOrders.Domain.ResponsiblePeople;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ResponsiblePersonConfiguration : IEntityTypeConfiguration<ResponsiblePerson>
{
    public void Configure(EntityTypeBuilder<ResponsiblePerson> builder)
    {
        builder.ToTable("ResponsiblePeople");

        builder.Property(person => person.Name).HasMaxLength(ResponsiblePerson.NameMaxLength);
        builder.Property(person => person.NormalizedName).HasMaxLength(ResponsiblePerson.NameMaxLength);

        // Unique for now: two different people with the same name must be told apart explicitly (e.g. by surname).
        builder.HasIndex(person => person.NormalizedName).IsUnique();
    }
}
