using BaxOrders.Application.Catalog.ProductMatches;
using BaxOrders.Domain.Catalog;

namespace BaxOrders.UnitTests.Catalog;

/// <summary>
/// Brief (Task 13): "Sistem ehtimal olunan uyğunluqları təklif edir" — a spelling difference ("boşluq, «15 W» /
/// «15W», «3/4» / «3\4»") and a variant difference ("Sabun elano" / "Sabun elano lavanda ətirli") — and "özü heç nə
/// etmir". Every clause of the rule, each with a case that passes and one that does not.
/// </summary>
public sealed class ProductMatchSuggestionsTests
{
    private static readonly LiveMatchDecision[] NoDecisions = [];

    // ---- Yazılış fərqi -------------------------------------------------------------------------------------

    [Fact]
    public void A_space_in_the_name_is_a_spelling_suggestion_towards_the_more_ordered_variant()
    {
        var suggestion = Assert.Single(SameItem(
            V(1, 1, "Lampa 15 W", lines: 2),
            V(2, 2, "Lampa 15W", lines: 5)));

        Assert.Equal((1L, 2L, SpellingDifference.Whitespace), (suggestion.SourceVariantId, suggestion.TargetVariantId, suggestion.Difference));
    }

    [Fact]
    public void The_slash_direction_is_a_spelling_suggestion()
    {
        var suggestion = Assert.Single(SameItem(
            V(1, 1, "Kaplin 3/4", lines: 3),
            V(2, 2, "Kaplin 3\\4", lines: 1)));

        Assert.Equal((2L, 1L, SpellingDifference.Slash), (suggestion.SourceVariantId, suggestion.TargetVariantId, suggestion.Difference));
    }

    [Fact]
    public void A_space_and_a_slash_together_say_so()
    {
        var suggestion = Assert.Single(SameItem(
            V(1, 1, "Kaplin 3/4 A"),
            V(2, 2, "Kaplin 3\\4A")));

        Assert.Equal(SpellingDifference.WhitespaceAndSlash, suggestion.Difference);
    }

    [Fact]
    public void A_specification_written_two_ways_inside_one_product_is_a_spelling_suggestion()
    {
        var suggestion = Assert.Single(SameItem(
            V(1, 1, "Lampa", specification: "15 W", lines: 4),
            V(2, 1, "Lampa", specification: "15W", lines: 1)));

        Assert.Equal((2L, 1L, SpellingDifference.Whitespace), (suggestion.SourceVariantId, suggestion.TargetVariantId, suggestion.Difference));
    }

    [Fact]
    public void A_model_code_that_differs_only_by_the_slash_direction_is_a_spelling_suggestion()
    {
        var suggestion = Assert.Single(SameItem(
            V(1, 1, "Nasadka", model: "AB12/3"),
            V(2, 1, "Nasadka", model: "AB12\\3")));

        Assert.Equal(SpellingDifference.Slash, suggestion.Difference);
    }

    [Fact]
    public void Two_order_units_are_never_suggested_as_one_item()
    {
        Assert.Empty(SameItem(V(1, 1, "Lampa 15 W", unit: "PCS"), V(2, 2, "Lampa 15W", unit: "PACK")));
        Assert.Empty(SameItem(V(1, 1, "Lampa 15 W", unit: "PCS"), V(2, 2, "Lampa 15W", unit: null)));
    }

    [Fact]
    public void A_different_specification_unit_or_descriptor_is_never_suggested()
    {
        Assert.Empty(SameItem(
            V(1, 1, "Lampa", specification: "15", specificationUnit: "W"),
            V(2, 1, "Lampa", specification: "15", specificationUnit: "CM")));
        Assert.Empty(SameItem(
            V(1, 1, "Şkurka", specification: "28", descriptor: "diş"),
            V(2, 1, "Şkurka", specification: "28", descriptor: "qat")));
    }

    [Fact]
    public void A_different_word_letter_or_number_is_never_suggested()
    {
        Assert.Empty(SameItem(V(1, 1, "Lampa 15 W"), V(2, 2, "Lampa 18 W")));
        Assert.Empty(SameItem(V(1, 1, "Lampa", specification: "1,5"), V(2, 1, "Lampa", specification: "1.5")));
        Assert.Empty(SameItem(V(1, 1, "Lampa", model: "AB-12"), V(2, 1, "Lampa", model: "AB12")));
    }

    [Fact]
    public void A_variant_with_no_order_line_takes_no_part()
    {
        Assert.Empty(SameItem(V(1, 1, "Lampa 15 W", lines: 0), V(2, 2, "Lampa 15W", lines: 7)));
    }

