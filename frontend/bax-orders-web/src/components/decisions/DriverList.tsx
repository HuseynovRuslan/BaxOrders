import { useState } from 'react'
import type { DecisionDriver, DecisionProductCounts } from '../../api/decisions'
import { DirectionWord } from '../analytics/DirectionWord'
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
import { formatOrderUnit } from '../imports/labels'
import {
  causeLabels,
  causeToneClass,
  driverFilterLabels,
  driverFilterOrder,
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
 */
export function DriverList({ drivers, steady, products, onHistory }: DriverListProps) {
  const [filter, setFilter] = useState<DriverFilter>('All')
  const [expanded, setExpanded] = useState(false)

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
          <h2 className="text-sm font-semibold text-slate-900">Əsas dəyişikliklər</h2>
          <p className="mt-0.5 text-xs text-slate-500">{driverScopeLine(products)}</p>
          {/* The comparison page's up / down / service counts, over every compared product — the backend's. */}
          <p className="mt-0.5 text-xs text-slate-500">{productStateLine(products)}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-1" role="group" aria-label="Dəyişiklik növü">
          {driverFilterOrder
            .filter((option) => option === 'All' || counts[option] > 0)
            .map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => {
                  setFilter(option)
                  setExpanded(false)
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
              */}
              <button
                type="button"
                onClick={() => onHistory(driver)}
                className="flex w-full flex-wrap items-start gap-x-4 gap-y-1 p-3 text-left hover:bg-slate-50 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-slate-900 sm:px-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-slate-900">{driver.variant.productName}</span>
                    <Pill driver={driver} steady={filter === 'Steady'} />
                  </p>
                  <p className="text-xs text-slate-400">{descriptions[index]}</p>
                  <Change driver={driver} />
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
function Change({ driver }: { driver: DecisionDriver }) {
  const notes: string[] = []

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

/**
 * The rows under a chip. Each chip's count is the number of rows this leaves, so the two can never disagree.
 * "Məbləği dəyişməyən" is the steady list itself; every other chip filters the drivers.
 */
function rowsUnder(filter: DriverFilter, drivers: DecisionDriver[], steady: DecisionDriver[]): DecisionDriver[] {
  return filter === 'Steady' ? steady : drivers.filter((driver) => matches(driver, filter))
}

/**
 * Whether a driver belongs under a chip. "Yeni məhsullar" and "Bu ay yazılmayan məhsullar" go by the product's
 * state — the comparison page's rule — rather than by where its money was filed, so both pages count the same
 * products; a new product with a missing price is therefore under both "Yeni məhsullar" and "Qiymət yoxdur".
 */
function matches(driver: DecisionDriver, filter: DriverFilter): boolean {
  switch (filter) {
    case 'All':
      return true
    // A driver moved money, appeared, disappeared or owes a price — it is never steady.
    case 'Steady':
      return false
    // A product that moved both ways appears under both, and its own effect is what each total counts.
    case 'PriceChange':
      return driver.priceImpact !== null && driver.priceImpact !== 0
    case 'QuantityChange':
      return driver.quantityImpact !== null && driver.quantityImpact !== 0
    case 'New':
      return driver.state === 'New'
    case 'NoLongerOrdered':
      return driver.state === 'NoLongerOrdered'
    case 'MissingPrice':
      return !driver.priceIsComplete
  }
}
