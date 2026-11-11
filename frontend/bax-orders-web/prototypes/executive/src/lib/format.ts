/** Azerbaijani number conventions, as BaxOrders writes them: 41.285,70 ₼. */

export const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
export const shortMonthNames = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']

/**
 * A month as the screens count it: from January of the year on screen, so 0 is the December before it and 13 the
 * January after — a comparison can reach into the year before.
 */
const index = (month: number) => (((month - 1) % 12) + 12) % 12
export const monthName = (month: number) => monthNames[index(month)]
/** The calendar year of a month counted from January of `year`. */
export const yearOf = (month: number, year: number) => year + Math.floor((month - 1) / 12)
/** «Dekabr 2025». */
export const monthYear = (month: number, year: number) => `${monthName(month)} ${yearOf(month, year)}`
/** The month's name, with its year only when it is not `year`'s: «Noyabr», «Dekabr 2025». */
export const monthNameIn = (month: number, year: number) => (yearOf(month, year) === year ? monthName(month) : monthYear(month, year))

/** The month in the dative, for «Sentyabra görə». */
const monthDatives = ['Yanvara', 'Fevrala', 'Marta', 'Aprelə', 'Maya', 'İyuna', 'İyula', 'Avqusta', 'Sentyabra', 'Oktyabra', 'Noyabra', 'Dekabra']
export const monthDative = (month: number) => monthDatives[index(month)]

/** «İyul–Sentyabr 2026», «Noyabr 2025–Yanvar 2026», or one month's name when the range is one month. */
export function monthRange(months: readonly number[], year: number): string {
  if (months.length === 0) return ''
  const first = months[0], last = months[months.length - 1]
  if (first === last) return monthYear(first, year)
  return yearOf(first, year) === yearOf(last, year)
    ? `${monthName(first)}–${monthName(last)} ${yearOf(last, year)}`
    : `${monthYear(first, year)}–${monthYear(last, year)}`
}

function group(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export const minus = '−'

/** The amount split into its whole manats and its qəpik, so a large figure can set the qəpik smaller. */
export function moneyParts(value: number): { whole: string; cents: string } {
  const [integer, cents] = Math.abs(value).toFixed(2).split('.')
  return { whole: `${value < 0 ? minus : ''}${group(integer)}`, cents }
}

/** Whole manats, a half rounded away from zero: 17,50 ₼ reads 18 ₼, so a difference of −17,50 ₼ reads −18 ₼, not −17. */
export const wholeManats = (value: number) => Math.sign(value) * Math.round(Math.abs(value))

/** An amount in whole manats (owner, 2026-10-28): the qəpik are not shown. Never a unit price — that is price(). */
export function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${moneyParts(wholeManats(value)).whole} ₼`
}

/**
 * An amount to the qəpik, for one shown beside its quantity × price (owner, 2026-11-02): 10 paçka × 1,75 ₼ must read
 * 17,50 ₼, not 18 ₼. Its difference and its total keep the qəpik too, so the rows still add up.
 */
export function exactMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const { whole, cents } = moneyParts(value)
  return `${whole},${cents} ₼`
}

export function signedMoney(value: number | null | undefined, exact = false): string {
  if (value === null || value === undefined) return '—'
  if (Math.abs(value) < (exact ? 0.005 : 0.5)) return exact ? '0,00 ₼' : '0 ₼'
  return `${value > 0 ? '+' : ''}${exact ? exactMoney(value) : money(value)}`
}

export function percent(value: number | null | undefined, signed = true): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const rounded = Math.round(value * 1000) / 10
  const text = Math.abs(rounded).toFixed(Math.abs(rounded) >= 100 ? 0 : 1).replace('.', ',')
  const sign = rounded > 0 ? (signed ? '+' : '') : rounded < 0 ? minus : ''
  return `${sign}${text}%`
}

export function quantity(value: number | null | undefined, unit?: string | null): string {
  if (value === null || value === undefined) return '—'
  const whole = Math.abs(value - Math.round(value)) < 0.05
  const text = whole ? group(String(Math.round(value))) : (() => {
    const [integer, decimals] = value.toFixed(1).split('.')
    return `${group(integer)},${decimals}`
  })()
  return unit ? `${text} ${unit}` : text
}

/** Quantities in more than one unit, each in its own: «312 cüt + 2 qutu». */
export function quantityParts(parts: readonly { qty: number; unit: string }[]): string {
  return parts.map((part) => quantity(part.qty, part.unit)).join(' + ')
}

export function price(value: number | null | undefined, unit?: string | null): string {
  if (value === null || value === undefined) return '—'
  // A unit price keeps its qəpik: 0,36 ₼ a metre would otherwise read 0 ₼.
  const { whole, cents } = moneyParts(value)
  return unit ? `${whole},${cents} ₼ / ${unit}` : `${whole},${cents} ₼`
}

/** Which way a cost moved, in words: the colour never speaks alone. */
export function direction(delta: number | null | undefined): 'up' | 'down' | 'flat' | null {
  if (delta === null || delta === undefined) return null
  if (Math.abs(delta) < 0.005) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

export const directionWords = { up: 'xərc artıb', down: 'xərc azalıb', flat: 'dəyişməyib' } as const
