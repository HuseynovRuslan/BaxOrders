import { ApiError, getJson, postJson, toApiError } from './client'

export type ImportStatus = 'Uploaded' | 'Parsing' | 'Validating' | 'NeedsReview' | 'ReadyToImport' | 'Imported' | 'Failed'
export type RowStatus = 'Pending' | 'Valid' | 'NeedsReview' | 'Invalid'
export type IssueSeverity = 'Info' | 'Warning' | 'Error'
export type IssueType =
  | 'UnknownProduct'
  | 'UnknownProductVariant'
  | 'UnknownSupplier'
  | 'UnknownLocation'
  | 'UnknownUnit'
  | 'UnknownCategory'
  | 'UnknownResponsiblePerson'
  | 'AmbiguousMatch'
  | 'MissingRequiredValue'
  | 'InvalidQuantity'
  | 'InvalidPrice'
  | 'InvalidDate'
  | 'MissingPrice'
  | 'InvalidLineTotal'
  | 'LineTotalMismatch'
  | 'DuplicateRow'
  | 'Other'

export interface ImportBatchSummary {
  id: number
  fileName: string
  status: ImportStatus
  totalRows: number
  validRows: number
  warningRows: number
  invalidRows: number
  uploadedAtUtc: string
  completedAtUtc: string | null
  failureReason: string | null
}

export interface ImportIssueCount {
  issueType: IssueType
  severity: IssueSeverity
  count: number
}

export interface ImportGroupPreview {
  locationId: number
  locationName: string
  period: string
  rowCount: number
  pricedRows: number
  unpricedRows: number
  warningCount: number
  errorCount: number
  existingRequest: boolean
  latestVersion: number | null
  suggestedAction: 'CreateNewRequest' | 'RequiresOperatorDecision'
  /**
   * Task 2's «qiymət yoxdur» over the group's included rows: unpriced, and unclassified or said to be bought.
   * `rowCount` / `unpricedRows` above still count excluded rows too, so the two families are never subtracted.
   */
  missingPriceRows: number
  /** Included unpriced rows a reviewer said are supplied free. Never a warning. */
  internalSupplyRows: number
}

export interface ImportPreview {
  batch: ImportBatchSummary
  issueSummary: ImportIssueCount[]
  groups: ImportGroupPreview[]
  ungroupedRows: number
}

export interface SheetDetection {
  sheetName: string
  headerRowNumber: number | null
  dataRows: number
  missingRequiredColumns: string[]
  problem: string | null
}

export interface ImportUploadResponse {
  preview: ImportPreview
  sheets: SheetDetection[]
}

export interface ImportRowIssue {
  issueType: IssueType
  severity: IssueSeverity
  fieldName: string | null
  message: string
}

export interface ImportRow {
  id: number
  sheetName: string
  rowNumber: number
  productName: string | null
  specificationValue: string | null
  specificationUnit: string | null
  modelCode: string | null
  quantity: string | null
  parsedQuantity: number | null
  orderUnit: string | null
  unitPrice: string | null
  parsedUnitPrice: number | null
  lineTotal: string | null
  supplierName: string | null
  locationName: string | null
  requestDate: string | null
  /** First day of the request period ("Tarix" in the order workbook). */
  parsedRequestPeriod: string | null
  responsiblePersonName: string | null
  validationStatus: RowStatus
  issues: ImportRowIssue[]
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

export interface ImportRowQuery {
  page: number
  pageSize: number
  status?: RowStatus
  issueType?: IssueType
  search?: string
}

/**
 * Uploads a workbook. Uses XMLHttpRequest so the caller learns when the file has been sent and the
 * server is reading and validating it. Rejects with ApiError (ProblemDetails) on 4xx/5xx.
 */
export function uploadImport(file: File, onFileSent: () => void): Promise<ImportUploadResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', '/api/v1/imports/excel')
    request.setRequestHeader('Accept', 'application/json')
    request.upload.onload = onFileSent
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(JSON.parse(request.responseText) as ImportUploadResponse)
      } else {
        reject(toApiError(request.status, request.responseText))
      }
    }
    request.onerror = () => reject(new ApiError(0, 'Serverə qoşulmaq mümkün olmadı.'))

    const form = new FormData()
    form.append('file', file)
    request.send(form)
  })
}

export function fetchImport(id: number, signal: AbortSignal): Promise<ImportPreview> {
  return getJson<ImportPreview>(`/api/v1/imports/${id}`, signal)
}

