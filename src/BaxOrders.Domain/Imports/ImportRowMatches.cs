namespace BaxOrders.Domain.Imports;

/// <summary>
/// Canonical records an import row was resolved to by exact matching or a review decision. Null means unresolved.
/// </summary>
/// <param name="VariantSourceKey">
/// Identity of the variant this row describes, built from the resolved product and units
/// (<see cref="ImportSourceKeys.ProductVariant"/>). Null while the product or a unit is still unresolved, which is
/// why the variant cannot be reviewed yet.
/// </param>
public sealed record ImportRowMatches(
    int? LocationId,
    int? SupplierId,
    int? ResponsiblePersonId,
    int? CategoryId,
    long? ProductId,
    long? ProductVariantId,
    int? OrderUnitId = null,
    int? SpecificationUnitId = null,
    string? VariantSourceKey = null,
    string? SpecificationDescriptor = null)
{
    public static readonly ImportRowMatches None = new(null, null, null, null, null, null);
}
