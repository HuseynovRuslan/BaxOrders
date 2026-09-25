using BaxOrders.Application.Analytics;

namespace BaxOrders.UnitTests.Analytics;

/// <summary>
/// Which family a variant belongs to once approved variant links are read (Task 13c), tested without a database.
/// </summary>
/// <remarks>
/// Spellings fold first, then the family is looked up through every product behind the kept spelling. The one thing
/// this must never do is put a variant in a family nobody approved, so the conflicting and the empty cases are pinned
/// as firmly as the ordinary ones.
/// </remarks>
public sealed class VariantFamiliesTests
{
    // Products.
    private const long Sabun = 100;
    private const long SabunLavanda = 200;
    private const long SabunLavandaOtherSpelling = 210;
    private const long SabunNana = 150;
    private const long Qab = 300;
    private const long Unlinked = 900;

    // Variants: each product's own, and one more spelling of "Sabun elano lavanda ətirli".
    private const long SabunVariant = 1;
    private const long SabunLavandaVariant = 2;
    private const long SabunLavandaOtherSpellingVariant = 3;
    private const long SabunNanaVariant = 4;
    private const long UnlinkedVariant = 9;

    private static readonly VariantLink Lavanda = new(SabunLavanda, Sabun, "lavanda ətirli", "Sabun elano");

    [Fact]
    public void A_base_is_its_own_family_under_no_label()
    {
        var families = VariantFamilies.Of([Lavanda], []);

        Assert.Equal(new VariantFamilyRole(Sabun, Sabun, null), families.RoleOf(SabunVariant, Sabun, SpellingFold.None));
        Assert.Equal("Sabun elano", families.BaseNameOf(Sabun));
    }

    [Fact]
    public void A_variant_is_in_its_base_s_family_under_its_label()
    {
        var families = VariantFamilies.Of([Lavanda], []);

        Assert.Equal(
            new VariantFamilyRole(Sabun, SabunLavanda, "lavanda ətirli"),
            families.RoleOf(SabunLavandaVariant, SabunLavanda, SpellingFold.None));
    }

    [Fact]
    public void A_product_no_link_names_is_in_no_family()
    {
        var families = VariantFamilies.Of([Lavanda], []);

        Assert.Null(families.RoleOf(UnlinkedVariant, Unlinked, SpellingFold.None));
        Assert.Null(families.BaseNameOf(Unlinked));
        // A variant product is not a base: nobody approved anything as a variant of it.
        Assert.Null(families.BaseNameOf(SabunLavanda));
    }

    /// <summary>
    /// The link was approved on one spelling, and that spelling was then folded into another whose own product has no
    /// link. The kept spelling still carries the family (13b report §7.1).
    /// </summary>
    [Fact]
    public void A_link_on_a_folded_away_spelling_still_counts_for_the_kept_one()
    {
        var spelling = SpellingFold.Of([(SabunLavandaVariant, SabunLavandaOtherSpellingVariant)]);
        var families = VariantFamilies.Of(
            [Lavanda],
            [(SabunLavandaVariant, SabunLavanda, SabunLavandaOtherSpelling)]);

        Assert.Equal(
            new VariantFamilyRole(Sabun, SabunLavanda, "lavanda ətirli"),
            families.RoleOf(SabunLavandaOtherSpellingVariant, SabunLavandaOtherSpelling, spelling));
    }

    /// <summary>A spelling that is not folded into this variant says nothing about it.</summary>
    [Fact]
    public void A_spelling_folded_elsewhere_lends_this_variant_no_family()
    {
        var spelling = SpellingFold.Of([(SabunLavandaVariant, SabunLavandaOtherSpellingVariant)]);
        var families = VariantFamilies.Of(
            [Lavanda],
            [(SabunLavandaVariant, SabunLavanda, SabunLavandaOtherSpelling)]);

        Assert.Null(families.RoleOf(UnlinkedVariant, Unlinked, spelling));
    }

    /// <summary>
    /// Two spellings of one item approved into two different families: the approvals disagree, and the variant is left
    /// in no family rather than put in either — an unresolved pair costs nothing (WORKFLOW_RULES §7).
    /// </summary>
    [Fact]
    public void Products_behind_one_variant_pointing_at_two_bases_leave_it_in_no_family()
    {
        var spelling = SpellingFold.Of([(SabunLavandaVariant, SabunLavandaOtherSpellingVariant)]);
        var families = VariantFamilies.Of(
            [Lavanda, new VariantLink(SabunLavandaOtherSpelling, Qab, "lavanda", "Qab")],
            [(SabunLavandaVariant, SabunLavanda, SabunLavandaOtherSpelling)]);

        Assert.Null(families.RoleOf(SabunLavandaOtherSpellingVariant, SabunLavandaOtherSpelling, spelling));
    }

