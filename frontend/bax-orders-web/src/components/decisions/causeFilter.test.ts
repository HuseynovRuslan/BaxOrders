import { describe, expect, it } from 'vitest'
import type { VariantIdentity } from '../../api/analytics'
import type { CauseCategory, DecisionDriver } from '../../api/decisions'
import { driverFilterForCause, rowsUnder } from './causeFilter'
import type { DriverFilter } from './labels'

/**
 * Task 18 (18.1, 18.2): which chip each reason opens. Every category is listed here in a `Record`, so a new one
 * fails to compile until somebody decides what it opens, rather than being skipped.
 */
const expected: Record<CauseCategory, DriverFilter | null> = {
  NewOrders: 'New',
  QuantityChange: 'QuantityChange',
  PriceChange: 'PriceChange',
  NoLongerOrdered: 'NoLongerOrdered',
  UnattributedDueToMissingPrice: 'MissingPrice',
  Services: null,
  InternalSupply: null,
  VariantChange: null,
}

function variant(productVariantId: number, productName: string): VariantIdentity {
  return {
    productVariantId,
    productId: productVariantId,
    productCode: 'PRD-000011',
    productName,
    specificationValue: null,
    specificationUnitCode: null,
    specificationUnitName: null,
    specificationDescriptor: null,
    modelCode: null,
    orderUnitCode: 'PCS',
    orderUnitName: 'Ədəd',
  }
}

/** An ordinary priced product whose price moved; each test says what else is true of it. */
function driver(productVariantId: number, productName: string, overrides: Partial<DecisionDriver> = {}): DecisionDriver {
  return {
    variant: variant(productVariantId, productName),
    analyticsKind: 'QuantityComparable',
    category: 'PriceChange',
    amountImpact: 39,
    quantityImpact: 0,
    priceImpact: 39,
    currentQuantity: 30,
    baselineQuantity: 30,
    quantityPercentChange: 0,
    currentUnitPrice: 4.1,
    baselineUnitPrice: 2.8,
    unitPricePercentChange: 46.4286,
    currentKnownAmount: 123,
    baselineKnownAmount: 84,
    currentItemCount: 1,
    baselineItemCount: 1,
    missingPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    priceIsComplete: true,
    supplyChanged: false,
    state: 'Unchanged',
    ...overrides,
  }
}

function names(rows: DecisionDriver[]): string[] {
  return rows.map((row) => row.variant.productName)
}

describe('the chip a reason opens', () => {
  it('opens its own chip for each of the five reasons that have one', () => {
    expect(driverFilterForCause('NewOrders')).toBe('New')
    expect(driverFilterForCause('QuantityChange')).toBe('QuantityChange')
    expect(driverFilterForCause('PriceChange')).toBe('PriceChange')
    expect(driverFilterForCause('NoLongerOrdered')).toBe('NoLongerOrdered')
    expect(driverFilterForCause('UnattributedDueToMissingPrice')).toBe('MissingPrice')
  })

  it('opens nothing for "Xidmətlər", "Daxili təminat" and "Variant dəyişib"', () => {
    expect(driverFilterForCause('Services')).toBeNull()
    expect(driverFilterForCause('InternalSupply')).toBeNull()
    expect(driverFilterForCause('VariantChange')).toBeNull()
  })

  it('decides every category there is', () => {
    for (const [category, filter] of Object.entries(expected) as [CauseCategory, DriverFilter | null][]) {
      expect(driverFilterForCause(category), category).toBe(filter)
    }
  })
})

/** Moved from `DriverList` unchanged: every chip count is the length of what this returns, before and after. */
describe('the rows under a chip', () => {
  const priceOnly = driver(1, 'York qatlama salfet')
  const bags = driver(2, 'Zibil paketi', { category: 'QuantityChange', quantityImpact: 120, priceImpact: 0, state: 'Increased' })
  const both = driver(3, 'Əlcək', { category: 'QuantityChange', quantityImpact: 50, priceImpact: 20, state: 'Increased' })
  const steady = [driver(9, 'Sabit mal', { amountImpact: 0, quantityImpact: 0, priceImpact: 0 })]

  /**
   * Task 10's "Yeni məhsullar by state" (`DriverList.test.tsx`): a new product is under "Yeni məhsullar" whatever
   * its money was filed under — a missing price, the company's own store or a new order — and is under "Qiymət
   * yoxdur" as well when it owes a price.
   */
  it('lists a new product by its state, whatever its money was filed under', () => {
    const unpricedNew = driver(61, 'Yeni qiyməti olmayan mal', {
      category: 'UnattributedDueToMissingPrice',
      missingPriceItemCount: 1,
      priceIsComplete: false,
      state: 'New',
    })
    const freeNew = driver(62, 'Yeni anbar malı', { category: 'InternalSupply', priceNotRequiredItemCount: 1, state: 'New' })
    const pricedNew = driver(63, 'Yeni alət', { category: 'NewOrders', state: 'New' })
    const dropped = driver(64, 'Köhnə alət', { category: 'NoLongerOrdered', state: 'NoLongerOrdered' })
    const drivers = [unpricedNew, freeNew, pricedNew, dropped, bags]

    expect(names(rowsUnder('New', drivers, []))).toEqual(['Yeni qiyməti olmayan mal', 'Yeni anbar malı', 'Yeni alət'])
    expect(names(rowsUnder('NoLongerOrdered', drivers, []))).toEqual(['Köhnə alət'])
    expect(names(rowsUnder('MissingPrice', drivers, []))).toEqual(['Yeni qiyməti olmayan mal'])
  })

  it('lists a product that moved both ways under both effects, and one that moved one way under that one only', () => {
    const drivers = [priceOnly, bags, both]

    expect(names(rowsUnder('PriceChange', drivers, []))).toEqual(['York qatlama salfet', 'Əlcək'])
    expect(names(rowsUnder('QuantityChange', drivers, []))).toEqual(['Zibil paketi', 'Əlcək'])
  })

  it('keeps "Hamısı" to the drivers, and "Məbləği dəyişməyən" to the steady products', () => {
    const drivers = [priceOnly, bags]

    expect(rowsUnder('All', drivers, steady)).toEqual(drivers)
    expect(rowsUnder('Steady', drivers, steady)).toEqual(steady)
  })

  it('never treats an effect it does not know as a move', () => {
    const service = driver(4, 'Təmizlik xidməti', {
      analyticsKind: 'AmountOrientedService',
      category: 'Services',
      quantityImpact: null,
      priceImpact: null,
    })

    expect(rowsUnder('PriceChange', [service], [])).toEqual([])
    expect(rowsUnder('QuantityChange', [service], [])).toEqual([])
  })
})
