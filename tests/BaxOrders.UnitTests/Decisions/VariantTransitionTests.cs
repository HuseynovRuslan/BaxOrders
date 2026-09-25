using System.Text.Json;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Common;
using BaxOrders.Application.Decisions;

namespace BaxOrders.UnitTests.Decisions;

/// <summary>
/// "Variant dəyişib" (Task 13c, owner decision 13.1a): an approved variant family whose month switched from one of its
/// products to another is one line of "Niyə dəyişib?", tested without a database.
/// </summary>
/// <remarks>
/// The first duty is the brief's hard rule — "Heç bir təsdiqdən sonra məbləğlər dəyişmir" — so every case checks that
/// the total, the categories' sum and each variant's own money are exactly what they are without the family. The
/// second is that nothing unapproved and no price state is ever hidden inside the line.
/// </remarks>
public sealed class VariantTransitionTests
{
    // The brief's family: "Sabun elano" and its variant "Sabun elano lavanda ətirli".
    private const long Sabun = 100;
    private const long SabunLavanda = 200;
    private const long SabunNana = 250;
    private const long Qab = 300;
    private const long QabLimon = 400;

    private static readonly VariantFamilyRole SabunBase = new(Sabun, Sabun, null);
    private static readonly VariantFamilyRole Lavanda = new(Sabun, SabunLavanda, "lavanda ətirli");
    private static readonly VariantFamilyRole Nana = new(Sabun, SabunNana, "nanə");
    private static readonly VariantFamilyRole QabBase = new(Qab, Qab, null);
    private static readonly VariantFamilyRole Limon = new(Qab, QabLimon, "limon");

    // ---- the brief's example -------------------------------------------------------------------------

    /// <summary>
    /// Acceptance 3: Heydər Əliyev, August "Sabun elano" 60 × 12.50, September "Sabun elano lavanda ətirli" 60 × 12.50.
    /// One transition of 0.00; "Yeni məhsullar" and "Bu ay yazılmayan" each 750.00 smaller.
    /// </summary>
    [Fact]
    public void The_briefs_example_is_one_transition_of_nothing_and_new_and_no_longer_ordered_each_lose_750()
    {
        VariantCauseInput[] inputs = [Material(1, Priced(60m, 12.50m), null), Material(2, null, Priced(60m, 12.50m))];

        var without = CauseDecomposition.Decompose(inputs);
        var with = CauseDecomposition.Decompose(inputs, Roles((1, SabunBase), (2, Lavanda)));

        Assert.Equal((750m, 1), Total(without, CauseCategory.NewOrders));
        Assert.Equal((-750m, 1), Total(without, CauseCategory.NoLongerOrdered));
        Assert.DoesNotContain(without.Categories, category => category.Category == CauseCategory.VariantChange);

        var transition = Assert.Single(with.Transitions);
        Assert.Equal(Sabun, transition.BaseProductId);
        Assert.Equal([1L], transition.FromVariantIds);
        Assert.Equal([2L], transition.ToVariantIds);
        Assert.Equal((0m, 750m, 750m), (transition.AmountImpact, transition.BaselineKnownAmount, transition.CurrentKnownAmount));

        Assert.Equal((0m, 0), Total(with, CauseCategory.NewOrders));
        Assert.Equal((0m, 0), Total(with, CauseCategory.NoLongerOrdered));
        Assert.Equal((0m, 2), Total(with, CauseCategory.VariantChange));

        // Two products still: each keeps its own money; only where it is filed changed.
        Assert.Equal(
            [(1L, CauseCategory.VariantChange, -750m), (2L, CauseCategory.VariantChange, 750m)],
            with.Variants.OrderBy(variant => variant.ProductVariantId)
                .Select(variant => (variant.ProductVariantId, variant.Category, variant.AmountImpact)));
        AssertSameMoney(without, with);
    }

