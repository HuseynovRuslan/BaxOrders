import { deleteJson, getJson, postJson, putJson } from './client'
import type { ImportPreview, ImportStatus, IssueSeverity, IssueType, RowStatus } from './imports'

/** The cells an operator may correct. The "№" column and the total are not among them. */
export type CorrectionField =
  | 'MainCategory'
  | 'MiddleCategory'
  | 'SubCategory'
  | 'ProductName'
  | 'SpecificationValue'
  | 'SpecificationUnit'
  | 'ModelCode'
  | 'Quantity'
  | 'OrderUnit'
  | 'UnitPrice'
  | 'Supplier'
  | 'Location'
  | 'RequestPeriod'
  | 'ResponsiblePerson'

export type IssueOrigin = 'Parsing' | 'Matching' | 'Validation' | 'DuplicateDetection' | 'Staging'

export interface RowFieldDetail {
  field: CorrectionField
  /** The workbook header this cell belongs to. */
  column: string
  sourceValue: string | null
  correctedValue: string | null
  effectiveValue: string | null
  isCorrected: boolean
  /** Excel turned this cell into a date; what the author typed cannot be recovered. */
  storedAsDate: boolean
  /** The operator confirmed this cell is empty on purpose; it is not simply uncorrected. */
  isIntentionallyEmpty: boolean
}

export interface RowIssueDetail {
  issueType: IssueType
  severity: IssueSeverity
  origin: IssueOrigin
  fieldName: string | null
  message: string
}

export interface RowMatchDetail {
  location: string | null
  supplier: string | null
  responsiblePerson: string | null
  category: string | null
  product: string | null
  productVariant: string | null
  orderUnit: string | null
  specificationUnit: string | null
}

export interface ImportRowDetail {
  id: number
  importBatchId: number
  sheetName: string
  rowNumber: number
  sequenceNumber: string | null
  status: RowStatus
  isExcluded: boolean
  exclusionReason: string | null
  excludedAtUtc: string | null
  parsedQuantity: number | null
  parsedUnitPrice: number | null
  parsedRequestPeriod: string | null
  calculatedLineTotal: number | null
  originalLineTotal: string | null
  correctionCount: number
  fields: RowFieldDetail[]
  matches: RowMatchDetail
  issues: RowIssueDetail[]
}

export interface CorrectionCandidate {
  rowId: number
  sheetName: string
  rowNumber: number
  productName: string | null
  locationName: string | null
  period: string | null
  status: RowStatus
  isExcluded: boolean
  correctionCount: number
  issues: RowIssueDetail[]
}

export interface PagedCandidates {
  items: CorrectionCandidate[]
  page: number
  pageSize: number
  totalCount: number
}

export interface RowCorrectionResult {
  row: ImportRowDetail
  preview: ImportPreview
}

export interface ReadinessBlocker {
  /** Where the decision is taken: a review tab name, or "Rows" for row-specific problems. */
  area: string
  issueType: IssueType
  rowCount: number
  message: string
}

export interface ImportReadiness {
  importBatchId: number
  batchStatus: ImportStatus
  totalRows: number
  includedRows: number
  excludedRows: number
  validRows: number
  warningRows: number
  invalidRows: number
  unresolvedReferences: {
    locations: number
    suppliers: number
    responsiblePeople: number
    orderUnits: number
    specificationUnits: number
    categoryPaths: number
  }
  products: { unresolvedProducts: number; unresolvedVariants: number; dependencyBlockedRows: number }
  rowIssues: {
    invalidQuantity: number
    invalidPeriod: number
    missingRequiredValue: number
    ambiguousMatch: number
    otherErrors: number
  }
  warnings: {
    /** Task 2's «N sətirdə qiymət yoxdur»: always `unclassifiedPrice` + `priceRequired`. */
    missingPrice: number
    invalidPrice: number
    lineTotalMismatch: number
    cellsStoredAsDates: number
    /** Unpriced rows a reviewer said are supplied free. Never a warning. */
    priceNotRequired: number
    /** Unpriced rows nobody classified: «Təsnif edilməyib» once imported. */
    unclassifiedPrice: number
    /** Unpriced rows a reviewer said are bought: «Alış qiyməti tələb olunur». */
    priceRequired: number
  }
  possibleDuplicateRows: number
  existingRequestGroups: {
    locationId: number
    locationName: string
    period: string
    rowCount: number
    latestVersion: number
  }[]
  canImport: boolean
  blockers: ReadinessBlocker[]
}

export function fetchRow(importId: number, rowId: number, signal?: AbortSignal): Promise<ImportRowDetail> {
  return getJson<ImportRowDetail>(`/api/v1/imports/${importId}/rows/${rowId}`, signal)
}

export function fetchCandidates(
  importId: number,
  query: { issueType?: IssueType; status?: RowStatus; excluded?: boolean; search?: string; page: number; pageSize: number },
  signal?: AbortSignal,
): Promise<PagedCandidates> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
  if (query.issueType) params.set('issueType', query.issueType)
  if (query.status) params.set('status', query.status)
  if (query.excluded !== undefined) params.set('excluded', String(query.excluded))
  if (query.search) params.set('search', query.search)
  return getJson<PagedCandidates>(`/api/v1/imports/${importId}/corrections/candidates?${params.toString()}`, signal)
}

/** Records what the cell should have said. The Excel value is kept either way. */
export function applyCorrection(importId: number, rowId: number, field: CorrectionField, value: string): Promise<RowCorrectionResult> {
  return putJson<RowCorrectionResult>(`/api/v1/imports/${importId}/rows/${rowId}/corrections/${field}`, { value })
}

/**
 * Confirms the cell is empty on purpose — a service line with no order unit. The Excel value is kept; only
 * the effective value becomes empty, and the row stops being blocked for a missing value.
 */
export function clearCorrection(importId: number, rowId: number, field: CorrectionField): Promise<RowCorrectionResult> {
  return postJson<RowCorrectionResult>(`/api/v1/imports/${importId}/rows/${rowId}/corrections/${field}/clear`, {})
}

export function revertCorrection(importId: number, rowId: number, field: CorrectionField): Promise<RowCorrectionResult> {
  return deleteJson<RowCorrectionResult>(`/api/v1/imports/${importId}/rows/${rowId}/corrections/${field}`)
}

export function excludeRow(importId: number, rowId: number, reason: string): Promise<RowCorrectionResult> {
  return postJson<RowCorrectionResult>(`/api/v1/imports/${importId}/rows/${rowId}/exclude`, { reason })
}

export function includeRow(importId: number, rowId: number): Promise<RowCorrectionResult> {
  return postJson<RowCorrectionResult>(`/api/v1/imports/${importId}/rows/${rowId}/include`, {})
}

export function fetchReadiness(importId: number, signal?: AbortSignal): Promise<ImportReadiness> {
  return getJson<ImportReadiness>(`/api/v1/imports/${importId}/readiness`, signal)
}
