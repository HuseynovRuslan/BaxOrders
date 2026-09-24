import type { LocationDashboardRow, ManagementDashboardSummary } from '../../api/dashboard'
import type { BasisSelection } from '../../analytics/basisParams'
import { missingPriceCount } from '../../pricing/labels'
import {
  describeBasis,
  describeBasisWithRange,
  formatMoney,
  formatMoneyDelta,
  formatMonth,
  formatPercent,
  signedToneClass,
  unknownValue,
} from '../analytics/format'
import { DetailsLink } from './AttentionSection'
import {
  causeHeadline,
  incompleteExplanationNote,
  noComparisonCause,
  noComparisonNote,
  noCurrentRequestNote,
  partialHistoryNote,
} from './labels'

interface LocationRowsProps {
  rows: LocationDashboardRow[]
  summary: ManagementDashboardSummary
  /** Carried into every "Detallara bax", so the order answers about the same comparison. */
  selection: BasisSelection
}

/**
 * Every object, in the terms a manager reads them in: what it spent this month, what it spent last month, the
 * difference, and the one reason that difference exists.
 *
 * What is deliberately absent is as important as what is here. There is no line count, no coverage badge on a
 * healthy row, and no dump of how many products went up and down — those are answers to questions nobody asks
 * of a list of twenty-six objects, and they crowded out the four that are asked. The counts still exist and
 * are one click away on the object's own screen.
 */
export function LocationRows({ rows, summary, selection }: LocationRowsProps) {
  // The column is headed by whatever the comparison actually is, so the figure under it can never be read as
  // last month's when six months are being averaged.
  // The column stays short; the months it covers are a hover away, because a header that wraps onto three
  // lines costs every row of the table below it.
  const basisText = describeBasis(summary.basis, summary.baselinePeriods)
  const basisDetail = describeBasisWithRange(summary.basis, summary.baselinePeriods)

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <caption className="sr-only">
            {formatMonth(summary.selectedPeriod)} dövrünün obyektlər üzrə görünüşü
          </caption>
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">Obyekt</th>
              <th scope="col" className="px-3 py-3 text-right">Bu ay</th>
              <th scope="col" className="px-3 py-3 text-right" title={basisDetail}>{basisText}</th>
              <th scope="col" className="px-3 py-3 text-right">Dəyişmə</th>
              <th scope="col" className="px-3 py-3">Əsas səbəb</th>
              <th scope="col" className="px-3 py-3">Məlumat vəziyyəti</th>
              <th scope="col" className="px-3 py-3"><span className="sr-only">Detallar</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.locationId} className="hover:bg-slate-50">
                <th scope="row" className="px-4 py-2.5 text-left font-normal">
                  <p className="font-medium text-slate-900">{row.locationName}</p>
                  <p className="text-xs text-slate-400">{row.locationCode}</p>
                </th>

                <td className="px-3 py-2.5 text-right">
                  <p className="whitespace-nowrap font-medium text-slate-900">{formatMoney(row.current.knownAmount)}</p>
                  <MissingPrices row={row} />
                </td>

                <td className="whitespace-nowrap px-3 py-2.5 text-right text-slate-600">
                  {formatMoney(row.baseline.knownAmount)}
                </td>

                <td className="px-3 py-2.5 text-right">
                  {row.knownAmountDelta === null ? (
                    <span className="text-slate-400">{unknownValue}</span>
                  ) : (
                    <>
                      <p className={`whitespace-nowrap font-medium ${signedToneClass(row.knownAmountDelta)}`}>
                        {formatMoneyDelta(row.knownAmountDelta)}
                      </p>
                      <p className={`whitespace-nowrap text-xs ${signedToneClass(row.knownAmountDelta)}`}>
                        {formatPercent(row.knownAmountPercentChange)}
                      </p>
                    </>
                  )}
                </td>

                <td className="px-3 py-2.5"><MainCause row={row} /></td>
                <td className="px-3 py-2.5"><DataState row={row} /></td>

                <td className="px-3 py-2.5 text-right">
                  <DetailsLink row={row} selection={selection} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* A phone gets the same four answers, stacked. The table is never squeezed sideways to fit. */}
      <ul className="space-y-2 lg:hidden">
        {rows.map((row) => (
          <li key={row.locationId} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{row.locationName}</p>
                <p className="text-xs text-slate-400">{row.locationCode}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="whitespace-nowrap text-base font-semibold text-slate-900">
                  {formatMoney(row.current.knownAmount)}
                </p>
                {row.knownAmountDelta !== null && (
                  <p className={`whitespace-nowrap text-xs font-medium ${signedToneClass(row.knownAmountDelta)}`}>
                    {formatMoneyDelta(row.knownAmountDelta)} {formatPercent(row.knownAmountPercentChange)}
                  </p>
                )}
                <p className="text-xs text-slate-400">{basisText}</p>
              </div>
            </div>

            <div className="mt-2 text-xs">
              <MainCause row={row} />
              <DataState row={row} />
              <MissingPrices row={row} />
            </div>

            <div className="mt-2 border-t border-slate-100 pt-2">
              <DetailsLink row={row} selection={selection} compact />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * The one cause that moved the most money. Where the money cannot be explained, it says so rather than naming
 * a cause it cannot stand behind.
 */
function MainCause({ row }: { row: LocationDashboardRow }) {
  if (!row.hasCurrentRequest) {
    return <span className="text-xs text-slate-400">{unknownValue}</span>
  }

  if (row.primaryCause === null || row.primaryCauseAmount === null) {
    return <span className="text-xs text-slate-500">{noComparisonCause}</span>
  }

  return (
    <span className="text-xs text-slate-700">
      {causeHeadline(row.primaryCause, row.primaryCauseAmount)}{' '}
      <span className={`whitespace-nowrap font-medium ${signedToneClass(row.primaryCauseAmount)}`}>
        {formatMoneyDelta(row.primaryCauseAmount)}
      </span>
    </span>
  )
}

/**
 * Said only when there is something to say. A healthy row carries nothing here at all — a badge that appears
 * on every row is one a reader learns to skip, and then skips the real ones with it.
 */
function DataState({ row }: { row: LocationDashboardRow }) {
  if (!row.hasCurrentRequest) {
    return <span className="text-xs text-amber-900">{noCurrentRequestNote}</span>
  }

  if (row.comparisonAvailability === 'NoBaselineHistory') {
    return <span className="text-xs text-slate-600">{noComparisonNote}</span>
  }

  if (row.historyCoverage === 'Partial') {
    return <span className="text-xs text-slate-600">{partialHistoryNote}</span>
  }

  if (!row.explanationIsComplete) {
    return <span className="text-xs text-amber-800">{incompleteExplanationNote}</span>
  }

  return <span className="sr-only">Məlumat tamdır</span>
}

/** Said next to the money it affects, so a partial figure never looks authoritative. */
function MissingPrices({ row }: { row: LocationDashboardRow }) {
  if (!row.hasCurrentRequest || row.current.missingPriceItemCount === 0) {
    return null
  }

  return (
    <p className="text-xs text-amber-800">
      {missingPriceCount(row.current.missingPriceItemCount)}
    </p>
  )
}
