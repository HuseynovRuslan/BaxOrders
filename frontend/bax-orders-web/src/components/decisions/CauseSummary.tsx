import type { AnalyticsComparisonBasis } from '../../api/analytics'
import type {
  CauseCategory,
  DecisionCause,
  DecisionDecomposition,
  DecisionDriver,
  DecisionVariantTransition,
} from '../../api/decisions'
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
import { monthlyComparisonScopeLabel } from '../../orderLines/lineType'
import {
  costDecreasedLabel,
  costIncreasedLabel,
  fromProductsNoun,
  unexplainedPartNote,
  variantTransitionLine,
} from '../../terminology/terms'
import { driverFilterForCause, rowsUnder } from './causeFilter'
import {
  causeHints,
  causeLabels,
  causeListCountNote,
  causeOrder,
  causeTieOrder,
  supplyChangedDriverNote,
  type DriverFilter,
} from './labels'

interface CauseSummaryProps {
  decomposition: DecisionDecomposition
  /** The basis the reader chose. The parts are against it, so the section names it rather than "keçən ay". */
  basis: AnalyticsComparisonBasis
  windowPeriods: readonly string[]
  /** The chip "Əsas dəyişikliklər" is showing. The reason whose chip it is reads as pressed. */
  selected: DriverFilter
  /** A reason pressed: its chip — or "Hamısı" when its chip was already the one on (18.1). */
  onSelect: (filter: DriverFilter) => void
}

/** What a reason with a list of its own needs to open it. A reason without one is `null`, and stays inert. */
interface ReasonList {
  pressed: boolean
  /** Said under the reason when its list counts a different number of products than the reason does (18.3). */
  note: string | null
  onToggle: () => void
}

/**
 * "Niyə dəyişib?" — the month's difference broken into the causes that add up to it.
 *
 * The largest part comes first and is marked "Əsas səbəb", in the dashboard card's own words: the reader goes
 * from "how much did it change" straight to "mostly because of this". Every bar is a share of that largest part,
 * so the widths compare with one another directly. A cause that moved nothing is left out rather than drawn as
 * an empty row: six labelled zeros would be six things to read past before reaching the one that matters.
 *
 * The one exception is "Variant dəyişib" (13.1a). It is there whenever an approved variant transition is, even at
 * 0,00 ₼, because that line is the answer to "why are there a new product and a dropped one?" — one line per
 * family under its chip, in the brief's own words. A row of 0,00 ₼ is never the "Əsas səbəb".
 *
 * A reason is also the way to the products behind it (18.1): pressing it selects its chip in "Əsas dəyişikliklər",
 * and pressing it again clears the chip. Only the five reasons with a chip of their own do this, and only while that
 * chip has products under it; the others look and behave exactly as they did (18.2).
 */
