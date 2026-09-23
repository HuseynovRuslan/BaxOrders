import { getJson, postJson } from './client'
import type { SupplierPriceRequirement } from './orders'

export interface SupplierListItem {
  supplierId: number
  code: string | null
  name: string
  isActive: boolean
  priceRequirement: SupplierPriceRequirement
  orderLineCount: number
  /**
   * Lines of this supplier with no price. Under `Required` these are prices somebody owes; under
   * `NotRequired` they are complete as they stand. The number does not move when the policy does — only its
   * meaning does, which is exactly what somebody about to change it needs to see.
   */
  unpricedItemCount: number
  orderCount: number
}

export interface SupplierList {
  suppliers: SupplierListItem[]
  supplierCount: number
  priceNotRequiredCount: number
}

export interface SupplierPricingDecision {
  id: number
  supplierId: number
  previousRequirement: SupplierPriceRequirement
  newRequirement: SupplierPriceRequirement
  actorUserId: string
  actorDisplayName: string
  reason: string | null
  occurredAtUtc: string
}

export interface ChangeSupplierPriceRequirementResult {
  supplierId: number
  name: string
  priceRequirement: SupplierPriceRequirement
  /** False when the supplier already said this, so nothing was written. */
  changed: boolean
  decision: SupplierPricingDecision | null
}

export function fetchSuppliers(
  query: { search?: string; includeInactive?: boolean } = {},
  signal?: AbortSignal,
): Promise<SupplierList> {
  const params = new URLSearchParams()
  if (query.search) {
    params.set('search', query.search)
  }

  if (query.includeInactive) {
    params.set('includeInactive', 'true')
  }

  const suffix = params.toString()
  return getJson<SupplierList>(`/api/v1/suppliers${suffix ? `?${suffix}` : ''}`, signal)
}

export function fetchSupplierPricingDecisions(
  supplierId: number,
  signal?: AbortSignal,
): Promise<SupplierPricingDecision[]> {
  return getJson<SupplierPricingDecision[]>(`/api/v1/suppliers/${supplierId}/pricing-decisions`, signal)
}

export function changeSupplierPriceRequirement(
  supplierId: number,
  command: { priceRequirement: SupplierPriceRequirement; reason?: string },
  signal?: AbortSignal,
): Promise<ChangeSupplierPriceRequirementResult> {
  return postJson<ChangeSupplierPriceRequirementResult>(
    `/api/v1/suppliers/${supplierId}/price-requirement`,
    command,
    signal,
  )
}
