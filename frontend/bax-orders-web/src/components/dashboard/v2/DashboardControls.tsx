import { Calendar, ChevronDown } from 'lucide-react'
import type { AnalyticsScope, DashboardPeriod } from '../../../api/dashboard'
import type { BasisSelection } from '../../../analytics/basisParams'
import { scopeLabels, scopeOrder } from '../../../analytics/scope'
import {
  dashboardViewLabels,
  dashboardViewOrder,
  dashboardViewShortLabels,
  type DashboardView,
} from '../../../analytics/dashboardView'
import { basisLabels, formatMonth, toMonthKey } from '../../analytics/format'
import { basisParamOrder, isMonth, previousMonth, toBasisParam, type BasisParam } from '../../../analytics/basisParams'

/** The wire name of each choice, in the order the product offers them everywhere. */
const wire: Record<BasisParam, BasisSelection['basis']> = {
  last: 'PreviousMonth',
  avg3: 'Previous3MonthAverage',
  avg6: 'Previous6MonthAverage',
  all: 'AllPriorMonths',
  custom: 'CustomRange',
}

/**
 * The whole question the dashboard answers, in one row: this month, these lines, against that — and how much
 * of the answer to show.
 *
 * Shared by both views, because the four are one question and a reader who sets them on one view must find
 * them set on the other. Only the drawing below them changes.
 */
export function DashboardControls({
  periods,
  period,
  onPeriod,
  scope,
  onScope,
  selection,
  onSelection,
  priorMonths,
  view,
  onView,
}: {
  periods: readonly DashboardPeriod[]
  period: string | null
  onPeriod: (period: string) => void
  scope: AnalyticsScope
  onScope: (scope: AnalyticsScope) => void
  selection: BasisSelection
  onSelection: (selection: BasisSelection) => void
  priorMonths: readonly string[]
  view: DashboardView
  onView: (view: DashboardView) => void
}) {
  const current = toBasisParam(selection.basis)

  function chooseBasis(option: BasisParam) {
    if (option !== 'custom') {
      onSelection({ basis: wire[option], from: null, to: null })
      return
    }

    // Never a blank screen: an unchosen range starts as the month before, which is a real comparison.
    const from = isMonth(selection.from) ? selection.from : (priorMonths.at(-1) ?? previousMonth(period ?? ''))
    const to = isMonth(selection.to) && selection.to >= from ? selection.to : from
    onSelection({ basis: 'CustomRange', from, to })
  }

  return (
    <section aria-label="Dövr və müqayisə" className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
        <Calendar className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
        <span className="sr-only">Dövr</span>
        <select
          value={period ?? ''}
          onChange={(event) => onPeriod(event.target.value)}
          disabled={periods.length === 0}
          className="cursor-pointer appearance-none bg-transparent pr-1 text-[13px] font-medium text-slate-700 outline-none disabled:opacity-50"
        >
          {periods.length === 0 && <option value="">Yüklənir…</option>}
          {periods.map((item) => (
            <option key={item.period} value={toMonthKey(item.period)}>{formatMonth(item.period)}</option>
          ))}
        </select>
        <ChevronDown className="size-3 shrink-0 text-slate-500" aria-hidden="true" />
      </label>

      <div role="group" aria-label="Sifariş növü" className="flex gap-0.5 rounded-md bg-slate-200 p-1">
        {scopeOrder.map((option) => {
          const active = option === scope
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onScope(option)}
              className={`rounded px-3 py-1.5 text-xs transition-colors ${
                active ? 'bg-white font-semibold text-slate-900' : 'font-medium text-slate-600 hover:text-slate-900'
              }`}
            >
              {scopeLabels[option]}
            </button>
          )
        })}
      </div>

      <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
        {/* The visible word is the label, so the control is not named twice over. */}
        <span className="text-[13px] text-slate-500" aria-hidden="true">Müqayisə:</span>
        <select
          aria-label="Müqayisə"
          value={current}
          onChange={(event) => chooseBasis(event.target.value as BasisParam)}
          className="cursor-pointer appearance-none bg-transparent pr-1 text-[13px] font-semibold text-slate-700 outline-none"
        >
          {basisParamOrder.map((option) => (
            <option key={option} value={option}>{basisLabels[wire[option]]}</option>
          ))}
        </select>
        <ChevronDown className="size-3 shrink-0 text-slate-500" aria-hidden="true" />
      </label>

      {selection.basis === 'CustomRange' && (
        <CustomRange
          months={priorMonths}
          from={selection.from}
          to={selection.to}
          onChange={(from, to) => onSelection({ basis: 'CustomRange', from, to })}
        />
      )}

      <div role="group" aria-label="Baxış" className="flex gap-0.5 rounded-md bg-slate-200 p-1">
        {dashboardViewOrder.map((option) => {
          const active = option === view
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              aria-label={dashboardViewLabels[option]}
              onClick={() => onView(option)}
              className={`rounded px-3 py-1.5 text-xs transition-colors ${
                active ? 'bg-white font-semibold text-slate-900' : 'font-medium text-slate-500 hover:text-slate-900'
              }`}
            >
              {dashboardViewShortLabels[option]}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/**
 * The two months of a hand-picked comparison. Only months before the one being looked at, and the end never
 * precedes the start — choosing a later start carries the end with it rather than producing an empty window.
 */
function CustomRange({ months, from, to, onChange }: {
  months: readonly string[]
  from: string | null
  to: string | null
  onChange: (from: string, to: string) => void
}) {
  if (months.length === 0) {
    return <p className="text-xs text-slate-500">Seçilmiş aydan əvvəl müqayisə ediləcək ay yoxdur.</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
        <span className="text-[13px] text-slate-500">Başlanğıc ay</span>
        <select
          value={from ?? ''}
          onChange={(event) => {
            const next = event.target.value
            onChange(next, to === null || to < next ? next : to)
          }}
          className="cursor-pointer appearance-none bg-transparent text-[13px] font-semibold text-slate-700 outline-none"
        >
          {months.map((month) => <option key={month} value={month}>{formatMonth(month)}</option>)}
        </select>
      </label>

      <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
        <span className="text-[13px] text-slate-500">Son ay</span>
        <select
          value={to ?? ''}
          onChange={(event) => onChange(from ?? event.target.value, event.target.value)}
          className="cursor-pointer appearance-none bg-transparent text-[13px] font-semibold text-slate-700 outline-none"
        >
          {months.filter((month) => from === null || month >= from)
            .map((month) => <option key={month} value={month}>{formatMonth(month)}</option>)}
        </select>
      </label>
    </div>
  )
}
