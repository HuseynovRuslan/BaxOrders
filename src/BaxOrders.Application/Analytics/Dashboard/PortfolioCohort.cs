namespace BaxOrders.Application.Analytics.Dashboard;

/// <summary>
/// Which of four situations an object is in, for the month and the basis being looked at.
/// </summary>
/// <remarks>
/// Every object in the catalogue is in exactly one of these, and the four of them add up to the catalogue.
/// That is the point of the enum: the portfolio figure is a sum over one of the groups, and the reader can
/// only trust it if the other three are named rather than quietly dropped.
/// </remarks>
public enum PortfolioGroup
{
    /// <summary>Ordered this month <b>and</b> ordered in at least one month the comparison window covers.</summary>
    Compared = 1,

    /// <summary>Has ordered before, but nothing was recorded for the selected month.</summary>
    NoOrderThisMonth = 2,

    /// <summary>Ordered this month, has ordered before, but not in any month the window covers.</summary>
    NoBaseline = 3,

    /// <summary>Had never ordered as of the selected month. There is nothing to compare in either direction.</summary>
    NoHistory = 4,
}

/// <summary>One object named in the partition, with the money that put it where it is.</summary>
/// <param name="CurrentKnownAmount">
/// Its own money for the selected month, rounded to the cent — the figure its table row shows. Null when it
/// did not order: an object that did not order is not an object that ordered nothing.
/// </param>
/// <param name="BaselineKnownAmount">
/// Its own average baseline month, rounded to the cent. Null when the window holds no month it ordered in.
/// </param>
/// <param name="KnownAmountDelta">
/// Its own difference, rounded to the cent — the figure its table row shows in the Dəyişmə column. It is the
/// row's own difference rounded, never <c>CurrentKnownAmount − BaselineKnownAmount</c>: the row computes its
/// difference from its two unrounded sides, so the two can land a qəpik apart, and the column a manager can
/// actually add up is the one that has to reconcile.
/// </param>
/// <param name="LastOrderPeriod">
/// The most recent month before the selected one that it ordered in, and null only when it never ordered at
/// all. A fact, not an excuse: nothing here says why an object has no order this month, because nothing knows.
/// </param>
public sealed record DashboardPartitionMemberDto(
    int LocationId,
    string LocationCode,
    string LocationName,
    decimal? CurrentKnownAmount,
    decimal? BaselineKnownAmount,
    decimal? KnownAmountDelta,
    DateOnly? LastOrderPeriod,
    decimal? LastOrderKnownAmount);

/// <summary>
/// Every object in the catalogue, sorted into the four situations, so the headline can be reconciled.
/// </summary>
/// <param name="LocationCount">
/// The catalogue. The four groups add up to it — <see cref="PortfolioCohort.Partition"/> refuses to return a
/// partition that does not.
/// </param>
/// <param name="ComparableLocationCount">
/// The objects that had a history to compare as of this month: compared, no-baseline and no-order-this-month.
/// This is the denominator the coverage line uses, because an object that has never ordered cannot sensibly be
/// described as missing an order.
/// </param>
public sealed record DashboardPartitionDto(
    int LocationCount,
    int ComparableLocationCount,
    IReadOnlyList<DashboardPartitionMemberDto> Compared,
    IReadOnlyList<DashboardPartitionMemberDto> NoOrderThisMonth,
    IReadOnlyList<DashboardPartitionMemberDto> NoBaseline,
    IReadOnlyList<DashboardPartitionMemberDto> NoHistory);

