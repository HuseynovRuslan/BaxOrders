using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Application.Imports;
using BaxOrders.Domain.Imports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <param name="Value">What the cell should have said. The Excel value is kept either way.</param>
public sealed record CorrectionRequest(string Value);

public sealed record ExcludeRowRequest(string Reason);

/// <summary>
/// Row-specific work on staged data: reading one row in full, correcting single cells, and keeping a row out of
/// the future order import. Nothing here changes the workbook or its staged original values.
/// </summary>
[ApiController]
[Route(ApiRoutes.V1 + "/imports/{id:long}")]
public sealed class ImportRowCorrectionsController(
    ImportRowDetailQueries rowQueries,
    ImportRowCorrectionService corrections,
    ImportReadinessQueries readiness) : ControllerBase
{
    /// <summary>One staged row: workbook values, corrections, effective values, matches, issues and exclusion.</summary>
    [HttpGet("rows/{rowId:long}")]
    [ProducesResponseType<ImportRowDetail>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ImportRowDetail>> GetRow(long id, long rowId, CancellationToken cancellationToken) =>
        await rowQueries.GetRowAsync(id, rowId, cancellationToken) is { } row ? Ok(row) : NotFound();

    /// <summary>Rows that may need a row-specific decision, newest filters applied. Paged.</summary>
    [HttpGet("corrections/candidates")]
    [ProducesResponseType<PagedResult<CorrectionCandidate>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<CorrectionCandidate>>> GetCandidates(
        long id, [FromQuery] CorrectionCandidateQuery query, CancellationToken cancellationToken) =>
        await rowQueries.GetCandidatesAsync(id, query, cancellationToken) is { } page ? Ok(page) : NotFound();

    /// <summary>
    /// Records what one cell should have said and re-evaluates the row: parsing, matching, issues, duplicates and
    /// the batch summary. The workbook value stays untouched.
    /// </summary>
    /// <response code="400">The corrected value does not pass the rules a workbook cell has to pass.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPut("rows/{rowId:long}/corrections/{field}")]
    [ProducesResponseType<RowCorrectionResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public Task<RowCorrectionResult> ApplyCorrection(
        long id, long rowId, ImportCorrectionField field, CorrectionRequest request, CancellationToken cancellationToken) =>
        corrections.ApplyAsync(new ApplyCorrectionCommand(id, rowId, field, request.Value), cancellationToken);

    /// <summary>Drops the correction, so the row falls back to the workbook value.</summary>
    /// <summary>
    /// Confirms that a cell is empty on purpose — a service line with no order unit, for example. It is not the
    /// same as having no correction: a missing value blocks the import, a reviewed empty one does not.
    /// </summary>
    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("rows/{rowId:long}/corrections/{field}/clear")]
    [ProducesResponseType<RowCorrectionResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public Task<RowCorrectionResult> ClearCorrection(
        long id, long rowId, ImportCorrectionField field, CancellationToken cancellationToken) =>
        corrections.ClearAsync(id, rowId, field, cancellationToken);

    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpDelete("rows/{rowId:long}/corrections/{field}")]
    [ProducesResponseType<RowCorrectionResult>(StatusCodes.Status200OK)]
    public Task<RowCorrectionResult> RevertCorrection(
        long id, long rowId, ImportCorrectionField field, CancellationToken cancellationToken) =>
        corrections.RevertAsync(id, rowId, field, cancellationToken);

    /// <summary>
    /// Keeps this row out of the future order import. The row is not deleted: it stays staged, visible and
    /// auditable, and simply stops counting towards readiness.
    /// </summary>
    /// <response code="400">A reason is required.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("rows/{rowId:long}/exclude")]
    [ProducesResponseType<RowCorrectionResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public Task<RowCorrectionResult> Exclude(long id, long rowId, ExcludeRowRequest request, CancellationToken cancellationToken) =>
        corrections.ExcludeAsync(new ExcludeRowCommand(id, rowId, request.Reason), cancellationToken);

    /// <summary>Puts an excluded row back into the import and evaluates it again. Its corrections are kept.</summary>
    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("rows/{rowId:long}/include")]
    [ProducesResponseType<RowCorrectionResult>(StatusCodes.Status200OK)]
    public Task<RowCorrectionResult> Include(long id, long rowId, CancellationToken cancellationToken) =>
        corrections.IncludeAsync(id, rowId, cancellationToken);

    /// <summary>Why this import can or cannot become order requests yet.</summary>
    [HttpGet("readiness")]
    [ProducesResponseType<ImportReadiness>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ImportReadiness>> GetReadiness(long id, CancellationToken cancellationToken) =>
        await readiness.GetReadinessAsync(id, cancellationToken) is { } result ? Ok(result) : NotFound();
}
