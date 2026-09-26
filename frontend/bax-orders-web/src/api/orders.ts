import { getJson } from './client'

/** A request lives in one of these states. Task 5 only ever displays them. */
export type OrderRequestStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'ReturnedForCorrection'

/** Whether a supplier's lines are expected to carry a purchase price. */
export type SupplierPriceRequirement = 'Required' | 'NotRequired'

/**
 * What an empty price on one order line means. Three states, because two were not enough: one supplier can
 * both sell to the company and issue material to it free, so the answer belongs to the line and not to the
 * supplier, and a line nobody has answered for yet is its own case rather than a guess in either direction.
 */
export type PricingMode =
  /** A purchase price is owed. Empty here is a gap somebody has to close. */
  | 'PriceRequired'
  /** The company supplies this itself. Empty here is complete, and never a warning. */
  | 'InternalFreeSupply'
  /** Nobody has said which. Counted with the gaps, because the cautious reading cannot hide a real one. */
  | 'Unresolved'

export type LocationOrderSort = 'Name' | 'LatestPeriod' | 'OrderRequestCount'

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

export interface LocationOrderSummary {
  locationId: number
  code: string
  name: string
  isActive: boolean
  orderRequestCount: number
  distinctPeriodCount: number
  earliestPeriod: string | null
  latestPeriod: string | null
  latestRequestId: number | null
  latestRequestVersion: number | null
  latestRequestStatus: OrderRequestStatus | null
  totalItemCount: number
  /** Everything the location has ever ordered. Only the lines whose price is known; null when it has none. */
  knownAmountTotal: number | null
  missingPriceItemCount: number
  /** The latest order alone — what this place ordered last, which is what a list of objects is read for. */
  latestKnownAmount: number | null
  latestItemCount: number
  latestMissingPriceItemCount: number
  /** Lines of the latest order supplied internally. Neutral context, never a warning. */
  latestPriceNotRequiredItemCount: number
  latestAmountIsComplete: boolean
  previousPeriod: string | null
  /** The month before the latest order. Null when it has no request, so no difference is offered. */
  previousKnownAmount: number | null
  knownAmountDelta: number | null
  knownAmountPercentChange: number | null
  /**
   * Whether the latest order was carried in from Excel as already approved: the workflow's recorded fact, by the same
   * rule as the order page. True only with `latestRequestStatus === 'Approved'`, and never inferred from a missing
   * approver or date.
   */
  latestRequestIsHistoricalImport: boolean
}

export interface LocationOrderList {
  locations: PagedResult<LocationOrderSummary>
  locationCount: number
  locationsWithOrders: number
  orderRequestCount: number
  earliestPeriod: string | null
  latestPeriod: string | null
}

export interface LocationOrderHistoryEntry {
  orderRequestId: number
  requestPeriod: string
  version: number
  requestDate: string | null
  status: OrderRequestStatus
  itemCount: number
  knownPriceItemCount: number
  missingPriceItemCount: number
  /** Lines supplied from the company's own store. Neutral context, never a warning. */
  internalSupplyItemCount: number
  knownAmountTotal: number | null
  createdAtUtc: string
  /** Carried in from Excel as already approved — the workflow's recorded fact, as on the order page. Status stays Approved. */
  isHistoricalImport: boolean
}

export interface LocationOrderHistory {
  locationId: number
  code: string
  name: string
  isActive: boolean
  orderRequestCount: number
  distinctPeriodCount: number
  earliestPeriod: string | null
  latestPeriod: string | null
  totalItemCount: number
  knownAmountTotal: number | null
  missingPriceItemCount: number
  /** Lines supplied from the company's own store, over the whole history. Never a warning. */
  internalSupplyItemCount: number
  years: number[]
  requests: PagedResult<LocationOrderHistoryEntry>
  /**
   * The latest month's newest version — what "Müqayisə et" opens. From the header, so it is the same on every page
   * and under every filter. Null when the object has no order.
   */
  latestOrderRequestId: number | null
}

export interface OrderItemSourceRef {
  importBatchId: number
  importRowId: number
  sheetName: string
  rowNumber: number
}

export interface OrderRequestItem {
  orderRequestItemId: number
  productId: number
  productCode: string
  productName: string
  productVariantId: number
  specificationValue: string | null
  specificationUnitCode: string | null
  specificationUnitName: string | null
  /** A word from the "Vahid" column that is not a unit ("diş", "qat"). */
  specificationDescriptor: string | null
  modelCode: string | null
  /** Null when the line was reviewed as having no order unit — a service. */
  orderUnitCode: string | null
  orderUnitName: string | null
  quantity: number
  unitPrice: number | null
  lineTotal: number | null
  supplierId: number | null
  supplierName: string | null
  /**
   * What an empty `unitPrice` on this line means: a price nobody has filled in, material the company supplies
   * itself that never had one, or a line nobody has classified yet. It is a property of the line, because the
   * same supplier can be the source of all three.
   */
  pricingMode: PricingMode
  /**
   * The supplier cell of the workbook row this line came from. Often the only record of which of the
   * company's own stores an internally supplied line was issued by.
   */
  sourceSupplierName: string | null
  categoryPath: string[]
  /** The workbook row this very line came from. Null for a copied line — its row is reached through the chain. */
  source: OrderItemSourceRef | null
  /** The line of the previous version this one was copied from, if any. */
  sourceOrderRequestItemId: number | null
}

