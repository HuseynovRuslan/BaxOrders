import { describe, expect, it } from 'vitest'
import {
  monthlyComparisonScopeLabel,
  monthlyOrdersLabel,
  orderLineTypeBadge,
  orderLineTypeLabels,
  orderLineTypeToneClass,
  orderLineTypesInOrder,
  outsideMonthlyOrdersLabel,
  selectableOrderLineTypes,
  unclassifiedLinesNote,
  type OrderLineType,
} from './lineType'

/**
 * One place names the three kinds. The point of the module is that a reader moving between the dashboard, an
 * order's lines and the comparison caption meets the same words each time, so what is pinned here is that
 * every kind is named and that the names are the owner's own.
 */
describe('what each kind of demand is called', () => {
  it.each<[OrderLineType, string]>([
    ['Monthly', 'Aylıq sifariş'],
    ['OutsideMonthly', 'Aylıqdan Kənar sifarişlər'],
    ['Unclassified', 'Təsnif edilməyib'],
  ])('%s reads "%s"', (type, label) => {
    expect(orderLineTypeLabels[type]).toBe(label)
  })

  it('has a name, a badge and a tone for every kind, and no kind without one', () => {
    for (const type of orderLineTypesInOrder) {
      expect(orderLineTypeLabels[type]).toBeTruthy()
      expect(orderLineTypeBadge[type]).toBeTruthy()
      expect(orderLineTypeToneClass[type]).toBeTruthy()
    }

    expect(orderLineTypesInOrder).toEqual(['Monthly', 'OutsideMonthly', 'Unclassified'])
    expect(Object.keys(orderLineTypeLabels).sort()).toEqual([...orderLineTypesInOrder].sort())
  })

  /**
   * The headline of the split uses the plural the owner named the group by; the badge beside one line uses
   * the short form. The two must not drift into being two different words for the same thing.
   */
  it('names the same two kinds in the split heading as in the labels', () => {
    expect(monthlyOrdersLabel).toBe('Aylıq sifarişlər')
    expect(outsideMonthlyOrdersLabel).toBe(orderLineTypeLabels.OutsideMonthly)
  })
})

describe('what a person may choose', () => {
  /**
   * "Təsnif edilməyib" is a system state, not a third answer: offering it as an equal option would invite it
   * to be picked to avoid deciding.
   */
  it('offers the two real kinds and never the absence of an answer', () => {
    expect(selectableOrderLineTypes).toEqual(['Monthly', 'OutsideMonthly'])
    expect(selectableOrderLineTypes).not.toContain('Unclassified')
  })
})

describe('the unclassified note', () => {
  it('counts the lines and says nothing about fault', () => {
    expect(unclassifiedLinesNote(51)).toBe('51 sətir təsnif edilməyib')
    expect(unclassifiedLinesNote(1)).toBe('1 sətir təsnif edilməyib')
  })

  it('is not worded as an error', () => {
    expect(unclassifiedLinesNote(51)).not.toMatch(/xəta|səhv|problem/i)
  })
})

describe('the comparison caption', () => {
  it('says which lines the comparison is about', () => {
    expect(monthlyComparisonScopeLabel).toBe('Aylıq sifarişlər üzrə müqayisə')
  })
})
