using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Domain.Orders;
using BaxOrders.Application.Decisions;
using BaxOrders.Application.Imports;
using BaxOrders.Application.Locations;
using BaxOrders.Application.Orders;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Analytics.Dashboard;

/// <summary>
/// The company's month, one row per location.
/// </summary>
/// <remarks>
/// This is not the location comparison run once per location. Every location's months are fetched together —
/// six queries whatever the number of objects (the universe, the requests, the last orders, the approved product
/// matches of both kinds in one query, the lines and the variants), and a seventh for "every prior month" — and the
/// comparison itself is the
/// very same <see cref="OrderAnalyticsCalculator"/> the location screen uses, so the dashboard and the screen cannot
/// drift apart. Nothing here writes.
/// <para>
/// Three facts about a location are kept apart, because they are three different situations and collapsing
/// any two of them would misreport the object: it has no request this month; it has one but no history to
/// compare it with; it has both.
/// </para>
/// </remarks>
public sealed class ManagementDashboardQueries(IBaxOrdersDbContext db)
{
    public const int DefaultPageSize = 25;

    /// <summary>How many objects the attention section may name at once before it stops being a shortlist.</summary>
    private const int MaxAttention = 8;

    /// <summary>How many each movement signal may contribute, so no single signal fills the whole section.</summary>
    private const int PerReason = 2;

    /// <summary>
    /// How many each warning signal contributes. Its title cannot rank — "the object with the second-most
    /// missing prices" is not why anybody looks — so a second card would only repeat the first one's title, and
    /// every object of the group is one chip away.
    /// </summary>
    private const int PerWarning = 1;

    /// <summary>A movement worth reading as a proportion rather than as a sum.</summary>
    private const decimal StrongPercentage = 50m;

    /// <summary>A baseline small enough that its percentage says more about the divisor than the change.</summary>
    private const decimal MeaningfulBaseline = 100m;
    public const int MaxPageSize = 100;

    /// <summary>The months the company has permanent orders for, newest first.</summary>
    public async Task<DashboardPeriodsDto> GetPeriodsAsync(CancellationToken cancellationToken)
    {
        // Permanent requests only: what was staged for import is not what the company ordered.
        var periods = await db.OrderRequests.AsNoTracking()
            .GroupBy(request => request.RequestPeriod)
            .Select(group => new
            {
                Period = group.Key,
                LocationCount = group.Select(request => request.LocationId).Distinct().Count(),
                RequestCount = group.Count(),
            })
            .OrderByDescending(row => row.Period)
            .ToListAsync(cancellationToken);

        // Lines are counted in their own query: counting a navigation inside a grouping is not translatable.
        var itemCounts = await db.OrderRequestItems.AsNoTracking()
            .GroupBy(item => item.OrderRequest.RequestPeriod)
            .Select(group => new { Period = group.Key, ItemCount = group.Count() })
            .ToDictionaryAsync(row => row.Period, row => row.ItemCount, cancellationToken);

        return new DashboardPeriodsDto(
            [.. periods.Select(row => new DashboardPeriodDto(
                row.Period, row.LocationCount, row.RequestCount, itemCounts.GetValueOrDefault(row.Period)))]);
    }

    /// <returns>Null when no location has a permanent request for the selected month.</returns>
    public async Task<ManagementDashboardDto?> GetAsync(
        DateOnly currentPeriod, DashboardQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        var selection = query.SelectionFor(currentPeriod);

        // "Every prior month" is a fact about the data, not about the calendar, so it is asked for. The query
        // is one row per month the company has ever ordered in, which is a handful of rows, and it is skipped
        // entirely for every other basis.
        var companyPeriods = BaselineWindow.NeedsCompanyPeriods(selection.Basis)
            ? await db.OrderRequests.AsNoTracking()
                .Where(request => request.RequestPeriod < currentPeriod)
                .Select(request => request.RequestPeriod)
                .Distinct()
                .ToListAsync(cancellationToken)
            : null;

        var baselinePeriods = BaselineWindow.PeriodsFor(currentPeriod, selection, companyPeriods);
        var wanted = baselinePeriods.Append(currentPeriod).ToArray();

        // One universe: the month's, the same one every screen counts (see LocationUniverse). Every object in
        // it is a row and a member of the partition — an object that has never ordered included, so the table,
        // the chips and the headline all add up to the same number of objects.
        var locations = await LocationUniverse.ForMonth(db, currentPeriod)
            .Select(location => new LocationRef(location.Id, location.Code, location.Name))
            .ToListAsync(cancellationToken);

        // The highest version of each location and month, in one query for the whole company.
        var requests = await db.OrderRequests.AsNoTracking()
            .Where(request => wanted.Contains(request.RequestPeriod)
                && !db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version))
            .Select(request => new RequestRef(
                request.LocationId, request.RequestPeriod, request.Id, request.Version, request.Status))
            .ToListAsync(cancellationToken);

