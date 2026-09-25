using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Imports.Pricing;

/// <summary>
/// One staged row with no price, and what the review has said about it so far.
/// </summary>
/// <remarks>
/// The context is the same Qiymət təsnifatı shows for a line, because it is the same decision: which object, which
/// month, what the workbook's supplier cell said. Names are the catalogue's where the row is matched, and the
/// effective workbook text (after corrections) where it is not.
/// </remarks>
/// <param name="LocationName">The matched location's name, or the effective workbook text.</param>
/// <param name="ProductName">The matched product's name, or the effective workbook text.</param>
/// <param name="SupplierName">The matched supplier's name. Null when the row matched none.</param>
/// <param name="WorkbookSupplierName">What the workbook's supplier cell says, after corrections.</param>
/// <param name="Classification">
/// Null when nobody has classified the row: it becomes «Təsnif edilməyib» once imported. Otherwise
/// <see cref="PricingMode.PriceRequired"/> or <see cref="PricingMode.InternalFreeSupply"/>.
/// </param>
public sealed record ImportPricingRowDto(
    long ImportRowId,
    string SheetName,
    int RowNumber,
    string? LocationName,
    DateOnly? RequestPeriod,
    string? ProductName,
    string? SpecificationValue,
    string? OrderUnit,
    decimal? Quantity,
    string? SupplierName,
    string? WorkbookSupplierName,
    PricingMode? Classification,
    string? ClassifiedByDisplayName,
    DateTime? ClassifiedAtUtc);

/// <param name="TotalCount">How many rows the filter and the search leave — what the pager paces.</param>
/// <param name="Unclassified">
/// The batch's unpriced rows still part of the import that nobody classified, whatever the filter and the search.
/// </param>
/// <param name="PriceRequired">Those classified as bought.</param>
/// <param name="InternalFreeSupply">Those classified as supplied free.</param>
public sealed record ImportPricingReviewDto(
    IReadOnlyList<ImportPricingRowDto> Rows,
    int TotalCount,
    int Unclassified,
    int PriceRequired,
    int InternalFreeSupply);

/// <param name="Mode">
/// Which rows to list: <see cref="PricingMode.Unresolved"/> for those nobody classified, or one of the two
/// classifications. <b>Null means all of them.</b>
/// </param>
public sealed record ImportPricingQuery(
    PricingMode? Mode = null,
    string? Search = null,
    int Page = 1,
    int PageSize = ImportPricingService.DefaultPageSize);

/// <param name="ImportRowIds">The rows, named one by one. There is no "every row of this supplier".</param>
/// <param name="PricingMode">
/// <see cref="Domain.Orders.PricingMode.PriceRequired"/> or <see cref="Domain.Orders.PricingMode.InternalFreeSupply"/>;
/// <see cref="Domain.Orders.PricingMode.Unresolved"/> takes the classification away again.
/// </param>
public sealed record SetImportPricingCommand(IReadOnlyList<long> ImportRowIds, PricingMode PricingMode);

/// <param name="Preview">The refreshed import preview, as every review write returns it.</param>
public sealed record ImportPricingResult(int Changed, int Unchanged, PricingMode PricingMode, ImportPreview Preview);
