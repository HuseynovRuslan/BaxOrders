namespace BaxOrders.Domain.Catalog;

/// <summary>
/// One node of the product category tree. Excel's "Ana / Orta / Alt kateqoriya" are levels 1, 2 and 3,
/// but the tree supports any depth.
/// </summary>
/// <remarks>
/// A child is created only through its parent, so a node can never be its own parent or ancestor and
/// <see cref="Level"/> is always parent level + 1. Re-parenting is intentionally not supported yet.
/// </remarks>
public sealed class Category
{
    public const int NameMaxLength = 200;
    public const int RootLevel = 1;

    private readonly List<Category> _children = [];

    private Category()
    {
    }

    private Category(string name, Category? parent)
    {
        Rename(name);
        Parent = parent;
        ParentId = parent is { Id: > 0 } ? parent.Id : null;
        Level = parent is null ? RootLevel : parent.Level + 1;
        IsActive = true;
    }

    public int Id { get; private set; }

    public string Name { get; private set; } = null!;

    public string NormalizedName { get; private set; } = null!;

    public int? ParentId { get; private set; }

    public Category? Parent { get; private set; }

    public IReadOnlyCollection<Category> Children => _children;

    public int Level { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAtUtc { get; private set; }

    public DateTime UpdatedAtUtc { get; private set; }

    public static Category CreateRoot(string name) => new(name, parent: null);

    public Category AddChild(string name)
    {
        if (!IsActive)
        {
            throw new DomainException($"Cannot add a sub-category to inactive category '{Name}'.");
        }

        var child = new Category(name, this);
        _children.Add(child);
        return child;
    }

    public void Rename(string name)
    {
        Name = Guard.RequiredText(name, NameMaxLength, nameof(Name));
        NormalizedName = Guard.NormalizedName(Name, NameMaxLength, nameof(Name));
    }

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;
}
