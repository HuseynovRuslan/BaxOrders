import type { AnalyticsComparisonBasis } from '../api/analytics'

/**
 * The comparison basis as it travels in a URL.
 *
 * The query string is the single source of truth for what a screen is comparing against: reload, Back,
 * Forward and a pasted link all restore the same reading, and a dashboard card carries its own basis into the
 * order it opens. That only works if one module owns the spelling, so this is it.
 *
 * The short names are deliberate. `?basis=avg3&from=2026-05&to=2026-08` is something a person can read in the
 * address bar and repeat over the phone; `?basis=Previous3MonthAverage&customStart=…` is the wire format and
 * stays on the wire.
 */
export type BasisParam = 'last' | 'avg3' | 'avg6' | 'all' | 'custom'

/** What a screen is comparing against, resolved from the URL. */
export interface BasisSelection {
  basis: AnalyticsComparisonBasis
  /** `yyyy-MM`, and only ever set for a hand-picked range. */
  from: string | null
  to: string | null
}

const TO_WIRE: Record<BasisParam, AnalyticsComparisonBasis> = {
  last: 'PreviousMonth',
  avg3: 'Previous3MonthAverage',
  avg6: 'Previous6MonthAverage',
  all: 'AllPriorMonths',
  custom: 'CustomRange',
}

const TO_PARAM: Record<AnalyticsComparisonBasis, BasisParam> = {
  PreviousMonth: 'last',
  Previous3MonthAverage: 'avg3',
  Previous6MonthAverage: 'avg6',
  AllPriorMonths: 'all',
  CustomRange: 'custom',
}

/**
 * The spelling these screens used before the short names existed.
 *
 * `?basis=Previous6MonthAverage&customStart=2026-03&customEnd=2026-08` is what a manager's bookmark, a
 * pasted chat message or a mail from before this change still carries. Refusing it would silently show them
 * last month under the link they saved, which is the one failure worse than an error: a different answer
 * under the same address. They are read, and then rewritten in place — see `normalizeBasis`.
 *
 * There is no second table for them: the old spelling was the wire format, so `TO_PARAM` already is the map.
 */
const LEGACY_BASIS: Record<string, BasisParam> = TO_PARAM

/** The wire names of the two months, as the older links spelled them. */
const LEGACY_FROM = 'customStart'
const LEGACY_TO = 'customEnd'

/** The order a reader meets them, on every screen that offers a choice. */
export const basisParamOrder: BasisParam[] = ['last', 'avg3', 'avg6', 'all', 'custom']

/** What every screen falls back to: last month, the reading a decision is usually made against. */
export const defaultSelection: BasisSelection = { basis: 'PreviousMonth', from: null, to: null }

