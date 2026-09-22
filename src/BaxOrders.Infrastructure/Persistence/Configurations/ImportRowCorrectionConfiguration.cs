using BaxOrders.Domain.Imports;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaxOrders.Infrastructure.Persistence.Configurations;

internal sealed class ImportRowCorrectionConfiguration : IEntityTypeConfiguration<ImportRowCorrection>
{
    public void Configure(EntityTypeBuilder<ImportRowCorrection> builder)
    {
        builder.ToTable("ImportRowCorrections");

        // Null on purpose: the operator confirmed the cell is empty. Not having a correction is a different state.
        builder.Property(correction => correction.CorrectedValue)
            .HasMaxLength(ImportRowCorrection.ValueMaxLength)
            .IsRequired(false);

        // One cell carries one correction. Correcting it again updates that correction, so the row always has a
        // single effective value, and two operators cannot store two answers for the same cell.
        builder.HasIndex(correction => new { correction.ImportRowId, correction.Field }).IsUnique();
    }
}
