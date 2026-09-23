import { getJson } from './client'
import type { OrderRequestStatus } from './orders'

/**
 * One location in one month.
 *
 * A month the location has no request for comes back with `orderRequestId: null` and no amount. That is not a
 * month it spent nothing in, and the report must not draw it as one.
 */
export interface MonthlyReportCell {
  /** 1–12. */
  month: number
  period: string
  orderRequestId: number | null
  version: number | null
  status: OrderRequestStatus | null
  /** Money over the priced lines. Null when the month has no request, or nothing in it has a price. */
  knownAmount: number | null
  itemCount: number
  missingPriceItemCount: number
  amountIsComplete: boolean
  /** The month before — for January, the December of the year before. Null when it has no request. */
  previousMonthKnownAmount: number | null
  deltaAmount: number | null
  deltaPercent: number | null
}

export interface MonthlyReportRow {
  locationId: number
  locationCode: string
  locationName: string
  isActive: boolean
  /** Twelve cells, January first. */
  months: MonthlyReportCell[]
  requestCount: number
  knownAmount: number | null
  missingPriceItemCount: number
  monthsWithoutRequest: number
}

export interface MonthlyReportMonth {
  month: number
  period: string
  locationsWithRequest: number
  knownAmount: number | null
  missingPriceItemCount: number
  amountIsComplete: boolean
}

export interface MonthlyReport {
  year: number
  availableYears: number[]
  rows: MonthlyReportRow[]
  /** Describes every location, never the searched subset. */
  months: MonthlyReportMonth[]
  locationCount: number
  filteredLocationCount: number
  requestCount: number
  knownAmount: number | null
  missingPriceItemCount: number
  amountIsComplete: boolean
}

export function fetchMonthlyReport(
  query: { year?: number; search?: string },
  signal?: AbortSignal,
): Promise<MonthlyReport> {
  const params = new URLSearchParams()
  if (query.year) {
    params.set('year', String(query.year))
  }

  if (query.search) {
    params.set('search', query.search)
  }

  const suffix = params.toString()
  return getJson<MonthlyReport>(`/api/v1/reports/monthly${suffix ? `?${suffix}` : ''}`, signal)
}
