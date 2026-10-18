import type { MonthlyReportCell, MonthlyReportRow } from '../api/reports'

/** The address key of the month whose details are open under its row (UI V2 03 §3.2, 03a). */
export const reportCellParamName = 'cell'

/** Which object, which month (1–12). */
export interface ReportCellRef {
  locationId: number
  month: number
}

const pattern = /^([1-9]\d{0,9})-(0[1-9]|1[0-2])$/

/** `21-06` → object 21, June. Anything else is no cell at all, never a guess. */
export function readReportCell(value: string | null): ReportCellRef | null {
  const match = value === null ? null : pattern.exec(value)
  if (match === null) {
    return null
  }

  const locationId = Number(match[1])
  return Number.isSafeInteger(locationId) ? { locationId, month: Number(match[2]) } : null
}

export function reportCellParam(cell: ReportCellRef): string {
  return `${cell.locationId}-${String(cell.month).padStart(2, '0')}`
}

export function sameReportCell(a: ReportCellRef | null, b: ReportCellRef | null): boolean {
  return a !== null && b !== null && a.locationId === b.locationId && a.month === b.month
}

/**
 * The row and month the address names, when the answer on the screen has them and the month has an order to describe.
 * Null otherwise — an object the search left out, a month nobody ordered in — and the page then drops the key (03 §3.2).
 */
export function findReportCell(
  rows: readonly MonthlyReportRow[],
  ref: ReportCellRef | null,
): { row: MonthlyReportRow; cell: MonthlyReportCell } | null {
  if (ref === null) {
    return null
  }

  const row = rows.find((candidate) => candidate.locationId === ref.locationId)
  const cell = row?.months.find((candidate) => candidate.month === ref.month)
  return row !== undefined && cell !== undefined && cell.orderRequestId !== null ? { row, cell } : null
}
