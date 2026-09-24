import { useState } from 'react'
import type { DecisionDriver } from '../../api/decisions'
import {
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatPercent,
  formatPrice,
  formatQuantity,
  signedToneClass,
  unknownValue,
} from '../analytics/format'
import { formatVariantLine } from '../analytics/labels'
import { internalSupplyLabel, missingPriceCount } from '../../pricing/labels'
import { formatOrderUnit } from '../imports/labels'
import {
  causeLabels,
  causeToneClass,
  driverFilterLabels,
  driverFilterOrder,
  supplyChangedDriverNote,
  type DriverFilter,
} from './labels'

/** How many reasons fit on a screen before the list stops being a summary and becomes a table. */
const initialCount = 6

interface DriverListProps {
  drivers: DecisionDriver[]
  onHistory: (driver: DecisionDriver) => void
}

/**
 * The products behind the month's difference, largest money first.
 *
 * Each row answers "what changed about this thing?" with the two numbers it changed between, so a reader never
 * has to take the classification on trust: 2,80 → 4,10 ₼ is checkable, "qiymət artıb" is not. Only a handful
 * are shown at first — the list is a summary of the causes, and the rest are one click away.
 */
export function DriverList({ drivers, onHistory }: DriverListProps) {
  const [filter, setFilter] = useState<DriverFilter>('All')
  const [expanded, setExpanded] = useState(false)

  const counts = Object.fromEntries(
    driverFilterOrder.map((option) => [option, drivers.filter((driver) => matches(driver, option)).length]),
  ) as Record<DriverFilter, number>

  const filtered = drivers.filter((driver) => matches(driver, filter))
  const shown = expanded ? filtered : filtered.slice(0, initialCount)

  return (
    <section className="rounded-lg border border-slate-200 bg-white" aria-label="Əsas dəyişikliklər">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Əsas dəyişikliklər</h2>
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
          {shown.map((driver) => (
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
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${causeToneClass[driver.category]}`}
                    >
                      {causeLabels[driver.category]}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">{formatVariantLine(driver.variant)}</p>
                  <Change driver={driver} />
                </div>

                {/*
                  What it did to the money — the second of the two questions this row answers. A product
                  whose price nobody knows moved an amount nobody can compute, and "0,00 ₼" would claim it
                  moved nothing at all. An em dash says what is true: unknown.
                */}
                <p className={`shrink-0 whitespace-nowrap text-right text-sm font-semibold ${signedToneClass(driver.amountImpact)}`}>
                  {!driver.priceIsComplete && driver.amountImpact === 0
                    ? <span className="text-slate-400">{unknownValue}</span>
                    : formatMoneyDelta(driver.amountImpact)}
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
 * quantity and not from the price. Everything else about the product — baseline amounts, the split of the two
 * effects, the whole history, how often it is ordered — is one click away and deliberately not here.
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

  const unit = formatOrderUnit(driver.variant.orderUnitCode)
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
      {notes.length > 0 && <p className="mt-0.5 text-xs text-slate-500">{notes.join(' · ')}</p>}
    </>
  )
}

function matches(driver: DecisionDriver, filter: DriverFilter): boolean {
  switch (filter) {
    case 'All':
      return true
    // A product that moved both ways appears under both, and its own effect is what each total counts.
    case 'PriceChange':
      return driver.priceImpact !== null && driver.priceImpact !== 0
    case 'QuantityChange':
      return driver.quantityImpact !== null && driver.quantityImpact !== 0
    case 'NewOrders':
      return driver.category === 'NewOrders'
    case 'NoLongerOrdered':
      return driver.category === 'NoLongerOrdered'
    case 'MissingPrice':
      return !driver.priceIsComplete
  }
}
