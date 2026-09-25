import type { DriverFilter } from '../components/decisions/labels'

/**
 * How an order page's reading of its own changes travels in a URL — today, which products "Əsas dəyişikliklər" is
 * showing.
 *
 * The same principle as the basis (`basisParams`): the query string is the single source of truth, so a reload,
 * Back and a pasted link all restore the list the reader was looking at, and one module owns the spelling. This one
 * owns `cause` and nothing else. The basis is `basisParams`'s; nothing here reads or writes `basis`, `from` or `to`.
 */

/** The driver filter as it travels in a URL. Short on purpose, like the basis: a person can read it aloud. */
export type CauseParam = 'new' | 'qty' | 'price' | 'dropped' | 'noprice' | 'steady'

/** The parameter's name. `?cause=new` is the "Yeni məhsullar" chip. */
const causeParamName = 'cause'

const TO_FILTER: Record<CauseParam, Exclude<DriverFilter, 'All'>> = {
  new: 'New',
  qty: 'QuantityChange',
  price: 'PriceChange',
  dropped: 'NoLongerOrdered',
  noprice: 'MissingPrice',
  steady: 'Steady',
}

const TO_PARAM: Record<Exclude<DriverFilter, 'All'>, CauseParam> = {
  New: 'new',
  QuantityChange: 'qty',
  PriceChange: 'price',
  NoLongerOrdered: 'dropped',
  MissingPrice: 'noprice',
  Steady: 'steady',
}

const causeParams = Object.keys(TO_FILTER) as CauseParam[]

/**
 * The filter a value asks for. Absent, or anything it does not recognise — a typo, a truncated paste — is "Hamısı":
 * a hand-edited address shows the whole list rather than an error.
 */
export function causeParamToFilter(value: string | null): DriverFilter {
  return (causeParams as string[]).includes(value ?? '') ? TO_FILTER[value as CauseParam] : 'All'
}

/** The value to write, or null for "Hamısı", which is the list with no parameter at all. */
export function filterToCauseParam(filter: DriverFilter): CauseParam | null {
  return filter === 'All' ? null : TO_PARAM[filter]
}

/**
 * The filter a query string asks for. Never throws.
 *
 * An unrecognised value is read as "Hamısı" and left in the address as it is: it claims no filter, so the screen
 * showing the whole list does not contradict it, and the next chip or reason the reader presses replaces it.
 */
export function parseCause(params: URLSearchParams): DriverFilter {
  return causeParamToFilter(params.get(causeParamName))
}

/**
 * The same query string with `cause` set to `filter` (removed for 'All'), every other parameter kept as it was —
 * or null when that is the query string already, so a caller never pushes an entry identical to the current one.
 */
export function withCause(params: URLSearchParams, filter: DriverFilter): URLSearchParams | null {
  const next = new URLSearchParams(params)
  const value = filterToCauseParam(filter)
  if (value === null) {
    next.delete(causeParamName)
  } else {
    next.set(causeParamName, value)
  }

  return next.toString() === params.toString() ? null : next
}