    /// <summary>The category sits right after "Bu ay yazılmayan", and only in a result that has a transition.</summary>
    [Fact]
    public void Variant_change_is_listed_after_no_longer_ordered()
    {
        var with = CauseDecomposition.Decompose(
            [Material(1, Priced(60m, 12.50m), null), Material(2, null, Priced(60m, 12.50m))],
            Roles((1, SabunBase), (2, Lavanda)));

        Assert.Equal(
            [
                CauseCategory.NewOrders, CauseCategory.QuantityChange, CauseCategory.PriceChange,
                CauseCategory.NoLongerOrdered, CauseCategory.VariantChange, CauseCategory.Services,
                CauseCategory.InternalSupply, CauseCategory.UnattributedDueToMissingPrice,
            ],
            with.Categories.Select(category => category.Category));
        Assert.Equal(8, (int)CauseCategory.VariantChange);
    }

    /// <summary>Criterion 2: the variant ordered in larger quantity. The line carries the whole net, never a split.</summary>
    [Fact]
    public void A_transition_that_moved_money_carries_the_whole_net_and_is_not_split()
    {
        VariantCauseInput[] inputs = [Material(1, Priced(60m, 12.50m), null), Material(2, null, Priced(70m, 12.50m))];

        var with = CauseDecomposition.Decompose(inputs, Roles((1, SabunBase), (2, Lavanda)));

        var transition = Assert.Single(with.Transitions);
        Assert.Equal((125m, 750m, 875m), (transition.AmountImpact, transition.BaselineKnownAmount, transition.CurrentKnownAmount));
        Assert.Equal((125m, 2), Total(with, CauseCategory.VariantChange));
        Assert.Equal((0m, 0), Total(with, CauseCategory.QuantityChange));
        Assert.Equal((0m, 0), Total(with, CauseCategory.PriceChange));
        Assert.All(with.Variants, variant => Assert.Null(variant.QuantityImpact));
        AssertSameMoney(CauseDecomposition.Decompose(inputs), with);
    }

    // ---- the rule's edges ------------------------------------------------------------------------------

    /// <summary>A family that only gained a variant, or only lost one, has nothing to switch between.</summary>
    [Fact]
    public void Only_one_side_is_no_transition()
    {
        AssertNoTransition(
            [Material(1, Priced(60m, 12.50m), Priced(60m, 12.50m)), Material(2, null, Priced(60m, 12.50m))],
            Roles((1, SabunBase), (2, Lavanda)));
        AssertNoTransition(
            [Material(2, null, Priced(60m, 12.50m))],
            Roles((2, Lavanda)));
        AssertNoTransition(
            [Material(1, Priced(60m, 12.50m), null)],
            Roles((1, SabunBase)));
    }

    /// <summary>
    /// Two stored variants of one product — another unit, another specification — are not a transition: nobody approved
    /// them as variants of each other.
    /// </summary>
    [Fact]
    public void Two_variants_of_one_product_are_no_transition()
    {
        AssertNoTransition(
            [Material(2, Priced(60m, 12.50m), null), Material(3, null, Priced(6m, 125m))],
            Roles((2, Lavanda), (3, Lavanda)));
    }

    /// <summary>
    /// Task 2: a member owing a price stays where its missing price is visible. The line never hides a price state.
    /// </summary>
    [Fact]
    public void An_arriving_member_owing_a_price_is_no_transition_and_stays_unattributed()
    {
        VariantCauseInput[] inputs = [Material(1, Priced(60m, 12.50m), null), Material(2, null, Partly(0m, 12.50m, 60))];
        var roles = Roles((1, SabunBase), (2, Lavanda));

        var with = CauseDecomposition.Decompose(inputs, roles);

        Assert.Empty(with.Transitions);
        Assert.Equal(
            [(1L, CauseCategory.NoLongerOrdered), (2L, CauseCategory.UnattributedDueToMissingPrice)],
            with.Variants.OrderBy(variant => variant.ProductVariantId).Select(variant => (variant.ProductVariantId, variant.Category)));
        Assert.False(with.ExplanationIsComplete);
        Assert.Equal(1, with.UnattributedVariantCount);
        Assert.Equal(Json(CauseDecomposition.Decompose(inputs)), Json(with));
    }

