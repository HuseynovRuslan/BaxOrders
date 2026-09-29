import { Info } from 'lucide-react'
import { Link } from 'react-router'
import type { LocationDashboardRow, ManagementDashboardSummary } from '../../../api/dashboard'
import type { BasisSelection } from '../../../analytics/basisParams'
import { DirectionWord } from '../../analytics/DirectionWord'
import {
  describeBasisCaption,
  formatCount,
  formatMoney,
  formatMonth,
  formatPercent,
} from '../../analytics/format'
import { detailsTarget } from '../details'

/** How many objects are drawn one by one before the rest becomes a single bar. */
const named = 3

/**
 * The month against the month before it, object by object.
 *
 * Two bars to a row on one scale, so the length of the second against the first is the change — the figures
 * beside them are for checking, not for reading. Only the objects that moved the most money are drawn; the
 * rest are one bar, so the picture still adds up to the company and a reader can see how much of the month
 * the named few actually are.
 *
 * The scale is the largest single figure anywhere in the block, including the folded remainder, so no bar can
 * be longer than the thing it is a part of.
 */
export function ComparisonBars({ summary, rows, selection, onOpenAll }: {
  summary: ManagementDashboardSummary
  /** Every object of the month, unfiltered: this block describes the company, not the reader's search. */
  rows: readonly LocationDashboardRow[]
  selection: BasisSelection
  /** Brings the full table into view. Without it the block simply does not offer the link. */
  onOpenAll?: () => void
}) {
  const comparable = rows
    .filter((row) => row.knownAmountDelta !== null)
    .sort((left, right) => Math.abs(right.knownAmountDelta!) - Math.abs(left.knownAmountDelta!))

  if (comparable.length === 0) {
    return null
  }

  const top = comparable.slice(0, named)
  const rest = comparable.slice(named)
  const restCurrent = rest.reduce((sum, row) => sum + (row.current.knownAmount ?? 0), 0)
  const restBaseline = rest.reduce((sum, row) => sum + (row.baseline.knownAmount ?? 0), 0)

  const scale = Math.max(
    ...top.flatMap((row) => [row.current.knownAmount ?? 0, row.baseline.knownAmount ?? 0]),
    restCurrent,
    restBaseline,
  )

  const caption = describeBasisCaption(summary.basis, summary.baselinePeriods)
  const thisMonth = formatMonth(summary.selectedPeriod)

  // How much of the month's whole movement the largest object alone accounts for. Only said when the
  // comparison has a total to be a share of, and only about the one object — a share of a share is noise.
  const movement = comparable.reduce((sum, row) => sum + Math.abs(row.knownAmountDelta!), 0)
  const leadShare = movement === 0 ? null : Math.round((Math.abs(top[0].knownAmountDelta!) / movement) * 100)

  return (
    <section
      className="flex flex-col rounded-xl bg-surface-container-lowest p-space-lg shadow-sm lg:col-span-7"
      aria-label="Aylıq xərc dinamikası və müqayisə"
    >
      <div className="mb-space-md flex flex-col justify-between gap-space-sm border-b border-surface-container-high/60 pb-space-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Aylıq xərc dinamikası və müqayisə</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Ən çox məbləğ hərəkət etdirən obyektlərin müqayisəli balansı
          </p>
        </div>

        <div className="flex items-center gap-space-md font-label-sm text-label-sm">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-surface-container-highest" aria-hidden="true" />
            <span className="text-on-surface-variant">{caption}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-secondary" aria-hidden="true" />
            <span className="font-semibold text-on-surface">{thisMonth}</span>
          </span>
        </div>
      </div>

      <ul className="space-y-4 pb-4 pt-2">
        {top.map((row) => (
          <Row
            key={row.locationId}
            name={row.locationName}
            baseline={row.baseline.knownAmount}
            current={row.current.knownAmount}
            percent={row.knownAmountPercentChange}
            delta={row.knownAmountDelta}
            scale={scale}
            to={detailsTarget(row, selection)}
          />
        ))}

        {rest.length > 0 && (
          <Row
            name={`Digər ${formatCount(rest.length)} obyekt (cəmi)`}
            baseline={restBaseline}
            current={restCurrent}
            percent={null}
            delta={restCurrent - restBaseline}
            scale={scale}
            neutral
          />
        )}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-space-sm border-t border-surface-container-high/60 pt-3 font-label-sm text-label-sm text-on-surface-variant">
        <span className="flex min-w-0 items-center gap-1">
          <Info className="size-4 shrink-0 text-secondary" aria-hidden="true" />
          <span className="truncate">
            {leadShare === null
              ? 'Bu ay heç bir obyektin məbləği dəyişməyib'
              : `Dəyişmənin ${leadShare}%-i ${top[0].locationName} obyektinin payına düşür`}
          </span>
        </span>
        {onOpenAll && (
          <button type="button" onClick={onOpenAll} className="shrink-0 font-semibold text-secondary hover:underline">
            Tam cədvələ bax →
          </button>
        )}
      </div>
    </section>
  )
}

function Row({ name, baseline, current, percent, delta, scale, to, neutral = false }: {
  name: string
  baseline: number | null
  current: number | null
  percent: number | null
  delta: number | null
  scale: number
  to?: string
  /** The folded remainder: many objects moving both ways, so it is drawn as structure rather than direction. */
  neutral?: boolean
}) {
  const rising = !neutral && delta !== null && delta > 0
  const falling = !neutral && delta !== null && delta < 0
  const width = (value: number | null) => (scale === 0 || value === null || value <= 0 ? 0 : (value / scale) * 100)

  const dot = rising ? 'bg-error' : falling ? 'bg-tertiary-fixed-dim' : 'bg-outline'
  const bar = rising ? 'bg-error' : falling ? 'bg-tertiary-container' : 'bg-primary-container'
  const chip = rising
    ? 'text-error bg-error-container/40'
    : falling
      ? 'text-on-tertiary-fixed-variant bg-tertiary-fixed/40'
      : 'text-on-surface-variant bg-surface-container-high'

  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-space-sm font-body-sm text-body-sm">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold text-on-surface">
          <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
          {to
            ? <Link to={to} className="truncate hover:underline">{name}</Link>
            : <span className="truncate">{name}</span>}
        </span>

        <span className="flex shrink-0 items-center gap-3">
          <span className="tabular text-on-surface-variant">{formatMoney(baseline)}</span>
          <span className="tabular font-bold text-on-surface">{formatMoney(current)}</span>
          {percent !== null && (
            <span className={`rounded px-1.5 py-0.5 font-semibold text-[11px] ${chip}`}>
              {formatPercent(percent)}
              <DirectionWord value={delta} />
            </span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <span className="block h-4 w-full overflow-hidden rounded bg-surface-container-low">
          <span className="block h-full rounded bg-surface-container-highest" style={{ width: `${width(baseline)}%` }} />
        </span>
        <span className="block h-4 w-full overflow-hidden rounded bg-surface-container-low">
          <span className={`block h-full rounded ${bar}`} style={{ width: `${width(current)}%` }} data-current-width={Math.round(width(current))} />
        </span>
      </div>
    </li>
  )
}
