import { CalendarDays, History, RefreshCw } from 'lucide-react'
import type {
  AnalyticsScope,
  DashboardPeriod,
  DashboardAttention,
  ManagementDashboard,
} from '../../../api/dashboard'
import type { BasisSelection } from '../../../analytics/basisParams'
import { scopeAmountLabels, scopeLabels, scopeOrder } from '../../../analytics/scope'
import { dashboardViewLabels, dashboardViewOrder, type DashboardView } from '../../../analytics/dashboardView'
import { outsideMonthlyOrdersLabel } from '../../../orderLines/lineType'
import { BasisPicker } from '../../analytics/BasisPicker'
import {
  describeBasisCaption,
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatMonth,
  formatPercent,
  toMonthKey,
} from '../../analytics/format'
import { AlertCard } from './AlertCard'
import { CategoryDonut } from './CategoryDonut'
import { ComparisonChart } from './ComparisonChart'
import { KpiTile } from './KpiTile'

/** Three cards, as the handoff has it: a shortlist, not a second table. */
const shown = 3

/**
 * «Sadə baxış» — the Figma Make handoff, on this product's data.
 *
 * Deliberately not a reduced version of «Ətraflı baxış»: the owner approved two visual languages for the same
 * month, and this is the one with charts a manager reads at a glance and cards that stay short until asked.
 * It owns its own title row and filter bar so the page reads in one language rather than half in each; the
 * month, the scope and the comparison are the page's, shared with the other view.
 *
 * Source: `AI_WORKFLOW/design-reference/figma-simple-dashboard/`.
 */
