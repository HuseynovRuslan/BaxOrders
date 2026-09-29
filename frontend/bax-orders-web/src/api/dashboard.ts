import type { CauseCategory } from './decisions'
import type { AnalyticsComparisonBasis, PeriodRequest, PriceCoverageState } from './analytics'
import { getJson } from './client'
import type { OrderRequestStatus, PagedResult } from './orders'
import type { OrderResponsibility } from '../orderLines/responsibility'

/** Mirrors `BaxOrders.Application.Analytics.Dashboard`. Nothing here is recomputed in the browser. */
export type HistoryCoverageState = 'Complete' | 'Partial' | 'Unavailable'

/**
 * Why a location can or cannot be compared this month. The three are kept apart deliberately: an object that
 * did not order is not an object that ordered nothing.
 */
export type ComparisonAvailability = 'Available' | 'NoCurrentRequest' | 'NoBaselineHistory'

export type DashboardSort =
  | 'LocationName'
  | 'CurrentKnownAmount'
  | 'KnownAmountDelta'
  | 'KnownAmountPercentChange'
  | 'MissingPriceItemCount'
  | 'HistoryCoverage'
  | 'NewVariantCount'
  | 'IncreasedVariantCount'
  | 'DecreasedVariantCount'
  | 'CurrentItemCount'
  /** The size of the money change whichever way it went: the order the dashboard page opens on. */
  | 'AbsoluteKnownAmountDelta'

/** The mirror of `BaxOrders.Application.Analytics.Dashboard.PortfolioGroup`. Its words are in `coverage/labels`. */
export type PortfolioGroup = 'Compared' | 'NoOrderThisMonth' | 'NoBaseline' | 'NoHistory'

export interface DashboardPeriod {
  period: string
  locationCount: number
  requestCount: number
  itemCount: number
}

export interface DashboardPeriods {
  periods: DashboardPeriod[]
}

export interface DashboardAmount {
  /** Money over the priced lines only; null when nothing is priced. Never a zero standing in for unknown. */
  knownAmount: number | null
  itemCount: number
  knownPriceItemCount: number
  /** Lines somebody still owes a price for. Internal supply is counted separately and is not a shortfall. */
  missingPriceItemCount: number
  /** Lines issued from the company's own store: complete without a purchase price, never a warning. */
  priceNotRequiredItemCount: number
  /** False as soon as one line has no price. Says nothing where there is no amount at all. */
  isComplete: boolean
}

/**
 * The selected month's money split by what kind of demand each line was.
 *
 * Three populations that do not overlap and together are the whole month, so the figures reconcile by
 * addition. `unclassified` is kept apart rather than folded into either: it is not a third kind of demand,
 * it is the absence of an answer.
 */
export interface DashboardLineTypeSplit {
  monthly: DashboardAmount
  outsideMonthly: DashboardAmount
  unclassified: DashboardAmount
  /** Lines nobody has classified. A neutral note, never an error. */
  unclassifiedItemCount: number
}

