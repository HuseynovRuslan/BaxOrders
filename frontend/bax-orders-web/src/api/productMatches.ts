import { getJson, postJson } from './client'
import type { PagedResult } from './orders'

/**
 * Mirrors `BaxOrders.Application.Catalog.ProductMatches`. Nothing here is recomputed in the browser.
 *
 * The Products page reads it: the suggestions, the base products with their variants, and the decisions. Deciding
 * needs `canDecideProductMatches`, and the server refuses anybody else whatever a screen offers.
 */

/** "Yazılış fərqi" — one item written two ways; "Variant fərqi" — a variant of a base product, never merged. */
export type ProductMatchKind = 'SameItem' | 'Variant'

export type ProductMatchOutcome = 'Approved' | 'Rejected'

export type SpellingDifference = 'Whitespace' | 'Slash' | 'WhitespaceAndSlash'

/** One side of a suggestion: a variant for a spelling match, a whole product for a variant link. */
export interface ProductMatchSide {
  productId: number
  productCode: string
  productName: string
  variantId: number | null
  specificationValue: string | null
  specificationUnitCode: string | null
  specificationDescriptor: string | null
  modelCode: string | null
  orderUnitCode: string | null
  lineCount: number
  locationCount: number
  /** The first day of the first month ordered, "yyyy-MM-dd". */
  firstMonth: string
  lastMonth: string
}

export interface ProductMatchSuggestion {
  kind: ProductMatchKind
  source: ProductMatchSide
  target: ProductMatchSide
  /** A spelling match only. */
  difference: SpellingDifference | null
  /** A variant link only: the variant's short name under its base. */
  proposedLabel: string | null
}

export interface ProductMatchSuggestionList {
  kind: ProductMatchKind
  sameItemCount: number
  variantCount: number
  filteredCount: number
  suggestions: PagedResult<ProductMatchSuggestion>
}

export interface ProductMatchDecision {
  id: number
  kind: ProductMatchKind
  outcome: ProductMatchOutcome
  sourceProductId: number
  sourceProductName: string
  targetProductId: number
  targetProductName: string
  sourceVariantId: number | null
  sourceVariantDescription: string | null
  targetVariantId: number | null
  targetVariantDescription: string | null
  variantLabel: string | null
  reason: string | null
  decidedByUserId: string
  decidedByDisplayName: string
  decidedAtUtc: string
  undoneByUserId: string | null
  undoneByDisplayName: string | null
  undoneAtUtc: string | null
  undoReason: string | null
  isLive: boolean
}

/** Where a product was ordered, in the versions every screen reads. */
export interface ProductMatchUsage {
  lineCount: number
  locationCount: number
  /** The first day of the first month ordered, "yyyy-MM-dd". */
  firstMonth: string
  lastMonth: string
}

/** One approved variant under its base. Still a product of its own, with its own lines and history. */
export interface ProductFamilyMember {
  /** The live approval behind the link — what "Geri al" takes back. */
  decisionId: number
  productId: number
  productName: string
  variantLabel: string
  decidedByDisplayName: string
  decidedAtUtc: string
  /** Null when the product has no line the screens read. */
  usage: ProductMatchUsage | null
}

/** A base product and the products approved as its variants (13.1). A view of the decisions, not a merge. */
export interface ProductFamily {
  productId: number
  productName: string
  usage: ProductMatchUsage | null
  variants: ProductFamilyMember[]
}

export interface ProductMatchCommand {
  kind: ProductMatchKind
  /** A spelling match: the variant that will count as the other. A variant link: the variant product. */
  sourceId: number
  /** A spelling match: the variant whose name is kept. A variant link: the base product. */
  targetId: number
  /** Approving a variant link only; omitted, the suggestion's proposed label. */
  variantLabel?: string
  reason?: string
}

export function fetchProductMatchSuggestions(
  query: { kind: ProductMatchKind; search?: string; page: number; pageSize: number },
  signal?: AbortSignal,
): Promise<ProductMatchSuggestionList> {
  const params = new URLSearchParams({ kind: query.kind, page: String(query.page), pageSize: String(query.pageSize) })
  if (query.search) params.set('search', query.search)
  return getJson<ProductMatchSuggestionList>(`/api/v1/catalog/product-matches/suggestions?${params.toString()}`, signal)
}

export function fetchProductMatchDecisions(
  query: { kind?: ProductMatchKind; outcome?: ProductMatchOutcome; includeUndone?: boolean; page: number; pageSize: number },
  signal?: AbortSignal,
): Promise<PagedResult<ProductMatchDecision>> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
  if (query.kind) params.set('kind', query.kind)
  if (query.outcome) params.set('outcome', query.outcome)
  if (query.includeUndone) params.set('includeUndone', 'true')
  return getJson<PagedResult<ProductMatchDecision>>(`/api/v1/catalog/product-matches/decisions?${params.toString()}`, signal)
}

export function fetchProductMatchFamilies(
  query: { search?: string; page: number; pageSize: number },
  signal?: AbortSignal,
): Promise<PagedResult<ProductFamily>> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
  if (query.search) params.set('search', query.search)
  return getJson<PagedResult<ProductFamily>>(`/api/v1/catalog/product-matches/families?${params.toString()}`, signal)
}

export function approveProductMatch(command: ProductMatchCommand, signal?: AbortSignal): Promise<ProductMatchDecision> {
  return postJson<ProductMatchDecision>('/api/v1/catalog/product-matches/approve', command, signal)
}

export function rejectProductMatch(
  command: Omit<ProductMatchCommand, 'variantLabel'>,
  signal?: AbortSignal,
): Promise<ProductMatchDecision> {
  return postJson<ProductMatchDecision>('/api/v1/catalog/product-matches/reject', command, signal)
}

export function undoProductMatch(decisionId: number, reason?: string, signal?: AbortSignal): Promise<ProductMatchDecision> {
  return postJson<ProductMatchDecision>(`/api/v1/catalog/product-matches/decisions/${decisionId}/undo`, { reason }, signal)
}
