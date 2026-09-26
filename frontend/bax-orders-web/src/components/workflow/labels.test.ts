import { describe, expect, it } from 'vitest'
import { findOldTerms } from '../../test/oldTerms'
import { historicalImportLabel, historicalImportNote, submissionCountLabel } from './labels'

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

/**
 * An order carried in from Excel as already approved. 22.2 fixed the words beside its badge; 22.3 retired 4.1's
 * sentence, which beside "Təsdiqlənib" read as a denial of the approval, and asked why nobody and no date is recorded.
 */
describe('an order carried in from Excel', () => {
  it('reads exactly the owner’s phrase beside the badge (22.2)', () => {
    expect(historicalImportLabel).toBe('Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb')
  })

  it('says in the panel why no approver and no date is recorded, and no longer that nothing is known (22.3)', () => {
    expect(historicalImportNote.startsWith(historicalImportLabel)).toBe(true)
    expect(historicalImportNote).toContain('BaxOrders iş axını yaranmazdan əvvəl')
    expect(historicalImportNote).toContain('təsdiqləyən')
    expect(historicalImportNote).toContain('tarix')
    expect(historicalImportNote).not.toContain('Təsdiq məlumatı mövcud deyil')
  })

  it('says none of the old words', () => {
    const element = document.createElement('p')
    element.textContent = historicalImportNote

    expect(findOldTerms(element)).toEqual([])
  })
})
