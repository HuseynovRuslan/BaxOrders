import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { DashboardCategory } from '../../../api/dashboard'
import { CategoryDonut } from './CategoryDonut'

function category(overrides: Partial<DashboardCategory> = {}): DashboardCategory {
  return {
    categoryId: 1,
    name: 'Yaşıllıq',
    kind: 'Category',
    knownAmount: 5_000,
    itemCount: 20,
    categoryCount: 1,
    ...overrides,
  }
}

function show(categories: DashboardCategory[]) {
  return render(<MemoryRouter><CategoryDonut categories={categories} /></MemoryRouter>)
}

function rows(): HTMLElement[] {
  return within(screen.getByRole('region', { name: 'Sifarişlərin kateqoriya bölgüsü' })).getAllByRole('listitem')
}

/**
 * The ring answers "was this a planting month or a cleaning month" with no number read. The list beside it is
 * for the reader who then wants the amounts — so the shares have to be checkable against them.
 */
describe('what the month went on', () => {
  it('gives each row its share of the month', () => {
    show([
      category({ name: 'Yaşıllıq', knownAmount: 5_000 }),
      category({ categoryId: 2, name: 'Təmizlik', knownAmount: 3_000 }),
      category({ categoryId: 3, name: 'Usta', knownAmount: 2_000 }),
    ])

    expect(rows()[0]).toHaveTextContent('50% pay')
    expect(rows()[1]).toHaveTextContent('30% pay')
    expect(rows()[2]).toHaveTextContent('20% pay')
  })

  it('keeps the rows in the order the backend ranked them', () => {
    show([
      category({ name: 'Yaşıllıq', knownAmount: 5_000 }),
      category({ categoryId: 2, name: 'Təmizlik', knownAmount: 3_000 }),
    ])

    expect(rows().map((row) => row.textContent?.slice(0, 8))).toEqual(['Yaşıllıq', 'Təmizlik'])
  })

  /** The two rows that are not a category say what they are, because that is what a reader needs of them. */
  it('explains the folded remainder and the unfiled products', () => {
    show([
      category({ knownAmount: 5_000 }),
      category({ categoryId: null, name: 'Digər kateqoriyalar', kind: 'Other', knownAmount: 3_000, categoryCount: 6 }),
      category({ categoryId: null, name: 'Kateqoriyasız', kind: 'Uncategorised', knownAmount: 2_000, categoryCount: 0 }),
    ])

    expect(rows()[1]).toHaveTextContent('6 kateqoriya birlikdə')
    expect(rows()[2]).toHaveTextContent('Kateqoriyaya aid edilməyən məhsullar')
    expect(rows()[0]).toHaveTextContent('20 sifariş sətri')
  })

  it('keeps a visible share for money too small to round to a percent', () => {
    show([
      category({ knownAmount: 10_000 }),
      category({ categoryId: 2, name: 'Ofis', knownAmount: 20 }),
    ])

    expect(rows()[1]).toHaveTextContent('1% pay')
  })

  it('says how many lines the month is made of', () => {
    show([category({ itemCount: 75 }), category({ categoryId: 2, name: 'Təmizlik', itemCount: 181 })])

    expect(screen.getByText('Cəmi 256 sifariş sətri')).toBeInTheDocument()
  })

  it('draws nothing at all when the scope holds no priced line', () => {
    const { container } = show([])
    expect(container).toBeEmptyDOMElement()

    const unpriced = show([category({ knownAmount: null })])
    expect(unpriced.container).toBeEmptyDOMElement()
  })
})
