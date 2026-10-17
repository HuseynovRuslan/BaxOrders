import type { AnalyticsComparisonBasis, VariantOrderFrequency, VariantTrendPoint } from '../../api/analytics'
import { locativeSuffix } from '../../terminology/terms'
import { formatNumber } from '../imports/labels'
import { describeBasis, formatQuantity } from './format'
import { formatAnalyticsAmount, formatAnalyticsPeriod, formatPrice, unknownValue } from './labels'
import { azNumberFormat } from './azNumber'

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

/**
 * A month's name under the chart: "Avqust", with the year on the first month and on every January ("Yanvar
 * 2027"), so a window that crosses a year says where. Always the full name: "İyun" and "İyul" cut to three letters
 * are the same word.
 */
export function monthTickLabel(period: string, isFirst: boolean): string {
  const full = formatAnalyticsPeriod(period)
  return isFirst || period.slice(5, 7) === '01' ? full : full.split(' ')[0]
}

/** True when every plotted value is a whole number — a count of pieces, never an axis of 0,25 pieces. */
export function allWhole(values: readonly (number | null)[]): boolean {
  return values.every((value) => value === null || Number.isInteger(value))
}

/** The chart's value axis: from zero to a round number above the data, and the ticks between. */
export interface ValueAxis {
  domain: [0, number]
  ticks: number[]
}

/** Steps a reader can count in: 1, 2, 2,5 and 5 of each power of ten. */
const niceSteps = [1, 2, 2.5, 5]

/** At most this many ticks, zero included — six labels fit the chart's height without crowding. */
const maxTicks = 6

/**
 * Where the value axis ends, and its ticks.
 *
 * The top is a round number strictly above the largest value plus a tenth, so no line — a flat price least of
 * all — sits on the chart's top edge. It is at least 1, so a series of zeros still has an axis. With
 * `wholeNumbers` every step and tick is whole: an order of 0 or 1 traktor has an axis of 0, 1, 2 and never 0,25.
 */
export function valueAxis(values: readonly (number | null)[], wholeNumbers: boolean): ValueAxis {
  const max = values.reduce<number>((largest, value) => (value !== null && value > largest ? value : largest), 0)
  const target = max * 1.1

  for (let exponent = Math.floor(Math.log10(Math.max(target, 1))) - 2; ; exponent += 1) {
    for (const multiple of niceSteps) {
      const step = tidy(multiple * 10 ** exponent)
      if (wholeNumbers && (step < 1 || !Number.isInteger(step))) {
        continue
      }

      const intervals = Math.max(Math.floor(target / step) + 1, Math.ceil(1 / step))
      if (intervals + 1 <= maxTicks) {
        const ticks = Array.from({ length: intervals + 1 }, (_, index) => tidy(index * step))
        return { domain: [0, ticks[ticks.length - 1]], ticks }
      }
    }
  }
}

/** Clears the float dust of `0.1 × 3`, so a tick reads 0,3 and not 0,30000000000000004. */
function tidy(value: number): number {
  return Number(value.toPrecision(12))
}

const ratioFormat = azNumberFormat({ minimumFractionDigits: 1, maximumFractionDigits: 1 })

/**
 * "1,3×": this month's quantity as a multiple of the basis quantity, to one decimal. Null where it would divide by
 * nothing — a product the basis never ordered has no multiple, only a start.
 */
export function quantityRatio(current: number | null, baseline: number | null): string | null {
  if (current === null || baseline === null || baseline === 0) {
    return null
  }

  return `${ratioFormat.format(current / baseline)}×`
}

/**
 * The two quantities a ratio line compares, from the page the history was opened on — its basis, and the figures
 * its own row shows. The window divides them; it averages nothing itself.
 */
export interface QuantityRatioInput {
  basis: AnalyticsComparisonBasis
  windowPeriods: readonly string[]
  baseline: number | null
  current: number | null
}

/**
 * "Son 3 ayın ortalaması: 30 ədəd · bu ay: 40 ədəd — 1,3×" — whether this month is an ordinary one for this
 * product, against the basis the reader chose (Task 1). A month without the product says so rather than "0,0×",
 * and a product new against the basis gets its two quantities and no multiple.
 */
export function quantityRatioLine(input: QuantityRatioInput, unit: string): string | null {
  if (input.baseline === null || input.current === null) {
    return null
  }

  const quantity = (value: number) => `${formatQuantity(value)}${unit ? ` ${unit}` : ''}`
  const line = `${describeBasis(input.basis, input.windowPeriods)}: ${quantity(input.baseline)} · bu ay: ${quantity(input.current)}`

  if (input.current === 0) {
    return `${line} — bu ay sifariş olunmayıb`
  }

  const ratio = quantityRatio(input.current, input.baseline)
  return ratio === null ? line : `${line} — ${ratio}`
}

/**
 * Who supplied the product: the suppliers of the latest month it was ordered in, with that month named when it
 * is not the last one shown. A month whose lines name nobody says so — never an empty "Təchizatçı:".
 */
export function supplierLine(slots: readonly TrendSlot[]): string {
  const ordered = slots.filter((slot) => slot.point !== null && slot.point.itemCount > 0)
  const latest = ordered[ordered.length - 1]
  if (latest?.point == null || latest.point.supplierNames.length === 0) {
    return 'Təchizatçı qeyd olunmayıb'
  }

  const names = latest.point.supplierNames.join(' · ')
  return latest.period === slots[slots.length - 1].period
    ? `Təchizatçı: ${names}`
    : `Təchizatçı (${formatAnalyticsPeriod(latest.period)}): ${names}`
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
