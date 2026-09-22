using BaxOrders.Domain.Normalization;

namespace BaxOrders.UnitTests.Normalization;

public sealed class TextNormalizerTests
{
    [Theory]
    [InlineData(" Cleanfix MMC ")]
    [InlineData("Cleanfix MMC")]
    [InlineData("Cleanfix    MMC")]
    [InlineData("\tCleanfix\r\nMMC\n")]
    [InlineData("Cleanfix MMC")]
    [InlineData("​Cleanfix MMC﻿")]
    [InlineData("CLEANFIX MMC")]
    public void Whitespace_and_case_variants_produce_the_same_value(string input)
    {
        Assert.Equal("cleanfix mmc", TextNormalizer.Normalize(input));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("​")]
    public void Blank_input_normalizes_to_empty(string? input)
    {
        Assert.Equal(string.Empty, TextNormalizer.Normalize(input));
    }

    [Theory]
    [InlineData("MAŞTAĞA", "maştağa")]
    [InlineData("ƏMİRCAN", "əmircan")]
    [InlineData("H.Ə.M", "h.ə.m")]
    [InlineData("İNŞAAT MS", "inşaat ms")]
    [InlineData("Döşəmə təmizlik ləvazimatı", "döşəmə təmizlik ləvazimati")]
    public void Azerbaijani_text_is_lower_cased_without_losing_letters(string input, string expected)
    {
        Assert.Equal(expected, TextNormalizer.Normalize(input));
    }

    [Fact]
    public void Azerbaijani_letters_are_not_folded_to_ascii()
    {
        Assert.NotEqual(TextNormalizer.Normalize("Maştağa"), TextNormalizer.Normalize("Mastaga"));
        Assert.NotEqual(TextNormalizer.Normalize("Əmircan"), TextNormalizer.Normalize("Emircan"));
    }

    [Theory]
    [InlineData("IŞIQ", "Işıq")]
    [InlineData("LƏVAZIMAT", "ləvazimat")]
    [InlineData("İNŞAAT", "inşaat")]
    public void Dotted_and_dotless_i_typed_on_different_keyboards_compare_equal(string first, string second)
    {
        Assert.Equal(TextNormalizer.Normalize(first), TextNormalizer.Normalize(second));
    }

    [Fact]
    public void Composed_and_decomposed_unicode_compare_equal()
    {
        Assert.Equal(TextNormalizer.Normalize("çırpma"), TextNormalizer.Normalize("çırpma"));
        Assert.Equal(TextNormalizer.Normalize("İnşaat"), TextNormalizer.Normalize("İnşaat"));
    }

    [Theory]
    [InlineData("H. Ə. M", "H.Ə.M")]
    [InlineData("Rezin əlcək / ədəd", "Rezin əlcək/ədəd")]
    [InlineData("Makaron - mop", "Makaron–mop")]
    [InlineData("\"Cleanfix\" MMC", "«Cleanfix» MMC")]
    [InlineData("Əlcək (L)", "Əlcək(L)")]
    public void Punctuation_spacing_and_quote_styles_are_insignificant(string first, string second)
    {
        Assert.Equal(TextNormalizer.Normalize(first), TextNormalizer.Normalize(second));
    }

    [Fact]
    public void Hyphen_is_not_treated_as_a_space()
    {
        // "Makaron-mop" may become an approved alias of "Makaron mop", but never implicitly.
        Assert.NotEqual(TextNormalizer.Normalize("Makaron mop"), TextNormalizer.Normalize("Makaron-mop"));
    }

    [Fact]
    public void Different_order_units_in_a_name_stay_different()
    {
        Assert.NotEqual(
            TextNormalizer.Normalize("Rezin əlcək / ədəd"),
            TextNormalizer.Normalize("Rezin əlcək / paçka"));
    }

    [Theory]
    [InlineData(" Makaron  Mop ")]
    [InlineData("H. Ə. M")]
    [InlineData("\"İnşaat\" MS")]
    public void Normalization_is_idempotent(string input)
    {
        var once = TextNormalizer.Normalize(input);
        Assert.Equal(once, TextNormalizer.Normalize(once));
    }
}
