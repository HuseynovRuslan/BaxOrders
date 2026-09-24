import type { AnalyticsComparisonBasis } from '../../api/analytics'
import { allPriorMonthsLabel, averagePriceLabel, pricedLinesTotalLabel } from '../../terminology/terms'

/**
 * The formatting rules the analytics screens share. They are business rules as much as presentation ones —
 * a percentage that does not exist must not read as zero, and money that is only partly known must not read
 * as a total — so they live in one place and are tested.
 */

/** A value the backend did not give. Never `0`, never `∞`, never `NaN`. */
export const unknownValue = '—'

/** U+00A0. Written by its code point, because the character itself cannot be told from a space on screen. */
export const noBreakSpace = String.fromCharCode(0xa0)

/**
 * What comes between an amount and ₼: a no-break space. An ordinary one is a place a line may break, which is
 * how "99,00" and "₼" ended up on two lines of a narrow table cell at 1366 px and on a phone.
 */
export const manatSuffix = `${noBreakSpace}₼`

/** Money the system can account for, as opposed to money that was spent. */
export const knownAmountLabel = pricedLinesTotalLabel

/** A weighted price is not the last purchase price; the hint beside it says how it is weighted. */
export const weightedPriceLabel = averagePriceLabel

export const weightedPriceHint =
  `Orta qiymət miqdar nəzərə alınaraq hesablanır: 1 ədəd 10${manatSuffix}-dan və 9 ədəd 20${manatSuffix}-dan `
  + `alınıbsa, orta qiymət 19${manatSuffix}-dır, 15${manatSuffix} deyil.`

export const knownAmountHint = 'Qiyməti olmayan sətirlər bu məbləğə daxil deyil.'

export const historyHint = 'Müqayisə yalnız mövcud əvvəlki aylar əsasında hesablanır.'

/** What each choice is called in the picker. The two open-ended ones are named by `describeBasis` once chosen. */
export const basisLabels: Record<AnalyticsComparisonBasis, string> = {
  PreviousMonth: 'Keçən ay',
  Previous3MonthAverage: 'Son 3 ayın ortalaması',
  Previous6MonthAverage: 'Son 6 ayın ortalaması',
  AllPriorMonths: allPriorMonthsLabel,
  CustomRange: 'Xüsusi seçim',
}

export const basisHints: Record<AnalyticsComparisonBasis, string> = {
  PreviousMonth: 'Seçilmiş aydan əvvəlki təqvim ayı.',
  Previous3MonthAverage: 'Mövcud əvvəlki 3 aydakı aylıq göstəricilərin ortalaması.',
  Previous6MonthAverage: 'Mövcud əvvəlki 6 aydakı aylıq göstəricilərin ortalaması.',
  AllPriorMonths:
    'Seçilmiş aydan əvvəlki bütün mövcud ayların ortalaması. Sifariş olmayan aylar sıfır sayılmır, ortalamaya daxil edilmir.',
  CustomRange:
    'Özünüz seçdiyiniz ayların ortalaması. Seçim seçilmiş aydan əvvəl olmalıdır; sifariş olmayan aylar ortalamaya daxil edilmir.',
}

export const basisOrder: AnalyticsComparisonBasis[] = [
  'PreviousMonth',
  'Previous3MonthAverage',
  'Previous6MonthAverage',
  'AllPriorMonths',
  'CustomRange',
]

export function isBasis(value: string | null): value is AnalyticsComparisonBasis {
  return value !== null && (basisOrder as string[]).includes(value)
}

/** Whether this basis needs two months chosen before it means anything. */
export function basisNeedsRange(basis: AnalyticsComparisonBasis): boolean {
  return basis === 'CustomRange'
}

/**
 * What the comparison is actually against, in words, for the column heading and the summary line.
 *
 * The fixed bases name themselves, and so does "Bütün dövrün ortalaması" — the button and the sentence it
 * produces say the same words. A hand-picked range cannot: it is whatever was picked, so it is named from the
 * months the backend resolved, and a range of one month is named as that month rather than as an average of it.
 */
export function describeBasis(basis: AnalyticsComparisonBasis, periods: readonly string[]): string {
  if (basis !== 'CustomRange') {
    return basisLabels[basis]
  }

  if (periods.length === 0) {
    return basisLabels.CustomRange
  }

  if (periods.length === 1) {
    return formatMonth(periods[0])
  }

  // "Yanvar–May ortalaması" within one year; the year is repeated only when it changes, because a heading
  // that reads "Noyabr–Fevral" without it would name four months that are not the four being averaged.
  const first = periods[0]
  const last = periods[periods.length - 1]
  const sameYear = first.slice(0, 4) === last.slice(0, 4)
  const from = sameYear ? formatMonth(first).split(' ')[0] : formatMonth(first)
  return `${from}–${formatMonth(last)} ortalaması`
}

/**
 * The months a window actually covers: "İyun–Avqust 2026", or "Mart 2026" when it is one month.
 *
 * Every screen that names a basis names its months beside it. "Son 3 ayın ortalaması" is a rule; the reader
 * needs to know which three, because two of them may be months this object never ordered in.
 */
