import { describe, expect, it } from 'vitest'
import type { MonthlyReportCell, MonthlyReportRow } from '../api/reports'
import { findReportCell, readReportCell, reportCellParam, sameReportCell } from './reportCell'

describe('the cell in the address', () => {
  it('reads an object and a month, and nothing else', () => {
    expect(readReportCell('21-06')).toEqual({ locationId: 21, month: 6 })
    expect(readReportCell('7-12')).toEqual({ locationId: 7, month: 12 })

    for (const value of [null, '', '21', '21-6', '21-13', '21-00', '0-06', '-21-06', '21-06x', ' 21-06', 'a-06', '12345678901-01']) {
      expect(readReportCell(value)).toBeNull()
    }
  })

  it('writes the month with two digits, so the address reads the same as it is read back', () => {
    expect(reportCellParam({ locationId: 21, month: 6 })).toBe('21-06')
    expect(readReportCell(reportCellParam({ locationId: 3, month: 11 }))).toEqual({ locationId: 3, month: 11 })
  })

  it('compares two cells by object and month', () => {
    expect(sameReportCell({ locationId: 3, month: 8 }, { locationId: 3, month: 8 })).toBe(true)
    expect(sameReportCell({ locationId: 3, month: 8 }, { locationId: 3, month: 9 })).toBe(false)
    expect(sameReportCell(null, { locationId: 3, month: 8 })).toBe(false)
  })
})

describe('the cell the answer on the screen has', () => {
  const month = (value: number, orderRequestId: number | null) => ({ month: value, orderRequestId }) as MonthlyReportCell
  const rows = [
    { locationId: 3, months: [month(1, 301), month(2, null)] },
    { locationId: 21, months: [month(1, 2101)] },
  ] as MonthlyReportRow[]

  it('finds an ordered month of an object on the screen', () => {
    expect(findReportCell(rows, { locationId: 3, month: 1 })?.cell.orderRequestId).toBe(301)
    expect(findReportCell(rows, { locationId: 21, month: 1 })?.row.locationId).toBe(21)
  })

  it('finds nothing for a month without an order, an object not on the screen, or no cell', () => {
    expect(findReportCell(rows, { locationId: 3, month: 2 })).toBeNull()
    expect(findReportCell(rows, { locationId: 99, month: 1 })).toBeNull()
    expect(findReportCell(rows, { locationId: 3, month: 5 })).toBeNull()
    expect(findReportCell(rows, null)).toBeNull()
  })
})
