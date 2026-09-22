using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;

namespace BaxOrders.UnitTests.Catalog;

public sealed class CategoryTests
{
    [Fact]
    public void Levels_follow_the_hierarchy()
    {
        var cleaning = Category.CreateRoot("Təmizlik");
        var supplies = cleaning.AddChild("Təmizlik ləvazimatı");
        var gloves = supplies.AddChild("Əlcək");
        var deeper = gloves.AddChild("Rezin əlcək");

        Assert.Equal(1, cleaning.Level);
        Assert.Equal(2, supplies.Level);
        Assert.Equal(3, gloves.Level);
        Assert.Equal(4, deeper.Level);
        Assert.Null(cleaning.Parent);
        Assert.Same(supplies, gloves.Parent);
        Assert.Contains(gloves, supplies.Children);
    }

    [Fact]
    public void Inactive_category_cannot_get_children()
    {
        var cleaning = Category.CreateRoot("Təmizlik");
        cleaning.Deactivate();

        Assert.Throws<DomainException>(() => cleaning.AddChild("Əlcək"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\"\"")]
    public void Name_must_be_meaningful(string name)
    {
        Assert.Throws<DomainException>(() => Category.CreateRoot(name));
    }
}
