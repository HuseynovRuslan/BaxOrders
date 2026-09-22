import type { AnalyticsComparisonBasis, PeriodRequest, PriceCoverageState } from './analytics'
import { getJson } from './client'
import type { OrderRequestStatus, PagedResult } from './orders'

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
  missingPriceItemCount: number
  /** False as soon as one line has no price. Says nothing where there is no amount at all. */
  isComplete: boolean
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
}

export interface ManagementDashboardSummary {
  selectedPeriod: string
  basis: AnalyticsComparisonBasis
  locationCount: number
  locationsWithCurrentRequest: number
  locationsWithoutCurrentRequest: number
  currentRequestCount: number
  current: DashboardAmount
  baseline: DashboardAmount
  knownAmountDelta: number | null
  knownAmountPercentChange: number | null
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
}

export interface ManagementDashboard {
  /** Always the whole company for the selected month and basis, whatever the search or filter. */
  summary: ManagementDashboardSummary
  /** How many locations the search and filters left. */
  filteredLocationCount: number
  rows: PagedResult<LocationDashboardRow>
}

export interface DashboardRequest {
  basis: AnalyticsComparisonBasis
  search?: string
  historyCoverage?: HistoryCoverageState
  priceCoverage?: PriceCoverageState
  hasCurrentRequest?: boolean
  sort?: DashboardSort
  descending?: boolean
  page: number
  pageSize: number
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
  if (query.search) params.set('search', query.search)
  if (query.historyCoverage) params.set('historyCoverage', query.historyCoverage)
  if (query.priceCoverage) params.set('priceCoverage', query.priceCoverage)
  if (query.hasCurrentRequest !== undefined) params.set('hasCurrentRequest', String(query.hasCurrentRequest))
  if (query.sort) params.set('sort', query.sort)
  if (query.descending) params.set('descending', 'true')
  return getJson<ManagementDashboard>(`/api/v1/dashboard?${params.toString()}`, signal)
}
