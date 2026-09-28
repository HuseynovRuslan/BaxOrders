import type { AnalyticsScope, ManagementDashboardSummary } from '../../api/dashboard'
import { scopeAmountLabels, scopeNotes } from '../../analytics/scope'
import {
  costDirectionToneClass,
  describeBasisCaption,
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatPercent,
} from '../analytics/format'

/**
 * The month in three numbers.
 *
 * The old headline carried the amount, what it was made of, the cohort, both sides of the comparison, the
 * difference, the percentage and who was left out — all at once, and a manager said so: «çox qarışıqdır». This
 * is the same screen's first question answered in the three facts that actually decide what to do next, one
 * dominant number each.
 *
 * What is not here has not been deleted: the split, the exclusions, the chips and the full table are a click
 * away in «Ətraflı baxış», and the percentage below is kept small on purpose so it cannot compete with the
 * money it qualifies.
 */
export function ExecutiveHeadline({ summary, scope }: {
  summary: ManagementDashboardSummary
  scope: AnalyticsScope
}) {
  const note = scopeNotes[scope]

  return (
    <div className="mb-3 grid gap-3 sm:grid-cols-3" role="group" aria-label="Ayın xülasəsi">
      {/* 1. What the month cost, in the lines the reader asked about. */}
      <Kpi label={scopeAmountLabels[scope]} note={note}>
        {formatMoney(summary.current.knownAmount)}
      </Kpi>

      {/* 2. Whether that is more or less than the basis. The arrow does the reading; the percentage is context
             and stays small, or it competes with the amount it is about. */}
      <Kpi
        label={describeBasisCaption(summary.basis, summary.baselinePeriods)}
        tone={costDirectionToneClass(summary.knownAmountDelta)}
        note={summary.knownAmountPercentChange === null ? undefined : formatPercent(summary.knownAmountPercentChange)}
      >
        {formatMoneyDelta(summary.knownAmountDelta)}
      </Kpi>

      {/* 3. How much of the company this month is about. A ratio rather than two numbers: "24 of 27" is one
             fact, and reading it takes no arithmetic. */}
      <Kpi label="Sifariş olan obyekt">
        {formatCount(summary.locationsWithCurrentRequest)}
        <span className="text-xl text-slate-400"> / {formatCount(summary.locationCount)}</span>
      </Kpi>
    </div>
  )
}

/** One card, one number. Anything that needs a second number needs a second card — or a drawer. */
function Kpi({ label, children, tone, note }: {
  label: string
  children: React.ReactNode
  tone?: string
  note?: string
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-xs text-slate-500">{label}</h2>
      <p className={`mt-1 whitespace-nowrap text-3xl font-semibold ${tone ?? 'text-slate-900'}`}>{children}</p>
      {note && <p className={`mt-0.5 text-xs ${tone ?? 'text-slate-500'}`}>{note}</p>}
    </section>
  )
}
