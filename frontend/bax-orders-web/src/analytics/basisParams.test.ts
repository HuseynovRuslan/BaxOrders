import { describe, expect, it } from 'vitest'
import {
  basisParams,
  basisRequest,
  basisSearch,
  defaultSelection,
  isComplete,
  isMonth,
  orderLink,
  parseBasis,
  previousMonth,
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
    expect(parseBasis(params('basis=Previous3MonthAverage'))).toEqual(defaultSelection)
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
