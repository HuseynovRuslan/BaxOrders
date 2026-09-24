import { Link } from 'react-router'
import type { MonthlyReportCell, MonthlyReportRow } from '../../api/reports'
import {
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatMonth,
  formatPercent,
  signedToneClass,
  unknownValue,
} from '../analytics/format'
import { workflowStatusClass, workflowStatusLabels } from '../workflow/labels'
import { missingPriceCount } from '../../pricing/labels'

/** The year's own column, named so it cannot be mistaken for a thirteenth month. */
export const yearTotalLabel = 'İl cəmi'

/** January first, in the short form a twelve-column header has room for. */
export const shortMonths = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn',
  'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek',
]

interface MonthlyReportTableProps {
  rows: MonthlyReportRow[]
}

/**
 * A year of ordering as a panorama: January to December at once, with no sideways scrolling.
 *
 * That constraint decides the whole design. The table is <b>fixed-layout and exactly as wide as its
 * container</b>, so a long value can never push a column out and there is nothing to scroll to. The width it
 * has is then spent where it buys the most: twelve equal month columns of roughly ninety pixels, enough for a
 * five-figure sum and its direction, and nothing else.
 *
 * Everything a cell cannot afford to say in that space it says in its own accessible name instead — the
 * difference in manat, the unpriced lines, the approval state. Nothing is dropped; it is moved to where a
 * reader who wants it can reach it, so the ones scanning the grid are not reading sentences twelve times a row.
 */
