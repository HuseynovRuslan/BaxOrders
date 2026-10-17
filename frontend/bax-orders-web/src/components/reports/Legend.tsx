import type { ReportView } from '../../analytics/reportView'
import { missingPriceShortLabel, warningToneClass } from '../../pricing/labels'
import {
  costDecreasedLabel,
  costIncreasedLabel,
  futureMonthLabel,
  previousMonthPercentLabel,
  unusualMonthHint,
  unusualMonthLabel,
} from '../../terminology/terms'
import { costDirectionTintClass, costDirectionToneClass } from '../analytics/format'
import { workflowStatusLabels } from '../workflow/labels'
import { futureMonthClass } from './reportGrid'
import { markedStatuses, StatusMark } from './StatusMark'
import { UnusualMark } from './UnusualMark'

/**
 * What the marks mean, on the screen rather than only on hover (UI V2 03 §6.6): the states, the unpriced lines, the
 * percentage — only where the view shows one — the unusual month both ways, and the month that has not begun. The
 * marks are drawn exactly as the cells draw them.
 */
export function Legend({ label, view }: { label: string; view: ReportView }) {
  return (
    <ul
      aria-label={label}
      className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm leading-[18px] text-on-surface-variant"
    >
      {markedStatuses.map((status) => (
        <li key={status} className="inline-flex items-center gap-1.5">
          <StatusMark status={status} />
          {workflowStatusLabels[status]}
        </li>
      ))}

      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className={`font-semibold ${warningToneClass}`}>⚠ N</span>
        {missingPriceShortLabel}
      </li>

      {/* Standart only: Yığcam shows no percentage, so it has nothing to explain (AC-02). */}
      {view === 'Standard' && (
        <li className="inline-flex items-center gap-1.5">
          {previousMonthPercentLabel}:
          <span className={costDirectionToneClass(1)}>{costIncreasedLabel}</span>
          <span aria-hidden="true">·</span>
          <span className={costDirectionToneClass(-1)}>{costDecreasedLabel}</span>
        </li>
      )}

      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className={`inline-flex size-4 items-center justify-center rounded-sm ${costDirectionTintClass(1)}`}>
          <UnusualMark percent={1} />
        </span>
        <span aria-hidden="true" className={`inline-flex size-4 items-center justify-center rounded-sm ${costDirectionTintClass(-1)}`}>
          <UnusualMark percent={-1} />
        </span>
        <span>
          <span className="font-medium text-on-surface">{unusualMonthLabel}</span> — {unusualMonthHint}
        </span>
      </li>

      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className={`inline-block h-3 w-4 rounded-sm ring-1 ring-inset ring-outline-variant ${futureMonthClass}`} />
        {futureMonthLabel}
      </li>
    </ul>
  )
}