    [Fact]
    public void Names_that_normalization_already_makes_one_are_not_a_spelling_difference()
    {
        // DB-03: a double space or a letter case is already one source key; two such products are not a spelling pair.
        Assert.Empty(SameItem(V(1, 1, "Lampa  15W"), V(2, 2, "LAMPA 15W")));
    }

    [Fact]
    public void A_group_is_suggested_towards_the_most_ordered_member_then_the_lowest_id()
    {
        var byLines = SameItem(V(1, 1, "Lampa 15 W", lines: 1), V(2, 2, "Lampa 15W", lines: 1), V(3, 3, "Lampa15 W", lines: 9));
        Assert.All(byLines, suggestion => Assert.Equal(3L, suggestion.TargetVariantId));
        Assert.Equal([1L, 2L], byLines.Select(suggestion => suggestion.SourceVariantId).Order());

        var byId = SameItem(V(5, 5, "Lampa 15 W", lines: 2), V(4, 4, "Lampa 15W", lines: 2));
        Assert.Equal((5L, 4L), (Assert.Single(byId).SourceVariantId, byId[0].TargetVariantId));
    }

    [Fact]
    public void A_live_approved_target_stays_the_target_even_with_fewer_lines()
    {
        var suggestions = SameItem(
            [Approved(1, 2)],
            V(1, 1, "Lampa 15 W", lines: 9),
            V(2, 2, "Lampa 15W", lines: 1),
            V(3, 3, "Lampa15 W", lines: 5));

        var suggestion = Assert.Single(suggestions);
        Assert.Equal((3L, 2L), (suggestion.SourceVariantId, suggestion.TargetVariantId));
    }

    [Fact]
    public void A_decided_pair_is_not_suggested_again_either_way_round()
    {
        Assert.Empty(SameItem([Rejected(1, 2)], V(1, 1, "Lampa 15 W", lines: 1), V(2, 2, "Lampa 15W", lines: 5)));
        Assert.Empty(SameItem([Rejected(2, 1)], V(1, 1, "Lampa 15 W", lines: 1), V(2, 2, "Lampa 15W", lines: 5)));
        Assert.Empty(SameItem([Approved(2, 1)], V(1, 1, "Lampa 15 W", lines: 1), V(2, 2, "Lampa 15W", lines: 5)));
    }

    [Fact]
    public void An_undone_decision_is_no_decision_and_the_pair_is_suggested_again()
    {
        // Only live decisions reach the rules; an undone one is simply not among them.
        var before = SameItem(V(1, 1, "Lampa 15 W", lines: 1), V(2, 2, "Lampa 15W", lines: 5));
        var whileDecided = SameItem([Rejected(1, 2)], V(1, 1, "Lampa 15 W", lines: 1), V(2, 2, "Lampa 15W", lines: 5));
        var afterUndo = SameItem(NoDecisions, V(1, 1, "Lampa 15 W", lines: 1), V(2, 2, "Lampa 15W", lines: 5));

        Assert.Empty(whileDecided);
        Assert.Equal(before, afterUndo);
    }

    [Fact]
    public void Suggestions_are_offered_either_way_round_but_only_between_the_suggested_pair()
    {
        var set = ProductMatchSuggestions.Compute([V(1, 1, "Lampa 15 W", lines: 1), V(2, 2, "Lampa 15W", lines: 5)], NoDecisions);

        Assert.NotNull(set.SameItemPair(1, 2));
        Assert.NotNull(set.SameItemPair(2, 1));
        Assert.Null(set.SameItemPair(1, 3));
    }

    // ---- Variant fərqi -------------------------------------------------------------------------------------

    [Fact]
    public void The_briefs_pair_is_a_variant_suggestion_with_its_label()
    {
        var suggestion = Assert.Single(Variant(V(1, 1, "Sabun elano"), V(2, 2, "Sabun elano lavanda ətirli")));

        Assert.Equal((2L, 1L, "lavanda ətirli"), (suggestion.VariantProductId, suggestion.BaseProductId, suggestion.ProposedLabel));
    }

    [Fact]
    public void Only_a_whole_word_prefix_is_a_base()
    {
        Assert.Empty(Variant(V(1, 1, "Sabun elano"), V(2, 2, "Sabun elanox lavanda")));
        Assert.Empty(Variant(V(1, 1, "Sabun elano"), V(2, 2, "Sabun ela")));
        Assert.Empty(Variant(V(1, 1, "Sabun elano"), V(2, 2, "Sabun elano -")));
    }

    [Theory]
    [InlineData("Sabun elano, lavanda ətirli", "lavanda ətirli")]
    [InlineData("Sabun elano - lavanda ətirli", "lavanda ətirli")]
    [InlineData("Sabun elano/lavanda", "lavanda")]
    [InlineData("\"Sabun elano\" lavanda ətirli", "lavanda ətirli")]
    [InlineData("SABUN  ELANO lavanda", "lavanda")]
    [InlineData("Sabun elano (lavanda)", "(lavanda)")]
    public void The_label_is_the_rest_of_the_name_without_the_separator(string name, string label)
    {
        var suggestion = Assert.Single(Variant(V(1, 1, "Sabun elano"), V(2, 2, name)));

        Assert.Equal(label, suggestion.ProposedLabel);
    }

