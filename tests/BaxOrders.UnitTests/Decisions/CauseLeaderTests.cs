using BaxOrders.Application.Analytics;
using BaxOrders.Application.Common;
using BaxOrders.Application.Decisions;

namespace BaxOrders.UnitTests.Decisions;

/// <summary>
/// The product a dashboard card names under its "Əsas səbəb", and the share it prints (owner decisions 7.1, 7.1a).
/// </summary>
/// <remarks>
/// The share is the named product's effect over the sum of every product effect pointing the same way — every
/// cause, not only the primary one. What is pinned here is that the product comes from inside the cause, that the
/// denominator is every product moving that way and nothing moving the other way, and that the share therefore
/// never passes 100%.
/// </remarks>
public sealed class CauseLeaderTests
{
    // ---- the owner's two examples --------------------------------------------------------------------

    /// <summary>
    /// Heydər Əliyev, Keçən ay: new products of 29 691,52 ₼, one of them a 21 900,00 ₼ tractor, beside a price
    /// rise and two falls, for +23 852,70 ₼ in all. The share cannot be more than 21 900 / 29 691,52.
    /// </summary>
    [Fact]
    public void A_month_of_new_products_names_the_tractor_and_its_share_of_every_rise()
    {
        var result = ToCents(
            Material(1, null, Priced(1m, 21_900m)),               // the tractor, new
            Material(2, null, Priced(10m, 500m)),                 // new, 5 000,00
            Material(3, null, Priced(2m, 1_395.76m)),             // new, 2 791,52
            Material(4, Priced(10m, 100m), Priced(10m, 110m)),    // a price rise, +100,00
            Material(5, Priced(1m, 5_629.62m), null),             // no longer ordered, −5 629,62
            Material(6, Priced(20m, 30.92m), Priced(10m, 30.92m)) // a quantity fall, −309,20
        );

        Assert.Equal(23_852.70m, result.TotalAmountImpact);
        Assert.Equal(29_691.52m, Amount(result, CauseCategory.NewOrders));
        Assert.Equal(CauseCategory.NewOrders, Primary(result));

        var leader = CauseLeader.Of(result, CauseCategory.NewOrders, Amount(result, CauseCategory.NewOrders))!;

        Assert.Equal(1, leader.ProductVariantId);
        Assert.Equal(21_900m, leader.Amount);
        // Every rise, the price rise included — never the new products alone.
        Assert.Equal(29_791.52m, leader.SameDirectionAmount);
        Assert.True(leader.SameDirectionAmount >= 29_691.52m);
        Assert.True(leader.Amount / leader.SameDirectionAmount <= 0.7376m);
    }

    /// <summary>
    /// Fəvvarələr meydanı, Keçən ay: products not ordered this month for −8 093,70 ₼, the largest of them the
    /// summer shoes at −1 988,00 ₼. The share cannot be more than 1 988 / 8 093,70.
    /// </summary>
    [Fact]
    public void A_month_that_stopped_ordering_names_the_shoes_and_their_share_of_every_fall()
    {
        var result = ToCents(
            Material(1, Priced(71m, 28m), null),                  // Yay ayaqqabısı, 71 → 0, −1 988,00
            Material(2, Priced(3m, 500m), null),                  // −1 500,00
            Material(3, Priced(3m, 500m), null),                  // −1 500,00
            Material(4, Priced(3m, 500m), null),                  // −1 500,00
            Material(5, Priced(1m, 1_605.70m), null),             // −1 605,70
            Material(6, Priced(20m, 50m), Priced(10m, 50m)),      // a quantity fall, −500,00
            Material(7, null, Priced(1m, 6_009.25m))              // new, +6 009,25
        );

        Assert.Equal(-2_584.45m, result.TotalAmountImpact);
        Assert.Equal(-8_093.70m, Amount(result, CauseCategory.NoLongerOrdered));
        Assert.Equal(CauseCategory.NoLongerOrdered, Primary(result));

        var leader = CauseLeader.Of(result, CauseCategory.NoLongerOrdered, Amount(result, CauseCategory.NoLongerOrdered))!;

        Assert.Equal(1, leader.ProductVariantId);
        Assert.Equal(-1_988m, leader.Amount);
        Assert.Equal(-8_593.70m, leader.SameDirectionAmount);
        Assert.True(leader.SameDirectionAmount <= -8_093.70m);
        Assert.True(leader.Amount / leader.SameDirectionAmount <= 0.2457m);
    }

