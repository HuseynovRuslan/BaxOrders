using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;

namespace BaxOrders.UnitTests.Catalog;

public sealed class ProductVariantKeyTests
{
    [Fact]
    public void Key_is_built_from_stable_unit_codes()
    {
        Assert.Equal(
            "specification=40x40|specUnit=CM|model=ab-12|orderUnit=PCS",
            ProductVariantKey.Create("40 X 40", "CM", "AB-12", "PCS"));
    }

    [Fact]
    public void Key_without_optional_parts_keeps_empty_slots()
    {
        Assert.Equal(
            "specification=|specUnit=|model=|orderUnit=PACK",
            ProductVariantKey.Create(null, null, null, "PACK"));
    }

    [Fact]
    public void Unit_codes_are_compared_case_insensitively()
    {
        Assert.Equal(
            ProductVariantKey.Create("50", "CM", null, "PCS"),
            ProductVariantKey.Create("50", " cm ", null, "pcs"));
    }

    [Fact]
    public void Cosmetic_differences_produce_the_same_key()
    {
        Assert.Equal(
            ProductVariantKey.Create("40x40", "CM", "AB12", "PCS"),
            ProductVariantKey.Create(" 40 × 40 ", "CM", " ab 12 ", "PCS"));
    }

    [Fact]
    public void Pieces_and_packs_never_share_a_key()
    {
        Assert.NotEqual(
            ProductVariantKey.Create(null, null, null, "PCS"),
            ProductVariantKey.Create(null, null, null, "PACK"));
    }

    [Fact]
    public void Same_specification_with_pieces_and_packs_never_share_a_key()
    {
        Assert.NotEqual(
            ProductVariantKey.Create("1x5", "PCS", null, "PCS"),
            ProductVariantKey.Create("1x5", "PCS", null, "PACK"));
    }

    [Fact]
    public void Different_specification_units_produce_different_keys()
    {
        Assert.NotEqual(
            ProductVariantKey.Create("50", "CM", null, "PCS"),
            ProductVariantKey.Create("50", "M", null, "PCS"));
    }

    [Fact]
    public void Different_model_codes_produce_different_keys()
    {
        Assert.NotEqual(
            ProductVariantKey.Create("50", "CM", "A1", "PCS"),
            ProductVariantKey.Create("50", "CM", "A2", "PCS"));
    }

    [Fact]
    public void Decimal_separator_variants_are_not_merged()
    {
        Assert.NotEqual(
            ProductVariantKey.Create("1,5", "L", null, "PCS"),
            ProductVariantKey.Create("1.5", "L", null, "PCS"));
    }

    [Fact]
    public void Missing_and_blank_values_are_equivalent()
    {
        Assert.Equal(
            ProductVariantKey.Create(null, null, null, "PCS"),
            ProductVariantKey.Create("  ", " ", "", "PCS"));
    }

    [Fact]
    public void Separator_characters_inside_values_cannot_forge_another_key()
    {
        Assert.NotEqual(
            ProductVariantKey.Create("a|model=b", null, null, "PCS"),
            ProductVariantKey.Create("a", null, "b", "PCS"));
    }

    [Fact]
    public void Specification_unit_without_value_is_rejected()
    {
        Assert.Throws<DomainException>(() => ProductVariantKey.Create(null, "CM", null, "PCS"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void A_line_with_no_order_unit_has_one_deterministic_key(string? orderUnitCode)
    {
        // A service line reviewed as unitless. Whether that is allowed is decided while matching; here it only
        // has to produce the same key every time.
        Assert.Equal(
            ProductVariantKey.Create(null, null, null, null),
            ProductVariantKey.Create(null, null, null, orderUnitCode));
    }

    [Fact]
    public void A_unitless_line_never_collides_with_a_real_unit()
    {
        var unitless = ProductVariantKey.Create(null, null, null, null);

        Assert.NotEqual(unitless, ProductVariantKey.Create(null, null, null, "PCS"));
        Assert.NotEqual(unitless, ProductVariantKey.Create(null, null, null, "PACK"));
        Assert.NotEqual(unitless, ProductVariantKey.Create(null, null, null, "KG"));
        Assert.NotEqual(unitless, ProductVariantKey.Create(null, null, null, "M2"));
    }

    [Fact]
    public void A_descriptor_is_part_of_the_identity()
    {
        // "28 diş" is a 28-tooth chain, not 28 of something.
        Assert.NotEqual(
            ProductVariantKey.Create("28", null, null, "PCS", "diş"),
            ProductVariantKey.Create("28", null, null, "PCS"));
    }

    [Fact]
    public void Two_different_descriptors_are_two_variants()
    {
        Assert.NotEqual(
            ProductVariantKey.Create("28", null, null, "PCS", "diş"),
            ProductVariantKey.Create("28", null, null, "PCS", "qat"));
    }

    [Fact]
    public void The_suffix_family_is_one_descriptor()
    {
        Assert.Equal(
            ProductVariantKey.Create("20", null, null, "PCS", "lik"),
            ProductVariantKey.Create("20", null, null, "PCS", "luq"));
    }

    [Fact]
    public void A_specification_has_a_unit_or_a_descriptor_but_not_both()
    {
        Assert.Throws<DomainException>(() => ProductVariantKey.Create("28", "CM", null, "PCS", "diş"));
    }

    [Fact]
    public void A_descriptor_without_a_value_is_rejected()
    {
        Assert.Throws<DomainException>(() => ProductVariantKey.Create(null, null, null, "PCS", "diş"));
    }

    [Fact]
    public void Keys_written_before_descriptors_existed_still_read_the_same()
    {
        // The descriptor segment is appended only when there is one, so nothing already stored has to change.
        Assert.Equal("specification=50|specUnit=CM|model=|orderUnit=PCS", ProductVariantKey.Create("50", "CM", null, "PCS"));
    }
}
