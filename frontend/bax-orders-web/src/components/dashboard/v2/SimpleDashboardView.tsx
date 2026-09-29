import type {
  AnalyticsScope,
  DashboardAttention,
  DashboardPeriod,
  ManagementDashboard,
} from '../../../api/dashboard'
import type { BasisSelection } from '../../../analytics/basisParams'
import type { DashboardView } from '../../../analytics/dashboardView'
import { CategoryRanked } from './CategoryRanked'
import { ChangesTable } from './ChangesTable'
import { DashboardControls } from './DashboardControls'
import { ExpenseDynamics } from './ExpenseDynamics'
import { KpiRow } from './KpiRow'

/**
 * «Sadə baxış» — the approved BaxOrders UI, on this product's own data.
 *
 * Four figures, six months, what the money went on, and the five objects whose money moved most. Everything a
 * manager opens the page to ask, and nothing they would have to scroll past to reach it; the full object table
 * stays below, and «Hamısına bax» goes to it.
 *
 * It computes nothing. Every amount, difference, share and cause is the dashboard answer as the API returned
 * it — the same answer «Ətraflı baxış» draws, drawn shorter.
 *
 * Source: Figma `BaxOrders-UI-v2`, frame `baxorders-dashboard`.
 */
export function SimpleDashboardView({
  data,
  periods,
  period,
  onPeriod,
  scope,
  onScope,
  view,
  onView,
  selection,
  onSelection,
  priorMonths,
  onOpenDetail,
  onOpenAll,
}: {
  data: ManagementDashboard
  periods: readonly DashboardPeriod[]
  period: string | null
  onPeriod: (period: string) => void
  scope: AnalyticsScope
  onScope: (scope: AnalyticsScope) => void
  view: DashboardView
  onView: (view: DashboardView) => void
  selection: BasisSelection
  onSelection: (selection: BasisSelection) => void
  priorMonths: readonly string[]
  onOpenDetail: (item: DashboardAttention) => void
  onOpenAll?: () => void
}) {
  const { summary } = data

  return (
    <div className="flex flex-col gap-6">
      {/* The title and the whole question on one row, as the design has it. */}
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <h1 className="shrink-0 whitespace-nowrap text-2xl font-bold text-slate-900">İdarəetmə paneli</h1>
        <DashboardControls
          periods={periods}
          period={period}
          onPeriod={onPeriod}
          scope={scope}
          onScope={onScope}
          selection={selection}
          onSelection={onSelection}
          priorMonths={priorMonths}
          view={view}
          onView={onView}
        />
      </div>

      <KpiRow summary={summary} scope={scope} />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
        <ExpenseDynamics trend={summary.trend} scope={scope} selectedPeriod={summary.selectedPeriod} />
        <CategoryRanked categories={summary.categories} />
      </div>

      <ChangesTable
        attention={data.attention}
        summary={summary}
        onOpenDetail={onOpenDetail}
        onOpenAll={onOpenAll}
      />
    </div>
  )
}
