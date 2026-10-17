import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { AnalyticsScope, ManagementDashboardSummary } from '../../../api/dashboard'
import type { DashboardDetail } from '../../../analytics/dashboardDetail'
import { scopeAmountLabels } from '../../../analytics/scope'
import { costDecreasedLabel, costIncreasedLabel } from '../../../terminology/terms'
import {
  basisLabels,
  costDirectionTintClass,
  costDirectionToneClass,
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatMonthRange,
  formatPercent,
} from '../../analytics/format'
import { detailsLabel } from '../labels'

/** The id of the one region the four cards open (01-audit §7.2). */
export const kpiDetailRegionId = 'kpi-detail'

/**
 * The month in four figures, as the approved design orders them: what was spent, what it is measured against,
 * the difference between them, and how much of the company is in it.
 *
 * Each card opens its own detail under the row (01-audit §7; AC-01) — a disclosure button, not a tab: «all
 * closed» is the ordinary state and a second click closes. The cards never move or change size when a detail
 * opens, closes or switches (AC-02): the open card is marked with a ring, which takes no space, and the line that
 * says «open» or «closed» is always there.
 *
 * The third card is the only one that carries colour, and it carries this product's meaning (9.1): a cost that rose
 * is red, a cost that fell is green — and the word beside the percentage says which, so the colour is never
 * reading alone.
 *
 * Four across on a wide screen, two by two below that — on a phone too (O-2), in a compact card — and one under
 * another only where two would not fit: a narrow phone, or a phone whose reader has made the text larger, because
 * the switches are measured in `rem` against the row's own width (container queries), so a larger text needs a
 * wider row. Both switches are container queries on purpose: a viewport `xl:` beside a container `@xs:` loses to it
 * in the cascade, which kept a wide screen at two columns.
 */
export function KpiRow({ summary, scope, open = null, onToggle, cardRef }: {
  summary: ManagementDashboardSummary
  scope: AnalyticsScope
  /** The card whose detail is open under the row. */
  open?: DashboardDetail | null
  /** Without it the cards are figures only, as they were before they opened anything. */
  onToggle?: (detail: DashboardDetail) => void
  /** Each card's button, so focus can return to the card a detail was closed from. */
  cardRef?: (detail: DashboardDetail, element: HTMLButtonElement | null) => void
}) {
  const card = (detail: DashboardDetail) => ({
    detail,
    open: open === detail,
    onToggle: onToggle ? () => onToggle(detail) : undefined,
    buttonRef: cardRef ? (element: HTMLButtonElement | null) => cardRef(detail, element) : undefined,
  })

  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-3 @xs:grid-cols-2 @4xl:grid-cols-4 sm:gap-4">
        <SelectedAmount {...card('Amount')} summary={summary} scope={scope} />
        <BaselineAmount {...card('Baseline')} summary={summary} />
        <Difference {...card('Difference')} summary={summary} />
        <ActiveLocations {...card('Locations')} summary={summary} />
      </div>
    </div>
  )
}

/**
 * A card's name and figure, in one place: the card shows them and the detail under the row repeats them, and the
 * two must be the same words and the same figure to the qəpik.
 */
export function kpiLabel(detail: DashboardDetail, summary: ManagementDashboardSummary, scope: AnalyticsScope): string {
  switch (detail) {
    case 'Amount':
      return scopeAmountLabels[scope]
    case 'Baseline':
      return `Müqayisə dövrü · ${basisLabels[summary.basis]}`
    case 'Difference':
      return 'Fərq'
    case 'Locations':
      return 'Aktiv obyektlər'
  }
}

export function kpiValue(detail: DashboardDetail, summary: ManagementDashboardSummary): string {
  switch (detail) {
    case 'Amount':
      return formatMoney(summary.current.knownAmount)
    case 'Baseline':
      return formatMoney(summary.baseline.knownAmount)
    case 'Difference':
      return summary.knownAmountDelta === null ? '—' : formatMoneyDelta(summary.knownAmountDelta)
    case 'Locations':
      return `${formatCount(summary.locationsWithCurrentRequest)} / ${formatCount(summary.locationCount)} obyekt`
  }
}

interface CardControl {
  detail: DashboardDetail
  open: boolean
  onToggle?: () => void
  buttonRef?: (element: HTMLButtonElement | null) => void
}

/**
 * One figure: a label, the number, and what qualifies it.
 *
 * The label is the card's button and the button's hit area is the whole card (its `::after`), so the card reads as
 * one thing to a pointer and as a heading with a button to a screen reader — a heading cannot sit inside a button.
 *
 * The number is sized to its card (container units), so on a two-by-two phone it shrinks rather than breaking or
 * being cut; it never wraps.
 */
