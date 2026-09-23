import { Link } from 'react-router'
import type { LocationOrderHistoryEntry } from '../../api/orders'
import { formatMoney, formatMoneyDelta, formatMonth, formatPercent, toMonthKey, unknownValue } from '../analytics/format'
import { monthsBetween } from '../analytics/trend'
import { StatusBadge } from '../StatusBadge'
import { workflowStatusClass, workflowStatusLabels, workflowStatusSign } from '../workflow/labels'

/** How far back the strip looks. Enough to see a season, short enough to stay a glance. */
const months = 12

interface LocationTrendProps {
  /** Newest first, as the history endpoint returns them. */
  entries: LocationOrderHistoryEntry[]
}

/**
 * What this object ordered last, and the shape of the year behind it.
 *
 * The strip is deliberately not a chart: it answers "is this month like the others?" and nothing finer. A
 * month the object did not order in is drawn as a gap rather than as a bar of no height — the two mean
 * completely different things, and a flat bar would quietly turn one into the other.
 */
export function LocationTrend({ entries }: LocationTrendProps) {
  if (entries.length === 0) {
    return null
  }

  const latest = entries[0]
  const previous = entries[1]
  // Only the calendar month immediately before counts as a comparison; two months back is a different question.
  const comparable = previous !== undefined
    && toMonthKey(previous.requestPeriod) === monthBefore(toMonthKey(latest.requestPeriod))
    && latest.knownAmountTotal !== null
    && previous.knownAmountTotal !== null

  const delta = comparable ? latest.knownAmountTotal! - previous!.knownAmountTotal! : null
  const percent = comparable && previous!.knownAmountTotal !== 0
    ? (delta! / previous!.knownAmountTotal!) * 100
    : null

  const recent = entries.slice(0, months).reverse()
  const byPeriod = new Map(recent.map((entry) => [toMonthKey(entry.requestPeriod), entry]))
  const slots = monthsBetween(toMonthKey(recent[0].requestPeriod), toMonthKey(recent[recent.length - 1].requestPeriod))
    .map((period) => ({ period, entry: byPeriod.get(period) ?? null }))
  const largest = Math.max(...recent.map((entry) => entry.knownAmountTotal ?? 0), 0)

  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4" aria-label="Son sifariş və tarixçə">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">Son sifariş · {formatMonth(latest.requestPeriod)}</p>
          <p className="mt-1 whitespace-nowrap text-2xl font-semibold text-slate-900">
            {formatMoney(latest.knownAmountTotal)}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <StatusBadge
              label={workflowStatusLabels[latest.status] ?? latest.status}
              sign={workflowStatusSign[latest.status]}
              toneClass={workflowStatusClass[latest.status]}
              size="sm"
            />
            {comparable ? (
              <span className="whitespace-nowrap text-slate-600">
                Keçən aya görə {formatMoneyDelta(delta)} {formatPercent(percent)}
              </span>
            ) : (
              <span className="text-slate-500">Keçən ay üçün müqayisə məlumatı yoxdur.</span>
            )}
            {latest.missingPriceItemCount > 0 && (
              <span className="text-amber-800">
                {latest.missingPriceItemCount} məhsulun qiyməti yoxdur
              </span>
            )}
          </p>
        </div>

        <Link
          to={`/orders/${latest.orderRequestId}`}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Sifarişə bax
        </Link>
      </div>

      <ol className="mt-4 flex items-end gap-1" aria-label="Son ayların məbləğləri">
        {slots.map(({ period, entry }) => (
          <li key={period} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={`w-full rounded-sm ${entry === null ? 'border border-dashed border-slate-200' : 'bg-slate-300'}`}
              style={{
                height: entry === null || largest === 0
                  ? 4
                  : Math.max(4, ((entry.knownAmountTotal ?? 0) / largest) * 44),
              }}
              title={
                entry === null
                  ? `${formatMonth(period)}: sifariş yoxdur`
                  : `${formatMonth(period)}: ${formatMoney(entry.knownAmountTotal)}`
              }
            />
            <span className="text-[10px] text-slate-400">
              {entry === null ? unknownValue : formatMonth(period).slice(0, 3)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function monthBefore(period: string): string {
  const [year, month] = period.split('-').map(Number)
  const zeroBased = year * 12 + (month - 1) - 1
  return `${String(Math.floor(zeroBased / 12)).padStart(4, '0')}-${String((zeroBased % 12) + 1).padStart(2, '0')}`
}
