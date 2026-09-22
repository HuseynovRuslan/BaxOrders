using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;

namespace BaxOrders.UnitTests.Imports;

public sealed class ImportSourceKeysTests
{
    [Theory]
    [InlineData(" Cleanfix MMC ", "cleanfix mmc")]
    [InlineData("CLEANFIX   mmc", "cleanfix mmc")]
    [InlineData("Ö/V", "ö/v")]
    public void Name_keys_use_the_shared_normalization(string sourceText, string expected)
    {
        Assert.Equal(expected, ImportSourceKeys.Name(sourceText));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Blank_values_have_no_key(string? sourceText)
    {
        Assert.Null(ImportSourceKeys.Name(sourceText));
        Assert.Null(ImportSourceKeys.CategoryPath(sourceText, null, null));
    }

    [Fact]
    public void Category_path_joins_the_levels_from_the_root()
    {
        Assert.Equal(
            "təmizlik|təmizlik ləvazimati|əlcək",
            ImportSourceKeys.CategoryPath(" Təmizlik ", "Təmizlik ləvazimatı", "ƏLCƏK"));
    }

    [Fact]
    public void Category_path_stops_at_the_last_filled_level()
    {
        Assert.Equal("təmizlik|təmizlik ləvazimati", ImportSourceKeys.CategoryPath("Təmizlik", "Təmizlik ləvazimatı", "  "));
    }

    [Fact]
    public void Category_path_keeps_a_blank_level_between_filled_levels()
    {
        var key = ImportSourceKeys.CategoryPath("Təmizlik", " ", "Əlcək");

        Assert.Equal("təmizlik||əlcək", key);
        Assert.True(ImportSourceKeys.HasMissingCategoryLevel(key!));
        Assert.False(ImportSourceKeys.HasMissingCategoryLevel("təmizlik|əlcək"));
    }

    [Fact]
    public void A_separator_inside_a_name_cannot_forge_another_path()
    {
        var withSeparator = ImportSourceKeys.CategoryPath("Usta|Təmizlik", null, null);

        Assert.Equal("usta%7Ctəmizlik", withSeparator);
        Assert.NotEqual(ImportSourceKeys.CategoryPath("Usta", "Təmizlik", null), withSeparator);
        Assert.Equal(["usta|təmizlik"], ImportSourceKeys.CategoryLevels(withSeparator!));
    }

    [Fact]
    public void Levels_round_trip()
    {
        var key = ImportSourceKeys.CategoryPath("Təmizlik", "Təmizlik ləvazimatı", "Əlcək")!;

        Assert.Equal(["təmizlik", "təmizlik ləvazimati", "əlcək"], ImportSourceKeys.CategoryLevels(key));
    }

    [Fact]
    public void A_variant_key_carries_its_product_and_can_be_read_back()
    {
        var variantKey = ProductVariantKey.Create("50", "CM", null, "PCS");
        var sourceKey = ImportSourceKeys.ProductVariant(100, variantKey);

        Assert.True(ImportSourceKeys.TryReadProduct(sourceKey, out var productId));
        Assert.Equal(100, productId);
        Assert.Equal(variantKey, ImportSourceKeys.ReadVariantKey(sourceKey));

        // Two products with the same variant shape are still two distinct values.
        Assert.NotEqual(sourceKey, ImportSourceKeys.ProductVariant(101, variantKey));
    }

    [Fact]
    public void A_variant_key_requires_a_saved_product()
    {
        Assert.Throws<DomainException>(() => ImportSourceKeys.ProductVariant(0, ProductVariantKey.Create(null, null, null, "PCS")));
    }

    [Fact]
    public void A_value_that_is_not_a_variant_key_is_refused()
    {
        Assert.False(ImportSourceKeys.TryReadProduct("cleanfix mmc", out _));
        Assert.False(ImportSourceKeys.TryReadProduct("product=abc|x", out _));
        Assert.Throws<DomainException>(() => ImportSourceKeys.ReadVariantKey("cleanfix mmc"));
    }

    [Fact]
    public void A_variant_key_that_would_not_fit_the_column_is_refused()
    {
        var longest = ProductVariantKey.Create(new string('x', 100), null, new string('y', 100), "PCS");

        Assert.True(ImportSourceKeys.ProductVariant(1, longest).Length <= ImportSourceKeys.ProductVariantMaxLength);
        Assert.Throws<DomainException>(() => ImportSourceKeys.ProductVariant(1, new string('z', ImportSourceKeys.ProductVariantMaxLength)));
    }

    [Fact]
    public void Hash_is_deterministic_and_fits_the_unique_index()
    {
        var hash = ImportSourceKeys.Hash("cleanfix mmc");

        Assert.Equal(ImportResolution.SourceKeyHashLength, hash.Length);
        Assert.Equal(hash, ImportSourceKeys.Hash("cleanfix mmc"));
        Assert.NotEqual(hash, ImportSourceKeys.Hash("cleanfix"));
        Assert.Matches("^[0-9a-f]+$", hash);
    }
}
