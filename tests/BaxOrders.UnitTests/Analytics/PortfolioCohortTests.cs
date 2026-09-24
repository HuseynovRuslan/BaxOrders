using BaxOrders.Application.Analytics.Dashboard;

namespace BaxOrders.UnitTests.Analytics;

/// <summary>
/// The rule that decides which objects the portfolio headline is allowed to compare.
/// </summary>
/// <remarks>
/// Two claims are worth holding in place here, because the headline is worthless without them. The rule is
/// total — every object lands in exactly one group, whatever combination of facts it presents — and the four
/// groups add up to the catalogue, which is checked rather than assumed. A cohort figure is only as honest as
/// the claim that nothing quietly fell out of it.
/// </remarks>
public sealed class PortfolioCohortTests
{
    [Theory]
    // Ordered this month, and the window holds a month it ordered in: the ordinary case.
    [InlineData(true, true, 1, PortfolioGroup.Compared)]
    [InlineData(true, true, 6, PortfolioGroup.Compared)]
    // Ordered this month and has ordered before, but not inside the window the reader picked.
    [InlineData(true, true, 0, PortfolioGroup.NoBaseline)]
    // Has ordered before; nothing was recorded for this month.
    [InlineData(false, true, 0, PortfolioGroup.NoOrderThisMonth)]
    // Had never ordered as of this month. Its first order being this one changes nothing about the past.
    [InlineData(true, false, 0, PortfolioGroup.NoHistory)]
    [InlineData(false, false, 0, PortfolioGroup.NoHistory)]
    public void Every_object_lands_in_exactly_one_group(
        bool hasCurrentRequest, bool hasHistory, int availableBaselinePeriods, PortfolioGroup expected) =>
        Assert.Equal(expected, PortfolioCohort.GroupOf(hasCurrentRequest, hasHistory, availableBaselinePeriods));

    /// <summary>
    /// A window cannot hold months an object that has never ordered was in, so the pairing cannot arise — but
    /// the rule answers it rather than falling through, because a rule with a hole in it is not a partition.
    /// </summary>
    [Fact]
    public void An_object_with_no_history_is_never_called_compared() =>
        Assert.Equal(PortfolioGroup.NoHistory, PortfolioCohort.GroupOf(false, hasHistory: false, 3));

    [Fact]
    public void The_four_groups_are_returned_in_reading_order_and_named()
    {
        var partition = PortfolioCohort.Partition(
            [
                (PortfolioGroup.NoHistory, Member(4, "Ramana")),
                (PortfolioGroup.Compared, Member(1, "Fəvvarələr meydanı")),
                (PortfolioGroup.NoOrderThisMonth, Member(2, "Puşkin parkı")),
                (PortfolioGroup.NoBaseline, Member(3, "EXPO")),
            ],
            locationCount: 4);

        Assert.Equal(4, partition.LocationCount);
        Assert.Equal(3, partition.ComparableLocationCount);
        Assert.Equal("Fəvvarələr meydanı", Assert.Single(partition.Compared).LocationName);
        Assert.Equal("Puşkin parkı", Assert.Single(partition.NoOrderThisMonth).LocationName);
        Assert.Equal("EXPO", Assert.Single(partition.NoBaseline).LocationName);
        Assert.Equal("Ramana", Assert.Single(partition.NoHistory).LocationName);
    }

    /// <summary>
    /// Within a group, the names come back in the same order the table below puts them in — the dashboard rows
    /// are ordered by the same comparer — so a reader matching a name in the block against a row in the table
    /// walks both lists the same way. Since Task 3 (B6) that comparer is the Azerbaijani alphabet on both
    /// lists, so "Əmircan" comes after "E" and before "M" rather than after "Z".
    /// </summary>
    [Fact]
    public void Each_group_is_ordered_by_name()
    {
        var partition = PortfolioCohort.Partition(
            [
                (PortfolioGroup.NoHistory, Member(1, "Ramana")),
                (PortfolioGroup.NoHistory, Member(2, "Maştağa")),
                (PortfolioGroup.NoHistory, Member(3, "Əmircan")),
                (PortfolioGroup.NoHistory, Member(4, "Çadır")),
            ],
            locationCount: 4);

        Assert.Equal(["Çadır", "Əmircan", "Maştağa", "Ramana"], partition.NoHistory.Select(member => member.LocationName));
    }

    /// <summary>
    /// The one thing that must never pass silently: a headline summed over a cohort whose complement was lost.
    /// </summary>
    [Fact]
    public void A_partition_that_does_not_cover_the_catalogue_is_refused()
    {
        var problem = Assert.Throws<InvalidOperationException>(() => PortfolioCohort.Partition(
            [(PortfolioGroup.Compared, Member(1, "Fəvvarələr meydanı"))],
            locationCount: 29));

        Assert.Contains("29", problem.Message, StringComparison.Ordinal);
        Assert.Contains("compared 1", problem.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void An_empty_catalogue_partitions_into_nothing()
    {
        var partition = PortfolioCohort.Partition([], locationCount: 0);

        Assert.Equal(0, partition.LocationCount);
        Assert.Equal(0, partition.ComparableLocationCount);
        Assert.Empty(partition.Compared);
    }

    /// <summary>
    /// Rounded the way the screen rounds, so the sum of the rows a reader can see is the number at the top of
    /// the page. Half a qəpik goes away from zero, as it does everywhere else money is shown.
    /// </summary>
    [Theory]
    [InlineData(44340.784, 44340.78)]
    [InlineData(44340.785, 44340.79)]
    [InlineData(-44340.785, -44340.79)]
    [InlineData(700, 700)]
    [InlineData(0.005, 0.01)]
    public void Money_is_rounded_to_the_cent_away_from_zero(decimal value, decimal expected) =>
        Assert.Equal(expected, PortfolioCohort.Money(value));

    [Fact]
    public void An_amount_that_is_not_there_stays_absent() => Assert.Null(PortfolioCohort.Money((decimal?)null));

    private static DashboardPartitionMemberDto Member(int id, string name) =>
        new(id, $"LOC-{id:D6}", name, null, null, null, null, null);
}
