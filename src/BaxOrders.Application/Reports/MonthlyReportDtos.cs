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
    decimal? DeltaPercent);

/// <param name="Months">Twelve cells, January first, whether or not the location ordered in them.</param>
/// <param name="KnownAmount">The year's priced money for this location. Null when it ordered nothing priced.</param>
public sealed record MonthlyReportRowDto(
    int LocationId,
    string LocationCode,
    string LocationName,
    bool IsActive,
    IReadOnlyList<MonthlyReportCellDto> Months,
    int RequestCount,
    decimal? KnownAmount,
    int MissingPriceItemCount,
    int MonthsWithoutRequest);

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
