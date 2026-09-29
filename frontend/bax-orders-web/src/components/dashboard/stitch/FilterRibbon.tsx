import { CalendarDays, History, RefreshCw } from 'lucide-react'
import type { AnalyticsScope, DashboardPeriod } from '../../../api/dashboard'
import type { BasisSelection } from '../../../analytics/basisParams'
import { scopeLabels, scopeOrder } from '../../../analytics/scope'
import { BasisPicker } from '../../analytics/BasisPicker'
import { formatCount, formatMonth, toMonthKey } from '../../analytics/format'

/**
 * One bar carrying the whole question the screen answers: this month, these lines, against that.
 *
 * The three controls sit together because they are one question, not three filters. Period and comparison
 * open their own menus; the scope is a segmented control, because it decides what every figure below it
 * *means* and a reader must be able to see the answer without opening anything.
 */
export function FilterRibbon({
  periods,
  period,
  onPeriod,
  scope,
  onScope,
  selection,
  onSelection,
  priorMonths,
  loadedAt,
}: {
  periods: readonly DashboardPeriod[]
  period: string | null
  onPeriod: (period: string) => void
  scope: AnalyticsScope
  onScope: (scope: AnalyticsScope) => void
  selection: BasisSelection
  onSelection: (selection: BasisSelection) => void
  priorMonths: readonly string[]
  /** When the answer on screen was fetched. Not a synchronisation — this product has none to report. */
  loadedAt: Date | null
}) {
  const chosen = periods.find((item) => toMonthKey(item.period) === period)

  return (
    <section
      aria-label="Dövr və müqayisə"
      className="flex flex-col items-stretch justify-between gap-space-md rounded-xl bg-surface-container-lowest p-space-sm shadow-sm xl:flex-row xl:items-center"
    >
      <div className="flex flex-wrap items-center gap-space-sm">
        <label className="flex items-center gap-space-xs rounded-lg bg-surface-container-low px-space-md py-2 font-label-md text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container">
          <CalendarDays className="size-5 shrink-0 text-secondary" aria-hidden="true" />
          <span className="sr-only">Dövr</span>
          <select
            value={period ?? ''}
            onChange={(event) => onPeriod(event.target.value)}
            disabled={periods.length === 0}
            className="cursor-pointer appearance-none bg-transparent pr-1 font-semibold text-on-surface outline-none disabled:opacity-50"
          >
            {periods.length === 0 && <option value="">Yüklənir…</option>}
            {periods.map((item) => (
              <option key={item.period} value={toMonthKey(item.period)}>
                {formatMonth(item.period)} ({formatCount(item.locationCount)} obyekt)
              </option>
            ))}
          </select>
        </label>

        <span className="hidden h-6 w-px bg-surface-container-high sm:block" aria-hidden="true" />

        <div
          role="group"
          aria-label="Sifariş növü"
          className="flex items-center gap-1.5 rounded-lg bg-surface-container-low p-1"
        >
          {scopeOrder.map((option) => {
            const active = option === scope
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onScope(option)}
                className={`rounded-md px-space-md py-1 font-label-md text-label-md transition-colors ${
                  active
                    ? 'bg-secondary font-medium text-on-secondary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {scopeLabels[option]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-start gap-space-sm xl:justify-end">
        <span className="hidden font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant md:inline">
          Müqayisə dövrü:
        </span>

        <span className="flex items-center gap-space-xs rounded-lg bg-surface-container-low px-space-sm py-1 text-on-surface">
          <History className="size-4 shrink-0 text-on-surface-variant" aria-hidden="true" />
          {period !== null && (
            <BasisPicker
              selection={selection}
              onSelect={onSelection}
              months={[...priorMonths]}
              currentPeriod={period}
              size="sm"
              variant="compact"
            />
          )}
        </span>

        {/*
          What the figures on screen were fetched at. The approved design shows a synchronisation time here;
          this product synchronises with nothing, so it says the true thing instead — when this answer was
          read — rather than a reassuring one it cannot back up.
        */}
        {loadedAt && (
          <span className="flex items-center gap-1 rounded-lg bg-surface-container-low px-space-sm py-1.5 font-label-sm text-label-sm text-on-tertiary-container">
            <RefreshCw className="size-4 shrink-0" aria-hidden="true" />
            Yeniləndi: {loadedAt.toLocaleTimeString('az-Latn-AZ', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}

        <span className="sr-only">
          {chosen ? `${formatMonth(chosen.period)} dövrü seçilib` : ''}
        </span>
      </div>
    </section>
  )
}
