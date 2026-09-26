import { History } from 'lucide-react'
import { useState, type Ref } from 'react'
import type { DecisionDriver, DecisionProductCounts, DecisionVariantTransition } from '../../api/decisions'
import { DirectionWord } from '../analytics/DirectionWord'
import { InfoHint } from '../analytics/InfoHint'
import {
  costDirectionToneClass,
  formatCount,
  formatDelta,
  formatMoney,
  formatMoneyDelta,
  formatPercent,
  formatPrice,
  formatQuantity,
  unknownValue,
} from '../analytics/format'
import { distinguishVariants, stateBadgeLabels } from '../analytics/labels'
import { internalSupplyLabel, missingPriceCount } from '../../pricing/labels'
import { variantTransitionNote } from '../../terminology/terms'
import { formatOrderUnit } from '../imports/labels'
import { interactiveTextClass } from '../interaction'
import { rowsUnder } from './causeFilter'
import {
  causeLabels,
  causeToneClass,
  driverFilterLabels,
  driverFilterOrder,
  driverScopeHintLabel,
  driverScopeLine,
  driverSectionTitle,
  hasEffectSplit,
  historyCueLabel,
  mixedCauseToneClass,
  priceEffectLabel,
  priceFactLabel,
  primaryCauseLine,
  productStateLine,
  quantityEffectLabel,
  quantityFactLabel,
  soleEffectLabel,
  supplyChangedDriverNote,
  totalEffectLabel,
  type DriverFilter,
} from './labels'

/** How many reasons fit on a screen before the list stops being a summary and becomes a table. */
const initialCount = 6

interface DriverListProps {
  drivers: DecisionDriver[]
  /** The compared products whose money did not move, by name. Listed under their own chip, never under "Hamısı". */
  steady: DecisionDriver[]
  /** What the counts count, so "Hamısı" can say it rather than leave the reader to guess. */
  products: DecisionProductCounts
  /** The approved variant transitions, so each of their products can say which switch it is part of (13.1a). */
  variantTransitions?: DecisionVariantTransition[]
  /**
   * The chip that is on. The page owns it, in the URL, because a reason in "Niyə dəyişib?" selects the same chip:
   * the two are one control, and a chip pressed here writes the address the same way a reason does (18.1).
   */
  filter: DriverFilter
  onFilter: (filter: DriverFilter) => void
  /** The heading a reason brings into view when it selects a chip. */
  headingRef?: Ref<HTMLHeadingElement>
  onHistory: (driver: DecisionDriver) => void
}

/**
 * The products behind the month's difference, largest money first — and, under "Məbləği dəyişməyən", every other
 * product the comparison is over.
 *
 * Each row answers "what changed about this thing?" with the two numbers it changed between, so a reader never
 * has to take the classification on trust: 2,80 → 4,10 ₼ is checkable, "qiymət artıb" is not. Only a handful
 * are shown at first — the list is a summary of the causes, and the rest are one click away.
 *
 * The separate comparison page listed every compared product; this page is now the only one (11.1), so the
 * products that moved no money are here as well. They are not reasons, so "Hamısı" and the other chips still
 * leave them out (Task 10), and their pill names their state rather than a cause.
 *
 * The products of an approved variant transition stay two rows, each with its own figures and history (13.1). Their
 * pill says "Variant dəyişib" and a note says which switch they are part of; the chips still count them by state.
 */
