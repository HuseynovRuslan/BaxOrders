import { describe, expect, it } from 'vitest'
import {
  isMonthlyReportEntry,
  monthlyReportLink,
  monthlyReportOrderLink,
  monthlyReportOrderState,
  openedFromMonthlyReport,
} from './monthlyReportReturn'

/**
 * Task 24 (24.3): the way back from an order to the monthly report, spelled in one place. `back=monthly` is the only
 * thing it writes into an address; `from`, which is the basis's, is never used for it.
 */
describe('the order a report cell opens', () => {
  it('is the order, marked as opened from the report, with nothing else in its address', () => {
    expect(monthlyReportOrderLink(2102)).toBe('/orders/2102?back=monthly')
    expect(monthlyReportOrderLink(2102)).not.toMatch(/basis|from|to=|cause|product/)
  })

  it('carries the report’s marker on its history entry', () => {
    expect(monthlyReportOrderState).toEqual({ monthlyReport: true })
    expect(isMonthlyReportEntry(monthlyReportOrderState)).toBe(true)
  })
})

describe('the entry the report opened', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['{}', {}],
    ['the product history’s marker', { productDrawer: true }],
    ['a marker that is not exactly true', { monthlyReport: 'true' }],
    ['a string', 'monthlyReport'],
  ])('is not %s', (_label, state) => {
    expect(isMonthlyReportEntry(state)).toBe(false)
  })

  it('is recognised beside other state', () => {
    expect(isMonthlyReportEntry({ monthlyReport: true, productDrawer: false })).toBe(true)
  })
})

describe('an order opened from the report', () => {
  it('says so by back=monthly and by nothing else', () => {
    expect(openedFromMonthlyReport(new URLSearchParams('back=monthly'))).toBe(true)
    expect(openedFromMonthlyReport(new URLSearchParams('basis=avg3&back=monthly&cause=new&product=31'))).toBe(true)
  })

  it.each(['', 'back=', 'back=Monthly', 'back=dashboard', 'back=anything-else', 'from=monthly', 'monthly=1'])(
    'is not one with "%s"',
    (search) => {
      expect(openedFromMonthlyReport(new URLSearchParams(search))).toBe(false)
    },
  )
})

describe('the report to go back to', () => {
  it('is the order’s year, or the report as the menu opens it when the year is not known', () => {
    expect(monthlyReportLink(2026)).toBe('/dashboard/monthly?year=2026')
    expect(monthlyReportLink(2025)).toBe('/dashboard/monthly?year=2025')
    expect(monthlyReportLink(null)).toBe('/dashboard/monthly')
  })
})
