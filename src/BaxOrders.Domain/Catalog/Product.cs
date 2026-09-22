namespace BaxOrders.Domain.Catalog;

/// <summary>
/// Base product identity ("Makaron mop", "Rezin əlcək").
/// </summary>
/// <remarks>
/// Deliberately has no price: prices are historical facts stored on order request items.
/// Everything that decides whether two quantities are comparable (size, model, order unit)
/// lives on <see cref="ProductVariant"/>.
/// </remarks>
public sealed class Product
{
    public const int CodeMaxLength = 32;
    public const int NameMaxLength = 300;

    private readonly List<ProductAlias> _aliases = [];
    private readonly List<ProductVariant> _variants = [];

    private Product()
    {
    }

    public Product(string code, string name, Category? category = null)
    {
        Code = ProductCode.IsValid(code)
            ? code
            : throw new DomainException(
                $"Product code '{code}' is invalid. Codes look like PRD-000001 and are issued by the product code generator.");
        Rename(name);
        ChangeCategory(category);
        IsActive = true;
    }

    public long Id { get; private set; }

    public string Code { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public string NormalizedName { get; private set; } = null!;

    public int? CategoryId { get; private set; }

    public Category? Category { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAtUtc { get; private set; }

    public DateTime UpdatedAtUtc { get; private set; }

    public IReadOnlyCollection<ProductAlias> Aliases => _aliases;

    public IReadOnlyCollection<ProductVariant> Variants => _variants;

    public void Rename(string name)
    {
        Name = Guard.RequiredText(name, NameMaxLength, nameof(Name));
        NormalizedName = Guard.NormalizedName(Name, NameMaxLength, nameof(Name));
    }

    public void ChangeCategory(Category? category)
    {
        if (category is { IsActive: false })
        {
            throw new DomainException($"Category '{category.Name}' is inactive.");
        }

        Category = category;
        CategoryId = category is { Id: > 0 } ? category.Id : null;
    }

    /// <summary>
    /// Registers an alternative spelling. The duplicate check covers loaded aliases only;
    /// the unique database index on the normalized alias is the authoritative guard.
    /// </summary>
    public ProductAlias AddAlias(string alias)
    {
        EnsureActive();

        var created = new ProductAlias(this, alias);
        if (_aliases.Any(existing => existing.NormalizedAlias == created.NormalizedAlias))
        {
            throw new DomainException($"Alias '{alias}' is already registered for product '{Code}'.");
        }

        _aliases.Add(created);
        return created;
    }

    /// <summary>
    /// Adds a comparable variant. The duplicate check covers loaded variants only;
    /// the unique database index on (ProductId, NormalizedVariantKey) is the authoritative guard.
    /// </summary>
    public ProductVariant AddVariant(
        string? specificationValue,
        UnitOfMeasure? specificationUnit,
        string? modelCode,
        UnitOfMeasure? orderUnit,
        string? specificationDescriptor = null)
    {
        EnsureActive();

        var variant = new ProductVariant(this, specificationValue, specificationUnit, modelCode, orderUnit, specificationDescriptor);
        if (_variants.Any(existing => existing.NormalizedVariantKey == variant.NormalizedVariantKey))
        {
            throw new DomainException($"An equivalent variant already exists for product '{Code}'.");
        }

        _variants.Add(variant);
        return variant;
    }

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;

    private void EnsureActive()
    {
        if (!IsActive)
        {
            throw new DomainException($"Product '{Code}' is inactive.");
        }
    }
}