    // ---- which product ---------------------------------------------------------------------------------

    /// <summary>
    /// A bigger mover filed under another cause is that cause's reason, not this one's — but it moved money the
    /// same way, so it is part of what the share is a share of. The price category here nets to less than its
    /// own largest product, which is exactly why a category total cannot be the denominator.
    /// </summary>
    [Fact]
    public void A_larger_product_under_another_cause_is_not_named_but_is_counted()
    {
        var result = Of(
            Driver(1, CauseCategory.NewOrders, 1_000m),
            Driver(2, CauseCategory.PriceChange, 3_000m),
            Driver(3, CauseCategory.PriceChange, -2_500m));

        var leader = CauseLeader.Of(result, CauseCategory.NewOrders, 1_000m)!;

        Assert.Equal(1, leader.ProductVariantId);
        Assert.Equal(1_000m, leader.Amount);
        Assert.Equal(4_000m, leader.SameDirectionAmount);
    }

    /// <summary>A product in the primary cause moving the other way does not explain this movement at all.</summary>
    [Fact]
    public void A_product_in_the_cause_moving_the_other_way_is_neither_named_nor_counted()
    {
        var result = Of(
            Driver(1, CauseCategory.QuantityChange, -700m),
            Driver(2, CauseCategory.QuantityChange, 600m));

        var leader = CauseLeader.Of(result, CauseCategory.QuantityChange, 500m)!;

        Assert.Equal(2, leader.ProductVariantId);
        Assert.Equal(600m, leader.Amount);
        Assert.Equal(600m, leader.SameDirectionAmount);
    }

    /// <summary>
    /// "Qiymət yoxdur" and "Daxili təminat" are money that moved like any other: in the denominator when they
    /// point the same way, out of it when they do not.
    /// </summary>
    [Fact]
    public void Missing_price_and_internal_supply_moving_the_same_way_are_counted()
    {
        var result = Of(
            Driver(1, CauseCategory.NewOrders, 1_000m),
            Driver(2, CauseCategory.UnattributedDueToMissingPrice, 300m),
            Driver(3, CauseCategory.InternalSupply, 200m),
            Driver(4, CauseCategory.InternalSupply, -50m));

        var leader = CauseLeader.Of(result, CauseCategory.NewOrders, 1_000m)!;

        Assert.Equal(1_500m, leader.SameDirectionAmount);
    }

    /// <summary>Two products of the same size: the lower id, the order the order page's list is in.</summary>
    [Fact]
    public void On_a_tie_the_lower_variant_is_named()
    {
        // Handed over higher id first, so the answer is the rule's rather than the input's order.
        var result = Of(
            Driver(7, CauseCategory.NewOrders, 500m),
            Driver(3, CauseCategory.NewOrders, 500m));

        var leader = CauseLeader.Of(result, CauseCategory.NewOrders, 1_000m)!;

        Assert.Equal(3, leader.ProductVariantId);
        Assert.Equal(1_000m, leader.SameDirectionAmount);
    }

    [Fact]
    public void The_only_product_moving_that_way_is_all_of_it()
    {
        var result = Of(
            Driver(1, CauseCategory.NoLongerOrdered, -883.20m),
            Driver(2, CauseCategory.NewOrders, 400m));

        var leader = CauseLeader.Of(result, CauseCategory.NoLongerOrdered, -883.20m)!;

        Assert.Equal(-883.20m, leader.Amount);
        Assert.Equal(leader.Amount, leader.SameDirectionAmount);
    }

    // ---- never more than all of it ---------------------------------------------------------------------

