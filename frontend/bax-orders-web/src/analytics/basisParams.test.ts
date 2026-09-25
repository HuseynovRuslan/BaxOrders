import { describe, expect, it } from 'vitest'
import {
  basisParams,
  basisRequest,
  basisSearch,
  defaultSelection,
  isComplete,
  isMonth,
  normalizeBasis,
  orderLink,
  parseBasis,
  previousMonth,
  pricingReviewLink,
  toBasisParam,
  type BasisSelection,
} from './basisParams'

/**
 * The query string is what a screen is comparing against.
 *
 * Two rules carry the whole feature. Anything unrecognised falls back to last month rather than breaking —
 * URLs get hand-edited, truncated and pasted — and whatever a dashboard card was showing travels into the
 * order it opens, so the manager never gets two answers to "how much did it change?".
 */
const params = (search: string) => new URLSearchParams(search)

describe('reading the basis out of a URL', () => {
  it('reads each of the five', () => {
    expect(parseBasis(params('basis=last')).basis).toBe('PreviousMonth')
    expect(parseBasis(params('basis=avg3')).basis).toBe('Previous3MonthAverage')
    expect(parseBasis(params('basis=avg6')).basis).toBe('Previous6MonthAverage')
    expect(parseBasis(params('basis=all')).basis).toBe('AllPriorMonths')
    expect(parseBasis(params('basis=custom&from=2026-05&to=2026-08'))).toEqual({
      basis: 'CustomRange',
      from: '2026-05',
      to: '2026-08',
    })
  })

  it('falls back to last month when there is no basis at all', () => {
    expect(parseBasis(params(''))).toEqual(defaultSelection)
    expect(parseBasis(params('period=2026-09'))).toEqual(defaultSelection)
  })

  /** A hand-edited URL should still show a dashboard. */
  it('falls back to last month on anything it does not recognise', () => {
    expect(parseBasis(params('basis=avg12'))).toEqual(defaultSelection)
    expect(parseBasis(params('basis=LAST'))).toEqual(defaultSelection)
    expect(parseBasis(params('basis='))).toEqual(defaultSelection)
    expect(parseBasis(params('basis=Previous3Month'))).toEqual(defaultSelection)
  })

  it('keeps the custom basis but drops a half-typed range', () => {
    expect(parseBasis(params('basis=custom'))).toEqual({ basis: 'CustomRange', from: null, to: null })
    expect(parseBasis(params('basis=custom&from=2026-05'))).toEqual({ basis: 'CustomRange', from: null, to: null })
    expect(parseBasis(params('basis=custom&from=2026-13&to=2026-14'))).toEqual({ basis: 'CustomRange', from: null, to: null })
    expect(parseBasis(params('basis=custom&from=mayıs&to=avqust'))).toEqual({ basis: 'CustomRange', from: null, to: null })
  })

  /** Picked the wrong way round: one month, never none, and never a negative window. */
  it('never lets the range end before it starts', () => {
    expect(parseBasis(params('basis=custom&from=2026-08&to=2026-05'))).toEqual({
      basis: 'CustomRange',
      from: '2026-08',
      to: '2026-08',
    })
  })

  it('accepts a range of one month', () => {
    expect(parseBasis(params('basis=custom&from=2026-03&to=2026-03'))).toEqual({
      basis: 'CustomRange',
      from: '2026-03',
      to: '2026-03',
    })
  })
})

describe('writing the basis back', () => {
  it('round-trips every basis', () => {
    for (const search of ['basis=last', 'basis=avg3', 'basis=avg6', 'basis=all', 'basis=custom&from=2026-05&to=2026-08']) {
      expect(basisSearch(parseBasis(params(search)))).toBe(search)
    }
  })

  /** Leaving them behind would send months with a basis the API refuses them on. */
  it('clears the range when the basis does not use one', () => {
    expect(basisParams({ basis: 'Previous6MonthAverage', from: '2026-05', to: '2026-08' })).toEqual({
      basis: 'avg6',
      from: undefined,
      to: undefined,
    })
  })

  it('names each basis the short way', () => {
    expect(toBasisParam('PreviousMonth')).toBe('last')
    expect(toBasisParam('AllPriorMonths')).toBe('all')
    expect(toBasisParam('CustomRange')).toBe('custom')
  })
})

