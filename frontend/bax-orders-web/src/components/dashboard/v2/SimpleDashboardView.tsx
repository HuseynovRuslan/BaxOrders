import { useEffect, useRef, useState } from 'react'
import type {
  AnalyticsScope,
  DashboardPeriod,
  ManagementDashboard,
} from '../../../api/dashboard'
import type { BasisSelection } from '../../../analytics/basisParams'
import type { DashboardDetail } from '../../../analytics/dashboardDetail'
import type { DashboardView } from '../../../analytics/dashboardView'
import type { DashboardDetailState } from '../../../analytics/useDashboardDetail'
import { costDirectionToneClass, formatPercent } from '../../analytics/format'
import { CategoryRanked } from './CategoryRanked'
import { ChangesTable } from './ChangesTable'
import { DashboardControls } from './DashboardControls'
import { DifferenceDetail, type ChangesState } from './DifferenceDetail'
import { ExpenseDynamics } from './ExpenseDynamics'
import { KpiDetailSection } from './KpiDetailSection'
import { KpiRow, kpiDetailRegionId, kpiLabel, kpiValue } from './KpiRow'
import { AmountDetail, BaselineDetail, LocationsDetail } from './MonthDetails'

/**
 * «Sadə baxış» — the approved BaxOrders UI, on this product's own data.
 *
 * Four figures, six months, what the money went on, and the five objects whose money moved most. Everything a
 * manager opens the page to ask, and nothing they would have to scroll past to reach it; the full object table
 * stays below, and «Hamısına bax» goes to it.
 *
 * Each figure opens its detail in place, directly under the four cards — one at a time, no drawer (owner, 2026-10-17;
 * `AI_WORKFLOW/DESIGN/2026-10-17-dashboard-kart-detallari`). «Ətraflı» on a changed object opens «Fərq» on that
 * object's row.
 *
 * It computes nothing. Every amount, difference, share and cause is the dashboard answer as the API returned
 * it — the same answer «Ətraflı baxış» draws, drawn shorter.
 *
 * Source: Figma `BaxOrders-UI-v2`, frame `baxorders-dashboard`.
 */
export function SimpleDashboardView({
  data,
  busy = false,
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
  detail,
  changes,
  onRetryChanges,
  onOpenAll,
}: {
  data: ManagementDashboard
  /** A newer answer is being read; the one on screen stays, marked busy. */
  busy?: boolean
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
  /** The open card and object, from the address. */
  detail: DashboardDetailState
  /** Every compared object, largest change first: «Fərq» lists it and «Məbləğ dəyişiklikləri» takes five of it. */
  changes: ChangesState
  onRetryChanges: () => void
  onOpenAll?: () => void
}) {
  const { summary } = data

  // The card being shown stays drawn while the region slides shut, so closing does not empty it first.
  const [shown, setShown] = useState<DashboardDetail | null>(detail.detail)
  useEffect(() => {
    if (detail.detail !== null) {
      setShown(detail.detail)
    }
  }, [detail.detail])

  // The reader's own opening or switching moves the focus into the region; arriving by a link does not.
  const [focusKey, setFocusKey] = useState(0)
  const [scrollOnOpen, setScrollOnOpen] = useState(true)
  const cards = useRef(new Map<DashboardDetail, HTMLButtonElement>())

  // Closing — by the card, ✕, «Bağla» or Esc — gives the focus back to the card the detail belonged to (§7.7).
  const returnTo = useRef<DashboardDetail | null>(null)
  useEffect(() => {
    if (detail.detail === null && returnTo.current !== null) {
      cards.current.get(returnTo.current)?.focus()
      returnTo.current = null
    }
  }, [detail.detail])

  function open(next: DashboardDetail, objectId: number | null = null) {
    setScrollOnOpen(objectId === null)
    setFocusKey((key) => key + 1)
    detail.open(next, objectId)
  }

  function close() {
    if (detail.detail === null) {
      return
    }

    const card = cards.current.get(detail.detail)
    // A reader who scrolled down inside a long detail is taken back up to the card first, so what is below does not
    // jump up past them as the region shuts (§7.3.6).
    if (card && typeof card.scrollIntoView === 'function' && (document.getElementById(kpiDetailRegionId)?.getBoundingClientRect().top ?? 0) < 0) {
      card.scrollIntoView({ block: 'nearest' })
    }

    returnTo.current = detail.detail
    detail.close()
  }

  const figureFor = (card: DashboardDetail) => card === 'Difference'
    ? (
      <span className={costDirectionToneClass(summary.knownAmountDelta)}>
        {kpiValue(card, summary)}
        {summary.knownAmountPercentChange !== null && <span className="ml-2 text-sm">{formatPercent(summary.knownAmountPercentChange)}</span>}
      </span>
    )
    : kpiValue(card, summary)

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

      {/*
        The cards and the one region they open are one block, so the space between it and the next block is the
        page's own gap whether a detail is open or not (AC-03), and Esc anywhere in it closes the innermost thing.
      */}
      <div
        onKeyDown={(event) => {
          if (event.key === 'Escape' && detail.detail !== null && !event.defaultPrevented) {
            event.preventDefault()
            close()
          }
        }}
      >
        <KpiRow
          summary={summary}
          scope={scope}
          open={detail.detail}
          onToggle={(card) => (card === detail.detail ? close() : open(card))}
          cardRef={(card, element) => {
            if (element) cards.current.set(card, element)
            else cards.current.delete(card)
          }}
        />

        <KpiDetailSection
          title={shown === null ? '' : kpiLabel(shown, summary, scope)}
          figure={shown === null ? null : figureFor(shown)}
          open={detail.detail !== null}
          busy={busy}
          focusKey={focusKey}
          scrollOnOpen={scrollOnOpen}
          onClose={close}
          actions={onOpenAll && (
            <button
              type="button"
              onClick={onOpenAll}
              className="min-h-11 rounded-md px-2 text-sm font-medium text-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-9"
            >
              Bütün obyektlər cədvəli
            </button>
          )}
        >
          {shown === 'Amount' && <AmountDetail summary={summary} scope={scope} selection={selection} />}
          {shown === 'Baseline' && <BaselineDetail summary={summary} selection={selection} />}
          {shown === 'Difference' && (
            <DifferenceDetail
              summary={summary}
              changes={changes}
              objectId={detail.objectId}
              onSelectObject={detail.selectObject}
              onRetry={onRetryChanges}
              selection={selection}
            />
          )}
          {shown === 'Locations' && <LocationsDetail summary={summary} selection={selection} />}
        </KpiDetailSection>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
        <ExpenseDynamics trend={summary.trend} scope={scope} selectedPeriod={summary.selectedPeriod} />
        <CategoryRanked categories={summary.categories} />
      </div>

      <ChangesTable
        changes={changes}
        summary={summary}
        onOpenDetail={(row) => open('Difference', row.locationId)}
        onOpenAll={onOpenAll}
        onRetry={onRetryChanges}
      />
    </div>
  )
}
