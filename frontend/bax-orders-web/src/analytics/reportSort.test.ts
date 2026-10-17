import { describe, expect, it } from 'vitest'
import type { MonthlyReportRow } from '../api/reports'
import {
  defaultReportSort,
  isReportSort,
  nextNameSort,
  nextTotalSort,
  readReportSort,
  reportSortLabels,
  reportSortOrder,
  reportSortParam,
  sortReportRows,
} from './reportSort'

/** Only what ordering reads: the server's order is the array's, the total is `knownAmount`. */
function row(locationId: number, knownAmount: number | null): MonthlyReportRow {
  return { locationId, locationName: `Obyekt ${locationId}`, knownAmount } as MonthlyReportRow
}

const ids = (rows: readonly MonthlyReportRow[]) => rows.map((item) => item.locationId)

/** UI V2 (03 §6.4, AC-07): the order of the rows, from the server's figures, adding nothing up. */
describe('ordering the report’s rows', () => {
  // As the server lists them, by name: two without a total, two with the same total.
  const rows = [row(1, 500), row(2, null), row(3, 1200), row(4, 500), row(5, null), row(6, 80)]

  it('keeps the server’s order for A–Z and turns it round for Z–A', () => {
    expect(ids(sortReportRows(rows, 'NameAsc'))).toEqual([1, 2, 3, 4, 5, 6])
    expect(ids(sortReportRows(rows, 'NameDesc'))).toEqual([6, 5, 4, 3, 2, 1])
  })

  it('orders by the year’s total either way, rows without one last both ways, ties in the server’s order', () => {
    expect(ids(sortReportRows(rows, 'TotalDesc'))).toEqual([3, 1, 4, 6, 2, 5])
    expect(ids(sortReportRows(rows, 'TotalAsc'))).toEqual([6, 1, 4, 3, 2, 5])
  })

  it('leaves the rows it was given as they were', () => {
    sortReportRows(rows, 'TotalDesc')
    sortReportRows(rows, 'NameDesc')
    expect(ids(rows)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('turns a column’s order round on each press, starting from its own first direction', () => {
    expect(nextNameSort('NameAsc')).toBe('NameDesc')
    expect(nextNameSort('NameDesc')).toBe('NameAsc')
    expect(nextNameSort('TotalDesc')).toBe('NameAsc')
    expect(nextTotalSort('NameAsc')).toBe('TotalDesc')
    expect(nextTotalSort('TotalDesc')).toBe('TotalAsc')
    expect(nextTotalSort('TotalAsc')).toBe('TotalDesc')
  })

  it('offers the four in the approved words', () => {
    expect(reportSortOrder.map((sort) => reportSortLabels[sort])).toEqual([
      'Ada görə: A–Z', 'Ada görə: Z–A', 'İl cəminə görə: çoxdan aza', 'İl cəminə görə: azdan çoxa',
    ])
    expect(isReportSort('TotalAsc')).toBe(true)
    expect(isReportSort('cem-artan')).toBe(false)
  })
})

/** UI V2 (03 §3.2, §6.4): by name A–Z is the default and travels as nothing; the others have Azerbaijani names. */
describe('the monthly report’s order in the address', () => {
  it('opens by name A–Z when the address says nothing, or something it does not know', () => {
    expect(defaultReportSort).toBe('NameAsc')
    expect(readReportSort(null)).toBe('NameAsc')
    expect(readReportSort('')).toBe('NameAsc')
    expect(readReportSort('cem')).toBe('NameAsc')
    expect(readReportSort('CEM-AZALAN')).toBe('NameAsc')
  })

  it('reads and writes each order by its name in the address', () => {
    expect(reportSortOrder.map(reportSortParam)).toEqual([undefined, 'ad-azalan', 'cem-azalan', 'cem-artan'])
    for (const sort of reportSortOrder) {
      expect(readReportSort(reportSortParam(sort) ?? null)).toBe(sort)
    }
  })
})
