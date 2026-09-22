using BaxOrders.Domain.Normalization;

namespace BaxOrders.Domain.Catalog;

/// <summary>
/// A comparable form of a product: its specification ("Ölçü" + "Vahid"), model code ("Model/Kod")
/// and the unit it is ordered in ("Ö/v").
/// </summary>
/// <remarks>
/// Quantities and prices may only be compared within the same variant: 30 pieces and 30 packs of
/// "Rezin əlcək" are different variants. The identifying fields are immutable; a different
/// specification or order unit is a new variant.
/// </remarks>
public sealed class ProductVariant
{
    public const int SpecificationValueMaxLength = 100;
    public const int ModelCodeMaxLength = 100;

    private ProductVariant()
    {
    }

    internal ProductVariant(
        Product product,
        string? specificationValue,
        UnitOfMeasure? specificationUnit,
        string? modelCode,
        UnitOfMeasure? orderUnit,
        string? specificationDescriptor = null)
    {
        SpecificationValue = Guard.OptionalText(specificationValue, SpecificationValueMaxLength, nameof(SpecificationValue));
        ModelCode = Guard.OptionalText(modelCode, ModelCodeMaxLength, nameof(ModelCode));
        SpecificationDescriptor = SpecificationDescriptorNormalizer.Normalize(specificationDescriptor);

        if (specificationUnit is not null && SpecificationValue is null)
        {
            throw new DomainException("A specification unit requires a specification value.");
        }

        if (SpecificationDescriptor is not null && SpecificationValue is null)
        {
            throw new DomainException("A specification descriptor requires a specification value.");
        }

        if (specificationUnit is not null && SpecificationDescriptor is not null)
        {
            throw new DomainException("A specification has either a unit or a descriptor, never both.");
        }

        EnsureUsable(specificationUnit, "Specification unit");
        EnsureUsable(orderUnit, "Order unit");

        Product = product;
        ProductId = product.Id;
        SpecificationUnit = specificationUnit;
        SpecificationUnitId = specificationUnit?.Id;
        OrderUnit = orderUnit;
        OrderUnitId = orderUnit?.Id;
        NormalizedVariantKey = ProductVariantKey.Create(
            SpecificationValue, specificationUnit?.Code, ModelCode, orderUnit?.Code, SpecificationDescriptor);
        IsActive = true;
    }

    public long Id { get; private set; }

    public long ProductId { get; private set; }

    public Product Product { get; private set; } = null!;

    /// <summary>Specification as entered ("50", "40x40", "1x5"). Kept as text on purpose.</summary>
    public string? SpecificationValue { get; private set; }

    public int? SpecificationUnitId { get; private set; }

    public UnitOfMeasure? SpecificationUnit { get; private set; }

    /// <summary>
    /// A word from the "Vahid" column that is not a unit of measure ("diş", "qat", "lik"). It is part of the
    /// identity, so "28 diş" and "28 qat" stay different variants. Mutually exclusive with
    /// <see cref="SpecificationUnit"/>.
    /// </summary>
    public string? SpecificationDescriptor { get; private set; }

    public string? ModelCode { get; private set; }

    /// <summary>Null only for a line the review explicitly accepted as unitless, such as a service.</summary>
    public int? OrderUnitId { get; private set; }

    public UnitOfMeasure? OrderUnit { get; private set; }

    public string NormalizedVariantKey { get; private set; } = null!;

    public bool IsActive { get; private set; }

    public DateTime CreatedAtUtc { get; private set; }

    public DateTime UpdatedAtUtc { get; private set; }

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;

    private static void EnsureUsable(UnitOfMeasure? unit, string role)
    {
        if (unit is null)
        {
            return;
        }

        if (!unit.IsActive)
        {
            throw new DomainException($"{role} '{unit.Code}' is inactive.");
        }
    }
}
