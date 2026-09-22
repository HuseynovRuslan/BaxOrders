using BaxOrders.Domain;
using BaxOrders.Domain.Normalization;

namespace BaxOrders.UnitTests.Normalization;

public sealed class SpecificationDescriptorNormalizerTests
{
    [Theory]
    [InlineData("lik")]
    [InlineData("lıq")]
    [InlineData("lük")]
    [InlineData("luq")]
    [InlineData("  LİK  ")]
    public void The_four_suffix_forms_are_one_descriptor(string written)
    {
        // The same product appears as "Şkurka lük 100" and "Şkurka lik 120": one suffix, four vowel-harmony forms.
        Assert.Equal(SpecificationDescriptorNormalizer.SuffixFamily, SpecificationDescriptorNormalizer.Normalize(written));
    }

    [Theory]
    [InlineData("diş", "diş")]
    [InlineData("qat", "qat")]
    [InlineData("yarpaq", "yarpaq")]
    [InlineData(" ƏDƏDLİ ", "ədədli")]
    public void Every_other_word_normalizes_to_itself(string written, string expected)
    {
        Assert.Equal(expected, SpecificationDescriptorNormalizer.Normalize(written));
    }

    [Fact]
    public void Words_that_are_not_the_suffix_family_stay_apart()
    {
        // No stemming: "diş" is not folded into anything, and nothing is folded into it.
        Assert.NotEqual(
            SpecificationDescriptorNormalizer.Normalize("diş"),
            SpecificationDescriptorNormalizer.Normalize("qat"));

        Assert.NotEqual(
            SpecificationDescriptorNormalizer.Normalize("dişli"),
            SpecificationDescriptorNormalizer.Normalize("diş"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void No_descriptor_is_null(string? value)
    {
        Assert.Null(SpecificationDescriptorNormalizer.Normalize(value));
    }

    [Fact]
    public void Normalization_is_deterministic()
    {
        Assert.Equal(
            SpecificationDescriptorNormalizer.Normalize("  LUQ "),
            SpecificationDescriptorNormalizer.Normalize("lıq"));
    }

    [Fact]
    public void A_descriptor_longer_than_the_column_is_refused()
    {
        var tooLong = new string('x', SpecificationDescriptorNormalizer.MaxLength + 1);

        Assert.Throws<DomainException>(() => SpecificationDescriptorNormalizer.Normalize(tooLong));
    }
}
