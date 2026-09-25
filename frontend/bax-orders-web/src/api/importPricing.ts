import { getJson, postJson } from './client'
import type { ImportPreview } from './imports'
import type { PricingMode } from './orders'

/**
 * Mirrors `BaxOrders.Application.Imports.Pricing`: pricing classification during import review (brief 16.1).
 *
 * A staged row with no price, and what the review has said about it so far. Names are the catalogue's where the
 * row is matched, and the effective workbook text (after corrections) where it is not.
 */
export interface ImportPricingRow {
  importRowId: number
  sheetName: string
  rowNumber: number
  locationName: string | null
  requestPeriod: string | null
  productName: string | null
  specificationValue: string | null
  orderUnit: string | null
  quantity: number | null
  /** The matched supplier's name; null when the row matched none. */
  supplierName: string | null
  /** What the workbook's supplier cell says, after corrections. */
  workbookSupplierName: string | null
  /** Null when nobody classified the row: it becomes «Təsnif edilməyib» once imported. Never `Unresolved`. */
  classification: Exclude<PricingMode, 'Unresolved'> | null
  classifiedByDisplayName: string | null
  classifiedAtUtc: string | null
}

export interface ImportPricingReview {
  rows: ImportPricingRow[]
  /** What the filter and the search leave — what the pager paces. */
  totalCount: number
  /** The import's included unpriced rows nobody classified, whatever the filter and the search. */
  unclassified: number
  priceRequired: number
  internalFreeSupply: number
}

export interface ImportPricingQuery {
  /** `Unresolved` lists the rows nobody classified; absent lists all of them. */
  mode?: PricingMode
  search?: string
  page: number
  pageSize: number
}

/** Rows are named one by one: there is no "every row of this supplier". `Unresolved` takes a classification away. */
export interface SetImportPricingCommand {
  importRowIds: number[]
  pricingMode: PricingMode
}

export interface ImportPricingResult {
  changed: number
  unchanged: number
  pricingMode: PricingMode
  /** The refreshed import preview, as every review write returns it. */
  preview: ImportPreview
}

export function fetchImportPricing(
  importId: number,
  query: ImportPricingQuery,
  signal?: AbortSignal,
): Promise<ImportPricingReview> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
  if (query.mode) params.set('mode', query.mode)
  if (query.search) params.set('search', query.search)
  return getJson<ImportPricingReview>(`/api/v1/imports/${importId}/pricing?${params.toString()}`, signal)
}

export function setImportPricing(importId: number, command: SetImportPricingCommand): Promise<ImportPricingResult> {
  return postJson<ImportPricingResult>(`/api/v1/imports/${importId}/pricing`, command)
}
