import { getJson, postJson } from './client'
import type { PricingMode } from './orders'

/**
 * Mirrors `BaxOrders.Application.Orders.Pricing`. One unpriced line waiting for somebody to say how it was
 * supplied, with the context that lets them decide.
 *
 * The provenance fields are not decoration. Nobody can tell a bought line from a free one by looking at a
 * product name: the answer is in which object ordered it, when, from which source, and what the workbook cell
 * actually said — which is what settled it for the lines that came in as "Azpetrol baza".
 */
export interface PricingModeReviewRow {
  orderRequestItemId: number
  orderRequestId: number
  requestPeriod: string
  locationId: number
  locationName: string
  productVariantId: number
  productCode: string
  productName: string
  specificationValue: string | null
  specificationDescriptor: string | null
  orderUnitCode: string | null
  quantity: number
  supplierId: number | null
  supplierName: string | null
  /** What the workbook cell held, which for these lines is often the only record of the real source. */
  workbookSupplierName: string | null
  importRowId: number | null
  sheetName: string | null
  rowNumber: number | null
  pricingMode: PricingMode
}

export interface PricingModeReview {
  rows: PricingModeReviewRow[]
  totalCount: number
  /** Lines nobody has classified. The queue this screen exists to empty. */
  unresolved: number
  missingRequiredPrice: number
  internalFreeSupply: number
}

export interface PricingModeReviewQuery {
  mode?: PricingMode
  search?: string
  page: number
  pageSize: number
}

export interface SetPricingModeCommand {
  orderRequestItemIds: number[]
  pricingMode: PricingMode
  reason?: string
}

export interface SetPricingModeResult {
  changed: number
  unchanged: number
  pricingMode: PricingMode
}

export function fetchPricingModeReview(
  query: PricingModeReviewQuery,
  signal?: AbortSignal,
): Promise<PricingModeReview> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
  if (query.mode) params.set('mode', query.mode)
  if (query.search) params.set('search', query.search)
  return getJson<PricingModeReview>(`/api/v1/pricing-mode-review?${params.toString()}`, signal)
}

export function setPricingMode(command: SetPricingModeCommand): Promise<SetPricingModeResult> {
  return postJson<SetPricingModeResult>('/api/v1/pricing-mode-review', command)
}
