import type { AnalyticsComparisonBasis } from '../../api/analytics'
import type { CauseCategory, DecisionCause, DecisionDecomposition } from '../../api/decisions'
import {
  costDirectionBarClass,
  costDirectionToneClass,
  describeBasisCaption,
  formatCount,
  formatMoneyDelta,
} from '../analytics/format'
import { InfoHint } from '../analytics/InfoHint'
import { WarningNote } from '../WarningNote'
import { warningChipClass } from '../../pricing/labels'
import {
  costDecreasedLabel,
  costIncreasedLabel,
  productNoun,
  unexplainedPartNote,
} from '../../terminology/terms'
import { causeHints, causeLabels, causeTieOrder, supplyChangedDriverNote } from './labels'

interface CauseSummaryProps {
  decomposition: DecisionDecomposition
  /** The basis the reader chose. The parts are against it, so the section names it rather than "keçən ay". */
  basis: AnalyticsComparisonBasis
  windowPeriods: readonly string[]
}

/**
 * "Niyə dəyişib?" — the month's difference broken into the causes that add up to it.
 *
 * The largest part comes first and is marked "Əsas səbəb", in the dashboard card's own words: the reader goes
 * from "how much did it change" straight to "mostly because of this". Every bar is a share of that largest part,
 * so the widths compare with one another directly. A cause that moved nothing is left out rather than drawn as
 * an empty row: six labelled zeros would be six things to read past before reaching the one that matters.
 */
export function CauseSummary({ decomposition, basis, windowPeriods }: CauseSummaryProps) {
  const moved = decomposition.categories
    .filter((category) => category.amount !== 0)
    .sort(bySizeThenDashboardOrder)
  const largest = moved.length === 0 ? 0 : Math.abs(moved[0].amount)
  const caption = describeBasisCaption(basis, windowPeriods)

  // The unexplained part is the money no price can be put to. Only that is worth a warning: a product priced
  // on neither side moves no known money, and the parts above then add up to "Cəmi" to the qəpik — saying the
  // change cannot be explained would contradict the arithmetic on the same screen.
  const unexplained = decomposition.categories
    .find((category) => category.category === 'UnattributedDueToMissingPrice')?.amount ?? 0
  const unexplainedProducts = decomposition.drivers
    .filter((driver) => driver.category === 'UnattributedDueToMissingPrice')
    .map((driver) => driver.variant.productName)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4" aria-label="Dəyişikliyin səbəbləri">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h2 className="text-sm font-semibold text-slate-900">Niyə dəyişib?</h2>
          <span className="text-xs text-slate-500">{caption}</span>
        </div>
        <p className="whitespace-nowrap text-sm text-slate-700">
          Cəmi <Amount value={decomposition.totalAmountImpact} className="font-semibold" />
        </p>
      </div>

      {moved.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">{`${caption} məbləğ dəyişməyib.`}</p>
      ) : (
        <>
          {/* Said once in words, so the colour is never the only thing carrying the direction. */}
          <p className="mt-1 text-xs text-slate-500">{directionLegend}</p>

          <ul className="mt-3 space-y-2">
            {moved.map((category, index) => (
              <CauseRow
                key={category.category}
                cause={category}
                isPrimary={index === 0}
                largest={largest}
                supplyChanged={
                  category.category === 'InternalSupply' && decomposition.supplyChangedVariantCount > 0
                }
              />
            ))}
          </ul>
        </>
      )}

      {unexplained !== 0 && (
        <div className="mt-3">
          <WarningNote>{unexplainedPartNote(formatMoneyDelta(unexplained), unexplainedProducts)}</WarningNote>
        </div>
      )}
    </section>
  )
}

function CauseRow({
  cause,
  isPrimary,
  largest,
  supplyChanged,
}: {
  cause: DecisionCause
  isPrimary: boolean
  largest: number
  supplyChanged: boolean
}) {
  return (
    <li
      data-primary={isPrimary ? 'true' : undefined}
      className={isPrimary ? 'rounded-md bg-slate-50 p-2 ring-1 ring-inset ring-slate-200' : undefined}
    >
      {isPrimary && <p className="text-xs text-slate-500">Əsas səbəb</p>}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="flex flex-wrap items-center gap-1 text-sm text-slate-700">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 ring-1 ring-inset ${
              isPrimary ? 'text-sm font-semibold' : 'text-xs font-medium'
            } ${chipClass(cause.category)}`}
          >
            {causeLabels[cause.category]}
          </span>
          <InfoHint label={`${causeLabels[cause.category]} nədir?`}>
            {causeHints[cause.category]}
          </InfoHint>
          {/* A product that changed supply form is what this part is made of; the part says so. */}
          {supplyChanged && <span className="text-xs text-slate-500">{supplyChangedDriverNote}</span>}
          <span className="text-xs text-slate-400">{formatCount(cause.variantCount)} {productNoun}</span>
        </p>
        <p className={`whitespace-nowrap ${isPrimary ? 'text-lg font-semibold' : 'text-sm font-medium'}`}>
          <Amount value={cause.amount} />
        </p>
      </div>

      {/* Width is share of the largest cause, so the bars compare with one another and with nothing else. */}
      <div className={`mt-1 overflow-hidden rounded-full bg-slate-100 ${isPrimary ? 'h-2' : 'h-1.5'}`}>
        <div
          className={`h-full rounded-full ${costDirectionBarClass(cause.amount)}`}
          style={{ width: `${largest === 0 ? 0 : (Math.abs(cause.amount) / largest) * 100}%` }}
        />
      </div>
    </li>
  )
}

/** A signed amount in the colour of its direction (9.1), with the direction also said to a screen reader. */
function Amount({ value, className = '' }: { value: number; className?: string }) {
  const direction = value > 0 ? costIncreasedLabel : value < 0 ? costDecreasedLabel : null

  return (
    <span className={`${className} ${costDirectionToneClass(value)}`.trim()}>
      {formatMoneyDelta(value)}
      {direction && <span className="sr-only">, {direction}</span>}
    </span>
  )
}

const directionLegend = `Qırmızı — ${costIncreasedLabel} · Yaşıl — ${costDecreasedLabel}`

/**
 * Largest money first, either direction. Two parts of the same size fall in the dashboard's order, so this
 * page's first part is the dashboard card's "Əsas səbəb" for the same order and basis.
 */
function bySizeThenDashboardOrder(left: DecisionCause, right: DecisionCause): number {
  return Math.abs(right.amount) - Math.abs(left.amount)
    || causeTieOrder.indexOf(left.category) - causeTieOrder.indexOf(right.category)
}

/**
 * The chips are neutral: red and green say the direction here, and a third set of colours for the kind of cause
 * would compete with them. The one exception is "Qiymət yoxdur", amber as it is on every screen — a missing
 * price, not a direction. Internal supply is never amber.
 */
const neutralChipClass = 'bg-slate-100 text-slate-700 ring-slate-300'

function chipClass(category: CauseCategory): string {
  return category === 'UnattributedDueToMissingPrice' ? warningChipClass : neutralChipClass
}