export function SimpleDashboard({
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
  loadedAt,
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
  loadedAt: Date | null
  onOpenAll?: () => void
}) {
  const { summary } = data
  const chosen = periods.find((item) => toMonthKey(item.period) === period)

  const moved: DashboardAttention[] = data.attention
    .filter((item) => item.location.knownAmountDelta !== null)
    .sort((left, right) => Math.abs(right.location.knownAmountDelta!) - Math.abs(left.location.knownAmountDelta!))
    .slice(0, shown)

  return (
    <div className="-mx-space-md -mt-space-lg bg-simple-canvas px-space-md py-7 font-sans text-simple-ink sm:-mx-space-lg sm:px-space-lg lg:-mx-space-xl lg:-mt-space-xl lg:px-7">
      <p className="mb-1.5 text-xs font-medium text-simple-ink-faint">
        İDARƏETMƏ MƏRKƏZİ · <span className="font-semibold text-simple-accent">BAKI ABADLIQ XİDMƏTİ MMC</span>
      </p>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold tracking-[-0.3px] text-simple-ink">İdarəetmə paneli</h1>
          <p className="mt-1 text-[13px] text-simple-ink-faint">
            {formatMonth(summary.selectedPeriod)} üzrə material sifarişlərinin ümumi analitikası
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {dashboardViewOrder.map((option) => {
            const active = option === view
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onView(option)}
                className={`rounded-lg border px-4 py-2 text-[13px] transition-colors ${
                  active
                    ? 'border-simple-accent bg-simple-accent font-semibold text-white'
                    : 'border-simple-line bg-simple-card text-[#374151] hover:bg-simple-line-soft'
                }`}
              >
                {dashboardViewLabels[option]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Period, the three scopes, and what the month is measured against — the same three in both views. */}
      <section aria-label="Dövr və müqayisə" className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 rounded-lg border border-simple-line bg-simple-card px-3.5 py-[7px] text-[13px] font-medium text-[#374151]">
            <CalendarDays className="size-4 shrink-0 text-simple-ink-faint" aria-hidden="true" />
            <span className="sr-only">Dövr</span>
            <select
              value={period ?? ''}
              onChange={(event) => onPeriod(event.target.value)}
              disabled={periods.length === 0}
              className="cursor-pointer appearance-none bg-transparent font-medium outline-none disabled:opacity-50"
            >
              {periods.length === 0 && <option value="">Yüklənir…</option>}
              {periods.map((item) => (
                <option key={item.period} value={toMonthKey(item.period)}>
                  {formatMonth(item.period)} ({formatCount(item.locationCount)} obyekt)
                </option>
              ))}
            </select>
          </label>

          <div role="group" aria-label="Sifariş növü" className="flex rounded-lg bg-simple-line-soft p-0.5">
            {scopeOrder.map((option) => {
              const active = option === scope
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onScope(option)}
                  className={`rounded-md px-3.5 py-[5px] text-[13px] transition-colors ${
                    active ? 'bg-simple-accent font-semibold text-white' : 'text-simple-ink-soft hover:text-simple-ink'
                  }`}
                >
                  {scopeLabels[option]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-simple-ink-faint">
            Müqayisə dövrü:
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-simple-line bg-simple-card px-3.5 py-[7px] text-[13px] text-[#374151]">
            <History className="size-4 shrink-0 text-simple-ink-faint" aria-hidden="true" />
            {period !== null && (
              <BasisPicker
                selection={selection}
                onSelect={onSelection}
                months={[...priorMonths]}
                currentPeriod={period}
                size="sm"
                variant="compact"
              />
            )}
          </span>
          {/*
            The handoff shows a synchronisation time here. This product synchronises with nothing, so it says
            the true thing instead: when the answer on screen was read.
          */}
          {loadedAt && (
            <span className="flex items-center gap-1 rounded-lg bg-cost-down-wash px-2.5 py-[5px] text-xs text-cost-down">
              <RefreshCw className="size-3.5 shrink-0" aria-hidden="true" />
              Yeniləndi: {loadedAt.toLocaleTimeString('az-Latn-AZ', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </section>

      <div className="mb-5 flex flex-wrap gap-3">
        <AmountTile summary={summary} scope={scope} />
        <OrderingTile summary={summary} />
        <ComparedTile summary={summary} />
        <OutsideTile summary={summary} />
      </div>

      <div className="mb-7 grid items-start gap-4 xl:grid-cols-[1fr_380px]">
        <ComparisonChart summary={summary} rows={data.rows.items} onOpenAll={onOpenAll} />
        <CategoryDonut categories={summary.categories} />
      </div>

      {moved.length > 0 && (
        <section aria-label="Diqqət tələb edən obyektlər">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[15px] font-bold text-simple-ink">Diqqət tələb edən obyektlər</h2>
              <span className="rounded-full bg-cost-up-wash px-2.5 py-0.5 text-[11px] font-bold text-cost-up">
                Xərclərdə ən yüksək kənaraçıxmalar
              </span>
            </div>
            <span className="text-xs text-simple-ink-faint">
              {describeBasisCaption(summary.basis, summary.baselinePeriods)} · bütün obyektlər aşağıdakı cədvəldədir
            </span>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {moved.map((item, place) => (
              <AlertCard key={item.location.locationId} item={item} place={place} selection={selection} />
            ))}
          </div>
        </section>
      )}

      <span className="sr-only">{chosen ? `${formatMonth(chosen.period)} dövrü seçilib` : ''}</span>
    </div>
  )
}

/** What the month cost in the lines the reader asked about, and whether that is more or less than the basis. */
function AmountTile({ summary, scope }: { summary: ManagementDashboard['summary'], scope: AnalyticsScope }) {
  const delta = summary.knownAmountDelta
  const rising = delta !== null && delta > 0

  return (
    <KpiTile
      label={scopeAmountLabels[scope]}
      sub="Bütün təsdiqlənmiş sifarişlər"
      value={formatMoney(summary.current.knownAmount)}
      chipTone={delta === null ? 'neutral' : rising ? 'up' : 'down'}
      chip={delta === null ? undefined : (
        <>
          {rising ? '▲' : '▼'} {formatMoneyDelta(delta)}
          {summary.knownAmountPercentChange !== null && ` (${formatPercent(summary.knownAmountPercentChange)})`}
        </>
      )}
      notes={[
        `${describeBasisCaption(summary.basis, summary.baselinePeriods)} baza məbləği: ${formatMoney(summary.baseline.knownAmount)}`,
        // What the figure above leaves out, said where the figure is.
        summary.current.missingPriceItemCount > 0 ? 'Qiyməti olmayan sətirlər bu məbləğə daxil deyil.' : null,
      ]}
    />
  )
}

/** How much of the company is in this month at all. */
function OrderingTile({ summary }: { summary: ManagementDashboard['summary'] }) {
  const { locationsWithCurrentRequest: ordering, locationCount: all, locationsWithoutCurrentRequest: silent } = summary

  return (
    <KpiTile
      label="Sifariş verən obyektlər"
      sub="Ümumi obyekt aktivliyi"
      value={`${formatCount(ordering)} / ${formatCount(all)}`}
      notes={[silent > 0 ? `${formatCount(silent)} obyektdə bu ay sifariş yoxdur` : 'Hər obyekt bu ay sifariş verib']}
    />
  )
}

/**
 * How many objects the comparison beside it is actually over, and what one of them spends on average.
 *
 * The average is the cohort's own money divided by the cohort's own size — not the company's, which would be
 * an average over objects the comparison never looked at.
 */
function ComparedTile({ summary }: { summary: ManagementDashboard['summary'] }) {
  const compared = summary.locationsWithComparison
  const average = compared === 0 || summary.comparedCurrent.knownAmount === null
    ? null
    : summary.comparedCurrent.knownAmount / compared

  // The handoff names an excluded object here. Named from the real partition, or not at all.
  const excluded = summary.partition.noBaseline[0] ?? null

  return (
    <KpiTile
      label="Müqayisəyə daxil edilən"
      sub="Hər iki ayda məlumatı olanlar"
      value={`${formatCount(compared)} obyekt`}
      notes={[
        average === null ? null : `Ortalama xərc: ${formatMoney(average)}`,
        excluded === null
          ? null
          : `${excluded.locationName} (${formatMoney(excluded.currentKnownAmount)}) müqayisəyə daxil deyil`,
      ]}
    />
  )
}

/** What the month bought on top of the plan. Fixed to the month, so it does not move with the scope. */
function OutsideTile({ summary }: { summary: ManagementDashboard['summary'] }) {
  const outside = summary.lineTypes.outsideMonthly
  const none = outside.itemCount === 0

  return (
    <KpiTile
      label={outsideMonthlyOrdersLabel}
      sub="Qeyri-müntəzəm xərclər"
      value={formatMoney(outside.knownAmount)}
      chipTone={none ? 'calm' : 'neutral'}
      chip={none ? '✓ Planlaşdırılmış daxilində' : `${formatCount(outside.itemCount)} sətir — müqayisədən kənar`}
    />
  )
}
