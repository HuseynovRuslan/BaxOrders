import { Link } from 'react-router'
import type { OrderDecisionContext } from '../../api/decisions'
import type { LocationOrderHistoryEntry } from '../../api/orders'
import { orderLink, type BasisSelection } from '../../analytics/basisParams'
import {
  internalSupplyShortLabel,
  internalToneClass,
  missingPriceShortLabel,
  warningToneClass,
} from '../../pricing/labels'
import { orderCountsLead } from '../../terminology/terms'
import { BasisPicker } from '../analytics/BasisPicker'
import { DirectionWord } from '../analytics/DirectionWord'
import {
  costDirectionToneClass,
  describeBasisCaption,
  describeBasisWithRange,
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatMonth,
  formatPercent,
  toMonthKey,
  unknownValue,
} from '../analytics/format'
import { monthTickLabel, monthsBetween } from '../analytics/trend'
import { MissingPriceMark } from '../dashboard/MissingPriceMark'
import { emptyWindowNote } from '../decisions/labels'
import { OrderStatusBadge } from '../workflow/OrderStatusBadge'

/** How far back the strip looks, in calendar months. Enough to see a season, short enough to stay a glance. */
const months = 12

/** The tallest bar, in pixels. Every other bar is its month's money against the strip's largest. */
const barHeight = 44

interface LocationTrendProps {
  /** Newest first, as the history endpoint returns them — the first is the object's latest order. */
  entries: LocationOrderHistoryEntry[]
  /** The order page's own comparison of the latest order against the reader's basis. Null when it did not come. */
  comparison: OrderDecisionContext | null
  comparisonPending: boolean
  selection: BasisSelection
  onSelectBasis: (selection: BasisSelection) => void
  /** Months the latest order can be compared against, oldest first — for the hand-picked range. */
  priorMonths: string[]
}

/**
 * What this object ordered last, and the shape of the year behind it.
 *
 * It compares nothing itself. The comparison under the amount is the order page's figure for the same order and
 * the same basis, passed in, so the object page and the order page cannot give two answers to one question — it
 * used to subtract two history rows here, which only ever knew about last month.
 *
 * The strip is deliberately not a chart: it answers "is this month like the others?" and nothing finer. A
 * month the object did not order in is drawn as a gap rather than as a bar of no height — the two mean
 * completely different things, and a flat bar would quietly turn one into the other.
 */
