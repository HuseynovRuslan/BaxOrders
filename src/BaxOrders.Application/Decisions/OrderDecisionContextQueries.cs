using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Decisions;

/// <summary>
/// What one order costs, how it differs from the month before, and why — read only, and for the exact version
/// it was asked about.
/// </summary>
/// <remarks>
/// <para>
/// Six queries regardless of how many products an order has: the request itself, the months the company has
/// orders for, the requests of every month any basis looks at, the approved spelling matches, the lines of all
/// those requests, and the variants that appear in them. Nothing iterates over products to fetch anything, and
/// nothing here writes — not a row, not a counter, not a log.
/// </para>
/// <para>
/// <b>The comparison is whichever one the reader chose</b>, and it arrives with the request. A manager who
/// picked "Son 3 ayın ortalaması" on the dashboard and followed a card here sees the three-month figure as
/// the headline and the three-month reason under it — not last month's, with the three-month number demoted
/// to a footnote. The other bases are still computed and shown beside it, small, as context.
/// </para>
/// <para>
/// The arithmetic is <see cref="PeriodComparison"/>, the very same call the dashboard makes. That is the
/// whole point: for one location, one month and one basis the two screens cannot disagree, because there is
/// only one formula to disagree about.
/// </para>
/// <para>
/// The current side is the opened version's own lines. The baseline side is the previous month's <i>highest</i>
/// version, which is the policy every other analytics screen follows, so the same two months compared here and
/// on the comparison screen give the same answer.
/// </para>
/// </remarks>
public sealed class OrderDecisionContextQueries(IBaxOrdersDbContext db)
{
    /// <summary>Every basis the screen offers, in the order a reader meets them.</summary>
    private static readonly AnalyticsComparisonBasis[] Offered =
    [
        AnalyticsComparisonBasis.PreviousMonth,
        AnalyticsComparisonBasis.Previous3MonthAverage,
        AnalyticsComparisonBasis.Previous6MonthAverage,
        AnalyticsComparisonBasis.AllPriorMonths,
    ];

    /// <param name="query">
    /// What to compare against. Its default is the previous month, so a link from the monthly report — which
    /// is a month-to-month reading — keeps comparing month to month.
    /// </param>
    /// <returns>Null when there is no such request.</returns>
    public async Task<OrderDecisionContextDto?> GetAsync(
        long orderRequestId, DecisionContextQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        var order = await db.OrderRequests.AsNoTracking()
            .Where(request => request.Id == orderRequestId)
            .Select(request => new OrderRef(
                request.Id,
                request.LocationId,
                request.Location.Code,
                request.Location.Name,
                request.RequestPeriod,
                request.Version,
                request.Status,
                db.OrderRequests
                    .Where(other => other.LocationId == request.LocationId
                        && other.RequestPeriod == request.RequestPeriod)
                    .OrderByDescending(other => other.Version)
                    .Select(other => (long?)other.Id)
                    .FirstOrDefault(),
                db.OrderRequests
                    .Where(other => other.LocationId == request.LocationId
                        && other.RequestPeriod == request.RequestPeriod)
                    .Max(other => (int?)other.Version)))
            .FirstOrDefaultAsync(cancellationToken);

        if (order is null)
        {
            return null;
        }

        // The range is checked against this order's own month, which is why it is resolved here and not in
        // the controller: a window that reached into the month being decided would compare it with itself.
        var selection = query.SelectionFor(order.Period);

        // "Every prior month" is a fact about the company's data rather than about the calendar, so it is
        // asked for — one row per month anybody has ordered in, which is a handful of rows. The same
        // definition the dashboard uses, so the two agree about what "Bütün dövr" covers.
        var companyPeriods = await db.OrderRequests.AsNoTracking()
            .Where(request => request.RequestPeriod < order.Period)
            .Select(request => request.RequestPeriod)
            .Distinct()
            .ToListAsync(cancellationToken);

        // Every basis the screen will show, resolved to its months. The chosen one is first.
        var selections = new List<ComparisonSelection> { selection };
        selections.AddRange(Offered
            .Where(basis => basis != selection.Basis)
            .Select(ComparisonSelection.Of));

        var windows = selections
            .Select(item => (Selection: item,
                Periods: BaselineWindow.PeriodsFor(order.Period, item, companyPeriods)))
            .ToList();

        // One query for the requests of every month any basis looks at, however many bases that is.
        var wanted = windows.SelectMany(item => item.Periods).Distinct().ToArray();
        var baseline = await db.OrderRequests.AsNoTracking()
            .Where(request => request.LocationId == order.LocationId
                && wanted.Contains(request.RequestPeriod)
                && !db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version))
            .Select(request => new DecisionPeriodDto(
                request.RequestPeriod, request.Id, request.Version, request.Status))
            .ToListAsync(cancellationToken);

