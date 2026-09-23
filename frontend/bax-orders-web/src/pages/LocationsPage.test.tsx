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

describe('the money column', () => {
  it('never breaks a value between the amount and its manat sign', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(list({
      locations: { items: [location({ knownAmountTotal: 13534.12 })], page: 1, pageSize: 25, totalCount: 1 },
    }))
    await renderPage()

    const money = await screen.findByText('13.534,12 ₼')
    expect(money).toHaveClass('whitespace-nowrap')
  })
})
