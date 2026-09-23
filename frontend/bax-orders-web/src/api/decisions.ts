import type { AnalyticsComparisonBasis, AnalyticsKind, VariantIdentity } from './analytics'
import { getJson } from './client'
import type { OrderRequestStatus } from './orders'

/** Where a month's money difference came from. The six together are the difference, with nothing left over. */
export type CauseCategory =
  | 'NewOrders'
  | 'QuantityChange'
  | 'PriceChange'
  | 'NoLongerOrdered'
  | 'Services'
  | 'UnattributedDueToMissingPrice'

export interface DecisionAmount {
  knownAmount: number | null
  itemCount: number
  knownPriceItemCount: number
  missingPriceItemCount: number
  isComplete: boolean
}

export interface DecisionPeriod {
  period: string
  orderRequestId: number
  version: number
  status: OrderRequestStatus
}

export interface DecisionPreviousMonth {
  /** False when the location has no request for the month before. Nothing is then claimed about the change. */
  available: boolean
  period: string
  request: DecisionPeriod | null
  amount: DecisionAmount | null
  deltaAmount: number | null
  deltaPercent: number | null
}

export interface DecisionWindow {
  basis: AnalyticsComparisonBasis
  expectedPeriodCount: number
  availablePeriodCount: number
  missingPeriods: string[]
  periods: DecisionPeriod[]
  /** The money of an average available month — divided by the months that exist, not the months asked for. */
  averageKnownAmount: number | null
  deltaAmount: number | null
  deltaPercent: number | null
  amountIsComplete: boolean
}

export interface DecisionCause {
  category: CauseCategory
  amount: number
  variantCount: number
}

/**
 * One product behind the difference, with the before and after values that explain it.
 *
 * A product that moved both ways carries both effects, and reaches both of their totals. The `category` is
 * only the one it is filed under — the larger of its two effects.
 */
export interface DecisionDriver {
  variant: VariantIdentity
  analyticsKind: AnalyticsKind
  category: CauseCategory
  amountImpact: number
  quantityImpact: number | null
  priceImpact: number | null
  currentQuantity: number | null
  baselineQuantity: number | null
  quantityPercentChange: number | null
  currentUnitPrice: number | null
  baselineUnitPrice: number | null
  unitPricePercentChange: number | null
  currentKnownAmount: number | null
  baselineKnownAmount: number | null
  currentItemCount: number
  baselineItemCount: number
  missingPriceItemCount: number
  priceIsComplete: boolean
}

export interface DecisionDecomposition {
  categories: DecisionCause[]
  totalAmountImpact: number
  /** False when a product's price is partly unknown: its money is counted, its cause is not known. */
  explanationIsComplete: boolean
  unattributedVariantCount: number
  /** Largest money first. */
  drivers: DecisionDriver[]
}

export interface OrderDecisionContext {
  orderRequestId: number
  locationId: number
  locationCode: string
  locationName: string
  requestPeriod: string
  version: number
  status: OrderRequestStatus
  isLatestVersion: boolean
  latestOrderRequestId: number | null
  latestVersion: number | null
  current: DecisionAmount
  previousMonth: DecisionPreviousMonth
  threeMonth: DecisionWindow
  sixMonth: DecisionWindow
  /** Null when the previous month has no request: there is then nothing to explain. */
  decomposition: DecisionDecomposition | null
}

export function fetchDecisionContext(
  orderRequestId: number,
  signal?: AbortSignal,
): Promise<OrderDecisionContext> {
  return getJson<OrderDecisionContext>(`/api/v1/orders/${orderRequestId}/decision-context`, signal)
}
