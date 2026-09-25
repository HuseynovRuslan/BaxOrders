import { describe, expect, it } from 'vitest'
import {
  changeAfterImportHint,
  classifyBeforeImportHint,
  importPricingActionLabels,
  importPricingIntro,
  importPricingNoneLeft,
  importPricingNoneMatching,
  importPricingNoUnpricedRows,
  importPricingReadOnlyNote,
  importPricingSavedNotice,
  importPricingTabLabel,
  internalSupplyFullLabel,
  missingPriceCount,
  priceRequiredLabel,
  pricingModeChipClass,
  pricingModeLabels,
  pricingReviewPath,
  unclassifiedAfterImportNote,
  unclassifiedBeforeImportNote,
  unclassifiedLabel,
} from './labels'

/**
 * Brief (Task 16): "Qiymət vəziyyətləri və sözlər Task 2-dəki kimidir." The import screens read their price words
 * from here, and the words Qiymət təsnifatı showed before Task 16 are the ones they read.
 */
describe('the three states', () => {
  it('are the strings Qiymət təsnifatı showed before Task 16', () => {
    expect(pricingModeLabels).toEqual({
      Unresolved: 'Təsnif edilməyib',
      PriceRequired: 'Alış qiyməti tələb olunur',
      InternalFreeSupply: 'Ödənişsiz daxili təminat',
    })
  })

  it('are made of the words Task 2 already had', () => {
    expect(pricingModeLabels.Unresolved).toBe(unclassifiedLabel)
    expect(pricingModeLabels.PriceRequired).toBe(priceRequiredLabel)
    expect(pricingModeLabels.InternalFreeSupply).toBe(internalSupplyFullLabel)
    expect(priceRequiredLabel).toBe('Alış qiyməti tələb olunur')
  })

  it('keep the chip colours Qiymət təsnifatı had, with internal supply never amber', () => {
    expect(pricingModeChipClass).toEqual({
      Unresolved: 'bg-amber-50 text-amber-900 ring-amber-200',
      PriceRequired: 'bg-slate-100 text-slate-700 ring-slate-300',
      InternalFreeSupply: 'bg-sky-50 text-sky-900 ring-sky-200',
    })
    expect(pricingModeChipClass.InternalFreeSupply).not.toMatch(/amber/)
  })
})

describe('the import review’s sentences', () => {
  it('says beforehand where the unclassified rows will land', () => {
    expect(unclassifiedBeforeImportNote(5)).toBe('5 sətir importdan sonra Qiymət təsnifatına «Təsnif edilməyib» kimi düşəcək.')
    expect(unclassifiedBeforeImportNote(1)).toBe('1 sətir importdan sonra Qiymət təsnifatına «Təsnif edilməyib» kimi düşəcək.')
    expect(unclassifiedBeforeImportNote(1250)).toBe('1250 sətir importdan sonra Qiymət təsnifatına «Təsnif edilməyib» kimi düşəcək.')
  })

  it('says afterwards where they landed', () => {
    expect(unclassifiedAfterImportNote(4)).toBe('4 sətir Qiymət təsnifatına «Təsnif edilməyib» kimi düşdü.')
    expect(unclassifiedAfterImportNote(1)).toBe('1 sətir Qiymət təsnifatına «Təsnif edilməyib» kimi düşdü.')
    expect(unclassifiedAfterImportNote(310)).toBe('310 sətir Qiymət təsnifatına «Təsnif edilməyib» kimi düşdü.')
  })

  it('keeps Task 2’s own count sentence as it was', () => {
    expect(missingPriceCount(7)).toBe('7 sətirdə qiymət yoxdur')
    expect(missingPriceCount(1)).toBe('1 sətirdə qiymət yoxdur')
  })

  it('names the tab like the page, and the buttons by the state they set', () => {
    expect(importPricingTabLabel).toBe('Qiymət təsnifatı')
    expect(importPricingActionLabels).toEqual({
      PriceRequired: 'Alış qiyməti tələb olunur kimi qeyd et',
      InternalFreeSupply: 'Ödənişsiz daxili təminat kimi qeyd et',
      Unresolved: 'Təsnifatı geri al',
    })
  })

  it('reports what was saved', () => {
    expect(importPricingSavedNotice(2, 'InternalFreeSupply')).toBe('2 sətir «Ödənişsiz daxili təminat» kimi qeyd edildi.')
    expect(importPricingSavedNotice(1, 'PriceRequired')).toBe('1 sətir «Alış qiyməti tələb olunur» kimi qeyd edildi.')
    expect(importPricingSavedNotice(3, 'Unresolved')).toBe('3 sətrin təsnifatı geri alındı.')
  })

  it('has the tab’s fixed texts', () => {
    expect(importPricingIntro).toBe(
      'Qiyməti olmayan sətirlərin alınan, yoxsa şirkətdaxili təmin olunan material olduğunu burada, importdan əvvəl '
      + 'qeyd edə bilərsiniz. Təsnif edilməyən sətirlər importdan sonra Qiymət təsnifatına «Təsnif edilməyib» kimi düşür.',
    )
    expect(importPricingNoneLeft).toBe('Təsnif edilməmiş sətir qalmayıb.')
    expect(importPricingNoneMatching).toBe('Bu filtrə uyğun sətir tapılmadı.')
    expect(importPricingNoUnpricedRows).toBe('Bu importda qiyməti olmayan sətir yoxdur.')
    expect(importPricingReadOnlyNote).toBe('Bu import artıq təsdiqlənib. Təsnifatı Qiymət təsnifatında dəyişə bilərsiniz.')
    expect(classifyBeforeImportHint).toBe('İdxaldan əvvəl onları yoxlamanın «Qiymət təsnifatı» bölməsində təsnif edə bilərsiniz.')
    expect(changeAfterImportHint).toBe('Yoxlamada verilən təsnifatı orada dəyişə bilərsiniz.')
  })

  it('links to Qiymət təsnifatı itself: the page reads ?order=, and an import has no order yet', () => {
    expect(pricingReviewPath).toBe('/pricing-modes')
  })
})