export function DriverList({
  drivers,
  steady,
  products,
  variantTransitions = [],
  filter,
  onFilter,
  headingRef,
  onHistory,
}: DriverListProps) {
  const [expanded, setExpanded] = useState(false)

  // A new filter — from a chip, a reason, Back or a reload — starts at the first six. Adjusted while rendering, so
  // the longer list is never drawn for the new filter, not even once.
  const [expandedFilter, setExpandedFilter] = useState(filter)
  if (expandedFilter !== filter) {
    setExpandedFilter(filter)
    setExpanded(false)
  }

  const counts = Object.fromEntries(
    driverFilterOrder.map((option) => [option, rowsUnder(option, drivers, steady).length]),
  ) as Record<DriverFilter, number>

  const filtered = rowsUnder(filter, drivers, steady)
  const shown = expanded ? filtered : filtered.slice(0, initialCount)
  const descriptions = distinguishVariants(shown.map((driver) => driver.variant))

  return (
    <section className="rounded-lg border border-slate-200 bg-white" aria-label={driverSectionTitle}>
      {/*
        Title, then what the list is over, then the chips — in that order and on their own lines. The chips used
        to sit on the title's line and took the eye first; they are a control, not the heading.
      */}
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center gap-1">
          {/* Clear of the sticky 64-pixel header when a reason brings it into view. */}
          <h2 ref={headingRef} className="scroll-mt-20 text-sm font-semibold text-slate-900">{driverSectionTitle}</h2>
          {/*
            What "Hamısı" counts, word for word as it was, behind the ⓘ rather than at the head of the list (23.3).
            Beside the heading and not inside it, so the heading's name stays the section's own.
          */}
          <InfoHint label={driverScopeHintLabel}>{driverScopeLine(products)}</InfoHint>
        </div>
        {/* The comparison page's up / down / service counts, over every compared product — the backend's. */}
        <p className="mt-0.5 text-xs text-slate-500">{productStateLine(products)}</p>

        <div className="mt-2.5 flex flex-wrap gap-1" role="group" aria-label="Dəyişiklik növü">
          {/*
            The chip that is on is always offered, even at 0: a link or a new basis can select one with nothing
            under it, and the screen must then say so rather than contradict the address bar.
          */}
          {driverFilterOrder
            .filter((option) => option === 'All' || option === filter || counts[option] > 0)
            .map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => {
                  setExpanded(false)
                  onFilter(option)
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  filter === option
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {driverFilterLabels[option]}
                <span className={filter === option ? 'ml-1 opacity-70' : 'ml-1 text-slate-400'}>
                  {formatCount(counts[option])}
                </span>
              </button>
            ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">Bu növ üzrə dəyişiklik yoxdur.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {shown.map((driver, index) => (
            <li key={driver.variant.productVariantId}>
              <Row
                driver={driver}
                description={descriptions[index]}
                filter={filter}
                transitions={variantTransitions}
                onHistory={onHistory}
              />
            </li>
          ))}
        </ul>
      )}

      {filtered.length > initialCount && (
        <div className="border-t border-slate-100 p-3 text-center">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="text-xs font-medium text-slate-700 hover:underline"
          >
            {expanded ? 'Daha az göstər' : `Hamısına bax (${formatCount(filtered.length)})`}
          </button>
        </div>
      )}
    </section>
  )
}

/** One before → after fact, as its own labelled block. */
interface Fact {
  label: string
  moved: string
  /** How far it moved — the difference for a quantity, the backend's percentage for a price. */
  delta: string | null
}

/**
 * One product, read as one story: who it is, why it moved the amount, what moved, and by how much.
 *
 * The story is kept in a column of its own and the money in a narrow one beside it, rather than pinned to the
 * two far edges of the section. A name at one end of 800 pixels and a figure at the other is a table; the two
 * questions a reader asks belong within one glance of each other.
 *
 * The whole card opens the product's history — one target, named by the cue under the total, never a second
 * link nested inside the first.
 */
