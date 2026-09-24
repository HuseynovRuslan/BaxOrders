import { describe, expect, it } from 'vitest'
import type { VariantOrderFrequency, VariantTrendPoint } from '../../api/analytics'
import {
  allWhole,
  frequencySentence,
  monthTickLabel,
  quantityRatio,
  quantityRatioLine,
  supplierLine,
  valueAxis,
  type TrendSlot,
} from './trend'

function frequency(availableMonthCount: number, orderedMonthCount: number): VariantOrderFrequency {
  return {
    availableMonthCount,
    orderedMonthCount,
    firstOrderedPeriod: null,
    lastOrderedPeriod: null,
    monthsSinceLastOrder: null,
    intervalsInMonths: [],
    typicalIntervalMonths: null,
    shortestIntervalMonths: null,
    longestIntervalMonths: null,
  }
}

/** "Son 9 ayın 3-də sifariş edilib" — owner decision 5.1, with the ending the number takes. */
describe('how often a product is ordered, in one sentence', () => {
  it('counts the months out of the months there are', () => {
    expect(frequencySentence(frequency(9, 3))).toBe('Son 9 ayın 3-də sifariş edilib')
    expect(frequencySentence(frequency(12, 6))).toBe('Son 12 ayın 6-da sifariş edilib')
    expect(frequencySentence(frequency(10, 9))).toBe('Son 10 ayın 9-da sifariş edilib')
    expect(frequencySentence(frequency(12, 10))).toBe('Son 12 ayın 10-da sifariş edilib')
  })

  it('says so when it was ordered in none of them', () => {
    expect(frequencySentence(frequency(9, 0))).toBe('Son 9 ayın heç birində sifariş edilməyib')
  })

  it('says there is nothing to show when there are no months at all', () => {
    expect(frequencySentence(frequency(0, 0))).toBe('Bu obyektin göstəriləcək sifarişi yoxdur')
  })

  it('never says "mövcud aydan" again', () => {
    expect(frequencySentence(frequency(9, 3))).not.toContain('mövcud')
  })
})

/** Brief (Task 10): the history's axis — whole numbers for pieces, and no line pressed against the top edge. */
describe('the value axis', () => {
  /** Traktor qazonbiçən, 0 and 1 ədəd: the axis read 0, 0,25, 0,5, 0,75, 1. */
  it('counts whole pieces in whole numbers, zero and one included', () => {
    const axis = valueAxis([0, 1], true)

    expect(axis.ticks).toContain(0)
    expect(axis.ticks).toContain(1)
    expect(axis.ticks.every(Number.isInteger)).toBe(true)
    expect(axis.ticks).not.toContain(0.25)
    expect(axis.domain[1]).toBeGreaterThan(1)
  })

  /** Şampun qab: 40, 20, 40 ədəd. */
  it('ends above the largest value', () => {
    const axis = valueAxis([40, 20, 40], true)

    expect(axis.domain).toEqual([0, axis.ticks[axis.ticks.length - 1]])
    expect(axis.domain[1]).toBeGreaterThan(40)
    expect(axis.ticks.every(Number.isInteger)).toBe(true)
  })

  /** "Orta qiymət" at 32,00 → 32,13 ₼ sat on the chart's top edge. */
  it('keeps a flat price off the top edge', () => {
    const axis = valueAxis([32, 32.13], false)

    expect(axis.domain[1]).toBeGreaterThan(32.13)
    expect(axis.domain[1]).toBeGreaterThan(32.13 * 1.1)
  })

  it('still has an axis when there is nothing but zeros, or nothing at all', () => {
    expect(valueAxis([0, 0], true).domain[1]).toBeGreaterThanOrEqual(1)
    expect(valueAxis([null, null], false).domain[1]).toBeGreaterThanOrEqual(1)
    expect(valueAxis([], false).ticks[0]).toBe(0)
  })

  it('never gives more than six ticks, starting at zero and evenly spaced', () => {
    for (const values of [[7.36], [0.3], [1234.5, 20], [21900, 0], [3]]) {
      for (const whole of [true, false]) {
        const { ticks } = valueAxis(values, whole && allWhole(values))
        expect(ticks.length).toBeLessThanOrEqual(6)
        expect(ticks[0]).toBe(0)
        const step = ticks[1] - ticks[0]
        ticks.forEach((tick, index) => expect(tick).toBeCloseTo(index * step, 9))
      }
    }
  })

  /** Whole numbers are forced only where every plotted quantity is whole; 7,36 m² keeps its decimals. */
  it('knows a whole series from one that is not', () => {
    expect(allWhole([0, 1, null, 40])).toBe(true)
    expect(allWhole([7.36])).toBe(false)
    expect(valueAxis([7.36], allWhole([7.36])).domain[1]).toBeGreaterThan(7.36)
  })
})

