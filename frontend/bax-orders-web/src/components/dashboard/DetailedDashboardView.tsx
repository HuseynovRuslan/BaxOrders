import type {
  AnalyticsScope,
  DashboardAttention,
  LocationDashboardRow,
  DashboardPeriod,
  ManagementDashboardSummary,
} from '../../api/dashboard'
import type { BasisSelection } from '../../analytics/basisParams'
import { dashboardViewLabels, dashboardViewOrder, type DashboardView } from '../../analytics/dashboardView'
import { formatMonth } from '../analytics/format'
import { DashboardExceptions } from './DashboardSummary'
import { AttentionCards } from './stitch/AttentionCards'
import { CategoryBreakdown } from './stitch/CategoryBreakdown'
import { ComparisonBars } from './stitch/ComparisonBars'
import { FilterRibbon } from './stitch/FilterRibbon'
import { KpiGrid } from './stitch/KpiGrid'

/**
 * «Ətraflı baxış» — the approved Stitch composition, unchanged.
 *
 * Lifted out of the page so both views are read the same way — the page holds the month, the scope and the
 * comparison, and hands them to whichever view is open — but not otherwise touched: this view has its own
 * approved design, and it keeps it until a new one is approved.
 *
 * It comes in two parts because it always has. The heading and its ribbon stand above the answer and are on
 * screen while the answer is still loading or has failed; the figures below exist only once there is an answer.
 */
export function DetailedDashboardHeader({
  selectedPeriod,
  periods,
  period,
  onPeriod,
  scope,
  onScope,
  selection,
  onSelection,
  priorMonths,
  loadedAt,
  view,
  onView,
}: {
  /** The month the figures below are of, or nothing while they are still being fetched. */
  selectedPeriod: string | null
  periods: readonly DashboardPeriod[]
  period: string | null
  onPeriod: (period: string) => void
  scope: AnalyticsScope
  onScope: (scope: AnalyticsScope) => void
  selection: BasisSelection
  onSelection: (selection: BasisSelection) => void
  priorMonths: readonly string[]
  loadedAt: Date | null
  view: DashboardView
  onView: (view: DashboardView) => void
}) {
  return (
    <>
      {/*
        The approved design's opening: who this is for, what it is, and the one control that decides how much
        of it is shown. The eyebrow names the organisation because this screen is printed and forwarded.
      */}
      <div className="mb-space-md flex flex-col justify-between gap-space-md lg:flex-row lg:items-center">
        <div className="min-w-0">
          <p className="mb-1 flex flex-wrap items-center gap-space-sm font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
            <span>İdarəetmə mərkəzi</span>
            <span aria-hidden="true">•</span>
            <span className="font-medium text-secondary">Bakı Abadlıq Xidməti MMC</span>
          </p>
          <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">İdarəetmə paneli</h1>
          <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
            {selectedPeriod
              ? `${formatMonth(selectedPeriod)} üzrə material sifarişlərinin analitikası və obyektlərin xərc dinamikası`
              : 'Material sifarişlərinin analitikası və obyektlərin xərc dinamikası'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-space-sm self-start lg:self-center">
          <div className="flex items-center rounded-xl bg-surface-container-high p-1 shadow-sm" role="group" aria-label="Baxış">
            {dashboardViewOrder.map((option) => {
              const active = option === view
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onView(option)}
                  className={`rounded-lg px-space-md py-1.5 font-label-md text-label-md transition-all ${
                    active
                      ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {dashboardViewLabels[option]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mb-space-lg">
        <FilterRibbon
          periods={periods}
          period={period}
          onPeriod={onPeriod}
          scope={scope}
          onScope={onScope}
          selection={selection}
          onSelection={onSelection}
          priorMonths={priorMonths}
          loadedAt={loadedAt}
        />
      </div>
    </>
  )
}

/**
 * The detailed answer itself: four figures, the month against its basis object by object, what the money went
 * on, the outliers, and who the comparison could not reach.
 *
 * The two wrappers at the end carry the phone's reading order — on a narrow screen the exceptions come first
 * and the outliers after, which is Task 1b's decision; from 1024 pixels the page order stands.
 */
export function DetailedDashboardView({
  summary,
  rows,
  attention,
  scope,
  selection,
  onShowOutsideMonthly,
  onOpenAll,
  onOpenDetail,
}: {
  summary: ManagementDashboardSummary
  rows: readonly LocationDashboardRow[]
  attention: readonly DashboardAttention[]
  scope: AnalyticsScope
  selection: BasisSelection
  onShowOutsideMonthly: () => void
  onOpenAll: () => void
  onOpenDetail: (item: DashboardAttention) => void
}) {
  return (
    <>
      <KpiGrid summary={summary} scope={scope} onShowOutsideMonthly={onShowOutsideMonthly} />

      <div className="mb-space-lg grid grid-cols-1 items-stretch gap-space-lg lg:grid-cols-12">
        <ComparisonBars summary={summary} rows={rows} selection={selection} onOpenAll={onOpenAll} />
        <CategoryBreakdown categories={summary.categories} scope={scope} />
      </div>

      {/* Which objects to read, and why — straight under the month, on the first screen. */}
      <div className="max-lg:order-2">
        <AttentionCards
          attention={attention}
          summary={summary}
          selection={selection}
          onOpenDetail={onOpenDetail}
        />
      </div>

      {/* Who is outside the comparison, object by object. */}
      <div className="max-lg:order-1">
        <DashboardExceptions summary={summary} selection={selection} />
      </div>
    </>
  )
}
