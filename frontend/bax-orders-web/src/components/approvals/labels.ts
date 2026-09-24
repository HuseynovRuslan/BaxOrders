import { missingPriceCount, missingPriceShortLabel } from '../../pricing/labels'
import { correctedOrderLabel } from '../../terminology/terms'
import type {
  ApprovalActionability,
  ApprovalInboxSort,
  ApprovalPriceCoverage,
  ApprovalRevisionFilter,
} from '../../api/approvals'

export const actionabilityLabels: Record<ApprovalActionability, string> = {
  All: 'Hamısı',
  CanDecide: 'Qərar verə bilərəm',
  BlockedForMe: 'Mənim üçün bloklanıb',
}

export const actionabilityOrder: ApprovalActionability[] = ['All', 'CanDecide', 'BlockedForMe']

export function isActionability(value: string | null): value is ApprovalActionability {
  return value !== null && value in actionabilityLabels
}

export const priceCoverageLabels: Record<ApprovalPriceCoverage, string> = {
  Complete: 'Qiyməti tam olan',
  Incomplete: 'Qiyməti natamam olan',
}

export const priceCoverageOrder: ApprovalPriceCoverage[] = ['Complete', 'Incomplete']

export function isPriceCoverage(value: string | null): value is ApprovalPriceCoverage {
  return value !== null && value in priceCoverageLabels
}

export const revisionFilterLabels: Record<ApprovalRevisionFilter, string> = {
  All: 'Hamısı',
  Original: 'İlkin',
  Revision: correctedOrderLabel,
}

export const revisionFilterOrder: ApprovalRevisionFilter[] = ['All', 'Original', 'Revision']

export function isRevisionFilter(value: string | null): value is ApprovalRevisionFilter {
  return value !== null && value in revisionFilterLabels
}

/** The sorts offered on the screen; the default is the oldest submission, because this is a queue to work through. */
export const sortLabels: Record<ApprovalInboxSort, string> = {
  SubmittedAtUtc: 'Göndərilmə vaxtı',
  LocationName: 'Obyekt adı',
  RequestPeriod: 'Dövr',
  KnownAmount: 'Məbləğ',
  MissingPriceItemCount: missingPriceShortLabel,
}

export const sortOrder: ApprovalInboxSort[] = [
  'SubmittedAtUtc',
  'LocationName',
  'RequestPeriod',
  'KnownAmount',
  'MissingPriceItemCount',
]

export function isSort(value: string | null): value is ApprovalInboxSort {
  return value !== null && value in sortLabels
}

/**
 * Said on a row this person may not decide because they submitted it themselves. The row stays on the
 * screen — this is why nothing on it is offered, not a reason to hide it.
 */
export const selfApprovalBlockedRowNote = 'Öz göndərdiyiniz sifarişi təsdiqləyə bilməzsiniz.'

/** Said on a row this person may not decide because they worked on this order's correction. */
export const ownContributionBlockedRowNote = 'Bu sifarişdə düzəliş etdiyiniz üçün qərar verə bilməzsiniz.'

/** Task 2's one sentence for a count of price warnings, on the row it belongs to. */
export function missingPriceRowNote(count: number): string {
  return missingPriceCount(count)
}

export const originalLabel = 'İlkin'
export const revisionLabel = correctedOrderLabel
