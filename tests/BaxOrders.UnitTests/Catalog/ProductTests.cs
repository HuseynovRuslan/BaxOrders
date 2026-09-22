using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.UnitTests.TestSupport;

namespace BaxOrders.UnitTests.Catalog;

public sealed class ProductTests
{
    [Fact]
    public void Same_product_ordered_in_pieces_and_packs_becomes_two_variants()
    {
        var gloves = new Product("PRD-000001", "Rezin əlcək");

        var inPieces = gloves.AddVariant(null, null, null, TestEntities.Pieces());
        var inPacks = gloves.AddVariant(null, null, null, TestEntities.Pack());

        Assert.NotEqual(inPieces.NormalizedVariantKey, inPacks.NormalizedVariantKey);
        Assert.Equal(2, gloves.Variants.Count);
    }

    [Fact]
    public void Variant_key_uses_unit_codes()
    {
        var mop = new Product("PRD-000002", "Makaron mop");

        var variant = mop.AddVariant("50", TestEntities.Centimeter(), null, TestEntities.Pieces());

        Assert.Equal("specification=50|specUnit=CM|model=|orderUnit=PCS", variant.NormalizedVariantKey);
    }

    [Fact]
    public void Variant_key_does_not_depend_on_database_ids()
    {
        var piecesInDevelopment = TestEntities.WithId(new UnitOfMeasure("PCS", "Ədəd", "ədəd", UnitType.Count), 1);
        var piecesInProduction = TestEntities.WithId(new UnitOfMeasure("PCS", "Ədəd", "ədəd", UnitType.Count), 97);

        var first = new Product("PRD-000003", "Rezin əlcək").AddVariant(null, null, null, piecesInDevelopment);
        var second = new Product("PRD-000003", "Rezin əlcək").AddVariant(null, null, null, piecesInProduction);

        Assert.Equal(first.NormalizedVariantKey, second.NormalizedVariantKey);
    }

    [Fact]
    public void Equivalent_variant_is_rejected()
    {
        var cloth = new Product("PRD-000004", "Mikrofibra parça");
        cloth.AddVariant("40x40", TestEntities.Centimeter(), null, TestEntities.Pieces());

        Assert.Throws<DomainException>(() =>
            cloth.AddVariant(" 40 × 40 ", TestEntities.Centimeter(), null, TestEntities.Pieces()));
    }

    [Fact]
    public void Decimal_separator_variants_stay_separate_until_a_rule_is_approved()
    {
        var cleaner = new Product("PRD-000005", "Şüşə təmizləyici");

        cleaner.AddVariant("1,5", TestEntities.Liter(), null, TestEntities.Pieces());
        cleaner.AddVariant("1.5", TestEntities.Liter(), null, TestEntities.Pieces());

        Assert.Equal(2, cleaner.Variants.Count);
    }

    [Fact]
    public void Variant_keeps_the_specification_as_entered()
    {
        var sponge = new Product("PRD-000006", "Qab süngəri");

        var variant = sponge.AddVariant(" 1 x 5 ", TestEntities.Pieces(), null, TestEntities.Pack());

        Assert.Equal("1 x 5", variant.SpecificationValue);
        Assert.StartsWith("specification=1x5|", variant.NormalizedVariantKey);
    }

    [Fact]
    public void Specification_unit_without_a_value_is_rejected()
    {
        var mop = new Product("PRD-000002", "Makaron mop");

        Assert.Throws<DomainException>(() =>
            mop.AddVariant(null, TestEntities.Centimeter(), null, TestEntities.Pieces()));
    }

    [Fact]
    public void Inactive_order_unit_cannot_be_used()
    {
        var mop = new Product("PRD-000002", "Makaron mop");
        var pieces = TestEntities.Pieces();
        pieces.Deactivate();

        Assert.Throws<DomainException>(() => mop.AddVariant(null, null, null, pieces));
    }

    [Fact]
    public void Inactive_product_cannot_get_new_variants()
    {
        var mop = new Product("PRD-000002", "Makaron mop");
        mop.Deactivate();

        Assert.Throws<DomainException>(() => mop.AddVariant(null, null, null, TestEntities.Pieces()));
    }

    [Fact]
    public void Name_is_normalized_for_comparison()
    {
        var product = new Product("PRD-000008", "  Makaron  Mop ");

        Assert.Equal("Makaron  Mop", product.Name);
        Assert.Equal("makaron mop", product.NormalizedName);
    }

    [Fact]
    public void Aliases_are_normalized_and_duplicates_rejected()
    {
        var mop = new Product("PRD-000002", "Makaron mop");

        var alias = mop.AddAlias("Makaron-Mop ");

        Assert.Equal("makaron-mop", alias.NormalizedAlias);
        Assert.Throws<DomainException>(() => mop.AddAlias("makaron - mop"));
    }

    [Fact]
    public void Product_cannot_be_placed_in_an_inactive_category()
    {
        var category = Category.CreateRoot("Təmizlik");
        category.Deactivate();

        Assert.Throws<DomainException>(() => new Product("PRD-000009", "Mop", category));
    }

    [Fact]
    public void A_service_line_may_have_no_order_unit()
    {
        var repair = new Product("PRD-000200", "Təmir işləri");

        var variant = repair.AddVariant(null, null, null, null);

        Assert.Null(variant.OrderUnitId);
        Assert.Null(variant.OrderUnit);
    }

    [Fact]
    public void A_unitless_variant_is_not_the_same_as_one_ordered_in_pieces()
    {
        var repair = new Product("PRD-000201", "Təmir işləri");
        repair.AddVariant(null, null, null, null);

        // Adding the same specification in pieces is a different identity, so it is accepted.
        var inPieces = repair.AddVariant(null, null, null, TestEntities.Pieces());

        Assert.Equal(2, repair.Variants.Count);
        Assert.NotNull(inPieces.OrderUnitId);
    }

    [Fact]
    public void A_descriptor_keeps_two_specifications_apart()
    {
        var chain = new Product("PRD-000202", "Sep");

        var teeth = chain.AddVariant("28", null, null, TestEntities.Pieces(), "diş");
        var layers = chain.AddVariant("28", null, null, TestEntities.Pieces(), "qat");

        Assert.Equal("diş", teeth.SpecificationDescriptor);
        Assert.Equal("qat", layers.SpecificationDescriptor);
        Assert.NotEqual(teeth.NormalizedVariantKey, layers.NormalizedVariantKey);
    }

    [Fact]
    public void The_suffix_family_is_one_descriptor()
    {
        var sandpaper = new Product("PRD-000203", "Şkurka");
        sandpaper.AddVariant("100", null, null, TestEntities.Pieces(), "lik");

        // "lik", "lıq", "lük" and "luq" are the same suffix, so the second one is the variant that already exists.
        Assert.Throws<DomainException>(() => sandpaper.AddVariant("100", null, null, TestEntities.Pieces(), "luq"));
    }

    [Fact]
    public void A_specification_cannot_have_both_a_unit_and_a_descriptor()
    {
        var chain = new Product("PRD-000204", "Sep");

        Assert.Throws<DomainException>(() => chain.AddVariant("28", TestEntities.Centimeter(), null, TestEntities.Pieces(), "diş"));
    }

    [Fact]
    public void A_descriptor_without_a_specification_value_is_rejected()
    {
        var chain = new Product("PRD-000205", "Sep");

        Assert.Throws<DomainException>(() => chain.AddVariant(null, null, null, TestEntities.Pieces(), "diş"));
    }
}