describe('the month names under the chart', () => {
  it('names every month in full, with the year where it starts and at each January', () => {
    const labels = ['2026-07', '2026-08', '2026-09'].map((period, index) => monthTickLabel(period, index === 0))

    expect(labels).toEqual(['İyul 2026', 'Avqust', 'Sentyabr'])
    expect(monthTickLabel('2027-01', false)).toBe('Yanvar 2027')
  })

  /** Cut to three letters, "İyun" and "İyul" are one word. */
  it('never lets two months read alike', () => {
    expect(monthTickLabel('2026-06', false)).toBe('İyun')
    expect(monthTickLabel('2026-07', false)).toBe('İyul')
    expect(monthTickLabel('2026-06', false)).not.toBe(monthTickLabel('2026-07', false))
  })
})

describe('this month against the basis', () => {
  it('is a multiple to one decimal', () => {
    expect(quantityRatio(40, 30)).toBe('1,3×')
    expect(quantityRatio(20, 40)).toBe('0,5×')
    expect(quantityRatio(60, 30)).toBe('2,0×')
  })

  it('is nothing where it would divide by nothing', () => {
    expect(quantityRatio(5, 0)).toBeNull()
    expect(quantityRatio(5, null)).toBeNull()
    expect(quantityRatio(null, 30)).toBeNull()
  })

  it('reads as the brief asks, in the chosen basis s words', () => {
    expect(quantityRatioLine(
      { basis: 'Previous3MonthAverage', windowPeriods: ['2026-06', '2026-07', '2026-08'], baseline: 30, current: 40 },
      'ədəd',
    )).toBe('Son 3 ayın ortalaması: 30 ədəd · bu ay: 40 ədəd — 1,3×')
    expect(quantityRatioLine({ basis: 'PreviousMonth', windowPeriods: ['2026-08'], baseline: 40, current: 20 }, 'ədəd'))
      .toBe('Keçən ay: 40 ədəd · bu ay: 20 ədəd — 0,5×')
  })

  it('says a month without the product was not ordered, rather than "0,0×"', () => {
    expect(quantityRatioLine({ basis: 'PreviousMonth', windowPeriods: ['2026-08'], baseline: 71, current: 0 }, 'ədəd'))
      .toBe('Keçən ay: 71 ədəd · bu ay: 0 ədəd — bu ay sifariş olunmayıb')
  })

  it('gives a new product its two quantities and no multiple', () => {
    expect(quantityRatioLine({ basis: 'PreviousMonth', windowPeriods: ['2026-08'], baseline: 0, current: 5 }, 'ədəd'))
      .toBe('Keçən ay: 0 ədəd · bu ay: 5 ədəd')
  })

  it('says nothing without both quantities', () => {
    expect(quantityRatioLine({ basis: 'PreviousMonth', windowPeriods: ['2026-08'], baseline: null, current: 5 }, 'ədəd'))
      .toBeNull()
  })
})

function slot(period: string, point: Partial<VariantTrendPoint> | null): TrendSlot {
  return {
    period,
    point: point === null
      ? null
      : {
        period: `${period}-01`,
        orderRequestId: 1,
        version: 1,
        quantity: 1,
        knownAmount: 10,
        weightedUnitPrice: 10,
        itemCount: 1,
        knownPriceItemCount: 1,
        missingRequiredPriceItemCount: 0,
        priceNotRequiredItemCount: 0,
        supplierNames: [],
        ...point,
      },
  }
}

describe('who supplied it', () => {
  it('names the suppliers of the last month shown when the product was ordered then', () => {
    expect(supplierLine([slot('2026-08', { supplierNames: ['Köhnə'] }), slot('2026-09', { supplierNames: ['Aqro', 'Bakı'] })]))
      .toBe('Təchizatçı: Aqro · Bakı')
  })

  it('names the month when the product s last order is earlier', () => {
    expect(supplierLine([
      slot('2026-07', { supplierNames: ['Aqro'] }),
      slot('2026-08', { itemCount: 0, quantity: 0, supplierNames: [] }),
      slot('2026-09', null),
    ])).toBe('Təchizatçı (İyul 2026): Aqro')
  })

  it('says so when the lines name nobody', () => {
    expect(supplierLine([slot('2026-09', { supplierNames: [] })])).toBe('Təchizatçı qeyd olunmayıb')
    expect(supplierLine([slot('2026-09', { itemCount: 0, quantity: 0 })])).toBe('Təchizatçı qeyd olunmayıb')
  })
})