export function CauseSummary({ decomposition, basis, windowPeriods, selected, onSelect }: CauseSummaryProps) {
  const transitions = decomposition.variantTransitions
  const moved = decomposition.categories.filter((category) => category.amount !== 0)
  const shown = decomposition.categories
    .filter((category) => category.amount !== 0 || (category.category === 'VariantChange' && transitions.length > 0))
    .sort(bySizeThenDashboardOrder)
  const largest = shown.length === 0 ? 0 : Math.abs(shown[0].amount)
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
          {/*
            Which month is being compared, and — since Task 22 — which lines. An ad-hoc purchase is not
            recurring demand and is never compared as though it were, so the screen says so once, quietly,
            rather than leaving a reader to wonder why a month they know had a big one-off reads as flat.
          */}
          <span className="text-xs text-slate-500">{caption}</span>
          <span className="text-xs text-slate-400">{monthlyComparisonScopeLabel}</span>
        </div>
        <p className="whitespace-nowrap text-sm text-slate-700">
          Cəmi <Amount value={decomposition.totalAmountImpact} className="font-semibold" />
        </p>
      </div>

      {moved.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">{`${caption} məbləğ dəyişməyib.`}</p>
      ) : (
        // Said once in words, so the colour is never the only thing carrying the direction.
        <p className="mt-1 text-xs text-slate-500">{directionLegend}</p>
      )}

      {shown.length > 0 && (
        <ul className="mt-3 space-y-2">
          {shown.map((category, index) => (
            <CauseRow
              key={category.category}
              cause={category}
              isPrimary={index === 0 && category.amount !== 0}
              largest={largest}
              supplyChanged={
                category.category === 'InternalSupply' && decomposition.supplyChangedVariantCount > 0
              }
              transitions={category.category === 'VariantChange' ? transitions : []}
              list={listOf(category, decomposition.drivers, decomposition.steady, selected, onSelect)}
            />
          ))}
        </ul>
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
  transitions,
  list,
}: {
  cause: DecisionCause
  isPrimary: boolean
  largest: number
  supplyChanged: boolean
  /** The approved variant transitions this part is made of — only ever under "Variant dəyişib". */
  transitions: DecisionVariantTransition[]
  list: ReasonList | null
}) {
  const pill = (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 ring-1 ring-inset ${
        isPrimary ? 'text-sm font-semibold' : 'text-xs font-medium'
      } ${chipClass(cause.category)}`}
    >
      {causeLabels[cause.category]}
    </span>
  )
  const hint = (
    <InfoHint label={`${causeLabels[cause.category]} nədir?`}>
      {causeHints[cause.category]}
    </InfoHint>
  )

  return (
    <li data-primary={isPrimary ? 'true' : undefined} className={rowClass(isPrimary, list)}>
      {isPrimary && <p className="text-xs text-slate-500">Əsas səbəb</p>}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="flex flex-wrap items-center gap-1 text-sm text-slate-700">
          {list === null ? pill : (
            /*
              The whole row is one target, but it cannot itself be a button: the ⓘ inside it already is one. So the
              button is around the pill, and its layer stretches over the row.
            */
            <button
              type="button"
              aria-label={`${causeLabels[cause.category]}, ${formatMoneyDelta(cause.amount)}`}
              aria-pressed={list.pressed}
              onClick={list.onToggle}
              className={reasonButtonClass}
            >
              {pill}
            </button>
          )}
          {/*
            Positioned, and after the button, so it paints — and takes clicks — above the button's layer. No z-index:
            one would cap the note's own z-[60] beneath the sticky header and the phone's decision bar (both z-20).
          */}
          {list === null ? hint : <span className="relative inline-flex">{hint}</span>}
          {/* A product that changed supply form is what this part is made of; the part says so. */}
          {supplyChanged && <span className="text-xs text-slate-500">{supplyChangedDriverNote}</span>}
          {/* The products whose money is in this part — not a count of new products, so not worded like one. */}
          <span className="text-xs text-slate-400">{formatCount(cause.variantCount)} {fromProductsNoun}</span>
        </p>
        <p className={`whitespace-nowrap ${isPrimary ? 'text-lg font-semibold' : 'text-sm font-medium'}`}>
          <Amount value={cause.amount} />
        </p>
      </div>

      {/* What the list counts, when it is not the number beside the reason. The figures themselves are untouched. */}
      {list?.note && <p className="mt-1 text-xs text-slate-500">{list.note}</p>}

      {/*
        One line per family, in the brief's own words: "Sabun elano — variant dəyişib: adi → lavanda ətirli". The
        words wrap on a phone; the amount beside them never breaks.
      */}
      {transitions.map((transition) => (
        <p
          key={transition.baseProductId}
          data-variant-transition=""
          className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs text-slate-600"
        >
          <span className="min-w-0 break-words">
            {variantTransitionLine(
              transition.baseProductName,
              transition.from.map((side) => side.variantLabel),
              transition.to.map((side) => side.variantLabel),
            )}
          </span>
          <Amount value={transition.amountImpact} className="whitespace-nowrap font-medium" />
        </p>
      ))}

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
 * The list a reason opens, or null when it has none: no chip of its own, or a chip with nothing under it — a row
 * that promised a list and opened an empty one would be worse than a row that promised nothing.
 */
function listOf(
  cause: DecisionCause,
  drivers: DecisionDriver[],
  steady: DecisionDriver[],
  selected: DriverFilter,
  onSelect: (filter: DriverFilter) => void,
): ReasonList | null {
  const filter = driverFilterForCause(cause.category)
  if (filter === null) {
    return null
  }

  // The chip's own rows, by the chip's own rule, so what is said here is what the chip will show.
  const rows = rowsUnder(filter, drivers, steady)
  if (rows.length === 0) {
    return null
  }

  return {
    pressed: selected === filter,
    note: rows.length === cause.variantCount
      ? null
      : causeListCountNote(filter, rows.length, otherParts(cause, filter, rows)),
    onToggle: () => onSelect(selected === filter ? 'All' : filter),
  }
}

/**
 * The parts whose money the list's other products are in. Only the two chips that go by the product's state can say
 * this: "Yeni məhsullar" lists a new product whose money is in «Qiymət yoxdur» as well. The chips that go by an
 * effect cannot — a product that moved both ways has money in two parts at once, and naming one would not be true.
 */
function otherParts(cause: DecisionCause, filter: DriverFilter, rows: DecisionDriver[]): CauseCategory[] {
  if (filter !== 'New' && filter !== 'NoLongerOrdered') {
    return []
  }

  return causeOrder.filter((category) => category !== cause.category && rows.some((row) => row.category === category))
}

/**
 * A reason that opens a list adds only what says so: the pointer, a hover one step darker than its resting colour,
 * and an outline when its chip is on. Outline, not ring: the main cause already wears a ring, and it stays as it is.
 * A reason that opens nothing gains none of these.
 */
function rowClass(isPrimary: boolean, list: ReasonList | null): string | undefined {
  const classes = [
    isPrimary ? 'rounded-md bg-slate-50 p-2 ring-1 ring-inset ring-slate-200' : null,
    list === null ? null : `relative cursor-pointer ${isPrimary ? 'hover:bg-slate-100' : 'rounded-md hover:bg-slate-50'}`,
    list?.pressed ? 'outline-2 outline-offset-2 outline-slate-900' : null,
  ].filter((value): value is string => value !== null)

  return classes.length === 0 ? undefined : classes.join(' ')
}

/**
 * The button around a reason's pill. Its `before:` layer covers the whole row, so the row is one target, and the
 * keyboard's focus outline is drawn on that layer — around the row — rather than around the pill alone.
 */
const reasonButtonClass = 'cursor-pointer before:absolute before:inset-0 before:rounded-md focus-visible:outline-hidden '
  + 'focus-visible:before:outline-2 focus-visible:before:-outline-offset-2 focus-visible:before:outline-slate-900'

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
