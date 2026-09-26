import { Link } from 'react-router'
import type { OrderRequestStatus } from '../../api/orders'
import type { MonthlyReport, MonthlyReportCell, MonthlyReportMonth, MonthlyReportRow } from '../../api/reports'
import {
  costDirectionBarClass,
  costDirectionTintClass,
  costDirectionToneClass,
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatMonth,
  formatPercent,
  isFutureMonth,
  unknownValue,
} from '../analytics/format'
import { workflowStatusClass, workflowStatusLabels, workflowStatusText } from '../workflow/labels'
import { missingPriceCount, missingPriceShortLabel } from '../../pricing/labels'
import { portfolioGroupLabels } from '../../coverage/labels'
import {
  costDecreasedLabel,
  costIncreasedLabel,
  futureMonthLabel,
  futureMonthNote,
  monthlyTotalsAllLocationsLabel,
  monthlyTotalsRowLabel,
  previousMonthPercentLabel,
  reportCardsLegendLabel,
  reportLegendLabel,
  unusualMonthHint,
  unusualMonthLabel,
  unusualMonthNote,
} from '../../terminology/terms'

/** The year's own column, named so it cannot be mistaken for a thirteenth month. */
export const yearTotalLabel = 'İl cəmi'

/** January first, in the short form a twelve-column header has room for. */
export const shortMonths = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn',
  'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek',
]

/**
 * A month that has not begun: a light hatch, so the whole of it reads as "not yet" rather than as a month
 * somebody skipped. The legend shows the same swatch.
 */
const futureMonthClass =
  'bg-slate-50 bg-[image:repeating-linear-gradient(135deg,transparent_0_5px,var(--color-slate-200)_5px_6px)]'

