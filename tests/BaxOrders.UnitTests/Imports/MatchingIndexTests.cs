using BaxOrders.Application.Imports.Matching;
using BaxOrders.Domain.Normalization;

namespace BaxOrders.UnitTests.Imports;

public sealed class MatchingIndexTests
{
    [Fact]
    public void Canonical_name_matches_after_normalization()
    {
        var index = new NameIndex<int>();
        index.Add(TextNormalizer.Normalize("Cleanfix MMC"), 1);

        var match = index.Resolve("  CLEANFIX   mmc ");

        Assert.Equal(MatchKind.Matched, match.Kind);
        Assert.Equal(1, match.Id);
    }

    [Fact]
    public void Alias_matches_its_record()
    {
        var index = new NameIndex<int>();
        index.Add("cleanfix mmc", 1);
        index.Add("cleanfix", 1);

        Assert.Equal(1, index.Resolve("Cleanfix").Id);
    }

    [Fact]
    public void Canonical_name_of_one_record_and_alias_of_another_is_ambiguous()
    {
        var index = new NameIndex<int>();
        index.Add("cleanfix", 7);
        index.Add("cleanfix mmc", 1);
        index.Add("cleanfix", 1);

        var match = index.Resolve("Cleanfix");

        Assert.Equal(MatchKind.Ambiguous, match.Kind);
        Assert.Null(match.Id);
        Assert.Equal([1, 7], match.Candidates);
    }

    [Fact]
    public void Nothing_is_matched_partially()
    {
        var index = new NameIndex<int>();
        index.Add("cleanfix mmc", 1);

        Assert.Equal(MatchKind.Unknown, index.Resolve("Cleanfix").Kind);
        Assert.Equal(MatchKind.Unknown, index.Resolve("Cleanfix MMC LLC").Kind);
    }

    [Fact]
    public void Empty_value_is_blank_not_unknown()
    {
        Assert.Equal(MatchKind.Blank, new NameIndex<int>().Resolve("   ").Kind);
    }

    [Fact]
    public void Category_is_matched_by_its_full_path()
    {
        var index = Categories();

        Assert.Equal(3, index.Resolve("Təmizlik", " Təmizlik ləvazimatı ", "ƏLCƏK").Id);
        Assert.Equal(2, index.Resolve("Təmizlik", "Təmizlik ləvazimatı", null).Id);
    }

    [Fact]
    public void Same_leaf_name_under_another_parent_is_not_matched()
    {
        Assert.Equal(MatchKind.Unknown, Categories().Resolve("Usta", "Təmizlik ləvazimatı", "Əlcək").Kind);
    }

    [Fact]
    public void Path_with_a_gap_is_unknown()
    {
        Assert.Equal(MatchKind.Unknown, Categories().Resolve("Təmizlik", "", "Əlcək").Kind);
    }

    [Fact]
    public void Path_through_an_inactive_category_is_not_matchable()
    {
        var index = new CategoryPathIndex();
        index.Build([(1, null, "təmizlik", true), (2, 1, "təmizlik ləvazimatı", false), (3, 2, "əlcək", true)]);

        Assert.Equal(MatchKind.Unknown, index.Resolve("Təmizlik", "Təmizlik ləvazimatı", "Əlcək").Kind);
    }

    [Fact]
    public void Empty_category_columns_are_blank()
    {
        Assert.Equal(MatchKind.Blank, Categories().Resolve(null, " ", null).Kind);
    }

    private static CategoryPathIndex Categories()
    {
        var index = new CategoryPathIndex();
        index.Build(
        [
            (1, null, "təmizlik", true),
            (2, 1, "təmizlik ləvazimati", true),
            (3, 2, "əlcək", true),
            (4, null, "usta", true),
            (5, 4, "əlcək", true),
        ]);
        return index;
    }
}
