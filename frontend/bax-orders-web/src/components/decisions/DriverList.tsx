import { History } from 'lucide-react'
import { useState, type Ref } from 'react'
import type { DecisionDriver, DecisionProductCounts, DecisionVariantTransition } from '../../api/decisions'
import { DirectionWord } from '../analytics/DirectionWord'
import { InfoHint } from '../analytics/InfoHint'
import {
  costDirectionToneClass,
  formatCount,
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
  mixedCauseLabel,
  mixedCauseToneClass,
  pricePartLabel,
  productStateLine,
  quantityPartLabel,
  supplyChangedDriverNote,
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
    <section className="rounded-lg border border-slate-200 bg-white" aria-label="Əsas dəyişikliklər">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            {/* Clear of the sticky 64-pixel header when a reason brings it into view. */}
            <h2 ref={headingRef} className="scroll-mt-20 text-sm font-semibold text-slate-900">Əsas dəyişikliklər</h2>
            {/*
              What "Hamısı" counts, word for word as it was, behind the ⓘ rather than at the head of the list (23.3).
              Beside the heading and not inside it, so the heading's name stays «Əsas dəyişikliklər».
            */}
            <InfoHint label={driverScopeHintLabel}>{driverScopeLine(products)}</InfoHint>
          </div>
          {/* The comparison page's up / down / service counts, over every compared product — the backend's. */}
          <p className="mt-0.5 text-xs text-slate-500">{productStateLine(products)}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-1" role="group" aria-label="Dəyişiklik növü">
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
              {/*
                The whole row opens the product, not just its name: the name was a small target for the one
                thing a reader wants to do from here, and the figures beside it are what makes them want to.
                The name says so — it underlines with the row, and the clock beside it says "its history" without
                a new word — and a screen reader hears that the row opens a dialog.
              */}
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => onHistory(driver)}
                className="group flex w-full flex-wrap items-start gap-x-4 gap-y-1 p-3 text-left hover:bg-slate-50 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-slate-900 sm:px-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`font-medium text-slate-900 ${interactiveTextClass}`}>{driver.variant.productName}</span>
                    <History className="size-3.5 shrink-0 text-slate-400 group-hover:text-slate-700" aria-hidden="true" />
                    <Pill driver={driver} steady={filter === 'Steady'} />
                  </p>
                  <p className="text-xs text-slate-400">{descriptions[index]}</p>
                  <Change driver={driver} transitions={variantTransitions} />
                </div>

                {/*
                  What it did to the money — the second of the two questions this row answers — in the colour
                  of the cost's direction (9.1). A product whose money nobody can compute shows an em dash:
                  "0,00 ₼" would claim it moved nothing at all.
                */}
                <p className={`shrink-0 whitespace-nowrap text-right text-sm font-semibold ${costDirectionToneClass(driver.amountImpact)}`}>
                  {moneyIsUnknown(driver)
                    ? <span className="text-slate-400">{unknownValue}</span>
                    : (
                      <>
                        {formatMoneyDelta(driver.amountImpact)}
                        <DirectionWord value={driver.amountImpact} />
                      </>
                    )}
                </p>
              </button>
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

/**
 * The two numbers the row moved between, under the money they moved it by.
 *
 * Quantity and price are both written even when one of them did not move, because "20 → 40 · Qiymət 2,00 →
 * 2,00 ₼" is what makes the effect beside it checkable: the reader can see that the money came from the
 * quantity and not from the price. When both moved, that line cannot say how much each accounts for, so the
 * split follows it on a line of its own. Everything else about the product — baseline amounts, the whole
 * history, how often it is ordered — is one click away and deliberately not here.
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
  const quantity = driver.currentQuantity !== null && driver.baselineQuantity !== null
    ? `${formatQuantity(driver.baselineQuantity)} → ${formatQuantity(driver.currentQuantity)}${unit ? ` ${unit}` : ''}`
    : null

  // A service has no comparable quantity, so its money is the only thing there is to say about it.
  const amount = driver.analyticsKind === 'AmountOrientedService'
    ? `Cəmi ${formatMoney(driver.baselineKnownAmount)} → ${formatMoney(driver.currentKnownAmount)}`
    : null

  const price = driver.currentUnitPrice === null && driver.baselineUnitPrice === null
    ? null
    : `Qiymət ${driver.baselineUnitPrice === null ? unknownValue : formatPrice(driver.baselineUnitPrice)} → ${
      driver.currentUnitPrice === null ? unknownValue : formatPrice(driver.currentUnitPrice)
    }${driver.unitPricePercentChange ? ` (${formatPercent(driver.unitPricePercentChange)})` : ''}`

  const facts = [quantity, price, amount].filter((part): part is string => part !== null)

  if (facts.length === 0 && notes.length === 0) {
    return null
  }

  return (
    <>
      {facts.length > 0 && <p className="mt-0.5 text-xs text-slate-600">{facts.join(' · ')}</p>}
      {isMixed(driver) && <Split driver={driver} />}
      {notes.length > 0 && <p className="mt-0.5 text-xs text-slate-500">{notes.join(' · ')}</p>}
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
    : isMixed(driver)
      ? [mixedCauseLabel, mixedCauseToneClass]
      : [causeLabels[driver.category], causeToneClass[driver.category]]

  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClass}`}>
      {label}
    </span>
  )
}

/** "Miqdar +160,00 ₼ · Qiymət +7,00 ₼" — each part of a mixed row's money, in its own direction's colour (9.1). */
function Split({ driver }: { driver: DecisionDriver }) {
  return (
    <p className="mt-0.5 text-xs text-slate-600">
      {quantityPartLabel}{' '}
      <span className={`font-medium ${costDirectionToneClass(driver.quantityImpact)}`}>
        {formatMoneyDelta(driver.quantityImpact)}
        <DirectionWord value={driver.quantityImpact} />
      </span>
      {' · '}
      {pricePartLabel}{' '}
      <span className={`font-medium ${costDirectionToneClass(driver.priceImpact)}`}>
        {formatMoneyDelta(driver.priceImpact)}
        <DirectionWord value={driver.priceImpact} />
      </span>
    </p>
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
