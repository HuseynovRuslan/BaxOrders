import { afterAll, describe, expect, it, vi } from 'vitest'
import { useFixture } from '../test/fixture'

useFixture()
const compare = await import('./compare')
const { comparePeriod, baselineOf, shift, spanOf, rangeLabel, modeLabel, amountFor } = compare

afterAll(() => vi.useRealTimers())

/*
 * The fixture (test/fixture.ts): 2025 has all twelve months, 2026 January–November without July; today is 11 November
 * 2026. Alfa orders 100 ₼ a month in 2025 and 120 in 2026 (200 in April); Beta 50 a month, none in March 2026; Delta
 * orders once, outside the monthly package, in January 2026; Gamma never. Approved through September 2026.
 */

const at = (year: number, month: number) => ({ year, month })
const months = (year: number, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => at(year, from + index))

describe('months and their counterparts', () => {
  it('steps across the turn of the year both ways', () => {
    expect(shift(at(2026, 1), -1)).toEqual(at(2025, 12))
    expect(shift(at(2025, 12), 1)).toEqual(at(2026, 1))
    expect(shift(at(2026, 3), -14)).toEqual(at(2025, 1))
  })

  it('compares a month with the same month a year before, or with the month before — January with December', () => {
    expect(baselineOf([at(2026, 11)], 'yoy')).toEqual([at(2025, 11)])
    expect(baselineOf([at(2026, 11)], 'previous')).toEqual([at(2026, 10)])
    expect(baselineOf([at(2026, 1)], 'previous')).toEqual([at(2025, 12)])
  })

  it('compares a run of months with the run just before it, as long as it is: never 11 months with 12', () => {
    expect(baselineOf(months(2026, 10, 11), 'previous')).toEqual(months(2026, 8, 9))
    const ytd = baselineOf(months(2026, 1, 11), 'previous')
    expect(ytd).toEqual(months(2025, 2, 12))
    expect(ytd).toHaveLength(11)
    expect(baselineOf(months(2026, 1, 11), 'yoy')).toEqual(months(2025, 1, 11))
  })

  it('reads a running period up to its latest month only', () => {
    expect(spanOf(2026, [10, 11, 12], 11)).toEqual(months(2026, 10, 11))
    expect(spanOf(2025, Array.from({ length: 12 }, (_, index) => index + 1), 12)).toHaveLength(12)
  })
})

