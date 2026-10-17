import { useState, type ReactNode } from 'react'
import type { BasisSelection } from '../../../analytics/basisParams'
import { KpiInlineDetails, type KpiKind } from './KpiInlineDetails'
import type { AnalyticsScope, ManagementDashboardSummary } from '../../../api/dashboard'
import { scopeAmountLabels } from '../../../analytics/scope'
import { costDecreasedLabel, costIncreasedLabel } from '../../../terminology/terms'
import {
  basisLabels,
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatMonthRange,
  formatPercent,
} from '../../analytics/format'

/**
 * The month in four figures, as the approved design orders them: what was spent, what it is measured against,
 * the difference between them, and how much of the company is in it.
 *
 * The third card is the only one that carries colour, and it carries this product's meaning: a cost that rose
 * is red, a cost that fell is green — and the word beside the percentage says which, so the colour is never
 * reading alone.
 */
export function KpiRow({ summary, scope, selection }: {
  summary: ManagementDashboardSummary
  scope: AnalyticsScope
  selection?: BasisSelection
}) {
  const [active, setActive] = useState<KpiKind | null>(null)
  function toggle(kind: KpiKind) {
    setActive((current) => current === kind ? null : kind)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SelectedAmount summary={summary} scope={scope} active={active === 'current'} onClick={() => toggle('current')} />
        <BaselineAmount summary={summary} active={active === 'baseline'} onClick={() => toggle('baseline')} />
        <Difference summary={summary} active={active === 'difference'} onClick={() => toggle('difference')} />
        <ActiveLocations summary={summary} active={active === 'active'} onClick={() => toggle('active')} />
      </div>
      {active && <KpiInlineDetails kind={active} summary={summary} selection={selection} onClose={() => setActive(null)} />}
    </div>
  )
}

/**
 * One figure, in the approved design's card: a small upper-case label, the number, and what qualifies it.
 *
 * Four across on a wide screen, two and two where four would squeeze them, one under another on a phone. A
 * grid rather than a wrapping row, so a card that falls to the next line is still the width of its neighbours
 * instead of stretching across the page on its own.
 */
function KpiCard({ label, value, valueClass, children, active, onClick }: {
  label: string
  value: string
  valueClass?: string
  children?: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <section className={`flex min-h-[140px] flex-col gap-3 rounded-lg border bg-white p-6 transition-colors ${active ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-300'}`}>
      <button type="button" onClick={onClick} aria-expanded={active} aria-controls="dashboard-kpi-inline-details"
        className="flex flex-1 flex-col items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500">
      <h3 className="text-[13px] font-medium uppercase text-slate-500">{label}</h3>
      <p className={`text-[28px] font-bold leading-none ${valueClass ?? 'text-slate-900'}`}>{value}</p>
      {children}
      </button>
    </section>
  )
}

function SelectedAmount({ summary, scope, active, onClick }: { summary: ManagementDashboardSummary, scope: AnalyticsScope, active: boolean, onClick: () => void }) {
  return (
    <KpiCard label={scopeAmountLabels[scope]} value={formatMoney(summary.current.knownAmount)} active={active} onClick={onClick}>
      {/* What the figure leaves out, said where the figure is rather than in a footnote. */}
      {summary.current.missingPriceItemCount > 0 && (
        <p className="text-xs text-slate-500">Qiyməti olmayan sətirlər bu məbləğə daxil deyil.</p>
      )}
    </KpiCard>
  )
}

/**
 * What the month is measured against, and which months that is.
 *
 * The label names the rule, in the same words as the control above it; the badge names the months that rule
 * landed on, which no control shows — on an average of several months that is a range, not a month.
 */
function BaselineAmount({ summary, active, onClick }: { summary: ManagementDashboardSummary, active: boolean, onClick: () => void }) {
  const months = formatMonthRange(summary.baselinePeriods)

  return (
    <KpiCard
      active={active}
      onClick={onClick}
      label={`Müqayisə dövrü · ${basisLabels[summary.basis]}`}
      value={formatMoney(summary.baseline.knownAmount)}
    >
      {months && (
        <p className="w-fit rounded bg-[#f0f3f6] px-2 py-1 text-xs font-semibold text-slate-500">{months}</p>
      )}
    </KpiCard>
  )
}

/**
 * The difference, and what it is a difference over.
 *
 * The comparison is a cohort figure — the same objects on both sides — so where the month has objects the
 * comparison cannot reach, this card says how many it is actually over. Without that the reader would subtract
 * the two cards beside it and find a number that does not match.
 */
function Difference({ summary, active, onClick }: { summary: ManagementDashboardSummary, active: boolean, onClick: () => void }) {
  const delta = summary.knownAmountDelta
  const rising = delta !== null && delta > 0
  const falling = delta !== null && delta < 0

  const tone = rising ? 'text-red-500' : falling ? 'text-green-500' : 'text-slate-900'
  const wash = rising ? 'bg-red-50' : falling ? 'bg-green-50' : 'bg-[#f0f3f6]'
  const direction = rising ? costIncreasedLabel : falling ? costDecreasedLabel : null

  const outside = summary.locationsWithCurrentRequest - summary.locationsWithComparison

  return (
    <KpiCard label="Fərq" value={delta === null ? '—' : formatMoneyDelta(delta)} valueClass={tone} active={active} onClick={onClick}>
      <div className="flex flex-wrap items-center gap-2">
        {summary.knownAmountPercentChange !== null && (
          <span className={`rounded px-2 py-1 text-xs font-semibold ${wash} ${tone}`}>
            {formatPercent(summary.knownAmountPercentChange)}
          </span>
        )}
        {direction && <span className="text-xs text-slate-400">{direction}</span>}
      </div>
      {outside > 0 && (
        <p className="text-xs text-slate-500">
          {formatCount(summary.locationsWithComparison)} obyekt üzrə — {formatCount(outside)} obyekt müqayisəyə daxil deyil
        </p>
      )}
    </KpiCard>
  )
}

function ActiveLocations({ summary, active, onClick }: { summary: ManagementDashboardSummary, active: boolean, onClick: () => void }) {
  return (
    <KpiCard
      active={active}
      onClick={onClick}
      label="Aktiv obyektlər"
      value={`${formatCount(summary.locationsWithCurrentRequest)} / ${formatCount(summary.locationCount)} obyekt`}
    >
      {summary.locationsWithoutCurrentRequest > 0 && (
        <p className="text-xs text-slate-500">
          {formatCount(summary.locationsWithoutCurrentRequest)} obyektdə bu ay sifariş yoxdur
        </p>
      )}
    </KpiCard>
  )
}