export function isMonth(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function toBasisParam(basis: AnalyticsComparisonBasis): BasisParam {
  return TO_PARAM[basis]
}

export function needsRange(selection: BasisSelection): boolean {
  return selection.basis === 'CustomRange'
}

/** True when the selection can be sent as it stands. A hand-picked range needs both of its months. */
export function isComplete(selection: BasisSelection): boolean {
  return !needsRange(selection) || (isMonth(selection.from) && isMonth(selection.to))
}

/**
 * Reads the basis out of a query string.
 *
 * Anything it does not recognise — a missing param, a typo, a half-typed range — comes back as last month
 * rather than as an error. A URL somebody edited by hand should show a dashboard, not a crash.
 */
export function parseBasis(params: URLSearchParams): BasisSelection {
  const raw = params.get('basis')
  const param = (basisParamOrder as string[]).includes(raw ?? '')
    ? (raw as BasisParam)
    : (LEGACY_BASIS[raw ?? ''] ?? null)
  if (param === null) {
    return defaultSelection
  }

  if (param !== 'custom') {
    return { basis: TO_WIRE[param], from: null, to: null }
  }

  // The short names win where a link carries both, because that is what the screen writes.
  const from = params.get('from') ?? params.get(LEGACY_FROM)
  const to = params.get('to') ?? params.get(LEGACY_TO)
  if (!isMonth(from) || !isMonth(to)) {
    // A half-typed range is not a comparison. The screen still renders, against last month.
    return { basis: 'CustomRange', from: null, to: null }
  }

  // The end never precedes the start; a reader who picks them the wrong way round gets one month, not none.
  return { basis: 'CustomRange', from, to: to < from ? from : to }
}

/** The params to write back, with the ones that no longer apply cleared. */
export function basisParams(selection: BasisSelection): Record<string, string | undefined> {
  if (!needsRange(selection)) {
    return { basis: toBasisParam(selection.basis), from: undefined, to: undefined }
  }

  return {
    basis: 'custom',
    from: selection.from ?? undefined,
    to: selection.to ?? undefined,
  }
}

/**
 * The same URL written the way the screen writes it, or null when it already is.
 *
 * Two things send a reader to an address that does not match what they are looking at, and both are fixed
 * here. A link saved before the short names existed still says `basis=Previous6MonthAverage`; and a basis
 * nobody recognises — a typo, a truncated paste, a value from a version that no longer exists — falls back to
 * last month while the address goes on claiming six. Either way the reader copies the address on and passes
 * the mismatch to somebody else.
 *
 * What it does not touch: a URL with no basis at all, which is not making any claim, and a half-typed range,
 * where dropping the month somebody has already chosen would undo their work while they are still choosing.
 * Returns null for both, so a caller can use it as its own guard and never replace an entry with itself.
 */
export function normalizeBasis(params: URLSearchParams): URLSearchParams | null {
  const raw = params.get('basis')
  const hasLegacyRange = params.has(LEGACY_FROM) || params.has(LEGACY_TO)
  if (raw === null && !hasLegacyRange) {
    return null
  }

  const selection = parseBasis(params)
  const next = new URLSearchParams(params)
  next.set('basis', toBasisParam(selection.basis))

  if (hasLegacyRange) {
    next.delete(LEGACY_FROM)
    next.delete(LEGACY_TO)
    if (selection.from !== null) {
      next.set('from', selection.from)
    }

    if (selection.to !== null) {
      next.set('to', selection.to)
    }
  }

  // The months travel only with the basis that uses them.
  if (selection.basis !== 'CustomRange') {
    next.delete('from')
    next.delete('to')
  }

  return next.toString() === params.toString() ? null : next
}

/** The same thing as a query string, for a link rather than a state update. */
export function basisSearch(selection: BasisSelection): string {
  const search = new URLSearchParams()
  for (const [name, value] of Object.entries(basisParams(selection))) {
    if (value !== undefined) {
      search.set(name, value)
    }
  }

  return search.toString()
}

/**
 * Where "Detallara bax" goes: the order, carrying the basis the card was showing.
 *
 * Without this the manager reads "+15 129,07 ₼ against the three-month average", clicks through, and is shown
 * last month's figure instead — two answers to one question.
 */
export function orderLink(orderRequestId: number, selection: BasisSelection): string {
  const search = basisSearch(selection)
  return search ? `/orders/${orderRequestId}?${search}` : `/orders/${orderRequestId}`
}

/**
 * Where an order's price warning goes: Qiymət təsnifatı, narrowed to that order's unpriced lines (14.1).
 *
 * It carries the basis the order page was showing — not for the pricing page, which compares nothing, but so its
 * "Sifarişə qayıt" can hand the reader back the reading they left.
 */
export function pricingReviewLink(orderRequestId: number, selection: BasisSelection): string {
  const search = basisSearch(selection)
  return search ? `/pricing-modes?order=${orderRequestId}&${search}` : `/pricing-modes?order=${orderRequestId}`
}

/** The same for an object, so a row with no order this month still keeps the reading. */
export function locationLink(locationId: number, selection: BasisSelection): string {
  const search = basisSearch(selection)
  return search ? `/locations/${locationId}?${search}` : `/locations/${locationId}`
}

/** What the API is sent. `CustomRange` travels with its months; every other basis travels alone. */
export function basisRequest(selection: BasisSelection): {
  basis: AnalyticsComparisonBasis
  customStart?: string
  customEnd?: string
} {
  if (!needsRange(selection) || !isComplete(selection)) {
    // An incomplete range is never sent: the API refuses it, and a blank screen is not an answer.
    return { basis: needsRange(selection) ? 'PreviousMonth' : selection.basis }
  }

  return { basis: 'CustomRange', customStart: selection.from!, customEnd: selection.to! }
}

/** The month before this one, as `yyyy-MM`. What a hand-picked range starts out as. */
export function previousMonth(period: string): string {
  const [year, month] = period.slice(0, 7).split('-').map(Number)
  return month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, '0')}`
}
