using BaxOrders.Domain.Normalization;

namespace BaxOrders.UnitTests.Normalization;

/// <summary>
/// Brief (Task 13): "eyni mal fərqli yazılıb — boşluq fərqi, «15 W» / «15W», «3/4» / «3\4»". The spelling key removes
/// exactly those differences and nothing else.
/// </summary>
public sealed class SpellingKeyTests
{
    [Theory]
    [InlineData("Lampa 15 W", "Lampa 15W")]
    [InlineData("Sabun elano", "Sabunelano")]
    [InlineData("Kaplin 3/4", "Kaplin 3\\4")]
    [InlineData("Kaplin 3 / 4", "Kaplin 3\\4")]
    [InlineData("  LAMPA  15 W ", "lampa 15w")]
    public void Spaces_and_the_slash_direction_are_the_only_things_it_folds(string first, string second)
    {
        Assert.Equal(SpellingKey.Of(first), SpellingKey.Of(second));
    }

    [Theory]
    [InlineData("15 W", "15W")]
    [InlineData("3/4", "3\\4")]
    [InlineData("40 x 40", "40x40")]
    public void A_specification_folds_the_same_way(string first, string second)
    {
        Assert.Equal(SpellingKey.OfSpecification(first), SpellingKey.OfSpecification(second));
    }

    [Fact]
    public void A_specification_keeps_its_quotation_marks()
    {
        Assert.NotEqual(SpellingKey.OfSpecification("12\""), SpellingKey.OfSpecification("12"));
    }

    [Theory]
    [InlineData("AB 12/3", "ab12\\3")]
    [InlineData("AB12/3", "AB 12 / 3")]
    public void A_model_code_folds_the_slash_direction_and_already_ignores_spaces(string first, string second)
    {
        Assert.Equal(SpellingKey.OfModelCode(first), SpellingKey.OfModelCode(second));
    }

    [Fact]
    public void A_model_code_keeps_its_other_punctuation()
    {
        Assert.NotEqual(SpellingKey.OfModelCode("AB-12"), SpellingKey.OfModelCode("AB12"));
    }

    [Theory]
    [InlineData("Kist 2", "Kist 3")]
    [InlineData("Lampa 15 W", "Lampa 18 W")]
    [InlineData("Leska 3mm", "Leska 2,4mm")]
    [InlineData("Metlaq Boz", "Metlaq boz rəng")]
    [InlineData("Laqonda nasadkası şkurka üçün", "Laqonda nasadkası üçün şkurka")]
    [InlineData("Sabun elano", "Sabun elano lavanda ətirli")]
    [InlineData("Mop eko", "Mop əskisi")]
    public void Digits_letters_words_and_word_order_are_untouched(string first, string second)
    {
        Assert.NotEqual(SpellingKey.Of(first), SpellingKey.Of(second));
    }

    [Theory]
    [InlineData("1,5", "1.5")]
    [InlineData("1.000", "1")]
    [InlineData("50", "500")]
    [InlineData("1x5", "5x1")]
    public void Numbers_are_never_reinterpreted(string first, string second)
    {
        Assert.NotEqual(SpellingKey.OfSpecification(first), SpellingKey.OfSpecification(second));
    }

    [Theory]
    [InlineData("Əl arabası", "El arabasi")]
    [InlineData("Şampun", "Sampun")]
    [InlineData("Gözlü", "Gozlu")]
    public void Azerbaijani_letters_are_not_folded_to_latin_ones(string first, string second)
    {
        Assert.NotEqual(SpellingKey.Of(first), SpellingKey.Of(second));
    }

    [Fact]
    public void Dotted_and_dotless_i_fold_as_they_already_do_for_every_name()
    {
        Assert.Equal(TextNormalizer.Normalize("İŞIQ"), TextNormalizer.Normalize("işiq"));
        Assert.Equal(SpellingKey.Of("İŞIQ"), SpellingKey.Of("işiq"));
    }

    [Fact]
    public void The_key_is_the_existing_normalization_without_spaces_and_with_one_slash_direction()
    {
        Assert.Equal("kaplin3/4", SpellingKey.Of(" Kaplin  3\\4 "));
        Assert.Equal("lampa15w", SpellingKey.Of("Lampa 15 W"));
        Assert.Equal(string.Empty, SpellingKey.Of(null));
        Assert.Equal(string.Empty, SpellingKey.OfSpecification("   "));
        Assert.Equal(string.Empty, SpellingKey.OfModelCode(null));
    }
}
