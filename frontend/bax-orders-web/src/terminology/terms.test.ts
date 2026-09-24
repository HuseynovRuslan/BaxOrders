import { describe, expect, it } from 'vitest'
import { locativeSuffix } from './terms'

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
