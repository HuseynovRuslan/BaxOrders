import {
  basisParamOrder,
  isMonth,
  previousMonth,
  toBasisParam,
  type BasisParam,
  type BasisSelection,
} from '../../analytics/basisParams'
import { basisLabels, formatMonth } from './format'

const WIRE: Record<BasisParam, BasisSelection['basis']> = {
  last: 'PreviousMonth',
  avg3: 'Previous3MonthAverage',
  avg6: 'Previous6MonthAverage',
  all: 'AllPriorMonths',
  custom: 'CustomRange',
}

interface BasisPickerProps {
  selection: BasisSelection
  onSelect: (selection: BasisSelection) => void
  /** Months the reader may pick from, oldest first — all of them before `currentPeriod`. */
  months: string[]
  /** The month being looked at. A window that reached it would compare it with itself. */
  currentPeriod: string
  label?: string
  size?: 'sm' | 'md'
  /**
   * `'chips'` — the five choices side by side, which is what a screen with room for them should show.
   * `'compact'` — one menu, for the dashboard's filter ribbon, where the comparison is the third control in a
   * bar and five buttons would push the other two off it. The same five choices either way, in the same order.
   */
  variant?: 'chips' | 'compact'
}

/**
 * The five comparison choices, on whichever screen is asking.
 *
 * One component for the dashboard and the order page, because the two must offer the same five things in the
 * same order: a manager who learns the control once should not have to learn it again after clicking through.
 *
 * Picking "Xüsusi seçim" fills the range in with the previous month rather than emptying the screen. A page
 * that goes blank while somebody decides which months they want is a page that punishes them for exploring,
 * and the previous month is the reading they would otherwise have been looking at anyway.
 */
export function BasisPicker({
  selection,
  onSelect,
  months,
  currentPeriod,
  label = 'Müqayisə',
  size = 'md',
  variant = 'chips',
}: BasisPickerProps) {
  const current = toBasisParam(selection.basis)
  const fallback = previousMonth(currentPeriod)
  const padding = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'

  function choose(option: BasisParam) {
    if (option !== 'custom') {
      onSelect({ basis: WIRE[option], from: null, to: null })
      return
    }

    // Never a blank screen: an unchosen range starts as the month before, which is a real comparison.
    const from = isMonth(selection.from) ? selection.from : (months.at(-1) ?? fallback)
    const to = isMonth(selection.to) && selection.to >= from ? selection.to : from
    onSelect({ basis: 'CustomRange', from, to })
  }

  if (variant === 'compact') {
    return (
      <span className="flex flex-wrap items-center gap-space-xs">
        <label className="flex items-center">
          <span className="sr-only">{label}</span>
          <select
            value={current}
            onChange={(event) => choose(event.target.value as BasisParam)}
            className="cursor-pointer appearance-none bg-transparent py-1 pr-1 font-label-md text-label-md font-medium text-on-surface outline-none"
          >
            {basisParamOrder.map((option) => (
              <option key={option} value={option}>{basisLabels[WIRE[option]]}</option>
            ))}
          </select>
        </label>

        {selection.basis === 'CustomRange' && (
          <CustomRange
            months={months}
            from={selection.from}
            to={selection.to}
            onChange={(from, to) => onSelect({ basis: 'CustomRange', from, to })}
          />
        )}
      </span>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="text-xs text-slate-500">
        <span id="basis-label">{label}</span>
        <div className="mt-1 flex flex-wrap gap-1" role="group" aria-labelledby="basis-label">
          {basisParamOrder.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={current === option}
              onClick={() => choose(option)}
              className={`rounded-md font-medium ${padding} ${
                current === option
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {basisLabels[WIRE[option]]}
            </button>
          ))}
        </div>
      </div>

      {selection.basis === 'CustomRange' && (
        <CustomRange
          months={months}
          from={selection.from}
          to={selection.to}
          onChange={(from, to) => onSelect({ basis: 'CustomRange', from, to })}
        />
      )}
    </div>
  )
}

/**
 * The two months of a hand-picked comparison.
 *
 * Only months before the one being looked at, and the end never precedes the start — choosing a later start
 * carries the end with it rather than silently producing an empty window.
 */
function CustomRange({
  months,
  from,
  to,
  onChange,
}: {
  months: string[]
  from: string | null
  to: string | null
  onChange: (from: string, to: string) => void
}) {
  if (months.length === 0) {
    return <p className="text-xs text-slate-500">Seçilmiş aydan əvvəl müqayisə ediləcək ay yoxdur.</p>
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-slate-500">
        Başlanğıc ay
        <select
          value={from ?? ''}
          onChange={(event) => {
            const next = event.target.value
            onChange(next, to === null || to < next ? next : to)
          }}
          className="mt-1 block rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
        >
          {months.map((month) => (
            <option key={month} value={month}>{formatMonth(month)}</option>
          ))}
        </select>
      </label>

      <label className="text-xs text-slate-500">
        Son ay
        <select
          value={to ?? ''}
          onChange={(event) => onChange(from ?? event.target.value, event.target.value)}
          className="mt-1 block rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
        >
          {months.filter((month) => from === null || month >= from).map((month) => (
            <option key={month} value={month}>{formatMonth(month)}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
