using BaxOrders.Application.Analytics;

namespace BaxOrders.UnitTests.Analytics;

/// <summary>
/// The rule that makes an approved spelling match one product in every analytics read (Task 13b), tested without a
/// database. Its first duty is the one the brief makes a hard rule — "Heç bir təsdiqdən sonra məbləğlər dəyişmir" — so
/// the per-request sum of every field is checked over every field.
/// </summary>
public sealed class SpellingFoldTests
{
    private const long LampaWithSpace = 11;
    private const long Lampa = 12;
    private const long Other = 30;

    [Fact]
    public void With_no_match_every_id_is_its_own_and_the_snapshots_come_back_as_they_were()
    {
        var input = Requests((1, [Snapshot(LampaWithSpace, 10m, 2m), Snapshot(Lampa, 12m, 2m)]));

        var fold = SpellingFold.Of([]);

        Assert.True(fold.IsEmpty);
        Assert.Same(SpellingFold.None, fold);
        Assert.Same(input, fold.Apply(input));
        Assert.Equal(LampaWithSpace, fold.CanonicalOf(LampaWithSpace));
        Assert.Equal([Lampa], fold.MembersOf(Lampa));
    }

    [Fact]
    public void Two_members_in_one_request_are_added_up_field_by_field_under_the_kept_id()
    {
        var fold = SpellingFold.Of([(LampaWithSpace, Lampa)]);
        var input = Requests((1,
        [
            new VariantPeriodSnapshot(LampaWithSpace, 10m, 2, 1, 1, 0, 4m, 8.20m),
            new VariantPeriodSnapshot(Lampa, 12.5m, 3, 2, 0, 1, 10m, 20.05m),
        ]));

        var folded = fold.Apply(input)[1];

        var only = Assert.Single(folded);
        Assert.Equal(Lampa, only.Key);
        Assert.Equal(new VariantPeriodSnapshot(Lampa, 22.5m, 5, 3, 1, 1, 14m, 28.25m), only.Value);
    }

    [Fact]
    public void A_lone_source_is_re_keyed_and_nothing_else_about_it_changes()
    {
        var fold = SpellingFold.Of([(LampaWithSpace, Lampa)]);
        var snapshot = new VariantPeriodSnapshot(LampaWithSpace, 10m, 2, 1, 1, 0, 4m, 8.20m);

        var folded = fold.Apply(Requests((7, [snapshot])))[7];

        var only = Assert.Single(folded);
        Assert.Equal(Lampa, only.Key);
        Assert.Equal(snapshot with { ProductVariantId = Lampa }, only.Value);
    }

    [Fact]
    public void Every_request_is_folded_on_its_own_and_one_with_nothing_to_fold_keeps_its_own_dictionary()
    {
        var fold = SpellingFold.Of([(LampaWithSpace, Lampa)]);
        var untouched = new Dictionary<long, VariantPeriodSnapshot> { [Other] = Snapshot(Other, 3m, 5m) };
        var input = new Dictionary<long, Dictionary<long, VariantPeriodSnapshot>>
        {
            [1] = new() { [LampaWithSpace] = Snapshot(LampaWithSpace, 10m, 2m) },
            [2] = new() { [Lampa] = Snapshot(Lampa, 12m, 2m), [LampaWithSpace] = Snapshot(LampaWithSpace, 1m, 2m) },
            [3] = untouched,
        };

        var folded = fold.Apply(input);

        Assert.Equal([1L, 2L, 3L], folded.Keys);
        Assert.Equal(10m, Assert.Single(folded[1]).Value.Quantity);
        Assert.Equal(13m, Assert.Single(folded[2]).Value.Quantity);
        Assert.Same(untouched, folded[3]);
    }