    /// <summary>
    /// Whatever cause is primary and whichever way it points, the product and the denominator share a sign and the
    /// product is never the larger — so the share printed from them never passes 100%.
    /// </summary>
    [Fact]
    public void The_share_never_passes_one_hundred_percent()
    {
        var result = Of(
            Driver(1, CauseCategory.NewOrders, 900m),
            Driver(2, CauseCategory.NewOrders, 100m),
            Driver(3, CauseCategory.QuantityChange, 1_200m),
            Driver(4, CauseCategory.QuantityChange, -1_300m),
            Driver(5, CauseCategory.PriceChange, 250m),
            Driver(6, CauseCategory.NoLongerOrdered, -2_000m),
            Driver(7, CauseCategory.Services, -40m),
            Driver(8, CauseCategory.UnattributedDueToMissingPrice, 75m),
            Driver(9, CauseCategory.InternalSupply, -60m));

        foreach (var category in CauseDecomposition.Order)
        {
            foreach (var amount in new[] { 1m, -1m })
            {
                if (CauseLeader.Of(result, category, amount) is not { } leader)
                {
                    continue;
                }

                Assert.Equal(Math.Sign(leader.Amount), Math.Sign(leader.SameDirectionAmount));
                Assert.True(Math.Abs(leader.Amount) <= Math.Abs(leader.SameDirectionAmount));
            }
        }
    }

    // ---- when there is nothing to name -----------------------------------------------------------------

    /// <summary>
    /// Possible only for the two split categories: the cause points one way and every product filed under it
    /// points the other. No product from elsewhere is borrowed to fill the line.
    /// </summary>
    [Fact]
    public void With_no_product_in_the_cause_moving_its_way_nothing_is_named()
    {
        var result = Of(
            Driver(1, CauseCategory.QuantityChange, 100m),
            Driver(2, CauseCategory.PriceChange, -50m));

        Assert.Null(CauseLeader.Of(result, CauseCategory.PriceChange, 80m));
    }

    [Fact]
    public void Without_a_decomposition_or_a_primary_cause_nothing_is_named()
    {
        var result = Of(Driver(1, CauseCategory.NewOrders, 100m));

        Assert.Null(CauseLeader.Of(null, CauseCategory.NewOrders, 100m));
        Assert.Null(CauseLeader.Of(result, null, 100m));
        Assert.Null(CauseLeader.Of(result, CauseCategory.NewOrders, null));
        Assert.Null(CauseLeader.Of(result, CauseCategory.NewOrders, 0m));
    }

    // ---- an approved variant transition (13.1a) ----------------------------------------------------------

    /// <summary>
    /// "Sabun elano" 60 × 12,50 in August, "Sabun elano lavanda ətirli" 70 × 12,50 in September, approved as its
    /// variant, and a price rise elsewhere. The transition is one product effect: its net +125,00, never its +875,00
    /// member, and its members are not counted again in the denominator.
    /// </summary>
    [Fact]
    public void A_transition_leads_its_cause_as_one_effect_by_its_net()
    {
        var result = ToCentsWith(
            Roles((1, SabunBase), (2, Lavanda)),
            Material(1, Priced(60m, 12.50m), null),
            Material(2, null, Priced(70m, 12.50m)),
            Material(3, Priced(10m, 5m), Priced(10m, 6m)));

        Assert.Equal(CauseCategory.VariantChange, Primary(result));

        var leader = CauseLeader.Of(result, CauseCategory.VariantChange, Amount(result, CauseCategory.VariantChange))!;

        Assert.Equal(125m, leader.Amount);
        Assert.Equal(125m + 10m, leader.SameDirectionAmount);
        Assert.Equal(2, leader.ProductVariantId);
        Assert.NotNull(leader.Transition);
        Assert.Equal(Sabun, leader.Transition!.BaseProductId);
    }

    /// <summary>
    /// Another cause is primary. The transition is still money moving the same way, so it is in the denominator —
    /// once, by its net — and never a candidate for a cause it is not filed under.
    /// </summary>
    [Fact]
    public void A_transition_is_counted_once_by_its_net_when_another_cause_is_primary()
    {
        var result = ToCentsWith(
            Roles((1, SabunBase), (2, Lavanda)),
            Material(1, Priced(60m, 12.50m), null),
            Material(2, null, Priced(70m, 12.50m)),
            Material(3, null, Priced(1m, 500m)));

        Assert.Equal(CauseCategory.NewOrders, Primary(result));

        var leader = CauseLeader.Of(result, CauseCategory.NewOrders, Amount(result, CauseCategory.NewOrders))!;

        Assert.Equal((3L, 500m), (leader.ProductVariantId, leader.Amount));
        // 500 + 125 — not 500 + 875, which is what counting the arriving member on its own would give.
        Assert.Equal(625m, leader.SameDirectionAmount);
        Assert.Null(leader.Transition);

        // And a falling cause is not given the transition's leaving member either.
        Assert.Null(CauseLeader.Of(result, CauseCategory.NoLongerOrdered, -1m));
    }