    [Fact]
    public void The_shortest_open_base_is_proposed_and_rejecting_it_brings_up_the_next()
    {
        var variants = new[] { V(1, 1, "Sabun"), V(2, 2, "Sabun elano"), V(3, 3, "Sabun elano lavanda ətirli") };

        var first = Variant(NoDecisions, variants);
        Assert.Equal(1L, first.Single(suggestion => suggestion.VariantProductId == 3).BaseProductId);
        Assert.Equal("elano lavanda ətirli", first.Single(suggestion => suggestion.VariantProductId == 3).ProposedLabel);

        var next = Variant([RejectedVariant(3, 1)], variants);
        var suggestion = next.Single(item => item.VariantProductId == 3);
        Assert.Equal((2L, "lavanda ətirli"), (suggestion.BaseProductId, suggestion.ProposedLabel));
    }

    [Fact]
    public void A_base_that_is_itself_a_live_variant_is_never_offered()
    {
        var suggestions = Variant(
            [ApprovedVariant(2, 1)],
            V(1, 1, "Sabun"), V(2, 2, "Sabun elano"), V(3, 3, "Sabun elano lavanda ətirli"));

        Assert.Equal(1L, Assert.Single(suggestions).BaseProductId);
        Assert.Equal(3L, suggestions[0].VariantProductId);
    }

    [Fact]
    public void A_product_that_is_already_a_variant_or_already_a_base_is_not_suggested_as_a_variant()
    {
        Assert.Empty(Variant([ApprovedVariant(2, 9)], V(1, 1, "Sabun elano"), V(2, 2, "Sabun elano lavanda ətirli"), V(9, 9, "Başqa")));
        Assert.Empty(Variant([ApprovedVariant(9, 2)], V(1, 1, "Sabun elano"), V(2, 2, "Sabun elano lavanda ətirli"), V(9, 9, "Başqa")));
    }

    [Fact]
    public void A_decided_link_is_not_suggested_again_until_it_is_undone()
    {
        Assert.Empty(Variant([RejectedVariant(2, 1)], V(1, 1, "Sabun elano"), V(2, 2, "Sabun elano lavanda ətirli")));
        Assert.Empty(Variant([ApprovedVariant(2, 1)], V(1, 1, "Sabun elano"), V(2, 2, "Sabun elano lavanda ətirli")));
        Assert.Single(Variant(NoDecisions, V(1, 1, "Sabun elano"), V(2, 2, "Sabun elano lavanda ətirli")));
    }

    [Fact]
    public void A_base_or_a_variant_with_no_order_line_takes_no_part()
    {
        Assert.Empty(Variant(V(1, 1, "Sabun elano", lines: 0), V(2, 2, "Sabun elano lavanda ətirli")));
        Assert.Empty(Variant(V(1, 1, "Sabun elano"), V(2, 2, "Sabun elano lavanda ətirli", lines: 0)));
    }

    [Fact]
    public void A_product_takes_part_when_any_of_its_variants_has_a_line()
    {
        var suggestion = Assert.Single(Variant(
            V(1, 1, "Sabun elano", lines: 0), V(3, 1, "Sabun elano", specification: "500", lines: 2),
            V(2, 2, "Sabun elano lavanda ətirli")));

        Assert.Equal(1L, suggestion.BaseProductId);
    }

    [Fact]
    public void A_variant_link_is_offered_only_in_the_direction_it_was_suggested()
    {
        var set = ProductMatchSuggestions.Compute([V(1, 1, "Sabun elano"), V(2, 2, "Sabun elano lavanda ətirli")], NoDecisions);

        Assert.NotNull(set.VariantLink(2, 1));
        Assert.Null(set.VariantLink(1, 2));
    }

    [Theory]
    [InlineData("sabun elano", "sabun elano lavanda", true)]
    [InlineData("sabun elano", "sabun elano,lavanda", true)]
    [InlineData("sabun elano", "sabun elano(500)", true)]
    [InlineData("sabun elano", "sabun elanox", false)]
    [InlineData("sabun elano", "sabun elano", false)]
    [InlineData("sabun elano", "sabun elano-", false)]
    [InlineData("sabun elano", "sabun el", false)]
    [InlineData("", "sabun", false)]
    public void Whole_word_prefix(string prefix, string text, bool expected)
    {
        Assert.Equal(expected, ProductMatchSuggestions.IsWholeWordPrefix(prefix, text));
    }

