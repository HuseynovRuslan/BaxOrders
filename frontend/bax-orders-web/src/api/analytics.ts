import { getJson } from './client'
import type { OrderRequestStatus } from './orders'

/** Mirrors `BaxOrders.Application.Analytics`. Every name is the backend's own; nothing is reinterpreted here. */
export type AnalyticsComparisonBasis =
  | 'PreviousMonth'
  | 'Previous3MonthAverage'
  | 'Previous6MonthAverage'
  /** Every month the company has orders for before the selected one, averaged. */
  | 'AllPriorMonths'
  /** Months the reader picked by hand, averaged. Carried by `customStart` and `customEnd`. */
  | 'CustomRange'

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

export interface PeriodRequest {
  period: string
  orderRequestId: number
  version: number
  status: OrderRequestStatus
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
  missingRequiredPriceItemCount: number
  /** Lines issued from the company's own store: complete without a purchase price, never a warning. */
  priceNotRequiredItemCount: number
  /** Who supplied it that month, each named once, alphabetically. Empty when no line names a supplier. */
  supplierNames: string[]
}

/**
 * How often this location actually orders this product. Every figure is a count of months in `points`, so a
 * month the location has no request for is in none of them — it is not a month the product was skipped.
 */
export interface VariantOrderFrequency {
  /** Months the location has a request for. The denominator. */
  availableMonthCount: number
  /** How many of those contain this product at all. */
  orderedMonthCount: number
  firstOrderedPeriod: string | null
  lastOrderedPeriod: string | null
  /** Months from the last order of this product to the location's most recent order of anything. */
  monthsSinceLastOrder: number | null
  intervalsInMonths: number[]
  /** The median gap; null until there are two gaps to take one of. */
  typicalIntervalMonths: number | null
  shortestIntervalMonths: number | null
  longestIntervalMonths: number | null
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
  frequency: VariantOrderFrequency
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
