import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocationOrderList, LocationOrderSummary } from '../api/orders'
import {
  historicalImportChipClass,
  historicalImportLabel,
  workflowStatusClass,
} from '../components/workflow/labels'
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
    latestOutsideMonthlyKnownAmount: null,
    latestOutsideMonthlyItemCount: 0,
    latestUnclassifiedItemCount: 0,
    latestItemCount: 6,
    latestMissingPriceItemCount: 0,
    latestPriceNotRequiredItemCount: 0,
    latestAmountIsComplete: true,
    previousPeriod: '2026-08-01',
    previousKnownAmount: 1200,
    knownAmountDelta: 320.4,
    knownAmountPercentChange: 26.7,
    latestRequestIsHistoricalImport: false,
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

    expect(await screen.findByText(/2 sətirdə qiymət yoxdur/)).toBeInTheDocument()
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

  /** Brief acceptance 4 and owner decision 9.1: a rise in cost is red, and says so in words. */
  it('colours a rise in cost red, on the money and on the percentage, with the direction in words', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows({
      knownAmountDelta: 320.4,
      knownAmountPercentChange: 26.7,
    }))
    await renderPage()

    const money = await screen.findByText('+320,40 ₼')
    expect(money).toHaveClass('text-red-700')
    expect(within(money).getByText(', xərc artıb')).toHaveClass('sr-only')
    expect(screen.getByText('+26,7%')).toHaveClass('text-red-700')
    expect(money.closest('td')!.querySelector('[class*="text-emerald"]')).toBeNull()
  })

  it('colours a fall in cost green, on the money and on the percentage, with the direction in words', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows({
      previousKnownAmount: 1670.4,
      knownAmountDelta: -150,
      knownAmountPercentChange: -8.98,
    }))
    await renderPage()

    const money = await screen.findByText('−150,00 ₼')
    expect(money).toHaveClass('text-emerald-700')
    expect(within(money).getByText(', xərc azalıb')).toHaveClass('sr-only')
    expect(screen.getByText('−8,98%')).toHaveClass('text-emerald-700')
    expect(money.closest('td')!.querySelector('[class*="text-red"]')).toBeNull()
  })

  it('leaves a change of nothing slate, with no direction to announce', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows({
      previousKnownAmount: 1520.4,
      knownAmountDelta: 0,
      knownAmountPercentChange: 0,
    }))
    await renderPage()

    const money = await screen.findByText('0,00 ₼')
    expect(money).toHaveClass('text-slate-600')
    expect(money.closest('td')).not.toHaveTextContent('xərc')
  })

  it('says under its heading what the change is measured against', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows())
    await renderPage()

    await screen.findByText('1.520,40 ₼')
    const heading = screen.getByRole('columnheader', { name: /Dəyişmə/ })
    const caption = within(heading).getByText('Keçən aya görə')
    expect(caption).toHaveClass('block', 'font-normal', 'text-slate-400')
  })

  it('says why a dash is a dash', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows({
      previousPeriod: null,
      previousKnownAmount: null,
      knownAmountDelta: null,
      knownAmountPercentChange: null,
    }))
    await renderPage()

    await screen.findByText('1.520,40 ₼')
    const dash = screen.getByTitle('Keçən ay üçün müqayisə məlumatı yoxdur.')
    expect(dash).toHaveTextContent('—')
    expect(within(dash).getByText('Keçən ay üçün müqayisə məlumatı yoxdur.')).toHaveClass('sr-only')
  })
})

