using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Application.Imports;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

public sealed record MapResolutionRequest(ImportResolutionKind Kind, string SourceKey, long TargetId, ResolutionScope Scope);

public sealed record CreateLocationRequest(string SourceKey, string Name, ResolutionScope Scope);

public sealed record CreateSupplierRequest(string SourceKey, string Name, string? Code, ResolutionScope Scope);

public sealed record CreateResponsiblePersonRequest(string SourceKey, string Name, ResolutionScope Scope);

public sealed record CreateUnitRequest(
    ImportResolutionKind Kind,
    string SourceKey,
    string Code,
    string Name,
    string? Symbol,
    UnitType UnitType,
    ResolutionScope Scope);

public sealed record CreateCategoryPathRequest(string SourceKey);

/// <param name="Kind">Only a unit column: "Ö/v" (OrderUnit) or "Vahid" (SpecificationUnit).</param>
public sealed record MarkNotAUnitRequest(ImportResolutionKind Kind, string SourceKey);

/// <param name="CategoryId">The category the operator picked, if any. Nothing is chosen automatically.</param>
public sealed record CreateProductRequest(string SourceKey, string Name, int? CategoryId, ResolutionScope Scope);

/// <summary>The variant is built from the decisions the rows already carry, so only the value is named.</summary>
public sealed record CreateProductVariantRequest(string SourceKey);