function KpiCard({ control, label, value, valueClass, children }: {
  control: CardControl
  label: string
  value: string
  valueClass?: string
  children?: ReactNode
}) {
  const { detail, open, onToggle, buttonRef } = control
  const valueId = `kpi-${detail}-value`
  const noteId = `kpi-${detail}-note`
  const interactive = onToggle !== undefined

  return (
    <section
      className={`@container relative flex h-full min-h-[7.5rem] min-w-0 flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 transition-colors sm:min-h-[140px] sm:gap-3 sm:p-6 ${
        interactive ? 'hover:bg-surface-container-low has-[button:active]:bg-surface-container' : ''
      } ${open ? 'ring-2 ring-inset ring-primary' : ''}`}
    >
      <h3 className="line-clamp-2 font-label-md text-label-md text-on-surface-variant">
        {interactive ? (
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={open}
            aria-controls={kpiDetailRegionId}
            aria-describedby={`${valueId} ${noteId}`}
            onClick={onToggle}
            className="text-left after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary focus-visible:after:ring-offset-2"
          >
            {label}
          </button>
        ) : label}
      </h3>
      <p
        id={valueId}
        className={`tabular whitespace-nowrap font-metric-val text-[clamp(1rem,12.5cqi,1.75rem)] font-bold leading-[1.4] ${valueClass ?? 'text-on-surface'}`}
      >
        {value}
      </p>
      <div id={noteId} className="flex flex-col gap-1 text-xs text-on-surface-variant">{children}</div>
      {interactive && (
        // Always there, open or closed, so opening a card never changes its height.
        <span aria-hidden="true" className="mt-auto inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-on-surface-variant">
          {open ? 'Bağla' : detailsLabel}
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </span>
      )}
    </section>
  )
}

function SelectedAmount({ summary, scope, ...control }: CardControl & { summary: ManagementDashboardSummary, scope: AnalyticsScope }) {
  return (
    <KpiCard control={control} label={kpiLabel('Amount', summary, scope)} value={kpiValue('Amount', summary)}>
      {/* What the figure leaves out, said where the figure is rather than in a footnote. */}
      {summary.current.missingPriceItemCount > 0 && (
        <p>Qiyməti olmayan sətirlər bu məbləğə daxil deyil.</p>
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
function BaselineAmount({ summary, ...control }: CardControl & { summary: ManagementDashboardSummary }) {
  const months = formatMonthRange(summary.baselinePeriods)

  return (
    <KpiCard
      control={control}
      label={kpiLabel('Baseline', summary, 'Monthly')}
      value={kpiValue('Baseline', summary)}
    >
      {months && (
        <p className="w-fit rounded bg-surface-container-low px-2 py-1 font-semibold">{months}</p>
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
function Difference({ summary, ...control }: CardControl & { summary: ManagementDashboardSummary }) {
  const delta = summary.knownAmountDelta
  const rising = delta !== null && delta > 0
  const falling = delta !== null && delta < 0

  const tone = costDirectionToneClass(delta)
  const direction = rising ? costIncreasedLabel : falling ? costDecreasedLabel : null

  const outside = summary.locationsWithCurrentRequest - summary.locationsWithComparison

  return (
    <KpiCard control={control} label={kpiLabel('Difference', summary, 'Monthly')} value={kpiValue('Difference', summary)} valueClass={tone}>
      <div className="flex flex-wrap items-center gap-2">
        {summary.knownAmountPercentChange !== null && (
          <span className={`tabular rounded px-2 py-1 font-semibold ${costDirectionTintClass(delta)} ${tone}`}>
            {formatPercent(summary.knownAmountPercentChange)}
          </span>
        )}
        {direction && <span>{direction}</span>}
      </div>
      {outside > 0 && (
        <p>
          {/* The compact phone card keeps the half of the sentence the reader acts on. */}
          <span className="max-sm:hidden">{formatCount(summary.locationsWithComparison)} obyekt üzrə — </span>
          {formatCount(outside)} obyekt müqayisəyə daxil deyil
        </p>
      )}
    </KpiCard>
  )
}

function ActiveLocations({ summary, ...control }: CardControl & { summary: ManagementDashboardSummary }) {
  return (
    <KpiCard
      control={control}
      label={kpiLabel('Locations', summary, 'Monthly')}
      value={kpiValue('Locations', summary)}
    >
      {summary.locationsWithoutCurrentRequest > 0 && (
        <p>{formatCount(summary.locationsWithoutCurrentRequest)} obyektdə bu ay sifariş yoxdur</p>
      )}
    </KpiCard>
  )
}