describe('the columns the list no longer carries', () => {
  it('has dropped the counts that nobody decided anything with', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows())
    await renderPage()

    await screen.findByText('1.520,40 ₼')
    const table = document.querySelector('table')!
    // The sort indicator rides on the header it belongs to; the column names are what this pins down. "Dəyişmə"
    // now carries the basis it is measured against under it (Task 11) — asserted on its own in the change column's
    // tests, and taken off here so the names stay exactly these six.
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => (cell.textContent ?? '').replace(/[↑↓]/g, '').replace('Keçən aya görə', ''))

    expect(headers).toEqual(['Obyekt', 'Son sifariş', 'Məbləğ', 'Dəyişmə', 'Status', 'Bax'])
    expect(within(table).queryByText('Məlum qiymətlər üzrə')).toBeNull()
    expect(within(table).queryByText('Son dövr')).toBeNull()
  })

  /** Task 05b: the object is named, not coded, and the search does not ask for a code. */
  it('names each object without its code, and searches by name', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows())
    await renderPage()

    await screen.findByText('1.520,40 ₼')
    expect(screen.getByRole('link', { name: 'Fəvvarələr meydanı' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('LOC-000021')
    expect(screen.getByPlaceholderText('Obyekt adı…')).toBeInTheDocument()
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

/** Task 22b: the status column says a historical order the way the order page does (brief acceptance 4, 22.2). */
describe('the status of an order carried in from Excel', () => {
  async function statusCell(overrides: Partial<LocationOrderSummary>) {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows(overrides))
    await renderPage()
    await screen.findByText('1.520,40 ₼')
    const row = screen.getByRole('link', { name: 'Fəvvarələr meydanı' }).closest('tr')!
    return { row, cell: row.querySelectorAll('td')[3] }
  }

  it('reads ✓ Təsdiqlənib with the historical phrase beside it, in the plain grey of context', async () => {
    const { cell } = await statusCell({ latestRequestStatus: 'Approved', latestRequestIsHistoricalImport: true })

    const badge = within(cell).getByText('Təsdiqlənib')
    expect(badge).toHaveTextContent('✓')
    expect(badge).toHaveClass(...workflowStatusClass.Approved.split(' '))

    const phrase = within(cell).getByText(historicalImportLabel)
    expect(phrase).toHaveTextContent('Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb')
    expect(phrase).toHaveClass(...historicalImportChipClass.split(' '))
    expect(phrase.className).not.toMatch(/amber/)
  })

  it('adds no link or control to the row: it keeps its name and its Bax, and nothing else', async () => {
    const { row, cell } = await statusCell({ latestRequestStatus: 'Approved', latestRequestIsHistoricalImport: true })

    const links = within(row).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('aria-label') ?? link.textContent)).toEqual([
      'Fəvvarələr meydanı',
      'Fəvvarələr meydanı obyektinə bax',
    ])
    expect(within(cell).queryByRole('link')).toBeNull()
    expect(within(cell).queryByRole('button')).toBeNull()
  })

  it('says nothing historical of an order approved in this system', async () => {
    const { cell } = await statusCell({ latestRequestStatus: 'Approved', latestRequestIsHistoricalImport: false })

    expect(within(cell).getByText('Təsdiqlənib')).toBeInTheDocument()
    expect(cell).not.toHaveTextContent('Tarixi sifariş')
  })

  it('says nothing historical of a waiting order', async () => {
    const { cell } = await statusCell({ latestRequestStatus: 'PendingApproval' })

    expect(within(cell).getByText('Təsdiq gözləyir')).toBeInTheDocument()
    expect(cell).not.toHaveTextContent('Tarixi sifariş')
  })

  it('still says sifariş yoxdur of an object with no order', async () => {
    const { cell } = await statusCell({
      latestRequestId: null,
      latestRequestVersion: null,
      latestRequestStatus: null,
      latestRequestIsHistoricalImport: false,
    })

    expect(cell).toHaveTextContent('sifariş yoxdur')
    expect(cell).not.toHaveTextContent('Tarixi sifariş')
  })
})

/**
 * The money in this column and the difference beside it are the month's monthly material, because that is the
 * only population a month-on-month comparison means anything about. A one-off purchase is still a fact about
 * the month, so the row says it rather than folding it into a number the comparison reads.
 */
describe('a one-off purchase in the latest month', () => {
  it('is named under the money, never added to it', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows({
      latestKnownAmount: 1520.4,
      latestOutsideMonthlyKnownAmount: 900,
      latestOutsideMonthlyItemCount: 1,
    }))
    await renderPage()

    const row = (await screen.findByText('Fəvvarələr meydanı')).closest('tr') as HTMLElement
    expect(within(row).getByText('1.520,40 ₼')).toBeInTheDocument()
    expect(within(row).getByText(/Aylıqdan kənar:/)).toHaveTextContent('900,00 ₼')
  })

  it('says nothing when the month bought nothing outside its plan', async () => {
    ordersApi.fetchLocationOrders.mockResolvedValue(withRows({ latestKnownAmount: 1520.4 }))
    await renderPage()

    await screen.findByText('Fəvvarələr meydanı')
    expect(screen.queryByText(/Aylıqdan kənar:/)).not.toBeInTheDocument()
  })
})