        if (!requests.Any(request => request.Period == currentPeriod))
        {
            return null;
        }

        var requestIds = requests.Select(request => request.OrderRequestId).ToArray();
        var lastOrders = await LastOrdersBeforeAsync(currentPeriod, cancellationToken);

        // An approved spelling match is one product from here on, so the cause names the kept spelling (13b).
        var matches = await ApprovedMatches.ReadAsync(db, cancellationToken);
        var snapshots = matches.Spelling.Apply(await SnapshotsAsync(requestIds, query.Scope, cancellationToken));
        var (kinds, names, products) = await VariantsAsync(snapshots.Values.SelectMany(byVariant => byVariant.Keys).Distinct().ToArray(), cancellationToken);

        // An approved variant transition is one cause, "Variant dəyişib", named by its base (13.1a).
        var families = new FamilyContext(matches.RolesOf(products), matches.Families);

        var byLocation = requests.ToLookup(request => request.LocationId);
        var rows = new List<LocationDashboardRowDto>(locations.Count);
        foreach (var location in locations)
        {
            rows.Add(Build(location, byLocation[location.Id], currentPeriod, baselinePeriods, selection, snapshots, kinds, names, families));
        }

        rows = [.. rows.OrderByName(row => row.LocationName)];

        // Every object lands in exactly one group. Decided once and handed to both the summary and the filter,
        // so a chip's count and the rows its filter leaves are the same objects by construction.
        var groups = GroupsOf(rows, lastOrders);

        // The whole month, split by what kind of demand each line was. Read separately from the comparison
        // above, which sees monthly lines only, so the three figures add up to the month rather than to the
        // part of it that is comparable.
        var lineTypes = await LineTypeSplitAsync(currentPeriod, requestIds, cancellationToken);
        var summary = Summarize(currentPeriod, selection, baselinePeriods, rows, groups, lastOrders, lineTypes);