        long[] requestIds = [order.OrderRequestId, .. baseline.Select(request => request.OrderRequestId)];

        // An approved spelling match is one product from here on: the drivers, the steady products, the categories
        // and the product counts all see the kept spelling only (13b). With none, the snapshots are as read.
        var fold = await SpellingFold.ReadAsync(db, cancellationToken);
        var snapshots = fold.Apply(await SnapshotsAsync(requestIds, cancellationToken));

        var currentSnapshots = snapshots.GetValueOrDefault(order.OrderRequestId) ?? [];
        var current = AmountOf(currentSnapshots.Values);

        // Product metadata for every variant in play, fetched once: it carries both the material-or-service
        // kind the comparison needs and the names the driver rows show.
        var variantIds = snapshots.Values.SelectMany(byVariant => byVariant.Keys).Distinct().ToArray();
        var variants = await VariantsAsync(variantIds, cancellationToken);
        var kinds = variants.ToDictionary(entry => entry.Key, entry => entry.Value.Kind);

        var comparisons = windows
            .Select(item => Compare(item.Selection, item.Periods, order, baseline, snapshots, currentSnapshots, kinds))
            .ToList();

        var primary = comparisons[0];
        var decomposition = primary.Result.Decomposition is null
            ? null
            : Explain(primary.Result.Decomposition, variants, primary.Dto.AvailablePeriodCount, currentSnapshots);

