import { LineChart } from 'lucide-react'
import type { ComparisonSummary, PriceCoverage, VariantComparison } from '../../api/analytics'
import { formatNumber } from '../imports/labels'
import {
  coverageBadgeClass,
  coverageLabels,
  describeBasis,
  distinguishVariants,
  formatAnalyticsAmount,
  formatAnalyticsPeriod,
  formatAnalyticsQuantity,
  formatBaselineBasisNote,
  formatDelta,
  formatPercent,
  formatPrice,
  internalSupplyLabel,
  stateBadgeClass,
  stateBadgeLabels,
  stateSign,
  unknownValue,
  weightedPriceLabel,
} from './labels'
import { productHistoryLabel } from '../../terminology/terms'

interface RowsProps {
  rows: VariantComparison[]
  summary: ComparisonSummary
  onTrend: (row: VariantComparison) => void
}

/** The heading of the baseline column: which window it is, and how many of its months actually exist. */
function BaselineHeading({ summary }: { summary: ComparisonSummary }) {
  const partial = summary.availableBaselinePeriodCount < summary.expectedBaselinePeriodCount

  return (
    <>
      {describeBasis(summary.basis, summary.baselineWindowPeriods)}
      {summary.basis !== 'PreviousMonth' && (
        <span className={`block font-normal ${partial ? 'text-amber-800' : 'text-slate-400'}`}>
          {formatBaselineBasisNote(summary.availableBaselinePeriodCount, summary.expectedBaselinePeriodCount)}
        </span>
      )}
    </>
  )
}

/**
 * Materials: quantities may be compared, so the quantity columns carry the comparison. Price and amount are
 * real facts, not just decoration, so they stay on the row — as the quiet second line under the number they
 * qualify, rather than two more columns competing with the comparison itself.
 */