function Row({ driver, description, filter, transitions, onHistory }: {
  driver: DecisionDriver
  description: string
  filter: DriverFilter
  transitions: DecisionVariantTransition[]
  onHistory: (driver: DecisionDriver) => void
}) {
  const steady = filter === 'Steady'
  // A product that moved no money has no reason to give, so it keeps its state badge and claims nothing more.
  const cause = steady ? null : primaryCauseLine(driver.category, driver.quantityImpact, driver.priceImpact)
  const pill = steady || !hasEffectSplit(driver.quantityImpact, driver.priceImpact)

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => onHistory(driver)}
      className="group flex w-full items-start gap-4 p-3 text-left hover:bg-slate-50 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-slate-900 sm:px-4"
    >
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`font-medium text-slate-900 ${interactiveTextClass}`}>{driver.variant.productName}</span>
          {/* Only where the money was never split in two: there the category is the explanation. */}
          {pill && <Pill driver={driver} steady={steady} />}
        </p>

        {description && <p className="text-xs text-slate-400">{description}</p>}

        {/* Why, in one sentence, before any figure below has to be read. */}
        {cause !== null && <p className="mt-0.5 text-sm text-slate-900">{cause}</p>}

        <Change driver={driver} transitions={transitions} />
      </div>

      {/*
        The money, in the colour of the cost's direction (9.1), with its own name under it so nobody has to work
        out what the figure is the total of. A product whose money nobody can compute shows an em dash: "0,00 ₼"
        would claim it moved nothing at all.
      */}
      <div className="w-28 shrink-0 text-right sm:w-36">
        <p className={`text-base font-semibold ${costDirectionToneClass(driver.amountImpact)}`}>
          {moneyIsUnknown(driver)
            ? <span className="text-slate-400">{unknownValue}</span>
            : (
              <>
                {formatMoneyDelta(driver.amountImpact)}
                <DirectionWord value={driver.amountImpact} />
              </>
            )}
        </p>
        <p className="text-xs text-slate-500">{totalEffectLabel}</p>
        {/* What the card does, said rather than left to a lone icon. Part of the card, never a link of its own. */}
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 group-hover:text-slate-900">
          <History className="size-3.5" aria-hidden="true" />
          {historyCueLabel}
        </p>
      </div>
    </button>
  )
}

/**
 * What the row moved between, and how much of its money each half accounts for.
 *
 * Quantity and price are both written even when one of them did not move: "8,75 → 40 paket" beside "7,27 →
 * 7,00 ₼" is what makes the reason above it checkable, and the reader can see for themselves that the money came
 * from ordering more while the unit price actually fell. Each is a labelled block rather than part of a run-on
 * line, because a reader scans down a short column faster than along a sentence — on a phone especially.
 *
 * Everything else about the product — baseline amounts, the whole history, how often it is ordered — is one
 * click away and deliberately not here.
 */