describe('what gets sent to the API', () => {
  it('sends the basis alone where no months apply', () => {
    expect(basisRequest({ basis: 'Previous3MonthAverage', from: null, to: null })).toEqual({
      basis: 'Previous3MonthAverage',
    })
  })

  it('sends both months with a hand-picked range', () => {
    expect(basisRequest({ basis: 'CustomRange', from: '2026-05', to: '2026-08' })).toEqual({
      basis: 'CustomRange',
      customStart: '2026-05',
      customEnd: '2026-08',
    })
  })

  /**
   * The screen must not go blank while somebody is still choosing. An incomplete range asks for last month
   * instead of asking for nothing.
   */
  it('asks for last month while a range is still being chosen', () => {
    expect(basisRequest({ basis: 'CustomRange', from: null, to: null })).toEqual({ basis: 'PreviousMonth' })
    expect(isComplete({ basis: 'CustomRange', from: null, to: null })).toBe(false)
    expect(isComplete({ basis: 'CustomRange', from: '2026-05', to: '2026-08' })).toBe(true)
    expect(isComplete({ basis: 'AllPriorMonths', from: null, to: null })).toBe(true)
  })
})

describe('carrying the basis into an order', () => {
  it('puts it on the link', () => {
    const selection: BasisSelection = { basis: 'Previous3MonthAverage', from: null, to: null }
    expect(orderLink(154, selection)).toBe('/orders/154?basis=avg3')
  })

  it('carries a hand-picked range too', () => {
    expect(orderLink(154, { basis: 'CustomRange', from: '2026-05', to: '2026-08' }))
      .toBe('/orders/154?basis=custom&from=2026-05&to=2026-08')
  })
})

/**
 * 14.1: the price warning opens Qiymət təsnifatı for its order. The pricing page compares nothing, but it carries
 * the basis so that its way back hands the reader the order exactly as they left it.
 */
describe('carrying the basis to an order’s unpriced lines', () => {
  it('opens the pricing page on the order', () => {
    expect(pricingReviewLink(154, defaultSelection)).toBe('/pricing-modes?order=154&basis=last')
  })

  it('carries the same basis parameters the order link carries, for every basis', () => {
    const selections: BasisSelection[] = [
      defaultSelection,
      { basis: 'Previous3MonthAverage', from: null, to: null },
      { basis: 'Previous6MonthAverage', from: null, to: null },
      { basis: 'AllPriorMonths', from: null, to: null },
      { basis: 'CustomRange', from: '2026-05', to: '2026-08' },
    ]

    for (const selection of selections) {
      const pricing = new URL(pricingReviewLink(154, selection), 'http://x').searchParams
      const order = new URL(orderLink(154, selection), 'http://x').searchParams

      expect(pricing.get('order')).toBe('154')
      pricing.delete('order')
      expect(pricing.toString()).toBe(order.toString())
      // And what the pricing page reads back is the selection it was given.
      expect(parseBasis(pricing)).toEqual(selection)
    }
  })
})

describe('months', () => {
  it('knows one when it sees one', () => {
    expect(isMonth('2026-09')).toBe(true)
    expect(isMonth('2026-9')).toBe(false)
    expect(isMonth('2026-00')).toBe(false)
    expect(isMonth('2026-13')).toBe(false)
    expect(isMonth(null)).toBe(false)
  })

  it('steps back a month, across the year boundary', () => {
    expect(previousMonth('2026-09')).toBe('2026-08')
    expect(previousMonth('2026-01')).toBe('2025-12')
    expect(previousMonth('2026-09-01')).toBe('2026-08')
  })
})

