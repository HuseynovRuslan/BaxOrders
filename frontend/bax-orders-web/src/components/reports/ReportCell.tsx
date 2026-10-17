import { Link } from 'react-router'
import type { MonthlyReportCell } from '../../api/reports'
import type { ReportView } from '../../analytics/reportView'
import { monthlyReportOrderLink, monthlyReportOrderState } from '../../navigation/monthlyReportReturn'
import { missingPriceCount } from '../../pricing/labels'
import { costDecreasedLabel, costIncreasedLabel, futureMonthNote, unusualMonthNote } from '../../terminology/terms'
import {
  costDirectionTintClass,
  costDirectionToneClass,
  formatMoney,
  formatMoneyDelta,
  formatMonth,
  formatPercent,
  unknownValue,
} from '../analytics/format'
import { workflowStatusText } from '../workflow/labels'
import { MissingPriceMark } from './MissingPriceMark'
import { futureMonthClass } from './reportGrid'
import { StatusMark } from './StatusMark'
import { UnusualMark } from './UnusualMark'

/**
 * One object's month, in the table and on a phone card alike (UI V2 03 §6.2) — one definition, so the two can never say
 * different things.
 *
 * The amount is the one thing given weight; the marks go under it on a second line, and only when there is one.
 * «Yığcam» (the default, D-50 №6) marks the state (✓ ⏳ ↩), the unpriced lines (⚠ N) and an unusual month (▲/▼).
 * «Standart» adds the change against the month before, in the cost colours, and moves ▲/▼ beside the amount, so the
 * two percentages the report knows — on the month before and on the three-month average — are never side by side
 * without their names (M-04): the second one is never written in a cell at all.
 *
 * Everything else the cell knows is said in its name and tooltip (`describeCell`), word for word as before V2.
 */
export function ReportCell({
  cell,
  locationName,
  future,
  view,
  selected = false,
}: {
  cell: MonthlyReportCell
  locationName: string
  /** Whether the month has not begun on the reader's calendar. */
  future: boolean
  view: ReportView
  /** Whether the cell is the one the side panel describes (phase D). */
  selected?: boolean
}) {
  const month = formatMonth(cell.period)

  if (cell.orderRequestId === null) {
    if (future) {
      // Not "sifariş yoxdur": nothing could have been ordered for a month that has not begun.
      return (
        <span
          className={`block min-h-11 rounded ${futureMonthClass}`}
          title={futureMonthNote(month)}
          aria-label={`${locationName} · ${futureMonthNote(month)}`}
        />
      )
    }

    return (
      <span
        className="block px-1 py-1 text-body-sm leading-[18px] text-on-surface-variant"
        title={`${month}: sifariş yoxdur`}
        aria-label={`${locationName} · ${month} · sifariş yoxdur`}
      >
        {unknownValue}
      </span>
    )
  }

  const standard = view === 'Standard'
  const description = describeCell(cell, month)

  // Marked as opened from here, so the order page can offer the way back to this very report (24.3).
  return (
    <Link
      to={monthlyReportOrderLink(cell.orderRequestId)}
      state={monthlyReportOrderState}
      title={description}
      aria-label={`${locationName} · ${description}`}
      className={cellLinkClass(cell, selected)}
    >
      <span className="flex items-baseline justify-end gap-1">
        {standard && cell.isUnusual && <UnusualMark percent={cell.recentAveragePercent} />}
        <span className="block whitespace-nowrap font-metric-val text-body-sm leading-[18px] font-normal tabular text-on-surface">
          {formatMoney(cell.knownAmount)}
        </span>
      </span>
      <Marks cell={cell} standard={standard} />
    </Link>
  )
}

/**
 * The second line: the state, the unpriced lines, and — by view — the unusual month's direction (Yığcam) or the change
 * on the month before (Standart). Nothing at all when none of them applies.
 */
function Marks({ cell, standard }: { cell: MonthlyReportCell; standard: boolean }) {
  const status = cell.status !== null && cell.status !== 'Draft' ? cell.status : null
  const missing = !cell.amountIsComplete
  const unusual = !standard && cell.isUnusual && cell.recentAveragePercent !== null && cell.recentAveragePercent !== 0
  const change = standard ? compactDelta(cell) : ''

  if (status === null && !missing && !unusual && change === '') {
    return null
  }

  return (
    <span className="mt-0.5 flex flex-wrap items-center justify-end gap-x-1 gap-y-0.5 text-body-sm leading-4 tabular">
      {status !== null && <StatusMark status={status} />}
      {missing && <MissingPriceMark count={cell.missingPriceItemCount} />}
      {unusual && <UnusualMark percent={cell.recentAveragePercent} />}
      {/* Owner decision 9.1: the direction of the cost — up red, down green — never a verdict. */}
      {change !== '' && (
        <span className={`whitespace-nowrap tabular ${costDirectionToneClass(cell.deltaPercent ?? cell.deltaAmount)}`}>
          {change}
        </span>
      )}
    </span>
  )
}

/**
 * The link fills the cell, so its background, hover, selection and focus cover the figure entirely (DK-07). An unusual
 * month keeps its direction's light fill; selected, its thin ring gives way to the selection's — one ring on an element,
 * never two (DK-18).
 */
function cellLinkClass(cell: MonthlyReportCell, selected: boolean): string {
  const base =
    'block min-h-11 cursor-pointer rounded px-1 py-1 scroll-mt-31 scroll-mb-4 '
    + 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary'
  const tint = cell.isUnusual ? costDirectionTintClass(cell.recentAveragePercent) : ''

  if (tint !== '') {
    if (selected) {
      const fill = tint.split(' ').filter((name) => !name.startsWith('ring-')).join(' ')
      return `${base} ${fill} ring-2 ring-inset ring-primary`
    }

    return `${base} ${tint} hover:ring-2`
  }

  return `${base} hover:bg-surface-container ${selected ? 'ring-2 ring-inset ring-primary' : ''}`
}

/** A percentage where one exists — it is far shorter than the money — and the money itself where one does not. */
function compactDelta(cell: MonthlyReportCell): string {
  if (cell.deltaPercent !== null) {
    return formatPercent(cell.deltaPercent)
  }

  return cell.deltaAmount === null ? '' : formatMoneyDelta(cell.deltaAmount)
}

/** Everything the cell knows, as a sentence, for the tooltip and the accessible name. Unchanged by V2 (UX-34). */
export function describeCell(cell: MonthlyReportCell, month: string): string {
  const parts = [month, formatMoney(cell.knownAmount)]

  if (cell.deltaAmount !== null) {
    const direction = cell.deltaAmount > 0 ? costIncreasedLabel : cell.deltaAmount < 0 ? costDecreasedLabel : null
    const change = `keçən aya görə ${formatMoneyDelta(cell.deltaAmount)} ${formatPercent(cell.deltaPercent)}`.trim()
    parts.push(direction === null ? change : `${change}, ${direction}`)
  }

  if (cell.isUnusual) {
    parts.push(unusualMonthNote(formatMoney(cell.recentAverageKnownAmount), formatPercent(cell.recentAveragePercent)))
  }

  if (!cell.amountIsComplete) {
    parts.push(missingPriceCount(cell.missingPriceItemCount))
  }

  // The status in words, as the badge says it elsewhere: a historical order is approved and says so, then says
  // how (22.2). The mark beside the amount stays the approved one — a fourth mark would read as a fourth status.
  if (cell.status) {
    parts.push(workflowStatusText(cell.status, cell.isHistoricalImport))
  }

  return parts.join(' · ')
}
