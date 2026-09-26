/**
 * The way back from an order to the monthly report it was opened from (24.3).
 *
 * The report's cell opens its order with `?back=monthly` and a history-entry marker. The order page reads the two
 * and offers one control, «Aylıq hesabat»: on the very entry the report opened it is the browser's own Back, so the
 * report returns with its year, its search and the row the reader left; anywhere else it is an ordinary link to the
 * report for the order's year.
 *
 * One module owns the spelling, as `basisParams` owns the basis and `decisionParams` owns `cause` and `product`. This
 * one owns `back` and nothing else — never `from`, which is the basis's hand-picked month and is rewritten whenever
 * the basis is. Nothing here reads or writes `basis`, `from`, `to`, `cause` or `product`.
 */

/** The parameter's name, and its one value. Any other value means nothing. */
const backParamName = 'back'
const backToMonthlyReport = 'monthly'

/** The report's own address, as the menu reaches it. */
const monthlyReportPath = '/dashboard/monthly'

/** Where a report cell goes: the order, marked as opened from the report, and with no basis (Task 1's "last month"). */
export function monthlyReportOrderLink(orderRequestId: number): string {
  return `/orders/${orderRequestId}?${backParamName}=${backToMonthlyReport}`
}

/** The marker on the history entry the report's cell pushes. Only that entry may be left by Back. */
export const monthlyReportOrderState = { monthlyReport: true } as const

/** Whether this history entry is the one a report cell opened, rather than one reached any other way. */
export function isMonthlyReportEntry(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { monthlyReport?: unknown }).monthlyReport === true
}

/** Whether the order in this address was opened from the monthly report. */
export function openedFromMonthlyReport(params: URLSearchParams): boolean {
  return params.get(backParamName) === backToMonthlyReport
}

/** The report for a year, or the report as the menu opens it when the year is not known yet. */
export function monthlyReportLink(year: number | null): string {
  return year === null ? monthlyReportPath : `${monthlyReportPath}?year=${year}`
}
