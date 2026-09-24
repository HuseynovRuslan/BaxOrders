import { describe, expect, it } from 'vitest'
import type { VariantOrderFrequency } from '../../api/analytics'
import { frequencySentence } from './trend'

function frequency(availableMonthCount: number, orderedMonthCount: number): VariantOrderFrequency {
  return {
    availableMonthCount,
    orderedMonthCount,
    firstOrderedPeriod: null,
    lastOrderedPeriod: null,
    monthsSinceLastOrder: null,
    intervalsInMonths: [],
    typicalIntervalMonths: null,
    shortestIntervalMonths: null,
    longestIntervalMonths: null,
  }
}

/** "Son 9 ayın 3-də sifariş edilib" — owner decision 5.1, with the ending the number takes. */
describe('how often a product is ordered, in one sentence', () => {
  it('counts the months out of the months there are', () => {
    expect(frequencySentence(frequency(9, 3))).toBe('Son 9 ayın 3-də sifariş edilib')
    expect(frequencySentence(frequency(12, 6))).toBe('Son 12 ayın 6-da sifariş edilib')
    expect(frequencySentence(frequency(10, 9))).toBe('Son 10 ayın 9-da sifariş edilib')
    expect(frequencySentence(frequency(12, 10))).toBe('Son 12 ayın 10-da sifariş edilib')
  })

  it('says so when it was ordered in none of them', () => {
    expect(frequencySentence(frequency(9, 0))).toBe('Son 9 ayın heç birində sifariş edilməyib')
  })

  it('says there is nothing to show when there are no months at all', () => {
    expect(frequencySentence(frequency(0, 0))).toBe('Bu obyektin göstəriləcək sifarişi yoxdur')
  })

  it('never says "mövcud aydan" again', () => {
    expect(frequencySentence(frequency(9, 3))).not.toContain('mövcud')
  })
})
