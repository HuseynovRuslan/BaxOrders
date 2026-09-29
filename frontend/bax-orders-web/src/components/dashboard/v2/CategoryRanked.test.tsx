import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { DashboardCategory } from '../../../api/dashboard'
import { CategoryRanked } from './CategoryRanked'

function category(name: string, knownAmount: number | null, overrides: Partial<DashboardCategory> = {}): DashboardCategory {
  return { categoryId: 1, name, kind: 'Category', knownAmount, itemCount: 10, categoryCount: 1, ...overrides }
}

function show(categories: DashboardCategory[]) {
  return render(<MemoryRouter><CategoryRanked categories={categories} /></MemoryRouter>)
}

function rows(): HTMLElement[] {
  return within(screen.getByRole('region', { name: 'Kateqoriya üzrə bölgü' })).getAllByRole('listitem')
}

function shares(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll('[data-share]')).map((bar) => Number((bar as HTMLElement).dataset.share))
}

/**
 * What the month went on, in the order the backend ranked it. The bar is the proportion and the amount is the
 * figure; a percentage column beside them would be the same fact said three times.
 */
describe('what the money went on', () => {
  it('keeps the backend order and names the amount of each', () => {
    show([category('Tikinti materialları', 32_045), category('Elektrik avadanlıqları', 15_666)])

    expect(rows()[0]).toHaveTextContent('Tikinti materialları')
    expect(rows()[0]).toHaveTextContent('32.045,00')
    expect(rows()[1]).toHaveTextContent('Elektrik avadanlıqları')
  })

  it('draws each bar against the largest row', () => {
    const { container } = show([category('Böyük', 10_000), category('Yarısı', 5_000)])

    expect(shares(container)).toEqual([100, 50])
  })

  it('writes no percentage beside the amount', () => {
    show([category('Tikinti materialları', 32_045), category('Təmizlik', 7_833)])

    expect(screen.queryByText(/%/)).toBeNull()
    expect(screen.queryByText(/pay/)).toBeNull()
  })
})

/**
 * Five rows, because that is what was approved. The backend hands back up to six, so the tail is folded into
 * one row that still carries its money — the rows must go on adding up to the month.
 */
describe('the five rows', () => {
  it('shows all of them while there are five or fewer', () => {
    show([
      category('Bir', 5_000),
      category('İki', 4_000),
      category('Üç', 3_000),
      category('Dörd', 2_000),
      category('Beş', 1_000),
    ])

    expect(rows()).toHaveLength(5)
    expect(screen.queryByText('Digər')).toBeNull()
  })

  it('folds the tail into one row that carries its money', () => {
    show([
      category('Bir', 5_000),
      category('İki', 4_000),
      category('Üç', 3_000),
      category('Dörd', 2_000),
      category('Digər kateqoriyalar', 1_000, { categoryId: null, kind: 'Other', categoryCount: 6 }),
      category('Kateqoriyasız', 500, { categoryId: null, kind: 'Uncategorised', categoryCount: 0 }),
    ])

    const shown = rows()
    expect(shown).toHaveLength(5)
    expect(shown[4]).toHaveTextContent('Digər')
    expect(shown[4]).toHaveTextContent('1.500,00')
  })
})

/** A section with no money in it says nothing rather than drawing an empty frame. */
describe('when there is nothing to show', () => {
  it('draws nothing without categories', () => {
    const { container } = show([])

    expect(container).toBeEmptyDOMElement()
  })

  it('draws nothing where no category is priced', () => {
    const { container } = show([category('Bir', null), category('İki', null)])

    expect(container).toBeEmptyDOMElement()
  })
})
