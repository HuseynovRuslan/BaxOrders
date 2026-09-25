import type { CauseCategory, DecisionDriver } from '../../api/decisions'
import type { DriverFilter } from './labels'

/**
 * Which chip of "Əsas dəyişikliklər" lists the products behind each reason of "Niyə dəyişib?" (18.1, 18.2).
 *
 * A `Record` over every category, so a new cause fails to compile here rather than silently opening nothing.
 * "Xidmətlər", "Daxili təminat" and "Variant dəyişib" have no chip of their own: a service, a product from the
 * company's own store and a variant switch are listed under whichever chips their quantities and prices put them,
 * and none of those lists is theirs.
 */
const chipOfCause: Record<CauseCategory, DriverFilter | null> = {
  NewOrders: 'New',
  QuantityChange: 'QuantityChange',
  PriceChange: 'PriceChange',
  NoLongerOrdered: 'NoLongerOrdered',
  UnattributedDueToMissingPrice: 'MissingPrice',
  Services: null,
  InternalSupply: null,
  VariantChange: null,
}

/**
 * The chip that shows the products behind a reason. Five reasons have one; three do not, and those rows stay inert
 * rather than opening a list that would not be theirs.
 */
export function driverFilterForCause(category: CauseCategory): DriverFilter | null {
  return chipOfCause[category]
}

/**
 * The rows under a chip. Each chip's count is the number of rows this leaves, so the two can never disagree.
 * "Məbləği dəyişməyən" is the steady list itself; every other chip filters the drivers.
 */
export function rowsUnder(filter: DriverFilter, drivers: DecisionDriver[], steady: DecisionDriver[]): DecisionDriver[] {
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