export interface LocationDashboardRow {
  locationId: number
  locationCode: string
  locationName: string
  hasCurrentRequest: boolean
  currentRequestId: number | null
  currentVersion: number | null
  currentStatus: OrderRequestStatus | null
  current: DashboardAmount
  currentPriceCoverage: PriceCoverageState | null
  expectedBaselinePeriodCount: number
  availableBaselinePeriodCount: number
  missingBaselinePeriods: string[]
  baselinePeriods: PeriodRequest[]
  baseline: DashboardAmount
  knownAmountDelta: number | null
  knownAmountPercentChange: number | null
  historyCoverage: HistoryCoverageState
  comparisonAvailability: ComparisonAvailability
  comparisonAvailable: boolean
  newVariantCount: number
  increasedVariantCount: number
  decreasedVariantCount: number
  unchangedVariantCount: number
  noLongerOrderedVariantCount: number
  insufficientHistoryVariantCount: number
  notComparableVariantCount: number
  quantityComparableVariantCount: number
  amountOrientedServiceCount: number
  comparedVariantCount: number
  /** The month and basis this row's own comparison should open on. */
  deepLinkPeriod: string
  deepLinkBasis: AnalyticsComparisonBasis
  deepLinkCustomStart: string | null
  deepLinkCustomEnd: string | null
  /** Every share of this location's difference that moved money, from the shared cause decomposition. */
  causes: DashboardCause[]
  /** The one that moved the most, in either direction. Null when there is nothing to compare against. */
  primaryCause: CauseCategory | null
  primaryCauseAmount: number | null
  /** The product that did most of the primary cause (7.1, 7.1a). Null when no product does. */
  primaryCauseProduct: DashboardCauseProduct | null
  /** False only when somebody owes a price. Internal supply never makes it false. */
  explanationIsComplete: boolean
  unattributedAmount: number
  /** Products paid for in one of the two months and supplied internally in the other. */
  supplyChangedVariantCount: number
  /**
   * Who this month's order is answerable to, by the one rule the whole product uses: the explicit assignment,
   * or the one person every line names, or «Bir neçə cavabdeh», or nobody. Never the person with the most
   * lines. Null where the object did not order this month — there is then no order to be answerable for.
   */
  responsibility: OrderResponsibility | null
}

export interface DashboardCause {
  category: CauseCategory
  amount: number
  variantCount: number
}

/**
 * The product behind a card's "Əsas səbəb". Which product, and what its share is a share of, is decided once in
 * the backend; the card only divides the two figures.
 */
export interface DashboardCauseProduct {
  productVariantId: number
  productName: string
  /** Its whole effect, to the cent — the figure its row in the order page's "Əsas dəyişikliklər" shows. */
  amount: number
  /** Every product's effect in the same direction, across every cause. Same sign as `amount`, never smaller. */
  sameDirectionAmount: number
}

/**
 * Why an object was put in front of the reader. Each is a fact the data states: no score, no threshold anybody
 * tuned, and nothing that calls an object good or bad.
 */
export type DashboardAttentionReason =
  | 'LargestIncrease'
  | 'LargestDecrease'
  | 'StrongPercentageChange'
  | 'MissingRequiredPrice'
  | 'NoComparisonHistory'

export interface DashboardAttention {
  reason: DashboardAttentionReason
  location: LocationDashboardRow
  /**
   * The object's place, from 1, in its reason's whole ordering — counted before any object is set aside for
   * already having a card. Rank 1 is the largest, so only a rank-1 card may say "Ən böyük".
   */
  rank: number
  /** The other movement reasons this object is first in, so a largest figure is named on the card it sits on. */
  alsoFirstIn: DashboardAttentionReason[]
}

/**
 * One object named in the portfolio partition. Mirrors `DashboardPartitionMemberDto`.
 */
export interface DashboardPartitionMember {
  locationId: number
  locationCode: string
  locationName: string
  /** Its own money this month, to the cent. Null when it did not order — never a zero standing in for that. */
  currentKnownAmount: number | null
  baselineKnownAmount: number | null
  /** Its own difference, to the cent: the figure its Dəyişmə cell shows, never current − baseline. */
  knownAmountDelta: number | null
  /** The last month it ordered in before this one, as `yyyy-MM-dd`. Null only when it never has. */
  lastOrderPeriod: string | null
  lastOrderKnownAmount: number | null
}

/**
 * Every object in the catalogue, in one of four groups. The four add up to `locationCount` — the backend
 * refuses to return a partition that does not — so the headline can be reconciled against the company
 * instead of taken on trust.
 */
export interface DashboardPartition {
  locationCount: number
  /** Compared + no-baseline + no-order-this-month: the objects that had a history as of this month. */
  comparableLocationCount: number
  /** Ordered this month and has at least one month inside the window. The headline is summed over these. */
  compared: DashboardPartitionMember[]
  /** Has ordered before, but nothing was recorded for this month. */
  noOrderThisMonth: DashboardPartitionMember[]
  /** Ordered this month, but not in any month the window covers. */
  noBaseline: DashboardPartitionMember[]
  /** Had never ordered as of this month. */
  noHistory: DashboardPartitionMember[]
}