        return new OrderDecisionContextDto(
            order.OrderRequestId,
            order.LocationId,
            order.LocationCode,
            order.LocationName,
            order.Period,
            order.Version,
            order.Status,
            order.LatestVersion == order.Version,
            order.LatestOrderRequestId,
            order.LatestVersion,
            current,
            primary.Dto,
            [.. comparisons.Skip(1).Select(item => item.Dto)],
            decomposition);
    }

    /// <summary>One basis, measured through the shared comparison the dashboard also calls.</summary>
    private static (DecisionComparisonDto Dto, PeriodComparisonResult Result) Compare(
        ComparisonSelection selection,
        IReadOnlyList<DateOnly> periods,
        OrderRef order,
        List<DecisionPeriodDto> baseline,
        Dictionary<long, Dictionary<long, VariantPeriodSnapshot>> snapshots,
        Dictionary<long, VariantPeriodSnapshot> currentSnapshots,
        Dictionary<long, AnalyticsKind> kinds)
    {
        var available = baseline
            .Where(request => periods.Contains(request.Period))
            .OrderBy(request => request.Period)
            .ToList();

        var baselineByVariant = PeriodComparison.GroupBaseline(
            available.Select(request => request.OrderRequestId), snapshots);

        var result = PeriodComparison.Of(currentSnapshots, baselineByVariant, available.Count, kinds);

        var dto = new DecisionComparisonDto(
            selection.Basis,
            selection.CustomStart,
            selection.CustomEnd,
            periods,
            periods.Count,
            available.Count,
            [.. periods.Where(period => !available.Any(request => request.Period == period))],
            available,
            available.Count > 0,
            result.BaselineKnownAmount,
            result.KnownAmountDelta,
            result.KnownAmountPercentChange,
            result.CurrentTotals.IsComplete && result.BaselineTotals.IsComplete,
            result.BaselineTotals.MissingRequiredPriceItemCount);

        return (dto, result);
    }

    // ---- the explanation ----------------------------------------------------------------------------

    /// <summary>
    /// The shared decomposition, dressed with the product names a reader needs, and split into the products that
    /// are a reason (<c>Drivers</c>) and the ones that are not (<c>Steady</c>).
    /// </summary>
    /// <remarks>
    /// Together the two lists are every compared product, so the order page can show everything the old
    /// comparison page showed without a second calculation. The counts are taken over both, as the comparison
    /// page takes them over its rows.
    /// </remarks>
    /// <param name="availablePeriodCount">The primary window's months that have a request — the state rule's divisor.</param>
    /// <param name="currentSnapshots">The opened order's own products, counted for the screen.</param>
    private static DecisionDecompositionDto Explain(
        CauseDecompositionResult result,
        Dictionary<long, VariantRef> variants,
        int availablePeriodCount,
        Dictionary<long, VariantPeriodSnapshot> currentSnapshots)
    {
        var drivers = new List<DecisionDriverDto>(result.Variants.Count);
        var steady = new List<DecisionDriverDto>();
        int compared = 0, added = 0, dropped = 0, increased = 0, decreased = 0, services = 0;
        foreach (var variant in result.Variants)
        {
            if (!variants.TryGetValue(variant.ProductVariantId, out var identity))
            {
                continue;
            }

            // The comparison page's own rule on the comparison page's own figures: the decomposition's baseline
            // quantity is the same average month, so the two pages cannot label one product two ways.
            var state = OrderAnalyticsCalculator.StateOf(
                variant.Kind, variant.CurrentQuantity, variant.BaselineQuantity, availablePeriodCount);

            compared++;
            added += state == ComparisonState.New ? 1 : 0;
            dropped += state == ComparisonState.NoLongerOrdered ? 1 : 0;
            increased += state == ComparisonState.Increased ? 1 : 0;
            decreased += state == ComparisonState.Decreased ? 1 : 0;
            services += variant.Kind == AnalyticsKind.AmountOrientedService ? 1 : 0;

            // A variant that moved no money is not a reason for anything, so it is steady rather than a driver.
            // One whose price is unknown is a driver even so: it moved nothing that can be seen, which is
            // precisely what the reader has to be told. One that appeared or disappeared is a driver too — a new
            // material issued from the company's own store costs nothing and is still a change — or the list
            // could never hold every product the "Yeni məhsullar" count says is new. A steady product can still
            // be up or down by quantity: internal supply whose quantity moved costs nothing either way.
            var isSteady = variant.PriceIsComplete
                && variant.AmountImpact == 0m
                && variant.QuantityImpact is null or 0m
                && variant.PriceImpact is null or 0m
                && state is not (ComparisonState.New or ComparisonState.NoLongerOrdered);

            (isSteady ? steady : drivers).Add(new DecisionDriverDto(
                identity.Identity,
                variant.Kind,
                variant.Category,
                variant.AmountImpact,
                variant.QuantityImpact,
                variant.PriceImpact,
                variant.CurrentQuantity,
                variant.BaselineQuantity,
                variant.QuantityPercentChange,
                variant.CurrentUnitPrice,
                variant.BaselineUnitPrice,
                variant.UnitPricePercentChange,
                variant.CurrentKnownAmount,
                variant.BaselineKnownAmount,
                variant.CurrentItemCount,
                variant.BaselineItemCount,
                variant.MissingRequiredPriceItemCount,
                variant.PriceNotRequiredItemCount,
                variant.PriceIsComplete,
                variant.SupplyChanged,
                state));
        }

        return new DecisionDecompositionDto(
            [.. result.Categories.Select(category =>
                new DecisionCauseDto(category.Category, category.Amount, category.VariantCount))],
            result.TotalAmountImpact,
            result.ExplanationIsComplete,
            result.UnattributedVariantCount,
            result.InternalSupplyVariantCount,
            result.SupplyChangedVariantCount,
            drivers,
            new DecisionProductCountsDto(
                compared,
                currentSnapshots.Keys.Count(variants.ContainsKey),
                added,
                dropped,
                drivers.Count,
                increased,
                decreased,
                services),
            // Their money is zero, so impact cannot order them; the name can, as the comparison page did.
            [.. steady
                .OrderBy(product => product.Variant.ProductName, StringComparer.OrdinalIgnoreCase)
                .ThenBy(product => product.Variant.ProductVariantId)]);
    }


    // ---- reading ------------------------------------------------------------------------------------

    /// <summary>One row per request and variant, from the permanent lines. Reads only.</summary>
    private async Task<Dictionary<long, Dictionary<long, VariantPeriodSnapshot>>> SnapshotsAsync(
        long[] requestIds, CancellationToken cancellationToken)
    {
        var rows = await db.OrderRequestItems.AsNoTracking()
            .Where(item => requestIds.Contains(item.OrderRequestId))
            .GroupBy(item => new { item.OrderRequestId, item.ProductVariantId })
            .Select(group => new
            {
                group.Key.OrderRequestId,
                group.Key.ProductVariantId,
                Quantity = group.Sum(item => item.Quantity),
                ItemCount = group.Count(),
                KnownPriceItemCount = group.Count(item => item.UnitPrice != null),
                // A price is only missing when it was owed, and the line itself says whether it was — see
                // PricingMode for why no property of the supplier can answer that. A line nobody has classified
                // counts as owed: the cautious reading is the one that cannot hide a real gap.
                MissingRequiredPriceItemCount = group.Count(item => item.UnitPrice == null
                    && item.PricingMode != PricingMode.InternalFreeSupply),
                PriceNotRequiredItemCount = group.Count(item => item.UnitPrice == null
                    && item.PricingMode == PricingMode.InternalFreeSupply),
                PricedQuantity = group.Sum(item => item.UnitPrice == null ? 0m : item.Quantity),
                PricedAmount = group.Sum(item => item.Quantity * (item.UnitPrice ?? 0m)),
            })
            .ToListAsync(cancellationToken);

        var byRequest = new Dictionary<long, Dictionary<long, VariantPeriodSnapshot>>();
        foreach (var row in rows)
        {
            if (!byRequest.TryGetValue(row.OrderRequestId, out var byVariant))
            {
                byRequest[row.OrderRequestId] = byVariant = [];
            }

            byVariant[row.ProductVariantId] = new VariantPeriodSnapshot(
                row.ProductVariantId, row.Quantity, row.ItemCount, row.KnownPriceItemCount,
                row.MissingRequiredPriceItemCount, row.PriceNotRequiredItemCount,
                row.PricedQuantity, row.PricedAmount);
        }

        return byRequest;
    }

    private async Task<Dictionary<long, VariantRef>> VariantsAsync(
        long[] variantIds, CancellationToken cancellationToken)
    {
        if (variantIds.Length == 0)
        {
            return [];
        }

        var rows = await db.ProductVariants.AsNoTracking()
            .Where(variant => variantIds.Contains(variant.Id))
            .Select(variant => new
            {
                variant.Id,
                variant.ProductId,
                ProductCode = variant.Product.Code,
                ProductName = variant.Product.Name,
                variant.SpecificationValue,
                SpecificationUnitCode = variant.SpecificationUnit != null ? variant.SpecificationUnit.Code : null,
                SpecificationUnitName = variant.SpecificationUnit != null ? variant.SpecificationUnit.Name : null,
                variant.SpecificationDescriptor,
                variant.ModelCode,
                OrderUnitCode = variant.OrderUnit != null ? variant.OrderUnit.Code : null,
                OrderUnitName = variant.OrderUnit != null ? variant.OrderUnit.Name : null,
            })
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(
            row => row.Id,
            row => new VariantRef(
                new VariantIdentityDto(
                    row.Id, row.ProductId, row.ProductCode, row.ProductName,
                    row.SpecificationValue, row.SpecificationUnitCode, row.SpecificationUnitName,
                    row.SpecificationDescriptor, row.ModelCode, row.OrderUnitCode, row.OrderUnitName),
                AnalyticsUnits.KindOf(row.OrderUnitCode)));
    }

    private static DecisionAmountDto AmountOf(IEnumerable<VariantPeriodSnapshot> snapshots)
    {
        var totals = OrderAnalyticsCalculator.Totals(snapshots);

        return new DecisionAmountDto(
            OrderAnalyticsCalculator.KnownAmount(totals),
            totals.ItemCount,
            totals.KnownPriceItemCount,
            totals.MissingRequiredPriceItemCount,
            totals.PriceNotRequiredItemCount,
            totals.IsComplete);
    }

    private sealed record OrderRef(
        long OrderRequestId,
        int LocationId,
        string LocationCode,
        string LocationName,
        DateOnly Period,
        int Version,
        OrderRequestStatus Status,
        long? LatestOrderRequestId,
        int? LatestVersion);

    private sealed record VariantRef(VariantIdentityDto Identity, AnalyticsKind Kind);
}
