import { Hourglass } from 'lucide-react'
import type { OrderRequestStatus } from '../../api/orders'
import { warningToneClass } from '../../pricing/labels'
import { workflowStatusSign } from '../workflow/labels'

/** U+FE0E: asks for the text form of a character that also has an emoji form, so it takes the colour it is given. */
const textPresentation = '︎'

/** The states a month is marked with, in the legend's order. Undecided (Draft) is every row's normal: unmarked. */
export const markedStatuses: readonly OrderRequestStatus[] = ['PendingApproval', 'Approved', 'ReturnedForCorrection']

/**
 * An order's state as the product's own sign (`workflowStatusSign`; UI V2 03 §6.2.3, DK-05) — the shape says it as
 * well as the colour, and the word is in the cell's name and tooltip, so the mark itself is hidden from a screen reader.
 *
 * - ✓ Təsdiqlənib, in the neutral grey (owner decision D-51, S-3): green in this table means only "the cost fell".
 *   A historical order is approved, and carries the same ✓.
 * - ⏳ Təsdiq gözləyir, in sky blue. The character is an emoji by default and comes out in colour, so it is drawn as an
 *   outline icon instead (06 §2a S4-3), the same way the summary's sentence draws it.
 * - ↩ Düzəliş tələb olunur, in the warning amber, asked for in its text form.
 * - Təsdiqlənməyib — no mark.
 */
export function StatusMark({ status, className = '' }: { status: OrderRequestStatus; className?: string }) {
  switch (status) {
    case 'Draft':
      return null
    case 'PendingApproval':
      return (
        <Hourglass
          aria-hidden="true"
          data-status-mark="PendingApproval"
          className={`inline-block size-3 shrink-0 text-sky-700 ${className}`}
        />
      )
    case 'Approved':
      return (
        <span aria-hidden="true" data-status-mark="Approved" className={`text-on-surface-variant ${className}`}>
          {workflowStatusSign.Approved}
        </span>
      )
    case 'ReturnedForCorrection':
      return (
        <span aria-hidden="true" data-status-mark="ReturnedForCorrection" className={`${warningToneClass} ${className}`}>
          {`${workflowStatusSign.ReturnedForCorrection}${textPresentation}`}
        </span>
      )
  }
}