export interface ManagementDashboardSummary {
  selectedPeriod: string
  basis: AnalyticsComparisonBasis
  /**
   * The months the window covers, oldest first, whether or not anybody ordered in them. The screen names its
   * basis from this: "every prior month" and a hand-picked range cannot be worked out from the basis alone.
   */
  baselinePeriods: string[]
  locationCount: number
  locationsWithCurrentRequest: number
  locationsWithoutCurrentRequest: number
  currentRequestCount: number
  /**
   * The month's **monthly-order** money over every object that ordered. It does not move when the basis
   * changes. Outside-monthly and unclassified lines are not in it — they are in `lineTypes`, and the three
   * together are the whole month.
   */
  current: DashboardAmount
  /**
   * The same month over the cohort alone — the objects that also have a baseline. This is the figure
   * `baseline` sits beside and `knownAmountDelta` is the difference of. It equals `current` whenever every
   * object that ordered can be compared, which is the ordinary case.
   */
  comparedCurrent: DashboardAmount
  /** The cohort's average baseline month. Never a baseline over some other set of objects. */
  baseline: DashboardAmount
  /**
   * The Dəyişmə column of the compared objects, added up — deliberately not `comparedCurrent − baseline`.
   * Each object's difference comes from its own two unrounded sides, so the two can land a few qəpik apart,
   * and the column somebody can actually add up is the one the headline is made of.
   */
  knownAmountDelta: number | null
  knownAmountPercentChange: number | null
  /** Who was compared and who was not, by name. */
  partition: DashboardPartition
  locationsWithMissingPrices: number
  locationsWithCompleteHistory: number
  locationsWithPartialHistory: number
  locationsWithNoBaselineHistory: number
  locationsWithComparison: number
  newVariantCount: number
  increasedVariantCount: number
  decreasedVariantCount: number
  unchangedVariantCount: number
  noLongerOrderedVariantCount: number
  insufficientHistoryVariantCount: number
  amountOrientedServiceCount: number
  /**
   * The whole month, split into monthly, outside-monthly and unclassified. Every comparison figure beside it
   * is about monthly lines alone; this is where the rest of the month is accounted for.
   */
  lineTypes: DashboardLineTypeSplit
  /**
   * The last six months the company ordered in, oldest first, ending at the selected one — and in the selected
   * scope, so the line is about the same population as everything above it. Empty where there is only one
   * month: a single point is not a trend.
   */
  trend: DashboardTrendPoint[]
  /**
   * What the month's money was spent on, by the catalogue's top-level categories, largest first. Follows the
   * scope like everything else. Empty where the scope holds no lines at all.
   */
  categories: DashboardCategory[]
}

/** What a row of the breakdown stands for. The two that are not a category are named as what they are. */
export type DashboardCategoryKind = 'Category' | 'Other' | 'Uncategorised'

export interface DashboardCategory {
  /** Null on the two rows that are not a category: the folded remainder, and what nobody has filed. */
  categoryId: number | null
  name: string
  kind: DashboardCategoryKind
  /** Null where nothing in the row is priced — never a zero standing in for unknown. */
  knownAmount: number | null
  itemCount: number
  /** How many categories a folded remainder stands for; 1 for a real category, 0 for the unfiled row. */
  categoryCount: number
}

/** One month of the company, for reading the selected one against the run of them. */
export interface DashboardTrendPoint {
  /** The month, as an ISO date on its first day. */
  period: string
  /** Null where nothing in the month is priced — a month of unentered prices is not a month of zero. */
  knownAmount: number | null
  /** Objects that ordered in that month, in this scope. More objects is not more ordering. */
  locationCount: number
  /** Lines still owed a price, so a point that stands on them can say it is lower than the month was. */
  missingPriceItemCount: number
}

