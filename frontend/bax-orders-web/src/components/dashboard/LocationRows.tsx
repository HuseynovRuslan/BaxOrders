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
import type { DashboardPartitionMember } from '../../api/dashboard'
import { DetailsLink } from './AttentionSection'
import {
  footerAllOrdersLine,
  footerComparedLabel,
  noOrderRowStatus,
  portfolioGroupLabels,
} from '../../coverage/labels'
import { incompleteExplanationNote } from '../../terminology/terms'
import {
  causeHeadline,
  noComparisonCause,
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

  // What each row that has no order this month has to say for itself. The backend has already sorted every
  // object into its group and carried the facts along; this only reads that answer.
  const noOrder = new Map(summary.partition.noOrderThisMonth.map((member) => [member.locationId, member]))
  const neverOrdered = new Set(summary.partition.noHistory.map((member) => member.locationId))

  // The footer restates the page headline, so it is summed over the same cohort the headline is.
  const compared = summary.partition.compared.length
  const withOrders = summary.locationsWithCurrentRequest
  const partiallyCompared = summary.partition.noBaseline.length > 0

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
                </th>

                <td className="px-3 py-2.5 text-right">
                  <p className="whitespace-nowrap font-medium text-slate-900">{formatMoney(row.current.knownAmount)}</p>
                  <MissingPrices row={row} />
                </td>

                {/*
                  An object that did not order this month has no comparison, so it has no baseline to show
                  either. Its own average is a real number and printing it here would invite the subtraction
                  the whole page exists to prevent: an average set beside a month that does not exist.
                */}
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-slate-600">
                  {row.hasCurrentRequest
                    ? formatMoney(row.baseline.knownAmount)
                    : <span className="text-slate-400">{unknownValue}</span>}
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
                <td className="px-3 py-2.5">
                  <DataState
                    row={row}
                    lastOrder={noOrder.get(row.locationId)}
                    neverOrdered={neverOrdered.has(row.locationId)}
                  />
                </td>

                <td className="px-3 py-2.5 text-right">
                  <DetailsLink row={row} selection={selection} compact />
                </td>
              </tr>
            ))}
          </tbody>

          {/*
            The page's own headline, restated where somebody who has just read down the column will look for
            it. The two money columns add up to it exactly, because every object's figure was rounded to the
            cent before the total was taken. The difference column does not always, by a qəpik or two: each
            object's difference is rounded from its own two unrounded sides, so the rounding lands separately.
            That is why this row is labelled rather than presented as the sum of the column above it.
          */}
          <tfoot className="border-t-2 border-slate-300 bg-slate-50">
            <tr>
              <th scope="row" className="px-4 py-3 text-left">
                <p className="font-semibold text-slate-900">{footerComparedLabel(compared)}</p>
                {partiallyCompared && (
                  <p className="text-xs font-normal text-slate-500">
                    {footerAllOrdersLine(withOrders, summary.current.knownAmount)}
                  </p>
                )}
              </th>

              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900">
                {formatMoney(summary.comparedCurrent.knownAmount)}
              </td>

              <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-slate-700">
                {formatMoney(summary.baseline.knownAmount)}
              </td>

              <td className="px-3 py-3 text-right">
                <p className={`whitespace-nowrap font-semibold ${signedToneClass(summary.knownAmountDelta)}`}>
                  {formatMoneyDelta(summary.knownAmountDelta)}
                </p>
                <p className={`whitespace-nowrap text-xs ${signedToneClass(summary.knownAmountDelta)}`}>
                  {formatPercent(summary.knownAmountPercentChange)}
                </p>
              </td>

              <td colSpan={3} className="px-3 py-3 text-xs text-slate-500">
                {basisDetail}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* A phone gets the same four answers, stacked. The table is never squeezed sideways to fit. */}
      <ul className="space-y-2 lg:hidden">
        {rows.map((row) => (
          <li key={row.locationId} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{row.locationName}</p>
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
              <DataState
                row={row}
                lastOrder={noOrder.get(row.locationId)}
                neverOrdered={neverOrdered.has(row.locationId)}
              />
              <MissingPrices row={row} />
            </div>

            <div className="mt-2 border-t border-slate-100 pt-2">
              <DetailsLink row={row} selection={selection} compact />
            </div>
          </li>
        ))}

        {/* The same closing figures a phone would otherwise have to scroll back up for. */}
        <li className="rounded-lg border-2 border-slate-300 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{footerComparedLabel(compared)}</p>
              {partiallyCompared && (
                <p className="text-xs text-slate-500">
                  {footerAllOrdersLine(withOrders, summary.current.knownAmount)}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="whitespace-nowrap text-base font-semibold text-slate-900">
                {formatMoney(summary.comparedCurrent.knownAmount)}
              </p>
              <p className={`whitespace-nowrap text-xs font-medium ${signedToneClass(summary.knownAmountDelta)}`}>
                {formatMoneyDelta(summary.knownAmountDelta)} {formatPercent(summary.knownAmountPercentChange)}
              </p>
              <p className="text-xs text-slate-400">
                {basisText} {formatMoney(summary.baseline.knownAmount)}
              </p>
            </div>
          </div>
          <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-500">{basisDetail}</p>
        </li>
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
function DataState({ row, lastOrder, neverOrdered }: {
  row: LocationDashboardRow
  lastOrder: DashboardPartitionMember | undefined
  neverOrdered: boolean
}) {
  // Said plainly and without amber: there is nothing here for anybody to put right. The same words as its
  // group in the chips and the exceptions block, so the row and the count above it are recognisably one fact.
  if (neverOrdered) {
    return <span className="text-xs text-slate-500">{portfolioGroupLabels.NoHistory}</span>
  }

  /*
    Not "sifariş yoxdur", which reads as an order of zero, and not an average either. What the object last
    did is the fact a reader wants next, and it is the one fact that is actually known.
  */
  if (!row.hasCurrentRequest) {
    return <span className="text-xs text-amber-900">{noOrderRowStatus(lastOrder)}</span>
  }

  // One wording for it, the same one the chip and the exceptions block use.
  if (row.comparisonAvailability === 'NoBaselineHistory') {
    return <span className="text-xs text-slate-600">{portfolioGroupLabels.NoBaseline}</span>
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
