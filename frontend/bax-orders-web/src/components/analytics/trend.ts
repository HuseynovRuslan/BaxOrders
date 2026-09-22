import type { VariantTrendPoint } from '../../api/analytics'
import { formatNumber } from '../imports/labels'
import { formatAnalyticsAmount, formatPrice, unknownValue, weightedPriceLabel } from './labels'

export type TrendMetric = 'quantity' | 'amount' | 'price'

/**
 * One month on the trend axis. `point` is null for a month the location has no request for: that month is a
 * gap in the history, not an order of nothing, so nothing is drawn or written for it.
 */
export interface TrendSlot {
  period: string
  point: VariantTrendPoint | null
}

export const metricLabels: Record<TrendMetric, string> = {
  quantity: 'Miqdar',
  amount: 'Məlum məbləğ',
  price: weightedPriceLabel,
}

export function trendValueOf(point: VariantTrendPoint | null, metric: TrendMetric): number | null {
  if (point === null) {
    return null
  }

  return metric === 'quantity' ? point.quantity : metric === 'amount' ? point.knownAmount : point.weightedUnitPrice
}

export function formatTrendValue(value: number | null, metric: TrendMetric): string {
  if (value === null) {
    return unknownValue
  }

  return metric === 'quantity'
    ? formatNumber(value)
    : metric === 'amount'
      ? formatAnalyticsAmount(value)
      : formatPrice(value)
}

/**
 * Every month from the first to the last, so a month with no request can be shown as the gap it is rather
 * than being skipped over as if the two months either side were neighbours.
 */
export function monthsBetween(from: string, to: string): string[] {
  const [fromYear, fromMonth] = from.split('-').map(Number)
  const [toYear, toMonth] = to.split('-').map(Number)
  const months: string[] = []

  for (let year = fromYear, month = fromMonth; year < toYear || (year === toYear && month <= toMonth); ) {
    months.push(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return months
}
