import { useState } from 'react'
import type { AnalyticsScope, DashboardTrendPoint } from '../../../api/dashboard'
import { scopeAmountLabels } from '../../../analytics/scope'
import { formatMonth, formatMoney, formatShortMonth, toMonthKey } from '../../analytics/format'

/** The tallest month fills the track; everything else is drawn against it. */
const trackHeight = 160

/**
 * The last six months, as the approved design draws them: one bar a month, the selected one in colour, the
 * rest in quiet grey.
 *
 * It answers one question — is this month ordinary for us — and nothing else. There is no axis and no grid: a
 * manager who wants to know whether September is out of line sees it in one height against five, and one who
 * wants a figure points at the month and reads it.
 *
 * Any month answers, not just the selected one. The design pins the figure to the current month, which makes
 * the other five heights a picture nobody can put a number to; the label follows the pointer instead, and the
 * month under it lights up the same blue while it does.
 *
 * It follows the scope, because a line of monthly demand and a line of total expenditure are two different
 * stories; the subtitle says which is drawn.
 */
export function ExpenseDynamics({ trend, scope, selectedPeriod }: {
  trend: readonly DashboardTrendPoint[]
  scope: AnalyticsScope
  selectedPeriod: string
}) {
  // One point is not a trend, and an empty frame is worse than no frame.
  if (trend.length < 2) {
    return null
  }

  const highest = Math.max(...trend.map((point) => point.knownAmount ?? 0))
  if (highest <= 0) {
    return null
  }

  const selected = toMonthKey(selectedPeriod)
  // Which month is being pointed at, if any. Nothing is pinned: an unpointed chart shows no figure at all.
  const [pointed, setPointed] = useState<string | null>(null)

  return (
    <section
      className="flex min-w-0 flex-1 flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6"
      aria-label="Xərc dinamikası"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">Xərc dinamikası</h2>
          <p className="text-xs text-slate-500">
            Son {trend.length} ayın xülasəsi · {scopeAmountLabels[scope].toLocaleLowerCase('az-Latn-AZ')}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="size-3 rounded-sm bg-blue-600" aria-hidden="true" />
          <span className="text-xs text-slate-600">Cari dövr</span>
        </span>
      </div>

      <div
        className="flex flex-1 items-end gap-4 pt-8"
        aria-hidden="true"
        onPointerLeave={() => setPointed(null)}
      >
        {trend.map((point, place) => (
          <Bar
            key={point.period}
            point={point}
            highest={highest}
            isSelected={toMonthKey(point.period) === selected}
            isPointed={pointed === point.period}
            edge={place === 0 ? 'start' : place === trend.length - 1 ? 'end' : null}
            onPoint={() => setPointed(point.period)}
          />
        ))}
      </div>

      {/*
        The figures themselves, for a reader who is not reading the picture. A table and not a sentence: this
        is tabular data, and a screen reader should be able to walk it a month at a time.
      */}
      <table className="sr-only">
        <caption>Son {trend.length} ayın {scopeAmountLabels[scope].toLocaleLowerCase('az-Latn-AZ')}</caption>
        <tbody>
          {trend.map((point) => (
            <tr key={point.period}>
              <th scope="row">{formatMonth(point.period)}</th>
              <td>{formatMoney(point.knownAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/**
 * One month.
 *
 * The whole column answers the pointer, not the 32 pixels of bar in it: a chart that asks to be hit exactly is
 * one nobody points at twice. The label is the exact amount rather than a rounded one — it is on screen
 * because somebody asked for it, and the rounding only ever existed to keep a pinned label short.
 */
function Bar({ point, highest, isSelected, isPointed, edge, onPoint }: {
  point: DashboardTrendPoint
  highest: number
  isSelected: boolean
  isPointed: boolean
  /** The first and last labels hang off the card if they are centred, so they are anchored to their own side. */
  edge: 'start' | 'end' | null
  onPoint: () => void
}) {
  const amount = point.knownAmount
  // A month with money in it keeps a visible bar however small the money was: a bar of no height reads as a
  // month with nothing in it, which is a different fact. A month with no priced line at all draws none.
  const height = amount === null || amount <= 0 ? 0 : Math.max(4, Math.round((amount / highest) * trackHeight))

  return (
    <div
      className="flex min-w-0 flex-1 cursor-default flex-col items-center gap-2"
      onPointerEnter={onPoint}
    >
      <div className="relative flex w-8 flex-col justify-end" style={{ height: trackHeight }}>
        <div
          className={`w-8 rounded-t transition-colors ${
            isSelected || isPointed ? 'bg-blue-600' : 'bg-slate-400/40'
          }`}
          style={{ height }}
          data-height={height}
          data-lit={isSelected || isPointed ? 'true' : 'false'}
        />
        {isPointed && amount !== null && (
          <span className={`absolute -top-7 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] font-bold text-white ${
            edge === 'start' ? 'left-0' : edge === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'
          }`}>
            {formatMoney(amount)}
          </span>
        )}
      </div>
      <span className={`truncate text-xs transition-colors ${
        isSelected || isPointed ? 'font-bold text-blue-600' : 'font-medium text-slate-500'
      }`}>
        {formatShortMonth(point.period)}
      </span>
    </div>
  )
}
