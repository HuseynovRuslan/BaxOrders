using BaxOrders.Application.Imports;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;

namespace BaxOrders.Application.Orders;

/// <summary>
/// Money that is known. It is the sum of <c>Quantity × UnitPrice</c> over the items whose price is known, and
/// nothing else: an unknown price is never read as zero, so a total next to a non-zero
/// <c>MissingPriceItemCount</c> is a partial figure and must be shown as such.
/// </summary>
/// <param name="KnownAmountTotal">Null when no item of the set has a price at all.</param>
public sealed record KnownAmount(decimal? KnownAmountTotal, int KnownPriceItemCount, int MissingPriceItemCount);

/// <summary>
/// One location as the order browser lists it.
/// </summary>
/// <remarks>
/// Two kinds of money live here and must not be confused. <see cref="KnownAmountTotal"/> is everything the
/// location has ever ordered, across every version of every month — a lifetime figure. The
/// <c>Latest…</c> fields describe its most recent order alone, which is what a list of objects is read for:
/// what did this place order last, and how does that compare with the month before it.
/// </remarks>
/// <param name="LatestKnownAmount">The latest order's priced money; null when nothing in it carries a price.</param>
/// <param name="LatestMissingPriceItemCount">
/// Lines of the latest order somebody still owes a price for. Material issued from the company's own store is
/// not here: it carries no purchase price because none is owed, and counting it would raise a false alarm.
/// </param>
/// <param name="LatestPriceNotRequiredItemCount">Those internally supplied lines, as neutral context.</param>
/// <param name="PreviousPeriod">
/// The calendar month before the latest order. Null when the location has never ordered.
/// </param>
/// <param name="PreviousKnownAmount">
/// That month's money, or null when the location has no request for it — no difference is then offered, because
/// a month that does not exist is not a month of zero.
/// </param>
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
    int MissingPriceItemCount,
    decimal? LatestKnownAmount = null,
    int LatestItemCount = 0,
    int LatestMissingPriceItemCount = 0,
    int LatestPriceNotRequiredItemCount = 0,
    bool LatestAmountIsComplete = true,
    DateOnly? PreviousPeriod = null,
    decimal? PreviousKnownAmount = null,
    decimal? KnownAmountDelta = null,
    decimal? KnownAmountPercentChange = null);

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
/// <param name="Source">
/// The workbook row this very line was created from. Null for a line copied into a correction version — its
/// row is reached through <paramref name="SourceOrderRequestItemId"/> — and for a line added by hand.
/// </param>
/// <param name="SupplierPriceRequirement">
/// Whether this line's supplier owes a purchase price at all. A null <see cref="UnitPrice"/> means two very
/// different things depending on it: a price nobody has filled in, or material issued from the company's own
/// store that never had one. The screen must say which. A line with no supplier is reported as
/// <c>Required</c>, because nothing has said otherwise.
/// </param>
/// <param name="SourceOrderRequestItemId">The line of the previous version this one was copied from, if any.</param>
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
    SupplierPriceRequirement SupplierPriceRequirement,
    IReadOnlyList<string> CategoryPath,
    OrderItemSourceRefDto? Source,
    long? SourceOrderRequestItemId);

/// <param name="IsRevision">True when this version was made as the correction of a returned one.</param>
/// <param name="SourceOrderRequestId">The returned version this one corrects, when it is a correction.</param>
/// <param name="HasRevision">True when a correction version has been made from this one; it is then superseded.</param>
/// <param name="RevisionOrderRequestId">That correction, when there is one.</param>
/// <param name="CanCreateRevision">
/// Whether this person may correct this version now. Decided by the server, like everything else about
/// permissions; the endpoint checks again.
/// </param>
/// <param name="CanEditRevision">Whether this person may edit this version's lines now.</param>
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
    bool IsRevision,
    long? SourceOrderRequestId,
    int? SourceVersion,
    bool HasRevision,
    long? RevisionOrderRequestId,
    int? RevisionVersion,
    bool CanCreateRevision,
    bool CanEditRevision,
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

/// <summary>Where a permanent line ultimately comes from.</summary>
public enum OrderItemOrigin
{
    /// <summary>It was created by an Excel import, or copied from a line that was.</summary>
    Imported = 1,

    /// <summary>Somebody added it by hand while correcting a returned order. It has no workbook row.</summary>
    ManuallyAdded = 2,
}

/// <param name="Version">The version of the request this step's line belongs to.</param>
/// <param name="IsImported">True for the one step that has a workbook row behind it.</param>
public sealed record OrderItemLineageStepDto(
    long OrderRequestItemId,
    long OrderRequestId,
    int Version,
    OrderRequestStatus Status,
    bool IsImported);

/// <summary>
/// Where one line came from, whatever the answer is.
/// </summary>
/// <remarks>
/// A line copied into a correction has no workbook row of its own: its trail is the one of the imported line
/// it descends from, reached by following <see cref="Lineage"/>. A line somebody added by hand has no
/// workbook row anywhere behind it, which is a fact about it rather than a failure to find one — so this says
/// <see cref="OrderItemOrigin.ManuallyAdded"/> and no import block, instead of answering "not found".
/// </remarks>
/// <param name="Lineage">The line asked about, then each line it was copied from, newest first.</param>
/// <param name="Source">The workbook row behind the oldest line, or null when nobody imported it.</param>
public sealed record OrderItemProvenanceDto(
    long OrderRequestItemId,
    long OrderRequestId,
    int Version,
    OrderItemOrigin Origin,
    IReadOnlyList<OrderItemLineageStepDto> Lineage,
    OrderItemSourceDto? Source);

/// <summary>
/// The whole audit trail of one imported line: the file it came from, the row as the sheet had it, the
/// corrections an operator recorded, and what the import resolved each value to.
/// </summary>
/// <remarks>
/// <see cref="OrderRequestItemId"/> and <see cref="OrderRequestId"/> name the imported line itself, which is
/// the line that was asked about only when nothing was copied on the way.
/// </remarks>
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
