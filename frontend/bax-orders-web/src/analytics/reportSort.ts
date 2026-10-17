import type { MonthlyReportRow } from '../api/reports'

/**
 * The order the monthly report lists its objects in, as the address says it (UI V2, 03 §3.2, §6.4).
 *
 * By name A–Z is the server's own order and the default; the others are by name Z–A and by the year's total, either
 * way. Putting rows in order is not a calculation: it uses the server's figures as they are, and adds nothing up.
 */
export type ReportSort = 'NameAsc' | 'NameDesc' | 'TotalDesc' | 'TotalAsc'

export const reportSortOrder: readonly ReportSort[] = ['NameAsc', 'NameDesc', 'TotalDesc', 'TotalAsc']

export const defaultReportSort: ReportSort = 'NameAsc'

/** What the «Sıralama» select offers (03 §6.4). */
export const reportSortLabels: Record<ReportSort, string> = {
  NameAsc: 'Ada görə: A–Z',
  NameDesc: 'Ada görə: Z–A',
  TotalDesc: 'İl cəminə görə: çoxdan aza',
  TotalAsc: 'İl cəminə görə: azdan çoxa',
}

export function isReportSort(value: string): value is ReportSort {
  return (reportSortOrder as readonly string[]).includes(value)
}

/** «Obyekt» pressed: A–Z from any other order, and from A–Z to Z–A and back — pressing it always does something. */
export function nextNameSort(current: ReportSort): ReportSort {
  return current === 'NameAsc' ? 'NameDesc' : 'NameAsc'
}

/** «İl cəmi» pressed: the largest first from any other order, then the smallest first, then back. */
export function nextTotalSort(current: ReportSort): ReportSort {
  return current === 'TotalDesc' ? 'TotalAsc' : 'TotalDesc'
}

/**
 * The rows in the order asked for. By name, the server's own order (it sorts by name) or that order turned round. By
 * the year's total, its `knownAmount` either way; a row without one — an object that never ordered, or whose orders
 * have no price — goes last in both directions, so «nothing» is never read as the smallest amount. Equal totals, and
 * the rows without one, keep the server's order among themselves.
 */
export function sortReportRows(rows: readonly MonthlyReportRow[], sort: ReportSort): MonthlyReportRow[] {
  switch (sort) {
    case 'NameAsc':
      return [...rows]
    case 'NameDesc':
      return [...rows].reverse()
    case 'TotalDesc':
      return byTotal(rows, -1)
    case 'TotalAsc':
      return byTotal(rows, 1)
  }
}

function byTotal(rows: readonly MonthlyReportRow[], direction: 1 | -1): MonthlyReportRow[] {
  const known = rows.filter((row) => row.knownAmount !== null)
  const unknown = rows.filter((row) => row.knownAmount === null)
  // Array.prototype.sort is stable: rows with the same total stay in the server's order.
  known.sort((a, b) => direction * compare(a.knownAmount as number, b.knownAmount as number))
  return [...known, ...unknown]
}

/** Which of two amounts is larger — compared, never combined. */
function compare(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** In Azerbaijani and ASCII, as the dashboard's view is; the default travels as nothing at all. */
const params: Record<ReportSort, string | undefined> = {
  NameAsc: undefined,
  NameDesc: 'ad-azalan',
  TotalDesc: 'cem-azalan',
  TotalAsc: 'cem-artan',
}

export function reportSortParam(sort: ReportSort): string | undefined {
  return params[sort]
}

/** Anything the address says that is not a known order opens the default, as an unknown scope does. */
export function readReportSort(value: string | null): ReportSort {
  if (value === null) {
    return defaultReportSort
  }

  return reportSortOrder.find((sort) => params[sort] === value) ?? defaultReportSort
}
