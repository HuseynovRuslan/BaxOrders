using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

public sealed record ImportUploadResponse(ImportPreview Preview, IReadOnlyList<SheetDetection> Sheets);

/// <summary>Staging an Excel workbook, and reading what was staged.</summary>
/// <remarks>
/// The whole controller is for the people who run imports, reads included. A Rəhbər is not offered the import
/// screens, and typing their address — the page's or this API's — does not open them either (brief 14). The
/// writes keep their own attribute, so they stay locked even if the class-level one is ever loosened.
/// </remarks>
[ApiController]
[Route(ApiRoutes.V1 + "/imports")]
[Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
public sealed class ImportsController(ExcelImportService importService, ImportPreviewQueries queries) : ControllerBase
{
    /// <summary>Stages an Excel workbook (.xlsx or .xls) and returns its validation preview.</summary>
    /// <response code="201">The workbook was staged.</response>
    /// <response code="400">The upload was refused (missing file, extension, size or content type).</response>
    /// <response code="409">The same workbook is already staged or imported; see the importBatchId extension.</response>
    /// <response code="422">The workbook could not be processed; the import is marked Failed.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("excel")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType<ImportUploadResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> UploadExcel(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null)
        {
            return ImportProblem(StatusCodes.Status400BadRequest, "Upload refused", "Send the workbook in the multipart field 'file'.");
        }

        ImportResult result;
        await using (var content = file.OpenReadStream())
        {
            result = await importService.ImportAsync(new ExcelUpload(file.FileName, file.Length, content), cancellationToken);
        }

        return result.Outcome switch
        {
            ImportOutcome.Staged => CreatedAtAction(nameof(GetImport), new { id = result.ImportBatchId },
                new ImportUploadResponse(result.Preview!, result.Sheets)),
            ImportOutcome.Duplicate => ImportProblem(StatusCodes.Status409Conflict, "Duplicate workbook", result.Message, result),
            ImportOutcome.Failed => ImportProblem(StatusCodes.Status422UnprocessableEntity, "Workbook could not be processed", result.Message, result),
            _ => ImportProblem(StatusCodes.Status400BadRequest, "Upload refused", result.Message),
        };
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType<ImportPreview>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ImportPreview>> GetImport(long id, CancellationToken cancellationToken) =>
        await queries.GetPreviewAsync(id, cancellationToken) is { } preview ? preview : NotFound();

    /// <summary>Staged rows, paged on the server (pageSize at most 200).</summary>
    [HttpGet("{id:long}/rows")]
    [ProducesResponseType<PagedResult<ImportRowDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResult<ImportRowDto>>> GetRows(long id, [FromQuery] ImportRowQuery query, CancellationToken cancellationToken) =>
        await queries.GetRowsAsync(id, query, cancellationToken) is { } rows ? rows : NotFound();

    private ObjectResult ImportProblem(int statusCode, string title, string? detail, ImportResult? result = null)
    {
        var problem = ProblemDetailsFactory.CreateProblemDetails(HttpContext, statusCode, title, detail: detail);

        if (result?.ImportBatchId is { } importBatchId)
        {
            problem.Extensions["importBatchId"] = importBatchId;
        }

        if (result is { Sheets.Count: > 0 })
        {
            problem.Extensions["sheets"] = result.Sheets;
        }

        return new ObjectResult(problem) { StatusCode = statusCode };
    }
}
