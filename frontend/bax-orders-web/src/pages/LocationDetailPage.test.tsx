import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocationOrderHistory, LocationOrderHistoryEntry } from '../api/orders'
import { LocationDetailPage } from './LocationDetailPage'

/**
 * One object's page as the manager reads it (Task 05b): named, not coded; no version column and no line count;
 * and two orders of one month still told apart, in words rather than by a number.
 */
const ordersApi = vi.hoisted(() => ({
  fetchLocationHistory: vi.fn(),
}))

vi.mock('../api/orders', async () => {
  const actual = await vi.importActual<typeof import('../api/orders')>('../api/orders')
  return { ...actual, ...ordersApi }
})

function entry(overrides: Partial<LocationOrderHistoryEntry> = {}): LocationOrderHistoryEntry {
  return {
    orderRequestId: 105,
    requestPeriod: '2026-07-01',
    version: 1,
    requestDate: null,
    status: 'PendingApproval',
    itemCount: 40,
    knownPriceItemCount: 40,
    missingPriceItemCount: 0,
    knownAmountTotal: 4800,
    createdAtUtc: '2026-09-22T10:00:00Z',
    ...overrides,
  }
}

function history(entries: LocationOrderHistoryEntry[], overrides: Partial<LocationOrderHistory> = {}): LocationOrderHistory {
  return {
    locationId: 43,
    code: 'LOC-000043',
    name: 'Nərimanov heykəli',
    isActive: true,
    orderRequestCount: entries.length,
    distinctPeriodCount: 2,
    earliestPeriod: '2026-06-01',
    latestPeriod: '2026-07-01',
    totalItemCount: 120,
    knownAmountTotal: 9000,
    missingPriceItemCount: 0,
    years: [2026],
    requests: { items: entries, page: 1, pageSize: 24, totalCount: entries.length },
    ...overrides,
  }
}

/** Newest first, as the server sends it: July corrected once, and June. */
const twoOfJuly = [
  entry({ orderRequestId: 107, version: 2, status: 'PendingApproval', knownAmountTotal: 4700 }),
  entry({ orderRequestId: 105, version: 1, status: 'ReturnedForCorrection' }),
  entry({ orderRequestId: 104, requestPeriod: '2026-06-01', version: 1, status: 'Approved', knownAmountTotal: 4200 }),
]

beforeEach(() => ordersApi.fetchLocationHistory.mockReset())
afterEach(() => vi.clearAllMocks())

async function renderPage() {
  const result = render(
    <MemoryRouter initialEntries={['/locations/43']}>
      <Routes>
        <Route path="/locations/:locationId" element={<LocationDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByRole('heading', { name: 'Nərimanov heykəli' })
  return result
}

function table() {
  return within(document.querySelector('table')!)
}

describe('the object’s header', () => {
  it('names the object and nothing else when it is active', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    const { container } = await renderPage()

    expect(container).not.toHaveTextContent('LOC-000043')
    expect(screen.queryByText('Deaktiv')).toBeNull()
  })

  it('says "Deaktiv" for an object that is no longer active, still without its code', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly, { isActive: false }))
    const { container } = await renderPage()

    expect(screen.getByText('Deaktiv')).toBeInTheDocument()
    expect(container).not.toHaveTextContent('LOC-000043')
  })
})

describe('the orders table', () => {
  it('has no version column and no line count, only the period, the money and the status', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    const { container } = await renderPage()

    const headers = table().getAllByRole('columnheader').map((cell) => cell.textContent)
    expect(headers).toEqual(['Dövr', 'Məbləğ', 'Status', ''])
    expect(container).not.toHaveTextContent(/versiya/i)
    expect(container).not.toHaveTextContent('Sətir sayı')
  })

  it('has no line-count fact in the strip above it', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    await renderPage()

    expect(screen.queryByText('Sətirlər')).toBeNull()
    expect(screen.queryByText('120')).toBeNull()
    // The facts that stay.
    expect(screen.getByText('Dövrlər')).toBeInTheDocument()
    expect(screen.getByText('Sifarişlər')).toBeInTheDocument()
  })
})

describe('two orders of one month', () => {
  it('marks the older one as replaced, and leaves the newest and the other months as they are', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    await renderPage()

    const rows = table().getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)

    // July, newest: no note.
    expect(rows[0]).toHaveTextContent('İyul 2026')
    expect(rows[0]).not.toHaveTextContent('Əvvəlki sifariş')
    // July, the one the correction replaced.
    expect(rows[1]).toHaveTextContent('İyul 2026')
    expect(within(rows[1]).getByText('Əvvəlki sifariş — sonradan yenilənib')).toBeInTheDocument()
    // June has one order: nothing to tell apart.
    expect(rows[2]).toHaveTextContent('İyun 2026')
    expect(rows[2]).not.toHaveTextContent('Əvvəlki sifariş')
  })

  it('does not depend on the order the rows arrive in', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history([twoOfJuly[1], twoOfJuly[0], twoOfJuly[2]]))
    await renderPage()

    const rows = table().getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('Əvvəlki sifariş — sonradan yenilənib')).toBeInTheDocument()
    expect(rows[1]).not.toHaveTextContent('Əvvəlki sifariş')
    expect(screen.getAllByText('Əvvəlki sifariş — sonradan yenilənib')).toHaveLength(1)
  })

  it('says nothing of the sort when every month has one order', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history([twoOfJuly[0], twoOfJuly[2]]))
    await renderPage()

    expect(screen.queryByText('Əvvəlki sifariş — sonradan yenilənib')).toBeNull()
  })
})
