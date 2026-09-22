using BaxOrders.Domain.Normalization;

namespace BaxOrders.UnitTests.Normalization;

public sealed class SpecificationNormalizerTests
{
    [Theory]
    [InlineData("40x40")]
    [InlineData("40 x 40")]
    [InlineData("40×40")]
    [InlineData("40 × 40")]
    [InlineData("40X40")]
    [InlineData("40*40")]
    [InlineData(" 40x40 ")]
    public void Multiplication_sign_variants_normalize_to_the_same_value(string input)
    {
        Assert.Equal("40x40", SpecificationNormalizer.Normalize(input));
    }

    [Theory]
    [InlineData("1.000")]
    [InlineData("1,000")]
    [InlineData("1,5")]
    [InlineData("1.5")]
    [InlineData("50.0")]
    [InlineData("0.50")]
    [InlineData("120")]
    public void Numbers_are_never_reinterpreted(string input)
    {
        Assert.Equal(input, SpecificationNormalizer.Normalize(input));
    }

    [Fact]
    public void One_thousand_with_a_dot_is_not_silently_converted_to_one()
    {
        Assert.Equal("1.000", SpecificationNormalizer.Normalize("1.000"));
        Assert.NotEqual(SpecificationNormalizer.Normalize("1"), SpecificationNormalizer.Normalize("1.000"));
    }

    [Fact]
    public void Decimal_comma_and_decimal_dot_stay_different()
    {
        Assert.NotEqual(SpecificationNormalizer.Normalize("1,5"), SpecificationNormalizer.Normalize("1.5"));
    }

    [Theory]
    [InlineData(" 50  SM ", "50 sm")]
    [InlineData("1x5 ƏDƏD", "1x5 ədəd")]
    [InlineData(null, "")]
    [InlineData("   ", "")]
    public void Whitespace_case_and_unicode_are_normalized(string? input, string expected)
    {
        Assert.Equal(expected, SpecificationNormalizer.Normalize(input));
    }

    [Fact]
    public void Quotation_marks_are_kept_because_they_can_carry_meaning()
    {
        Assert.Equal("12\"", SpecificationNormalizer.Normalize("12”"));
        Assert.NotEqual(SpecificationNormalizer.Normalize("12\""), SpecificationNormalizer.Normalize("12"));
    }

    [Theory]
    [InlineData("50", "500")]
    [InlineData("1x5", "5x1")]
    [InlineData("40x40", "4040")]
    [InlineData("50sm", "50 sm")]
    public void Meaningfully_or_possibly_different_values_stay_different(string first, string second)
    {
        Assert.NotEqual(SpecificationNormalizer.Normalize(first), SpecificationNormalizer.Normalize(second));
    }

    [Theory]
    [InlineData("AB 120", "ab120")]
    [InlineData(" ab120 ", "ab120")]
    public void Model_codes_ignore_case_and_spaces(string input, string expected)
    {
        Assert.Equal(expected, ModelCodeNormalizer.Normalize(input));
    }

    [Fact]
    public void Model_code_punctuation_stays_significant()
    {
        Assert.NotEqual(ModelCodeNormalizer.Normalize("AB-120"), ModelCodeNormalizer.Normalize("AB120"));
    }
}
