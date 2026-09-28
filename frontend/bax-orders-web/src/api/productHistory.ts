import { getJson } from './client'
import type { OrderLineType } from './orders'

/**
 * One month of one product's ordering.
 *
 * `monthly*` is the month's planned material and the only population any figure about how often the company
 * orders this is built from. `outsideMonthly*` is what was bought on top of the plan: real spend, shown
 * because it happened, and deliberately outside every average — a pump that broke once is not a habit.
 */
export interface ProductHistoryMonth {
  period: string
  monthlyQuantity: number
  monthlyKnownAmount: number | null
  monthlyLineCount: number
  outsideMonthlyQuantity: number
  outsideMonthlyKnownAmount: number | null
  outsideMonthlyLineCount: number
  unclassifiedLineCount: number
  locationCount: number
}

export interface ProductHistoryLine {
  orderRequestItemId: number
  orderRequestId: number
  period: string
  locationId: number
  locationName: string
  variantLabel: string
  quantity: number
  unitPrice: number | null
  knownAmount: number | null
  orderLineType: OrderLineType
  responsiblePersonName: string | null
}

export interface ProductHistory {
  productId: number
  code: string
  name: string
  isActive: boolean
  /** Months the company ordered this as planned material — not months it happened to buy it once. */
  monthsOrdered: number
  averageMonthlyQuantity: number | null
  firstOrderedPeriod: string | null
  lastOrderedPeriod: string | null
  monthlyKnownAmountTotal: number | null
  outsideMonthlyKnownAmountTotal: number | null
  outsideMonthlyLineCount: number
  unclassifiedLineCount: number
  months: ProductHistoryMonth[]
  lines: ProductHistoryLine[]
}

export function fetchProductHistory(productId: number, signal?: AbortSignal): Promise<ProductHistory> {
  return getJson<ProductHistory>(`/api/v1/products/${productId}/history`, signal)
}