export function LocationTrend({
  entries,
  comparison,
  comparisonPending,
  selection,
  onSelectBasis,
  priorMonths,
}: LocationTrendProps) {
  if (entries.length === 0) {
    return null
  }

  const latest = entries[0]
  const slots = stripSlots(entries)
  const largest = Math.max(...slots.map(({ entry }) => entry?.knownAmountTotal ?? 0), 0)

  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4" aria-label="Son sifariş və tarixçə">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">Son sifariş · {formatMonth(latest.requestPeriod)}</p>
          <p className="mt-1 whitespace-nowrap text-2xl font-semibold text-slate-900">
            {formatMoney(latest.knownAmountTotal)}
          </p>
          <LatestCounts entry={latest} />
          <p className="mt-1 text-xs">
            <OrderStatusBadge status={latest.status} isHistoricalImport={latest.isHistoricalImport} size="sm" />
          </p>
        </div>

        <Link
          to={orderLink(latest.orderRequestId, selection)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Sifarişə bax
        </Link>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <BasisPicker
          selection={selection}
          onSelect={onSelectBasis}
          months={priorMonths}
          currentPeriod={latest.requestPeriod}
          size="sm"
        />
        <ComparisonLine comparison={comparison} pending={comparisonPending} />
      </div>

      {/*
        Every month is named in full — "İyun" and "İyul" cut to three letters are the same word — and carries its
        own money, so the strip is read rather than guessed at from the bars' heights.
      */}
      <ol className="mt-4 flex items-start gap-1 overflow-x-auto" aria-label="Son ayların məbləğləri">
        {slots.map(({ period, entry }, index) => (
          <li key={period} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end" style={{ height: barHeight }}>
              <span
                className={`w-full rounded-sm ${entry === null ? 'border border-dashed border-slate-200' : 'bg-slate-300'}`}
                style={{
                  height: entry === null || largest === 0
                    ? 4
                    : Math.max(4, ((entry.knownAmountTotal ?? 0) / largest) * barHeight),
                }}
                title={
                  entry === null
                    ? `${formatMonth(period)}: sifariş yoxdur`
                    : `${formatMonth(period)}: ${formatMoney(entry.knownAmountTotal)}`
                }
              />
            </div>
            <span className="whitespace-nowrap text-[10px] text-slate-500">{monthTickLabel(period, index === 0)}</span>
            <span className="whitespace-nowrap text-[10px] tabular-nums text-slate-700">
              {entry === null ? unknownValue : formatMoney(entry.knownAmountTotal)}
            </span>
            {/* A partial amount never reads as a whole one: the month that owes a price says so under it. */}
            {entry !== null && <MissingPriceMark count={entry.missingPriceItemCount} explanationIsComplete />}
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * The comparison under the picker: the rule and its months, then the difference in the direction of the cost
 * (9.1). An empty window says so, and nothing is compared with zero.
 */
function ComparisonLine({ comparison, pending }: { comparison: OrderDecisionContext | null; pending: boolean }) {
  // Never the previous basis's figure under the newly chosen one: while it is on its way, a placeholder.
  if (pending) {
    return <p className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-100" aria-hidden="true" />
  }

  if (comparison === null) {
    return null
  }

  const { primary } = comparison
  const tone = costDirectionToneClass(primary.deltaAmount)

  return (
    <div className="mt-2">
      <p className="text-xs text-slate-500">Müqayisə: {describeBasisWithRange(primary.basis, primary.windowPeriods)}</p>
      {primary.available ? (
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-sm text-slate-600">
          <span>{describeBasisCaption(primary.basis, primary.windowPeriods)}</span>
          <span className={`whitespace-nowrap font-medium ${tone}`}>
            {formatMoneyDelta(primary.deltaAmount)}
            <DirectionWord value={primary.deltaAmount} />
          </span>
          <span className={`whitespace-nowrap ${tone}`}>{formatPercent(primary.deltaPercent)}</span>
        </p>
      ) : (
        <p className="mt-0.5 text-sm text-slate-600">{emptyWindowNote}</p>
      )}
    </div>
  )
}

/**
 * "Sentyabr 2026 sifarişində: Qiymət yoxdur 1 · Daxili təminat 1" — the latest order's two counts, apart and with
 * the order they belong to. Amber is a price somebody owes; internal supply is slate and never a warning (Task 2).
 */
function LatestCounts({ entry }: { entry: LocationOrderHistoryEntry }) {
  const missing = entry.missingPriceItemCount
  const internal = entry.internalSupplyItemCount
  if (missing === 0 && internal === 0) {
    return null
  }

  return (
    <p className="mt-1 text-xs text-slate-500">
      {orderCountsLead(formatMonth(entry.requestPeriod))}{' '}
      {missing > 0 && <span className={warningToneClass}>{missingPriceShortLabel} {formatCount(missing)}</span>}
      {missing > 0 && internal > 0 && ' · '}
      {internal > 0 && <span className={internalToneClass}>{internalSupplyShortLabel} {formatCount(internal)}</span>}
    </p>
  )
}

/**
 * One slot per calendar month, at most twelve, ending at the latest order's month and starting no earlier than the
 * oldest order loaded in that range. A month holds its newest order — a correction replaces what it corrected —
 * and a month with none is a gap (null), never a month of nothing.
 */
function stripSlots(entries: LocationOrderHistoryEntry[]): { period: string; entry: LocationOrderHistoryEntry | null }[] {
  const last = toMonthKey(entries[0].requestPeriod)
  const first = monthsBack(last, months - 1)

  const newest = new Map<string, LocationOrderHistoryEntry>()
  for (const entry of entries) {
    const period = toMonthKey(entry.requestPeriod)
    const held = newest.get(period)
    if (period >= first && period <= last && (held === undefined || entry.version > held.version)) {
      newest.set(period, entry)
    }
  }

  const start = [...newest.keys()].sort()[0] ?? last
  return monthsBetween(start, last).map((period) => ({ period, entry: newest.get(period) ?? null }))
}

/** A month so many months before another, as `yyyy-MM`. Computed on the parts, never through a time-zoned Date. */
function monthsBack(period: string, count: number): string {
  const [year, month] = period.split('-').map(Number)
  const zeroBased = year * 12 + (month - 1) - count
  return `${String(Math.floor(zeroBased / 12)).padStart(4, '0')}-${String((zeroBased % 12) + 1).padStart(2, '0')}`
}
