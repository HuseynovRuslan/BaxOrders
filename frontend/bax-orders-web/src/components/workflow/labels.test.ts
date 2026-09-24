import { describe, expect, it } from 'vitest'
import { historicalImportNote, submissionCountLabel } from './labels'

/**
 * Which time an order is being sent, in business language rather than as a version number (Task 04, 5.6).
 * The ordinal suffix follows the vowel of the last number word pronounced.
 */
describe('the submission count in words', () => {
  it.each([
    [1, 'İlk göndəriş'],
    [2, 'İkinci göndəriş'],
    [3, 'Üçüncü göndəriş'],
    [4, 'Dördüncü göndəriş'],
    [5, 'Beşinci göndəriş'],
    [6, '6-cı göndəriş'],
    [7, '7-ci göndəriş'],
    [8, '8-ci göndəriş'],
    [9, '9-cu göndəriş'],
    [10, '10-cu göndəriş'],
    [11, '11-ci göndəriş'],
    [12, '12-ci göndəriş'],
    [20, '20-ci göndəriş'],
    [30, '30-cu göndəriş'],
    [40, '40-cı göndəriş'],
    [60, '60-cı göndəriş'],
    [90, '90-cı göndəriş'],
    [100, '100-cü göndəriş'],
  ])('%i → %s', (count, words) => {
    expect(submissionCountLabel(count, false)).toBe(words)
  })

  it('says it follows a request for correction from the second time on', () => {
    expect(submissionCountLabel(2, true)).toBe('İkinci göndəriş · düzəliş tələbindən sonra')
    expect(submissionCountLabel(7, true)).toBe('7-ci göndəriş · düzəliş tələbindən sonra')
  })

  it('never says it of the first time', () => {
    expect(submissionCountLabel(1, true)).toBe('İlk göndəriş')
  })

  it('says an order not yet sent has not been sent', () => {
    expect(submissionCountLabel(0, false)).toBe('Hələ təqdim olunmayıb')
  })
})

describe('an order carried in from Excel', () => {
  it('reads exactly the owner’s sentence (4.1)', () => {
    expect(historicalImportNote).toBe('Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.')
  })
})
