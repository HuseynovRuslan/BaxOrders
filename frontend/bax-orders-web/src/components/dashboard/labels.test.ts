import { describe, expect, it } from 'vitest'
import type { DashboardAttentionReason } from '../../api/dashboard'
import { findOldTerms } from '../../test/oldTerms'
import {
  alsoFirstLine,
  attentionReasonIsMissingPrice,
  attentionTitle,
  causeHeadline,
  dashboardSortOption,
  dashboardSortOptions,
  isSort,
  strongPercentageHint,
} from './labels'

/**
 * The words an attention card says about why it is there (Task 09). The audit found "Ən böyük məbləğ artımı" on two
 * cards and "Ən böyük faiz dəyişməsi" on an object that was not the largest; a title now says the card's place.
 */
describe('the card title', () => {
  it('says "the largest" of the first of each movement', () => {
    expect(attentionTitle('LargestIncrease', 1)).toBe('Ən böyük məbləğ artımı')
    expect(attentionTitle('LargestDecrease', 1)).toBe('Ən böyük məbləğ azalması')
    expect(attentionTitle('StrongPercentageChange', 1)).toBe('Ən böyük faiz dəyişməsi')
  })

  it('says "the second largest" of the second', () => {
    expect(attentionTitle('LargestIncrease', 2)).toBe('İkinci ən böyük məbləğ artımı')
    expect(attentionTitle('LargestDecrease', 2)).toBe('İkinci ən böyük məbləğ azalması')
    expect(attentionTitle('StrongPercentageChange', 2)).toBe('İkinci ən böyük faiz dəyişməsi')
  })

  /** Not expected from the backend; if it ever comes, a plain title is true and a superlative would not be. */
  it('claims no size for a place further down', () => {
    expect(attentionTitle('LargestIncrease', 3)).toBe('Məbləğ artımı')
    expect(attentionTitle('LargestDecrease', 5)).toBe('Məbləğ azalması')
    expect(attentionTitle('StrongPercentageChange', 3)).toBe('Faiz dəyişməsi')
  })

  it('does not rank a warning, and calls an object with nothing to compare against by the decided words', () => {
    for (const rank of [1, 2, 3]) {
      expect(attentionTitle('MissingRequiredPrice', rank)).toBe('Qiymət yoxdur')
      expect(attentionTitle('NoComparisonHistory', rank)).toBe('Müqayisə bazası yoxdur')
    }
  })

  it('never repeats a title between two places of the same movement', () => {
    for (const reason of ['LargestIncrease', 'LargestDecrease', 'StrongPercentageChange'] as DashboardAttentionReason[]) {
      expect(new Set([1, 2, 3].map((rank) => attentionTitle(reason, rank))).size).toBe(3)
    }
  })

  it('keeps amber for the missing price alone', () => {
    expect(Object.entries(attentionReasonIsMissingPrice).filter(([, amber]) => amber).map(([reason]) => reason))
      .toEqual(['MissingRequiredPrice'])
  })
})

describe('the largest figure named on another card', () => {
  it('says which', () => {
    expect(alsoFirstLine(['StrongPercentageChange'])).toBe('Həm də ən böyük faiz dəyişməsi')
    expect(alsoFirstLine(['LargestIncrease', 'StrongPercentageChange']))
      .toBe('Həm də ən böyük məbləğ artımı · ən böyük faiz dəyişməsi')
  })

  it('says nothing when there is nothing to name', () => {
    expect(alsoFirstLine([])).toBeNull()
  })
})

describe('the sorts the page offers', () => {
  it('opens on the size of the change, and offers the month\'s money and the name besides', () => {
    expect(dashboardSortOptions.map((option) => [option.sort, option.descending, option.label])).toEqual([
      ['AbsoluteKnownAmountDelta', true, 'Ən çox dəyişən'],
      ['CurrentKnownAmount', true, 'Bu ayın məbləği üzrə'],
      ['LocationName', false, 'Obyekt adı üzrə'],
    ])
  })

  it('reads a sort it does not offer as the default', () => {
    expect(dashboardSortOption(null).sort).toBe('AbsoluteKnownAmountDelta')
    expect(dashboardSortOption('KnownAmountDelta').sort).toBe('AbsoluteKnownAmountDelta')
    expect(dashboardSortOption('LocationName').sort).toBe('LocationName')
    expect(isSort('AbsoluteKnownAmountDelta')).toBe(true)
  })
})

/** Task 13c (13.1a): an approved variant transition is a cause of its own, named the same whichever way it went. */
describe('the cause of an approved variant transition', () => {
  it('is "Variant dəyişib", with the direction left to the sign beside it', () => {
    expect(causeHeadline('VariantChange', 125)).toBe('Variant dəyişib')
    expect(causeHeadline('VariantChange', -125)).toBe('Variant dəyişib')
    expect(causeHeadline('VariantChange', 0)).toBe('Variant dəyişib')
  })

  it('uses no retired word, and no verdict', () => {
    const element = document.createElement('div')
    element.textContent = causeHeadline('VariantChange', 125)

    expect(findOldTerms(element)).toEqual([])
    expect(element.textContent).not.toMatch(/yaxşı|pis|müsbət|mənfi/i)
  })
})

describe('the new words', () => {
  it('use no retired word, and no verdict', () => {
    const reasons: DashboardAttentionReason[] = [
      'LargestIncrease', 'LargestDecrease', 'StrongPercentageChange', 'MissingRequiredPrice', 'NoComparisonHistory',
    ]
    const element = document.createElement('div')
    element.textContent = [
      ...reasons.flatMap((reason) => [1, 2, 3].map((rank) => attentionTitle(reason, rank))),
      alsoFirstLine(['LargestIncrease', 'LargestDecrease', 'StrongPercentageChange']),
      strongPercentageHint,
      ...dashboardSortOptions.map((option) => option.label),
    ].join('\n')

    expect(findOldTerms(element)).toEqual([])
    expect(element.textContent).not.toMatch(/yaxşı|pis|müsbət|mənfi/i)
  })
})
