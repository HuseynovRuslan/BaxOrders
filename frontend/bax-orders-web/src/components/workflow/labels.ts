import { amountIncompleteLabel, missingPriceCount } from '../../pricing/labels'
import type { OrderRequestStatus } from '../../api/orders'
import type { OrderWorkflowAction } from '../../api/workflow'

export const workflowStatusLabels: Record<OrderRequestStatus, string> = {
  Draft: 'Təsdiqlənməyib',
  PendingApproval: 'Təsdiq gözləyir',
  Approved: 'Təsdiqlənib',
  ReturnedForCorrection: 'Düzəliş tələb olunur',
}

/**
 * Colour marks the state, and the label says it in words, so the badge still reads without colour. Approved
 * is the only one shown as settled; returned asks for attention without being an alarm.
 */
export const workflowStatusClass: Record<OrderRequestStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  PendingApproval: 'bg-sky-50 text-sky-900 ring-sky-200',
  Approved: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  ReturnedForCorrection: 'bg-amber-50 text-amber-900 ring-amber-200',
}

/** A symbol as well as a colour, so the state is never carried by colour alone. */
export const workflowStatusSign: Record<OrderRequestStatus, string> = {
  Draft: '·',
  PendingApproval: '⏳',
  Approved: '✓',
  ReturnedForCorrection: '↩',
}

export const workflowActionLabels: Record<OrderWorkflowAction, string> = {
  SubmittedForApproval: 'Təsdiqə göndərildi',
  Approved: 'Təsdiqləndi',
  ReturnedForCorrection: 'Düzəlişə qaytarıldı',
  // Says what happened, not that somebody here decided it: these orders were approved before this system.
  ImportedAsApproved: 'Təsdiqlənmiş kimi köçürülüb',
}

export const workflowActionClass: Record<OrderWorkflowAction, string> = {
  SubmittedForApproval: 'bg-sky-100 text-sky-800',
  Approved: 'bg-emerald-100 text-emerald-800',
  ReturnedForCorrection: 'bg-amber-100 text-amber-800',
  // Grey, not the green of a decision made here: this is a record carried over, not an approval given.
  ImportedAsApproved: 'bg-slate-100 text-slate-700',
}

/** The button that starts each action, worded for the state it starts from. */
export const submitLabel = 'Təsdiqə göndər'
export const resubmitLabel = 'Yenidən təsdiqə göndər'
export const approveLabel = 'Təsdiqlə'
export const returnLabel = 'Düzəlişə qaytar'

export const acknowledgeMissingPricesLabel = 'Qiyməti olmayan sətirlərin mövcud olduğunu bilirəm.'

// One home for what an empty price cell means; see src/pricing/labels.

/** Said only of a request that really is still waiting to be sent. */
export const notSubmittedYetNote = 'Hələ təqdim olunmayıb'

/**
 * Said of an order approved before this system existed.
 *
 * Its approval happened at some real moment nobody recorded, so there is no date to show and none is made up.
 * What must not be said is "hələ təqdim olunmayıb": the order was approved, and calling it unsent would
 * contradict the state badge beside it.
 */
export const momentsNotRecordedNote = 'Təqdim və təsdiq tarixi sistemdə qeyd olunmayıb'

/**
 * Said where the state and the role would both allow a decision and the only thing in the way is that this
 * person submitted the request. Offering nothing without a word would read as a bug.
 */
export const selfApprovalBlockedNote =
  'Özünüzün təsdiqə göndərdiyiniz sifarişi təsdiqləyə bilməzsiniz. Başqa bir istifadəçi baxmalıdır.'

/**
 * Said where the only thing in the way is that this person worked on the correction. Reported apart from the
 * submitter rule because it is a different reason, and somebody reading it needs to know which one applies.
 */
export const ownContributionBlockedNote =
  'Bu versiyada düzəliş etdiyiniz üçün onu özünüz təsdiqləyə bilməzsiniz.'

export function missingPriceWarning(count: number): string {
  return `Bu sifarişdə ${count} qiymətsiz sətir var. Təsdiq edilən məbləğ tam maliyyə məbləği deyil.`
}

export function missingPriceNote(count: number): string {
  return `${missingPriceCount(count)}. ${amountIncompleteLabel}.`
}

/** Read by the operator, not by a developer: the server's own message is shown when it has one. */
export const workflowErrors = {
  alreadyApproved: 'Bu sifariş artıq təsdiqlənib.',
  reasonRequired: 'Düzəlişə qaytarmaq üçün səbəb yazılmalıdır.',
  acknowledgementRequired: 'Qiyməti olmayan sətirləri təsdiqlədiyinizi qeyd edin.',
  forbidden: 'Bu əməliyyat üçün icazəniz yoxdur.',
  conflict: 'Bu sifariş siz işləyərkən başqası tərəfindən dəyişdirilib. Səhifəni yeniləyib yenidən cəhd edin.',
  unknown: 'Əməliyyat yerinə yetirilmədi.',
} as const

/** "22.09.2026 14:32" from a UTC instant, written in the reader's own time. */
export function formatWorkflowMoment(utc: string): string {
  const moment = new Date(utc)
  if (Number.isNaN(moment.getTime())) {
    return utc
  }

  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(moment.getDate())}.${pad(moment.getMonth() + 1)}.${moment.getFullYear()} ${pad(moment.getHours())}:${pad(moment.getMinutes())}`
}
