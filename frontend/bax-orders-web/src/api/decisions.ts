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
  /** Supplied from the company's own store: real money, but no price to blame it on. Never a problem. */
  | 'InternalSupply'
  | 'UnattributedDueToMissingPrice'

export interface DecisionAmount {
  knownAmount: number | null
  itemCount: number
  knownPriceItemCount: number
  /** Lines somebody still owes a price for — the only kind that is a gap. */
  missingPriceItemCount: number
  /** Lines issued from the company's own store: complete without a purchase price, never a warning. */
  priceNotRequiredItemCount: number
  /** True when every line that needed a price has one — not when every line has one. */
  isComplete: boolean
}

export interface DecisionPeriod {
  period: string
  orderRequestId: number
  version: number
  status: OrderRequestStatus
}

/**
 * One basis resolved for this order: the months it covers, which of them this object actually has, and what
 * the comparison against them says.
 *
 * The screen shows the chosen one large and the rest small. They are the same shape on purpose — whichever is
 * in front of the reader was computed the same way, so switching basis changes the answer and never its meaning.
 */
export interface DecisionComparison {
  basis: AnalyticsComparisonBasis
  customStart: string | null
  customEnd: string | null
  /** Every month the basis covers, oldest first, whether or not the object ordered in them. */
  windowPeriods: string[]
  expectedPeriodCount: number
  /** The months the object has a request for — and the divisor of the average below. */
  availablePeriodCount: number
  missingPeriods: string[]
  periods: DecisionPeriod[]
  /** False when the object ordered in none of the window's months: there is nothing to compare with. */
  available: boolean
  /** The money of an average available month — divided by the months that exist, not the months asked for. */
  baselineKnownAmount: number | null
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
  /** Lines issued from the company's own store: complete without a purchase price, never a warning. */
  priceNotRequiredItemCount: number
  priceIsComplete: boolean
  /** The company paid for this product in one of the two months and supplied it itself in the other. */
  supplyChanged: boolean
}

export interface DecisionDecomposition {
  categories: DecisionCause[]
  totalAmountImpact: number
  /** False when a product's price is partly unknown: its money is counted, its cause is not known. */
  explanationIsComplete: boolean
  unattributedVariantCount: number
  /** Products supplied from the company's own store. Neutral context, never a problem. */
  internalSupplyVariantCount: number
  /** Products paid for in one of the two months and supplied internally in the other. */
  supplyChangedVariantCount: number
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
  /** The comparison the reader chose. The headline and `decomposition` are both against this one. */
  primary: DecisionComparison
  /** The other bases, as quiet context beside it. Never a rival answer. */
  secondary: DecisionComparison[]
  /** Null when the primary window holds no request: there is then nothing to explain. */
  decomposition: DecisionDecomposition | null
}

export interface DecisionContextRequest {
  basis: AnalyticsComparisonBasis
  /** Both required by `CustomRange` and rejected by every other basis, as `yyyy-MM`. */
  customStart?: string
  customEnd?: string
}

export function fetchDecisionContext(
  orderRequestId: number,
  query: DecisionContextRequest,
  signal?: AbortSignal,
): Promise<OrderDecisionContext> {
  const params = new URLSearchParams({ basis: query.basis })
  if (query.customStart) params.set('customStart', query.customStart)
  if (query.customEnd) params.set('customEnd', query.customEnd)
  return getJson<OrderDecisionContext>(
    `/api/v1/orders/${orderRequestId}/decision-context?${params.toString()}`,
    signal,
  )
}