export function MaterialRows({ rows, summary, onTrend }: RowsProps) {
  const descriptions = distinguishVariants(rows.map((row) => row.variant))

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <caption className="sr-only">
            {formatAnalyticsPeriod(summary.currentPeriod)} dövrünün {describeBasis(summary.basis, summary.baselineWindowPeriods).toLowerCase()} ilə
            müqayisəsi
          </caption>
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">Məhsul</th>
              <th scope="col" className="px-3 py-3 text-right">
                Cari
                <span className="block font-normal text-slate-400">{formatAnalyticsPeriod(summary.currentPeriod)}</span>
              </th>
              <th scope="col" className="px-3 py-3 text-right"><BaselineHeading summary={summary} /></th>
              <th scope="col" className="px-3 py-3 text-right">Fərq</th>
              <th scope="col" className="px-3 py-3 text-right">Dəyişmə</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="px-3 py-3"><span className="sr-only">{productHistoryLabel}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row.variant.productVariantId} className="hover:bg-slate-50">
                <td className="px-4 py-2.5"><Product row={row} description={descriptions[index]} /></td>
                <td className="px-3 py-2.5 text-right">
                  <p className="font-medium text-slate-900">{formatAnalyticsQuantity(row.current.quantity)}</p>
                  <p className="text-xs text-slate-500">{formatAnalyticsAmount(row.current.knownAmount)}</p>
                </td>
                <td className="px-3 py-2.5 text-right text-slate-600">
                  {formatAnalyticsQuantity(row.baseline.quantity)}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-900">{formatDelta(row.delta.quantityDelta)}</td>
                <td className="px-3 py-2.5 text-right text-slate-900">{formatPercent(row.delta.quantityPercentChange)}</td>
                <td className="px-3 py-2.5">
                  <StateBadge row={row} />
                  <Price row={row} />
                </td>
                <td className="px-3 py-2.5 text-right"><TrendButton row={row} onTrend={onTrend} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 lg:hidden">
        {rows.map((row, index) => (
          <li key={row.variant.productVariantId} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <Product row={row} description={descriptions[index]} />
              <StateBadge row={row} />
            </div>

            <dl className="mt-2 grid grid-cols-4 gap-2 text-sm">
              <Figure label={formatAnalyticsPeriod(summary.currentPeriod)} value={formatAnalyticsQuantity(row.current.quantity)} strong />
              <Figure label={describeBasis(summary.basis, summary.baselineWindowPeriods)} value={formatAnalyticsQuantity(row.baseline.quantity)} />
              <Figure label="Fərq" value={formatDelta(row.delta.quantityDelta)} />
              <Figure label="Dəyişmə" value={formatPercent(row.delta.quantityPercentChange)} />
            </dl>

            <div className="mt-2 flex flex-wrap items-end justify-between gap-2 border-t border-slate-100 pt-2">
              <div className="text-xs text-slate-600">
                <p>{formatAnalyticsAmount(row.current.knownAmount)}</p>
                <Price row={row} compact />
              </div>
              <TrendButton row={row} onTrend={onTrend} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * Services: a month of cleaning is not a quantity of anything, so there is no quantity column at all here —
 * money is the comparison.
 */
export function ServiceRows({ rows, summary, onTrend }: RowsProps) {
  const descriptions = distinguishVariants(rows.map((row) => row.variant))

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <caption className="sr-only">
            Xidmətlər: miqdar üzrə deyil, məbləğ üzrə müqayisə
          </caption>
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">Xidmət</th>
              <th scope="col" className="px-3 py-3 text-right">
                Cari məbləğ
                <span className="block font-normal text-slate-400">{formatAnalyticsPeriod(summary.currentPeriod)}</span>
              </th>
              <th scope="col" className="px-3 py-3 text-right"><BaselineHeading summary={summary} /></th>
              <th scope="col" className="px-3 py-3 text-right">Məbləğ fərqi</th>
              <th scope="col" className="px-3 py-3 text-right">Dəyişmə</th>
              <th scope="col" className="px-3 py-3">Qiymət məlumatı</th>
              <th scope="col" className="px-3 py-3"><span className="sr-only">{productHistoryLabel}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row.variant.productVariantId} className="hover:bg-slate-50">
                <td className="px-4 py-2.5"><Product row={row} description={descriptions[index]} /></td>
                <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                  {formatAnalyticsAmount(row.current.knownAmount)}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-600">
                  {formatAnalyticsAmount(row.baseline.knownAmount)}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-900">
                  {formatDelta(row.delta.amountDelta, (value) => formatAnalyticsAmount(value))}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-900">{formatPercent(row.delta.amountPercentChange)}</td>
                <td className="px-3 py-2.5"><Coverage coverage={row.current.priceCoverage} /></td>
                <td className="px-3 py-2.5 text-right"><TrendButton row={row} onTrend={onTrend} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 lg:hidden">
        {rows.map((row, index) => (
          <li key={row.variant.productVariantId} className="rounded-lg border border-slate-200 bg-white p-3">
            <Product row={row} description={descriptions[index]} />
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Figure label={formatAnalyticsPeriod(summary.currentPeriod)} value={formatAnalyticsAmount(row.current.knownAmount)} strong />
              <Figure label={describeBasis(summary.basis, summary.baselineWindowPeriods)} value={formatAnalyticsAmount(row.baseline.knownAmount)} />
              <Figure label="Fərq" value={formatDelta(row.delta.amountDelta, (value) => formatAnalyticsAmount(value))} />
              <Figure label="Dəyişmə" value={formatPercent(row.delta.amountPercentChange)} />
            </dl>
            <div className="mt-2 flex items-end justify-between gap-2 border-t border-slate-100 pt-2">
              <Coverage coverage={row.current.priceCoverage} />
              <TrendButton row={row} onTrend={onTrend} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

/** The product's name, and under it what the manager needs to tell it apart — never a code for its own sake. */
function Product({ row, description }: { row: VariantComparison; description: string }) {
  return (
    <div className="min-w-0">
      <p className="font-medium text-slate-900">{row.variant.productName}</p>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  )
}

/** The price behind the amount, said quietly next to the state it belongs with — never its own column. */
function Price({ row, compact = false }: { row: VariantComparison; compact?: boolean }) {
  const partial = row.current.priceCoverage.state !== 'Complete'

  return (
    <p className={`text-xs ${compact ? '' : 'mt-1'} ${partial ? coverageBadgeClass[row.current.priceCoverage.state] : 'text-slate-500'}`}>
      {weightedPriceLabel}: {formatPrice(row.current.weightedUnitPrice)}
      {row.delta.pricePercentChange !== null && ` (${formatPercent(row.delta.pricePercentChange)})`}
      {partial && <> · {coverageLabels[row.current.priceCoverage.state]}</>}
    </p>
  )
}

/** Partial coverage is stated, so a weighted price built on half the quantity never looks authoritative. */
function Coverage({ coverage, compact = false }: { coverage: PriceCoverage; compact?: boolean }) {
  if (coverage.state === 'Complete') {
    return compact ? null : <span className="text-xs text-slate-500">{coverageLabels.Complete}</span>
  }

  return (
    <span className={`text-xs ${coverageBadgeClass[coverage.state]}`}>
      {coverageLabels[coverage.state]}
      {coverage.missingRequiredPriceItemCount > 0 && (
        <> · {formatNumber(coverage.missingRequiredPriceItemCount)} sətir</>
      )}
      {coverage.priceNotRequiredItemCount > 0 && (
        <span className="text-slate-500"> · {internalSupplyLabel}</span>
      )}
    </span>
  )
}

function StateBadge({ row }: { row: VariantComparison }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${stateBadgeClass[row.state]}`}
    >
      <span aria-hidden="true">{stateSign[row.state]}</span>
      {stateBadgeLabels[row.state]}
    </span>
  )
}

function TrendButton({ row, onTrend }: { row: VariantComparison; onTrend: (row: VariantComparison) => void }) {
  return (
    <button
      type="button"
      onClick={() => onTrend(row)}
      aria-label={`${row.variant.productName} — məhsul tarixçəsinə bax`}
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      <LineChart className="size-3.5" aria-hidden="true" />
      {productHistoryLabel}
    </button>
  )
}

function Figure({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={strong ? 'font-medium text-slate-900' : 'text-slate-700'}>{value}</dd>
    </div>
  )
}

export { unknownValue }