    /// <summary>Two products behind one variant, both in the same family: the variant's own product speaks for it.</summary>
    [Fact]
    public void The_variant_s_own_role_wins_over_a_folded_product_s()
    {
        // The folded-away product has the lower id, so this is the own-role rule and not the lowest-id one.
        var spelling = SpellingFold.Of([(SabunNanaVariant, SabunLavandaVariant)]);
        var families = VariantFamilies.Of(
            [Lavanda, new VariantLink(SabunNana, Sabun, "nanə", "Sabun elano")],
            [(SabunNanaVariant, SabunNana, SabunLavanda)]);

        Assert.Equal(
            new VariantFamilyRole(Sabun, SabunLavanda, "lavanda ətirli"),
            families.RoleOf(SabunLavandaVariant, SabunLavanda, spelling));
    }

    /// <summary>With no role of its own, the lowest product behind the variant that has one: a repeatable rule.</summary>
    [Fact]
    public void Without_an_own_role_the_lowest_product_with_one_speaks_for_it()
    {
        var spelling = SpellingFold.Of([(SabunNanaVariant, UnlinkedVariant), (SabunLavandaVariant, UnlinkedVariant)]);
        var families = VariantFamilies.Of(
            [Lavanda, new VariantLink(SabunNana, Sabun, "nanə", "Sabun elano")],
            [(SabunLavandaVariant, SabunLavanda, Unlinked), (SabunNanaVariant, SabunNana, Unlinked)]);

        Assert.Equal(
            new VariantFamilyRole(Sabun, SabunNana, "nanə"),
            families.RoleOf(UnlinkedVariant, Unlinked, spelling));
    }

    [Fact]
    public void With_no_link_every_role_is_null()
    {
        var spelling = SpellingFold.Of([(SabunLavandaVariant, SabunLavandaOtherSpellingVariant)]);
        var families = VariantFamilies.Of([], [(SabunLavandaVariant, SabunLavanda, SabunLavandaOtherSpelling)]);

        Assert.True(families.IsEmpty);
        Assert.Same(VariantFamilies.None, families);
        Assert.Null(families.RoleOf(SabunVariant, Sabun, SpellingFold.None));
        Assert.Null(families.RoleOf(SabunLavandaOtherSpellingVariant, SabunLavandaOtherSpelling, spelling));
        Assert.True(VariantFamilies.None.IsEmpty);
        Assert.Null(VariantFamilies.None.RoleOf(SabunLavandaVariant, SabunLavanda, SpellingFold.None));
    }

    /// <summary>The database holds one live link per variant product; were it handed two, the oldest is kept.</summary>
    [Fact]
    public void A_product_linked_twice_keeps_its_first_link()
    {
        var families = VariantFamilies.Of(
            [Lavanda, new VariantLink(SabunLavanda, Qab, "lavanda", "Qab")],
            []);

        Assert.Equal(
            new VariantFamilyRole(Sabun, SabunLavanda, "lavanda ətirli"),
            families.RoleOf(SabunLavandaVariant, SabunLavanda, SpellingFold.None));
        Assert.Null(families.BaseNameOf(Qab));
    }

    [Fact]
    public void The_roles_of_an_analytics_read_are_only_the_variants_that_have_one()
    {
        var matches = new ApprovedMatches(SpellingFold.None, VariantFamilies.Of([Lavanda], []));

        var roles = matches.RolesOf(
        [
            KeyValuePair.Create(SabunVariant, Sabun),
            KeyValuePair.Create(SabunLavandaVariant, SabunLavanda),
            KeyValuePair.Create(UnlinkedVariant, Unlinked),
        ]);

        Assert.Equal(
            [
                KeyValuePair.Create(SabunVariant, new VariantFamilyRole(Sabun, Sabun, null)),
                KeyValuePair.Create(SabunLavandaVariant, new VariantFamilyRole(Sabun, SabunLavanda, "lavanda ətirli")),
            ],
            roles.OrderBy(entry => entry.Key));
        Assert.Empty(ApprovedMatches.None.RolesOf([KeyValuePair.Create(SabunVariant, Sabun)]));
    }
}
