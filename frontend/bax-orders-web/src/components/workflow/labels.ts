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
  // The past of the action's own name, "Düzəliş tələb et", and of the status it leaves, "Düzəliş tələb olunur".
  ReturnedForCorrection: 'Düzəliş tələb olundu',
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
/** The action's name in the brief: the button, the dialog's title and its confirm button all read this. */
export const returnLabel = 'Düzəliş tələb et'

export const acknowledgeMissingPricesLabel = 'Qiyməti olmayan sətirlərin mövcud olduğunu bilirəm.'

// One home for what an empty price cell means; see src/pricing/labels.

/** Said only of a request that really is still waiting to be sent. */
export const notSubmittedYetNote = 'Hələ təqdim olunmayıb'

/**
 * Said beside the approved badge of an order carried in from Excel as already approved (owner decision 22.2),
 * word for word. It qualifies the badge rather than replacing it: the order is approved (22.1).
 */
export const historicalImportLabel = 'Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb'

/** Why such an order names no approver and no date (22.3): the approval was given before this system existed. */
export const historicalApprovalReason =
  'Təsdiq BaxOrders iş axını yaranmazdan əvvəl verildiyi üçün təsdiqləyən və tarix qeyd olunmayıb.'

/**
 * What the decision panel says of such an order, exactly and alone.
 *
 * 22.3 retired 4.1's "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.": beside a green "Təsdiqlənib"
 * it read as a denial of the approval. 4.1's other half stands: the approval happened at some real moment nobody
 * recorded, so no sender, no approver and no date is shown, and none is made up. What must not be said is "hələ
 * təqdim olunmayıb": the order was approved.
 */
export const historicalImportNote = `${historicalImportLabel}. ${historicalApprovalReason}`

/**
 * The grey the history already gives the same fact (`ImportedAsApproved`), with no ring, so the text reads as context
 * beside the badge and not as a second status. Never amber: nothing is owed here (Task 2).
 */
export const historicalImportChipClass = workflowActionClass.ImportedAsApproved

/**
 * The one condition under which the 22.2 phrase is shown, on every surface: the order is Approved and the workflow
 * recorded it as carried in from Excel. The flag is the server's fact, never inferred from a missing approver or date.
 */
export function showsHistoricalImport(
  status: OrderRequestStatus | null,
  isHistoricalImport: boolean | undefined,
): boolean {
  return status === 'Approved' && isHistoricalImport === true
}

/**
 * The status in words, for a place that cannot draw the badge — the monthly report's cell description: the badge's
 * word, followed by the 22.2 phrase exactly when {@link showsHistoricalImport} is true.
 */
export function workflowStatusText(status: OrderRequestStatus, isHistoricalImport?: boolean): string {
  const label = workflowStatusLabels[status] ?? status
  return showsHistoricalImport(status, isHistoricalImport) ? `${label} · ${historicalImportLabel}` : label
}

/** The facts the decision panel lists, in business language. */
export const decisionFactLabels = {
  submittedBy: 'Göndərən',
  submittedAt: 'Göndərilib',
  submission: 'Göndəriş',
  previousReturn: 'Əvvəlki düzəliş səbəbi',
  returnedBy: 'Düzəliş tələb edən',
  returnedAt: 'Tarix',
  reason: 'Səbəb',
  approvedBy: 'Təsdiqləyən',
  approvedAt: 'Təsdiq tarixi',
} as const

/** The first five sendings have their own words; after that the number carries the ordinal. */
const submissionWords = ['İlk', 'İkinci', 'Üçüncü', 'Dördüncü', 'Beşinci']

/**
 * The ordinal suffix follows the vowel of the last number word that is pronounced: 6 "altı" → 6-cı, 9
 * "doqquz" → 9-cu, 40 "qırx" → 40-cı, 100 "yüz" → 100-cü.
 */
const unitSuffixes = ['', 'ci', 'ci', 'cü', 'cü', 'ci', 'cı', 'ci', 'ci', 'cu']
const tensSuffixes = ['', 'cu', 'ci', 'cu', 'cı', 'ci', 'cı', 'ci', 'ci', 'cı']

function ordinalSuffix(value: number): string {
  if (value % 10 !== 0) return unitSuffixes[value % 10]
  if (value % 100 !== 0) return tensSuffixes[(value % 100) / 10]
  // Yüz (100), min (1 000), milyon (1 000 000).
  if (value % 1000 !== 0) return 'cü'
  if (value % 1_000_000 !== 0) return 'ci'
  return 'cu'
}

/**
 * Which time an order is being sent, in business language rather than a version number: "İlk göndəriş",
 * "İkinci göndəriş · düzəliş tələbindən sonra", "6-cı göndəriş".
 *
 * @param afterCorrectionRequest Whether a request for correction came before this sending.
 */
export function submissionCountLabel(submissionNumber: number, afterCorrectionRequest: boolean): string {
  const count = Math.trunc(submissionNumber)
  if (count < 1) {
    return notSubmittedYetNote
  }

  const words = count <= submissionWords.length
    ? `${submissionWords[count - 1]} göndəriş`
    : `${count}-${ordinalSuffix(count)} göndəriş`

  return count >= 2 && afterCorrectionRequest ? `${words} · düzəliş tələbindən sonra` : words
}

/**
 * Said where the state would allow a decision and the reader sees the queue without approval authority — an
 * administrator (owner decision 4.3). Reported before the other two reasons.
 */
export const missingAuthorityNote = 'Təsdiq səlahiyyətiniz yoxdur. Qərarı Rəhbər rolu olan istifadəçi verir.'

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
  'Bu sifarişdə düzəliş etdiyiniz üçün onu özünüz təsdiqləyə bilməzsiniz.'

export function missingPriceWarning(count: number): string {
  return `${missingPriceCount(count)}. Təsdiq edilən məbləğ tam deyil.`
}

export function missingPriceNote(count: number): string {
  return `${missingPriceCount(count)}. ${amountIncompleteLabel}.`
}

/** Read by the operator, not by a developer: the server's own message is shown when it has one. */
export const workflowErrors = {
  alreadyApproved: 'Bu sifariş artıq təsdiqlənib.',
  reasonRequired: 'Düzəliş tələb etmək üçün səbəb yazılmalıdır.',
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
