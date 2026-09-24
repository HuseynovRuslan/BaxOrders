import { describe, expect, it } from 'vitest'
import { formatMoney, formatMoneyDelta, formatPercent } from '../components/analytics/format'
import { findOldTerms } from '../test/oldTerms'
import {
  costDirectionSentence,
  costUnchangedLabel,
  futureMonthLabel,
  futureMonthNote,
  locativeSuffix,
  monthlyTotalsAllLocationsLabel,
  monthlyTotalsRowLabel,
  previousMonthPercentLabel,
  productShareLabel,
  unexplainedPartNote,
  unusualMonthHint,
  unusualMonthLabel,
  unusualMonthNote,
} from './terms'

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
 * The product's share on a dashboard card (7.1, 7.1a): its effect over every product effect in the same direction.
 * A whole percent that is never false — never 100 short of all of it, never 0 when it is something, never above 100.
 */
describe('a product’s share of the movement', () => {
  it('says which movement it is a share of', () => {
    // Heydər Əliyev: the tractor over every rise, 73,76% at the most.
    expect(productShareLabel(21900, 29691.52)).toBe('artımların 74%-i')
    // Fəvvarələr: the summer shoes over every fall, 24,56% at the most.
    expect(productShareLabel(-1988, -8093.7)).toBe('azalmaların 25%-i')
  })

  it('reads 100 only when it is all of it', () => {
    expect(productShareLabel(250, 250)).toBe('artımların 100%-i')
    expect(productShareLabel(-883.2, -883.2)).toBe('azalmaların 100%-i')
    expect(productShareLabel(99.6, 100)).toBe('artımların 99%-i')
    expect(productShareLabel(-99.99, -100)).toBe('azalmaların 99%-i')
  })

  it('never reads 0 when it is something', () => {
    expect(productShareLabel(0.3, 100)).toBe('artımların 1%-dən azı')
    expect(productShareLabel(-0.49, -100)).toBe('azalmaların 1%-dən azı')
    expect(productShareLabel(0.6, 100)).toBe('artımların 1%-i')
  })

  it('rounds half away from zero', () => {
    expect(productShareLabel(12.5, 100)).toBe('artımların 13%-i')
    expect(productShareLabel(-12.5, -100)).toBe('azalmaların 13%-i')
    expect(productShareLabel(12.49, 100)).toBe('artımların 12%-i')
  })

  it('never prints a number above 100', () => {
    const shares = [
      productShareLabel(21900, 29691.52),
      productShareLabel(1, 1),
      productShareLabel(-5, -4),
      productShareLabel(150, 100),
    ]

    for (const share of shares) {
      const percent = Number(/(\d+)%/.exec(share)![1])
      expect(percent, share).toBeLessThanOrEqual(100)
    }
  })

  it('uses no retired word', () => {
    const root = document.createElement('div')
    root.textContent = [
      productShareLabel(21900, 29691.52),
      productShareLabel(-1988, -8093.7),
      productShareLabel(0.3, 100),
    ].join(' ')

    expect(findOldTerms(root)).toEqual([])
  })
})

/** The monthly report's words (Task 08): the totals row, the month that has not begun, the unusual month. */
describe('the monthly report', () => {
  it('names the totals row, and says when it is the whole company under a search', () => {
    expect(monthlyTotalsRowLabel).toBe('Cəmi')
    expect(monthlyTotalsAllLocationsLabel).toBe('Cəmi — bütün obyektlər')
  })

  it('calls a month that has not begun a future month, never one without an order', () => {
    expect(futureMonthLabel).toBe('Gələcək ay')
    expect(futureMonthNote('Oktyabr 2026')).toBe('Oktyabr 2026: gələcək ay')
    expect(futureMonthNote('Oktyabr 2026')).not.toContain('sifariş yoxdur')
  })

  it('says why a month is unusual, with its average and its difference', () => {
    expect(unusualMonthLabel).toBe('Qeyri-adi ay')
    expect(unusualMonthNote(formatMoney(14458.58), formatPercent(149.06))).toBe(
      `Qeyri-adi ay: əvvəlki 3 mövcud ayın ortalaması 14.458,58${nbsp}₼, fərq +149,06%`,
    )
  })

  it('uses no retired word, and no verdict', () => {
    const root = document.createElement('div')
    root.textContent = [
      monthlyTotalsRowLabel,
      monthlyTotalsAllLocationsLabel,
      futureMonthNote('Oktyabr 2026'),
      unusualMonthNote(formatMoney(14458.58), formatPercent(-60)),
      unusualMonthHint,
      previousMonthPercentLabel,
    ].join(' ')

    expect(findOldTerms(root)).toEqual([])
    expect(root.textContent).not.toMatch(/yaxşı|\bpis\b/i)
  })
})

/**
 * "Son 9 ayın 3-də sifariş edilib": the ending follows the last number word that is pronounced, so it is
 * worked out from the number rather than written as "-də" for all of them.
 */
/**
 * Owner decision 9.1 in words, where the dashboard shows it: the direction of the cost after the caption that says
 * what it is measured against — never "yaxşı" or "pis", never "müsbət" or "mənfi".
 */
describe('the direction of a cost', () => {
  it('says a rise, a fall and no change, after its caption', () => {
    expect(costDirectionSentence('Keçən aya görə', 26_689.47)).toBe('Keçən aya görə xərc artıb')
    expect(costDirectionSentence('Son 3 ayın ortalamasına görə', -2_584.45)).toBe('Son 3 ayın ortalamasına görə xərc azalıb')
    expect(costDirectionSentence('Keçən aya görə', 0)).toBe(`Keçən aya görə ${costUnchangedLabel}`)
    expect(costUnchangedLabel).toBe('xərc dəyişməyib')
  })

  it('says nothing when there is no difference to describe', () => {
    expect(costDirectionSentence('Keçən aya görə', null)).toBeNull()
    expect(costDirectionSentence('Keçən aya görə', undefined)).toBeNull()
  })

  it('uses no retired word, and no verdict', () => {
    const element = document.createElement('div')
    element.textContent = [
      costDirectionSentence('Keçən aya görə', 1),
      costDirectionSentence('Keçən aya görə', -1),
      costDirectionSentence('Keçən aya görə', 0),
    ].join('\n')

    expect(findOldTerms(element)).toEqual([])
    expect(element.textContent).not.toMatch(/yaxşı|pis|müsbət|mənfi/i)
  })
})

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
