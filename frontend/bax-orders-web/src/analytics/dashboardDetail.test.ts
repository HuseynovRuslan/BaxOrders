import { describe, expect, it } from 'vitest'
import { cleanDetailParams, detailParam, readDetail, readDetailObject } from './dashboardDetail'

/** The open card in the address (01-audit §7.7, AC-04): readable words, and nothing the page cannot open. */
describe('the open card in the address', () => {
  it('names each card in words a person would write', () => {
    expect(detailParam('Amount')).toBe('mebleg')
    expect(detailParam('Baseline')).toBe('baza')
    expect(detailParam('Difference')).toBe('ferq')
    expect(detailParam('Locations')).toBe('obyektler')
  })

  it('reads back exactly those words, and nothing else', () => {
    expect(readDetail('ferq')).toBe('Difference')
    expect(readDetail('obyektler')).toBe('Locations')
    expect(readDetail('Ferq')).toBeNull()
    expect(readDetail('xyz')).toBeNull()
    expect(readDetail(null)).toBeNull()
  })

  it('reads an object only as a whole number above zero', () => {
    expect(readDetailObject('21')).toBe(21)
    expect(readDetailObject('0')).toBeNull()
    expect(readDetailObject('-3')).toBeNull()
    expect(readDetailObject('2.5')).toBeNull()
    expect(readDetailObject('21abc')).toBeNull()
    expect(readDetailObject('99999999999')).toBeNull()
    expect(readDetailObject(null)).toBeNull()
  })
})

describe('putting a link right', () => {
  const clean = (query: string, view: 'Simple' | 'Detailed' = 'Simple') =>
    cleanDetailParams(new URLSearchParams(query), view)?.toString() ?? null

  it('leaves an address the page can open alone', () => {
    expect(clean('period=2026-09&detal=ferq&obyekt=21')).toBeNull()
    expect(clean('period=2026-09&detal=baza')).toBeNull()
    expect(clean('period=2026-09')).toBeNull()
  })

  it('drops a card nobody wrote, and the object with it', () => {
    expect(clean('period=2026-09&detal=xyz&obyekt=21')).toBe('period=2026-09')
  })

  it('drops an object that has no «Fərq» to open in', () => {
    expect(clean('period=2026-09&detal=baza&obyekt=21')).toBe('period=2026-09&detal=baza')
    expect(clean('period=2026-09&obyekt=21')).toBe('period=2026-09')
    expect(clean('period=2026-09&detal=ferq&obyekt=abc')).toBe('period=2026-09&detal=ferq')
  })

  it('opens nothing on «Ətraflı baxış», which keeps its own composition (S-4)', () => {
    expect(clean('view=etrafli&detal=ferq&obyekt=21', 'Detailed')).toBe('view=etrafli')
  })
})