        var filtered = Sort(Filter(rows, groups, query), query);
        var (page, pageSize) = PageOf(query.Page, query.PageSize);
        var pageRows = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return new ManagementDashboardDto(
            summary,
            filtered.Count,
            // Chosen from every object, not from the page in front of the reader.
            Attention(rows),
            new PagedResult<LocationDashboardRowDto>(pageRows, page, pageSize, filtered.Count));
    }

    // ---- building one row ---------------------------------------------------------------------------

    private static LocationDashboardRowDto Build(
        LocationRef location,
        IEnumerable<RequestRef> requests,
        DateOnly currentPeriod,
        IReadOnlyList<DateOnly> baselinePeriods,
        ComparisonSelection selection,
        IReadOnlyDictionary<long, Dictionary<long, VariantPeriodSnapshot>> snapshots,
        IReadOnlyDictionary<long, AnalyticsKind> kinds,
        IReadOnlyDictionary<long, string> names,
        FamilyContext families)
    {
        var all = requests.ToList();
        var current = all.FirstOrDefault(request => request.Period == currentPeriod);
        var baseline = all.Where(request => request.Period != currentPeriod).OrderBy(request => request.Period).ToList();
        var available = baseline.Count;
        var expected = baselinePeriods.Count;

        var currentSnapshots = current is null
            ? []
            : snapshots.GetValueOrDefault(current.OrderRequestId) ?? [];

        var baselineByVariant = PeriodComparison.GroupBaseline(
            baseline.Select(request => request.OrderRequestId), snapshots);

        // The same arithmetic the order screen runs, called from the same place. An object that did not order
        // is not an object that ordered nothing, so a missing current month leaves its money unknown.
        var comparison = PeriodComparison.Of(
            current is null ? null : currentSnapshots, baselineByVariant, available, kinds, families.Roles);

        var currentTotals = comparison.CurrentTotals;
        var baselineTotals = comparison.BaselineTotals;
        var currentAmount = comparison.CurrentKnownAmount;
        var baselineAmount = comparison.BaselineKnownAmount;
        var (amountDelta, amountPercent) = (comparison.KnownAmountDelta, comparison.KnownAmountPercentChange);

        var coverage = available == 0
            ? HistoryCoverageState.Unavailable
            : available >= expected
                ? HistoryCoverageState.Complete
                : HistoryCoverageState.Partial;

        var availability = current is null
            ? ComparisonAvailability.NoCurrentRequest
            : available == 0
                ? ComparisonAvailability.NoBaselineHistory
                : ComparisonAvailability.Available;

        // It costs no query: the lines of every request in the window were fetched once, for every location.
        var decomposition = comparison.Decomposition;

        var causes = decomposition is null
            ? []
            : decomposition.Categories
                .Where(category => category.Amount != 0m)
                .Select(category => new DashboardCauseDto(category.Category, category.Amount, category.VariantCount))
                .ToList();

        // The one cause that moved the most money, in either direction. A factual ordering, not a judgement:
        // nothing here decides whether the movement was a good idea.
        var primary = causes.Count == 0
            ? null
            : causes.OrderByDescending(cause => Math.Abs(cause.Amount)).ThenBy(cause => cause.Category).First();

        // The product behind that cause, so the card can name it (7.1, 7.1a). Chosen and summed by the one rule
        // the order page's list is also sorted by; the browser only divides the two figures.
        // A transition is one product effect, and the product it is about is the family's base.
        var leader = CauseLeader.Of(decomposition, primary?.Category, primary?.Amount);
        var productName = leader?.Transition is { } transition
            ? families.Links.BaseNameOf(transition.BaseProductId)
            : leader is not null ? names.GetValueOrDefault(leader.ProductVariantId) : null;
        var primaryProduct = leader is not null && productName is not null
            ? new DashboardCauseProductDto(leader.ProductVariantId, productName, leader.Amount, leader.SameDirectionAmount)
            : null;

        var counts = new StateCounts();
        if (current is not null)
        {
            // The same calculator the location screen runs, variant by variant, over the union of both sides.
            // It runs even with no baseline month, because that is what the screen does too: the variants come
            // back as history-not-sufficient, which is a fact about them, not an invented comparison. What is
            // never done is running it for a location that has no request at all — there is nothing to run on.
            foreach (var variantId in currentSnapshots.Keys.Union(baselineByVariant.Keys))
            {
                var kind = kinds.GetValueOrDefault(variantId, AnalyticsKind.QuantityComparable);
                var result = OrderAnalyticsCalculator.Compare(new VariantComparisonInput(
                    variantId,
                    kind,
                    currentSnapshots.GetValueOrDefault(variantId),
                    baselineByVariant.GetValueOrDefault(variantId) ?? [],
                    available,
                    expected));

                counts.Add(result.State, kind);
            }
        }

        return new LocationDashboardRowDto(
            location.Id,
            location.Code,
            location.Name,
            current is not null,
            current?.OrderRequestId,
            current?.Version,
            current?.Status,
            new DashboardAmountDto(
                currentAmount,
                currentTotals.ItemCount,
                currentTotals.KnownPriceItemCount,
                currentTotals.MissingRequiredPriceItemCount,
                currentTotals.PriceNotRequiredItemCount,
                currentTotals.IsComplete),
            current is null ? null : CoverageOf(currentTotals),
            expected,
            available,
            [.. baselinePeriods.Where(period => !baseline.Any(request => request.Period == period))],
            [.. baseline.Select(request => new PeriodRequestDto(request.Period, request.OrderRequestId, request.Version, request.Status))],
            new DashboardAmountDto(
                baselineAmount,
                baselineTotals.ItemCount,
                baselineTotals.KnownPriceItemCount,
                baselineTotals.MissingRequiredPriceItemCount,
                baselineTotals.PriceNotRequiredItemCount,
                baselineTotals.IsComplete),
            amountDelta,
            amountPercent,
            coverage,
            availability,
            availability == ComparisonAvailability.Available,
            counts.New,
            counts.Increased,
            counts.Decreased,
            counts.Unchanged,
            counts.NoLongerOrdered,
            counts.InsufficientHistory,
            counts.NotComparable,
            counts.QuantityComparable,
            counts.Services,
            counts.Total,
            currentPeriod,
            selection.Basis,
            selection.CustomStart,
            selection.CustomEnd,
            causes,
            primary?.Category,
            primary?.Amount,
            primaryProduct,
            // Only a price somebody owes makes an explanation incomplete; internal supply never does.
            decomposition?.ExplanationIsComplete ?? true,
            causes
                .Where(cause => cause.Category == CauseCategory.UnattributedDueToMissingPrice)
                .Sum(cause => cause.Amount),
            // Said out loud rather than folded into the causes: money that moved because a product stopped
            // being bought and started coming out of the company's own store is not money the company saved.
            available == 0 ? 0 : decomposition?.SupplyChangedVariantCount ?? 0);
    }


    /// <summary>
    /// The short list of objects worth reading first.
    /// </summary>
    /// <remarks>
    /// Five signals, each one a fact the data states outright, taken a few at a time and capped. There is no
    /// score, no weighting and no threshold anybody will be tempted to tune: an object is here because it moved
    /// the most money, or because its records are incomplete, and the card says which.
    /// <para>
    /// Each card carries its place in its own reason's whole ordering, counted before any object is set aside
    /// for already having a card. That is what keeps the titles true: two cards used to say "the largest
    /// increase", and when the object with the largest percentage already had a card for its money, the
    /// runner-up was given the percentage title instead. Now the runner-up says it is the second, and the card
    /// the largest figure sits on says so as well (<see cref="DashboardAttentionDto.AlsoFirstIn"/>).
    /// </para>
    /// <para>
    /// The cards come in reason order, and within a reason in their rank: "Ən böyük faiz dəyişməsi" before
    /// "İkinci ən böyük faiz dəyişməsi", whichever of the two moved more money. For the money reasons rank and
    /// money are the same order; the order never changes which objects are chosen, only where each is read.
    /// </para>
    /// <para>
    /// This hides nothing. Every object remains in the full table below, whatever its change; this is a reading
    /// order, not a filter.
    /// </para>
    /// </remarks>
    private static List<DashboardAttentionDto> Attention(IReadOnlyList<LocationDashboardRowDto> rows)
    {
        var moved = rows.Where(row => row.KnownAmountDelta is not null).ToList();

        // A percentage is only worth reading when there is a baseline big enough to divide by; a month that
        // went from two manat to twenty is up 900% and is not news.
        var meaningful = moved.Where(row =>
            row.KnownAmountPercentChange is not null
            && Math.Abs(row.KnownAmountPercentChange.Value) >= StrongPercentage
            && row.Baseline.KnownAmount >= MeaningfulBaseline);

        // Every reason's whole ordering, made total by the name, so a rank is a fact rather than an accident
        // of the order the rows happened to arrive in.
        (DashboardAttentionReason Reason, int Cards, List<LocationDashboardRowDto> Ordered)[] reasons =
        [
            (DashboardAttentionReason.LargestIncrease, PerReason,
                [.. moved.Where(row => row.KnownAmountDelta > 0)
                    .OrderByDescending(row => row.KnownAmountDelta).ThenByName(row => row.LocationName)]),
            (DashboardAttentionReason.LargestDecrease, PerReason,
                [.. moved.Where(row => row.KnownAmountDelta < 0)
                    .OrderBy(row => row.KnownAmountDelta).ThenByName(row => row.LocationName)]),
            (DashboardAttentionReason.StrongPercentageChange, PerReason,
                [.. meaningful
                    .OrderByDescending(row => Math.Abs(row.KnownAmountPercentChange!.Value))
                    .ThenByName(row => row.LocationName)]),
            (DashboardAttentionReason.MissingRequiredPrice, PerWarning,
                [.. rows.Where(row => row.Current.MissingPriceItemCount > 0)
                    .OrderByDescending(row => row.Current.MissingPriceItemCount).ThenByName(row => row.LocationName)]),
            (DashboardAttentionReason.NoComparisonHistory, PerWarning,
                [.. rows.Where(row => row.ComparisonAvailability == ComparisonAvailability.NoBaselineHistory)
                    .OrderByDescending(row => row.Current.KnownAmount ?? 0m).ThenByName(row => row.LocationName)]),
        ];

        // The object that is first in each movement, so a card can say it is also the largest of another.
        var firstIn = reasons
            .Where(reason => IsMovement(reason.Reason) && reason.Ordered.Count > 0)
            .Select(reason => (reason.Reason, reason.Ordered[0].LocationId))
            .ToList();

        IReadOnlyList<DashboardAttentionReason> AlsoFirstIn(DashboardAttentionReason own, int locationId) =>
            [.. firstIn.Where(first => first.Reason != own && first.LocationId == locationId).Select(first => first.Reason)];

        var candidates = reasons.SelectMany(reason => reason.Ordered
            .Take(reason.Cards)
            .Select((row, index) => new DashboardAttentionDto(
                reason.Reason, row, index + 1, AlsoFirstIn(reason.Reason, row.LocationId))));

        // One card per object: the first reason it qualified under is the one it is filed against. Within a reason
        // the cards follow their rank, which is what their titles say (21.4) — by money, a percentage runner-up
        // that moved more money than the largest percentage was shown before it.
        return [.. candidates
            .GroupBy(item => item.Location.LocationId)
            .Select(group => group.First())
            .OrderBy(item => item.Reason)
            .ThenBy(item => item.Rank)
            .Take(MaxAttention)];
    }

    /// <summary>The reasons that are an ordering of money moved, as opposed to a gap in the records.</summary>
    private static bool IsMovement(DashboardAttentionReason reason) => reason is
        DashboardAttentionReason.LargestIncrease
        or DashboardAttentionReason.LargestDecrease
        or DashboardAttentionReason.StrongPercentageChange;

    /// <summary>
    /// Whether an object's order this month has a line somebody owes a price for. Written once, because the
    /// price chip counts it and the price filter applies it, and the two must be the same objects.
    /// </summary>
    private static bool HasOwedMissingPrice(LocationDashboardRowDto row) =>
        row.HasCurrentRequest && row.Current.MissingPriceItemCount > 0;

    /// <summary>
    /// Price coverage of a period, counted in lines rather than in quantity across unlike units.
    /// </summary>
    /// <remarks>
    /// Complete means every line that needed a price has one, not that every line has one. A month supplied
    /// entirely from the company's own store is complete and has no money at all.
    /// </remarks>
    private static PriceCoverageState CoverageOf(AmountTotals totals) => totals switch
    {
        { ItemCount: 0 } => PriceCoverageState.Unavailable,
        { MissingRequiredPriceItemCount: 0 } => PriceCoverageState.Complete,
        { KnownPriceItemCount: 0 } => PriceCoverageState.Unavailable,
        _ => PriceCoverageState.Partial,
    };

    // ---- reading ------------------------------------------------------------------------------------

    /// <summary>
    /// The selected month's money split by classification, over every line the month has.
    /// </summary>
    /// <remarks>
    /// Deliberately a separate query rather than a slice of the snapshots: those are monthly-only by design,
    /// and this has to see the whole month for the three figures to add up to it. Money is rounded to the cent
    /// once per object and per kind, the same way and at the same granularity as everywhere else on this page,
    /// so the monthly figure here is the same number the comparison shows rather than one qəpik away from it.
    /// </remarks>
    private async Task<DashboardLineTypeSplitDto> LineTypeSplitAsync(
        DateOnly currentPeriod, long[] requestIds, CancellationToken cancellationToken)
    {
        var rows = await db.OrderRequestItems.AsNoTracking()
            .Where(item => requestIds.Contains(item.OrderRequestId)
                && item.OrderRequest.RequestPeriod == currentPeriod)
            .GroupBy(item => new { item.OrderRequest.LocationId, item.OrderLineType })
            .Select(group => new
            {
                group.Key.LocationId,
                group.Key.OrderLineType,
                ItemCount = group.Count(),
                KnownPriceItemCount = group.Count(item => item.UnitPrice != null),
                MissingPriceItemCount = group.Count(item => item.UnitPrice == null
                    && item.PricingMode != PricingMode.InternalFreeSupply),
                PriceNotRequiredItemCount = group.Count(item => item.UnitPrice == null
                    && item.PricingMode == PricingMode.InternalFreeSupply),
                KnownAmount = group.Sum(item => item.Quantity * (item.UnitPrice ?? 0m)),
            })
            .ToListAsync(cancellationToken);

        DashboardAmountDto Of(OrderLineType type)
        {
            var side = rows.Where(row => row.OrderLineType == type).ToList();
            var known = side.Sum(row => row.KnownPriceItemCount);
            var missing = side.Sum(row => row.MissingPriceItemCount);
            return new DashboardAmountDto(
                known == 0 ? null : side.Sum(row => PortfolioCohort.Money(row.KnownAmount)),
                side.Sum(row => row.ItemCount),
                known,
                missing,
                side.Sum(row => row.PriceNotRequiredItemCount),
                missing == 0);
        }

        var unclassified = Of(OrderLineType.Unclassified);
        return new DashboardLineTypeSplitDto(
            Of(OrderLineType.Monthly), Of(OrderLineType.OutsideMonthly), unclassified, unclassified.ItemCount);
    }

    /// <remarks>
    /// The lines of the asked-for scope, and nothing else — see <see cref="MonthlyComparisonPopulation"/>.
    /// Everything built from these snapshots is comparative, so on the default scope a one-off purchase
    /// compared against a month that did not have one would read as a change in demand when it is nothing of
    /// the kind. A screen that asks for another scope is answered about that one and says so in its words; the
    /// month's own split is unaffected and still comes from <see cref="LineTypeSplitAsync"/>.
    /// </remarks>
    private async Task<Dictionary<long, Dictionary<long, VariantPeriodSnapshot>>> SnapshotsAsync(
        long[] requestIds, AnalyticsScope scope, CancellationToken cancellationToken)
    {
        var rows = await db.OrderRequestItems.AsNoTracking()
            .InScope(scope)
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

    /// <summary>
    /// The last month each object ordered in <b>before</b> the selected one, and what that order came to.
    /// </summary>
    /// <remarks>
    /// Two facts in one query because they are the same fact: an object appears here exactly when it had a
    /// history as of the selected month, which is what separates "no order this month" from "has never
    /// ordered", and the value is the month a reader asks about the moment they see the first of those.
    /// <para>
    /// Strictly earlier than the month being read, never "the latest month overall". Reading August must not
    /// be coloured by an order placed in September, and an object whose first order came after the month being
    /// looked at genuinely had no history then.
    /// </para>
    /// </remarks>
    private async Task<Dictionary<int, LastOrderRef>> LastOrdersBeforeAsync(
        DateOnly currentPeriod, CancellationToken cancellationToken)
    {
        var rows = await db.OrderRequests.AsNoTracking()
            .Where(request => request.RequestPeriod < currentPeriod
                && !db.OrderRequests.Any(later =>
                    later.LocationId == request.LocationId
                    && later.RequestPeriod > request.RequestPeriod
                    && later.RequestPeriod < currentPeriod)
                && !db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version))
            .Select(request => new LastOrderRef(
                request.LocationId,
                request.RequestPeriod,
                // The money of the priced lines, exactly as every other amount on this screen is counted.
                request.Items.Where(item => item.UnitPrice != null).Sum(item => item.Quantity * item.UnitPrice)))
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(row => row.LocationId);
    }

    /// <summary>
    /// What decides whether a variant is material or service, its product's name — the dashboard names one
    /// product per row, the one behind its primary cause — and its product, for the variant families. Read in the
    /// same query, so naming it costs none.
    /// </summary>
    private async Task<(Dictionary<long, AnalyticsKind> Kinds, Dictionary<long, string> Names, Dictionary<long, long> Products)> VariantsAsync(
        long[] variantIds, CancellationToken cancellationToken)
    {
        if (variantIds.Length == 0)
        {
            return ([], [], []);
        }

        var rows = await db.ProductVariants.AsNoTracking()
            .Where(variant => variantIds.Contains(variant.Id))
            .Select(variant => new
            {
                variant.Id,
                variant.ProductId,
                OrderUnitCode = variant.OrderUnit != null ? variant.OrderUnit.Code : null,
                // Product.Name, the same name the order page's "Əsas dəyişikliklər" prints for this variant.
                ProductName = variant.Product.Name,
            })
            .ToListAsync(cancellationToken);

        return (
            rows.ToDictionary(row => row.Id, row => AnalyticsUnits.KindOf(row.OrderUnitCode)),
            rows.ToDictionary(row => row.Id, row => row.ProductName),
            rows.ToDictionary(row => row.Id, row => row.ProductId));
    }

    // ---- shaping ------------------------------------------------------------------------------------

    private static List<LocationDashboardRowDto> Filter(
        List<LocationDashboardRowDto> rows,
        IReadOnlyDictionary<int, PortfolioGroup> groups,
        DashboardQuery query)
    {
        IEnumerable<LocationDashboardRowDto> filtered = rows;

        if (Search.Of(query.Search) is { } needle)
        {
            filtered = filtered.Where(row =>
                TextNormalizer.Normalize(row.LocationName).Contains(needle, StringComparison.Ordinal)
                || TextNormalizer.Normalize(row.LocationCode).Contains(needle, StringComparison.Ordinal));
        }

        if (query.HistoryCoverage is { } coverage)
        {
            filtered = filtered.Where(row => row.HistoryCoverage == coverage);
        }

        if (query.PriceCoverage is { } priceCoverage)
        {
            filtered = filtered.Where(row => row.CurrentPriceCoverage == priceCoverage);
        }

        if (query.HasCurrentRequest is { } hasRequest)
        {
            filtered = filtered.Where(row => row.HasCurrentRequest == hasRequest);
        }

        // The two filters behind the dashboard's chips, each on the very predicate its chip counts with.
        if (query.Group is { } group)
        {
            filtered = filtered.Where(row => groups[row.LocationId] == group);
        }

        if (query.MissingPrice is { } missingPrice)
        {
            filtered = filtered.Where(row => HasOwedMissingPrice(row) == missingPrice);
        }

        return [.. filtered];
    }

    /// <summary>
    /// Rows are ordered by a plain fact, and a row with no figure to sort by goes last whichever direction is
    /// asked for — a missing number is not a small one.
    /// </summary>
    private static List<LocationDashboardRowDto> Sort(List<LocationDashboardRowDto> rows, DashboardQuery query)
    {
        if (query.Sort == DashboardSort.LocationName)
        {
            return [.. query.Descending
                ? rows.OrderByNameDescending(row => row.LocationName)
                : rows.OrderByName(row => row.LocationName)];
        }

        decimal? Key(LocationDashboardRowDto row) => query.Sort switch
        {
            DashboardSort.CurrentKnownAmount => row.Current.KnownAmount,
            DashboardSort.KnownAmountDelta => row.KnownAmountDelta,
            DashboardSort.KnownAmountPercentChange => row.KnownAmountPercentChange,
            DashboardSort.MissingPriceItemCount => row.Current.MissingPriceItemCount,
            DashboardSort.HistoryCoverage => (int)row.HistoryCoverage,
            DashboardSort.NewVariantCount => row.NewVariantCount,
            DashboardSort.IncreasedVariantCount => row.IncreasedVariantCount,
            DashboardSort.DecreasedVariantCount => row.DecreasedVariantCount,
            DashboardSort.CurrentItemCount => row.Current.ItemCount,
            DashboardSort.AbsoluteKnownAmountDelta => row.KnownAmountDelta is { } delta ? Math.Abs(delta) : null,
            _ => null,
        };

        var withValue = rows.Where(row => Key(row) is not null);
        var withoutValue = rows.Where(row => Key(row) is null).OrderByName(row => row.LocationName);

        var ordered = query.Descending
            ? withValue.OrderByDescending(Key).ThenByName(row => row.LocationName)
            : withValue.OrderBy(Key).ThenByName(row => row.LocationName);

        return [.. ordered, .. withoutValue];
    }

    private static (int Page, int PageSize) PageOf(int page, int pageSize) =>
        (Math.Max(1, page), pageSize <= 0 ? DefaultPageSize : Math.Min(pageSize, MaxPageSize));

    /// <summary>
    /// Every object's group, by the one rule in <see cref="PortfolioCohort.GroupOf"/>.
    /// </summary>
    /// <remarks>
    /// Partition refuses to return a set that does not add up to the universe. The rows are the universe, so an
    /// object that has never ordered is a row here too — it lands in "no history" with no money in either
    /// direction, because nothing about it is missing.
    /// </remarks>
    private static Dictionary<int, PortfolioGroup> GroupsOf(
        IReadOnlyList<LocationDashboardRowDto> rows,
        IReadOnlyDictionary<int, LastOrderRef> lastOrders) =>
        rows.ToDictionary(
            row => row.LocationId,
            row => PortfolioCohort.GroupOf(
                row.HasCurrentRequest,
                lastOrders.ContainsKey(row.LocationId),
                row.AvailableBaselinePeriodCount));

    /// <remarks>
    /// The headline is summed over the cohort and nothing else — see <see cref="PortfolioCohort"/> for the rule
    /// and for what the three different sets used to do to the difference. What is kept apart from it is the
    /// month's own total, which is a fact about the month rather than about the comparison and must not move
    /// when the reader changes the basis.
    /// </remarks>
    private static ManagementDashboardSummaryDto Summarize(
        DateOnly currentPeriod,
        ComparisonSelection selection,
        IReadOnlyList<DateOnly> baselinePeriods,
        IReadOnlyList<LocationDashboardRowDto> rows,
        IReadOnlyDictionary<int, PortfolioGroup> groups,
        IReadOnlyDictionary<int, LastOrderRef> lastOrders,
        DashboardLineTypeSplitDto lineTypes)
    {
        var rowMembers = rows.Select(row =>
        {
            var last = lastOrders.GetValueOrDefault(row.LocationId);
            return (groups[row.LocationId], new DashboardPartitionMemberDto(
                row.LocationId,
                row.LocationCode,
                row.LocationName,
                PortfolioCohort.Money(row.Current.KnownAmount),
                PortfolioCohort.Money(row.Baseline.KnownAmount),
                PortfolioCohort.Money(row.KnownAmountDelta),
                last?.Period,
                PortfolioCohort.Money(last?.KnownAmount)));
        });

        var partition = PortfolioCohort.Partition(rowMembers, rows.Count);

        var withCurrent = rows.Where(row => row.HasCurrentRequest).ToList();
        var cohort = rows.Where(row => groups[row.LocationId] == PortfolioGroup.Compared).ToList();

        // Each object's money is rounded to the cent before it is added up, because the cent is what its row
        // shows: a manager who adds a column up must land on the number at the top of the page.
        static DashboardAmountDto AmountOf(
            IReadOnlyList<LocationDashboardRowDto> group,
            Func<LocationDashboardRowDto, DashboardAmountDto> side)
        {
            var items = group.Sum(row => side(row).ItemCount);
            var known = group.Sum(row => side(row).KnownPriceItemCount);
            var missing = group.Sum(row => side(row).MissingPriceItemCount);
            var notRequired = group.Sum(row => side(row).PriceNotRequiredItemCount);
            var amount = known == 0
                ? null
                : (decimal?)group.Sum(row => PortfolioCohort.Money(side(row).KnownAmount ?? 0m));

            return new DashboardAmountDto(amount, items, known, missing, notRequired, missing == 0);
        }

        // The month, whole: what the company ordered, whoever it can or cannot be compared with.
        var current = AmountOf(withCurrent, row => row.Current);

        // The comparison, over one set of objects on both sides. Each location contributes the money of its own
        // average baseline month, so the company figure is a month and is comparable with the month beside it.
        var comparedCurrent = AmountOf(cohort, row => row.Current);
        var baseline = AmountOf(cohort, row => row.Baseline);

        // Both identities a reader might check now hold at once, and they hold exactly: every object's
        // difference is its own two cent figures subtracted, so the Dəyişmə column adds up to this, and this
        // is also the two totals above subtracted. There is no residual anywhere to decide what to do with.
        var (delta, percent) = OrderAnalyticsCalculator.AmountDifference(
            comparedCurrent.KnownAmount, baseline.KnownAmount);

        return new ManagementDashboardSummaryDto(
            currentPeriod,
            selection.Basis,
            // The months the window actually covers, so the screen can name its basis instead of guessing it
            // from the basis alone. For "every prior month" and a hand-picked range there is nothing to guess
            // from: both depend on what the reader chose or on what the company has.
            baselinePeriods,
            rows.Count,
            withCurrent.Count,
            rows.Count - withCurrent.Count,
            withCurrent.Count,
            current,
            comparedCurrent,
            baseline,
            delta,
            percent,
            partition,
            rows.Count(HasOwedMissingPrice),
            rows.Count(row => row.HistoryCoverage == HistoryCoverageState.Complete),
            rows.Count(row => row.HistoryCoverage == HistoryCoverageState.Partial),
            rows.Count(row => row.HistoryCoverage == HistoryCoverageState.Unavailable),
            rows.Count(row => row.ComparisonAvailable),
            rows.Sum(row => row.NewVariantCount),
            rows.Sum(row => row.IncreasedVariantCount),
            rows.Sum(row => row.DecreasedVariantCount),
            rows.Sum(row => row.UnchangedVariantCount),
            rows.Sum(row => row.NoLongerOrderedVariantCount),
            rows.Sum(row => row.InsufficientHistoryVariantCount),
            rows.Sum(row => row.AmountOrientedServiceCount),
            lineTypes);
    }

    private sealed record LocationRef(int Id, string Code, string Name);

    /// <summary>Each variant's place in an approved variant family, and the links that name each family's base.</summary>
    private sealed record FamilyContext(IReadOnlyDictionary<long, VariantFamilyRole> Roles, VariantFamilies Links);

    /// <summary>The last month an object ordered in before the one being read, and that order's money.</summary>
    private sealed record LastOrderRef(int LocationId, DateOnly Period, decimal? KnownAmount);

    private sealed record RequestRef(
        int LocationId, DateOnly Period, long OrderRequestId, int Version, Domain.Orders.OrderRequestStatus Status);

    private sealed class StateCounts
    {
        public int New { get; private set; }
        public int Increased { get; private set; }
        public int Decreased { get; private set; }
        public int Unchanged { get; private set; }
        public int NoLongerOrdered { get; private set; }
        public int InsufficientHistory { get; private set; }
        public int NotComparable { get; private set; }
        public int QuantityComparable { get; private set; }
        public int Services { get; private set; }
        public int Total { get; private set; }

        public void Add(ComparisonState state, AnalyticsKind kind)
        {
            switch (state)
            {
                case ComparisonState.New: New++; break;
                case ComparisonState.Increased: Increased++; break;
                case ComparisonState.Decreased: Decreased++; break;
                case ComparisonState.Unchanged: Unchanged++; break;
                case ComparisonState.NoLongerOrdered: NoLongerOrdered++; break;
                case ComparisonState.InsufficientHistory: InsufficientHistory++; break;
                default: NotComparable++; break;
            }

            if (kind == AnalyticsKind.QuantityComparable)
            {
                QuantityComparable++;
            }
            else
            {
                Services++;
            }

            Total++;
        }
    }
}
