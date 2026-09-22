import { getJson } from './client'

/** A request lives in one of these states. Task 5 only ever displays them. */
export type OrderRequestStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'ReturnedForCorrection'

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
  /** Only the lines whose price is known. Null when no line of the location has one. */
  knownAmountTotal: number | null
  missingPriceItemCount: number
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
  knownAmountTotal: number | null
  createdAtUtc: string
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
  years: number[]
  requests: PagedResult<LocationOrderHistoryEntry>
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
  categoryPath: string[]
  source: OrderItemSourceRef | null
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

export function fetchOrderItemSource(orderRequestItemId: number, signal?: AbortSignal): Promise<OrderItemSource> {
  return getJson<OrderItemSource>(`/api/v1/orders/items/${orderRequestItemId}/source`, signal)
}
