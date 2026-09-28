using BaxOrders.Application.Analytics;
using BaxOrders.Application.Common;
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
    /// <param name="scope">
    /// Which lines the grid is about. Absent means the month's planned material, which is what a year read side
    /// by side is a comparison of.
    /// </param>
    /// <response code="400">The scope is not a value this API accepts.</response>
    [HttpGet("monthly")]
    [ProducesResponseType<MonthlyReportDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public Task<MonthlyReportDto> GetMonthly(
        [FromQuery] int? year,
        [FromQuery] string? search,
        [FromQuery] AnalyticsScope scope = AnalyticsScope.Monthly,
        CancellationToken cancellationToken = default)
    {
        // An enum binds any number by default, and a scope outside the contract would quietly answer about a
        // population nobody asked for.
        if (!Enum.IsDefined(scope))
        {
            throw new ValidationException($"'scope' is not a value this API accepts (got '{(int)scope}').");
        }

        return queries.GetAsync(new MonthlyReportQuery(year ?? DateTime.UtcNow.Year, search, scope), cancellationToken);
    }
}