    [Fact]
    public void A_member_from_the_company_s_own_store_or_a_service_is_no_transition()
    {
        AssertNoTransition(
            [Material(1, Priced(60m, 12.50m), null), Material(2, null, Internal(60m))],
            Roles((1, SabunBase), (2, Lavanda)));
        AssertNoTransition(
            [Material(1, Internal(60m), null), Material(2, null, Priced(60m, 12.50m))],
            Roles((1, SabunBase), (2, Lavanda)));
        AssertNoTransition(
            [Service(1, Priced(1m, 750m), null), Material(2, null, Priced(60m, 12.50m))],
            Roles((1, SabunBase), (2, Lavanda)));
    }

    [Fact]
    public void A_variant_in_no_family_is_no_transition()
    {
        AssertNoTransition(
            [Material(1, Priced(60m, 12.50m), null), Material(2, null, Priced(60m, 12.50m))],
            Roles((7, SabunBase), (8, Lavanda)));
        AssertNoTransition(
            [Material(1, Priced(60m, 12.50m), null), Material(2, null, Priced(60m, 12.50m))],
            Roles((1, SabunBase)));
    }

    /// <summary>A new variant of one family and a dropped variant of another are two different stories, not one.</summary>
    [Fact]
    public void Members_of_two_different_families_are_no_transition()
    {
        AssertNoTransition(
            [Material(1, Priced(60m, 12.50m), null), Material(4, null, Priced(10m, 3m))],
            Roles((1, SabunBase), (4, Limon)));
    }

    [Fact]
    public void Two_families_are_two_transitions_largest_first()
    {
        VariantCauseInput[] inputs =
        [
            Material(1, Priced(60m, 12.50m), null), Material(2, null, Priced(60m, 12.50m)),
            Material(3, Priced(10m, 3m), null), Material(4, null, Priced(20m, 3m)),
        ];

        var with = CauseDecomposition.Decompose(inputs, Roles((1, SabunBase), (2, Lavanda), (3, QabBase), (4, Limon)));

        Assert.Equal(
            [(Qab, 30m), (Sabun, 0m)],
            with.Transitions.Select(transition => (transition.BaseProductId, transition.AmountImpact)));
        Assert.Equal((30m, 4), Total(with, CauseCategory.VariantChange));
        AssertSameMoney(CauseDecomposition.Decompose(inputs), with);
    }

    /// <summary>"Bir sətirdə": two variants arriving in place of the base are still one line, with their sum.</summary>
    [Fact]
    public void Several_arriving_members_of_one_family_are_one_transition_with_their_sum()
    {
        VariantCauseInput[] inputs =
        [
            Material(1, Priced(60m, 12.50m), null),
            Material(2, null, Priced(30m, 12.50m)),
            Material(5, null, Priced(40m, 12.50m)),
        ];

        var with = CauseDecomposition.Decompose(inputs, Roles((1, SabunBase), (2, Lavanda), (5, Nana)));

        var transition = Assert.Single(with.Transitions);
        Assert.Equal([1L], transition.FromVariantIds);
        Assert.Equal([2L, 5L], transition.ToVariantIds);
        Assert.Equal((125m, 750m, 875m), (transition.AmountImpact, transition.BaselineKnownAmount, transition.CurrentKnownAmount));
        Assert.Equal((125m, 3), Total(with, CauseCategory.VariantChange));
    }

    /// <summary>
    /// A variant switch between two variants of the base, with the base itself ordered steadily: the base is no member
    /// — its own quantity change stays its own — and the two variants are one line.
    /// </summary>
    [Fact]
    public void Two_variants_switching_under_a_base_ordered_steadily_are_one_transition_without_the_base()
    {
        VariantCauseInput[] inputs =
        [
            Material(1, Priced(10m, 12.50m), Priced(12m, 12.50m)),
            Material(2, Priced(60m, 12.50m), null),
            Material(5, null, Priced(60m, 12.50m)),
        ];

        var with = CauseDecomposition.Decompose(inputs, Roles((1, SabunBase), (2, Lavanda), (5, Nana)));

        var transition = Assert.Single(with.Transitions);
        Assert.Equal([2L], transition.FromVariantIds);
        Assert.Equal([5L], transition.ToVariantIds);
        Assert.Equal(CauseCategory.QuantityChange, with.Variants.Single(variant => variant.ProductVariantId == 1).Category);
        Assert.Equal((25m, 1), Total(with, CauseCategory.QuantityChange));
    }