function Change({ driver, transitions }: { driver: DecisionDriver; transitions: DecisionVariantTransition[] }) {
  const notes: string[] = []

  // "Variant dəyişib: adi → lavanda ətirli" — the switch this product is one side of, in the section's own words.
  const transition = driver.category === 'VariantChange'
    ? transitions.find((item) => [...item.from, ...item.to]
      .some((side) => side.productVariantId === driver.variant.productVariantId))
    : undefined
  if (transition) {
    notes.push(variantTransitionNote(
      transition.from.map((side) => side.variantLabel),
      transition.to.map((side) => side.variantLabel),
    ))
  }

  if (!driver.priceIsComplete) {
    notes.push(missingPriceCount(driver.missingPriceItemCount))
  }

  // Not a shortfall: this material comes out of the company's own store and owes no purchase price.
  if (driver.priceNotRequiredItemCount > 0) {
    notes.push(internalSupplyLabel)
  }

  if (driver.supplyChanged) {
    notes.push(supplyChangedDriverNote)
  }

  const unit = formatOrderUnit(driver.variant.orderUnitCode, driver.variant.orderUnitName)
  const unitSuffix = unit ? ` ${unit}` : ''

  const quantity: Fact | null = driver.currentQuantity !== null && driver.baselineQuantity !== null
    ? {
      label: quantityFactLabel,
      moved: `${formatQuantity(driver.baselineQuantity)} → ${formatQuantity(driver.currentQuantity)}${unitSuffix}`,
      // The difference between the two figures above it, in their own unit. Never a new measurement.
      delta: `${formatDelta(driver.currentQuantity - driver.baselineQuantity, formatQuantity)}${unitSuffix}`,
    }
    : null

  const price: Fact | null = driver.currentUnitPrice === null && driver.baselineUnitPrice === null
    ? null
    : {
      label: priceFactLabel,
      moved: `${driver.baselineUnitPrice === null ? unknownValue : formatPrice(driver.baselineUnitPrice)} → ${
        driver.currentUnitPrice === null ? unknownValue : formatPrice(driver.currentUnitPrice)
      }`,
      // The backend's percentage, never one worked out here.
      delta: driver.unitPricePercentChange === null ? null : formatPercent(driver.unitPricePercentChange),
    }

  // A service has no comparable quantity, so its money is the only thing there is to say about it.
  const amount = driver.analyticsKind === 'AmountOrientedService'
    ? `Cəmi ${formatMoney(driver.baselineKnownAmount)} → ${formatMoney(driver.currentKnownAmount)}`
    : null

  const facts = [quantity, price].filter((fact): fact is Fact => fact !== null)

  if (facts.length === 0 && amount === null && notes.length === 0) {
    return null
  }

  return (
    <>
      {/*
        Two columns filling the story's own column, with what moved and how far on one line under each heading.
        Three stacked lines per fact and a narrower cap left a band of nothing between the facts and the money,
        which is the hole that made the row read as a table rather than as one thing.
      */}
      {facts.length > 0 && (
        <dl className="mt-1 grid max-w-xl grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-xs text-slate-500">{fact.label}</dt>
              <dd className="text-sm text-slate-900">
                {fact.moved}
                {fact.delta !== null && <span className="ml-2 text-xs text-slate-600">{fact.delta}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {amount !== null && <p className="mt-1 text-sm text-slate-900">{amount}</p>}
      <EffectPills driver={driver} />
      {notes.length > 0 && <p className="mt-1 text-xs text-slate-500">{notes.join(' · ')}</p>}
    </>
  )
}

/**
 * What kind of change the row is. A reason names its cause; a product that moved no money has no cause, so it
 * names its state ("Dəyişməyib", "Artıb" …) in the neutral slate of a pill that is not a verdict.
 */
function Pill({ driver, steady }: { driver: DecisionDriver; steady: boolean }) {
  const [label, toneClass] = steady
    ? [stateBadgeLabels[driver.state], mixedCauseToneClass]
    : [causeLabels[driver.category], causeToneClass[driver.category]]

  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClass}`}>
      {label}
    </span>
  )
}

/**
 * How much of the row's money each half accounts for: "Miqdarın təsiri +227,03 ₼ · Qiymətin təsiri −10,60 ₼".
 *
 * Each in its own direction's colour (9.1), with the sign and the screen reader's direction word beside it so the
 * colour is never the only carrier. Smaller and lighter than the total above, because these explain that figure
 * rather than compete with it.
 */
function EffectPills({ driver }: { driver: DecisionDriver }) {
  const sole = soleEffectLabel(driver.category, driver.quantityImpact, driver.priceImpact)

  // One effect, and it is the whole amount: a product ordered for the first time, or one that stopped.
  if (sole !== null) {
    return (
      <dl className="mt-1 flex flex-wrap gap-1.5">
        <EffectPill label={sole} value={driver.amountImpact} />
      </dl>
    )
  }

  if (!isMixed(driver)) {
    return null
  }

  return (
    <dl className="mt-1 flex flex-wrap gap-1.5">
      <EffectPill label={quantityEffectLabel} value={driver.quantityImpact} />
      <EffectPill label={priceEffectLabel} value={driver.priceImpact} />
    </dl>
  )
}

/**
 * One effect, named and given its money.
 *
 * The chip's own surface stays slate whichever way the money went: the direction belongs to the figure, which
 * carries it in colour (9.1), in its sign, and in the word a screen reader hears. A red or green chip would
 * shout louder than the total it is only explaining.
 */
function EffectPill({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="inline-flex items-baseline gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs ring-1 ring-inset ring-slate-200">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium ${costDirectionToneClass(value)}`}>
        {formatMoneyDelta(value)}
        <DirectionWord value={value} />
      </dd>
    </div>
  )
}

/** Both effects are there and both moved: the row is not a quantity change or a price change, but both. */
function isMixed(driver: DecisionDriver): boolean {
  return driver.quantityImpact !== null && driver.quantityImpact !== 0
    && driver.priceImpact !== null && driver.priceImpact !== 0
}

/**
 * No money that can be shown: a zero whose price is partly unknown, or a zero with no known amount on either side
 * — a product listed because it appeared or disappeared, unpriced or supplied from the company's own store.
 */
function moneyIsUnknown(driver: DecisionDriver): boolean {
  return driver.amountImpact === 0
    && (!driver.priceIsComplete || (driver.currentKnownAmount === null && driver.baselineKnownAmount === null))
}
