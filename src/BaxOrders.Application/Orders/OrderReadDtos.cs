using BaxOrders.Application.Imports;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Orders;

/// <summary>
/// Money that is known. It is the sum of <c>Quantity × UnitPrice</c> over the items whose price is known, and
/// nothing else: an unknown price is never read as zero, so a total next to a non-zero
/// <c>MissingPriceItemCount</c> is a partial figure and must be shown as such.
/// </summary>
/// <param name="KnownAmountTotal">Null when no item of the set has a price at all.</param>
public sealed record KnownAmount(decimal? KnownAmountTotal, int KnownPriceItemCount, int MissingPriceItemCount);

/// <summary>One location as the order browser lists it.</summary>
public sealed record LocationOrderSummaryDto(
    int LocationId,
    string Code,
    string Name,
    bool IsActive,
    int OrderRequestCount,
    int DistinctPeriodCount,
    DateOnly? EarliestPeriod,
    DateOnly? LatestPeriod,
    long? LatestRequestId,
    int? LatestRequestVersion,
    OrderRequestStatus? LatestRequestStatus,
    int TotalItemCount,
    decimal? KnownAmountTotal,
    int MissingPriceItemCount);

/// <param name="LocationsWithOrders">How many of the listed locations have at least one request.</param>
public sealed record LocationOrderListDto(
    PagedResult<LocationOrderSummaryDto> Locations,
    int LocationCount,
    int LocationsWithOrders,
    int OrderRequestCount,
    DateOnly? EarliestPeriod,
    DateOnly? LatestPeriod);

public enum LocationOrderSort
{
    Name = 1,
    LatestPeriod = 2,
    OrderRequestCount = 3,
}

public sealed record LocationOrderListQuery(
    string? Search = null,
    LocationOrderSort Sort = LocationOrderSort.Name,
    bool Descending = false,
    bool IncludeInactive = false,
    int Page = 1,
    int PageSize = 25);

/// <summary>One request of a location, as its history lists it.</summary>
public sealed record LocationOrderHistoryEntryDto(
    long OrderRequestId,
    DateOnly RequestPeriod,
    int Version,
    DateOnly? RequestDate,
    OrderRequestStatus Status,
    int ItemCount,
    int KnownPriceItemCount,
    int MissingPriceItemCount,
    decimal? KnownAmountTotal,
    DateTime CreatedAtUtc);

public sealed record LocationOrderHistoryDto(
    int LocationId,
    string Code,
    string Name,
    bool IsActive,
    int OrderRequestCount,
    int DistinctPeriodCount,
    DateOnly? EarliestPeriod,
    DateOnly? LatestPeriod,
    int TotalItemCount,
    decimal? KnownAmountTotal,
    int MissingPriceItemCount,
    IReadOnlyList<int> Years,
    PagedResult<LocationOrderHistoryEntryDto> Requests);

/// <param name="Year">Filters on <see cref="OrderRequest.RequestPeriod"/>, never on the optional request date.</param>
public sealed record LocationHistoryQuery(int? Year = null, int? Month = null, int Page = 1, int PageSize = 25);

/// <summary>The import row one permanent item came from, as far as a list needs it.</summary>
public sealed record OrderItemSourceRefDto(long ImportBatchId, long ImportRowId, string SheetName, int RowNumber);

/// <param name="OrderUnitCode">Null when the line was reviewed as having no order unit — a service.</param>
/// <param name="SpecificationDescriptor">A word from "Vahid" that is not a unit ("diş", "qat"), when there is one.</param>
/// <param name="CategoryPath">
/// The canonical category, root first. Products imported in bulk carry no category of their own, so this falls
/// back to the category resolved for the source row, which is the same kind of canonical record.
/// </param>
public sealed record OrderRequestItemDto(
    long OrderRequestItemId,
    long ProductId,
    string ProductCode,
    string ProductName,
    long ProductVariantId,
    string? SpecificationValue,
    string? SpecificationUnitCode,
    string? SpecificationUnitName,
    string? SpecificationDescriptor,
    string? ModelCode,
    string? OrderUnitCode,
    string? OrderUnitName,
    decimal Quantity,
    decimal? UnitPrice,
    decimal? LineTotal,
    int? SupplierId,
    string? SupplierName,
    IReadOnlyList<string> CategoryPath,
    OrderItemSourceRefDto? Source);

public sealed record OrderRequestDetailDto(
    long OrderRequestId,
    int LocationId,
    string LocationCode,
    string LocationName,
    DateOnly RequestPeriod,
    DateOnly? RequestDate,
    int Version,
    OrderRequestStatus Status,
    DateTime CreatedAtUtc,
    long? SourceImportBatchId,
    int ItemCount,
    int KnownPriceItemCount,
    int MissingPriceItemCount,
    decimal? KnownAmountTotal,
    PagedResult<OrderRequestItemDto> Items);

/// <param name="Search">Matches the product name, the product code or the model code.</param>
/// <param name="HasPrice">True lists only priced items, false only the ones with no price.</param>
public sealed record OrderItemQuery(
    string? Search = null,
    int? SupplierId = null,
    bool? HasPrice = null,
    int Page = 1,
    int PageSize = 50);

/// <summary>One cell of the source row: what the sheet said, what the import works with, what it resolved to.</summary>
/// <param name="SourceValue">The workbook value, exactly as staged. Never changed by a correction.</param>
/// <param name="EffectiveValue">The corrected value where an operator entered one, otherwise the source value.</param>
/// <param name="CanonicalValue">The catalog record the value was resolved to, when the column has one.</param>
public sealed record OrderItemSourceFieldDto(
    string Column,
    string? SourceValue,
    string? EffectiveValue,
    bool IsCorrected,
    bool IsIntentionallyEmpty,
    string? CanonicalValue);

/// <summary>
/// The whole audit trail of one permanent item: the file it came from, the row as the sheet had it, the
/// corrections an operator recorded, and what the import resolved each value to.
/// </summary>
public sealed record OrderItemSourceDto(
    long OrderRequestItemId,
    long OrderRequestId,
    DateTime MaterializedAtUtc,
    long ImportBatchId,
    string ImportFileName,
    ImportStatus ImportStatus,
    long ImportRowId,
    string SheetName,
    int RowNumber,
    bool IsExcluded,
    string? OriginalLineTotal,
    decimal? CalculatedLineTotal,
    IReadOnlyList<OrderItemSourceFieldDto> Fields);
