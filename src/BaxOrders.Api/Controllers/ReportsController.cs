using BaxOrders.Application.Reports;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// Management reports: readings of the permanent orders, never a change to them.
/// </summary>
[ApiController]
[Route(ApiRoutes.V1 + "/reports")]
[Produces("application/json")]
public sealed class ReportsController(MonthlyReportQueries queries) : ControllerBase
{
    /// <summary>
    /// A year of ordering, every location against every month.
    /// </summary>
    /// <remarks>
    /// A month a location has no request for comes back with no request id and no amount. That is not the same
    /// as a month it ordered nothing in, and the two are deliberately not merged.
    /// </remarks>
    /// <param name="year">The calendar year. Defaults to the year of the latest request.</param>
    /// <param name="search">Narrows the rows by location name or code. The totals still describe every location.</param>
    [HttpGet("monthly")]
    [ProducesResponseType<MonthlyReportDto>(StatusCodes.Status200OK)]
    public Task<MonthlyReportDto> GetMonthly(
        [FromQuery] int? year,
        [FromQuery] string? search,
        CancellationToken cancellationToken) =>
        queries.GetAsync(new MonthlyReportQuery(year ?? DateTime.UtcNow.Year, search), cancellationToken);
}
