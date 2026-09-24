import { getJson, postJson, type ProblemDetails } from './client'
import type { OrderRequestStatus } from './orders'

/** Mirrors `BaxOrders.Application.Orders.Workflow`. */
export type OrderWorkflowAction =
  | 'SubmittedForApproval'
  | 'Approved'
  | 'ReturnedForCorrection'
  /**
   * Carried in already approved, from before this system existed. Deliberately not `Approved`: nobody
   * approved these here, and it has no actor because there is no person here to attribute it to.
   */
  | 'ImportedAsApproved'

/**
 * What the signed-in person may do to this request right now: the state, narrowed by their role, narrowed
 * again by whether it is their own submission. It is the server's answer and it decides what is offered —
 * never whether the action succeeds. The endpoints check the same rules again.
 */
export interface AllowedWorkflowActions {
  canSubmit: boolean
  canApprove: boolean
  canReturn: boolean
  /** The state and the role would both allow a decision; the only thing stopping it is that they submitted it. */
  blockedBySelfApproval: boolean
  /** Likewise, but the reason is that they worked on this correction — edited a line, added or removed one. */
  blockedByOwnContribution: boolean
  /**
   * The state would allow a decision, and this person sees the approval queue without holding approval
   * authority — an administrator. Reported before the other two reasons.
   */
  blockedByMissingAuthority: boolean
}

/** One recorded moment the decision panel shows: who, when and — for a correction request — why. */
export interface WorkflowDecisionEvent {
  action: OrderWorkflowAction
  /** The name as it read when it happened. A snapshot from the event, never looked up again. */
  actorDisplayName: string
  occurredAtUtc: string
  /** What the correction request said. Null for an approval. */
  reason: string | null
}

/**
 * What an approver needs before deciding, read by the server off the recorded events only. Where there is no
 * event there is no value: nothing here is ever a placeholder name or date.
 */
export interface WorkflowDecisionFacts {
  /** Carried in from Excel as already approved; every other field is then empty (4.1). */
  isHistoricalImport: boolean
  /** Which time this is being sent, along the correction chain. Zero when this request has not been sent. */
  submissionNumber: number
  submittedByDisplayName: string | null
  submittedAtUtc: string | null
  /** The most recent correction request before the current cycle. */
  previousReturn: WorkflowDecisionEvent | null
  /** The approval, or the correction request, that closed the current cycle. */
  decision: WorkflowDecisionEvent | null
}

export interface WorkflowEvent {
  id: number
  action: OrderWorkflowAction
  fromStatus: OrderRequestStatus
  toStatus: OrderRequestStatus
  /** The signed-in user who acted, or null for an action recorded before sign-in existed. */
  actorUserId: string | null
  /** Their name as it read at the time. A snapshot: never refreshed, never looked up again. */
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
  /** Who put it into its current approval cycle; null for one nobody has submitted. */
  submittedByUserId: string | null
  submittedAtUtc: string | null
  approvedAtUtc: string | null
  returnedAtUtc: string | null
  itemCount: number
  /**
    * Counted by the server from the stored lines; never supplied by the caller. Only prices somebody owes: an
    * order supplied entirely from the company's own store has none of these and needs no acknowledgement.
    */
  missingPriceItemCount: number
  /** Lines issued from the company's own store: complete without a purchase price, never a warning. */
  priceNotRequiredItemCount: number
  knownAmountTotal: number | null
  amountIsComplete: boolean
  /** True when approving would cover lines nobody has priced. It does not block approval; it must be said. */
  requiresMissingPriceAcknowledgement: boolean
  /** Oldest first. */
  history: WorkflowEvent[]
  decisionFacts: WorkflowDecisionFacts
}

/**
 * None of these carry an actor. Who is acting comes from the session cookie, so the browser cannot claim to
 * be somebody else by putting a name in the body.
 */
export interface SubmitForApprovalCommand {
  comment?: string
}

export interface ApproveOrderCommand {
  comment?: string
  acknowledgeMissingPrices?: boolean
}

export interface ReturnForCorrectionCommand {
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
