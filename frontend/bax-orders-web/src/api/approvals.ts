import { getJson } from './client'
import type { PagedResult } from './orders'

/** Mirrors `BaxOrders.Application.Approvals.ApprovalInboxDtos`. */
export type ApprovalActionability = 'All' | 'CanDecide' | 'BlockedForMe'
export type ApprovalPriceCoverage = 'Complete' | 'Incomplete'
export type ApprovalRevisionFilter = 'All' | 'Original' | 'Revision'
export type ApprovalInboxSort = 'SubmittedAtUtc' | 'LocationName' | 'RequestPeriod' | 'KnownAmount' | 'MissingPriceItemCount'

/**
 * One request waiting for a decision, and what this signed-in person may do about it. The action flags come
 * from the same rule the workflow endpoint uses — nothing here is a second, independent opinion.
 */
export interface ApprovalInboxRow {
  orderRequestId: number
  locationId: number
  locationCode: string
  locationName: string
  requestPeriod: string
  version: number
  submittedAtUtc: string
  submittedByUserId: string | null
  submittedByDisplayName: string
  itemCount: number
  /** Money over the priced lines only; null when nothing is priced. Never a zero standing in for unknown. */
  knownAmount: number | null
  missingPriceItemCount: number
  amountIsComplete: boolean
  isRevision: boolean
  sourceVersion: number | null
  sourceOrderRequestId: number | null
  canApprove: boolean
  canReturn: boolean
  /** The state and the role would both allow a decision; the only thing stopping it is that they submitted it. */
  blockedBySelfApproval: boolean
  /** Likewise, but because this person worked on this version's correction — edited, added or removed a line. */
  blockedByOwnContribution: boolean
  /** They see the queue without holding approval authority — an administrator. Reported before the other two. */
  blockedByMissingAuthority: boolean
}

export interface ApprovalInboxSummary {
  pendingCount: number
  actionableByCurrentUserCount: number
  blockedForCurrentUserCount: number
  missingPriceRequestCount: number
  missingPriceItemCount: number
  revisionCount: number
}

export interface ApprovalInbox {
  /** Always the whole queue, whatever the search or filters narrowed the rows to. */
  summary: ApprovalInboxSummary
  /** How many rows the search and filters left. */
  filteredCount: number
  rows: PagedResult<ApprovalInboxRow>
}

export interface ApprovalInboxRequest {
  search?: string
  /** `yyyy-MM`. */
  period?: string
  actionability?: ApprovalActionability
  priceCoverage?: ApprovalPriceCoverage
  revision?: ApprovalRevisionFilter
  sort?: ApprovalInboxSort
  descending?: boolean
  page: number
  pageSize: number
}

export function fetchApprovalInbox(query: ApprovalInboxRequest, signal?: AbortSignal): Promise<ApprovalInbox> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
  if (query.search) params.set('search', query.search)
  if (query.period) params.set('period', query.period)
  if (query.actionability) params.set('actionability', query.actionability)
  if (query.priceCoverage) params.set('priceCoverage', query.priceCoverage)
  if (query.revision) params.set('revision', query.revision)
  if (query.sort) params.set('sort', query.sort)
  if (query.descending) params.set('descending', 'true')
  return getJson<ApprovalInbox>(`/api/v1/approvals/inbox?${params.toString()}`, signal)
}
