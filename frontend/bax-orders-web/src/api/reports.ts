import { getJson } from './client'
import type { OrderRequestStatus } from './orders'

/**
 * One location in one month.
 *
 * A month the location has no request for comes back with `orderRequestId: null` and no amount. That is not a
 * month it spent nothing in, and the report must not draw it as one.
 */
/**
 * One location's month. `knownAmount` — and the difference, average and «unusual» built from it — is the
 * month's **monthly** money alone, because that is the only population a month-on-month comparison means
 * anything about. What was bought outside the plan, and what nobody classified, ride beside it.
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
  /** What this bought outside the month's plan. Factual spend, deliberately outside every comparison. */
  outsideMonthlyKnownAmount: number | null
  outsideMonthlyItemCount: number
  /** Lines nobody has classified: in neither figure, shown so they are not lost. */
  unclassifiedKnownAmount: number | null
  unclassifiedItemCount: number
  amountIsComplete: boolean
  /** The month before — for January, the December of the year before. Null when it has no request. */
  previousMonthKnownAmount: number | null
  deltaAmount: number | null
  deltaPercent: number | null
  /**
   * The average of the location's three most recent available months before this one — months with a request
   * and a known amount, reaching into earlier years. Null with fewer than three, or when this month has no amount.
   */
  recentAverageKnownAmount: number | null
  /** This month against that average, to two places. Null wherever the average is. */
  recentAveragePercent: number | null
  /** More than ±50% from that average (owner decision 8.2). Decided by the backend; the browser only draws it. */
  isUnusual: boolean
  /** Carried in from Excel as already approved — the workflow's recorded fact, as on the order page. Status stays Approved. */
  isHistoricalImport: boolean
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
  /** What this bought outside the month's plan. Factual spend, deliberately outside every comparison. */
  outsideMonthlyKnownAmount: number | null
  outsideMonthlyItemCount: number
  /** Lines nobody has classified: in neither figure, shown so they are not lost. */
  unclassifiedKnownAmount: number | null
  unclassifiedItemCount: number
  monthsWithoutRequest: number
  /**
   * Whether the location has a request in any month up to the end of the year being read. False is the
   * dashboard's "Sistemdə hələ sifarişi yoxdur".
   */
  hasAnyRequest: boolean
}

export interface MonthlyReportMonth {
  month: number
  period: string
  locationsWithRequest: number
  knownAmount: number | null
  missingPriceItemCount: number
  /** What this bought outside the month's plan. Factual spend, deliberately outside every comparison. */
  outsideMonthlyKnownAmount: number | null
  outsideMonthlyItemCount: number
  /** Lines nobody has classified: in neither figure, shown so they are not lost. */
  unclassifiedKnownAmount: number | null
  unclassifiedItemCount: number
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
  /** What this bought outside the month's plan. Factual spend, deliberately outside every comparison. */
  outsideMonthlyKnownAmount: number | null
  outsideMonthlyItemCount: number
  /** Lines nobody has classified: in neither figure, shown so they are not lost. */
  unclassifiedKnownAmount: number | null
  unclassifiedItemCount: number
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