    /// <summary>
    /// 13b report §7.1: the link was approved on a spelling that was then folded away. Spellings fold first, then the
    /// family is looked up through the folded product — end to end, from the approved rows to the transition.
    /// </summary>
    [Fact]
    public void A_spelling_folded_into_a_variant_with_no_link_of_its_own_still_carries_the_folded_away_link()
    {
        const long sabunVariant = 1, lavandaVariant = 2, lavandaOtherSpellingVariant = 3;
        const long lavandaOtherSpelling = 210;

        var spelling = SpellingFold.Of([(lavandaVariant, lavandaOtherSpellingVariant)]);
        var matches = new ApprovedMatches(
            spelling,
            VariantFamilies.Of(
                [new VariantLink(SabunLavanda, Sabun, "lavanda ətirli", "Sabun elano")],
                [(lavandaVariant, SabunLavanda, lavandaOtherSpelling)]));

        // September's line is on the folded-away spelling; analytics sees the kept one.
        var roles = matches.RolesOf(
            [KeyValuePair.Create(sabunVariant, Sabun), KeyValuePair.Create(lavandaOtherSpellingVariant, lavandaOtherSpelling)]);

        var with = CauseDecomposition.Decompose(
            [Material(sabunVariant, Priced(60m, 12.50m), null), Material(lavandaOtherSpellingVariant, null, Priced(60m, 12.50m))],
            roles);

        var transition = Assert.Single(with.Transitions);
        Assert.Equal([sabunVariant], transition.FromVariantIds);
        Assert.Equal([lavandaOtherSpellingVariant], transition.ToVariantIds);
        Assert.Equal("lavanda ətirli", roles[lavandaOtherSpellingVariant].Label);
    }

    /// <summary>Two spellings of one item approved into two families: no family, so no transition.</summary>
    [Fact]
    public void Roles_in_two_different_families_give_no_family_and_no_transition()
    {
        const long sabunVariant = 1, lavandaVariant = 2, lavandaOtherSpellingVariant = 3;
        const long lavandaOtherSpelling = 210;

        var matches = new ApprovedMatches(
            SpellingFold.Of([(lavandaVariant, lavandaOtherSpellingVariant)]),
            VariantFamilies.Of(
                [
                    new VariantLink(SabunLavanda, Sabun, "lavanda ətirli", "Sabun elano"),
                    new VariantLink(lavandaOtherSpelling, Qab, "lavanda", "Qab"),
                ],
                [(lavandaVariant, SabunLavanda, lavandaOtherSpelling)]));

        var roles = matches.RolesOf(
            [KeyValuePair.Create(sabunVariant, Sabun), KeyValuePair.Create(lavandaOtherSpellingVariant, lavandaOtherSpelling)]);

        Assert.False(roles.ContainsKey(lavandaOtherSpellingVariant));
        AssertNoTransition(
            [Material(sabunVariant, Priced(60m, 12.50m), null), Material(lavandaOtherSpellingVariant, null, Priced(60m, 12.50m))],
            roles);
    }

    // ---- without a family, nothing changes ---------------------------------------------------------------

    /// <summary>
    /// Null roles and empty roles are the decomposition as it was before variant families existed: the seven
    /// categories in their old order, no "Variant dəyişib", no transition — the very same result.
    /// </summary>
    [Fact]
    public void Without_roles_the_result_is_the_one_before_families_existed()
    {
        VariantCauseInput[] inputs =
        [
            Material(1, Priced(60m, 12.50m), null),
            Material(2, null, Priced(60m, 12.50m)),
            Material(3, Priced(20m, 3m), Priced(25m, 3.20m)),
            Service(6, Priced(1m, 300m), Priced(1m, 250m)),
            Material(7, Priced(4m, 2m), Partly(3m, 2m, 1)),
            Material(8, Internal(4m), Internal(6m)),
        ];

        var plain = CauseDecomposition.Decompose(inputs);

        Assert.Equal(Json(plain), Json(CauseDecomposition.Decompose(inputs, null)));
        Assert.Equal(Json(plain), Json(CauseDecomposition.Decompose(inputs, new Dictionary<long, VariantFamilyRole>())));
        Assert.Empty(plain.Transitions);
        Assert.Equal(
            [
                CauseCategory.NewOrders, CauseCategory.QuantityChange, CauseCategory.PriceChange,
                CauseCategory.NoLongerOrdered, CauseCategory.Services, CauseCategory.InternalSupply,
                CauseCategory.UnattributedDueToMissingPrice,
            ],
            plain.Categories.Select(category => category.Category));

        var cents = CauseDecomposition.ToCents(plain, Money.RoundCents(plain.TotalAmountImpact));
        Assert.Empty(cents.Transitions);
        Assert.DoesNotContain(cents.Categories, category => category.Category == CauseCategory.VariantChange);
    }

