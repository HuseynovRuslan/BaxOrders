import { useId, useRef, useState } from 'react'
import { ChevronDown, RotateCcw, Search } from 'lucide-react'
import type { AnalyticsScope } from '../../api/dashboard'
import { isReportSort, reportSortLabels, reportSortOrder, type ReportSort } from '../../analytics/reportSort'
import { reportViewLabels, reportViewOrder, type ReportView } from '../../analytics/reportView'
import { ScopeSelector } from '../analytics/ScopeSelector'
import { unknownValue } from '../analytics/format'
import { buttonClass } from '../buttonClass'
import { SegmentedControl } from '../SegmentedControl'
import {
  loadingLabel,
  resetFiltersHint,
  resetFiltersLabel,
  scopeFilterLabel,
  searchFilterLabel,
  searchPlaceholder,
  sortFilterLabel,
  viewFilterLabel,
  yearFilterLabel,
} from './labels'

const viewOptions = reportViewOrder.map((view) => ({ value: view, label: reportViewLabels[view] }))

const fieldLabelClass = 'mb-1.5 block text-body-sm leading-[18px] font-medium text-on-surface-variant'

/** A field's frame, focus and height: 40 pixels for a mouse from `lg`, 44 for a finger below it. */
const fieldClass =
  'h-11 scroll-mt-18 rounded-md border border-outline bg-surface-container-lowest text-body-md text-on-surface '
  + 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:h-10'

/**
 * The questions the report answers, in one row with their names above them (UI V2, 03 §6.7, 04 §5.3): the year, an
 * object, which lines, and how much of each month to show — then «Sıfırla». Below the `lg` width, where there is no
 * table header to press, «Sıralama» orders the cards (03 §6.4).
 *
 * The controls say what the address says, even while the answer to it is on its way. Typing into the search asks
 * nothing; Enter asks, and an empty Enter clears the search. «Sıfırla» has its place at the end of the row whether it
 * is shown or not, so nothing moves when it appears; it is shown only when there is something to put back, and after
 * it the keyboard's focus is in the search, not lost with the button.
 */
export function ReportFilters({
  year,
  years,
  yearsLoading,
  onYear,
  search,
  onSearch,
  scope,
  onScope,
  view,
  onView,
  sort,
  onSort,
  canReset,
  onReset,
}: {
  /** The year the select shows. */
  year: string
  /** The years it offers. */
  years: readonly number[]
  /** Whether the years are still on their way. */
  yearsLoading: boolean
  onYear: (year: string) => void
  /** The search in the address. */
  search: string
  onSearch: (search: string) => void
  scope: AnalyticsScope
  onScope: (scope: AnalyticsScope) => void
  view: ReportView
  onView: (view: ReportView) => void
  sort: ReportSort
  onSort: (sort: ReportSort) => void
  canReset: boolean
  onReset: () => void
}) {
  const yearId = useId()
  const sortId = useId()
  const searchId = useId()
  const scopeLabelId = useId()
  const viewLabelId = useId()
  const searchBox = useRef<HTMLInputElement>(null)

  // The box says what the address says whenever the address changes — a reset, a link, Back — and what the reader
  // types in between.
  const [text, setText] = useState(search)
  const [addressSearch, setAddressSearch] = useState(search)
  if (addressSearch !== search) {
    setAddressSearch(search)
    setText(search)
  }

  function reset() {
    setText('')
    onReset()
    searchBox.current?.focus()
  }

  return (
    <div className="flex flex-wrap items-end gap-space-md">
      <div>
        <label htmlFor={yearId} className={fieldLabelClass}>{yearFilterLabel}</label>
        <div className="relative">
          <select
            id={yearId}
            value={year}
            onChange={(event) => onYear(event.target.value)}
            className={`w-24 appearance-none pl-3 pr-8 ${fieldClass}`}
          >
            {years.map((option) => (
              <option key={option} value={String(option)}>{option}</option>
            ))}
            {years.length === 0 && <option value="">{yearsLoading ? loadingLabel : unknownValue}</option>}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
          />
        </div>
      </div>

      {/* From `lg` the table's own headers order it; there is no table below it, so this is the way there. */}
      <div className="lg:hidden">
        <label htmlFor={sortId} className={fieldLabelClass}>{sortFilterLabel}</label>
        <div className="relative">
          <select
            id={sortId}
            value={sort}
            onChange={(event) => {
              if (isReportSort(event.target.value)) {
                onSort(event.target.value)
              }
            }}
            className={`w-56 appearance-none pl-3 pr-8 ${fieldClass}`}
          >
            {reportSortOrder.map((option) => (
              <option key={option} value={option}>{reportSortLabels[option]}</option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
          />
        </div>
      </div>

      <form
        className="w-full sm:w-auto"
        onSubmit={(event) => {
          event.preventDefault()
          onSearch(text.trim())
        }}
      >
        <label htmlFor={searchId} className={fieldLabelClass}>{searchFilterLabel}</label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            id={searchId}
            ref={searchBox}
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={searchPlaceholder}
            className={`w-full pl-9 pr-3 placeholder:text-on-surface-variant sm:w-60 min-[1440px]:w-72 ${fieldClass}`}
          />
        </div>
      </form>

      <div className="w-full sm:w-auto">
        <span id={scopeLabelId} className={fieldLabelClass}>{scopeFilterLabel}</span>
        <ScopeSelector
          value={scope}
          onChange={onScope}
          labelledBy={scopeLabelId}
          size="responsive"
          fullWidth="mobile"
        />
      </div>

      <div className="sm:ml-auto">
        <span id={viewLabelId} className={fieldLabelClass}>{viewFilterLabel}</span>
        <SegmentedControl
          label={viewFilterLabel}
          labelledBy={viewLabelId}
          options={viewOptions}
          value={view}
          onChange={onView}
          size="responsive"
        />
      </div>

      {/* Its place is kept when there is nothing to reset: hidden, it is neither drawn nor reachable (D-S3). */}
      <button
        type="button"
        onClick={reset}
        title={resetFiltersHint}
        aria-hidden={canReset ? undefined : true}
        tabIndex={canReset ? undefined : -1}
        className={`scroll-mt-18 max-sm:ml-auto ${buttonClass({ variant: 'ghost', size: 'md', touchBelowLg: true })} ${
          canReset ? '' : 'invisible'
        }`}
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        {resetFiltersLabel}
      </button>
    </div>
  )
}