export interface OrderRequestDetail {
  orderRequestId: number
  locationId: number
  locationCode: string
  locationName: string
  requestPeriod: string
  requestDate: string | null
  version: number
  status: OrderRequestStatus
  createdAtUtc: string
  sourceImportBatchId: number | null
  itemCount: number
  knownPriceItemCount: number
  missingPriceItemCount: number
  knownAmountTotal: number | null
  /** True when this version was made as the correction of a returned one. */
  isRevision: boolean
  sourceOrderRequestId: number | null
  sourceVersion: number | null
  /** True when a correction has been made from this version; it is then superseded. */
  hasRevision: boolean
  revisionOrderRequestId: number | null
  revisionVersion: number | null
  /** Decided by the server, like every other permission. The endpoints check again. */
  canCreateRevision: boolean
  canEditRevision: boolean
  items: PagedResult<OrderRequestItem>
}

export interface OrderItemSourceField {
  column: string
  /** The workbook value, exactly as staged. A correction never rewrites it. */
  sourceValue: string | null
  effectiveValue: string | null
  isCorrected: boolean
  isIntentionallyEmpty: boolean
  /** The catalog record the value was resolved to, when the column has one. */
  canonicalValue: string | null
}

/** Where a line ultimately comes from. */
export type OrderItemOrigin = 'Imported' | 'ManuallyAdded'

/** One version a line passed through on its way from the workbook row to here. */
export interface OrderItemLineageStep {
  orderRequestItemId: number
  orderRequestId: number
  version: number
  status: OrderRequestStatus
  /** True for the one step that has a workbook row behind it. */
  isImported: boolean
}

/**
 * Where one line came from, whatever the answer is. A line added by hand while correcting an order says so
 * — `ManuallyAdded`, with no source — rather than reading as a line nobody can account for.
 */
export interface OrderItemProvenance {
  orderRequestItemId: number
  orderRequestId: number
  version: number
  origin: OrderItemOrigin
  /** The line asked about, then each line it was copied from, newest first. */
  lineage: OrderItemLineageStep[]
  source: OrderItemSource | null
}

export interface OrderItemSource {
  orderRequestItemId: number
  orderRequestId: number
  materializedAtUtc: string
  importBatchId: number
  importFileName: string
  importStatus: string
  importRowId: number
  sheetName: string
  rowNumber: number
  isExcluded: boolean
  originalLineTotal: string | null
  calculatedLineTotal: number | null
  fields: OrderItemSourceField[]
}

export function fetchLocationOrders(
  query: { search?: string; sort?: LocationOrderSort; descending?: boolean; page: number; pageSize: number },
  signal?: AbortSignal,
): Promise<LocationOrderList> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
  if (query.search) params.set('search', query.search)
  if (query.sort) params.set('sort', query.sort)
  if (query.descending) params.set('descending', 'true')
  return getJson<LocationOrderList>(`/api/v1/locations/orders?${params.toString()}`, signal)
}

export function fetchLocationHistory(
  locationId: number,
  query: { year?: number; month?: number; page: number; pageSize: number },
  signal?: AbortSignal,
): Promise<LocationOrderHistory> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
  if (query.year) params.set('year', String(query.year))
  if (query.month) params.set('month', String(query.month))
  return getJson<LocationOrderHistory>(`/api/v1/locations/${locationId}/orders?${params.toString()}`, signal)
}

export function fetchOrder(
  orderRequestId: number,
  query: { search?: string; hasPrice?: boolean; supplierId?: number; page: number; pageSize: number },
  signal?: AbortSignal,
): Promise<OrderRequestDetail> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
  if (query.search) params.set('search', query.search)
  if (query.hasPrice !== undefined) params.set('hasPrice', String(query.hasPrice))
  if (query.supplierId) params.set('supplierId', String(query.supplierId))
  return getJson<OrderRequestDetail>(`/api/v1/orders/${orderRequestId}?${params.toString()}`, signal)
}

export function fetchOrderItemSource(orderRequestItemId: number, signal?: AbortSignal): Promise<OrderItemProvenance> {
  return getJson<OrderItemProvenance>(`/api/v1/orders/items/${orderRequestItemId}/source`, signal)
}
