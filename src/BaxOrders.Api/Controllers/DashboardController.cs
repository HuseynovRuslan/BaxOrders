using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// The company's month, one row per location. Read-only: the dashboard reports what the permanent orders say
/// and changes nothing, and it ranks nothing as good or bad — a rise in what an object ordered is a fact, not
/// a verdict.
/// </summary>
[ApiController]
[Route(ApiRoutes.V1 + "/dashboard")]
[Produces("application/json")]
public sealed class DashboardController(
    ManagementDashboardQueries queries, OutsideMonthlyQueries outsideMonthly) : ControllerBase
{
    /// <summary>
    /// What was ordered on top of the monthly plan in one month: which objects, which products, how much.
    /// </summary>
    /// <remarks>
    /// Exactly the lines the monthly comparison leaves out, listed as facts and nothing more. A month with
    /// none of them answers with an empty list, which is an answer.
    /// </remarks>
    /// <param name="period">The month being looked at, as <c>yyyy-MM</c>.</param>
    /// <response code="400">The month is not a value this API accepts.</response>
    [HttpGet("outside-monthly")]
    [ProducesResponseType<OutsideMonthlyDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public Task<OutsideMonthlyDto> GetOutsideMonthly(
        [FromQuery] string? period, CancellationToken cancellationToken)
    {
        if (period is null)
        {
            throw new ValidationException("'period' is required and must be a month in the form yyyy-MM.");
        }

        var selected = AnalyticsPeriod.TryParse(period, out var parsed)
            ? parsed
            : throw new ValidationException($"'period' must be a month in the form yyyy-MM (got '{period}').");

        return outsideMonthly.GetAsync(selected, cancellationToken);
    }

    /// <summary>The months the company has permanent orders for, newest first.</summary>
    [HttpGet("periods")]
    [ProducesResponseType<DashboardPeriodsDto>(StatusCodes.Status200OK)]
    public Task<DashboardPeriodsDto> GetPeriods(CancellationToken cancellationToken) =>
        queries.GetPeriodsAsync(cancellationToken);

    /// <summary>
    /// One month across every object of that month — every active object and every object that ordered in it —
    /// each beside its own history.
    /// </summary>
    /// <param name="period">The month being looked at, as <c>yyyy-MM</c>.</param>
    /// <param name="query">Basis, search, filters, sorting and paging.</param>
    /// <response code="400">The month, the basis, a filter or the sort is not a value this API accepts.</response>
    /// <response code="404">No location has a permanent request for that month.</response>
    [HttpGet]
    [ProducesResponseType<ManagementDashboardDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ManagementDashboardDto>> Get(
        [FromQuery] string? period, [FromQuery] DashboardQuery query, CancellationToken cancellationToken)
    {
        if (period is null)
        {
            throw new ValidationException("'period' is required and must be a month in the form yyyy-MM.");
        }

        var selected = AnalyticsPeriod.TryParse(period, out var parsed)
            ? parsed
            : throw new ValidationException($"'period' must be a month in the form yyyy-MM (got '{period}').");

        Require(query.Basis, nameof(DashboardQuery.Basis));
        Require(query.Sort, nameof(DashboardQuery.Sort));
        // An enum binds any number by default, and a scope outside the contract would quietly answer about a
        // population nobody asked for.
        Require(query.Scope, nameof(DashboardQuery.Scope));
        if (query.HistoryCoverage is { } historyCoverage)
        {
            Require(historyCoverage, nameof(DashboardQuery.HistoryCoverage));
        }

        if (query.PriceCoverage is { } priceCoverage)
        {
            Require(priceCoverage, nameof(DashboardQuery.PriceCoverage));
        }

        if (query.Group is { } group)
        {
            Require(group, nameof(DashboardQuery.Group));
        }

        return await queries.GetAsync(selected, query, cancellationToken) is { } dashboard
            ? dashboard
            : throw new NotFoundException(
                $"No location has an order request for {AnalyticsPeriod.Format(selected)}.");
    }

    /// <summary>An enum binds any number by default, so a value outside the contract is rejected explicitly.</summary>
    private static void Require<TEnum>(TEnum value, string name) where TEnum : struct, Enum
    {
        if (!Enum.IsDefined(value))
        {
            throw new ValidationException(
                $"'{name}' must be one of: {string.Join(", ", Enum.GetNames<TEnum>())} (got '{value}').");
        }
    }
}
