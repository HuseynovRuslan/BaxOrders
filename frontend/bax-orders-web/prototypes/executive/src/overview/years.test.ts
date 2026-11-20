import { afterAll, describe, expect, it, vi } from 'vitest'
import { buildFixture, FIXTURE_TODAY } from '../test/fixture'

/*
 * Older years arriving (2020–2024, from the warehouse's historical workbook): nothing in the overview, the map or their
 * comparisons is written for two years. The fixture's 2025 and 2026 are joined here by a whole 2023 and by a 2024 that
 * has one outside-monthly line and no monthly package — as a partly filled year would come; 2022 is not there at all.
 * Every figure of 2025 and 2026 must stay as it was, a year without figures must read as «no data», never as 0, and
 * only years with a monthly package may be offered for a period.
 *
 * 2023: Alfa 80 ₼ and Beta 40 ₼ a month, every month (1.440 ₼ in the year).
 */

type Data = ReturnType<typeof buildFixture>
type FixtureLine = Data['lines'][number]

function withOlderYears(): Data {
  const data = buildFixture()
  const add = (year: number, month: number, siteId: string, productId: string, amount: number, type: FixtureLine['type'] = 'monthly') => {
    const orderId = type === 'monthly' ? `${siteId}-${year}-${month}` : `kenar-${siteId}-${year}-${month}`
    const line: FixtureLine = {
      id: `h${data.lines.length + 1}`, type, orderId, year, month, siteId, productId, qty: amount / 10, unit: productId === 'p1' ? 'ədəd' : 'kq',
      price: 10, amount, supplier: 'Cleanfix',
    }
    data.lines.push(line)
    if (type === 'monthly') data.orders.push({ id: orderId, number: '', siteId, year, month, submittedDay: 0, lineIds: [line.id] })
    else data.outsideRequests.push({ id: orderId, number: '', siteId, year, month, day: 0, reason: '', lineIds: [line.id] })
  }
  for (let month = 1; month <= 12; month++) {
    add(2023, month, 'alfa', 'p1', 80)
    add(2023, month, 'beta', 'p2', 40)
  }
  add(2024, 3, 'alfa', 'p1', 60, 'outside')
  data.meta.lines = data.lines.length
  return data
}

vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(FIXTURE_TODAY)
;(globalThis as { __BAX_DATA__?: unknown }).__BAX_DATA__ = withOlderYears()
vi.resetModules()
const model = await import('../data/model')
const metrics = await import('./metrics')
const compare = await import('./compare')

afterAll(() => vi.useRealTimers())

const all12 = Array.from({ length: 12 }, (_, index) => index + 1)
const months2026 = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11]

describe('years come from the figures', () => {
  it('knows every year with lines, and offers for a period only those with a monthly package', () => {
    expect(model.YEARS).toEqual([2023, 2024, 2025, 2026])
    expect(model.monthsWithDataIn(2024)).toEqual([])
    expect(metrics.reportingYears()).toEqual([2023, 2025, 2026])
    expect(metrics.periodOptions(2024)).toEqual([])
    expect(metrics.periodOptions(2023)[0]).toMatchObject({ id: 'ytd', label: 'Bütün il (Yan–Dek)' })
    expect(metrics.latestYear()).toBe(2026)
  })

  it('leaves 2025 and 2026 exactly as they were', () => {
    expect(metrics.amountOver(2025, all12, { kind: 'monthly' })).toBe(1800)
    expect(metrics.amountOver(2026, months2026, { kind: 'monthly' })).toBe(1730)
    expect(metrics.compareYears(2026, months2026, 'monthly')).toMatchObject({ previousYear: 2025, previous: 1500, currentAligned: 1730, delta: 230 })
  })

  it('reads the new year in full', () => {
    expect(metrics.amountOver(2023, all12, { kind: 'monthly' })).toBe(1440)
    expect(metrics.amountOver(2023, all12, { kind: 'monthly', siteId: 'alfa' })).toBe(960)
  })
})

describe('a year before without figures is «no data», never 0', () => {
  it('compares 2025 with a 2024 that has no monthly package: nothing to compare, no percentage', () => {
    const result = metrics.compareYears(2025, all12, 'monthly')
    expect(result).toMatchObject({ previousYear: 2024, aligned: [], previous: null, delta: null, pct: null, current: 1800 })
    expect(result.unmatched).toEqual(all12)
    expect(metrics.monthPairs(2025, all12, 'monthly').every((pair) => pair.previous === null && pair.pct === null)).toBe(true)
  })

  it('compares 2023 with nothing: 2022 is not in the figures', () => {
    expect(metrics.previousYearOf(2023)).toBeNull()
    expect(metrics.compareYears(2023, all12, 'monthly')).toMatchObject({ previousYear: null, previous: null, pct: null, current: 1440 })
  })

  it('on the map, leaves out and names the months the other side lacks — the same month a year before or the month before', () => {
    const year = compare.comparePeriod(compare.spanOf(2025, all12, 12), 'yoy', 'monthly', ['alfa'])
    expect(year).toMatchObject({ amount: 1200, baseline: null, delta: null, pct: null })
    expect(year.left).toHaveLength(12)
    expect(year.left.every((pair) => pair.missing === 'baseline')).toBe(true)

    // January 2025 against December 2024: 2024 has no monthly package.
    const january = compare.comparePeriod([{ year: 2025, month: 1 }], 'previous', 'monthly', ['alfa'])
    expect(january).toMatchObject({ amount: 100, baseline: null, pct: null })
    expect(january.baselineSpan).toEqual([{ year: 2024, month: 12 }])

    // January 2023 against the December before it: 2022 is not there at all.
    expect(compare.comparePeriod([{ year: 2023, month: 1 }], 'previous', 'monthly', ['alfa'])).toMatchObject({ amount: 80, baseline: null })
    // And 2024 against 2023, the same months: 2024 has nothing of its own to show.
    expect(compare.comparePeriod([{ year: 2024, month: 3 }], 'yoy', 'monthly', ['alfa'])).toMatchObject({ amount: null, baseline: null })
  })
})

describe('approval of an older year', () => {
  it('follows the program’s rule until the owner decides otherwise: every month up to September 2026 approved', () => {
    // The historical workbook has no approval column (see docs/2026-11-19-tarixi-excel-2020-2024.md, «Təsdiq»).
    expect(model.approvalFor(2023, 5)?.state).toBe('approved')
    expect(model.approvalFor(2024, 3)?.state).toBe('approved')
  })
})
