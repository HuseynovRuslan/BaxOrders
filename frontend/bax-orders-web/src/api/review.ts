import { getJson, postJson } from './client'
import type { ImportPreview } from './imports'

export type ResolutionKind =
  | 'Location'
  | 'Supplier'
  | 'ResponsiblePerson'
  | 'OrderUnit'
  | 'SpecificationUnit'
  | 'CategoryPath'
  | 'Product'
  | 'ProductVariant'
export type ResolutionScope = 'BatchOnly' | 'GlobalAlias'
export type UnresolvedStatus = 'Unknown' | 'Ambiguous' | 'IncompletePath'
export type UnitType = 'Count' | 'Length' | 'Area' | 'Mass' | 'Volume' | 'Package' | 'Pair' | 'Other'

export interface UnresolvedSummaryItem {
  kind: ResolutionKind
  distinctValues: number
  affectedRows: number
  /** Rows waiting for an earlier decision; only variants have them today. */
  dependencyBlockedRows: number
  /** Distinct values of this kind in the batch, decided or not: the work queue's denominator. */
  totalValues: number
  resolvedValues: number
}

export interface UnresolvedSampleRow {
  sheetName: string
  rowNumber: number
  productName: string | null
  locationName: string | null
  period: string | null
}

export interface UnresolvedValue {
  sourceKey: string
  displayValue: string
  normalizedValue: string
  affectedRowCount: number
  sampleOriginalValues: string[]
  sampleRows: UnresolvedSampleRow[]
  currentStatus: UnresolvedStatus
  /** The record this value belongs to, such as the product of a variant. */
  parentLabel: string | null
}

export interface ReferenceOption {
  id: number
  label: string
  secondary: string | null
}

export interface CategoryPathLevel {
  name: string
  existingCategoryId: number | null
}

export interface CategoryPathPlan {
  sourceKey: string
  levels: CategoryPathLevel[]
  canCreate: boolean
  problem: string | null
}

/** What creating one variant would produce, built from the decisions the rows already carry. */
export interface VariantPlan {
  sourceKey: string
  productId: number
  productLabel: string
  specificationValue: string | null
  specificationUnitLabel: string | null
  modelCode: string | null
  /** Empty when the rows were explicitly reviewed as having no order unit. */
  orderUnitLabel: string
  /** A word from "Vahid" that is not a unit ("diş", "qat"), when there is one. */
  specificationDescriptor: string | null
  canCreate: boolean
  problem: string | null
}

export interface ResolutionResult {
  outcome: 'Applied' | 'AlreadyApplied'
  resolutionId: number
  kind: ResolutionKind
  sourceKey: string
  targetId: number
  targetLabel: string
  aliasSaved: boolean
  affectedRows: number
  preview: ImportPreview
}

export interface PagedUnresolved {
  items: UnresolvedValue[]
  page: number
  pageSize: number
  totalCount: number
}

const referencePaths: Record<Exclude<ResolutionKind, 'ProductVariant'>, string> = {
  Location: 'locations',
  Supplier: 'suppliers',
  ResponsiblePerson: 'responsible-people',
  OrderUnit: 'units',
  SpecificationUnit: 'units',
  CategoryPath: 'categories',
  Product: 'products',
}

export function fetchUnresolvedSummary(importId: number, signal: AbortSignal): Promise<UnresolvedSummaryItem[]> {
  return getJson<UnresolvedSummaryItem[]>(`/api/v1/imports/${importId}/unresolved/summary`, signal)
}

export function fetchUnresolved(
  importId: number,
  query: { kind: ResolutionKind; search?: string; page: number; pageSize: number },
  signal: AbortSignal,
): Promise<PagedUnresolved> {
  const params = new URLSearchParams({ kind: query.kind, page: String(query.page), pageSize: String(query.pageSize) })
  if (query.search) params.set('search', query.search)
  return getJson<PagedUnresolved>(`/api/v1/imports/${importId}/unresolved?${params.toString()}`, signal)
}

export function fetchCategoryPathPlan(importId: number, sourceKey: string, signal: AbortSignal): Promise<CategoryPathPlan> {
  const params = new URLSearchParams({ sourceKey })
  return getJson<CategoryPathPlan>(`/api/v1/imports/${importId}/unresolved/category-path?${params.toString()}`, signal)
}

export function fetchVariantPlan(importId: number, sourceKey: string, signal: AbortSignal): Promise<VariantPlan> {
  const params = new URLSearchParams({ sourceKey })
  return getJson<VariantPlan>(`/api/v1/imports/${importId}/unresolved/product-variant?${params.toString()}`, signal)
}

/** Canonical records to choose from. Nothing is preselected: the operator picks one. */
export function searchReference(kind: ResolutionKind, search: string, signal: AbortSignal): Promise<ReferenceOption[]> {
  if (kind === 'ProductVariant') {
    throw new Error('Variantlar yalnız bir məhsulun daxilində axtarılır.')
  }

  const params = new URLSearchParams(search ? { search } : {})
  return getJson<ReferenceOption[]>(`/api/v1/reference/${referencePaths[kind]}?${params.toString()}`, signal)
}

