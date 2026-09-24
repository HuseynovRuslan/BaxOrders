namespace BaxOrders.Application.Common;

/// <summary>
/// The one place money becomes a figure a screen can show.
/// </summary>
/// <remarks>
/// <para>
/// A manager reads three numbers off the dashboard and subtracts two of them. If the answer is not the third
/// number, the page is wrong — however defensible the arithmetic behind it was. That used to happen here: an
/// object's difference was computed from its two <i>unrounded</i> sides while the sides themselves were
/// rounded separately for display, so a baseline landing on half a qəpik sent the two apart. Four objects
/// doing it at once moved the company's difference by four qəpik, and nobody could reproduce the figure.
/// </para>
/// <para>
/// <b>Round the inputs, derive the output.</b> Every amount is rounded to the cent at the point it is
/// computed, and every difference, total and percentage is derived from the rounded figures. Rounding once,
/// early, at the only precision anybody ever sees is what makes the identities on the screen true:
/// </para>
/// <list type="bullet">
/// <item>a row's difference is its own two cells subtracted;</item>
/// <item>a column's total is its rows added up;</item>
/// <item>the causes of a difference add up to the difference.</item>
/// </list>
/// <para>
/// <b>Amounts, not unit prices.</b> This is for sums of money — what an order came to, what a month came to,
/// what changed. A unit price is not a total: the domain stores prices to four decimals, they are multiplied
/// by quantities before anybody adds them up, and cutting them to the cent would lose real information about
/// what the company actually pays. Prices keep their own scale and are formatted separately.
/// </para>
/// <para>
/// The frontend never re-rounds. It formats what it is given, so what it shows is what was computed.
/// </para>
/// </remarks>
public static class Money
{
    /// <summary>The only precision money is ever shown at, so the only precision it is ever computed at.</summary>
    public const int CentScale = 2;

    /// <summary>
    /// Half a qəpik goes away from zero, as everywhere else in the app and as a person doing it by hand would.
    /// </summary>
    public static decimal RoundCents(decimal value) =>
        Math.Round(value, CentScale, MidpointRounding.AwayFromZero);

    /// <inheritdoc cref="RoundCents(decimal)"/>
    /// <remarks>An amount that is not there stays absent: unknown money is never rounded into zero money.</remarks>
    public static decimal? RoundCents(decimal? value) => value is null ? null : RoundCents(value.Value);
}
