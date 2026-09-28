import type { AnalyticsScope, DashboardTrendPoint } from '../../api/dashboard'
import { scopeAmountLabels } from '../../analytics/scope'
import { formatMonth, formatMoney, formatShortMonth, toMonthKey } from '../analytics/format'

/**
 * The last six months, as a shape.
 *
 * It answers one question — is this month ordinary for us — and nothing else. There is no axis, no legend and
 * no grid: a manager who wants the figures has the table below and the report beside it, and a reader who wants
 * to know whether July is out of line can see it in the height of one bar against five.
 *
 * The selected month is the dark one. Everything else is deliberately quiet, because the comparison is the
 * message and six equally loud bars would be six messages.
 *
 * It follows the scope, because a line of monthly demand and a line of total expenditure are two different
 * stories; the caption says which one is drawn rather than leaving the reader to assume.
 */
export function SpendTrend({ trend, scope, selectedPeriod }: {
  trend: readonly DashboardTrendPoint[]
  scope: AnalyticsScope
  /** The month the rest of the screen is about, drawn as the one being asked about. */
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

  return (
    <figure className="mb-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <figcaption className="mb-2 text-xs text-slate-500">
        Son {trend.length} ay · {scopeAmountLabels[scope]}
      </figcaption>

      <div className="flex items-end gap-1.5" aria-hidden="true">
        {trend.map((point) => (
          <Bar key={point.period} point={point} highest={highest} isSelected={toMonthKey(point.period) === selected} />
        ))}
      </div>

      {/*
        The figures themselves, for a reader who is not reading the picture. A table and not a sentence: this is
        tabular data, and a screen reader should be able to walk it a month at a time.
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
    </figure>
  )
}

/** The tallest month fills the frame; everything else is drawn against it. */
const frameHeight = 40

function Bar({ point, highest, isSelected }: {
  point: DashboardTrendPoint
  highest: number
  isSelected: boolean
}) {
  const amount = point.knownAmount
  // A month with money in it keeps a visible bar however small the money was: a bar of no height reads as a
  // month with nothing in it, which is a different fact. A month with no priced line at all draws none, because
  // there it is the true one.
  const height = amount === null || amount <= 0 ? 0 : Math.max(3, Math.round((amount / highest) * frameHeight))

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <span
        className="flex w-full items-end justify-center"
        style={{ height: frameHeight }}
        title={`${formatMonth(point.period)}: ${formatMoney(amount)}`}
      >
        <span
          className={`w-full rounded-sm ${isSelected ? 'bg-slate-800' : 'bg-slate-200'}`}
          style={{ height: height || 1 }}
          data-height={height}
        />
      </span>
      <span className={`truncate text-[11px] ${isSelected ? 'font-medium text-slate-700' : 'text-slate-400'}`}>
        {formatShortMonth(point.period)}
      </span>
    </div>
  )
}
