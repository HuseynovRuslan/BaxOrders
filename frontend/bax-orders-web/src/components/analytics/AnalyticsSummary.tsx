import { ChevronDown, ChevronRight, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { ComparisonSummary } from '../../api/analytics'
import { formatNumber } from '../imports/labels'
import { orderStatusLabels } from '../imports/labels'
import {
  basisLabels,
  formatAnalyticsAmount,
  formatAnalyticsPeriod,
  formatBaselineBasisNote,
  formatCoverage,
  formatDelta,
  formatPercent,
  knownAmountLabel,
  stateLabels,
} from './labels'

interface AnalyticsSummaryProps {
  summary: ComparisonSummary
}

/**
 * What the comparison says at location level, with every figure carrying the qualification the backend
 * attached to it: money that is only the money we know, and an average that says how many months it is of.
 */
export function AnalyticsSummary({ summary }: AnalyticsSummaryProps) {
  return (
    <div className="mb-4 space-y-3">
      <BaselineCoverage summary={summary} />
      {!summary.baselineAvailable && <NoBaselineNotice summary={summary} />}
      <SummaryCards summary={summary} />
    </div>
  )
}

function SummaryCards({ summary }: { summary: ComparisonSummary }) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Card
          label="Cari dövr üzrə sətirlər"
          value={formatNumber(summary.currentItemCount)}
          note={
            summary.baselineAverageItemCount === null
              ? undefined
              : `müqayisə: ${formatNumber(summary.baselineAverageItemCount)}`
          }
        />
        <Card
          // Never "ümumi məbləğ": the backend says whether this is the whole story, and usually it is not.
          label={summary.amountIsComplete ? 'Cari dövrün məbləği' : `${knownAmountLabel} məbləğ`}
          value={formatAnalyticsAmount(summary.currentKnownAmountTotal)}
          note={
            summary.knownAmountDelta === null
              ? undefined
              : `${formatDelta(summary.knownAmountDelta, (value) => formatAnalyticsAmount(value))} (${formatPercent(summary.knownAmountPercentChange)})`
          }
          warn={!summary.amountIsComplete}
        />
        <Card
          label="Qiymətsiz sətirlər"
          value={formatNumber(summary.currentMissingPriceItemCount)}
          note={
            summary.currentMissingPriceItemCount > 0
              ? 'məbləğ natamamdır'
              : summary.baselineMissingPriceItemCount > 0
                ? `müqayisə dövründə ${formatNumber(summary.baselineMissingPriceItemCount)}`
                : undefined
          }
          warn={summary.currentMissingPriceItemCount > 0}
        />
        <Card label="Müqayisə olunan mövqe" value={formatNumber(summary.totalVariantCount)} />
      </dl>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Count label={stateLabels.New} value={summary.newVariantCount} />
        <Count label={stateLabels.Increased} value={summary.increasedVariantCount} />
        <Count label={stateLabels.Decreased} value={summary.decreasedVariantCount} />
        <Count label={stateLabels.NoLongerOrdered} value={summary.noLongerOrderedVariantCount} />
        {summary.amountOrientedServiceCount > 0 && (
          <Count label="Xidmətlər" value={summary.amountOrientedServiceCount} />
        )}
      </dl>
    </>
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
        <span className="font-medium text-slate-900">{basisLabels[summary.basis]}</span>
        <span className={partial ? 'text-amber-900' : 'text-slate-600'}>
          {formatCoverage(summary.availableBaselinePeriodCount, summary.expectedBaselinePeriodCount)}
        </span>
        {partial && summary.missingBaselinePeriods.length > 0 && (
          <span className="text-amber-900">
            Çatışmayan: {summary.missingBaselinePeriods.map(formatAnalyticsPeriod).join(', ')}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-600">
          Cari: <span className="font-medium text-slate-900">{formatAnalyticsPeriod(summary.currentPeriod)}</span>
          {' · '}Versiya {summary.currentVersion}
          {' · '}
          {orderStatusLabels[summary.currentStatus] ?? summary.currentStatus}
        </span>
        <Link to={`/orders/${summary.currentRequestId}`} className="text-slate-600 underline hover:text-slate-900">
          Sifarişə bax
        </Link>

        {summary.baselinePeriods.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="ml-auto inline-flex items-center gap-1 rounded px-1 py-0.5 text-slate-600 hover:bg-white hover:text-slate-900"
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
              {formatAnalyticsPeriod(period.period)} — Versiya {period.version}
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

function Card({
  label,
  value,
  note,
  warn = false,
}: {
  label: string
  value: string
  note?: string
  warn?: boolean
}) {
  return (
    <div className={`rounded-lg border bg-white p-3 ${warn ? 'border-amber-200' : 'border-slate-200'}`}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold text-slate-900">{value}</dd>
      {note && <p className={`mt-0.5 text-xs ${warn ? 'text-amber-800' : 'text-slate-500'}`}>{note}</p>}
    </div>
  )
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-base font-medium text-slate-900">{formatNumber(value)}</dd>
    </div>
  )
}

export { formatBaselineBasisNote }
