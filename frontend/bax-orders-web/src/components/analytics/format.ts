import type { AnalyticsComparisonBasis } from '../../api/analytics'

/**
 * The formatting rules the analytics screens share. They are business rules as much as presentation ones —
 * a percentage that does not exist must not read as zero, and money that is only partly known must not read
 * as a total — so they live in one place and are tested.
 */

/** A value the backend did not give. Never `0`, never `∞`, never `NaN`. */
export const unknownValue = '—'

/** Money the system can account for, as opposed to money that was spent. */
export const knownAmountLabel = 'Məlum qiymətlər üzrə'

/** A weighted price is not the last purchase price, and is named accordingly. */
export const weightedPriceLabel = 'Çəkili orta qiymət'

export const weightedPriceHint =
  'Çəkili orta qiymət miqdar nəzərə alınaraq hesablanır: 1 ədəd 10 ₼-dan və 9 ədəd 20 ₼-dan alınıbsa, çəkili orta qiymət 19 ₼-dır, 15 ₼ deyil.'

export const knownAmountHint = 'Qiyməti olmayan sətirlər bu məbləğə daxil deyil.'

export const historyHint = 'Müqayisə yalnız mövcud əvvəlki aylar əsasında hesablanır.'

export const basisLabels: Record<AnalyticsComparisonBasis, string> = {
  PreviousMonth: 'Keçən ay',
  Previous3MonthAverage: 'Son 3 ayın ortalaması',
  Previous6MonthAverage: 'Son 6 ayın ortalaması',
}

export const basisHints: Record<AnalyticsComparisonBasis, string> = {
  PreviousMonth: 'Seçilmiş aydan əvvəlki təqvim ayı.',
  Previous3MonthAverage: 'Mövcud əvvəlki 3 aydakı aylıq göstəricilərin ortalaması.',
  Previous6MonthAverage: 'Mövcud əvvəlki 6 aydakı aylıq göstəricilərin ortalaması.',
}

export const basisOrder: AnalyticsComparisonBasis[] = [
  'PreviousMonth',
  'Previous3MonthAverage',
  'Previous6MonthAverage',
]

export function isBasis(value: string | null): value is AnalyticsComparisonBasis {
  return value !== null && (basisOrder as string[]).includes(value)
}

const monthNames = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
]

/**
 * "2026-07" or "2026-07-01" → "İyul 2026". Parsed as text: a `Date` would be read in the browser's own time
 * zone and could land in the month before.
 */
export function formatMonth(period: string): string {
  const [year, month] = period.split('-')
  return `${monthNames[Number(month) - 1] ?? month} ${year}`
}

/** The `yyyy-MM` the analytics API speaks, from either form. */
export function toMonthKey(period: string): string {
  return period.slice(0, 7)
}

const numberFormat = new Intl.NumberFormat('az-Latn-AZ', { maximumFractionDigits: 4 })
const moneyFormat = new Intl.NumberFormat('az-Latn-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const priceFormat = new Intl.NumberFormat('az-Latn-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const percentFormat = new Intl.NumberFormat('az-Latn-AZ', { maximumFractionDigits: 2 })

export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined ? unknownValue : numberFormat.format(value)
}

/** Money in manat, or an em dash when there is none to show. */
export function formatMoney(value: number | null | undefined): string {
  return value === null || value === undefined ? unknownValue : `${moneyFormat.format(value)} ₼`
}

export function formatPrice(value: number | null | undefined): string {
  return value === null || value === undefined ? unknownValue : `${priceFormat.format(value)} ₼`
}

/** A quantity as the backend gave it, without invented trailing zeros. */
export function formatQuantity(value: number | null | undefined): string {
  return value === null || value === undefined ? unknownValue : numberFormat.format(value)
}

/**
 * "+20%", "−15,5%", "−100%". A null percentage stays an em dash: a rise from nothing has no percentage, and
 * writing `0%` or `∞` would both be false.
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return unknownValue
  }

  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${percentFormat.format(Math.abs(value))}%`
}

/** A signed difference in the same shape as the percentage beside it. */
export function formatDelta(
  value: number | null | undefined,
  format: (value: number) => string = formatCount,
): string {
  if (value === null || value === undefined) {
    return unknownValue
  }

  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${format(Math.abs(value))}`
}

/** Money and its difference: "+1 200,00 ₼". */
export function formatMoneyDelta(value: number | null | undefined): string {
  return formatDelta(value, (amount) => formatMoney(amount))
}

/**
 * How a money figure must be headed. The backend decides whether it is the whole story; the caller never
 * guesses, and an incomplete figure is never called a total.
 */
export function amountHeading(label: string, isComplete: boolean): string {
  return isComplete ? label : `${label} · ${knownAmountLabel}`
}

/** "2 / 3 ay" — what a comparison actually rests on, written where it can be seen. */
export function formatPeriodCoverage(available: number, expected: number): string {
  return `${available}/${expected} ay`
}