    // ---- both kinds ----------------------------------------------------------------------------------------

    public static TheoryData<string, string, string> DoNotMerge()
    {
        var data = new TheoryData<string, string, string>();
        foreach (var pair in DoNotMergePairs.All)
        {
            data.Add(pair.Rule, pair.First, pair.Second);
        }

        return data;
    }

    [Theory]
    [MemberData(nameof(DoNotMerge))]
    public void A_do_not_merge_pair_is_never_suggested_either_way_round(string rule, string first, string second)
    {
        Assert.True(DoNotMergePairs.Forbids(first, second), rule);
        Assert.True(DoNotMergePairs.Forbids(second.ToUpperInvariant(), $"  {first} "), rule);

        var set = ProductMatchSuggestions.Compute([V(1, 1, first), V(2, 2, second)], NoDecisions);
        Assert.Empty(set.SameItem);
        Assert.Empty(set.Variant);
    }

    [Fact]
    public void The_list_is_what_stops_the_pairs_the_variant_rule_would_otherwise_make()
    {
        // NM-02 and NM-10 are whole-word prefixes, so without the list the rule would propose them. A pair of the same
        // shape that is not on the list is proposed, so it is the list that stops these two.
        Assert.Single(Variant(V(1, 1, "Metlaq qara"), V(2, 2, "Metlaq qara rəng")));
        Assert.Single(Variant(V(1, 1, "Əl arabası böyük"), V(2, 2, "Əl arabası böyük qaynaqlı")));

        Assert.Empty(Variant(V(1, 1, "Metlaq Boz"), V(2, 2, "Metlaq boz rəng")));
        Assert.Empty(Variant(V(1, 1, "Əl arabası"), V(2, 2, "Əl arabası qaynaqlı")));
    }

    [Fact]
    public void Every_rule_of_the_business_list_whose_names_are_written_out_is_encoded()
    {
        Assert.Equal(
            ["NM-02", "NM-05", "NM-06", "NM-08", "NM-09", "NM-10", "NM-11", "NM-12", "NM-16"],
            DoNotMergePairs.All.Select(pair => pair.Rule));
    }

    [Fact]
    public void Computing_suggestions_changes_nothing_it_was_handed()
    {
        var variants = new List<MatchVariant> { V(1, 1, "Sabun elano"), V(2, 2, "Sabun elano lavanda ətirli"), V(3, 3, "Lampa 15 W"), V(4, 4, "Lampa 15W") };
        var decisions = new List<LiveMatchDecision>();
        var copy = variants.ToList();

        var first = ProductMatchSuggestions.Compute(variants, decisions);
        var second = ProductMatchSuggestions.Compute(variants, decisions);

        Assert.Equal(copy, variants);
        Assert.Empty(decisions);
        Assert.Equal(first.SameItem, second.SameItem);
        Assert.Equal(first.Variant, second.Variant);
    }

    // ---- helpers ---------------------------------------------------------------------------------------------

    private static MatchVariant V(
        long variantId,
        long productId,
        string name,
        string? specification = null,
        string? specificationUnit = null,
        string? descriptor = null,
        string? model = null,
        string? unit = "PCS",
        int lines = 1) =>
        new(variantId, productId, name, specification, specificationUnit, descriptor, model, unit, lines);

    private static List<SameItemSuggestion> SameItem(params MatchVariant[] variants) => SameItem(NoDecisions, variants);

    private static List<SameItemSuggestion> SameItem(LiveMatchDecision[] live, params MatchVariant[] variants) =>
        [.. ProductMatchSuggestions.Compute(variants, live).SameItem];

    private static List<VariantSuggestion> Variant(params MatchVariant[] variants) => Variant(NoDecisions, variants);

    private static List<VariantSuggestion> Variant(LiveMatchDecision[] live, params MatchVariant[] variants) =>
        [.. ProductMatchSuggestions.Compute(variants, live).Variant];

    /// <summary>Variant ids double as product ids in these cases, which is how <see cref="V"/> is called.</summary>
    private static LiveMatchDecision Approved(long source, long target) =>
        new(ProductMatchKind.SameItem, ProductMatchOutcome.Approved, source, target, source, target);

    private static LiveMatchDecision Rejected(long source, long target) =>
        new(ProductMatchKind.SameItem, ProductMatchOutcome.Rejected, source, target, source, target);

    private static LiveMatchDecision ApprovedVariant(long variant, long baseProduct) =>
        new(ProductMatchKind.Variant, ProductMatchOutcome.Approved, null, null, variant, baseProduct);

    private static LiveMatchDecision RejectedVariant(long variant, long baseProduct) =>
        new(ProductMatchKind.Variant, ProductMatchOutcome.Rejected, null, null, variant, baseProduct);
}
