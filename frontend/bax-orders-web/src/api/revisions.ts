import { deleteJson, getJson, patchJson, postJson } from './client'
import type { OrderRequestStatus } from './orders'

/** What was done to the content of a correction version. Mirrors the backend enum. */
export type OrderEditAction =
  | 'RevisionCreated'
  | 'ItemQuantityChanged'
  | 'ItemPriceChanged'
  | 'ItemSupplierChanged'
  | 'ItemAdded'
  | 'ItemRemoved'

export type OrderEditField = 'Quantity' | 'UnitPrice' | 'Supplier'

/** One end of a correction: the version on the other side, and who made the correction when. */
export interface RevisionLink {
  orderRequestId: number
  version: number
  status: OrderRequestStatus
  createdByUserId: string
  createdByDisplayName: string
  createdAtUtc: string
}

/** A supplier as the edit history recorded it: the name it had at the time, not the name it has now. */
export interface EditedSupplier {
  id: number
  name: string
}

/** A whole line, as an added one was added or a removed one was before it went. */
export interface EditedLine {
  productVariantId: number
  quantity: number
  unitPrice: number | null
  supplierId: number | null
  supplierName: string | null
  sourceOrderRequestItemId: number | null
}

/**
 * One entry of the edit history. The old and new values are structured, so the screen formats them rather
 * than re-deriving what happened: a number for a quantity or a price, an object for a supplier or a line,
 * and null for *no value* — a price nobody knew, no supplier, the missing side of an add or a remove.
 */
export interface OrderEditEvent {
  id: number
  action: OrderEditAction
  orderRequestItemId: number | null
  productVariantId: number | null
  productCode: string | null
  productName: string | null
  field: OrderEditField | null
  oldValue: number | EditedSupplier | EditedLine | null
  newValue: number | EditedSupplier | EditedLine | null
  actorUserId: string
  actorDisplayName: string
  occurredAtUtc: string
}

/** Where one request stands as a correction, and what this person may do about it. */
export interface OrderRevision {
  orderRequestId: number
  locationId: number
  locationName: string
  requestPeriod: string
  version: number
  status: OrderRequestStatus
  isRevision: boolean
  /** The returned version this one corrects. */
  revisedFrom: RevisionLink | null
  /** The correction made from this one, if it has been corrected. */
  revisedInto: RevisionLink | null
  isLatestVersion: boolean
  canCreateRevision: boolean
  canEditRevision: boolean
  /** Sent back with every edit, so a change made meanwhile is refused rather than overwritten. */
  rowVersion: string
  itemCount: number
  missingPriceItemCount: number
  knownAmountTotal: number | null
  amountIsComplete: boolean
  editHistory: OrderEditEvent[]
}

export interface CreateRevisionResult {
  orderRequestId: number
  version: number
  itemCount: number
  sourceOrderRequestId: number
  sourceVersion: number
  /** True when this returned version had already been corrected: a second click, or somebody else first. */
  alreadyExisted: boolean
}

export interface RevisionEditResult {
  orderRequestItemId: number | null
  revision: OrderRevision
}

/**
 * One field of a line the caller wants changed.
 *
 * Leaving a field out means "do not touch it"; `{ value: null }` clears a price or a supplier. The two are
 * different things and the server refuses a bare null, so this wrapper is what keeps them apart on the way.
 */
export interface FieldChange<T> {
  value: T
}

export interface EditOrderItemCommand {
  rowVersion: string
  quantity?: FieldChange<number>
  unitPrice?: FieldChange<number | null>
  supplierId?: FieldChange<number | null>
}

export interface AddOrderItemCommand {
  rowVersion: string
  productVariantId: number
  quantity: number
  unitPrice?: number | null
  supplierId?: number | null
}

export function fetchRevision(orderRequestId: number, signal?: AbortSignal): Promise<OrderRevision> {
  return getJson<OrderRevision>(`/api/v1/orders/${orderRequestId}/revision`, signal)
}

/** Corrects a returned request. The server decides everything; there is nothing to send. */
export function createRevision(orderRequestId: number, signal?: AbortSignal): Promise<CreateRevisionResult> {
  return postJson<CreateRevisionResult>(`/api/v1/orders/${orderRequestId}/revision`, {}, signal)
}

export function editOrderItem(
  orderRequestId: number,
  orderRequestItemId: number,
  command: EditOrderItemCommand,
  signal?: AbortSignal,
): Promise<RevisionEditResult> {
  return patchJson<RevisionEditResult>(`/api/v1/orders/${orderRequestId}/items/${orderRequestItemId}`, command, signal)
}

export function addOrderItem(
  orderRequestId: number,
  command: AddOrderItemCommand,
  signal?: AbortSignal,
): Promise<RevisionEditResult> {
  return postJson<RevisionEditResult>(`/api/v1/orders/${orderRequestId}/items`, command, signal)
}

export function removeOrderItem(
  orderRequestId: number,
  orderRequestItemId: number,
  rowVersion: string,
  signal?: AbortSignal,
): Promise<RevisionEditResult> {
  const params = new URLSearchParams({ rowVersion })
  return deleteJson<RevisionEditResult>(
    `/api/v1/orders/${orderRequestId}/items/${orderRequestItemId}?${params.toString()}`,
    signal,
  )
}
