import { describe, expect, it } from 'vitest'
import { formatMoneyDelta } from '../components/analytics/format'
import { findOldTerms } from '../test/oldTerms'
import { locativeSuffix, unexplainedPartNote } from './terms'

/** U+00A0, by its code point: the no-break space the money formatter puts before ₼. */
const nbsp = String.fromCharCode(0xa0)

/**
 * The order page's warning says how much of the change is unexplained and on which products — never the bare
 * "a part cannot be explained", which the audit found beside parts that added up to the total exactly.
 */
describe('the unexplained part of a change', () => {
  it('names the one product it sits on', () => {
    expect(unexplainedPartNote(formatMoneyDelta(-18.96), ['Əlcək'])).toBe(
      `Dəyişikliyin −18,96${nbsp}₼ hissəsi izah edilə bilmir, çünki bu məhsulların bəzi sətirlərində qiymət yoxdur: Əlcək.`,
    )
  })

  it('names up to three products, in the order given', () => {
    expect(unexplainedPartNote(formatMoneyDelta(1250), ['Əlcək', 'Zibil paketi', 'Rosmarinus'])).toBe(
      `Dəyişikliyin +1.250,00${nbsp}₼ hissəsi izah edilə bilmir, çünki bu məhsulların bəzi sətirlərində qiymət yoxdur: `
        + 'Əlcək, Zibil paketi, Rosmarinus.',
    )
  })

  it('counts the rest after three', () => {
    const note = unexplainedPartNote(formatMoneyDelta(-40), ['Əlcək', 'Sabun', 'Gübrə', 'Rosmarinus', 'Zibil paketi'])

    expect(note).toMatch(/: Əlcək, Sabun, Gübrə və daha 2 məhsul\.$/)
    expect(note).not.toContain('Rosmarinus')
    expect(note).not.toContain('Zibil paketi')
  })

  it('names a product once, however many of its variants lack a price', () => {
    expect(unexplainedPartNote(formatMoneyDelta(-40), ['Əlcək', 'Əlcək', 'Zibil paketi']))
      .toMatch(/: Əlcək, Zibil paketi\.$/)
    expect(unexplainedPartNote(formatMoneyDelta(-40), ['A', 'A', 'B', 'C', 'C', 'D']))
      .toMatch(/: A, B, C və daha 1 məhsul\.$/)
  })

  it('never ends on an empty list when no product is named', () => {
    expect(unexplainedPartNote(formatMoneyDelta(-40), [])).toBe(
      `Dəyişikliyin −40,00${nbsp}₼ hissəsi izah edilə bilmir, çünki bəzi sətirlərdə qiymət yoxdur.`,
    )
  })

  it('carries the amount with its sign and ₼', () => {
    expect(unexplainedPartNote(formatMoneyDelta(-18.96), ['Əlcək'])).toContain(`−18,96${nbsp}₼`)
    expect(unexplainedPartNote(formatMoneyDelta(30), ['Əlcək'])).toContain(`+30,00${nbsp}₼`)
  })

  it('uses no retired word', () => {
    const root = document.createElement('div')
    root.textContent = unexplainedPartNote(formatMoneyDelta(-40), ['A', 'B', 'C', 'D', 'E'])

    expect(findOldTerms(root)).toEqual([])
  })
})

/**
 * "Son 9 ayın 3-də sifariş edilib": the ending follows the last number word that is pronounced, so it is
 * worked out from the number rather than written as "-də" for all of them.
 */
describe('the locative ending of a number', () => {
  it('follows the last digit when it is not zero', () => {
    const expected: Record<number, string> = {
      1: 'də', // bir
      2: 'də', // iki
      3: 'də', // üç
      4: 'də', // dörd
      5: 'də', // beş
      6: 'da', // altı
      7: 'də', // yeddi
      8: 'də', // səkkiz
      9: 'da', // doqquz
      11: 'də', // on bir
      12: 'də', // on iki
    }

    for (const [value, suffix] of Object.entries(expected)) {
      expect(locativeSuffix(Number(value)), value).toBe(suffix)
    }
  })

  it('follows the tens word when the number ends in them', () => {
    const expected: Record<number, string> = {
      10: 'da', // on
      20: 'də', // iyirmi
      30: 'da', // otuz
      40: 'da', // qırx
      50: 'də', // əlli
      60: 'da', // altmış
      70: 'də', // yetmiş
      80: 'də', // səksən
      90: 'da', // doxsan
    }

    for (const [value, suffix] of Object.entries(expected)) {
      expect(locativeSuffix(Number(value)), value).toBe(suffix)
    }
  })

  it('follows yüz and min for round hundreds and thousands', () => {
    expect(locativeSuffix(100)).toBe('də')
    expect(locativeSuffix(1000)).toBe('də')
  })
})
