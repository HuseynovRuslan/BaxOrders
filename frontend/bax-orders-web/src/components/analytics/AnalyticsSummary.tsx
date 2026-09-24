import { ChevronDown, ChevronRight, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { ComparisonSummary } from '../../api/analytics'
import { missingPriceCount } from '../../pricing/labels'
import { WarningNote } from '../WarningNote'
import { formatNumber } from '../imports/labels'
import { orderStatusLabels } from '../imports/labels'
import {
  describeBasis,
  formatAnalyticsAmount,
  formatAnalyticsPeriod,
  formatBaselineBasisNote,
  formatCoverage,
  formatDelta,
  formatMonth,
  formatPercent,
  knownAmountLabel,
  stateLabels,
} from './labels'

interface AnalyticsSummaryProps {
  summary: ComparisonSummary
}

/**
 * What the comparison says at location level, in the order a reader actually needs it: how much history the
 * comparison rests on, one number for the money, and — only as plain counts, never as a row of equally loud
 * cards — how many products moved which way. The material table beneath says which ones.
 */
export function AnalyticsSummary({ summary }: AnalyticsSummaryProps) {
  return (
    <div className="mb-4 space-y-3">
      <BaselineCoverage summary={summary} />
      {!summary.baselineAvailable && <NoBaselineNotice summary={summary} />}
      <AmountSummary summary={summary} />
      <StateOverview summary={summary} />
    </div>
  )
}

/** The one number this location's month is judged by, with its change directly beneath it. */
function AmountSummary({ summary }: { summary: ComparisonSummary }) {
  const missing = summary.currentMissingPriceItemCount

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-xs text-slate-500">
        {/* Never "ümumi məbləğ": the backend says whether this is the whole story, and usually it is not. */}
        {summary.amountIsComplete
          ? `${formatMonth(summary.currentPeriod)} sifarişlərinin məbləği`
          : knownAmountLabel}
      </h2>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{formatAnalyticsAmount(summary.currentKnownAmountTotal)}</p>
      {missing > 0 && <p className="mt-0.5 text-xs text-amber-800">{missingPriceCount(missing)}</p>}

      {summary.knownAmountDelta !== null && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">Fərq ({describeBasis(summary.basis, summary.baselineWindowPeriods)})</span>
          <p className="mt-0.5 text-base font-semibold text-slate-900">
            {formatDelta(summary.knownAmountDelta, (value) => formatAnalyticsAmount(value))}
          </p>
          <p className="text-sm text-slate-500">{formatPercent(summary.knownAmountPercentChange)}</p>
        </div>
      )}

      {missing > 0 && summary.baselineMissingPriceItemCount > 0 && (
        <div className="mt-3">
          <WarningNote>
            Müqayisə dövründə də {missingPriceCount(summary.baselineMissingPriceItemCount)} — hər iki məbləğ tam
            deyil.
          </WarningNote>
        </div>
      )}
    </section>
  )
}

/**
 * How many products moved which way, as plain counts — not a row of boxes. A count is a fact about the
 * comparison, not a state to badge; the material table beneath is where each one is actually named.
 */
function StateOverview({ summary }: { summary: ComparisonSummary }) {
  const counts: Array<{ label: string; value: number }> = [
    { label: stateLabels.New, value: summary.newVariantCount },
    { label: stateLabels.Increased, value: summary.increasedVariantCount },
    { label: stateLabels.Decreased, value: summary.decreasedVariantCount },
    { label: stateLabels.NoLongerOrdered, value: summary.noLongerOrderedVariantCount },
  ]

  if (summary.amountOrientedServiceCount > 0) {
    counts.push({ label: 'Xidmətlər', value: summary.amountOrientedServiceCount })
  }

  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {counts.map((count) => (
        <span key={count.label}>
          {count.label}: <span className="font-medium text-slate-900">{formatNumber(count.value)}</span>
        </span>
      ))}
    </p>
  )
}

/** How much of the window the average actually rests on. Missing months are named, never hidden. */
function BaselineCoverage({ summary }: { summary: ComparisonSummary }) {
  const [open, setOpen] = useState(false)
  const partial = summary.availableBaselinePeriodCount < summary.expectedBaselinePeriodCount

  return (
    <section
      className={`rounded-lg border p-3 ${partial ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="font-medium text-slate-900">{describeBasis(summary.basis, summary.baselineWindowPeriods)}</span>
        <span className={partial ? 'text-amber-900' : 'text-slate-600'}>
          {formatCoverage(summary.availableBaselinePeriodCount, summary.expectedBaselinePeriodCount)}
        </span>
        {partial && summary.missingBaselinePeriods.length > 0 && (
          <span className="text-amber-900">
            Çatışmayan: {summary.missingBaselinePeriods.map(formatAnalyticsPeriod).join(', ')}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>{orderStatusLabels[summary.currentStatus] ?? summary.currentStatus}</span>
        <Link to={`/orders/${summary.currentRequestId}`} className="text-slate-600 underline hover:text-slate-900">
          Sifarişə bax
        </Link>

        {summary.baselinePeriods.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="ml-auto inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-white hover:text-slate-900"
          >
            {open ? <ChevronDown className="size-3.5" aria-hidden="true" /> : <ChevronRight className="size-3.5" aria-hidden="true" />}
            Müqayisəyə daxil olan dövrlər
          </button>
        )}
      </div>

      {open && (
        <ul className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs text-slate-700">
          {summary.baselinePeriods.map((period) => (
            <li key={period.orderRequestId}>
              {formatAnalyticsPeriod(period.period)}
              {' · '}
              <Link to={`/orders/${period.orderRequestId}`} className="underline hover:text-slate-900">
                Sifarişə bax
              </Link>
            </li>
          ))}
          {summary.missingBaselinePeriods.map((period) => (
            <li key={period} className="text-amber-900">
              {formatAnalyticsPeriod(period)} — sifariş yoxdur
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** When the window holds no request at all, that is what the page says — not a list of "new" products. */
function NoBaselineNotice({ summary }: { summary: ComparisonSummary }) {
  const months = summary.missingBaselinePeriods.map(formatAnalyticsPeriod).join(', ')

  return (
    <section className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4" role="status">
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
      <div className="text-sm text-amber-900">
        <p className="font-medium">
          {months
            ? `Müqayisə üçün ${months} məlumatı yoxdur.`
            : 'Müqayisə üçün əvvəlki dövr məlumatı yoxdur.'}
        </p>
        <p className="mt-1">
          Bu obyektin həmin ay üzrə sifarişi olmayıb, ona görə məhsullar «{stateLabels.New}» kimi deyil,
          «{stateLabels.InsufficientHistory}» kimi göstərilir. Başqa müqayisə bazası seçə bilərsiniz.
        </p>
      </div>
    </section>
  )
}

export { formatBaselineBasisNote }