export function fetchImportRows(id: number, query: ImportRowQuery, signal: AbortSignal): Promise<PagedResult<ImportRow>> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
  if (query.status) params.set('status', query.status)
  if (query.issueType) params.set('issueType', query.issueType)
  if (query.search) params.set('search', query.search)
  return getJson<PagedResult<ImportRow>>(`/api/v1/imports/${id}/rows?${params.toString()}`, signal)
}

// ---- confirmation: turning a reviewed import into permanent orders ---------------------------------

/** What the operator must still decide for one location + period group. */
export type GroupConflictState = 'New' | 'ExistingRequest' | 'ExistingDraft'

export type GroupDecisionAction = 'Create' | 'CreateNewVersion' | 'Skip'

export interface ConfirmationGroupPreview {
  locationId: number
  locationCode: string
  locationName: string
  requestPeriod: string
  sourceRowCount: number
  knownPriceItemCount: number
  missingPriceItemCount: number
  possibleDuplicateItemCount: number
  /** Only rows with a known price count towards money; a missing price is never read as zero. */
  knownAmountTotal: number | null
  existingRequest: boolean
  existingVersions: number
  latestVersion: number | null
  proposedVersion: number | null
  conflictState: GroupConflictState
  requiredDecision: GroupDecisionAction | null
  /** Unpriced rows nobody classified: «Təsnif edilməyib» once imported. `missingPriceItemCount` = this + `priceRequiredItemCount`. */
  unclassifiedPriceItemCount: number
  /** Unpriced rows a reviewer said are bought. */
  priceRequiredItemCount: number
  /** Unpriced rows a reviewer said are supplied free. Never a warning. */
  internalSupplyItemCount: number
}

export interface ImportConfirmationResult {
  importBatchId: number
  batchStatus: ImportStatus
  alreadyImported: boolean
  confirmedAtUtc: string
  createdRequests: number
  createdItems: number
  skippedGroups: number
  skippedRows: number
  missingPriceItems: number
  possibleDuplicateItems: number
  missingSupplierItems: number
  knownAmountTotal: number | null
  durationMilliseconds: number
  /** Lines written as «Təsnif edilməyib», after skips: the work left on Qiymət təsnifatı. */
  unclassifiedPriceItems: number
  /** Unpriced lines written as bought, as a reviewer said, after skips. */
  priceRequiredItems: number
  /** Unpriced lines written as supplied free, as a reviewer said, after skips. */
  internalSupplyItems: number
}

export interface ImportConfirmationPreview {
  importBatchId: number
  batchStatus: ImportStatus
  canImport: boolean
  sourceRows: number
  includedRows: number
  excludedRows: number
  groupCount: number
  rowsToImport: number
  knownPriceRows: number
  missingPriceRows: number
  possibleDuplicateRows: number
  resolvedSupplierRows: number
  missingSupplierRows: number
  unitlessVariantRows: number
  descriptorVariantRows: number
  existingRequestConflictGroups: number
  canConfirm: boolean
  alreadyImported: boolean
  groups: ConfirmationGroupPreview[]
  result: ImportConfirmationResult | null
  /**
   * Rows that will land on Qiymət təsnifatı as «Təsnif edilməyib», before any group is skipped (a skipped group's
   * share is its `unclassifiedPriceItemCount`). `missingPriceRows` = this + `priceRequiredRows`.
   */
  unclassifiedPriceRows: number
  /** Rows that will land as «Alış qiyməti tələb olunur», before any group is skipped. */
  priceRequiredRows: number
  /** Rows that will land as «Ödənişsiz daxili təminat», before any group is skipped. */
  internalSupplyRows: number
}

export interface ConfirmationGroupDecision {
  locationId: number
  requestPeriod: string
  action: GroupDecisionAction
  reason?: string | null
}

/** Reads only: nothing is written until the confirmation itself is posted. */
export function fetchConfirmationPreview(importId: number, signal?: AbortSignal): Promise<ImportConfirmationPreview> {
  return getJson<ImportConfirmationPreview>(`/api/v1/imports/${importId}/confirmation/preview`, signal)
}

/**
 * Creates the order requests. Only decisions travel: every business value comes from the staged rows, and the
 * expected counts let the server refuse a preview the operator read before the data changed.
 */
export function confirmImport(
  importId: number,
  body: { decisions: ConfirmationGroupDecision[]; expectedRowsToImport?: number; expectedGroupCount?: number },
): Promise<ImportConfirmationResult> {
  return postJson<ImportConfirmationResult>(`/api/v1/imports/${importId}/confirmation`, body)
}
