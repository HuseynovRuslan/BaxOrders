import { getJson, postJson } from './client'
import type { PagedResult } from './orders'

/** Mirrors `BaxOrders.Application.Catalog`. Nothing here is recomputed in the browser. */
export type ProductCategoryState = 'Assigned' | 'UniqueEvidence' | 'Ambiguous' | 'NoEvidence'

export type ProductCategoryFilter = 'All' | 'Assigned' | 'UniqueEvidence' | 'Ambiguous' | 'NoEvidence'

export type ProductCategoryDecisionType = 'AutoUniqueEvidence' | 'Manual'

/**
 * One category the import history named for a product, and how many rows named it.
 * </summary>
 * The count is evidence, not a vote: nothing — here or on the server — treats the larger one as the answer.
 */
export interface ProductCategoryEvidence {
  categoryId: number
  /** The whole path, root first. */
  path: string[]
  occurrences: number
}

export interface ProductCategoryRow {
  productId: number
  productCode: string
  productName: string
  currentCategoryId: number | null
  /** The canonical category the catalogue carries now, root first. Empty when it has none. */
  currentCategoryPath: string[]
  state: ProductCategoryState
  /** Every distinct category this product's history named, most-seen first. */
  evidence: ProductCategoryEvidence[]
}

export interface ProductCategorySummary {
  totalProductCount: number
  assignedCount: number
  uniqueEvidenceCount: number
  ambiguousCount: number
  noEvidenceCount: number
}

export interface ProductCategoryList {
  /** Always the whole catalogue, whatever the search or filter narrowed the rows to. */
  summary: ProductCategorySummary
  filteredCount: number
  rows: PagedResult<ProductCategoryRow>
}

export interface ProductCategoryRequest {
  search?: string
  filter?: ProductCategoryFilter
  page: number
  pageSize: number
}

export interface ApplySafeCategoriesResult {
  assignedCount: number
  skippedAmbiguousCount: number
  skippedNoEvidenceCount: number
  skippedAlreadyAssignedCount: number
}

export interface ProductCategoryDecision {
  id: number
  productId: number
  previousCategoryId: number | null
  newCategoryId: number
  newCategoryPath: string[]
  decisionType: ProductCategoryDecisionType
  actorUserId: string
  actorDisplayName: string
  reason: string | null
  occurredAtUtc: string
}

export function fetchProductCategorySummary(signal?: AbortSignal): Promise<ProductCategorySummary> {
  return getJson<ProductCategorySummary>('/api/v1/catalog/product-categories/summary', signal)
}

export function fetchProductCategories(
  query: ProductCategoryRequest,
  signal?: AbortSignal,
): Promise<ProductCategoryList> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
  if (query.search) params.set('search', query.search)
  if (query.filter && query.filter !== 'All') params.set('filter', query.filter)
  return getJson<ProductCategoryList>(`/api/v1/catalog/product-categories?${params.toString()}`, signal)
}

/**
 * Gives a category to every product that has none and whose whole history names exactly one.
 * </summary>
 * Nothing is sent: the server works out which products those are when the request arrives, so a stale count
 * on the screen can never decide what gets written.
 */
export function applySafeProductCategories(signal?: AbortSignal): Promise<ApplySafeCategoriesResult> {
  return postJson<ApplySafeCategoriesResult>('/api/v1/catalog/product-categories/apply-safe', {}, signal)
}

export function assignProductCategory(
  productId: number,
  categoryId: number,
  reason: string | undefined,
  signal?: AbortSignal,
): Promise<ProductCategoryDecision> {
  return postJson<ProductCategoryDecision>(
    `/api/v1/catalog/products/${productId}/category`,
    { categoryId, reason },
    signal,
  )
}
