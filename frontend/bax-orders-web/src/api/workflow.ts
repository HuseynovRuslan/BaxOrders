import { getJson, postJson, type ProblemDetails } from './client'
import type { OrderRequestStatus } from './orders'

/** Mirrors `BaxOrders.Application.Orders.Workflow`. */
export type OrderWorkflowAction = 'SubmittedForApproval' | 'Approved' | 'ReturnedForCorrection'

/**
 * What the request's current state allows. These are state permissions only — nobody is authenticated yet,
 * so they say what the workflow permits, never who is permitted to do it.
 */
export interface AllowedWorkflowActions {
  canSubmit: boolean
  canApprove: boolean
  canReturn: boolean
}

export interface WorkflowEvent {
  id: number
  action: OrderWorkflowAction
  fromStatus: OrderRequestStatus
  toStatus: OrderRequestStatus
  /** A name the caller stated. Temporary: nothing authenticates it until users exist. */
  actorDisplayName: string
  comment: string | null
  missingPriceItemCount: number
  missingPricesAcknowledged: boolean
  occurredAtUtc: string
}

export interface OrderWorkflow {
  orderRequestId: number
  locationId: number
  locationName: string
  requestPeriod: string
  version: number
  status: OrderRequestStatus
  allowedActions: AllowedWorkflowActions
  submittedAtUtc: string | null
  approvedAtUtc: string | null
  returnedAtUtc: string | null
  itemCount: number
  /** Counted by the server from the stored lines; never supplied by the caller. */
  missingPriceItemCount: number
  knownAmountTotal: number | null
  amountIsComplete: boolean
  /** True when approving would cover lines nobody has priced. It does not block approval; it must be said. */
  requiresMissingPriceAcknowledgement: boolean
  /** Oldest first. */
  history: WorkflowEvent[]
}

export interface SubmitForApprovalCommand {
  actorDisplayName: string
  comment?: string
}

export interface ApproveOrderCommand {
  actorDisplayName: string
  comment?: string
  acknowledgeMissingPrices?: boolean
}

export interface ReturnForCorrectionCommand {
  actorDisplayName: string
  reason: string
}

/** The server's typed answer when an approval would cover unpriced lines that were not acknowledged. */
export const missingPriceAcknowledgementCode = 'MissingPriceAcknowledgementRequired'

export function isMissingPriceAcknowledgementProblem(problem: ProblemDetails | null | undefined): boolean {
  return typeof problem?.code === 'string' && problem.code === missingPriceAcknowledgementCode
}

export function fetchWorkflow(orderRequestId: number, signal?: AbortSignal): Promise<OrderWorkflow> {
  return getJson<OrderWorkflow>(`/api/v1/orders/${orderRequestId}/workflow`, signal)
}

export function submitForApproval(
  orderRequestId: number,
  command: SubmitForApprovalCommand,
  signal?: AbortSignal,
): Promise<OrderWorkflow> {
  return postJson<OrderWorkflow>(`/api/v1/orders/${orderRequestId}/workflow/submit`, command, signal)
}

export function approveOrder(
  orderRequestId: number,
  command: ApproveOrderCommand,
  signal?: AbortSignal,
): Promise<OrderWorkflow> {
  return postJson<OrderWorkflow>(`/api/v1/orders/${orderRequestId}/workflow/approve`, command, signal)
}

export function returnForCorrection(
  orderRequestId: number,
  command: ReturnForCorrectionCommand,
  signal?: AbortSignal,
): Promise<OrderWorkflow> {
  return postJson<OrderWorkflow>(`/api/v1/orders/${orderRequestId}/workflow/return`, command, signal)
}