export function formatMonthRange(periods: readonly string[]): string | null {
  if (periods.length === 0) {
    return null
  }

  const first = periods[0]
  const last = periods[periods.length - 1]
  if (first.slice(0, 7) === last.slice(0, 7)) {
    return formatMonth(first)
  }

  // The year is repeated only when it changes: "Noyabr 2025–Yanvar 2026" names four months that
  // "Noyabr–Yanvar 2026" would get wrong.
  const sameYear = first.slice(0, 4) === last.slice(0, 4)
  const from = sameYear ? formatMonth(first).split(' ')[0] : formatMonth(first)
  return `${from}–${formatMonth(last)}`
}

/** "Son 3 ayın ortalaması (İyun–Avqust 2026)" — the rule and the months it landed on. */
export function describeBasisWithRange(
  basis: AnalyticsComparisonBasis,
  periods: readonly string[],
): string {
  const range = formatMonthRange(periods)
  const label = describeBasis(basis, periods)
  // A hand-picked range is already named by its months; saying them twice helps nobody.
  if (range === null || basis === 'CustomRange') {
    return label
  }

  return `${label} (${range})`
}

/**
 * The caption a card carries: "Son 3 ayın ortalamasına görə".
 *
 * As with the ablative below, the fixed phrasings are written out and an arbitrary month takes the form that
 * needs no ending — guessing an Azerbaijani case ending for "Mart 2026" would produce wrong Azerbaijani.
 */
export function describeBasisCaption(
  basis: AnalyticsComparisonBasis,
  periods: readonly string[],
): string {
  switch (basis) {
    case 'PreviousMonth':
      return 'Keçən aya görə'
    case 'Previous3MonthAverage':
      return 'Son 3 ayın ortalamasına görə'
    case 'Previous6MonthAverage':
      return 'Son 6 ayın ortalamasına görə'
    case 'AllPriorMonths':
      return 'Bütün dövrün ortalamasına görə'
    case 'CustomRange':
      return periods.length > 1
        ? `${describeBasis(basis, periods)}na görə`
        : `${describeBasis(basis, periods)} ilə müqayisədə`
  }
}

/**
 * The comparison basis in the ablative, for "… yüksəkdir" / "… aşağıdır".
 *
 * Azerbaijani case endings depend on the word they attach to, and a hand-picked month can be any month of any
 * year, so the four fixed phrasings are written out and anything else takes the "… ilə müqayisədə" form, which
 * needs no ending at all. Guessing an ending for an arbitrary string would produce wrong Azerbaijani.
 */
export function describeBasisAblative(basis: AnalyticsComparisonBasis, periods: readonly string[]): string {
  switch (basis) {
    case 'PreviousMonth':
      return 'Keçən aydan'
    case 'Previous3MonthAverage':
      return 'Son 3 ayın ortalamasından'
    case 'Previous6MonthAverage':
      return 'Son 6 ayın ortalamasından'
    case 'AllPriorMonths':
      return 'Bütün dövrün ortalamasından'
    case 'CustomRange':
      return periods.length > 1 ? `${describeBasis(basis, periods)}ndan` : `${describeBasis(basis, periods)} ilə müqayisədə`
  }
}

/** "Son 6 ayın ortalamasından yüksəkdir". Null when there is no difference to describe. */
export function describeDirection(
  basis: AnalyticsComparisonBasis,
  periods: readonly string[],
  delta: number | null | undefined,
): string | null {
  if (delta === null || delta === undefined) {
    return null
  }

  const basisText = describeBasisAblative(basis, periods)
  if (delta === 0) {
    return `${basisText} fərqlənmir`
  }

  return `${basisText} ${delta > 0 ? 'yüksəkdir' : 'aşağıdır'}`
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
const percentFormat = new Intl.NumberFormat('az-Latn-AZ', { maximumFractionDigits: 2 })

export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined ? unknownValue : numberFormat.format(value)
}

/** Money in manat, or an em dash when there is none to show. */
export function formatMoney(value: number | null | undefined): string {
  return value === null || value === undefined ? unknownValue : `${moneyFormat.format(value)}${manatSuffix}`
}

/**
 * A unit price, to the qəpik: "32,13 ₼", never "32,1273 ₼". Rounded for display only — the value passed in,
 * and everything the backend computed from it, is untouched.
 */
export function formatPrice(value: number | null | undefined): string {
  return formatMoney(value)
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

/**
 * The pre-9.1 rule, kept only for the screens Tasks 08, 09, 10 and 11 will move onto `costDirectionToneClass`:
 * emerald up, rose down, slate flat — the opposite of owner decision 9.1. Nothing new may use it.
 *
 * It says which way the figure went and nothing else. More is not better and less is not worse — an object
 * that spent less may have skipped work it needed to do — so this is never used on anything but a signed
 * change, and never to grade an object.
 */
export function signedToneClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return 'text-slate-600'
  }

  return value > 0 ? 'text-emerald-700' : 'text-rose-700'
}

/**
 * Owner decision 9.1: a cost that went up is red and a cost that went down is green. It is the direction of the
 * cost, never a verdict — more is not worse and less is not better. Zero and unknown are slate.
 */
export function costDirectionToneClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return 'text-slate-600'
  }

  return value > 0 ? 'text-red-700' : 'text-emerald-700'
}

/** The same rule as `costDirectionToneClass`, for a filled shape such as a bar. */
export function costDirectionBarClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return 'bg-slate-300'
  }

  return value > 0 ? 'bg-red-500' : 'bg-emerald-500'
}
