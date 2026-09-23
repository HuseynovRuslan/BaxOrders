import { CircleSlash } from 'lucide-react'
import type { ManagementDashboardSummary } from '../../api/dashboard'
import { SummaryMetric } from '../SummaryMetric'
import { WarningNote } from '../WarningNote'
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
 * The company's month in a few seconds: one number, what it is measured against, and the one thing that
 * needs a look if there is one. Everything else — line counts, per-state location counts — is either folded
 * into that number's own secondary line or left to the table beneath, so this reads as a single answer rather
 * than a row of equally loud cards.
 */
export function DashboardSummary({ summary }: DashboardSummaryProps) {
  // Either side being short of prices makes the comparison a comparison of known money, not of money.
  const amountsArePartial = !summary.current.isComplete || !summary.baseline.isComplete
  const missing = summary.current.missingPriceItemCount

  return (
    <div className="mb-5 space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 className="flex items-center gap-1 text-xs text-slate-500">
            Cari dövrün məbləği
            <InfoHint label="Məbləğ necə hesablanır?">{knownAmountHint}</InfoHint>
          </h2>

          <p className="mt-1 text-3xl font-semibold text-slate-900">{formatMoney(summary.current.knownAmount)}</p>
          {!summary.current.isComplete && (
            <p className="mt-0.5 text-xs text-slate-500">
              {knownAmountLabel}
              {missing > 0 && <span className="text-amber-800"> · {formatCount(missing)} qiymətsiz sətir</span>}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-start gap-x-8 gap-y-2 border-t border-slate-100 pt-3">
            <div>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                {basisLabels[summary.basis]}
                <InfoHint label="Müqayisə bazası nədir?">{basisHints[summary.basis]}</InfoHint>
              </span>
              <span className="mt-0.5 block text-sm font-medium text-slate-700">{formatMoney(summary.baseline.knownAmount)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500">Fərq</span>
              <p className="mt-0.5 text-base font-semibold text-slate-900">{formatMoneyDelta(summary.knownAmountDelta)}</p>
              <p className="text-sm text-slate-500">{formatPercent(summary.knownAmountPercentChange)}</p>
            </div>
          </div>

          {amountsArePartial && (
            <div className="mt-3">
              <WarningNote>
                {partialAmountNote}
                {summary.locationsWithMissingPrices > 0 && (
                  <> {formatCount(summary.locationsWithMissingPrices)} obyekt üzrə qiymət məlumatı natamamdır.</>
                )}
              </WarningNote>
            </div>
          )}
        </section>

        <div>
          <SummaryMetric
            label="Sifariş olan obyektlər"
            value={`${formatCount(summary.locationsWithCurrentRequest)} / ${formatCount(summary.locationCount)}`}
            note={
              summary.locationsWithoutCurrentRequest > 0
                ? `${formatCount(summary.locationsWithoutCurrentRequest)} obyekt hələ göndərməyib`
                : undefined
            }
            warn={summary.locationsWithoutCurrentRequest > 0}
            size="lg"
          />
        </div>
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

function Coverage({ label, value, warn = false, icon = false }: { label: string; value: number; warn?: boolean; icon?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      {icon && <CircleSlash className="size-3.5 self-center text-slate-400" aria-hidden="true" />}
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium ${warn && value > 0 ? 'text-amber-900' : 'text-slate-900'}`}>{formatCount(value)}</dd>
    </div>
  )
}
