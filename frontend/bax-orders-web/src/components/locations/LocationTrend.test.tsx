import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { LocationOrderHistoryEntry } from '../../api/orders'
import { LocationTrend } from './LocationTrend'

/**
 * The strip at the top of an object: what it ordered last, and the shape of the year behind it. The month it
 * did not order in is the thing most easily got wrong here — a bar of no height would read as a month that
 * cost nothing, which is a different fact entirely.
 */
function entry(period: string, amount: number | null, overrides: Partial<LocationOrderHistoryEntry> = {}): LocationOrderHistoryEntry {
  return {
    orderRequestId: Number(period.slice(5, 7)),
    requestPeriod: period,
    version: 1,
    requestDate: null,
    status: 'Draft',
    itemCount: 10,
    knownPriceItemCount: 10,
    missingPriceItemCount: 0,
    knownAmountTotal: amount,
    createdAtUtc: '2026-09-22T10:00:00Z',
    ...overrides,
  }
}

function renderTrend(entries: LocationOrderHistoryEntry[]) {
  return render(
    <MemoryRouter>
      <LocationTrend entries={entries} />
    </MemoryRouter>,
  )
}

describe('the latest order', () => {
  it('leads with its month, its money and its state', () => {
    renderTrend([entry('2026-09-01', 3246.43), entry('2026-08-01', 1958.52)])

    expect(screen.getByText(/Sentyabr 2026/)).toBeInTheDocument()
    expect(screen.getByText('3.246,43 ₼')).toBeInTheDocument()
    expect(screen.getByText('Təsdiqlənməyib')).toBeInTheDocument()
  })

  it('compares it with the calendar month before it', () => {
    renderTrend([entry('2026-09-01', 3246.43), entry('2026-08-01', 1958.52)])

    expect(screen.getByText(/Keçən aya görə \+1\.287,91 ₼/)).toBeInTheDocument()
  })

  it('refuses a comparison when the month before has no order', () => {
    // July, then September. August never happened, so the rise is against nothing and is not claimed.
    renderTrend([entry('2026-09-01', 3246.43), entry('2026-07-01', 1958.52)])

    expect(screen.getByText('Keçən ay üçün müqayisə məlumatı yoxdur.')).toBeInTheDocument()
    expect(screen.queryByText(/Keçən aya görə/)).toBeNull()
  })

  it('names the unpriced products beside the amount they affect', () => {
    renderTrend([entry('2026-09-01', 3246.43, { missingPriceItemCount: 2 })])

    expect(screen.getByText('2 məhsulun qiyməti yoxdur')).toBeInTheDocument()
  })

  it('opens the order it is about', () => {
    renderTrend([entry('2026-09-01', 3246.43)])

    expect(screen.getByRole('link', { name: 'Sifarişə bax' })).toHaveAttribute('href', '/orders/9')
  })
})

describe('the strip behind it', () => {
  it('draws a month with no order as a gap rather than as nothing spent', () => {
    const { container } = renderTrend([
      entry('2026-09-01', 3000),
      entry('2026-07-01', 1000),
    ])

    const strip = screen.getByRole('list', { name: 'Son ayların məbləğləri' })
    const bars = within(strip).getAllByRole('listitem')
    expect(bars).toHaveLength(3)

    // August is a dashed outline, not a short solid bar.
    expect(container.querySelector('[title^="Avqust 2026"]')).toHaveAttribute('title', 'Avqust 2026: sifariş yoxdur')
    expect(container.querySelector('[title^="Avqust 2026"]')?.className).toContain('border-dashed')
  })

  it('says what each month was worth', () => {
    const { container } = renderTrend([entry('2026-09-01', 3000), entry('2026-08-01', 1000)])

    expect(container.querySelector('[title^="Sentyabr 2026"]')).toHaveAttribute('title', 'Sentyabr 2026: 3.000,00 ₼')
  })

  it('shows nothing at all for an object that has never ordered', () => {
    const { container } = renderTrend([])

    expect(container).toBeEmptyDOMElement()
  })
})
