using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Orders.Pricing;

/// <summary>
/// One unpriced line waiting for somebody to say how it was supplied, with everything they need to decide.
/// </summary>
/// <remarks>
/// The context here is not decoration. Nobody can tell a bought line from a free one by looking at a product
/// name: the answer lives in which object ordered it, when, from which source, and what the workbook actually
/// said. The provenance fields are the ones that settled it for the Azpetrol lines, so they travel with the row.
/// </remarks>
public sealed record PricingModeReviewRowDto(
    long OrderRequestItemId,
    long OrderRequestId,
    DateOnly RequestPeriod,
    int LocationId,
    string LocationName,
    long ProductVariantId,
    string ProductCode,
    string ProductName,
    string? SpecificationValue,
    string? SpecificationDescriptor,
    string? OrderUnitCode,
    decimal Quantity,
    int? SupplierId,
    string? SupplierName,
    /// <summary>What the workbook cell actually held, which is often the only record of the real source.</summary>
    string? WorkbookSupplierName,
    long? ImportRowId,
    string? SheetName,
    int? RowNumber,
    PricingMode PricingMode);

/// <param name="TotalCount">
/// How many rows the filter and the search leave — what the pager paces. Not the size of the whole queue:
/// a footer counting 95 while the table shows one row offers a "next page" that is not there.
/// </param>
/// <param name="Unresolved">Lines nobody has classified. The queue this screen exists to empty.</param>
/// <param name="MissingRequiredPrice">Lines somebody has said are bought and has not priced.</param>
/// <param name="InternalFreeSupply">Lines somebody has said the company supplies itself.</param>
public sealed record PricingModeReviewDto(
    IReadOnlyList<PricingModeReviewRowDto> Rows,
    int TotalCount,
    int Unresolved,
    int MissingRequiredPrice,
    int InternalFreeSupply);

/// <param name="Mode">
/// Which classification to list. <b>Null means all of them</b> — the screen's "Hamısı" tab, which has to be
/// expressible. Defaulting this to <see cref="PricingMode.Unresolved"/> made "Hamısı" silently show the
/// unresolved ones and count 94 of 95; the screen opens on that tab by asking for it, not by omitting it.
/// </param>
public sealed record PricingModeReviewQuery(
    PricingMode? Mode = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 50);

/// <param name="Reason">Why, in the decider's own words. Optional, and kept verbatim.</param>
public sealed record SetPricingModeCommand(
    IReadOnlyList<long> OrderRequestItemIds,
    PricingMode PricingMode,
    string? Reason = null);

public sealed record SetPricingModeResultDto(int Changed, int Unchanged, PricingMode PricingMode);
