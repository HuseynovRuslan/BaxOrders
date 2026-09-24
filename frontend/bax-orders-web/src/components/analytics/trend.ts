import type { VariantOrderFrequency, VariantTrendPoint } from '../../api/analytics'
import { locativeSuffix } from '../../terminology/terms'
import { formatNumber } from '../imports/labels'
import { formatAnalyticsAmount, formatPrice, unknownValue } from './labels'

export type TrendMetric = 'quantity' | 'amount' | 'price'

/**
 * One month on the trend axis. `point` is null for a month the location has no request for: that month is a
 * gap in the history, not an order of nothing, so nothing is drawn or written for it.
 */
export interface TrendSlot {
  period: string
  point: VariantTrendPoint | null
}

/**
 * The chart tabs. Short enough to sit in a row of three, and the weighted-average caveat is said in the hint
 * beside them rather than carried in a label nobody can read at a glance.
 */
export const metricLabels: Record<TrendMetric, string> = {
  quantity: 'Miqdar',
  amount: 'Məbləğ',
  price: 'Orta qiymət',
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
/**
 * "Son 9 ayın 6-da sifariş edilib" — what the counts below the sentence are counted out of.
 *
 * Only months the object has a request for are in the denominator. A month with no request is not a month the
 * product was skipped; nobody recorded anything about it, so it is in neither number.
 */
export function frequencySentence(frequency: VariantOrderFrequency): string {
  if (frequency.availableMonthCount === 0) {
    return 'Bu obyektin göstəriləcək sifarişi yoxdur'
  }

  if (frequency.orderedMonthCount === 0) {
    return `Son ${formatNumber(frequency.availableMonthCount)} ayın heç birində sifariş edilməyib`
  }

  return `Son ${formatNumber(frequency.availableMonthCount)} ayın `
    + `${formatNumber(frequency.orderedMonthCount)}-${locativeSuffix(frequency.orderedMonthCount)} sifariş edilib`
}

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
