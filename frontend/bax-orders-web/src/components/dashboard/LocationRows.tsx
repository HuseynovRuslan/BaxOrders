import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import type { LocationDashboardRow, ManagementDashboardSummary } from '../../api/dashboard'
import { StatusBadge } from '../StatusBadge'
import { InfoHint } from '../analytics/InfoHint'
import {
  basisLabels,
  formatCount,
  formatMonth,
  formatMoney,
  formatMoneyDelta,
  formatPercent,
  formatPeriodCoverage,
  knownAmountHint,
  toMonthKey,
  unknownValue,
} from '../analytics/format'
import { stateLabels } from '../analytics/labels'
import { availabilityLabels, historyCoverageClass, historyCoverageLabels } from './labels'

interface LocationRowsProps {
  rows: LocationDashboardRow[]
  summary: ManagementDashboardSummary
}

const noRequestTone = 'bg-amber-100 text-amber-900 ring-amber-200'

/** Where a row's own comparison lives, on the month and basis the backend named for it. */
function analyticsHref(row: LocationDashboardRow): string {
  return `/locations/${row.locationId}/analytics?period=${toMonthKey(row.deepLinkPeriod)}&basis=${row.deepLinkBasis}`
}

export function LocationRows({ rows, summary }: LocationRowsProps) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <caption className="sr-only">
            {formatMonth(summary.selectedPeriod)} dövrünün obyektlər üzrə görünüşü
          </caption>
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">Obyekt</th>
              <th scope="col" className="px-3 py-3 text-right">Sətir</th>
              <th scope="col" className="whitespace-nowrap px-3 py-3 text-right">
                <span className="inline-flex items-center gap-1">
                  Məlum məbləğ
                  <InfoHint label="Məbləğ necə hesablanır?">{knownAmountHint}</InfoHint>
                </span>
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-3 text-right">{basisLabels[summary.basis]}</th>
              <th scope="col" className="whitespace-nowrap px-3 py-3 text-right">Fərq</th>
              <th scope="col" className="px-3 py-3">Tarixçə</th>
              <th scope="col" className="px-3 py-3">Dəyişikliklər</th>
              <th scope="col" className="px-3 py-3"><span className="sr-only">Ətraflı</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.locationId} className={row.hasCurrentRequest ? 'hover:bg-slate-50' : 'bg-amber-50/40 hover:bg-amber-50/70'}>
                <th scope="row" className="px-4 py-2.5 text-left font-normal">
                  <p className="font-medium text-slate-900">{row.locationName}</p>
                  <p className="text-xs text-slate-500">{row.locationCode}</p>
                </th>

                {row.hasCurrentRequest ? (
                  <>
                    <td className="px-3 py-2.5 text-right text-slate-700">{formatCount(row.current.itemCount)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <p className="whitespace-nowrap font-medium text-slate-900">{formatMoney(row.current.knownAmount)}</p>
                      <MissingPrices row={row} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-slate-600">{formatMoney(row.baseline.knownAmount)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <p className="whitespace-nowrap text-slate-900">{formatMoneyDelta(row.knownAmountDelta)}</p>
                      <p className="whitespace-nowrap text-xs text-slate-500">{formatPercent(row.knownAmountPercentChange)}</p>
                    </td>
                  </>
                ) : (
                  <td colSpan={4} className="px-3 py-2.5">
                    {/* Not a zero-spend object: it did not order, so there is nothing to put in these cells. */}
                    <StatusBadge label={availabilityLabels.NoCurrentRequest} sign="○" toneClass={noRequestTone} size="sm" />
                  </td>
                )}

                <td className="px-3 py-2.5"><History row={row} /></td>
                <td className="px-3 py-2.5"><Changes row={row} /></td>
                <td className="px-3 py-2.5 text-right">
                  <Link
                    to={analyticsHref(row)}
                    aria-label={`${row.locationName} üzrə analitikaya bax`}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Analitikaya bax
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 lg:hidden">
        {rows.map((row) => (
          <li
            key={row.locationId}
            className={`rounded-lg border p-3 ${row.hasCurrentRequest ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50/60'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{row.locationName}</p>
                <p className="text-xs text-slate-500">{row.locationCode}</p>
              </div>
              <History row={row} />
            </div>

            {row.hasCurrentRequest ? (
              <div className="mt-2">
                <p className="whitespace-nowrap text-base font-semibold text-slate-900">{formatMoney(row.current.knownAmount)}</p>
                <dl className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-xs text-slate-500">
                  <div className="flex items-baseline gap-1">
                    <dt>{basisLabels[summary.basis]}</dt>
                    <dd className="whitespace-nowrap text-slate-700">{formatMoney(row.baseline.knownAmount)}</dd>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <dt>Fərq</dt>
                    <dd className="whitespace-nowrap text-slate-700">
                      {formatMoneyDelta(row.knownAmountDelta)} <span>{formatPercent(row.knownAmountPercentChange)}</span>
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="mt-2">
                <StatusBadge label={availabilityLabels.NoCurrentRequest} sign="○" toneClass={noRequestTone} size="sm" />
              </div>
            )}

            <MissingPrices row={row} />

            <div className="mt-2 flex flex-wrap items-end justify-between gap-2 border-t border-slate-100 pt-2">
              <Changes row={row} />
              <Link
                to={analyticsHref(row)}
                aria-label={`${row.locationName} üzrə analitikaya bax`}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                Analitikaya bax
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

/** The coverage badge, with its denominator on the badge rather than hidden behind a hover. */
function History({ row }: { row: LocationDashboardRow }) {
  const months = formatPeriodCoverage(row.availableBaselinePeriodCount, row.expectedBaselinePeriodCount)
  const missing = row.missingBaselinePeriods.map(formatMonth).join(', ')

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${historyCoverageClass[row.historyCoverage]}`}
      title={missing ? `Çatışmayan: ${missing}` : undefined}
    >
      {historyCoverageLabels[row.historyCoverage]}
      <span className="font-normal opacity-80">{months}</span>
    </span>
  )
}

/**
 * The product changes behind a row. A row that has nothing to compare shows why instead of showing counts
 * that would read as a comparison.
 */
function Changes({ row }: { row: LocationDashboardRow }) {
  if (!row.hasCurrentRequest) {
    return <span className="text-xs text-slate-500">{unknownValue}</span>
  }

  if (!row.comparisonAvailable) {
    return (
      <span className="text-xs text-amber-900">
        {availabilityLabels.NoBaselineHistory}
        {row.insufficientHistoryVariantCount > 0 && (
          <span className="block text-slate-500">
            {formatCount(row.insufficientHistoryVariantCount)} mövqe · {stateLabels.InsufficientHistory}
          </span>
        )}
      </span>
    )
  }

  const hasSecondary = row.noLongerOrderedVariantCount > 0 || row.amountOrientedServiceCount > 0

  return (
    <div className="text-xs">
      <p className="flex flex-wrap items-baseline gap-y-0.5">
        <Count label={stateLabels.New} value={row.newVariantCount} />
        <span className="text-slate-300"> · </span>
        <Count label={stateLabels.Increased} value={row.increasedVariantCount} />
        <span className="text-slate-300"> · </span>
        <Count label={stateLabels.Decreased} value={row.decreasedVariantCount} />
      </p>
      {hasSecondary && (
        <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {row.noLongerOrderedVariantCount > 0 && <Count label={stateLabels.NoLongerOrdered} value={row.noLongerOrderedVariantCount} quiet />}
          {row.amountOrientedServiceCount > 0 && (
            <span className="text-slate-400">Xidmət: {formatCount(row.amountOrientedServiceCount)}</span>
          )}
        </p>
      )}
    </div>
  )
}

function Count({ label, value, quiet = false }: { label: string; value: number; quiet?: boolean }) {
  return (
    <span className={quiet ? 'text-slate-400' : value > 0 ? 'text-slate-700' : 'text-slate-400'}>
      {label} <span className={quiet ? 'font-normal' : 'font-medium'}>{formatCount(value)}</span>
    </span>
  )
}

/** Said next to the money it affects, so a partial figure never looks authoritative. */
function MissingPrices({ row }: { row: LocationDashboardRow }) {
  if (!row.hasCurrentRequest || row.current.missingPriceItemCount === 0) {
    return null
  }

  return (
    <p className="text-xs text-amber-800">
      {formatCount(row.current.missingPriceItemCount)} qiymətsiz sətir
    </p>
  )
}

export { analyticsHref }
