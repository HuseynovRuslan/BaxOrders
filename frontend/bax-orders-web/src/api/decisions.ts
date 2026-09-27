import type { AnalyticsComparisonBasis, AnalyticsKind, ComparisonState, VariantIdentity } from './analytics'
import { getJson } from './client'
import type { OrderRequestStatus } from './orders'

/**
 * Where a month's money difference came from. The categories an explanation lists are the difference together, with
 * nothing left over.
 */
export type CauseCategory =
  | 'NewOrders'
  | 'QuantityChange'
  | 'PriceChange'
  | 'NoLongerOrdered'
  | 'Services'
  /** Supplied from the company's own store: real money, but no price to blame it on. Never a problem. */
  | 'InternalSupply'
  | 'UnattributedDueToMissingPrice'
  /**
   * One variant of a base product ordered in place of another, where an administrator approved the two as variants of
   * that base (13.1a). Listed only when there is such a transition — then even at 0,00 ₼.
   */
  | 'VariantChange'

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
  /**
   * Lines owed a price across the window's available months, summed. With owed prices in the order too, neither
   * amount is whole — the comparison page's `baselineMissingPriceItemCount`.
   */
  baselineMissingPriceItemCount: number
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
 * only the one it is filed under — the larger of its two effects. The `state` is a different question: whether
 * the product is new, no longer ordered, up or down, by the rule the comparison page labels it with.
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
  /** New, no longer ordered, up, down… — the comparison page's own label for this product. */
  state: ComparisonState
}

/** How many products the comparison is about, counted by the comparison page's rule. */
export interface DecisionProductCounts {
  /** Every product in this order or in the basis window — the comparison page's `totalVariantCount`. */
  comparedCount: number
  /** Distinct products in the opened order. */
  inCurrentOrderCount: number
  /** Products whose state is `New`. */
  newCount: number
  /** Products whose state is `NoLongerOrdered`. */
  noLongerOrderedCount: number
  /** The drivers listed: every product that moved, whose price is unknown, or that appeared or disappeared. */
  listedCount: number
  /** Products whose state is `Increased`, over every compared product — drivers and steady alike. */
  increasedCount: number
  /** Products whose state is `Decreased`, counted the same way. */
  decreasedCount: number
  /** Compared products that are services, measured by money rather than quantity. */
  serviceCount: number
}

/** One side of an approved variant transition: a member of the family, by its own name. */
export interface DecisionVariantSide {
  productVariantId: number
  productId: number
  productName: string
  /** Its short name under the base ("lavanda ətirli"); null for the base itself, which reads "adi". */
  variantLabel: string | null
}

/**
 * "Sabun elano — variant dəyişib: adi → lavanda ətirli": one approved variant transition, told as one line (13.1a).
 * The members are still two products everywhere else, each with its own row in "Əsas dəyişikliklər" (13.1).
 */
export interface DecisionVariantTransition {
  baseProductId: number
  baseProductName: string
  /** The members no longer ordered. */
  from: DecisionVariantSide[]
  /** The members ordered in their place. */
  to: DecisionVariantSide[]
  /** The members' whole net, current minus baseline — never split into quantity and price. */
  amountImpact: number
  baselineKnownAmount: number | null
  currentKnownAmount: number | null
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
  products: DecisionProductCounts
  /**
   * Every compared product that is not a driver — no money moved, neither new nor gone — by name. With `drivers`,
   * exactly the products the old comparison page listed. Its `state` can still be up or down: store material
   * whose quantity moved costs nothing either way.
   */
  steady: DecisionDriver[]
  /** The approved variant transitions behind "Variant dəyişib", largest money first. Empty when there is none. */
  variantTransitions: DecisionVariantTransition[]
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
  /** The order this one was written over — the version below it for the same month. Null on a first version. */
  previousOrderRequestId: number | null
  previousVersion: number | null
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
