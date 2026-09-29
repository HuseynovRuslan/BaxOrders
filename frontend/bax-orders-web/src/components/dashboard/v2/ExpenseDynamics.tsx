import type { AnalyticsScope, DashboardTrendPoint } from '../../../api/dashboard'
import { scopeAmountLabels } from '../../../analytics/scope'
import { formatMonth, formatMoney, formatShortMonth, toMonthKey } from '../../analytics/format'

/** The tallest month fills the track; everything else is drawn against it. */
const trackHeight = 160

/**
 * The last six months, as the approved design draws them: one bar a month, the selected one in colour with
 * its figure above it, the rest in quiet grey.
 *
 * It answers one question — is this month ordinary for us — and nothing else. There is no axis and no grid: a
 * manager who wants figures has the table below, and one who wants to know whether September is out of line
 * sees it in one height against five.
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

      <div className="flex flex-1 items-end gap-4 pt-5" aria-hidden="true">
        {trend.map((point) => (
          <Bar
            key={point.period}
            point={point}
            highest={highest}
            isSelected={toMonthKey(point.period) === selected}
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

function Bar({ point, highest, isSelected }: {
  point: DashboardTrendPoint
  highest: number
  isSelected: boolean
}) {
  const amount = point.knownAmount
  // A month with money in it keeps a visible bar however small the money was: a bar of no height reads as a
  // month with nothing in it, which is a different fact. A month with no priced line at all draws none.
  const height = amount === null || amount <= 0 ? 0 : Math.max(4, Math.round((amount / highest) * trackHeight))

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <div className="relative flex w-8 flex-col justify-end" style={{ height: trackHeight }}>
        <div
          className={`w-8 rounded-t ${isSelected ? 'bg-blue-600' : 'bg-slate-400/40'}`}
          style={{ height }}
          data-height={height}
        />
        {isSelected && amount !== null && (
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {compact(amount)}
          </span>
        )}
      </div>
      <span className={`truncate text-xs ${isSelected ? 'font-bold text-blue-600' : 'font-medium text-slate-500'}`}>
        {formatShortMonth(point.period)}
      </span>
    </div>
  )
}

/**
 * «71.2K ₼» — the label above the selected bar, as the design writes it.
 *
 * Deliberately the only rounded figure on the screen: it is a label on a picture, and the exact amount is in
 * the card above and in the table a screen reader walks.
 */
function compact(amount: number): string {
  return amount >= 1000
    ? `${(amount / 1000).toLocaleString('az-Latn-AZ', { maximumFractionDigits: 1 })}K ₼`
    : formatMoney(amount)
}