export function MonthlyReportTable({ rows }: MonthlyReportTableProps) {
  return (
    // The report reclaims the page gutters that every other screen keeps. A panorama is the one thing here
    // that genuinely needs the width, and sixty-four pixels is most of a month column.
    <div className="-mx-4 hidden rounded-lg border border-slate-200 bg-white sm:-mx-6 xl:-mx-8 xl:block">
      <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
        <caption className="sr-only">Obyektlər üzrə aylıq sifariş məbləğləri</caption>
        <colgroup>
          {/* Wide enough for an object name on one line, narrow enough to leave the year its twelve columns. */}
          <col className="w-[180px]" />
          {shortMonths.map((month) => (
            <col key={month} />
          ))}
          <col className="w-[96px]" />
        </colgroup>

        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-500"
            >
              Obyekt
            </th>
            {shortMonths.map((month) => (
              <th
                key={month}
                scope="col"
                className="border-b border-slate-200 bg-slate-50 px-1 py-2 text-right font-medium text-slate-500"
              >
                {month}
              </th>
            ))}
            <th
              scope="col"
              className="sticky right-0 z-20 border-b border-l border-slate-200 bg-slate-100 px-2 py-2 text-right font-medium text-slate-600"
            >
              {yearTotalLabel}
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => {
            // Zebra and hover are set per cell rather than per row: the first and last columns carry their own
            // background so they can sit above the others when the table is scrolled, and a background on the
            // row would be painted underneath them.
            const stripe = index % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
            const band = `${stripe} group-hover:bg-sky-50/70`

            return (
              <tr key={row.locationId} className="group">
                <th
                  scope="row"
                  className={`sticky left-0 z-10 border-b border-slate-100 px-3 py-1.5 text-left font-normal ${band}`}
                >
                  <Link
                    to={`/locations/${row.locationId}`}
                    className="block truncate font-medium text-slate-900 hover:underline"
                    title={`${row.locationName} · ${row.locationCode}`}
                  >
                    {row.locationName}
                  </Link>
                </th>

                {row.months.map((cell) => (
                  <td
                    key={cell.month}
                    className={`border-b border-slate-100 px-0.5 py-0.5 text-right align-middle ${band}`}
                  >
                    <Cell cell={cell} locationName={row.locationName} />
                  </td>
                ))}

                {/* The year is the figure a manager reads across to, so it is given its own quiet band and
                    the strongest number in the row — without a second border or a colour of its own. */}
                <td
                  className={`sticky right-0 z-10 border-b border-l border-slate-200 px-2 py-1.5 text-right ${
                    index % 2 === 1 ? 'bg-slate-100/80' : 'bg-slate-50'
                  } group-hover:bg-sky-100/70`}
                >
                  <span className="block whitespace-nowrap font-semibold text-slate-900">
                    {formatMoney(row.knownAmount)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * One month, in about ninety pixels.
 *
 * The amount is the only thing given full weight; under it goes at most one short secondary mark — the
 * percentage it moved, or an attention count when a price is missing. The whole of the cell's meaning, in
 * words, is in its accessible name, so nothing has been traded away for the width.
 */
function Cell({ cell, locationName }: { cell: MonthlyReportCell; locationName: string }) {
  const month = formatMonth(cell.period)

  if (cell.orderRequestId === null) {
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

  return (
    <Link
      to={`/orders/${cell.orderRequestId}`}
      title={describe(cell, month)}
      aria-label={`${locationName} · ${describe(cell, month)}`}
      className="block rounded px-1 py-1 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
    >
      <span className="block whitespace-nowrap font-medium text-slate-900">{formatMoney(cell.knownAmount)}</span>
      <Secondary cell={cell} />
    </Link>
  )
}

/**
 * The one mark under the amount. An unpriced line outranks a percentage: a figure that is not the whole story
 * has to say so, and the percentage is still a keystroke away in the cell's own description.
 */
function Secondary({ cell }: { cell: MonthlyReportCell }) {
  const status = cell.status && cell.status !== 'Draft' ? cell.status : null

  if (cell.amountIsComplete && cell.deltaPercent === null && cell.deltaAmount === null && status === null) {
    return null
  }

  return (
    <span className="mt-px flex items-center justify-end gap-1 whitespace-nowrap text-[11px] leading-none">
      {/* A dot, not a badge: twelve badges to a row would drown the money they sit under. The undecided state
          is every row's normal and is left unmarked; anything else is worth a glance. */}
      {status && (
        <span
          className={`inline-block size-1.5 shrink-0 rounded-full ring-1 ring-inset ${workflowStatusClass[status]}`}
          aria-hidden="true"
        />
      )}

      {/* Direction, not judgement — and amber only where a price somebody owes is actually absent. Material
          the company supplies itself never reaches this mark: the backend counts it apart. */}
      {cell.amountIsComplete ? (
        <span className={signedToneClass(cell.deltaPercent ?? cell.deltaAmount)}>{compactDelta(cell)}</span>
      ) : (
        <span className="font-medium text-amber-700">⚠ {formatCount(cell.missingPriceItemCount)}</span>
      )}
    </span>
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
    parts.push(`keçən aya görə ${formatMoneyDelta(cell.deltaAmount)} ${formatPercent(cell.deltaPercent)}`.trim())
  }

  if (!cell.amountIsComplete) {
    parts.push(missingPriceCount(cell.missingPriceItemCount))
  }

  if (cell.status) {
    parts.push(workflowStatusLabels[cell.status] ?? cell.status)
  }

  return parts.join(' · ')
}

/**
 * The same year on a narrow screen. Twelve columns do not survive below about a laptop's width, so the month
 * is chosen once and the locations are read down it — a different shape for the same question, rather than the
 * panorama squeezed until its numbers collide.
 */
export function MonthlyReportMonthList({
  rows,
  month,
}: {
  rows: MonthlyReportRow[]
  month: number
}) {
  const ordered = rows.filter((row) => row.months[month - 1].orderRequestId !== null)
  const quiet = rows.filter((row) => row.months[month - 1].orderRequestId === null)

  return (
    <div className="xl:hidden">
      <ul className="space-y-2">
        {ordered.map((row) => {
          const cell = row.months[month - 1]
          return (
            <li key={row.locationId} className="rounded-lg border border-slate-200 bg-white">
              <Link
                to={`/orders/${cell.orderRequestId}`}
                className="flex items-start justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{row.locationName}</p>
                  <p className="text-xs text-slate-400">{row.locationCode}</p>
                  {cell.status && (
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${workflowStatusClass[cell.status]}`}
                    >
                      {workflowStatusLabels[cell.status]}
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="whitespace-nowrap font-semibold text-slate-900">{formatMoney(cell.knownAmount)}</p>
                  {/* There is room here, so the narrow layout says it in words. */}
                  {cell.amountIsComplete ? (
                    cell.deltaAmount !== null && (
                      <p className="whitespace-nowrap text-xs text-slate-400">{formatMoneyDelta(cell.deltaAmount)}</p>
                    )
                  ) : (
                    <p className="whitespace-nowrap text-xs text-amber-800">
                      {missingPriceCount(cell.missingPriceItemCount)}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      {quiet.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-600">
            {formatCount(quiet.length)} obyektin bu ay üçün sifarişi yoxdur
          </p>
          <p className="mt-1 text-xs text-slate-500">{quiet.map((row) => row.locationName).join(', ')}</p>
        </div>
      )}
    </div>
  )
}