/**
 * Links written before the short names existed.
 *
 * A manager's bookmark, a link pasted into a chat, a mail sent last month: they all carry
 * `?basis=Previous6MonthAverage&customStart=2026-03&customEnd=2026-08`. Refusing to read it would show them
 * last month under the address they saved, which is worse than an error — it is a different answer under the
 * same link, with nothing to say so.
 */
describe('a link written in the old spelling', () => {
  it('still opens the comparison it was saved with', () => {
    expect(parseBasis(params('basis=PreviousMonth')).basis).toBe('PreviousMonth')
    expect(parseBasis(params('basis=Previous3MonthAverage')).basis).toBe('Previous3MonthAverage')
    expect(parseBasis(params('basis=Previous6MonthAverage')).basis).toBe('Previous6MonthAverage')
    expect(parseBasis(params('basis=AllPriorMonths')).basis).toBe('AllPriorMonths')
  })

  it('still opens the hand-picked range it was saved with', () => {
    expect(parseBasis(params('basis=CustomRange&customStart=2026-05&customEnd=2026-08'))).toEqual({
      basis: 'CustomRange',
      from: '2026-05',
      to: '2026-08',
    })
  })

  /** A link that carries both spellings is one the screen half-rewrote; today's wins. */
  it('prefers the spelling the screen writes when a link carries both', () => {
    expect(parseBasis(params('basis=custom&from=2026-07&to=2026-07&customStart=2026-01&customEnd=2026-02'))).toEqual({
      basis: 'CustomRange',
      from: '2026-07',
      to: '2026-07',
    })
  })

  /**
   * The other way a URL stops matching the screen: a basis nobody recognises falls back to last month while
   * the address goes on claiming six. The reader copies the address on and passes the mismatch to somebody
   * else, which is the same failure as the old spelling and is fixed the same way.
   */
  it('rewrites a basis nobody recognises to the one actually being shown', () => {
    const next = normalizeBasis(params('period=2026-09&basis=avg12&from=2026-05&to=2026-08'))

    expect(next?.get('basis')).toBe('last')
    expect(next?.has('from')).toBe(false)
    expect(next?.has('to')).toBe(false)
    expect(next?.get('period')).toBe('2026-09')
  })

  /** Somebody halfway through choosing a range has not made a mistake; their months stay where they are. */
  it('leaves a half-typed range alone', () => {
    expect(normalizeBasis(params('basis=custom&from=2026-05'))).toBeNull()
  })

  it("is rewritten into today's spelling, with everything else left where it was", () => {
    const next = normalizeBasis(params('period=2026-09&basis=Previous6MonthAverage&sort=KnownAmountDelta'))

    expect(next?.get('basis')).toBe('avg6')
    expect(next?.get('period')).toBe('2026-09')
    expect(next?.get('sort')).toBe('KnownAmountDelta')
    expect(next?.has('from')).toBe(false)
  })

  it('moves a range onto the short month names and drops the long ones', () => {
    const next = normalizeBasis(params('basis=CustomRange&customStart=2026-05&customEnd=2026-08'))

    expect(next?.get('basis')).toBe('custom')
    expect(next?.get('from')).toBe('2026-05')
    expect(next?.get('to')).toBe('2026-08')
    expect(next?.has('customStart')).toBe(false)
    expect(next?.has('customEnd')).toBe(false)
  })

  /** Nothing to rewrite means no rewrite: a history entry that changes nothing is one Back has to step over. */
  it("leaves a URL already in today's spelling alone", () => {
    expect(normalizeBasis(params('basis=avg6&period=2026-09'))).toBeNull()
    expect(normalizeBasis(params('basis=custom&from=2026-05&to=2026-08'))).toBeNull()
    expect(normalizeBasis(params(''))).toBeNull()
    // A URL that makes no claim about the basis is not corrected into making one.
    expect(normalizeBasis(params('period=2026-09'))).toBeNull()
  })
})
