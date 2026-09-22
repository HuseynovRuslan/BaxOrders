using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;

namespace BaxOrders.UnitTests.Catalog;

public sealed class ProductCodeTests
{
    [Theory]
    [InlineData(1L, "PRD-000001")]
    [InlineData(2L, "PRD-000002")]
    [InlineData(42L, "PRD-000042")]
    [InlineData(999999L, "PRD-999999")]
    [InlineData(1000000L, "PRD-1000000")]
    public void Sequence_numbers_are_formatted_as_product_codes(long number, string expected)
    {
        var code = ProductCode.FromNumber(number);

        Assert.Equal(expected, code);
        Assert.True(ProductCode.IsValid(code));
    }

    [Theory]
    [InlineData(0L)]
    [InlineData(-1L)]
    public void Non_positive_numbers_are_rejected(long number)
    {
        Assert.Throws<DomainException>(() => ProductCode.FromNumber(number));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("PRD-1")]
    [InlineData("PRD-000000")]
    [InlineData("PRD-0000001")]
    [InlineData("prd-000001")]
    [InlineData(" PRD-000001")]
    [InlineData("PRD-00000A")]
    [InlineData("P-0001")]
    public void Codes_in_other_formats_are_invalid(string? code)
    {
        Assert.False(ProductCode.IsValid(code));
    }

    [Fact]
    public void Product_accepts_only_generator_format_codes()
    {
        Assert.Equal("PRD-000007", new Product("PRD-000007", "Lapatka").Code);
        Assert.Throws<DomainException>(() => new Product("LAPATKA-1", "Lapatka"));
    }
}
