using BaxOrders.Domain.Normalization;

namespace BaxOrders.Domain.Catalog;

/// <summary>
/// Builds the deterministic comparison key of a <see cref="ProductVariant"/>.
/// </summary>
/// <remarks>
/// Two rows of the same product are comparable (same variant) only when all of these match:
/// normalized specification value, specification unit or descriptor, normalized model code and order unit.
/// Consequently "Rezin əlcək" ordered in pieces and "Rezin əlcək" ordered in packs never share a key.
/// <para>
/// A line the review explicitly accepted as having no order unit — a service — keeps an empty order unit in
/// the key. That is a value of its own, never a placeholder unit record.
/// </para>
/// <para>
/// Units are identified by their business code (PCS, CM), never by database id, so a key means the same
/// in every environment. Unit codes are therefore immutable.
/// </para>
/// <para>
/// The product itself is not part of the string; uniqueness is enforced on (ProductId, key).
/// </para>
/// </remarks>
public static class ProductVariantKey
{
    public const int MaxLength = 450;

    /// <param name="orderUnitCode">
    /// Null or blank means the rows were explicitly reviewed as having no order unit — a service line. The key
    /// then carries an empty order unit, which is deterministic and can never collide with a real unit code.
    /// Whether that is allowed is decided while matching, never here.
    /// </param>
    /// <param name="specificationDescriptor">
    /// A word from the "Vahid" column that is not a unit ("diş", "qat", "lik"). It is part of the identity:
    /// <c>28 diş</c> is not <c>28 qat</c> and neither is a plain <c>28</c>.
    /// </param>
    public static string Create(
        string? specificationValue,
        string? specificationUnitCode,
        string? modelCode,
        string? orderUnitCode,
        string? specificationDescriptor = null)
    {
        var orderUnit = UnitCode(orderUnitCode);
        var specificationUnit = UnitCode(specificationUnitCode);
        var descriptor = SpecificationDescriptorNormalizer.Normalize(specificationDescriptor);

        if (specificationUnit is not null && descriptor is not null)
        {
            throw new DomainException("A specification has either a unit or a descriptor, never both.");
        }

        var specification = SpecificationNormalizer.Normalize(specificationValue);
        if (specification.Length == 0 && specificationUnit is not null)
        {
            throw new DomainException("A specification unit requires a specification value.");
        }

        if (specification.Length == 0 && descriptor is not null)
        {
            throw new DomainException("A specification descriptor requires a specification value.");
        }

        var key = string.Join(
            '|',
            "specification=" + Escape(specification),
            "specUnit=" + Escape(specificationUnit ?? string.Empty),
            "model=" + Escape(ModelCodeNormalizer.Normalize(modelCode)),
            "orderUnit=" + Escape(orderUnit ?? string.Empty));

        // Appended only when there is one, so every key written before descriptors existed still reads the same.
        if (descriptor is not null)
        {
            key += "|descriptor=" + Escape(descriptor);
        }

        return key.Length <= MaxLength
            ? key
            : throw new DomainException($"Variant key must not exceed {MaxLength} characters.");
    }

    private static string? UnitCode(string? code) =>
        string.IsNullOrWhiteSpace(code) ? null : code.Trim().ToUpperInvariant();

    // Keeps the key injective when a value itself contains the '|' separator.
    private static string Escape(string value) =>
        value.Replace("%", "%25", StringComparison.Ordinal).Replace("|", "%7C", StringComparison.Ordinal);
}
