import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocationOrderList, LocationOrderSummary } from '../api/orders'
import { LocationsPage } from './LocationsPage'

/**
 * The objects list's own top summary: four plain facts, none of them a warning, and the money column that
 * must never break between the amount and its manat sign.
 */
const ordersApi = vi.hoisted(() => ({
  fetchLocationOrders: vi.fn(),
}))

vi.mock('../api/orders', async () => {
  const actual = await vi.importActual<typeof import('../api/orders')>('../api/orders')
  return { ...actual, ...ordersApi }
})

function location(overrides: Partial<LocationOrderSummary> = {}): LocationOrderSummary {
  return {
    locationId: 21,
    code: 'LOC-000021',
    name: 'Fəvvarələr meydanı',
    isActive: true,
    orderRequestCount: 9,
    distinctPeriodCount: 9,
    earliestPeriod: '2026-01-01',
    latestPeriod: '2026-09-01',
    latestRequestId: 105,
    latestRequestVersion: 1,
    latestRequestStatus: 'Draft',
    totalItemCount: 40,
    knownAmountTotal: 13534.12,
    missingPriceItemCount: 0,
    latestKnownAmount: 1520.4,
    latestItemCount: 6,
    latestMissingPriceItemCount: 0,
    latestPriceNotRequiredItemCount: 0,
    latestAmountIsComplete: true,
    previousPeriod: '2026-08-01',
    previousKnownAmount: 1200,
    knownAmountDelta: 320.4,
    knownAmountPercentChange: 26.7,
    ...overrides,
  }
}

function list(overrides: Partial<LocationOrderList> = {}): LocationOrderList {
  return {
    locations: { items: [location()], page: 1, pageSize: 25, totalCount: 1 },
    locationCount: 29,
    locationsWithOrders: 26,
    orderRequestCount: 167,
    earliestPeriod: '2026-01-01',
    latestPeriod: '2026-09-01',
    ...overrides,
  }
}

beforeEach(() => ordersApi.fetchLocationOrders.mockReset())
afterEach(() => vi.clearAllMocks())

async function renderPage() {
  render(
    <MemoryRouter>
      <LocationsPage />
    </MemoryRouter>,
  )
  await screen.findByRole('group', { name: 'Obyektlərin xülasəsi' })
}

function metricValue(label: string): string | null {
  const summary = screen.getByRole('group', { name: 'Obyektlərin xülasəsi' })
  return within(summary).getByText(label).nextElementSibling?.textContent ?? null
}

describe('the top summary', () => {
  it('reports exactly what the server counted', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(list())
    await renderPage()

    expect(metricValue('Obyekt')).toBe('29')
    expect(metricValue('Sifarişi olan')).toBe('26')
    expect(metricValue('Sifariş')).toBe('167')
    expect(metricValue('Əhatə olunan dövr')).toBe('Yanvar 2026 – Sentyabr 2026')
  })

  it('is four plain facts, not a warning — nothing here is amber', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(list())
    await renderPage()

    const summary = screen.getByRole('group', { name: 'Obyektlərin xülasəsi' })
    expect(summary.querySelector('.border-amber-200')).toBeNull()
    expect(summary.querySelector('.text-amber-900')).toBeNull()
  })
})

function withRows(overrides: Partial<LocationOrderSummary> = {}) {
  return list({
    locations: { items: [location(overrides)], page: 1, pageSize: 25, totalCount: 1 },
  })
}

describe('the money column', () => {
  it('is the latest order, not everything the object has ever spent', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows({
      latestKnownAmount: 1520.4,
      knownAmountTotal: 13534.12,
    }))
    await renderPage()

    expect(await screen.findByText('1.520,40 ₼')).toBeInTheDocument()
    expect(screen.queryByText('13.534,12 ₼')).toBeNull()
  })

  it('never breaks a value between the amount and its manat sign', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows({ latestKnownAmount: 1520.4 }))
    await renderPage()

    expect(await screen.findByText('1.520,40 ₼')).toHaveClass('whitespace-nowrap')
  })

  it('names the unpriced products beside the amount they affect', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows({
      latestMissingPriceItemCount: 2,
      latestAmountIsComplete: false,
    }))
    await renderPage()

    expect(await screen.findByText(/2 məhsulun qiyməti yoxdur/)).toBeInTheDocument()
  })

  it('says nothing of the sort when every line is priced', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows())
    await renderPage()

    await screen.findByText('1.520,40 ₼')
    expect(screen.queryByText(/qiyməti yoxdur/)).toBeNull()
  })
})

describe('the change column', () => {
  it('shows the difference against the month before, with its percentage', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows({
      knownAmountDelta: 320.4,
      knownAmountPercentChange: 26.7,
    }))
    await renderPage()

    expect(await screen.findByText('+320,40 ₼')).toBeInTheDocument()
    expect(screen.getByText('+26,7%')).toBeInTheDocument()
  })

  it('claims no change at all when there is no previous month to compare with', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows({
      previousPeriod: null,
      previousKnownAmount: null,
      knownAmountDelta: null,
      knownAmountPercentChange: null,
    }))
    await renderPage()

    await screen.findByText('1.520,40 ₼')
    // Neither a zero nor a percentage: the object simply has nothing before it to be compared with.
    expect(screen.queryByText('0,00 ₼')).toBeNull()
    expect(screen.queryByText(/%/)).toBeNull()
  })
})

describe('the columns the list no longer carries', () => {
  it('has dropped the counts that nobody decided anything with', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows())
    await renderPage()

    await screen.findByText('1.520,40 ₼')
    const table = document.querySelector('table')!
    // The sort indicator rides on the header it belongs to; the column names are what this pins down.
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => (cell.textContent ?? '').replace(/[↑↓]/g, ''))

    expect(headers).toEqual(['Obyekt', 'Son sifariş', 'Məbləğ', 'Dəyişmə', 'Status', 'Bax'])
    expect(within(table).queryByText('Məlum qiymətlər üzrə')).toBeNull()
    expect(within(table).queryByText('Son dövr')).toBeNull()
  })

  it('shows the latest order as a month, and its status beside it', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows({
      latestPeriod: '2026-09-01',
      latestRequestStatus: 'Draft',
    }))
    await renderPage()

    expect(await screen.findByText('Sentyabr 2026')).toBeInTheDocument()
    // The word "Qaralama" is gone from the product; an undecided order says exactly that.
    expect(screen.getByText('Təsdiqlənməyib')).toBeInTheDocument()
  })
})
