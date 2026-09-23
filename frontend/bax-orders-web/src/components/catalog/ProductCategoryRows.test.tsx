import { render, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ProductCategoryRow } from '../../api/productCategories'
import { ProductCategoryRows } from './ProductCategoryRows'

/**
 * What the catalogue says and what Excel said are two different claims, and the screen has to keep them
 * apart. A category the workbooks named more often is evidence that it was named more often, and nothing
 * here may present it as the answer.
 */
function row(overrides: Partial<ProductCategoryRow> = {}): ProductCategoryRow {
  return {
    productId: 105,
    productCode: 'PRD-000105',
    productName: 'Pambıq',
    currentCategoryId: null,
    currentCategoryPath: [],
    state: 'UniqueEvidence',
    evidence: [{ categoryId: 7, path: ['Təmizlik', 'Təmizlik ləvazimatı', 'Təmizlik bezi'], occurrences: 18 }],
    ...overrides,
  }
}

/**
 * The table and the cards render the same rows at once — CSS decides which a real screen shows and jsdom
 * applies none — so single-element queries are scoped to the table.
 */
function renderRows(rows: ProductCategoryRow[], canDecide = true) {
  const onAssign = vi.fn()
  const { container } = render(
    <ProductCategoryRows rows={rows} canDecide={canDecide} onAssign={onAssign} />,
  )
  return { table: within(container.querySelector('table')!), onAssign }
}

describe('a product whose history agrees with itself', () => {
  it('reads as a safe match and shows the one category with its count', () => {
    const { table } = renderRows([row()])

    expect(table.getByText('Təhlükəsiz uyğunluq')).toBeInTheDocument()
    expect(table.getByText('Təmizlik › Təmizlik ləvazimatı › Təmizlik bezi')).toBeInTheDocument()
    expect(table.getByText('— 18 dəfə')).toBeInTheDocument()
  })

  it('shows no canonical category until one is actually recorded', () => {
    const { table } = renderRows([row()])

    // An em dash, not the category the evidence happens to name: nothing has been decided yet.
    expect(table.getByText('—')).toBeInTheDocument()
  })
})

describe('a product whose history disagrees with itself', () => {
  const conflicted = row({
    state: 'Ambiguous',
    evidence: [
      { categoryId: 7, path: ['Təmizlik', 'Təmizlik ləvazimatı', 'Təmizlik bezi'], occurrences: 18 },
      { categoryId: 9, path: ['Ofis', 'Kimyəvi vasitələr', 'Dezinfeksiya'], occurrences: 2 },
    ],
  })

  it('shows every competing category with its own count, not just the most frequent one', () => {
    const { table } = renderRows([conflicted])

    expect(table.getByText('Təmizlik › Təmizlik ləvazimatı › Təmizlik bezi')).toBeInTheDocument()
    expect(table.getByText('Ofis › Kimyəvi vasitələr › Dezinfeksiya')).toBeInTheDocument()
    expect(table.getByText('— 18 dəfə')).toBeInTheDocument()
    expect(table.getByText('— 2 dəfə')).toBeInTheDocument()
  })

  it('says outright that the larger count does not decide it', () => {
    const { table } = renderRows([conflicted])

    expect(table.getByText(/Say çoxluğu qərar vermir/)).toBeInTheDocument()
    expect(table.getByText('Ziddiyyətli')).toBeInTheDocument()
  })
})

describe('a product no workbook ever categorised', () => {
  it('says there is nothing to go on rather than showing an empty column', () => {
    const { table } = renderRows([row({ state: 'NoEvidence', evidence: [] })])

    expect(table.getByText(/kateqoriya məlumatı yoxdur/)).toBeInTheDocument()
    expect(table.getByText('Məlumatsız')).toBeInTheDocument()
  })
})

describe('a product that already has a canonical category', () => {
  it('shows what the catalogue says alongside what the history said, without merging them', () => {
    const { table } = renderRows([row({
      state: 'Assigned',
      currentCategoryId: 9,
      currentCategoryPath: ['Ofis', 'Kimyəvi vasitələr', 'Dezinfeksiya'],
      evidence: [{ categoryId: 7, path: ['Təmizlik', 'Təmizlik ləvazimatı', 'Təmizlik bezi'], occurrences: 18 }],
    })])

    expect(table.getByText('Ofis › Kimyəvi vasitələr › Dezinfeksiya')).toBeInTheDocument()
    expect(table.getByText('Təmizlik › Təmizlik ləvazimatı › Təmizlik bezi')).toBeInTheDocument()
    expect(table.getByText('Təyin olunub')).toBeInTheDocument()
    expect(table.getByRole('button', { name: /kateqoriya seç/i })).toHaveTextContent('Kateqoriyanı dəyiş')
  })
})

describe('who may change what the catalogue says', () => {
  it('offers the choice to somebody who may make it', async () => {
    const user = userEvent.setup()
    const { table, onAssign } = renderRows([row()])

    await user.click(table.getByRole('button', { name: /kateqoriya seç/i }))

    expect(onAssign).toHaveBeenCalledWith(expect.objectContaining({ productId: 105 }))
  })

  it('offers a manager nothing to press, and says why', () => {
    const { table } = renderRows([row()], false)

    expect(table.queryByRole('button', { name: /kateqoriya seç/i })).toBeNull()
    expect(table.getByText('Yalnız oxumaq')).toBeInTheDocument()
    // The evidence is still there to read: read-only is not hidden.
    expect(table.getByText('Təmizlik › Təmizlik ləvazimatı › Təmizlik bezi')).toBeInTheDocument()
  })
})
