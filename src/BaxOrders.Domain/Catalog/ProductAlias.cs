namespace BaxOrders.Domain.Catalog;

/// <summary>
/// An approved alternative spelling of a product name ("Makaron-mop" → "Makaron mop").
/// </summary>
/// <remarks>
/// An alias identifies the base product only. Whether a row is the same comparable item is still
/// decided by <see cref="ProductVariant"/> (specification, model and order unit).
/// </remarks>
public sealed class ProductAlias
{
    public const int AliasMaxLength = Product.NameMaxLength;

    private ProductAlias()
    {
    }

    internal ProductAlias(Product product, string alias)
    {
        Product = product;
        ProductId = product.Id;
        Alias = Guard.RequiredText(alias, AliasMaxLength, nameof(Alias));
        NormalizedAlias = Guard.NormalizedName(Alias, AliasMaxLength, nameof(Alias));
    }

    public long Id { get; private set; }

    public long ProductId { get; private set; }

    public Product Product { get; private set; } = null!;

    public string Alias { get; private set; } = null!;

    public string NormalizedAlias { get; private set; } = null!;

    public DateTime CreatedAtUtc { get; private set; }
}
