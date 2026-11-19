import { afterAll, describe, expect, it, vi } from 'vitest'
import { useFixture } from '../test/fixture'

useFixture()
const model = await import('../data/model')
const metrics = await import('./metrics')
const { buildInsights } = await import('./insights')
const { freshness } = await import('./status')

afterAll(() => vi.useRealTimers())

const dataMonths2026 = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11]

describe('reporting months and periods', () => {
  it('reads the years and the months with a monthly package, July 2026 missing', () => {
    expect(model.YEARS).toEqual([2025, 2026])
    expect(model.monthsWithDataIn(2026)).toEqual(dataMonths2026)
    expect(metrics.latestYear()).toBe(2026)
    expect(metrics.previousYearOf(2026)).toBe(2025)
    expect(metrics.previousYearOf(2025)).toBeNull()
  })

  it('offers the year to date, the quarters that have months, and each month', () => {
    const options = metrics.periodOptions(2026)
    expect(options[0]).toMatchObject({ id: 'ytd', label: 'İlin əvvəlindən (Yan–Noy)', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] })
    expect(options.filter((option) => option.group === 'quarter').map((option) => option.label)).toEqual(['I rüb', 'II rüb', 'III rüb (Avq–Sen)', 'IV rüb (Okt–Noy)'])
    expect(options.filter((option) => option.group === 'month')).toHaveLength(10)
    expect(metrics.periodOptions(2025)[0].label).toBe('Bütün il (Yan–Dek)')
    expect(metrics.periodById(2026, 'nonsense')?.id).toBe('ytd')
    expect(metrics.periodOptions(2030)).toEqual([])
  })

  it('names ranges briefly and in full', () => {
    expect(metrics.shortRange([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toBe('Yan–Noy')
    expect(metrics.shortRange([1, 3])).toBe('Yan, Mar')
    expect(metrics.longRange([10, 11])).toBe('Oktyabr–Noyabr')
    expect(metrics.longRange([])).toBe('—')
  })
})

describe('comparing two years over the same months', () => {
  const ytd = metrics.periodById(2026, 'ytd')

  it('drops the missing month and compares January–November with January–November, never 10 months with 12', () => {
    const months = metrics.monthsFor(2026, ytd, 'all', 'monthly')
    expect(months).toEqual(dataMonths2026)
    const comparison = metrics.compareYears(2026, months, 'monthly')
    expect(comparison.aligned).toEqual(dataMonths2026)
    expect(comparison.unmatched).toEqual([])
    expect(comparison.current).toBe(1730)
    expect(comparison.previous).toBe(1500)
    expect(comparison.delta).toBe(230)
    expect(comparison.pct).toBeCloseTo(230 / 1500, 10)
  })

  it('shows the earlier year over the whole period, but still reads the change over the same months', () => {
    const full = metrics.periodTotal(2025, ytd!.span, 'monthly')
    expect(full).toEqual({ year: 2025, span: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], amount: 1800, complete: true })
    const comparison = metrics.compareYears(2026, metrics.monthsFor(2026, ytd, 'all', 'monthly'), 'monthly')
    expect([comparison.previous, comparison.delta]).toEqual([1500, 230])
    expect(metrics.periodTotal(2025, ytd!.span, 'outside').amount).toBe(30)

    const q4 = metrics.periodById(2026, 'q4')!
    expect(q4.span).toEqual([10, 11, 12])
    expect(metrics.periodTotal(2025, q4.span, 'monthly')).toMatchObject({ months: [10, 11, 12], amount: 450, complete: true })
    // The running year has no December yet: its total over the quarter says so instead of counting a zero.
    expect(metrics.periodTotal(2026, q4.span, 'monthly')).toMatchObject({ months: [10, 11], amount: 340, complete: false })
    expect(metrics.periodById(2026, 'm4')!.span).toEqual([4])
  })

  it('names which months wait for approval on each side', () => {
    const comparison = metrics.compareYears(2026, dataMonths2026, 'monthly')
    expect(comparison.coverage.focus).toEqual({ approved: [1, 2, 3, 4, 5, 6, 8, 9], pending: [10, 11] })
    expect(comparison.coverage.previous).toEqual({ approved: dataMonths2026, pending: [] })
  })

  it('lets the approval filter choose the focus year’s months, compared with the same months a year before', () => {
    const approvedMonths = metrics.monthsFor(2026, ytd, 'approved', 'monthly')
    expect(approvedMonths).toEqual([1, 2, 3, 4, 5, 6, 8, 9])
    const approved = metrics.compareYears(2026, approvedMonths, 'monthly')
    expect([approved.current, approved.previous, approved.delta]).toEqual([1390, 1200, 190])

    const pendingMonths = metrics.monthsFor(2026, ytd, 'pending', 'monthly')
    expect(pendingMonths).toEqual([10, 11])
    const pending = metrics.compareYears(2026, pendingMonths, 'monthly')
    expect([pending.current, pending.previous]).toEqual([340, 300])
  })

  it('ignores the approval filter for kinds that have no approval', () => {
    expect(metrics.monthsFor(2026, ytd, 'approved', 'all')).toEqual(dataMonths2026)
  })

  it('keeps the kinds apart: outside-monthly orders only in «Hamısı» and «Aylıqdan kənar»', () => {
    expect(metrics.compareYears(2026, dataMonths2026, 'all')).toMatchObject({ current: 1790, previous: 1530, delta: 260 })
    expect(metrics.compareYears(2026, dataMonths2026, 'outside')).toMatchObject({ current: 60, previous: 30, delta: 30 })
  })

  it('gives no comparison without an earlier year, and no percentage of nothing', () => {
    const first = metrics.compareYears(2025, [1, 2, 3], 'monthly')
    expect(first.previousYear).toBeNull()
    expect([first.previous, first.delta, first.pct]).toEqual([null, null, null])
    expect(first.unmatched).toEqual([1, 2, 3])
    // Delta's first outside-monthly order: 20 ₼ against 0 — a difference, but no percentage.
    const fresh = metrics.compareYears(2026, [1], 'outside', { siteId: 'delta' })
    expect([fresh.current, fresh.previous, fresh.delta, fresh.pct]).toEqual([20, 0, 20, null])
  })
})

describe('month by month', () => {
  const pairs = metrics.monthPairs(2026, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'monthly')
  const pair = (month: number) => pairs.find((item) => item.month === month)!

  it('shows a missing month as missing, never as zero', () => {
    expect(pair(7)).toMatchObject({ current: null, previous: 150, delta: null, pct: null })
    expect(pair(12)).toMatchObject({ current: null, previous: 150, delta: null })
  })

  it('works out each month’s difference and percentage', () => {
    expect(pair(3)).toMatchObject({ current: 120, previous: 150, delta: -30, pct: -0.2 })
    expect(pair(4)).toMatchObject({ current: 250, previous: 150, delta: 100 })
    // A free line from the internal store adds nothing and breaks nothing.
    expect(pair(2)).toMatchObject({ current: 170, previous: 150, delta: 20 })
  })

  it('marks the running month and the waiting ones', () => {
    expect(pair(11)).toMatchObject({ inProgress: true, currentStatus: 'pending', previousStatus: 'approved' })
    expect(pair(9)).toMatchObject({ inProgress: false, currentStatus: 'approved' })
  })
})

describe('approval of the monthly package', () => {
  it('splits the period by the month’s approval', () => {
    expect(metrics.approvalSplit(2026, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toEqual({
      approved: 1390, pending: 340, total: 1730, approvedMonths: [1, 2, 3, 4, 5, 6, 8, 9], pendingMonths: [10, 11],
    })
    expect(metrics.approvalSplit(2025, [1, 2]).pending).toBe(0)
  })

  it('gives the same approval as the year screens, for every year', () => {
    for (const year of model.YEARS) {
      model.selectYear(year)
      for (const approval of model.approvals) expect(model.approvalFor(year, approval.month)).toEqual(approval)
      expect(model.approvalFor(year, model.approvals.length + 1)).toBeNull()
    }
    model.selectYear(2026)
  })
})

describe('where the money went', () => {
  it('ranks objects and categories with their share and their change on the same months', () => {
    const sites = metrics.shareBy(2026, dataMonths2026, 'monthly', 'site')
    expect(sites.map((row) => [row.id, row.amount, row.previous, row.delta])).toEqual([['alfa', 1280, 1000, 280], ['beta', 450, 500, -50]])
    expect(sites[0].share).toBeCloseTo(1280 / 1730, 10)
    const roots = metrics.shareBy(2026, dataMonths2026, 'monthly', 'root')
    expect(roots.map((row) => row.name)).toEqual(['Təmizlik', 'Yaşıllıq'])
  })

  it('compares nothing when the earlier year lacks one of the months', () => {
    expect(metrics.shareBy(2025, [1], 'monthly', 'site').every((row) => row.previous === null)).toBe(true)
  })
})

describe('notes worked out from the figures', () => {
  it('names the largest rise and fall in manats, the object that moved most and the largest category', () => {
    const months = dataMonths2026
    const notes = buildInsights({
      focusYear: 2026,
      previousYear: 2025,
      kind: 'monthly',
      pairs: metrics.monthPairs(2026, months, 'monthly'),
      sites: metrics.shareBy(2026, months, 'monthly', 'site'),
      roots: metrics.shareBy(2026, months, 'monthly', 'root'),
      limit: 5,
    })
    expect(notes.map((note) => note.id)).toEqual(['rise', 'fall', 'site-move', 'category'])
    expect(notes[0]).toMatchObject({ subject: 'Aprel', value: { text: '+66,7%', way: 'up' }, href: '/2026/4' })
    expect(notes[1]).toMatchObject({ subject: 'Mart', value: { text: '−20,0%', way: 'down' } })
    expect(notes[2]).toMatchObject({ subject: 'Alfa', text: 'ən çox artan ərazi', href: '/2026?obyekt=alfa' })
    expect(notes[3]).toMatchObject({ subject: 'Təmizlik', href: '/2026?ana=r1' })
  })

  it('says nothing it cannot stand behind: no earlier year, no month notes', () => {
    const notes = buildInsights({ focusYear: 2025, previousYear: null, kind: 'monthly', pairs: metrics.monthPairs(2025, [1, 2], 'monthly'), sites: [], roots: [] })
    expect(notes).toEqual([])
  })
})

describe('freshness', () => {
  it('is current when the running month is in the figures', () => {
    expect(freshness()).toMatchObject({ state: 'current', year: 2026, month: 11 })
  })
})