    /// <summary>Roles that make no transition leave the result exactly as it is without them.</summary>
    [Fact]
    public void Roles_that_make_no_transition_change_nothing()
    {
        VariantCauseInput[] inputs = [Material(1, Priced(60m, 12.50m), Priced(62m, 12.50m)), Material(2, null, Priced(60m, 12.50m))];

        Assert.Equal(
            Json(CauseDecomposition.Decompose(inputs)),
            Json(CauseDecomposition.Decompose(inputs, Roles((1, SabunBase), (2, Lavanda)))));
    }

    // ---- no amount moves ------------------------------------------------------------------------------

    /// <summary>
    /// Acceptance 7 as a property, over random months and random families: the total, the categories' sum, every
    /// variant's own money and every count that says whether the explanation is complete are the same with the roles
    /// and without them — before the cents are allocated and after.
    /// </summary>
    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(5)]
    [InlineData(8)]
    [InlineData(13)]
    [InlineData(21)]
    [InlineData(34)]
    public void No_amount_moves_whatever_the_families(int seed)
    {
        var random = new Random(seed);
        var transitions = 0;

        for (var round = 0; round < 50; round++)
        {
            var inputs = RandomInputs(random);
            var roles = RandomRoles(random, inputs);

            var without = CauseDecomposition.Decompose(inputs);
            var with = CauseDecomposition.Decompose(inputs, roles);
            transitions += with.Transitions.Count;

            AssertSameMoney(without, with);
            Assert.Equal(with.TotalAmountImpact, with.Categories.Sum(category => category.Amount));
            Assert.Equal(
                with.Transitions.Sum(transition => transition.AmountImpact),
                with.Categories.SingleOrDefault(category => category.Category == CauseCategory.VariantChange)?.Amount ?? 0m);
            Assert.Equal(with.Transitions.Count > 0, with.Categories.Any(category => category.Category == CauseCategory.VariantChange));

            // Every member is in exactly one transition, and it is filed under the line and nowhere else.
            var members = with.Transitions.SelectMany(transition => transition.FromVariantIds.Concat(transition.ToVariantIds)).ToList();
            Assert.Equal(members.Count, members.Distinct().Count());
            Assert.Equal(
                members.Order(),
                with.Variants.Where(variant => variant.Category == CauseCategory.VariantChange).Select(variant => variant.ProductVariantId).Order());

            // And to the cent, the parts still add up to the difference the screen prints.
            var delta = Money.RoundCents(without.TotalAmountImpact);
            var cents = CauseDecomposition.ToCents(with, delta);
            Assert.Equal(delta, cents.Categories.Sum(category => category.Amount));
            Assert.Equal(delta, cents.TotalAmountImpact);
            Assert.Equal(
                CauseDecomposition.ToCents(without, delta).Variants.Select(variant => (variant.ProductVariantId, variant.AmountImpact)),
                cents.Variants.Select(variant => (variant.ProductVariantId, variant.AmountImpact)));
        }

        // The property is only worth something if the families actually made transitions.
        Assert.True(transitions > 0);
    }

    /// <summary>
    /// A transition's money is allocated like any category: the parts add up to the difference in cents, and the line
    /// itself is rounded on its own, as a driver is.
    /// </summary>
    [Fact]
    public void To_the_cent_a_transition_still_adds_up_to_the_difference()
    {
        // Fractions of a qəpik on every side.
        VariantCauseInput[] inputs =
        [
            Material(1, Priced(10m, 3.3333m), null),
            Material(2, null, Priced(7m, 4.7777m)),
            Material(3, Priced(3m, 1.1111m), Priced(4m, 1.1111m)),
        ];

        var with = CauseDecomposition.Decompose(inputs, Roles((1, SabunBase), (2, Lavanda)));
        var delta = Money.RoundCents(with.TotalAmountImpact);
        var cents = CauseDecomposition.ToCents(with, delta);

        Assert.Equal(delta, cents.Categories.Sum(category => category.Amount));
        var transition = Assert.Single(cents.Transitions);
        Assert.Equal(Money.RoundCents(with.Transitions[0].AmountImpact), transition.AmountImpact);
        Assert.Equal(Money.RoundCents(transition.AmountImpact), transition.AmountImpact);
    }

    /// <summary>The one comparison both screens call carries the roles through to its explanation, and only there.</summary>
    [Fact]
    public void The_shared_comparison_passes_the_roles_to_the_explanation_and_its_totals_never_see_them()
    {
        var snapshots = new Dictionary<long, Dictionary<long, VariantPeriodSnapshot>>
        {
            [1] = new() { [1] = Snapshot(1, 60m, 12.50m) },
            [2] = new() { [2] = Snapshot(2, 70m, 12.50m) },
        };
        var kinds = new Dictionary<long, AnalyticsKind>();

        var without = PeriodComparison.Of(snapshots[2], PeriodComparison.GroupBaseline([1], snapshots), 1, kinds);
        var with = PeriodComparison.Of(snapshots[2], PeriodComparison.GroupBaseline([1], snapshots), 1, kinds, Roles((1, SabunBase), (2, Lavanda)));

        Assert.Equal(
            (without.CurrentKnownAmount, without.BaselineKnownAmount, without.KnownAmountDelta, without.KnownAmountPercentChange, without.CurrentTotals, without.BaselineTotals),
            (with.CurrentKnownAmount, with.BaselineKnownAmount, with.KnownAmountDelta, with.KnownAmountPercentChange, with.CurrentTotals, with.BaselineTotals));
        Assert.Empty(without.Decomposition!.Transitions);
        Assert.Equal(125m, Assert.Single(with.Decomposition!.Transitions).AmountImpact);
        Assert.Equal((125m, 2), Total(with.Decomposition, CauseCategory.VariantChange));
    }

    // ---- helpers -------------------------------------------------------------------------------------

    private static void AssertNoTransition(VariantCauseInput[] inputs, IReadOnlyDictionary<long, VariantFamilyRole> roles)
    {
        var with = CauseDecomposition.Decompose(inputs, roles);

        Assert.Empty(with.Transitions);
        Assert.DoesNotContain(with.Categories, category => category.Category == CauseCategory.VariantChange);
        Assert.Equal(Json(CauseDecomposition.Decompose(inputs)), Json(with));
    }

    /// <summary>Everything that must not move: the money, per variant and in total, and whether the reason is known.</summary>
    private static void AssertSameMoney(CauseDecompositionResult without, CauseDecompositionResult with)
    {
        Assert.Equal(without.TotalAmountImpact, with.TotalAmountImpact);
        Assert.Equal(without.Categories.Sum(category => category.Amount), with.Categories.Sum(category => category.Amount));
        Assert.Equal(
            without.Variants.Select(variant => (variant.ProductVariantId, variant.AmountImpact, variant.CurrentKnownAmount, variant.BaselineKnownAmount, variant.CurrentQuantity, variant.BaselineQuantity, variant.MissingRequiredPriceItemCount, variant.PriceNotRequiredItemCount)),
            with.Variants.Select(variant => (variant.ProductVariantId, variant.AmountImpact, variant.CurrentKnownAmount, variant.BaselineKnownAmount, variant.CurrentQuantity, variant.BaselineQuantity, variant.MissingRequiredPriceItemCount, variant.PriceNotRequiredItemCount)));
        Assert.Equal(
            (without.ExplanationIsComplete, without.UnattributedVariantCount, without.InternalSupplyVariantCount, without.SupplyChangedVariantCount),
            (with.ExplanationIsComplete, with.UnattributedVariantCount, with.InternalSupplyVariantCount, with.SupplyChangedVariantCount));

        // Only "new", "no longer ordered" and the line itself may differ.
        foreach (var category in without.Categories.Where(category =>
            category.Category is not (CauseCategory.NewOrders or CauseCategory.NoLongerOrdered)))
        {
            Assert.Equal(category, with.Categories.Single(item => item.Category == category.Category));
        }
    }

    private static VariantCauseInput[] RandomInputs(Random random)
    {
        var inputs = new List<VariantCauseInput>();
        var count = random.Next(1, 14);
        for (var id = 1; id <= count; id++)
        {
            var kind = random.Next(10) == 0 ? AnalyticsKind.AmountOrientedService : AnalyticsKind.QuantityComparable;
            inputs.Add(new VariantCauseInput(id, kind, RandomSide(random), RandomSide(random)));
        }

        return [.. inputs];
    }

    /// <summary>
    /// Nothing, priced, partly owed or from the company's own store — at the scales the lines are stored at (quantity
    /// to three decimals, unit price to four), so the prices carry fractions of a qəpik as real ones do.
    /// </summary>
    private static VariantPeriodSnapshot? RandomSide(Random random)
    {
        var quantity = random.Next(1, 90) + (random.Next(1000) / 1000m);
        var price = random.Next(1, 5_000_000) / 10_000m;

        return random.Next(7) switch
        {
            0 or 1 or 2 => null,
            3 => Partly(quantity, price, 1),
            4 => Internal(quantity),
            _ => Priced(quantity, price),
        };
    }

    /// <summary>Two families of a few products each, and some variants left out of every family.</summary>
    private static Dictionary<long, VariantFamilyRole> RandomRoles(Random random, VariantCauseInput[] inputs)
    {
        var roles = new Dictionary<long, VariantFamilyRole>();
        foreach (var input in inputs)
        {
            if (random.Next(4) == 0)
            {
                continue;
            }

            var family = random.Next(2) == 0 ? Sabun : Qab;
            var product = random.Next(3) switch
            {
                0 => family,
                1 => family + 1,
                _ => family + 2,
            };

            roles[input.ProductVariantId] = new VariantFamilyRole(family, product, product == family ? null : $"variant {product}");
        }

        return roles;
    }

    private static IReadOnlyDictionary<long, VariantFamilyRole> Roles(params (long VariantId, VariantFamilyRole Role)[] roles) =>
        roles.ToDictionary(entry => entry.VariantId, entry => entry.Role);

    private static (decimal Amount, int Count) Total(CauseDecompositionResult result, CauseCategory category)
    {
        var total = result.Categories.Single(item => item.Category == category);
        return (total.Amount, total.VariantCount);
    }

    private static string Json(object value) => JsonSerializer.Serialize(value);

    private static VariantCauseInput Material(long variantId, VariantPeriodSnapshot? baseline, VariantPeriodSnapshot? current) =>
        new(variantId, AnalyticsKind.QuantityComparable, current, baseline);

    private static VariantCauseInput Service(long variantId, VariantPeriodSnapshot? baseline, VariantPeriodSnapshot? current) =>
        new(variantId, AnalyticsKind.AmountOrientedService, current, baseline);

    private static VariantPeriodSnapshot Priced(decimal quantity, decimal unitPrice) =>
        new(1, quantity, 1, 1, 0, 0, quantity, quantity * unitPrice);

    private static VariantPeriodSnapshot Snapshot(long variantId, decimal quantity, decimal unitPrice) =>
        new(variantId, quantity, 1, 1, 0, 0, quantity, quantity * unitPrice);

    /// <summary>Some lines priced, the rest waiting for a price somebody owes.</summary>
    private static VariantPeriodSnapshot Partly(decimal pricedQuantity, decimal unitPrice, int unpriced) =>
        new(1, pricedQuantity + unpriced, 1 + unpriced, pricedQuantity > 0 ? 1 : 0, unpriced, 0, pricedQuantity, pricedQuantity * unitPrice);

    /// <summary>Issued from the company's own store: quantity, no price, and nothing owed.</summary>
    private static VariantPeriodSnapshot Internal(decimal quantity) =>
        new(1, quantity, 1, 0, 0, 1, 0m, 0m);
}
