/** Azerbaijani number conventions, as BaxOrders writes them: 41.285,70 ₼. */

export const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
export const shortMonthNames = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']

export const monthName = (month: number) => monthNames[month - 1]

/** The month in the dative, for «Sentyabra görə». */
const monthDatives = ['Yanvara', 'Fevrala', 'Marta', 'Aprelə', 'Maya', 'İyuna', 'İyula', 'Avqusta', 'Sentyabra', 'Oktyabra', 'Noyabra', 'Dekabra']
export const monthDative = (month: number) => monthDatives[month - 1]

/** «İyul–Sentyabr 2026», or one month's name when the range is one month. */
export function monthRange(months: readonly number[], year: number): string {
  if (months.length === 0) return ''
  const first = months[0], last = months[months.length - 1]
  return first === last ? `${monthName(first)} ${year}` : `${monthName(first)}–${monthName(last)} ${year}`
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

/** An amount in whole manats (owner, 2026-10-28): the qəpik are not shown. */
export function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${moneyParts(Math.round(value)).whole} ₼`
}

export function signedMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  if (Math.abs(value) < 0.5) return '0 ₼'
  return `${value > 0 ? '+' : ''}${money(value)}`
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
