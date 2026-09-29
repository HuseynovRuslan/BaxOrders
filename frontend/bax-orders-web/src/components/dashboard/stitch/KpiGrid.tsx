import { Banknote, Building2, CircleCheck, Scale, TrendingDown, TrendingUp } from 'lucide-react'
import type { AnalyticsScope, ManagementDashboardSummary } from '../../../api/dashboard'
import { scopeAmountLabels, scopeNotes } from '../../../analytics/scope'
import { outsideMonthlyOrdersLabel } from '../../../orderLines/lineType'
import {
  describeBasisCaption,
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatPercent,
  knownAmountHint,
} from '../../analytics/format'
import { KpiCard, KpiMoney, KpiPill } from './KpiCard'

/**
 * The month in four figures, in the approved design's row.
 *
 * The first three follow the reader's question; the fourth describes the month itself and deliberately does
 * not. Off-plan spending is a fact about what was ordered, not about what was asked, so it stays put when the
 * scope changes — the same rule the line-type split has always followed.
 */
export function KpiGrid({ summary, scope, onShowOutsideMonthly }: {
  summary: ManagementDashboardSummary
  scope: AnalyticsScope
  onShowOutsideMonthly?: () => void
}) {
  return (
    <div className="mb-space-lg grid grid-cols-1 gap-space-md md:grid-cols-2 xl:grid-cols-4">
      <AmountCard summary={summary} scope={scope} />
      <OrderingCard summary={summary} />
      <ComparedCard summary={summary} />
      <OutsideCard summary={summary} onShow={onShowOutsideMonthly} />
    </div>
  )
}