/// <summary>
/// The one rule that decides which objects the portfolio headline is allowed to compare.
/// </summary>
/// <remarks>
/// <para>
/// <b>The rule.</b> An object is in the cohort when it ordered in the selected month <i>and</i> ordered in at
/// least one month the comparison window covers. The compared amount, the baseline and the difference are all
/// summed over that same cohort — never over three different sets of objects.
/// </para>
/// <para>
/// This exists because they used to be three different sets. The headline added up the money of every object
/// that ordered this month and set it beside the baseline of every object that had any history at all. An
/// object with an order this month and no history was in the first sum and not the second; an object that had
/// stopped ordering was in the second and not the first. The difference between the two sums was therefore not
/// a change in anything — part of it was a change in <i>which objects were being added up</i>, and it moved
/// when the basis changed for reasons that had nothing to do with what the company spent.
/// </para>
/// <para>
/// <b>History is read as of the selected month.</b> An object whose first order came after the month being
/// looked at had no history then, whatever it has now, so it is <see cref="PortfolioGroup.NoHistory"/> for that
/// month. Reading an old month must not be coloured by what happened after it.
/// </para>
/// <para>
/// <b>Rounded per object, then summed — every column of it.</b> Each object's money is rounded to the cent
/// before it is added up, because the cent is what its table row shows, and that is done to all three columns:
/// the month, the baseline and the difference. Summing unrounded figures and rounding once at the end is
/// arithmetically purer and produces a headline the reader cannot reproduce from the rows in front of them,
/// which is worse.
/// </para>
/// <para>
/// It leaves one wrinkle, and it is the deliberate half of the trade. An object's own difference is computed
/// from its own two <i>unrounded</i> sides, so rounding it can land a qəpik away from the difference of its
/// two rounded sides. Summed over a couple of dozen objects that reaches four qəpik on the worst basis this
/// company has. The consequence is that the headline's difference is not always exactly its compared amount
/// minus its baseline — but every column of the table does add up to the figure above it, which is the
/// arithmetic somebody actually checks.
/// </para>
/// </remarks>
public static class PortfolioCohort
{
    /// <summary>Money is shown to the cent, so money is added up to the cent.</summary>
    public const int MoneyScale = 2;

    /// <summary>The same rounding the screen does, so the sum of the rows is the headline.</summary>
    public static decimal Money(decimal value) => Math.Round(value, MoneyScale, MidpointRounding.AwayFromZero);

    /// <inheritdoc cref="Money(decimal)"/>
    public static decimal? Money(decimal? value) => value is null ? null : Money(value.Value);

    /// <summary>The rule itself, with nothing else in the way of reading it.</summary>
    /// <param name="hasCurrentRequest">Whether the object has a request for the selected month.</param>
    /// <param name="hasHistory">Whether it had ordered at all <b>before</b> the selected month.</param>
    /// <param name="availableBaselinePeriodCount">How many months of the window it actually ordered in.</param>
    public static PortfolioGroup GroupOf(bool hasCurrentRequest, bool hasHistory, int availableBaselinePeriodCount)
    {
        if (!hasCurrentRequest)
        {
            return hasHistory ? PortfolioGroup.NoOrderThisMonth : PortfolioGroup.NoHistory;
        }

        // It ordered this month, so whether it can be compared is a question about the window — unless this is
        // the first order it has ever placed, in which case there is no window to ask about.
        if (availableBaselinePeriodCount > 0)
        {
            return PortfolioGroup.Compared;
        }

        return hasHistory ? PortfolioGroup.NoBaseline : PortfolioGroup.NoHistory;
    }

    /// <summary>
    /// The four groups, each ordered by name.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// If the groups do not add up to the catalogue. Nothing should be able to cause this — the rule above is
    /// total — but a headline computed over a cohort is only as honest as the claim that nothing fell out of
    /// it, so the claim is checked rather than left as a comment.
    /// </exception>
    public static DashboardPartitionDto Partition(
        IEnumerable<(PortfolioGroup Group, DashboardPartitionMemberDto Member)> members,
        int locationCount)
    {
        ArgumentNullException.ThrowIfNull(members);

        var byGroup = members.ToLookup(entry => entry.Group, entry => entry.Member);

        static IReadOnlyList<DashboardPartitionMemberDto> Named(IEnumerable<DashboardPartitionMemberDto> group) =>
            [.. group.OrderBy(member => member.LocationName, StringComparer.OrdinalIgnoreCase)];

        var compared = Named(byGroup[PortfolioGroup.Compared]);
        var noOrder = Named(byGroup[PortfolioGroup.NoOrderThisMonth]);
        var noBaseline = Named(byGroup[PortfolioGroup.NoBaseline]);
        var noHistory = Named(byGroup[PortfolioGroup.NoHistory]);

        var total = compared.Count + noOrder.Count + noBaseline.Count + noHistory.Count;
        if (total != locationCount)
        {
            throw new InvalidOperationException(
                $"The portfolio partition covers {total} objects but the catalogue has {locationCount}: "
                + $"compared {compared.Count}, no order this month {noOrder.Count}, "
                + $"no baseline {noBaseline.Count}, no history {noHistory.Count}.");
        }

        return new DashboardPartitionDto(
            locationCount,
            compared.Count + noOrder.Count + noBaseline.Count,
            compared,
            noOrder,
            noBaseline,
            noHistory);
    }
}
