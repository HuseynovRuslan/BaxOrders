import { useId, useRef } from 'react'
import { Link } from 'react-router'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { MonthlyReport, MonthlyReportRow } from '../../api/reports'
import { nextNameSort, nextTotalSort, type ReportSort } from '../../analytics/reportSort'
import type { ReportView } from '../../analytics/reportView'
import { portfolioGroupLabels } from '../../coverage/labels'
import {
  futureMonthNote,
  monthlyTotalsAllLocationsLabel,
  monthlyTotalsRowLabel,
  reportLegendLabel,
} from '../../terminology/terms'
import { formatMoney, formatMonth } from '../analytics/format'
import { Legend } from './Legend'
import { locationColumnLabel, reportTableTitle, yearTotalLabel } from './labels'
import { MonthTotal } from './MonthTotal'
import { ReportCell } from './ReportCell'
import { ReportFloatingHeader, useFloatingHeader } from './ReportFloatingHeader'
import { ReportMonthJump } from './ReportMonthJump'
import {
  futureMonthMarkerClass,
  futureMonths,
  latestOrderedMonth,
  reportPeriods,
  shortMonths,
  tableMinWidthClass,
} from './reportGrid'
import { useBoxScroll } from './reportScroll'

/** The cell the side panel describes (phase D): which object, which month (1–12). */
export interface SelectedCell {
  locationId: number
  month: number
}

type SortColumn = 'name' | 'total'

/**
 * A year of ordering as a panorama: January to December at once, and under them the company's month (UI V2 03 §4,
 * §6.1–§6.6).
 *
 * The page never scrolls sideways (AC-14). At every desktop width the table scrolls inside its own box when its months
 * need more room than the box has — 74 pixels a month in «Yığcam», 106 in «Standart», with figures at 12 pixels
 * (D-51) — with the object pinned on the left and the year on the right. The box opens on the latest month anyone
 * ordered in, wholly in sight beside the year. The months' names stay in sight under the application's header while the
 * reader scrolls down (`ReportFloatingHeader`), and the months above the table say which months are in sight and move a
 * page at a time (`ReportMonthJump`).
 *
 * The keyboard never loses sight of its focus (DK-01): the box keeps the pinned columns' widths as scroll padding, so
 * a month reached by Tab stops between them; a row's links keep the application header, the floating header and its
 * bar (124 pixels) above them; and the header's sort buttons 84 pixels, so the floating copy is gone when one is reached
 * from below (DK-26).
 */