describe('a period against its comparison', () => {
  it('reads one month against the same month a year before, and says the approval differs', () => {
    const november = comparePeriod([at(2026, 11)], 'yoy', 'monthly', ['alfa'])
    expect(november).toMatchObject({ amount: 120, currentAligned: 120, baseline: 100, delta: 20, approvalDiffers: true, inProgress: true })
    expect(november.pct).toBeCloseTo(0.2)
    // September is approved on both sides.
    expect(comparePeriod([at(2026, 9)], 'yoy', 'monthly', ['alfa']).approvalDiffers).toBe(false)
  })

  it('reads January against the December before it', () => {
    const january = comparePeriod([at(2026, 1)], 'previous', 'monthly', ['alfa'])
    expect(january.baselineSpan).toEqual([at(2025, 12)])
    expect(january).toMatchObject({ amount: 120, baseline: 100, delta: 20 })
  })

  it('leaves out a month without figures — on either side — and never reads it as zero', () => {
    const august = comparePeriod([at(2026, 8)], 'previous', 'monthly', ['alfa'])
    expect(august).toMatchObject({ amount: 120, baseline: null, delta: null, pct: null })
    expect(august.left.map((pair) => pair.missing)).toEqual(['baseline'])
    const july = comparePeriod([at(2026, 7)], 'yoy', 'monthly', ['alfa'])
    expect(july).toMatchObject({ amount: null, baseline: null, delta: null, pct: null })
    expect(july.left.map((pair) => pair.missing)).toEqual(['current'])
  })

  it('compares January–November 2026 with the same months of 2025, July left out on both sides', () => {
    const ytd = comparePeriod(months(2026, 1, 11), 'yoy', 'monthly', ['alfa'])
    expect(ytd.aligned).toHaveLength(10)
    expect(ytd).toMatchObject({ amount: 1280, currentAligned: 1280, baseline: 1000, delta: 280 })
    expect(ytd.left.map((pair) => [pair.current, pair.missing])).toEqual([[at(2026, 7), 'current']])
  })

  it('compares January–November 2026 with February–December 2025 under «Əvvəlki dövr», month for month', () => {
    const ytd = comparePeriod(months(2026, 1, 11), 'previous', 'monthly', ['alfa'])
    expect(ytd.span).toHaveLength(11)
    expect(ytd.baselineSpan).toHaveLength(11)
    expect(ytd.baselineSpan[0]).toEqual(at(2025, 2))
    expect(ytd.baselineSpan.at(-1)).toEqual(at(2025, 12))
    // July 2026 has no figures, so its pair (August 2025) is left out too: 10 months against 10.
    expect(ytd).toMatchObject({ currentAligned: 1280, baseline: 1000, delta: 280 })
  })

  it('tells a real zero from a missing month, and gives no percentage of nothing', () => {
    const beta = comparePeriod([at(2026, 3)], 'yoy', 'monthly', ['beta'])
    expect(beta).toMatchObject({ amount: 0, baseline: 50, delta: -50, pct: -1 })
    const delta = comparePeriod([at(2026, 1)], 'yoy', 'all', ['delta'])
    expect(delta).toMatchObject({ amount: 20, baseline: 0, delta: 20, pct: null })
    const gamma = comparePeriod(months(2026, 1, 11), 'yoy', 'all', ['gamma'])
    expect(gamma).toMatchObject({ amount: 0, baseline: 0, delta: 0, pct: null })
  })

  it('never reaches into the future, and has no earlier year before the first one', () => {
    const december = comparePeriod([at(2026, 12)], 'yoy', 'monthly', ['alfa'])
    expect(december).toMatchObject({ span: [], amount: null, baseline: null, delta: null, pct: null })
    const first = comparePeriod(months(2025, 1, 12), 'yoy', 'monthly', ['alfa'])
    expect(first).toMatchObject({ amount: 1200, baseline: null, delta: null, pct: null })
    expect(first.left).toHaveLength(12)
  })

  it('reads 2025 and 2026 over their own coverage: twelve months against ten', () => {
    expect(comparePeriod(months(2025, 1, 12), 'yoy', 'monthly').amount).toBe(1800)
    expect(comparePeriod(months(2026, 1, 11), 'yoy', 'monthly').amount).toBe(1280 + 450)
  })

  it('counts an object once however often it is named, and every object without names', () => {
    expect(amountFor(at(2026, 11), 'monthly', ['alfa', 'alfa'])).toBe(120)
    expect(amountFor(at(2026, 11), 'monthly')).toBe(170)
    expect(amountFor(at(2026, 7), 'monthly', ['alfa'])).toBeNull()
  })

  it('never gives NaN or Infinity, whatever the choice', () => {
    for (const site of ['alfa', 'beta', 'delta', 'gamma']) {
      for (const mode of ['yoy', 'previous'] as const) {
        for (const kind of ['monthly', 'outside', 'all'] as const) {
          for (let month = 1; month <= 12; month++) {
            for (const year of [2025, 2026]) {
              const result = comparePeriod([at(year, month)], mode, kind, [site])
              for (const value of [result.amount, result.baseline, result.delta, result.pct]) {
                expect(value === null || Number.isFinite(value)).toBe(true)
              }
            }
          }
        }
      }
    }
  })
})

describe('words', () => {
  it('names the comparison and the periods', () => {
    expect(modeLabel('yoy', true)).toBe('Ötən ilin eyni ayı')
    expect(modeLabel('yoy', false)).toBe('Ötən ilin eyni dövrü')
    expect(modeLabel('previous', true)).toBe('Əvvəlki ay')
    expect(modeLabel('previous', false)).toBe('Əvvəlki dövr')
    expect(rangeLabel([at(2026, 11)])).toBe('Noyabr 2026')
    expect(rangeLabel(months(2026, 1, 11))).toBe('Yan–Noy 2026')
    expect(rangeLabel(months(2025, 2, 12))).toBe('Fev–Dek 2025')
    expect(rangeLabel([at(2025, 12), at(2026, 1)])).toBe('Dek 2025–Yan 2026')
    expect(rangeLabel([])).toBe('—')
  })
})