/** Variants are searched inside one product only; a variant of another product is never a candidate. */
export function searchProductVariants(productId: number, search: string, signal: AbortSignal): Promise<ReferenceOption[]> {
  const params = new URLSearchParams(search ? { search } : {})
  return getJson<ReferenceOption[]>(`/api/v1/reference/products/${productId}/variants?${params.toString()}`, signal)
}

export type BulkResolutionAction = 'MapExisting' | 'CreateFromValue'
export type BulkItemStatus = 'Ready' | 'AlreadyResolved' | 'DependencyBlocked' | 'Conflict' | 'NotFound'

/** Kinds whose value is the record's own name, so it can be created exactly as the sheet spells it. */
export const bulkCreatableKinds: ResolutionKind[] = ['Location', 'Supplier', 'ResponsiblePerson', 'Product', 'ProductVariant']

export interface BulkResolutionItem {
  kind: ResolutionKind
  sourceKey: string
  action: BulkResolutionAction
  targetId?: number | null
  scope?: ResolutionScope
}

export interface BulkPreviewItem {
  kind: ResolutionKind
  sourceKey: string
  displayValue: string
  affectedRowCount: number
  action: BulkResolutionAction
  status: BulkItemStatus
  targetLabel: string | null
  createsRecord: boolean
  createsAlias: boolean
  problem: string | null
  parentLabel: string | null
  /** How many raw spellings of the sheet fall into this one value. */
  sourceSpellings: number
}

export interface BulkPreviewSummary {
  selected: number
  ready: number
  conflicts: number
  alreadyResolved: number
  dependencyBlocked: number
  recordsToCreate: number
  aliasesToCreate: number
  rowsAffected: number
}

export interface BulkPreviewResult {
  summary: BulkPreviewSummary
  items: BulkPreviewItem[]
}

export interface BulkApplyResult {
  appliedItems: number
  skippedItems: number
  createdRecords: number
  aliasesSaved: number
  rowsRematched: number
  preview: ImportPreview
  items: BulkPreviewItem[]
}

/** What the selected decisions would do. Reads only: nothing is written. */
export function previewBulk(importId: number, items: BulkResolutionItem[], signal?: AbortSignal): Promise<BulkPreviewResult> {
  return postJson<BulkPreviewResult>(`/api/v1/imports/${importId}/review/bulk/preview`, { items }, signal)
}

/** Applies the confirmed decisions as one operation: all of them, or none. */
export function applyBulk(importId: number, items: BulkResolutionItem[]): Promise<BulkApplyResult> {
  return postJson<BulkApplyResult>(`/api/v1/imports/${importId}/review/bulk/apply`, { items })
}

export function mapToExisting(
  importId: number,
  body: { kind: ResolutionKind; sourceKey: string; targetId: number; scope: ResolutionScope },
): Promise<ResolutionResult> {
  return postJson<ResolutionResult>(`/api/v1/imports/${importId}/resolutions/map`, body)
}

export function createLocation(
  importId: number,
  body: { sourceKey: string; name: string; scope: ResolutionScope },
): Promise<ResolutionResult> {
  return postJson<ResolutionResult>(`/api/v1/imports/${importId}/resolutions/locations`, body)
}

export function createSupplier(
  importId: number,
  body: { sourceKey: string; name: string; code?: string | null; scope: ResolutionScope },
): Promise<ResolutionResult> {
  return postJson<ResolutionResult>(`/api/v1/imports/${importId}/resolutions/suppliers`, body)
}

export function createResponsiblePerson(
  importId: number,
  body: { sourceKey: string; name: string; scope: ResolutionScope },
): Promise<ResolutionResult> {
  return postJson<ResolutionResult>(`/api/v1/imports/${importId}/resolutions/responsible-people`, body)
}

export function createUnit(
  importId: number,
  body: { kind: ResolutionKind; sourceKey: string; code: string; name: string; symbol?: string | null; unitType: UnitType; scope: ResolutionScope },
): Promise<ResolutionResult> {
  return postJson<ResolutionResult>(`/api/v1/imports/${importId}/resolutions/units`, body)
}

/**
 * Records that a value standing in a unit column is not a unit of measure at all. Nothing is created: in
 * "Vahid" the word stays with the specification as a descriptor, in "Ö/v" the rows become unitless.
 */
export function markNotAUnit(
  importId: number,
  body: { kind: ResolutionKind; sourceKey: string },
): Promise<ResolutionResult> {
  return postJson<ResolutionResult>(`/api/v1/imports/${importId}/resolutions/not-a-unit`, body)
}

export function createCategoryPath(importId: number, body: { sourceKey: string }): Promise<ResolutionResult> {
  return postJson<ResolutionResult>(`/api/v1/imports/${importId}/resolutions/category-paths`, body)
}

export function createProduct(
  importId: number,
  body: { sourceKey: string; name: string; categoryId?: number | null; scope: ResolutionScope },
): Promise<ResolutionResult> {
  return postJson<ResolutionResult>(`/api/v1/imports/${importId}/resolutions/products`, body)
}

/** The variant carries no fields of its own: it is built from the product and units already resolved. */
export function createProductVariant(importId: number, body: { sourceKey: string }): Promise<ResolutionResult> {
  return postJson<ResolutionResult>(`/api/v1/imports/${importId}/resolutions/product-variants`, body)
}
