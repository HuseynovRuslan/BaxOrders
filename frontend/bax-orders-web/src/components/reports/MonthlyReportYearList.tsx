import { Link } from 'react-router'
import type { MonthlyReport, MonthlyReportRow } from '../../api/reports'
import type { ReportView } from '../../analytics/reportView'
import { portfolioGroupLabels } from '../../coverage/labels'
import {
  futureMonthNote,
  monthlyTotalsAllLocationsLabel,
  monthlyTotalsRowLabel,
  reportCardsLegendLabel,
} from '../../terminology/terms'
import { costDirectionBarClass, formatMoney, formatMonth } from '../analytics/format'
import { Legend } from './Legend'
import { yearTotalLabel } from './labels'
import { MonthTotal } from './MonthTotal'
import { ReportCell } from './ReportCell'
import { futureMonthClass, futureMonthMarkerClass, futureMonths, reportPeriods, shortMonths } from './reportGrid'

/**
 * The same year below the table's width: a card for each object, with the whole of its year in it (Task 12; UI V2
 * 03 §4.5–§4.6, 04 §5.7).
 *
 * Each card shows the year twice: as a strip of twelve bars, for its shape at a glance, and as a grid of months for its
 * figures — three to a row on a phone, six from 640 pixels, so a tablet does not stack a card twice as tall as it needs.
 * A month in the grid is the table's own cell (`ReportCell`), in the same view, so it says exactly what the table says
 * and opens the same order; every month and name is a finger's height (44 px). The cards follow the table's order. The
 * company's months close the list, as the totals row closes the table, and the legend opens it, as it opens the table.
 */
export function MonthlyReportYearList({
  report,
  rows,
  view,
  searchActive,
  today = new Date(),
}: {
  report: MonthlyReport
  /** The report's rows, in the order the reader asked for. */
  rows: readonly MonthlyReportRow[]
  view: ReportView
  /** Whether this answer was asked with a search: then the totals say they are every object's. */
  searchActive: boolean
  /** The reader's today, which decides which months have not begun yet. */
  today?: Date
}) {
  const periods = reportPeriods(report.year)
  const future = futureMonths(report.year, today)
  const totalsLabel = searchActive ? monthlyTotalsAllLocationsLabel : monthlyTotalsRowLabel

  return (
    <div className="lg:hidden">
      <Legend label={reportCardsLegendLabel} view={view} />

      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <LocationCard key={row.locationId} row={row} periods={periods} future={future} view={view} />
        ))}
      </ul>

      {/* The company's month under the objects' (owner decision 8.1): the amount and nothing about how it moved. */}
      <section aria-label={totalsLabel} className="mt-3 rounded-lg border border-outline-variant bg-surface-container p-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-body-md font-semibold text-on-surface">{totalsLabel}</h2>
          <YearTotal amount={report.knownAmount} />
        </div>

        <ul className="mt-2 grid grid-cols-3 gap-1 sm:grid-cols-6">
          {report.months.map((month, index) => (
            <li key={month.month} className="min-w-0">
              <MonthName index={index} period={periods[index]} future={future[index]} />
              <div className="px-1 py-1 text-right">
                <MonthTotal month={month} future={future[index]} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function LocationCard({
  row,
  periods,
  future,
  view,
}: {
  row: MonthlyReportRow
  periods: readonly string[]
  future: readonly boolean[]
  view: ReportView
}) {
  // Its own id, for Back on a phone, where the table and its row ids are in the page but hidden.
  return (
    <li id={`row-${row.locationId}-phone`} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
      <div className="flex items-start justify-between gap-3">
        {/* The full name, wrapped rather than cut (Task 3), opening the object as the table's name does. */}
        <Link
          to={`/locations/${row.locationId}`}
          className="flex min-h-11 min-w-0 items-center break-words rounded text-body-md font-medium text-on-surface hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {row.locationName}
        </Link>
        <YearTotal amount={row.knownAmount} />
      </div>

      {row.hasAnyRequest ? (
        <>
          <YearStrip row={row} future={future} />
          <ul className="mt-2 grid grid-cols-3 gap-1 sm:grid-cols-6">
            {row.months.map((cell, index) => (
              <li key={cell.month} className="min-w-0">
                <MonthName index={index} period={periods[index]} future={future[index]} />
                <div className="text-right">
                  <ReportCell cell={cell} locationName={row.locationName} future={future[index]} view={view} />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        // As in the table: one fact about the object, in the dashboard's words, rather than twelve empty months.
        <p className="mt-2 text-body-md text-on-surface-variant">{portfolioGroupLabels.NoHistory}</p>
      )}
    </li>
  )
}

function YearTotal({ amount }: { amount: number | null }) {
  return (
    <p className="shrink-0 text-right">
      <span className="block text-body-sm leading-[18px] text-on-surface-variant">{yearTotalLabel}</span>
      <span className="block whitespace-nowrap font-metric-val text-body-md font-semibold tabular text-on-surface">
        {formatMoney(amount)}
      </span>
    </p>
  )
}

/** A month's short name above its figure; one that has not begun is marked under its name, as the table's header is. */
function MonthName({ index, period, future }: { index: number; period: string; future: boolean }) {
  return (
    <span
      data-future={future ? '' : undefined}
      title={future ? futureMonthNote(formatMonth(period)) : undefined}
      className={`relative block px-1 pb-1.5 text-body-sm leading-[18px] font-medium text-on-surface-variant ${
        future ? futureMonthMarkerClass : ''
      }`}
    >
      {shortMonths[index]}
    </span>
  )
}

/**
 * The shape of the year before its figures: a bar a month, as tall as its amount against the object's largest
 * month. Neutral, because an amount is a sum and not a direction; only an unusual month takes the colour of the way
 * its cost moved (9.1), as its cell is tinted. The grid under it says every figure, so a screen reader skips this.
 */
function YearStrip({ row, future }: { row: MonthlyReportRow; future: readonly boolean[] }) {
  const amounts = row.months.map((cell) => (cell.orderRequestId === null ? 0 : Math.max(0, cell.knownAmount ?? 0)))
  const largest = Math.max(...amounts)

  return (
    <div aria-hidden="true" className="mt-2 grid h-10 grid-cols-12 items-end gap-0.5 border-b border-outline-variant">
      {row.months.map((cell, index) => {
        if (cell.orderRequestId === null) {
          return <span key={cell.month} className={future[index] ? `h-full rounded-t-sm ${futureMonthClass}` : 'h-full'} />
        }

        const amount = amounts[index]
        return (
          <span
            key={cell.month}
            className={`rounded-t-sm ${costDirectionBarClass(cell.isUnusual ? cell.recentAveragePercent : 0)}`}
            // A display ratio only; no figure is derived from it or printed.
            style={{ height: `${largest > 0 ? (amount / largest) * 100 : 0}%`, minHeight: amount > 0 ? 2 : undefined }}
          />
        )
      })}
    </div>
  )
}
