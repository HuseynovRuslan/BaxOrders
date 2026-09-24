using BaxOrders.Application.Reports;

namespace BaxOrders.UnitTests.Reports;

/// <summary>
/// The monthly report's unusual month (owner decision 8.2): more than ±50% from the average of the location's three
/// previous available months, and no verdict at all without three.
/// </summary>
/// <remarks>
/// The first two cases are the brief's own figures for Heydər Əliyev. What is pinned besides them is where the rule
/// could quietly go wrong: which three months it averages, what it does with fewer, and which side of 50% the edge
/// falls on.
/// </remarks>
public sealed class UnusualMonthTests
{
    // ---- the owner's examples ------------------------------------------------------------------------

    /// <summary>June 36 010,19 ₼ after March–May: an average of 14 458,58 ₼, +149,06%. Marked.</summary>
    [Fact]
    public void Heydər_Əliyevs_June_stands_out_from_March_to_May()
    {
        var result = UnusualMonth.Of(36_010.19m, [12_000.00m, 14_375.74m, 17_000.00m]);

        Assert.Equal(14_458.58m, result.RecentAverage);
        Assert.Equal(149.06m, result.RecentAveragePercent);
        Assert.True(result.IsUnusual);
    }

    /// <summary>August 11 985,02 ₼ after May–July: an average of 23 048,12 ₼, −48,00%. Not marked.</summary>
    [Fact]
    public void Heydər_Əliyevs_August_is_within_half_of_May_to_July()
    {
        var result = UnusualMonth.Of(
            11_985.02m, [12_000.00m, 14_375.74m, 17_000.00m, 36_010.19m, 16_134.16m]);

        Assert.Equal(23_048.12m, result.RecentAverage);
        Assert.Equal(-48.00m, result.RecentAveragePercent);
        Assert.False(result.IsUnusual);
    }

    /// <summary>January, February and March of a history that starts in January: not three months behind any of them.</summary>
    [Fact]
    public void The_first_three_months_of_a_history_have_no_verdict()
    {
        Assert.Equal(new UnusualMonthResult(null, null, false), UnusualMonth.Of(9_000m, []));
        Assert.Equal(new UnusualMonthResult(null, null, false), UnusualMonth.Of(90_000m, [100m]));
        Assert.Equal(new UnusualMonthResult(null, null, false), UnusualMonth.Of(90_000m, [100m, 200m]));
    }

    // ---- which months --------------------------------------------------------------------------------

    /// <summary>The three most recent, however long the history behind them.</summary>
    [Fact]
    public void Only_the_last_three_months_are_averaged()
    {
        var result = UnusualMonth.Of(100m, [1m, 2m, 3m, 90m, 100m, 110m]);

        Assert.Equal(100m, result.RecentAverage);
        Assert.Equal(0m, result.RecentAveragePercent);
        Assert.False(result.IsUnusual);
    }

    /// <summary>A month with no known amount has nothing to be compared, whatever lies behind it.</summary>
    [Fact]
    public void A_month_without_an_amount_is_not_judged()
    {
        Assert.Equal(new UnusualMonthResult(null, null, false), UnusualMonth.Of(null, [100m, 200m, 300m]));
    }

    // ---- the edge ------------------------------------------------------------------------------------

    /// <summary>"±50%-dən çox": exactly half is not more than half, in either direction.</summary>
    [Fact]
    public void Exactly_fifty_percent_either_way_is_not_unusual()
    {
        var up = UnusualMonth.Of(150m, [100m, 100m, 100m]);
        var down = UnusualMonth.Of(50m, [100m, 100m, 100m]);

        Assert.Equal(50m, up.RecentAveragePercent);
        Assert.False(up.IsUnusual);
        Assert.Equal(-50m, down.RecentAveragePercent);
        Assert.False(down.IsUnusual);
    }

    [Fact]
    public void A_qepik_past_fifty_percent_either_way_is_unusual()
    {
        var up = UnusualMonth.Of(150.01m, [100m, 100m, 100m]);
        var down = UnusualMonth.Of(49.99m, [100m, 100m, 100m]);

        Assert.Equal(50.01m, up.RecentAveragePercent);
        Assert.True(up.IsUnusual);
        Assert.Equal(-50.01m, down.RecentAveragePercent);
        Assert.True(down.IsUnusual);
    }

    /// <summary>
    /// 450,01 against 300,00 is +50,0033%, printed +50%. The verdict follows the figure printed, so a cell that
    /// reads "+50%" is never marked as more than fifty.
    /// </summary>
    [Fact]
    public void The_verdict_is_taken_on_the_percentage_as_printed()
    {
        var result = UnusualMonth.Of(450.01m, [300m, 300m, 300m]);

        Assert.Equal(50.00m, result.RecentAveragePercent);
        Assert.False(result.IsUnusual);
    }

    /// <summary>The average is a qəpik figure, so the average and the percentage beside it agree on the screen.</summary>
    [Fact]
    public void The_average_is_rounded_to_the_qepik_before_the_percentage_is_taken()
    {
        // 100 + 100 + 100,01 = 300,01, a third of which is 100,00333…
        var result = UnusualMonth.Of(200m, [100m, 100m, 100.01m]);

        Assert.Equal(100.00m, result.RecentAverage);
        Assert.Equal(100m, result.RecentAveragePercent);
    }

    /// <summary>Three months that cost nothing: an average to show, but no percentage of it, and so no verdict.</summary>
    [Fact]
    public void An_average_of_zero_gives_no_percentage_and_no_verdict()
    {
        var result = UnusualMonth.Of(100m, [0m, 0m, 0m]);

        Assert.Equal(0m, result.RecentAverage);
        Assert.Null(result.RecentAveragePercent);
        Assert.False(result.IsUnusual);
    }
}
