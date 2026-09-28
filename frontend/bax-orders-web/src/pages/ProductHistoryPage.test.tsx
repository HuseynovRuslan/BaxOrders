import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductHistory } from '../api/productHistory'
import { ProductHistoryPage } from './ProductHistoryPage'

const api = vi.hoisted(() => ({ fetchProductHistory: vi.fn() }))

vi.mock('../api/productHistory', async () => ({
  ...(await vi.importActual<typeof import('../api/productHistory')>('../api/productHistory')),
  ...api,
}))

function history(overrides: Partial<ProductHistory> = {}): ProductHistory {
  return {
    productId: 7,
    code: 'PRD-000007',
    name: 'Laqonda daşı metal üçün',
    isActive: true,
    monthsOrdered: 2,
    averageMonthlyQuantity: 15,
    firstOrderedPeriod: '2026-06-01',
    lastOrderedPeriod: '2026-07-01',
    monthlyKnownAmountTotal: 300,
    outsideMonthlyKnownAmountTotal: 500,
    outsideMonthlyLineCount: 1,
    unclassifiedLineCount: 0,
    months: [
      {
        period: '2026-08-01',
        monthlyQuantity: 0,
        monthlyKnownAmount: null,
        monthlyLineCount: 0,
        outsideMonthlyQuantity: 5,
        outsideMonthlyKnownAmount: 500,
        outsideMonthlyLineCount: 1,
        unclassifiedLineCount: 0,
        locationCount: 1,
      },
      {
        period: '2026-07-01',
        monthlyQuantity: 20,
        monthlyKnownAmount: 200,
        monthlyLineCount: 1,
        outsideMonthlyQuantity: 0,
        outsideMonthlyKnownAmount: null,
        outsideMonthlyLineCount: 0,
        unclassifiedLineCount: 0,
        locationCount: 1,
      },
    ],
    lines: [
      {
        orderRequestItemId: 91,
        orderRequestId: 51,
        period: '2026-08-01',
        locationId: 4,
        locationName: 'Heydər Əliyev Mərkəzi',
        variantLabel: '115 MM · Skom · PCS',
        quantity: 5,
        unitPrice: 100,
        knownAmount: 500,
        orderLineType: 'OutsideMonthly',
        responsiblePersonName: 'Çingiz',
      },
      {
        orderRequestItemId: 90,
        orderRequestId: 50,
        period: '2026-07-01',
        locationId: 4,
        locationName: 'Heydər Əliyev Mərkəzi',
        variantLabel: '115 MM · Skom · PCS',
        quantity: 20,
        unitPrice: 10,
        knownAmount: 200,
        orderLineType: 'Monthly',
        responsiblePersonName: 'Eldar',
      },
    ],
    ...overrides,
  }
}

async function renderPage() {
  render(
    <MemoryRouter initialEntries={['/products/7/history']}>
      <Routes>
        <Route path="/products/:productId/history" element={<ProductHistoryPage />} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByRole('group', { name: 'Məhsulun xülasəsi' })
}

function metric(label: string) {
  const summary = screen.getByRole('group', { name: 'Məhsulun xülasəsi' })
  return within(summary).getByText(label).closest('div') as HTMLElement
}

beforeEach(() => api.fetchProductHistory.mockReset().mockResolvedValue(history()))
afterEach(() => vi.clearAllMocks())

/**
 * The question this page answers is "do we order this every month, and is it moving". A thing bought once when
 * something broke must not make an article look like a habit — and must not vanish either.
 */
describe('a product’s history', () => {
  it('counts only the months it was ordered as planned material', async () => {
    await renderPage()

    // June and July were planned; August was one purchase outside the plan and is not a month it is ordered in.
    expect(metric('Sifariş olunan ay')).toHaveTextContent('2')
    expect(metric('Ayda orta miqdar')).toHaveTextContent('15')
  })

  it('keeps the one-off spend visible on its own', async () => {
    await renderPage()

    expect(metric('Aylıq sifarişlər')).toHaveTextContent('300,00 ₼')
    expect(metric('Aylıqdan Kənar sifarişlər')).toHaveTextContent('500,00 ₼')
    expect(metric('Aylıqdan Kənar sifarişlər')).toHaveTextContent('1 dəfə')
  })

  it('shows a month that bought only outside the plan without claiming a monthly quantity', async () => {
    await renderPage()

    // The month appears twice — once in the months table, once on the line below it — so the row is taken
    // from the table that carries the monthly quantity.
    const monthsTable = screen.getByRole('table', { name: 'Aylar üzrə sifariş miqdarı və məbləği' })
    const august = within(monthsTable).getByText('Avqust 2026').closest('tr') as HTMLElement
    expect(within(august).getAllByText('—').length).toBeGreaterThan(0)
    expect(august).toHaveTextContent('500,00 ₼')
    expect(august).toHaveTextContent('1 sətir')
  })

  it('lists every line with its kind, its person and a way back to the order', async () => {
    await renderPage()

    const rows = screen.getAllByRole('row')
    const outside = rows.find((row) => row.textContent?.includes('Çingiz')) as HTMLElement
    expect(within(outside).getByText('Aylıqdan kənar')).toBeInTheDocument()
    expect(within(outside).getByRole('link', { name: 'Heydər Əliyev Mərkəzi' })).toHaveAttribute('href', '/orders/51')

    const monthly = rows.find((row) => row.textContent?.includes('Eldar')) as HTMLElement
    expect(within(monthly).getByText('Aylıq')).toBeInTheDocument()
  })

  it('says plainly when a product has never been ordered', async () => {
    api.fetchProductHistory.mockResolvedValue(history({
      monthsOrdered: 0,
      averageMonthlyQuantity: null,
      firstOrderedPeriod: null,
      lastOrderedPeriod: null,
      monthlyKnownAmountTotal: null,
      outsideMonthlyKnownAmountTotal: null,
      outsideMonthlyLineCount: 0,
      months: [],
      lines: [],
    }))
    await renderPage()

    expect(screen.getByText(/Bu məhsul heç vaxt sifariş olunmayıb/)).toBeInTheDocument()
  })
})
