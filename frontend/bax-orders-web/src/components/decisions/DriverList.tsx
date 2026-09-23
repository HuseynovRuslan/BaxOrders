import { useState } from 'react'
import type { DecisionDriver } from '../../api/decisions'
import { formatCount, formatMoney, formatMoneyDelta, formatPercent, formatPrice, formatQuantity, unknownValue } from '../analytics/format'
import { formatVariantLine } from '../analytics/labels'
import { causeLabels, causeToneClass, driverFilterLabels, driverFilterOrder, type DriverFilter } from './labels'

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
            <li key={driver.variant.productVariantId} className="flex flex-wrap items-start gap-x-4 gap-y-1 p-3 sm:px-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <button
                    type="button"
                    onClick={() => onHistory(driver)}
                    className="text-left font-medium text-slate-900 hover:underline"
                  >
                    {driver.variant.productName}
                  </button>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${causeToneClass[driver.category]}`}
                  >
                    {causeLabels[driver.category]}
                  </span>
                </p>
                <p className="text-xs text-slate-400">{formatVariantLine(driver.variant)}</p>
                <Change driver={driver} />
              </div>

              <p className="shrink-0 whitespace-nowrap text-right text-sm font-semibold text-slate-900">
                {formatMoneyDelta(driver.amountImpact)}
              </p>
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
 * The before and after values that explain the money beside them. Only the dimensions that actually moved are
 * written: a quantity of 30 → 30 is noise on a row whose whole story is the price.
 */
function Change({ driver }: { driver: DecisionDriver }) {
  const parts: string[] = []

  if (!driver.priceIsComplete) {
    parts.push(`${formatCount(driver.missingPriceItemCount)} sətrin qiyməti yoxdur`)
  }

  if (driver.baselineUnitPrice !== driver.currentUnitPrice) {
    parts.push(
      `Qiymət ${driver.baselineUnitPrice === null ? unknownValue : formatPrice(driver.baselineUnitPrice)} → ${
        driver.currentUnitPrice === null ? unknownValue : formatPrice(driver.currentUnitPrice)
      }${driver.unitPricePercentChange === null ? '' : ` (${formatPercent(driver.unitPricePercentChange)})`}`,
    )
  }

  if (
    driver.currentQuantity !== null
    && driver.baselineQuantity !== null
    && driver.currentQuantity !== driver.baselineQuantity
  ) {
    parts.push(`Miqdar ${formatQuantity(driver.baselineQuantity)} → ${formatQuantity(driver.currentQuantity)}`)
  }

  // A service has no comparable quantity, so its money is the only thing there is to say about it.
  if (driver.analyticsKind === 'AmountOrientedService') {
    parts.push(
      `Məbləğ ${formatMoney(driver.baselineKnownAmount)} → ${formatMoney(driver.currentKnownAmount)}`,
    )
  }

  if (parts.length === 0) {
    return null
  }

  return <p className="mt-0.5 text-xs text-slate-600">{parts.join(' · ')}</p>
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