    /// <summary>The invariant that makes "məbləğlər dəyişmir" hold by construction.</summary>
    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(4)]
    [InlineData(5)]
    public void The_sum_of_every_field_of_every_request_is_the_same_before_and_after(int seed)
    {
        var random = new Random(seed);
        var fold = SpellingFold.Of([(1, 2), (3, 2), (4, 5), (7, 8)]);
        var input = new Dictionary<long, Dictionary<long, VariantPeriodSnapshot>>();
        for (var request = 1; request <= 6; request++)
        {
            var byVariant = new Dictionary<long, VariantPeriodSnapshot>();
            foreach (var variant in Enumerable.Range(1, 9).Where(_ => random.Next(3) > 0))
            {
                byVariant[variant] = new VariantPeriodSnapshot(
                    variant,
                    random.Next(1, 500) / 4m,
                    random.Next(1, 5),
                    random.Next(0, 4),
                    random.Next(0, 3),
                    random.Next(0, 3),
                    random.Next(0, 400) / 8m,
                    random.Next(0, 90_000) / 1000m);
            }

            input[request] = byVariant;
        }

        var folded = fold.Apply(input);

        foreach (var (request, before) in input)
        {
            var after = folded[request];
            Assert.Equal(Sums(before.Values), Sums(after.Values));
            Assert.All(after, entry => Assert.Equal(entry.Key, entry.Value.ProductVariantId));
            Assert.All(after.Keys, id => Assert.Equal(id, fold.CanonicalOf(id)));
        }
    }

    [Fact]
    public void Canonical_and_members_name_the_kept_spelling_and_every_spelling_folded_into_it()
    {
        var fold = SpellingFold.Of([(LampaWithSpace, Lampa), (13, Lampa)]);

        Assert.False(fold.IsEmpty);
        Assert.Equal(Lampa, fold.CanonicalOf(LampaWithSpace));
        Assert.Equal(Lampa, fold.CanonicalOf(13));
        Assert.Equal(Lampa, fold.CanonicalOf(Lampa));
        Assert.Equal(Other, fold.CanonicalOf(Other));

        Assert.Equal([LampaWithSpace, Lampa, 13L], fold.MembersOf(Lampa));
        Assert.Equal([LampaWithSpace, Lampa, 13L], fold.MembersOf(LampaWithSpace));
        Assert.Equal([Other], fold.MembersOf(Other));
    }

    /// <summary>The approval service makes a chain impossible; the fold does not rely on it.</summary>
    [Fact]
    public void A_chain_is_followed_to_its_end()
    {
        var fold = SpellingFold.Of([(1, 2), (2, 3)]);

        Assert.Equal(3, fold.CanonicalOf(1));
        Assert.Equal(3, fold.CanonicalOf(2));
        Assert.Equal([1L, 2L, 3L], fold.MembersOf(1));

        var folded = fold.Apply(Requests((1, [Snapshot(1, 1m, 1m), Snapshot(2, 2m, 1m), Snapshot(3, 4m, 1m)])));
        Assert.Equal(7m, Assert.Single(folded[1]).Value.Quantity);
    }

    [Fact]
    public void A_stored_cycle_stops_and_every_member_agrees_on_one_id()
    {
        var fold = SpellingFold.Of([(5, 6), (6, 5), (9, 6)]);

        Assert.Equal(5, fold.CanonicalOf(5));
        Assert.Equal(5, fold.CanonicalOf(6));
        Assert.Equal(5, fold.CanonicalOf(9));
        Assert.Equal([5L, 6L, 9L], fold.MembersOf(6));
    }

    [Fact]
    public void A_match_of_a_variant_with_itself_folds_nothing()
    {
        Assert.True(SpellingFold.Of([(4, 4)]).IsEmpty);
    }

    [Fact]
    public void A_source_given_twice_keeps_the_first_target()
    {
        var fold = SpellingFold.Of([(1, 2), (1, 3)]);

        Assert.Equal(2, fold.CanonicalOf(1));
        Assert.Equal(3, fold.CanonicalOf(3));
    }

    // ---- helpers -------------------------------------------------------------------------------------

    private static VariantPeriodSnapshot Snapshot(long variantId, decimal quantity, decimal unitPrice) =>
        new(variantId, quantity, 1, 1, 0, 0, quantity, quantity * unitPrice);

    private static Dictionary<long, Dictionary<long, VariantPeriodSnapshot>> Requests(
        params (long RequestId, VariantPeriodSnapshot[] Snapshots)[] requests) =>
        requests.ToDictionary(
            request => request.RequestId,
            request => request.Snapshots.ToDictionary(snapshot => snapshot.ProductVariantId));

    private static (decimal, int, int, int, int, decimal, decimal) Sums(IEnumerable<VariantPeriodSnapshot> snapshots)
    {
        var list = snapshots.ToList();
        return (
            list.Sum(item => item.Quantity),
            list.Sum(item => item.ItemCount),
            list.Sum(item => item.KnownPriceItemCount),
            list.Sum(item => item.MissingRequiredPriceItemCount),
            list.Sum(item => item.PriceNotRequiredItemCount),
            list.Sum(item => item.PricedQuantity),
            list.Sum(item => item.PricedAmount));
    }
}
