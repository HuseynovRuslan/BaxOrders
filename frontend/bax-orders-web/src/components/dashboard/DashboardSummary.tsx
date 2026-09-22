import { CircleSlash, TriangleAlert } from 'lucide-react'
import type { ManagementDashboardSummary } from '../../api/dashboard'
import { InfoHint } from '../analytics/InfoHint'
import {
  basisHints,
  basisLabels,
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatPercent,
  historyHint,
  knownAmountHint,
  knownAmountLabel,
} from '../analytics/format'
import { historyCoverageLabels, partialAmountNote } from './labels'

interface DashboardSummaryProps {
  summary: ManagementDashboardSummary
}

/**
 * The company's month in a few seconds. The money is the headline, but only ever under the heading the
 * backend's coverage flags allow: a figure with unpriced lines behind it is money that is known, not money
 * that was spent, and the difference is said on the card rather than left to be assumed.
 */
export function DashboardSummary({ summary }: DashboardSummaryProps) {
  // Either side being short of prices makes the comparison a comparison of known money, not of money.
  const amountsArePartial = !summary.current.isComplete || !summary.baseline.isComplete

  return (
    <div className="mb-5 space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 className="flex items-center gap-1 text-xs text-slate-500">
            {summary.current.isComplete ? 'Cari dövrün məbləği' : `${knownAmountLabel} məbləğ`}
            <InfoHint label="Məbləğ necə hesablanır?">{knownAmountHint}</InfoHint>
          </h2>

          <p className="mt-1 text-3xl font-semibold text-slate-900">{formatMoney(summary.current.knownAmount)}</p>

          <dl className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-slate-500">{basisLabels[summary.basis]}</dt>
              <dd className="font-medium text-slate-900">{formatMoney(summary.baseline.knownAmount)}</dd>
              <InfoHint label="Müqayisə bazası nədir?">{basisHints[summary.basis]}</InfoHint>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-slate-500">Fərq</dt>
              <dd className="font-medium text-slate-900">{formatMoneyDelta(summary.knownAmountDelta)}</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-slate-500">Dəyişmə</dt>
              <dd className="font-medium text-slate-900">{formatPercent(summary.knownAmountPercentChange)}</dd>
            </div>
          </dl>

          {amountsArePartial && (
            <p className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              <span>
                {partialAmountNote}
                {summary.current.missingPriceItemCount > 0 && (
                  <> Cari dövrdə {formatCount(summary.current.missingPriceItemCount)} qiymətsiz sətir var.</>
                )}
                {summary.baseline.missingPriceItemCount > 0 && (
                  <> Müqayisə dövründə {formatCount(summary.baseline.missingPriceItemCount)} qiymətsiz sətir var.</>
                )}
                {summary.locationsWithMissingPrices > 0 && (
                  <> {formatCount(summary.locationsWithMissingPrices)} obyekt üzrə qiymət məlumatı natamamdır.</>
                )}
              </span>
            </p>
          )}
        </section>

        <dl className="grid grid-cols-2 gap-3">
          <Fact label="Sifariş olan obyektlər" value={formatCount(summary.locationsWithCurrentRequest)} note={`${formatCount(summary.locationCount)} obyektdən`} />
          <Fact
            label="Sifariş olmayan obyektlər"
            value={formatCount(summary.locationsWithoutCurrentRequest)}
            warn={summary.locationsWithoutCurrentRequest > 0}
          />
          <Fact label="Cari dövr sətirləri" value={formatCount(summary.current.itemCount)} />
          <Fact
            label="Qiymətsiz sətirlər"
            value={formatCount(summary.current.missingPriceItemCount)}
            warn={summary.current.missingPriceItemCount > 0}
          />
        </dl>
      </div>

      <DataCoverage summary={summary} />
    </div>
  )
}

/**
 * What the dashboard can and cannot speak about. These are counts of facts, not a grade: there is no data
 * quality score here, because a score would hide which objects are actually affected.
 */
function DataCoverage({ summary }: { summary: ManagementDashboardSummary }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <h2 className="flex items-center gap-1 text-xs font-medium text-slate-500">
        Məlumatın əhatəsi
        <InfoHint label="Tarixçə nə deməkdir?">{historyHint}</InfoHint>
      </h2>

      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Coverage label={historyCoverageLabels.Complete} value={summary.locationsWithCompleteHistory} />
        <Coverage label={historyCoverageLabels.Partial} value={summary.locationsWithPartialHistory} warn={summary.locationsWithPartialHistory > 0} />
        <Coverage label={historyCoverageLabels.Unavailable} value={summary.locationsWithNoBaselineHistory} warn={summary.locationsWithNoBaselineHistory > 0} />
        <Coverage label="Qiymət məlumatı natamam obyektlər" value={summary.locationsWithMissingPrices} warn={summary.locationsWithMissingPrices > 0} />
        <Coverage label="Sifariş olmayan obyektlər" value={summary.locationsWithoutCurrentRequest} warn={summary.locationsWithoutCurrentRequest > 0} icon />
      </dl>
    </section>
  )
}

function Fact({ label, value, note, warn = false }: { label: string; value: string; note?: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border bg-white p-3 ${warn ? 'border-amber-200' : 'border-slate-200'}`}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-2xl font-semibold ${warn ? 'text-amber-900' : 'text-slate-900'}`}>{value}</dd>
      {note && <p className="text-xs text-slate-500">{note}</p>}
    </div>
  )
}

function Coverage({ label, value, warn = false, icon = false }: { label: string; value: number; warn?: boolean; icon?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      {icon && <CircleSlash className="size-3.5 self-center text-slate-400" aria-hidden="true" />}
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium ${warn && value > 0 ? 'text-amber-900' : 'text-slate-900'}`}>{formatCount(value)}</dd>
    </div>
  )
}