/** The report's twelve months, January first, in the `yyyy-MM` form the cells' periods start with. */
function reportPeriods(year: number): string[] {
  return shortMonths.map((_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
}

/** The states a cell marks with a dot. The undecided one is every row's normal and is left unmarked. */
const markedStatuses: OrderRequestStatus[] = ['PendingApproval', 'Approved', 'ReturnedForCorrection']

interface MonthlyReportTableProps {
  report: MonthlyReport
  /** The reader's today, which decides which months have not begun yet. */
  today?: Date
}

/**
 * A year of ordering as a panorama: January to December at once, and under them the company's month.
 *
 * The width decides the design. On a laptop of 1366 or 1440 pixels the table fits the page — the months share
 * whatever is left after the object and year columns, never less than 64 pixels each, which is room for a
 * five-figure sum with a gap before its neighbour — and the header row stays at the top while the locations
 * scroll under it. From 1024 pixels up to where the twelve months fit, the table keeps its twelve columns and
 * scrolls inside its own box, the object and the year pinned either side, rather than turning into a list or
 * squeezing its numbers together. The box is never wider than the page: the cards above it set the edge.
 *
 * Everything a cell cannot afford to say in that space it says in its own accessible name instead — the
 * difference in manat, the direction of the cost, the unpriced lines, the approval state, why a month is
 * marked. The legend above says once what the marks are, so nobody needs a mouse to learn them.
 */
export function MonthlyReportTable({ report, today = new Date() }: MonthlyReportTableProps) {
  const periods = reportPeriods(report.year)
  const future = periods.map((period) => isFutureMonth(period, today))
  const searchActive = report.filteredLocationCount !== report.locationCount

  return (
    <div className="hidden lg:block">
      <Legend />

      {/* A scroll container captures position: sticky — inside one, the header sticks to the box rather than the
          page, comes to rest in the middle of the table and lets rows pass over it. So the box may only be one
          where scrolling is genuinely needed, and not one pixel wider.

          It is needed in exactly one narrow band. The layout gives this table min(window, max-w-7xl) less lg:px-8,
          so 1216 pixels at most and 960 at 1024, the narrowest width the twelve-month table is shown at all. The
          table's own minimum is 1000 — 144 for the name, 64 for each of the twelve months, 88 for the year — which
          is the owner's "at least 64 pixels a month". The two only disagree below a 1064-pixel window; from there
          up, the table fits and nothing scrolls.

          The rule used to read "scroll below 1340px", which made a scroll container across the whole of 1024–1339
          whether or not anything overflowed — overflow-x: auto makes one even with nothing to scroll — and that is
          what broke the header on an ordinary 1280-pixel laptop. Now the container exists only under 1064, where a
          month would otherwise fall below its 64 pixels. There, and only there, the sticky header is given up so
          the months keep their width. */}
      <div className="rounded-lg border border-slate-200 bg-white max-[1063px]:overflow-x-auto">
        <table className="w-full min-w-[1000px] table-fixed border-separate border-spacing-0 text-[11px] min-[1440px]:text-xs">
          <caption className="sr-only">Obyektlər üzrə aylıq sifariş məbləğləri</caption>
          <colgroup>
            {/* Room for an object name on two lines; the twelve months share the rest equally. */}
            <col className="w-[9rem]" />
            {shortMonths.map((month) => (
              <col key={month} />
            ))}
            <col className="w-[5.5rem]" />
          </colgroup>

          <thead>
            <tr>
              <th
                scope="col"
                className="sticky top-16 left-0 z-[3] border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-500"
              >
                Obyekt
              </th>
              {shortMonths.map((month, index) => (
                <th
                  key={month}
                  scope="col"
                  title={future[index] ? futureMonthNote(formatMonth(periods[index])) : undefined}
                  className={`sticky top-16 z-[2] border-b border-slate-200 bg-slate-50 px-1 py-2 text-right font-medium ${
                    future[index] ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {month}
                </th>
              ))}
              <th
                scope="col"
                className="sticky top-16 right-0 z-[3] border-b border-l border-slate-200 bg-slate-100 px-2 py-2 text-right font-medium text-slate-600"
              >
                {yearTotalLabel}
              </th>
            </tr>
          </thead>

          <tbody>
            {report.rows.map((row, index) => (
              <LocationRow key={row.locationId} row={row} striped={index % 2 === 1} future={future} />
            ))}
          </tbody>

          <tfoot>
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-[1] border-t-2 border-slate-300 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-900"
              >
                {searchActive ? monthlyTotalsAllLocationsLabel : monthlyTotalsRowLabel}
              </th>
              {report.months.map((month, index) => (
                <td
                  key={month.month}
                  className="border-t-2 border-slate-300 bg-slate-100 px-1 py-2 text-right align-top font-semibold"
                >
                  <MonthTotal month={month} future={future[index]} />
                </td>
              ))}
              <td className="sticky right-0 z-[1] border-t-2 border-l border-slate-300 bg-slate-200 px-2 py-2 text-right align-top">
                <span className="block whitespace-nowrap font-semibold tabular-nums text-slate-900">
                  {formatMoney(report.knownAmount)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function LocationRow({ row, striped, future }: { row: MonthlyReportRow; striped: boolean; future: boolean[] }) {
  // Zebra and hover are set per cell rather than per row: the first and last columns carry their own background
  // so they can sit above the others when the table is scrolled, and a background on the row would be painted
  // underneath them.
  const band = `${striped ? 'bg-slate-50' : 'bg-white'} group-hover:bg-sky-50`

  return (
    <tr className="group">
      <th
        scope="row"
        className={`sticky left-0 z-[1] border-b border-slate-100 px-3 py-1.5 text-left font-normal ${band}`}
      >
        {/* Full names, wrapped rather than cut (Task 3): a narrower column must not shorten a name. */}
        <Link
          to={`/locations/${row.locationId}`}
          className="block break-words font-medium leading-snug text-slate-900 hover:underline"
          title={row.locationName}
        >
          {row.locationName}
        </Link>
      </th>

      {row.hasAnyRequest ? (
        row.months.map((cell, index) => (
          <td key={cell.month} className={`border-b border-slate-100 px-0 py-0.5 text-right align-middle ${band}`}>
            <Cell cell={cell} locationName={row.locationName} future={future[index]} />
          </td>
        ))
      ) : (
        // Twelve dashes would say "no order this month" twelve times. What is true is one fact about the object,
        // said in the dashboard's own words.
        <td colSpan={12} className={`border-b border-slate-100 px-3 py-1.5 text-left text-slate-500 ${band}`}>
          {portfolioGroupLabels.NoHistory}
        </td>
      )}

      {/* The year is the figure a manager reads across to, so it is given its own quiet band and the strongest
          number in the row — without a second border or a colour of its own. */}
      <td
        className={`sticky right-0 z-[1] border-b border-l border-slate-200 px-2 py-1.5 text-right ${
          striped ? 'bg-slate-100' : 'bg-slate-50'
        } group-hover:bg-sky-100`}
      >
        <span className="block whitespace-nowrap font-semibold tabular-nums text-slate-900">
          {formatMoney(row.knownAmount)}
        </span>
      </td>
    </tr>
  )
}

/**
 * One month, in as little as 64 pixels.
 *
 * The amount is the only thing given full weight; under it go the short marks — the change against the month
 * before, the unpriced lines, the approval state — wrapping onto a second line inside the cell when they do not
 * fit on one. An unusual month is tinted by the direction its cost moved, so it is seen before it is read.
 */
function Cell({ cell, locationName, future }: { cell: MonthlyReportCell; locationName: string; future: boolean }) {
  const month = formatMonth(cell.period)

  if (cell.orderRequestId === null) {
    if (future) {
      // Not "sifariş yoxdur": nothing could have been ordered for a month that has not begun.
      return (
        <span
          className={`block min-h-7 rounded ${futureMonthClass}`}
          title={futureMonthNote(month)}
          aria-label={`${locationName} · ${futureMonthNote(month)}`}
        />
      )
    }

    return (
      <span
        className="block px-1 py-1 text-slate-300"
        title={`${month}: sifariş yoxdur`}
        aria-label={`${locationName} · ${month} · sifariş yoxdur`}
      >
        {unknownValue}
      </span>
    )
  }

  const tint = cell.isUnusual ? costDirectionTintClass(cell.recentAveragePercent) : ''

  return (
    <Link
      to={`/orders/${cell.orderRequestId}`}
      title={describe(cell, month)}
      aria-label={`${locationName} · ${describe(cell, month)}`}
      className={`block rounded px-1 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 ${
        tint || 'hover:bg-slate-100'
      }`}
    >
      <span
        className={`block whitespace-nowrap tabular-nums text-slate-900 ${cell.isUnusual ? 'font-semibold' : 'font-medium'}`}
      >
        {formatMoney(cell.knownAmount)}
      </span>
      <Secondary cell={cell} />
    </Link>
  )
}

/**
 * The marks under the amount. The change and an unpriced line are shown together: a partial figure has to say so,
 * and it still moved — the reader needs both to judge it.
 */
function Secondary({ cell }: { cell: MonthlyReportCell }) {
  const status = cell.status && cell.status !== 'Draft' ? cell.status : null
  const change = compactDelta(cell)

  if (cell.amountIsComplete && change === '' && status === null) {
    return null
  }

  return (
    <span className="mt-0.5 flex flex-wrap items-center justify-end gap-x-1 gap-y-0.5 text-[11px] leading-none">
      {/* A dot, not a badge: twelve badges to a row would drown the money they sit under. */}
      {status && <StatusDot status={status} />}

      {/* Owner decision 9.1: the direction of the cost — up red, down green — never a verdict. */}
      {change !== '' && (
        <span className={`whitespace-nowrap tabular-nums ${costDirectionToneClass(cell.deltaPercent ?? cell.deltaAmount)}`}>
          {change}
        </span>
      )}

      {/* Amber only where a price somebody owes is actually absent. Material the company supplies itself never
          reaches this mark: the backend counts it apart. */}
      {!cell.amountIsComplete && (
        <span className="whitespace-nowrap font-medium text-amber-700">⚠ {formatCount(cell.missingPriceItemCount)}</span>
      )}
    </span>
  )
}

function StatusDot({ status }: { status: OrderRequestStatus }) {
  return (
    <span
      className={`inline-block size-1.5 shrink-0 rounded-full ring-1 ring-inset ${workflowStatusClass[status]}`}
      aria-hidden="true"
    />
  )
}

/** A percentage where one exists — it is far shorter than the money — and the money itself where one does not. */
function compactDelta(cell: MonthlyReportCell): string {
  if (cell.deltaPercent !== null) {
    return formatPercent(cell.deltaPercent)
  }

  return cell.deltaAmount === null ? '' : formatMoneyDelta(cell.deltaAmount)
}

/** Everything the cell knows, as a sentence, for the tooltip and the accessible name. */
function describe(cell: MonthlyReportCell, month: string): string {
  const parts = [month, formatMoney(cell.knownAmount)]

  if (cell.deltaAmount !== null) {
    const direction = cell.deltaAmount > 0 ? costIncreasedLabel : cell.deltaAmount < 0 ? costDecreasedLabel : null
    const change = `keçən aya görə ${formatMoneyDelta(cell.deltaAmount)} ${formatPercent(cell.deltaPercent)}`.trim()
    parts.push(direction === null ? change : `${change}, ${direction}`)
  }

  if (cell.isUnusual) {
    parts.push(unusualMonthNote(formatMoney(cell.recentAverageKnownAmount), formatPercent(cell.recentAveragePercent)))
  }

  if (!cell.amountIsComplete) {
    parts.push(missingPriceCount(cell.missingPriceItemCount))
  }

  // The status in words, as the badge says it elsewhere: a historical order is approved and says so, then says
  // how (22.2). The dot beside the amount stays the Approved dot — a fourth dot would read as a fourth status.
  if (cell.status) {
    parts.push(workflowStatusText(cell.status, cell.isHistoricalImport))
  }

  return parts.join(' · ')
}

/**
 * The company's month under its column (owner decision 8.1): the amount and nothing about how it moved — no
 * percentage, no change, no direction colour. A total with an unpriced line says so, as a cell does, so a partial
 * figure is never presented as the whole month.
 */
function MonthTotal({ month, future }: { month: MonthlyReportMonth; future: boolean }) {
  const name = formatMonth(month.period)

  if (month.locationsWithRequest === 0) {
    return future ? (
      <span className={`block min-h-7 rounded ${futureMonthClass}`} title={futureMonthNote(name)} aria-label={futureMonthNote(name)} />
    ) : (
      <span className="block font-normal text-slate-300" title={`${name}: sifariş yoxdur`}>
        {unknownValue}
      </span>
    )
  }

  return (
    <>
      <span className="block whitespace-nowrap tabular-nums text-slate-900">{formatMoney(month.knownAmount)}</span>
      {!month.amountIsComplete && (
        <span
          className="mt-0.5 block whitespace-nowrap text-[11px] font-medium text-amber-700"
          title={missingPriceCount(month.missingPriceItemCount)}
        >
          <span aria-hidden="true">⚠ {formatCount(month.missingPriceItemCount)}</span>
          <span className="sr-only">{missingPriceCount(month.missingPriceItemCount)}</span>
        </span>
      )}
    </>
  )
}

/**
 * What the marks in the grid mean, on the screen rather than only on hover: the status dots, the unpriced lines,
 * the percentage and its two colours, the unusual month and the month that has not begun.
 */
function Legend({ label = reportLegendLabel }: { label?: string }) {
  return (
    <ul
      aria-label={label}
      className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600"
    >
      {markedStatuses.map((status) => (
        <li key={status} className="inline-flex items-center gap-1.5">
          <StatusDot status={status} />
          {workflowStatusLabels[status]}
        </li>
      ))}

      <li className="inline-flex items-center gap-1.5">
        <span className="font-medium text-amber-700">⚠ N</span>
        {missingPriceShortLabel}
      </li>

      <li className="inline-flex items-center gap-1.5">
        {previousMonthPercentLabel}:
        <span className={costDirectionToneClass(1)}>{costIncreasedLabel}</span>
        <span aria-hidden="true">·</span>
        <span className={costDirectionToneClass(-1)}>{costDecreasedLabel}</span>
      </li>

      <li className="inline-flex items-center gap-1.5">
        <span className={`inline-block h-3 w-4 rounded-sm ${costDirectionTintClass(1)}`} aria-hidden="true" />
        <span className={`inline-block h-3 w-4 rounded-sm ${costDirectionTintClass(-1)}`} aria-hidden="true" />
        <span>
          <span className="font-medium text-slate-700">{unusualMonthLabel}</span> — {unusualMonthHint}
        </span>
      </li>

      <li className="inline-flex items-center gap-1.5">
        <span className={`inline-block h-3 w-4 rounded-sm ring-1 ring-inset ring-slate-200 ${futureMonthClass}`} aria-hidden="true" />
        {futureMonthLabel}
      </li>
    </ul>
  )
}

/**
 * The same year on a phone: a card for each object, with the whole of its year in it.
 *
 * Twelve columns do not survive below a laptop's width, and reading one chosen month at a time hid the very thing
 * the report is for — how an object's year went. So each card shows the year twice: as a strip of twelve bars, for
 * its shape at a glance, and as a grid of three months to a row, a quarter each, for its figures. A month in the
 * grid says exactly what its cell in the table says, by the same code, and opens the same order. The company's
 * months close the list, as the totals row closes the table, and the legend opens it, as it opens the table.
 */
export function MonthlyReportYearList({ report, today = new Date() }: MonthlyReportTableProps) {
  const future = reportPeriods(report.year).map((period) => isFutureMonth(period, today))
  const searchActive = report.filteredLocationCount !== report.locationCount
  const totalsLabel = searchActive ? monthlyTotalsAllLocationsLabel : monthlyTotalsRowLabel

  return (
    <div className="lg:hidden">
      <Legend label={reportCardsLegendLabel} />

      <ul className="space-y-2">
        {report.rows.map((row) => (
          <LocationCard key={row.locationId} row={row} future={future} />
        ))}
      </ul>

      {/* The company's month under the objects' (owner decision 8.1): the amount and nothing about how it moved. */}
      <section aria-label={totalsLabel} className="mt-3 rounded-lg border border-slate-300 bg-slate-100 p-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold text-slate-900">{totalsLabel}</h2>
          <YearTotal amount={report.knownAmount} />
        </div>

        <ul className="mt-2 grid grid-cols-3 gap-1 text-xs">
          {report.months.map((month, index) => (
            <li key={month.month} className="min-w-0">
              <MonthName index={index} future={future[index]} />
              <div className="px-1 py-1 text-right font-semibold">
                <MonthTotal month={month} future={future[index]} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function LocationCard({ row, future }: { row: MonthlyReportRow; future: boolean[] }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        {/* The full name, wrapped rather than cut (Task 3), opening the object as the table's name does. */}
        <Link
          to={`/locations/${row.locationId}`}
          className="min-w-0 break-words font-medium leading-snug text-slate-900 hover:underline"
        >
          {row.locationName}
        </Link>
        <YearTotal amount={row.knownAmount} />
      </div>

      {row.hasAnyRequest ? (
        <>
          <YearStrip row={row} future={future} />
          <ul className="mt-2 grid grid-cols-3 gap-1 text-xs">
            {row.months.map((cell, index) => (
              <li key={cell.month} className="min-w-0">
                <MonthName index={index} future={future[index]} />
                <div className="text-right">
                  <Cell cell={cell} locationName={row.locationName} future={future[index]} />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        // As in the table: one fact about the object, in the dashboard's words, rather than twelve empty months.
        <p className="mt-2 text-sm text-slate-500">{portfolioGroupLabels.NoHistory}</p>
      )}
    </li>
  )
}

function YearTotal({ amount }: { amount: number | null }) {
  return (
    <p className="shrink-0 text-right">
      <span className="block text-[11px] text-slate-500">{yearTotalLabel}</span>
      <span className="block whitespace-nowrap font-semibold tabular-nums text-slate-900">{formatMoney(amount)}</span>
    </p>
  )
}

/** A month's short name above its figure, quietened for a month that has not begun, as the table's header is. */
function MonthName({ index, future }: { index: number; future: boolean }) {
  return (
    <span className={`block px-1 text-[11px] font-medium ${future ? 'text-slate-400' : 'text-slate-500'}`}>
      {shortMonths[index]}
    </span>
  )
}

/**
 * The shape of the year before its figures: a bar a month, as tall as its amount against the object's largest
 * month. Grey, because an amount is a sum and not a direction; only an unusual month takes the colour of the way
 * its cost moved (9.1), as its cell is tinted. The grid under it says every figure, so a screen reader skips this.
 */
function YearStrip({ row, future }: { row: MonthlyReportRow; future: boolean[] }) {
  const amounts = row.months.map((cell) => (cell.orderRequestId === null ? 0 : Math.max(0, cell.knownAmount ?? 0)))
  const largest = Math.max(...amounts)

  return (
    <div aria-hidden="true" className="mt-3 grid h-10 grid-cols-12 items-end gap-0.5 border-b border-slate-200">
      {row.months.map((cell, index) => {
        if (cell.orderRequestId === null) {
          return <span key={cell.month} className={future[index] ? `h-full rounded-t-sm ${futureMonthClass}` : 'h-full'} />
        }

        const amount = amounts[index]
        return (
          <span
            key={cell.month}
            className={`rounded-t-sm ${cell.isUnusual ? costDirectionBarClass(cell.recentAveragePercent) : 'bg-slate-300'}`}
            // A display ratio only; no figure is derived from it or printed.
            style={{ height: `${largest > 0 ? (amount / largest) * 100 : 0}%`, minHeight: amount > 0 ? 2 : undefined }}
          />
        )
      })}
    </div>
  )
}
