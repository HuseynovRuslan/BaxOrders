using BaxOrders.Application.Analytics;
using BaxOrders.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// Comparing a location's months against their own history. Everything here reads: analytics never creates,
/// changes or approves a request, and a request keeps the status it has.
/// </summary>
[ApiController]
[Route(ApiRoutes.V1 + "/analytics")]
[Produces("application/json")]
public sealed class AnalyticsController(OrderAnalyticsQueries queries) : ControllerBase
{
    /// <summary>The months this location has a request for, newest first, with the version analytics would use.</summary>
    /// <response code="404">No such location.</response>
    [HttpGet("locations/{locationId:int}/periods")]
    [ProducesResponseType<AnalyticsPeriodsDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AnalyticsPeriodsDto>> GetPeriods(int locationId, CancellationToken cancellationToken) =>
        await queries.GetPeriodsAsync(locationId, cancellationToken) is { } periods
            ? periods
            : throw new NotFoundException($"Location #{locationId} was not found.");

    /// <summary>
    /// One month of one location compared with its own past, variant by variant.
    /// </summary>
    /// <param name="locationId">The location.</param>
    /// <param name="period">The month being looked at, as <c>yyyy-MM</c>.</param>
    /// <param name="query">Basis, search, state filter and paging.</param>
    /// <response code="400">The month or the basis is not a value this API accepts.</response>
    /// <response code="404">No such location, or that location has no request for that month.</response>
    [HttpGet("locations/{locationId:int}/periods/{period}/comparison")]
    [ProducesResponseType<LocationComparisonDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LocationComparisonDto>> GetComparison(
        int locationId, string period, [FromQuery] ComparisonQuery query, CancellationToken cancellationToken)
    {
        var currentPeriod = Month(period, nameof(period));
        Require(query.Basis, nameof(ComparisonQuery.Basis));
        if (query.State is { } state)
        {
            Require(state, nameof(ComparisonQuery.State));
        }

        return await queries.CompareAsync(locationId, currentPeriod, query, cancellationToken) is { } comparison
            ? comparison
            : throw new NotFoundException(
                $"Location #{locationId} has no order request for {AnalyticsPeriod.Format(currentPeriod)}.");
    }

    /// <summary>
    /// One variant's history at one location: a point for every month the location ordered in, and no point at
    /// all for a month it did not.
    /// </summary>
    /// <param name="from">First month to include, as <c>yyyy-MM</c>. Omitted means from the beginning.</param>
    /// <param name="to">Last month to include, as <c>yyyy-MM</c>. Omitted means up to the latest.</param>
    /// <response code="400">A month is not a value this API accepts.</response>
    /// <response code="404">No such location or variant.</response>
    [HttpGet("locations/{locationId:int}/variants/{productVariantId:long}/trend")]
    [ProducesResponseType<VariantTrendDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VariantTrendDto>> GetTrend(
        int locationId,
        long productVariantId,
        [FromQuery] string? from,
        [FromQuery] string? to,
        CancellationToken cancellationToken)
    {
        var query = new TrendQuery(
            from is null ? null : Month(from, nameof(from)),
            to is null ? null : Month(to, nameof(to)));

        return await queries.GetTrendAsync(locationId, productVariantId, query, cancellationToken) is { } trend
            ? trend
            : throw new NotFoundException(
                $"Location #{locationId} or product variant #{productVariantId} was not found.");
    }

    private static DateOnly Month(string value, string name) =>
        AnalyticsPeriod.TryParse(value, out var period)
            ? period
            : throw new ValidationException($"'{name}' must be a month in the form yyyy-MM (got '{value}').");

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
