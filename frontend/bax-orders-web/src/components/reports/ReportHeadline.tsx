import type { AnalyticsScope } from '../../api/dashboard'
import type { MonthlyReport } from '../../api/reports'
import { scopeAmountLabels, scopeNotes } from '../../analytics/scope'
import { amountIncompleteLabel, missingPriceShortLabel } from '../../pricing/labels'
import { formatCount, formatMoney } from '../analytics/format'
import { SummaryMetric } from '../SummaryMetric'
import {
  combinedSpendLabel,
  monthlyOrdersLabel,
  orderLineTypeLabels,
  outsideMonthlyOrdersLabel,
} from '../../orderLines/lineType'

/**
 * The year in one number, then what it is made of.
 *
 * Three money figures at the same size made a reader choose which one the report was about before they could
 * read any of them — and the answer is the one they asked for, which the scope above already says. So: one
 * headline in the words of that scope, and the year's composition underneath it in a line, where the two
 * figures that are not the headline stay available without competing with it.
 *
 * The composition is the year's own and does not move with the scope, the way the month's split does not on
 * the dashboard: it says what was ordered, not what was asked about.
 */
export function ReportHeadline({ report, scope }: { report: MonthlyReport, scope: AnalyticsScope }) {
  const note = scopeNotes[scope]

  return (
    <section className="mb-4" aria-label="İlin xülasəsi">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-xs text-slate-500">{scopeAmountLabels[scope]}</h2>
        <p className="mt-1 text-3xl font-semibold text-slate-900">{formatMoney(report.knownAmount)}</p>
        {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}

        <Composition report={report} />
      </div>

      {/* Counts, not money: they describe the year rather than measure it, so they are never the headline. */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <SummaryMetric label="Sifariş" value={formatCount(report.requestCount)} />
        <SummaryMetric label="Obyekt" value={formatCount(report.locationCount)} />
        <SummaryMetric
          label={missingPriceShortLabel}
          value={formatCount(report.missingPriceItemCount)}
          noteAttention={report.missingPriceItemCount > 0}
          note={report.missingPriceItemCount > 0 ? amountIncompleteLabel : undefined}
        />
      </div>
    </section>
  )
}

/** What the year held, in one line: the three sides and their total, none of them louder than the headline. */
function Composition({ report }: { report: MonthlyReport }) {
  const total = [report.monthlyKnownAmount, report.outsideMonthlyKnownAmount, report.unclassifiedKnownAmount]
  const combined = total.every((part) => part === null)
    ? null
    : total.reduce<number>((sum, part) => sum + (part ?? 0), 0)

  return (
    <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-2 text-xs">
      <Part label={monthlyOrdersLabel} amount={report.monthlyKnownAmount} />
      <Part label={outsideMonthlyOrdersLabel} amount={report.outsideMonthlyKnownAmount} />
      {/* Named, not explained: what these lines mean for the figures is the warning below, said once. */}
      {report.unclassifiedItemCount > 0 && (
        <Part label={orderLineTypeLabels.Unclassified} amount={report.unclassifiedKnownAmount} />
      )}
      <Part label={combinedSpendLabel} amount={combined} />
    </dl>
  )
}

function Part({ label, amount }: { label: string, amount: number | null }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-700">{formatMoney(amount)}</dd>
    </div>
  )
}
