using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Catalog;

/// <summary>
/// One month of one product's ordering, with the two kinds of demand kept apart.
/// </summary>
/// <remarks>
/// <c>Monthly*</c> is the month's planned material and the only population any figure about frequency or
/// average demand is built from — see <c>MonthlyComparisonPopulation</c>. <c>OutsideMonthly*</c> is what was
/// bought on top of the plan: real spend, shown because it happened, and deliberately outside every average,
/// because a pump that broke once is not a product the company orders every month.
/// </remarks>
public sealed record ProductHistoryMonthDto(
    DateOnly Period,
    decimal MonthlyQuantity,
    decimal? MonthlyKnownAmount,
    int MonthlyLineCount,
    decimal OutsideMonthlyQuantity,
    decimal? OutsideMonthlyKnownAmount,
    int OutsideMonthlyLineCount,
    int UnclassifiedLineCount,
    int LocationCount);

/// <param name="VariantLabel">The specification, model and order unit that tell this line's variant apart.</param>
/// <param name="ResponsiblePersonName">Whose line it was. Null only where the source never said.</param>
public sealed record ProductHistoryLineDto(
    long OrderRequestItemId,
    long OrderRequestId,
    DateOnly Period,
    int LocationId,
    string LocationName,
    string VariantLabel,
    decimal Quantity,
    decimal? UnitPrice,
    decimal? KnownAmount,
    OrderLineType OrderLineType,
    string? ResponsiblePersonName);

/// <summary>
/// What one product has cost the company, month by month, and every line behind it.
/// </summary>
/// <param name="MonthsOrdered">
/// Months in which the company ordered this as planned material. The measure of "do we order this every
/// month", so one-off purchases are not counted: they would make an article the company bought once look
/// like one it buys always.
/// </param>
/// <param name="AverageMonthlyQuantity">
/// The mean quantity of the months it was ordered in — again planned material alone, and null when it has
/// never been ordered as such.
/// </param>
/// <param name="OutsideMonthlyLineCount">How many times it was bought outside a plan, over the whole history.</param>
public sealed record ProductHistoryDto(
    long ProductId,
    string Code,
    string Name,
    bool IsActive,
    int MonthsOrdered,
    decimal? AverageMonthlyQuantity,
    DateOnly? FirstOrderedPeriod,
    DateOnly? LastOrderedPeriod,
    decimal? MonthlyKnownAmountTotal,
    decimal? OutsideMonthlyKnownAmountTotal,
    int OutsideMonthlyLineCount,
    int UnclassifiedLineCount,
    IReadOnlyList<ProductHistoryMonthDto> Months,
    IReadOnlyList<ProductHistoryLineDto> Lines);

/// <param name="MaxLines">How many of the most recent lines to return. The months are always whole.</param>
public sealed record ProductHistoryQuery(int MaxLines = 200);