/// <summary>
/// Import review: distinct unresolved values and the decisions an operator makes about them.
/// One decision is applied to every staged row of the batch with the same value.
/// </summary>
[ApiController]
[Route(ApiRoutes.V1 + "/imports/{id:long}")]
public sealed class ImportReviewController(
    ImportReviewQueries queries,
    ImportResolutionService resolutions,
    BulkResolutionService bulkResolutions) : ControllerBase
{
    /// <summary>How many distinct values of each kind still need a decision, and how many rows they affect.</summary>
    [HttpGet("unresolved/summary")]
    [ProducesResponseType<IReadOnlyList<UnresolvedSummaryItem>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<UnresolvedSummaryItem>>> GetSummary(long id, CancellationToken cancellationToken) =>
        await queries.GetSummaryAsync(id, cancellationToken) is { } summary ? Ok(summary) : NotFound();

    /// <summary>Distinct unresolved values of one kind, with affected row counts and sample context.</summary>
    [HttpGet("unresolved")]
    [ProducesResponseType<PagedResult<UnresolvedValue>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<UnresolvedValue>>> GetUnresolved(long id, [FromQuery] UnresolvedQuery query, CancellationToken cancellationToken) =>
        await queries.GetUnresolvedAsync(id, query, cancellationToken) is { } page ? Ok(page) : NotFound();

    /// <summary>Which levels of an unresolved category path exist and which would be created.</summary>
    [HttpGet("unresolved/category-path")]
    [ProducesResponseType<CategoryPathPlan>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CategoryPathPlan>> GetCategoryPathPlan(long id, [FromQuery] string sourceKey, CancellationToken cancellationToken) =>
        await queries.GetCategoryPathPlanAsync(id, sourceKey, cancellationToken) is { } plan ? Ok(plan) : NotFound();

    /// <summary>What creating this variant would produce, and what still blocks it.</summary>
    [HttpGet("unresolved/product-variant")]
    [ProducesResponseType<VariantPlan>(StatusCodes.Status200OK)]
    public async Task<ActionResult<VariantPlan>> GetVariantPlan(long id, [FromQuery] string sourceKey, CancellationToken cancellationToken) =>
        await queries.GetVariantPlanAsync(id, sourceKey, cancellationToken) is { } plan ? Ok(plan) : NotFound();

    /// <summary>
    /// What a bulk decision would do: per value the action, the target, conflicts and dependencies, plus the
    /// totals the confirmation screen shows. Nothing is written.
    /// </summary>
    /// <response code="400">Too many values, a duplicate value, or an action this kind does not allow.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("review/bulk/preview")]
    [ProducesResponseType<BulkPreviewResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public Task<BulkPreviewResult> PreviewBulk(long id, BulkResolutionRequest request, CancellationToken cancellationToken) =>
        bulkResolutions.PreviewAsync(id, request, cancellationToken);

    /// <summary>
    /// Applies the confirmed decisions as one operation. The plan is built again under the batch lock, and if
    /// any value is in conflict nothing at all is written.
    /// </summary>
    /// <response code="400">The request itself is not valid.</response>
    /// <response code="409">At least one value conflicts; the answer lists them in 'items'.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("review/bulk/apply")]
    [ProducesResponseType<BulkApplyResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public Task<BulkApplyResult> ApplyBulk(long id, BulkResolutionRequest request, CancellationToken cancellationToken) =>
        bulkResolutions.ApplyAsync(id, request, cancellationToken);

    /// <summary>Maps a distinct value to an existing canonical record.</summary>
    /// <response code="409">The value is already resolved to another record, or the alias would be ambiguous.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("resolutions/map")]
    [ProducesResponseType<ResolutionResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public Task<ResolutionResult> MapToExisting(long id, MapResolutionRequest request, CancellationToken cancellationToken)
    {
        var command = new ResolveToExistingCommand(id, request.SourceKey, request.TargetId, request.Scope);

        return request.Kind switch
        {
            ImportResolutionKind.Location => resolutions.ResolveLocationToExistingAsync(command, cancellationToken),
            ImportResolutionKind.Supplier => resolutions.ResolveSupplierToExistingAsync(command, cancellationToken),
            ImportResolutionKind.ResponsiblePerson => resolutions.ResolveResponsiblePersonToExistingAsync(command, cancellationToken),
            ImportResolutionKind.OrderUnit or ImportResolutionKind.SpecificationUnit => resolutions.ResolveUnitToExistingAsync(request.Kind, command, cancellationToken),
            ImportResolutionKind.CategoryPath => resolutions.ResolveCategoryPathToExistingAsync(command, cancellationToken),
            ImportResolutionKind.Product => resolutions.ResolveProductToExistingAsync(command, cancellationToken),
            ImportResolutionKind.ProductVariant => resolutions.ResolveProductVariantToExistingAsync(command, cancellationToken),
            _ => throw new DomainException($"{request.Kind} values cannot be resolved yet."),
        };
    }

    /// <summary>
    /// Records that a value standing in a unit column is not a unit of measure. Nothing is created: in "Vahid"
    /// the word stays with the specification as a descriptor ("28 diş"), in "Ö/v" the rows become explicitly
    /// unitless. The workbook value is kept as it was.
    /// </summary>
    /// <response code="409">The value is already resolved to a real unit in this import.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("resolutions/not-a-unit")]
    [ProducesResponseType<ResolutionResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public Task<ResolutionResult> MarkNotAUnit(long id, MarkNotAUnitRequest request, CancellationToken cancellationToken) =>
        resolutions.MarkNotAUnitAsync(new MarkNotAUnitCommand(id, request.Kind, request.SourceKey), cancellationToken);

    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("resolutions/locations")]
    [ProducesResponseType<ResolutionResult>(StatusCodes.Status200OK)]
    public Task<ResolutionResult> CreateLocation(long id, CreateLocationRequest request, CancellationToken cancellationToken) =>
        resolutions.CreateLocationAsync(new CreateLocationCommand(id, request.SourceKey, request.Name, request.Scope), cancellationToken);

    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("resolutions/suppliers")]
    [ProducesResponseType<ResolutionResult>(StatusCodes.Status200OK)]
    public Task<ResolutionResult> CreateSupplier(long id, CreateSupplierRequest request, CancellationToken cancellationToken) =>
        resolutions.CreateSupplierAsync(new CreateSupplierCommand(id, request.SourceKey, request.Name, request.Code, request.Scope), cancellationToken);

    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("resolutions/responsible-people")]
    [ProducesResponseType<ResolutionResult>(StatusCodes.Status200OK)]
    public Task<ResolutionResult> CreateResponsiblePerson(long id, CreateResponsiblePersonRequest request, CancellationToken cancellationToken) =>
        resolutions.CreateResponsiblePersonAsync(new CreateResponsiblePersonCommand(id, request.SourceKey, request.Name, request.Scope), cancellationToken);

    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("resolutions/units")]
    [ProducesResponseType<ResolutionResult>(StatusCodes.Status200OK)]
    public Task<ResolutionResult> CreateUnit(long id, CreateUnitRequest request, CancellationToken cancellationToken) =>
        resolutions.CreateUnitAsync(
            new CreateUnitCommand(id, request.Kind, request.SourceKey, request.Code, request.Name, request.Symbol, request.UnitType, request.Scope),
            cancellationToken);

    /// <summary>Creates the missing levels of a category path and reuses the levels that already exist.</summary>
    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("resolutions/category-paths")]
    [ProducesResponseType<ResolutionResult>(StatusCodes.Status200OK)]
    public Task<ResolutionResult> CreateCategoryPath(long id, CreateCategoryPathRequest request, CancellationToken cancellationToken) =>
        resolutions.CreateCategoryPathAsync(new CreateCategoryPathCommand(id, request.SourceKey), cancellationToken);

    /// <summary>Creates a new base product for one unresolved name.</summary>
    /// <response code="409">The name already belongs to a product or to one of its aliases.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("resolutions/products")]
    [ProducesResponseType<ResolutionResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public Task<ResolutionResult> CreateProduct(long id, CreateProductRequest request, CancellationToken cancellationToken) =>
        resolutions.CreateProductAsync(
            new CreateProductCommand(id, request.SourceKey, request.Name, request.CategoryId, request.Scope),
            cancellationToken);

    /// <summary>Creates the variant the staged rows describe, from the product and units already resolved.</summary>
    /// <response code="409">A decision it depends on is missing, or the variant already exists.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost("resolutions/product-variants")]
    [ProducesResponseType<ResolutionResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public Task<ResolutionResult> CreateProductVariant(long id, CreateProductVariantRequest request, CancellationToken cancellationToken) =>
        resolutions.CreateProductVariantAsync(new CreateProductVariantCommand(id, request.SourceKey), cancellationToken);
}
