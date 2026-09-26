using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Reports;

/// <summary>
/// One location in one calendar month.
/// </summary>
/// <remarks>
/// A month with no request is not a month of nothing. <see cref="OrderRequestId"/> is then null and every
/// figure beside it is null too — the location did not order, which is a different fact from ordering zero,
/// and the report is required to keep the two apart.
/// </remarks>
/// <param name="KnownAmount">
/// Money over the priced lines of the version this month contributes. Null when the month has no request, and
/// null when it has one but nothing in it carries a price.
/// </param>
/// <param name="AmountIsComplete">False when a line of this month has no price; the amount is then partial.</param>
/// <param name="PreviousMonthKnownAmount">
/// The month before this one, which for January is December of the year before. Null when that month has no
/// request, so no difference is claimed against a month that does not exist.
/// </param>
/// <param name="RecentAverageKnownAmount">
/// The average of the location's three most recent <i>available</i> months before this one — months with a
/// request and a known amount, skipping the ones without, and reaching into earlier years. Null when there are
/// fewer than three, and when this month has no request or no known amount. See <see cref="UnusualMonth"/>.
/// </param>
/// <param name="RecentAveragePercent">
/// This month against that average, to the two places the report prints. Null wherever the average is, and when
/// the average is 0.
/// </param>
/// <param name="IsUnusual">
/// More than ±50% from that average (owner decision 8.2). False, never a guess, when there is no average.
/// </param>
/// <param name="IsHistoricalImport">
/// Whether this month's order was carried in from Excel as already approved. From
/// <see cref="Orders.Workflow.HistoricalImportRule"/>, the same as the order page's <c>DecisionFacts.IsHistoricalImport</c>;
/// it never changes the status, which stays <c>Approved</c>. False when the month has no request.
/// </param>
public sealed record MonthlyReportCellDto(
    int Month,
    DateOnly Period,
    long? OrderRequestId,
    int? Version,
    OrderRequestStatus? Status,
    decimal? KnownAmount,
    int ItemCount,
    int MissingPriceItemCount,
    bool AmountIsComplete,
    decimal? PreviousMonthKnownAmount,
    decimal? DeltaAmount,
    decimal? DeltaPercent,
    decimal? RecentAverageKnownAmount,
    decimal? RecentAveragePercent,
    bool IsUnusual,
    bool IsHistoricalImport = false);

/// <param name="Months">Twelve cells, January first, whether or not the location ordered in them.</param>
/// <param name="KnownAmount">The year's priced money for this location. Null when it ordered nothing priced.</param>
/// <param name="HasAnyRequest">
/// Whether the location has a request in any month up to the end of the report's year — this year or any
/// before it. False is the dashboard's "Sistemdə hələ sifarişi yoxdur", judged as of the year being read;
/// a location that ordered in an earlier year and not in this one is true, with twelve empty months.
/// </param>
public sealed record MonthlyReportRowDto(
    int LocationId,
    string LocationCode,
    string LocationName,
    bool IsActive,
    IReadOnlyList<MonthlyReportCellDto> Months,
    int RequestCount,
    decimal? KnownAmount,
    int MissingPriceItemCount,
    int MonthsWithoutRequest,
    bool HasAnyRequest);

/// <summary>One month across every location, so a column can be read as well as a row.</summary>
public sealed record MonthlyReportMonthDto(
    int Month,
    DateOnly Period,
    int LocationsWithRequest,
    decimal? KnownAmount,
    int MissingPriceItemCount,
    bool AmountIsComplete);

/// <param name="Months">Describes the whole company, never the searched subset.</param>
/// <param name="FilteredLocationCount">How many rows the search left; <see cref="LocationCount"/> is the total.</param>
public sealed record MonthlyReportDto(
    int Year,
    IReadOnlyList<int> AvailableYears,
    IReadOnlyList<MonthlyReportRowDto> Rows,
    IReadOnlyList<MonthlyReportMonthDto> Months,
    int LocationCount,
    int FilteredLocationCount,
    int RequestCount,
    decimal? KnownAmount,
    int MissingPriceItemCount,
    bool AmountIsComplete);

/// <param name="Year">Null asks for the most recent year that has any request.</param>
public sealed record MonthlyReportQuery(int? Year = null, string? Search = null);