export function ReportTable({
  report,
  rows,
  view,
  sort,
  onSort,
  searchActive,
  selected = null,
  today = new Date(),
}: {
  report: MonthlyReport
  /** The report's rows, in the order the reader asked for. */
  rows: readonly MonthlyReportRow[]
  view: ReportView
  sort: ReportSort
  onSort: (sort: ReportSort) => void
  /** Whether this answer was asked with a search: then the totals say they are every object's. */
  searchActive: boolean
  selected?: SelectedCell | null
  /** The reader's today, which decides which months have not begun yet. */
  today?: Date
}) {
  const titleId = useId()
  const box = useRef<HTMLDivElement>(null)
  const table = useRef<HTMLTableElement>(null)
  const head = useRef<HTMLTableSectionElement>(null)

  const periods = reportPeriods(report.year)
  const future = futureMonths(report.year, today)
  const minWidth = tableMinWidthClass(view)
  const { scroll, page } = useBoxScroll({
    box,
    table,
    resetKey: `${report.year}|${view}`,
    latest: latestOrderedMonth(report),
  })
  const floatingHeader = useFloatingHeader({ box, head, table, scrolls: scroll.scrolls })

  // A click on the copy's button sorts, and puts the keyboard's focus on the real button, never in the copy.
  function sortFromCopy(next: ReportSort, column: SortColumn) {
    onSort(next)
    head.current?.querySelector<HTMLButtonElement>(`[data-sort-button="${column}"]`)?.focus({ preventScroll: true })
  }

  return (
    <div className="hidden lg:block">
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest">
        <div className="px-space-md pb-3 pt-space-md">
          <div className="flex flex-wrap items-center justify-between gap-x-space-md gap-y-1">
            <h2 id={titleId} className="font-headline-sm text-headline-sm text-on-surface">{reportTableTitle}</h2>
            <ReportMonthJump scroll={scroll} periods={periods} onPage={page} />
          </div>
          <Legend label={reportLegendLabel} view={view} />
        </div>

        <ReportFloatingHeader
          header={floatingHeader}
          scrolls={scroll.scrolls}
          trackWidth={scroll.trackWidth}
          minWidthClass={minWidth}
        >
          <Columns />
          <thead>
            <HeaderRow
              periods={periods}
              future={future}
              sort={sort}
              onSort={sortFromCopy}
              copy
            />
          </thead>
        </ReportFloatingHeader>

        <div
          ref={box}
          className="overflow-x-auto rounded-b-lg border-t border-outline-variant [scroll-snap-type:x_proximity] scroll-pl-30 scroll-pr-22"
        >
          <table
            ref={table}
            aria-labelledby={titleId}
            className={`w-full table-fixed border-separate border-spacing-0 ${minWidth}`}
          >
            <Columns />
            <thead ref={head}>
              <HeaderRow periods={periods} future={future} sort={sort} onSort={(next) => onSort(next)} />
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <LocationRow
                  key={row.locationId}
                  row={row}
                  striped={index % 2 === 1}
                  future={future}
                  view={view}
                  selectedMonth={selected !== null && selected.locationId === row.locationId ? selected.month : null}
                />
              ))}
            </tbody>

            <tfoot>
              <tr>
                <th
                  scope="row"
                  className="sticky left-0 z-[1] border-r border-t-2 border-r-outline-variant border-t-outline-variant bg-surface-container px-2 py-1 text-left align-top text-body-sm leading-[18px] font-semibold text-on-surface"
                >
                  {searchActive ? monthlyTotalsAllLocationsLabel : monthlyTotalsRowLabel}
                </th>
                {report.months.map((month, index) => (
                  <td
                    key={month.month}
                    className="border-t-2 border-outline-variant bg-surface-container px-1 py-1 text-right align-top"
                  >
                    <MonthTotal month={month} future={future[index]} />
                  </td>
                ))}
                <td className="sticky right-0 z-[1] border-l border-t-2 border-l-outline-variant border-t-outline-variant bg-surface-container-high px-1 py-1 text-right align-top">
                  <span className="block whitespace-nowrap font-metric-val text-body-sm leading-[18px] font-semibold tabular text-on-surface">
                    {formatMoney(report.knownAmount)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

/** The object 120 pixels, the twelve months sharing the rest equally, the year 88 (D-51). */
function Columns() {
  return (
    <colgroup>
      <col className="w-[7.5rem]" />
      {shortMonths.map((month) => (
        <col key={month} />
      ))}
      <col className="w-[5.5rem]" />
    </colgroup>
  )
}

/**
 * The header row, for the table and for its floating copy alike. Ordered by name, A–Z, unless the address says
 * otherwise; `aria-sort` is on the ordered column only. A month that has not begun is marked under its name.
 */
function HeaderRow({
  periods,
  future,
  sort,
  onSort,
  copy = false,
}: {
  periods: readonly string[]
  future: readonly boolean[]
  sort: ReportSort
  onSort: (sort: ReportSort, column: SortColumn) => void
  /** The floating copy: its buttons take no focus. */
  copy?: boolean
}) {
  const byName = sort === 'NameAsc' || sort === 'NameDesc'

  return (
    <tr className="text-body-sm leading-[18px] font-medium text-on-surface-variant">
      <th
        scope="col"
        aria-sort={byName ? (sort === 'NameDesc' ? 'descending' : 'ascending') : undefined}
        className="sticky left-0 z-[3] h-10 border-b border-r border-outline-variant bg-surface-container-low px-1 text-left"
      >
        <SortButton
          column="name"
          direction={byName ? (sort === 'NameDesc' ? 'descending' : 'ascending') : null}
          copy={copy}
          onClick={() => onSort(nextNameSort(sort), 'name')}
        >
          {locationColumnLabel}
        </SortButton>
      </th>

      {shortMonths.map((month, index) => (
        <th
          key={month}
          scope="col"
          data-future={future[index] ? '' : undefined}
          title={future[index] ? futureMonthNote(formatMonth(periods[index])) : undefined}
          className={`sticky top-0 z-[2] h-10 snap-start border-b border-outline-variant bg-surface-container-low px-1 text-right ${
            future[index] ? futureMonthMarkerClass : ''
          }`}
        >
          {month}
        </th>
      ))}

      <th
        scope="col"
        aria-sort={byName ? undefined : sort === 'TotalAsc' ? 'ascending' : 'descending'}
        className="sticky right-0 z-[3] h-10 border-b border-l border-outline-variant bg-surface-container-low px-0 text-right"
      >
        <SortButton
          column="total"
          direction={byName ? null : sort === 'TotalAsc' ? 'ascending' : 'descending'}
          copy={copy}
          onClick={() => onSort(nextTotalSort(sort), 'total')}
        >
          {yearTotalLabel}
        </SortButton>
      </th>
    </tr>
  )
}

/**
 * The words of a column header as the button that orders by it. ↕ while another column orders the table; ↑ ascending
 * and ↓ descending, as the product's other order control says («Artan ↑», «Azalan ↓»). The arrow is a picture: the
 * order itself is the header cell's `aria-sort`.
 */
function SortButton({
  column,
  direction,
  copy,
  onClick,
  children,
}: {
  column: SortColumn
  direction: 'ascending' | 'descending' | null
  copy: boolean
  onClick: () => void
  children: string
}) {
  const Icon = direction === null ? ChevronsUpDown : direction === 'descending' ? ArrowDown : ArrowUp

  return (
    <button
      type="button"
      data-sort-button={column}
      tabIndex={copy ? -1 : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded px-1 transition-colors hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        copy ? '' : 'scroll-mt-21'
      } ${direction === null ? '' : 'font-semibold text-on-surface'}`}
    >
      {children}
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
    </button>
  )
}

function LocationRow({
  row,
  striped,
  future,
  view,
  selectedMonth,
}: {
  row: MonthlyReportRow
  striped: boolean
  future: readonly boolean[]
  view: ReportView
  /** The month (1–12) the side panel describes, when it is one of this row's. */
  selectedMonth: number | null
}) {
  const selected = selectedMonth !== null
  // Set per cell rather than per row: the pinned columns carry their own background so they can sit above the others
  // while the table scrolls, and a background on the row would be painted underneath them.
  const band = `${selected ? 'bg-surface-container-low' : striped ? 'bg-surface' : 'bg-surface-container-lowest'} group-hover:bg-surface-container-low`

  // The id is where Back from an order returns the reader to: the row whose month they opened (24.3).
  return (
    <tr id={`row-${row.locationId}`} className="group">
      <th
        scope="row"
        className={`sticky left-0 z-[1] border-b border-r border-b-surface-container-high border-r-outline-variant px-2 py-1 text-left align-top font-normal ${band} ${
          selected ? 'shadow-[inset_3px_0_0_var(--color-primary)]' : ''
        }`}
      >
        {/* Full names, wrapped rather than cut (Task 3): a narrower column must not shorten a name. */}
        <Link
          to={`/locations/${row.locationId}`}
          title={row.locationName}
          className={`block scroll-mb-4 scroll-mt-31 break-words rounded text-body-sm leading-[18px] text-on-surface hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
            selected ? 'font-semibold' : 'font-medium'
          }`}
        >
          {row.locationName}
        </Link>
      </th>

      {row.hasAnyRequest ? (
        row.months.map((cell, index) => (
          <td key={cell.month} className={`border-b border-surface-container-high p-0 text-right align-top ${band}`}>
            <ReportCell
              cell={cell}
              locationName={row.locationName}
              future={future[index]}
              view={view}
              selected={selectedMonth === cell.month}
            />
          </td>
        ))
      ) : (
        // Twelve dashes would say "no order this month" twelve times. What is true is one fact about the object,
        // said in the dashboard's own words.
        <td
          colSpan={12}
          className={`border-b border-surface-container-high px-2 py-1 text-left align-top text-body-sm leading-[18px] text-on-surface-variant ${band}`}
        >
          {portfolioGroupLabels.NoHistory}
        </td>
      )}

      {/* The year is the figure a manager reads across to: its own quiet band, and the strongest number in the row. */}
      <td className="sticky right-0 z-[1] border-b border-l border-b-surface-container-high border-l-outline-variant bg-surface-container-low px-1 py-1 text-right align-top group-hover:bg-surface-container">
        <span className="block whitespace-nowrap font-metric-val text-body-sm leading-[18px] font-semibold tabular text-on-surface">
          {formatMoney(row.knownAmount)}
        </span>
      </td>
    </tr>
  )
}