export interface ManagementDashboard {
  /** Always the whole company for the selected month and basis, whatever the search or filter. */
  summary: ManagementDashboardSummary
  /** How many locations the search and filters left. */
  filteredLocationCount: number
  /** A short reading order over every object — never a filter; nothing is hidden from the table below. */
  attention: DashboardAttention[]
  rows: PagedResult<LocationDashboardRow>
}

/**
 * Which lines an answer is about. One word for the question the manager keeps asking in three ways, so it means
 * the same on every screen — and `All` is the factual total, never "monthly demand".
 */
export type AnalyticsScope = 'Monthly' | 'OutsideMonthly' | 'All'

export interface DashboardRequest {
  basis: AnalyticsComparisonBasis
  /** The population the whole answer is about. Absent means the month's planned material. */
  scope?: AnalyticsScope
  /** Both required by `CustomRange` and rejected by every other basis, as `yyyy-MM`. */
  customStart?: string
  customEnd?: string
  search?: string
  historyCoverage?: HistoryCoverageState
  priceCoverage?: PriceCoverageState
  hasCurrentRequest?: boolean
  /** Only the objects of one portfolio group: a group chip's filter, on the rule its count uses. */
  group?: PortfolioGroup
  /** Only the objects whose order this month has a line somebody owes a price for: the price chip's filter. */
  missingPrice?: boolean
  sort?: DashboardSort
  descending?: boolean
  page: number
  pageSize: number
}

/** One line somebody ordered on top of the monthly plan. */
export interface OutsideMonthlyLine {
  orderRequestItemId: number
  orderRequestId: number
  productName: string
  specificationValue: string | null
  specificationUnitCode: string | null
  specificationDescriptor: string | null
  quantity: number
  orderUnitName: string | null
  unitPrice: number | null
  /** Quantity × price, or null when nobody has priced the line. Never a zero standing in for unknown. */
  knownAmount: number | null
  supplierName: string | null
}

export interface OutsideMonthlyLocation {
  locationId: number
  locationCode: string
  locationName: string
  lineCount: number
  knownAmount: number | null
  missingPriceLineCount: number
  lines: OutsideMonthlyLine[]
}

/**
 * The month's ad-hoc orders, object by object — exactly the lines the monthly comparison leaves out.
 *
 * Facts and nothing more: an ad-hoc purchase has no month of its own to be compared against, and a trend or
 * a cause invented for one would be the mistake the comparison avoids by not mixing it in.
 */
export interface OutsideMonthly {
  period: string
  lineCount: number
  knownAmount: number | null
  missingPriceLineCount: number
  locations: OutsideMonthlyLocation[]
}

export function fetchOutsideMonthly(period: string, signal?: AbortSignal): Promise<OutsideMonthly> {
  return getJson<OutsideMonthly>(`/api/v1/dashboard/outside-monthly?period=${encodeURIComponent(period)}`, signal)
}

export function fetchDashboardPeriods(signal?: AbortSignal): Promise<DashboardPeriods> {
  return getJson<DashboardPeriods>('/api/v1/dashboard/periods', signal)
}

export function fetchDashboard(
  period: string,
  query: DashboardRequest,
  signal?: AbortSignal,
): Promise<ManagementDashboard> {
  const params = new URLSearchParams({
    period,
    basis: query.basis,
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.customStart) params.set('customStart', query.customStart)
  if (query.customEnd) params.set('customEnd', query.customEnd)
  if (query.search) params.set('search', query.search)
  if (query.historyCoverage) params.set('historyCoverage', query.historyCoverage)
  if (query.priceCoverage) params.set('priceCoverage', query.priceCoverage)
  if (query.hasCurrentRequest !== undefined) params.set('hasCurrentRequest', String(query.hasCurrentRequest))
  if (query.group) params.set('group', query.group)
  if (query.missingPrice !== undefined) params.set('missingPrice', String(query.missingPrice))
  if (query.scope) params.set('scope', query.scope)
  if (query.sort) params.set('sort', query.sort)
  if (query.descending) params.set('descending', 'true')
  return getJson<ManagementDashboard>(`/api/v1/dashboard?${params.toString()}`, signal)
}
