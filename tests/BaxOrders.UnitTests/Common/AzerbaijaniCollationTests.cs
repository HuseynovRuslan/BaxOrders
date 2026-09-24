using BaxOrders.Application.Common;

namespace BaxOrders.UnitTests.Common;

/// <summary>
/// Object names in the Azerbaijani alphabetical order — the order B6 lists them in, letter for letter.
/// </summary>
public sealed class AzerbaijaniCollationTests
{
    /// <summary>The owner's 27 objects in the order the specification gives them.</summary>
    private static readonly string[] Expected =
    [
        "ADNSU",
        "Ağır Cinayətlərin qarşısı",
        "Axundov parkı",
        "Bakı Konqres Mərkəzi",
        "Bayıl yolu",
        "Bibiheybət",
        "Bülbül parkı",
        "Çadır",
        "Dədə Qorqud",
        "EXPO Center",
        "Fəvvarələr meydanı",
        "Heydər Əliyev Mərkəzi",
        "Hökumət evi və ətrafı parklar",
        "Xətai parkı",
        "İDEA",
        "Qafur Məmmədov",
        "Qala baza",
        "Qara Qarayev parkı",
        "Milli Konservatoriya qarşısı",
        "Muzey Mərkəzi",
        "Nərimanov heykəli",
        "Novxanı",
        "Parlament parkı",
        "Puşkin parkı",
        "Space TV qarşısı",
        "Təmir-tikinti (ərazidə olan dibçəklərə qulluq)",
        "Zabitlər parkı",
    ];

    [Fact]
    public void The_27_objects_sort_exactly_as_B6_lists_them()
    {
        // Reversed and shuffled first, so the result cannot be the input handed back.
        var shuffled = Expected.Reverse().OrderBy(name => name.Length).ToArray();

        Assert.Equal(Expected, shuffled.OrderByName(name => name));
    }

    [Theory]
    // ə after e, ğ after g, x after h, ı before i, q after k, ö after o, ş after s, ü after u, ç after c.
    [InlineData("Ev", "Əv")]
    [InlineData("Gül", "Ğal")]
    [InlineData("Hökumət", "Xətai")]
    [InlineData("Xətai", "İDEA")]
    [InlineData("Ilıq", "İDEA")]
    [InlineData("Kamil", "Qala")]
    [InlineData("Qala", "Lalə")]
    [InlineData("Ordu", "Özü")]
    [InlineData("Sabir", "Şəki")]
    [InlineData("Ulduz", "Ümid")]
    [InlineData("Cəfər", "Çadır")]
    [InlineData("Çadır", "Dədə")]
    public void Each_Azerbaijani_letter_sits_where_the_alphabet_puts_it(string earlier, string later)
    {
        Assert.True(AzerbaijaniCollation.Compare(earlier, later) < 0, $"'{earlier}' should sort before '{later}'.");
        Assert.True(AzerbaijaniCollation.Compare(later, earlier) > 0, $"'{later}' should sort after '{earlier}'.");
    }

    /// <summary>The order is by letter, not by case — "ADNSU" and "adnsu" are neighbours, not a list apart.</summary>
    [Fact]
    public void Case_does_not_decide_the_order()
    {
        Assert.True(AzerbaijaniCollation.Compare("adnsu", "Bakı") < 0);
        Assert.True(AzerbaijaniCollation.Compare("ADNSU", "bakı") < 0);
        Assert.True(AzerbaijaniCollation.Compare("EXPO Center", "expo center") != 0, "Different text still has a fixed order.");
    }

    [Fact]
    public void A_shorter_name_that_is_the_start_of_a_longer_one_comes_first()
    {
        Assert.True(AzerbaijaniCollation.Compare("Qara Qarayev", "Qara Qarayev parkı") < 0);
        Assert.True(AzerbaijaniCollation.Compare("Qara Qarayev", "Qarabağ") < 0, "A space sorts before a letter.");
    }
}