/** What the month cost in the lines the reader asked about, and whether that is more or less than the basis. */
function AmountCard({ summary, scope }: { summary: ManagementDashboardSummary, scope: AnalyticsScope }) {
  const delta = summary.knownAmountDelta
  const rising = delta !== null && delta > 0
  const falling = delta !== null && delta < 0

  return (
    <KpiCard
      label={scopeAmountLabels[scope]}
      note={scopeNotes[scope] ?? 'Bütün təsdiqlənmiş sifarişlər'}
      icon={<Banknote className="size-5" />}
      iconClass="bg-primary-fixed text-on-primary-fixed"
      accent={rising ? 'bg-error/70' : falling ? 'bg-tertiary-fixed-dim' : undefined}
      foot={(
        <>
          {delta !== null && (
        <>
          <KpiPill
            icon={rising ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            className={rising ? 'bg-error-container/60 text-error' : 'bg-tertiary-fixed/50 text-on-tertiary-fixed-variant'}
          >
            {formatMoneyDelta(delta)}
            {summary.knownAmountPercentChange !== null && ` (${formatPercent(summary.knownAmountPercentChange)})`}
          </KpiPill>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {describeBasisCaption(summary.basis, summary.baselinePeriods)} baza məbləği:{' '}
            <strong className="font-semibold text-on-surface">{formatMoney(summary.baseline.knownAmount)}</strong>
          </span>
        </>
          )}

          {/*
            What the figure above leaves out, said where the figure is — not in a footnote. A month that owes a
            price has a headline smaller than the month really was, and the reader has to be able to see that.
          */}
          {summary.current.missingPriceItemCount > 0 && (
            <span className="font-body-sm text-body-sm text-on-surface-variant">{knownAmountHint}</span>
          )}
        </>
      )}
    >
      <KpiMoney value={formatMoney(summary.current.knownAmount)} />
    </KpiCard>
  )
}

/** How much of the company is in this month at all. A ratio, because "24" alone answers nothing. */
function OrderingCard({ summary }: { summary: ManagementDashboardSummary }) {
  const { locationsWithCurrentRequest: ordering, locationCount: all, locationsWithoutCurrentRequest: silent } = summary
  const share = all === 0 ? 0 : Math.round((ordering / all) * 100)

  return (
    <KpiCard
      label="Sifariş verən obyektlər"
      note="Ümumi obyekt aktivliyi"
      icon={<Building2 className="size-5" />}
      iconClass="bg-secondary-fixed text-on-secondary-fixed"
      foot={(
        <>
          <span className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <span className="block h-full rounded-full bg-secondary" style={{ width: `${share}%` }} data-share={share} />
          </span>
          {silent > 0 && (
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {formatCount(silent)} obyektdə bu ay sifariş yoxdur
            </span>
          )}
        </>
      )}
    >
      <span className="tabular font-metric-val text-[34px] leading-none font-bold tracking-tight text-on-surface">
        {formatCount(ordering)}
      </span>
      <span className="font-headline-md text-headline-md font-semibold text-on-surface-variant">/ {formatCount(all)}</span>
      <span className="ml-auto rounded-lg bg-secondary-fixed px-2 py-0.5 font-label-sm text-label-sm font-bold text-on-secondary-fixed">
        {share}%
      </span>
    </KpiCard>
  )
}

/**
 * How many objects the comparison beside it is actually over.
 *
 * The headline difference is a cohort figure — the same objects on both sides — so this is the number that
 * makes it checkable. Without it a reader has no way to know the comparison left anybody out.
 */
function ComparedCard({ summary }: { summary: ManagementDashboardSummary }) {
  const outside = summary.locationCount - summary.locationsWithComparison

  return (
    <KpiCard
      label="Müqayisəyə daxil edilən"
      note="Hər iki ayda məlumatı olanlar"
      icon={<Scale className="size-5" />}
      iconClass="bg-surface-container-high text-on-surface-variant"
      foot={(
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {outside > 0
            ? `${formatCount(outside)} obyekt müqayisəyə daxil deyil`
            : 'Hər obyekt müqayisəyə daxildir'}
        </span>
      )}
    >
      <span className="tabular font-metric-val text-[34px] leading-none font-bold tracking-tight text-on-surface">
        {formatCount(summary.locationsWithComparison)}
      </span>
      <span className="font-headline-md text-headline-md font-semibold text-on-surface-variant">obyekt</span>
    </KpiCard>
  )
}

/**
 * What the month bought on top of the plan.
 *
 * Fixed to the month, not to the scope: this is the one card that describes what was ordered rather than what
 * was asked about, so a reader who has scoped the screen to the plan can still see what fell outside it.
 */
function OutsideCard({ summary, onShow }: {
  summary: ManagementDashboardSummary
  onShow?: () => void
}) {
  const outside = summary.lineTypes.outsideMonthly
  const none = outside.itemCount === 0

  // Red means "the cost went up". Off-plan spending existing is neither a rise nor a fault — it is a kind of
  // spend, and the card already names it and gives the amount, so the pill stays neutral.
  const figure = (
    <KpiCard
      label={outsideMonthlyOrdersLabel}
      note="Qeyri-müntəzəm xərclər"
      icon={<CircleCheck className="size-5" />}
      iconClass={none ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-surface-container-high text-on-surface-variant'}
      foot={(
        <KpiPill className={none ? 'bg-tertiary-fixed/50 text-on-tertiary-fixed-variant' : 'bg-surface-container-high text-on-surface-variant'}>
          {none
            ? 'Planlaşdırılmış daxilində'
            : `${formatCount(outside.itemCount)} sətir — aylıq müqayisədən kənar`}
        </KpiPill>
      )}
    >
      <KpiMoney value={formatMoney(outside.knownAmount)} />
    </KpiCard>
  )

  // Only openable when there is something to open, and only when the page offers somewhere to open it.
  if (none || !onShow) {
    return figure
  }

  return (
    <button
      type="button"
      onClick={onShow}
      aria-label={`${outsideMonthlyOrdersLabel} — sətirlərə bax`}
      className="rounded-xl text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
    >
      {figure}
    </button>
  )
}
