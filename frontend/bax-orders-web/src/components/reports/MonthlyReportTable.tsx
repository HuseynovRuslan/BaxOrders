import { Link } from 'react-router'
import type { MonthlyReportCell, MonthlyReportRow } from '../../api/reports'
import { formatCount, formatMoney, formatMoneyDelta, unknownValue } from '../analytics/format'
import { workflowStatusClass, workflowStatusLabels } from '../workflow/labels'

/** January first, in the short form a twelve-column header has room for. */
export const shortMonths = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn',
  'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek',
]

interface MonthlyReportTableProps {
  rows: MonthlyReportRow[]
}

/**
 * A year of ordering as a report, not as a spreadsheet: the location stays put while the months scroll, the
 * money is the only thing set in a heavy weight, and a month nobody ordered in is a quiet dash rather than a
 * zero. The cell is the link — clicking a month opens the order it stands for.
 */
export function MonthlyReportTable({ rows }: MonthlyReportTableProps) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">Obyektlər üzrə aylıq sifariş məbləğləri</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-xs font-medium text-slate-500"
            >
              Obyekt
            </th>
            {shortMonths.map((month) => (
              <th
                key={month}
                scope="col"
                className="border-b border-slate-200 bg-slate-50 px-2 py-2.5 text-right text-xs font-medium text-slate-500"
              >
                {month}
              </th>
            ))}
            <th
              scope="col"
              className="border-b border-l border-slate-200 bg-slate-50 px-3 py-2.5 text-right text-xs font-medium text-slate-500"
            >
              İl
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.locationId} className="group">
              <th
                scope="row"
                className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-2 text-left font-normal group-hover:bg-slate-50"
              >
                <Link to={`/locations/${row.locationId}`} className="font-medium text-slate-900 hover:underline">
                  {row.locationName}
                </Link>
                <p className="text-xs text-slate-400">{row.locationCode}</p>
              </th>

              {row.months.map((cell) => (
                <td
                  key={cell.month}
                  className="border-b border-slate-100 px-1 py-1 text-right align-middle group-hover:bg-slate-50"
                >
                  <Cell cell={cell} locationName={row.locationName} />
                </td>
              ))}

              <td className="border-b border-l border-slate-100 px-3 py-2 text-right group-hover:bg-slate-50">
                <p className="whitespace-nowrap font-semibold text-slate-900">{formatMoney(row.knownAmount)}</p>
                <p className="text-xs text-slate-400">{formatCount(row.requestCount)} sifariş</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * One month. A month with no request says so once, quietly — it is not a spend of zero and must not read as
 * one — and a month with an order carries its money, its direction and, only where it applies, how many of its
 * products nobody has priced.
 */
function Cell({ cell, locationName }: { cell: MonthlyReportCell; locationName: string }) {
  if (cell.orderRequestId === null) {
    return (
      <span className="block px-2 py-1 text-slate-300" title={`${shortMonths[cell.month - 1]}: sifariş yoxdur`}>
        {unknownValue}
      </span>
    )
  }

  return (
    <Link
      to={`/orders/${cell.orderRequestId}`}
      aria-label={`${locationName} · ${shortMonths[cell.month - 1]} · ${formatMoney(cell.knownAmount)}`}
      className="block rounded px-2 py-1 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
    >
      <span className="block whitespace-nowrap font-medium text-slate-900">{formatMoney(cell.knownAmount)}</span>
      <CellNote cell={cell} />
    </Link>
  )
}

/**
 * What qualifies the figure above it — at most one line, so a busy month does not turn into three stacked
 * warnings. An unpriced product is the thing worth saying; the difference is second.
 */
function CellNote({ cell }: { cell: MonthlyReportCell }) {
  if (!cell.amountIsComplete) {
    return (
      <span className="block whitespace-nowrap text-[11px] text-amber-800">
        {formatCount(cell.missingPriceItemCount)} məhsulun qiyməti yoxdur
      </span>
    )
  }

  if (cell.deltaAmount === null) {
    return null
  }

  return (
    <span className="block whitespace-nowrap text-[11px] text-slate-400">{formatMoneyDelta(cell.deltaAmount)}</span>
  )
}

/**
 * The same year on a phone. Twelve columns do not survive a narrow screen, so the month is chosen once and the
 * locations are read down it — a different shape for the same question, rather than the table squeezed.
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
    <div className="lg:hidden">
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
                  <CellNote cell={cell} />
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