    /// <summary>Roles that make no transition: the leader is exactly the one without them.</summary>
    [Fact]
    public void With_no_transition_the_leader_is_unchanged()
    {
        VariantCauseInput[] inputs =
        [
            Material(1, Priced(60m, 12.50m), Priced(60m, 12.50m)),
            Material(2, null, Priced(70m, 12.50m)),
            Material(3, null, Priced(1m, 500m)),
        ];

        var without = ToCents(inputs);
        var with = ToCentsWith(Roles((1, SabunBase), (2, Lavanda)), inputs);

        Assert.Empty(with.Transitions);
        Assert.Equal(
            CauseLeader.Of(without, CauseCategory.NewOrders, Amount(without, CauseCategory.NewOrders)),
            CauseLeader.Of(with, CauseCategory.NewOrders, Amount(with, CauseCategory.NewOrders)));
    }

    // ---- helpers -------------------------------------------------------------------------------------

    private const long Sabun = 100;
    private static readonly VariantFamilyRole SabunBase = new(Sabun, Sabun, null);
    private static readonly VariantFamilyRole Lavanda = new(Sabun, 200, "lavanda ətirli");

    private static Dictionary<long, VariantFamilyRole> Roles(params (long VariantId, VariantFamilyRole Role)[] roles) =>
        roles.ToDictionary(entry => entry.VariantId, entry => entry.Role);

    /// <summary>Decomposed and allocated to the cent exactly as the dashboard and the order page both do.</summary>
    private static CauseDecompositionResult ToCents(params VariantCauseInput[] inputs)
    {
        var result = CauseDecomposition.Decompose(inputs);
        return CauseDecomposition.ToCents(result, Money.RoundCents(result.TotalAmountImpact));
    }

    /// <summary>The same, with the variant families both screens read.</summary>
    private static CauseDecompositionResult ToCentsWith(
        IReadOnlyDictionary<long, VariantFamilyRole> roles, params VariantCauseInput[] inputs)
    {
        var result = CauseDecomposition.Decompose(inputs, roles);
        return CauseDecomposition.ToCents(result, Money.RoundCents(result.TotalAmountImpact));
    }

    /// <summary>The dashboard's own choice: largest money in either direction, ties by the category's value.</summary>
    private static CauseCategory Primary(CauseDecompositionResult result) =>
        result.Categories
            .Where(category => category.Amount != 0m)
            .OrderByDescending(category => Math.Abs(category.Amount))
            .ThenBy(category => category.Category)
            .First()
            .Category;

    private static VariantCauseInput Material(long variantId, VariantPeriodSnapshot? baseline, VariantPeriodSnapshot? current) =>
        new(variantId, AnalyticsKind.QuantityComparable, current, baseline);

    private static VariantPeriodSnapshot Priced(decimal quantity, decimal unitPrice) =>
        new(1, quantity, 1, 1, 0, 0, quantity, quantity * unitPrice);

    private static decimal Amount(CauseDecompositionResult result, CauseCategory category) =>
        result.Categories.Single(total => total.Category == category).Amount;

    /// <summary>One product's line in the order page's list: what it is filed under and what it moved.</summary>
    private static VariantCauseResult Driver(long variantId, CauseCategory category, decimal amountImpact) =>
        new(variantId, AnalyticsKind.QuantityComparable, category, amountImpact,
            null, null, null, null, null, null, null, null, null, null, 1, 1, 0, 0, true, false);

    private static CauseDecompositionResult Of(params VariantCauseResult[] variants) =>
        new([], variants, variants.Sum(variant => variant.AmountImpact), true, 0, 0, 0);
}
