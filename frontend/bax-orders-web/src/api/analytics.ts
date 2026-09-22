import { getJson } from './client'
import type { OrderRequestStatus, PagedResult } from './orders'

/** Mirrors `BaxOrders.Application.Analytics`. Every name is the backend's own; nothing is reinterpreted here. */
export type AnalyticsComparisonBasis = 'PreviousMonth' | 'Previous3MonthAverage' | 'Previous6MonthAverage'

/** Whether a variant's quantities may be compared at all, or only its money. */
export type AnalyticsKind = 'QuantityComparable' | 'AmountOrientedService'

export type ComparisonState =
  | 'New'
  | 'NoLongerOrdered'
  | 'Increased'
  | 'Decreased'
  | 'Unchanged'
  | 'NotComparable'
  | 'InsufficientHistory'

export type PriceCoverageState = 'Complete' | 'Partial' | 'Unavailable'

export interface VariantIdentity {
  productVariantId: number
  productId: number
  productCode: string
  productName: string
  specificationValue: string | null
  specificationUnitCode: string | null
  specificationUnitName: string | null
  /** A word from the "Vahid" column that is not a unit ("diş", "qat"). */
  specificationDescriptor: string | null
  modelCode: string | null
  /** Null when the variant legitimately has no order unit — a service. */
  orderUnitCode: string | null
  orderUnitName: string | null
}

export interface PriceCoverage {
  state: PriceCoverageState
  totalQuantity: number
  knownPriceQuantity: number
  missingPriceQuantity: number
  knownPriceItemCount: number
  missingPriceItemCount: number
}

export interface ComparisonSide {
  /** Period total on the current side, per-available-period average on the baseline side. Null for services. */
  quantity: number | null
  itemCount: number
  knownAmount: number | null
  weightedUnitPrice: number | null
  priceCoverage: PriceCoverage
}

export interface BaselineSide extends ComparisonSide {
  availablePeriodCount: number
  expectedPeriodCount: number
}

export interface ComparisonDelta {
  quantityDelta: number | null
  quantityPercentChange: number | null
  priceDelta: number | null
  pricePercentChange: number | null
  amountDelta: number | null
  amountPercentChange: number | null
}

export interface VariantComparison {
  variant: VariantIdentity
  analyticsKind: AnalyticsKind
  state: ComparisonState
  current: ComparisonSide
  baseline: BaselineSide
  delta: ComparisonDelta
}

export interface PeriodRequest {
  period: string
  orderRequestId: number
  version: number
  status: OrderRequestStatus
}

export interface ComparisonSummary {
  locationId: number
  locationCode: string
  locationName: string
  currentPeriod: string
  basis: AnalyticsComparisonBasis
  currentRequestId: number
  currentVersion: number
  currentStatus: OrderRequestStatus
  expectedBaselinePeriodCount: number
  availableBaselinePeriodCount: number
  missingBaselinePeriods: string[]
  baselinePeriods: PeriodRequest[]
  baselineAvailable: boolean
  currentItemCount: number
  baselineAverageItemCount: number | null
  currentKnownAmountTotal: number | null
  baselineKnownAmountTotal: number | null
  knownAmountDelta: number | null
  knownAmountPercentChange: number | null
  currentMissingPriceItemCount: number
  baselineMissingPriceItemCount: number
  /** False as soon as either side holds a line without a price: the money shown is partial. */
  amountIsComplete: boolean
  newVariantCount: number
  noLongerOrderedVariantCount: number
  increasedVariantCount: number
  decreasedVariantCount: number
  unchangedVariantCount: number
  notComparableVariantCount: number
  insufficientHistoryVariantCount: number
  quantityComparableVariantCount: number
  amountOrientedServiceCount: number
  totalVariantCount: number
}

export interface LocationComparison {
  /** Always describes the complete comparison, never only the page or the filtered subset. */
  summary: ComparisonSummary
  rows: PagedResult<VariantComparison>
}

export interface AnalyticsPeriod {
  period: string
  orderRequestId: number
  version: number
  status: OrderRequestStatus
  itemCount: number
}

export interface AnalyticsPeriods {
  locationId: number
  locationCode: string
  locationName: string
  periods: AnalyticsPeriod[]
}

export interface VariantTrendPoint {
  period: string
  orderRequestId: number
  version: number
  /** Zero when the location ordered that month without this variant; null for a service. */
  quantity: number | null
  knownAmount: number | null
  weightedUnitPrice: number | null
  itemCount: number
  knownPriceItemCount: number
  missingPriceItemCount: number
}

export interface VariantTrend {
  locationId: number
  locationCode: string
  locationName: string
  variant: VariantIdentity
  analyticsKind: AnalyticsKind
  from: string
  to: string
  /** One point per month the location actually ordered in; a month with no request produces no point. */
  points: VariantTrendPoint[]
}

export interface ComparisonRequest {
  basis: AnalyticsComparisonBasis
  search?: string
  state?: ComparisonState
  kind?: AnalyticsKind
  page: number
  pageSize: number
}

export function fetchAnalyticsPeriods(locationId: number, signal?: AbortSignal): Promise<AnalyticsPeriods> {
  return getJson<AnalyticsPeriods>(`/api/v1/analytics/locations/${locationId}/periods`, signal)
}

export function fetchComparison(
  locationId: number,
  period: string,
  query: ComparisonRequest,
  signal?: AbortSignal,
): Promise<LocationComparison> {
  const params = new URLSearchParams({
    basis: query.basis,
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.search) params.set('search', query.search)
  if (query.state) params.set('state', query.state)
  if (query.kind) params.set('kind', query.kind)
  return getJson<LocationComparison>(
    `/api/v1/analytics/locations/${locationId}/periods/${period}/comparison?${params.toString()}`,
    signal,
  )
}

export function fetchVariantTrend(
  locationId: number,
  productVariantId: number,
  range: { from?: string; to?: string },
  signal?: AbortSignal,
): Promise<VariantTrend> {
  const params = new URLSearchParams()
  if (range.from) params.set('from', range.from)
  if (range.to) params.set('to', range.to)
  const query = params.toString()
  return getJson<VariantTrend>(
    `/api/v1/analytics/locations/${locationId}/variants/${productVariantId}/trend${query ? `?${query}` : ''}`,
    signal,
  )
}
