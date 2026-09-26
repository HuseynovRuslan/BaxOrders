import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DecisionComparison, OrderDecisionContext } from '../api/decisions'
import type { LocationOrderHistory, LocationOrderHistoryEntry } from '../api/orders'
import {
  historicalImportChipClass,
  historicalImportLabel,
  workflowStatusClass,
} from '../components/workflow/labels'
import { LocationDetailPage } from './LocationDetailPage'

/**
 * One object's page as the manager reads it (Task 05b): named, not coded; no version column and no line count;
 * and two orders of one month still told apart, in words rather than by a number.
 *
 * Task 11: the page accepts the basis it was opened with and keeps it on every link out, compares its latest
 * order through the order page's own endpoint, and says which period each count belongs to.
 */
const ordersApi = vi.hoisted(() => ({
  fetchLocationHistory: vi.fn(),
}))
const decisionsApi = vi.hoisted(() => ({ fetchDecisionContext: vi.fn() }))

vi.mock('../api/orders', async () => {
  const actual = await vi.importActual<typeof import('../api/orders')>('../api/orders')
  return { ...actual, ...ordersApi }
})
vi.mock('../api/decisions', async () => {
  const actual = await vi.importActual<typeof import('../api/decisions')>('../api/decisions')
  return { ...actual, ...decisionsApi }
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
    internalSupplyItemCount: 0,
    knownAmountTotal: 4800,
    createdAtUtc: '2026-09-22T10:00:00Z',
    isHistoricalImport: false,
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
    internalSupplyItemCount: 0,
    years: [2026],
    requests: { items: entries, page: 1, pageSize: 24, totalCount: entries.length },
    // The server names the latest order in the header; here, as on its unfiltered first page, the first row.
    latestOrderRequestId: entries[0]?.orderRequestId ?? null,
    ...overrides,
  }
}

/** Newest first, as the server sends it: July corrected once, and June. */
const twoOfJuly = [
  entry({ orderRequestId: 107, version: 2, status: 'PendingApproval', knownAmountTotal: 4700 }),
  entry({ orderRequestId: 105, version: 1, status: 'ReturnedForCorrection' }),
  entry({ orderRequestId: 104, requestPeriod: '2026-06-01', version: 1, status: 'Approved', knownAmountTotal: 4200 }),
]

function comparison(overrides: Partial<DecisionComparison> = {}): DecisionComparison {
  return {
    basis: 'PreviousMonth',
    customStart: null,
    customEnd: null,
    windowPeriods: ['2026-06-01'],
    expectedPeriodCount: 1,
    availablePeriodCount: 1,
    missingPeriods: [],
    periods: [],
    available: true,
    baselineKnownAmount: 4200,
    deltaAmount: 500,
    deltaPercent: 11.9,
    amountIsComplete: true,
    baselineMissingPriceItemCount: 0,
    ...overrides,
  }
}

/** The order page's answer for July's newest order, against whichever basis it was asked for. */
function contextFor(basis: DecisionComparison['basis']): OrderDecisionContext {
  const primary = basis === 'Previous3MonthAverage'
    ? comparison({
      basis,
      windowPeriods: ['2026-04-01', '2026-05-01', '2026-06-01'],
      expectedPeriodCount: 3,
      baselineKnownAmount: 4850,
      deltaAmount: -150,
      deltaPercent: -3.09,
    })
    : comparison({ basis })

  return {
    orderRequestId: 107,
    locationId: 43,
    locationCode: 'LOC-000043',
    locationName: 'Nərimanov heykəli',
    requestPeriod: '2026-07-01',
    version: 2,
    status: 'PendingApproval',
    isLatestVersion: true,
    latestOrderRequestId: 107,
    latestVersion: 2,
    current: {
      knownAmount: 4700,
      itemCount: 40,
      knownPriceItemCount: 40,
      missingPriceItemCount: 0,
      priceNotRequiredItemCount: 0,
      isComplete: true,
    },
    primary,
    secondary: [comparison({ basis: 'AllPriorMonths', windowPeriods: ['2026-05-01', '2026-06-01'] })],
    decomposition: null,
  }
}

beforeEach(() => {
  ordersApi.fetchLocationHistory.mockReset()
  decisionsApi.fetchDecisionContext.mockReset().mockImplementation(
    (_id: number, query: { basis: DecisionComparison['basis'] }) => Promise.resolve(contextFor(query.basis)))
})
afterEach(() => vi.clearAllMocks())

/** The router's own URL, so a test can watch what the page writes back to it. */
function Search() {
  return <span data-testid="search">{useLocation().search}</span>
}

async function renderPage(url = '/locations/43') {
  const result = render(
    <MemoryRouter initialEntries={[url]}>
      <Search />
      <Routes>
        <Route path="/locations/:locationId" element={<LocationDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByRole('heading', { name: 'Nərimanov heykəli' })
  return result
}

function card() {
  return screen.getByRole('region', { name: 'Son sifariş və tarixçə' })
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

/** Task 22b: a period row says a historical order the way the order page does (brief requirement 5, 22.2). */
describe('an order carried in from Excel', () => {
  /** June, as in twoOfJuly, but carried in from Excel as already approved. */
  const historicalJune = { ...twoOfJuly[2], isHistoricalImport: true }

  function linksOf(row: HTMLElement): string[] {
    return within(row).getAllByRole('link').map((link) => `${link.textContent} → ${link.getAttribute('href')}`)
  }

  it('reads ✓ Təsdiqlənib with the phrase beside it on its own row, and on no other', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history([twoOfJuly[0], twoOfJuly[1], historicalJune]))
    await renderPage()

    const [julyNewest, julyReplaced, june] = table().getAllByRole('row').slice(1)
    const badge = within(june).getByText('Təsdiqlənib')
    expect(badge).toHaveTextContent('✓')
    expect(badge).toHaveClass(...workflowStatusClass.Approved.split(' '))
    const phrase = within(june).getByText(historicalImportLabel)
    expect(phrase).toHaveClass(...historicalImportChipClass.split(' '))
    expect(phrase.className).not.toMatch(/amber/)

    expect(julyNewest).not.toHaveTextContent('Tarixi sifariş')
    expect(julyReplaced).not.toHaveTextContent('Tarixi sifariş')
  })

  it('says nothing historical of an order approved in this system', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    await renderPage()

    const june = table().getAllByRole('row').slice(1)[2]
    expect(within(june).getByText('Təsdiqlənib')).toBeInTheDocument()
    expect(june).not.toHaveTextContent('Tarixi sifariş')
  })

  it('keeps the row’s links exactly as they were', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    const { unmount } = await renderPage()
    const before = linksOf(table().getAllByRole('row').slice(1)[2])
    unmount()

    ordersApi.fetchLocationHistory.mockResolvedValue(history([twoOfJuly[0], twoOfJuly[1], historicalJune]))
    await renderPage()
    const june = table().getAllByRole('row').slice(1)[2]

    expect(linksOf(june)).toEqual(before)
    expect(within(june).queryAllByRole('button')).toHaveLength(0)
  })

  it('shows the phrase on the latest-order card when the latest order is historical', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history([{ ...twoOfJuly[0], status: 'Approved', isHistoricalImport: true }]))
    await renderPage()

    expect(within(card()).getByText(historicalImportLabel)).toBeInTheDocument()
    expect(within(card()).getAllByRole('link', { name: 'Sifarişə bax' })).toHaveLength(1)
  })
})

/** Brief acceptance 2: "Son 3 ay" chosen on the dashboard is still "Son 3 ay" here, and on every link out. */
describe('the basis the page was opened with', () => {
  it('compares the latest order against it, through the order page’s own endpoint', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    await renderPage('/locations/43?basis=avg3')

    await waitFor(() => expect(decisionsApi.fetchDecisionContext).toHaveBeenCalled())
    // July's newest order — not the one it replaced — against the three-month average.
    expect(decisionsApi.fetchDecisionContext).toHaveBeenCalledTimes(1)
    expect(decisionsApi.fetchDecisionContext.mock.calls[0][0]).toBe(107)
    expect(decisionsApi.fetchDecisionContext.mock.calls[0][1]).toEqual({ basis: 'Previous3MonthAverage' })

    const trend = within(card())
    expect(await trend.findByText('Son 3 ayın ortalamasına görə')).toBeInTheDocument()
    expect(trend.getByText('Müqayisə: Son 3 ayın ortalaması (Aprel–İyun 2026)')).toBeInTheDocument()
    const delta = trend.getByText('−150,00 ₼')
    expect(delta).toHaveClass('text-emerald-700')
    expect(delta).toHaveTextContent('xərc azalıb')
    expect(trend.getByRole('button', { name: 'Son 3 ayın ortalaması' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps it on every link out of the page', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    await renderPage('/locations/43?basis=avg3')
    await within(card()).findByText('Son 3 ayın ortalamasına görə')

    const toOrders = screen.getAllByRole('link', { name: 'Sifarişə bax' })
    // The card's and one per row.
    expect(toOrders).toHaveLength(4)
    for (const link of toOrders) {
      expect(link.getAttribute('href')).toMatch(/^\/orders\/\d+\?basis=avg3$/)
    }

    const periods = table().getAllByRole('link', { name: /2026$/ })
    expect(periods.map((link) => link.getAttribute('href'))).toEqual([
      '/orders/107?basis=avg3',
      '/orders/105?basis=avg3',
      '/orders/104?basis=avg3',
    ])

    // Changed deliberately in 11b (11.1: "«Müqayisə» … həmin sifarişin təhlil səhifəsini açır"): the comparison is
    // the order's own analysis, not a second page — the latest order for the header, that very order for a row.
    expect(screen.getByRole('link', { name: 'Müqayisə et' })).toHaveAttribute('href', '/orders/107?basis=avg3')
    const compare = table().getAllByRole('link', { name: /dövrünü müqayisə et$/ })
    expect(compare.map((link) => link.getAttribute('href'))).toEqual([
      '/orders/107?basis=avg3',
      '/orders/105?basis=avg3',
      '/orders/104?basis=avg3',
    ])
  })

  it('rewrites the URL and asks again when the reader picks another basis', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    await renderPage('/locations/43?basis=avg3')
    await within(card()).findByText('Son 3 ayın ortalamasına görə')

    await userEvent.click(within(card()).getByRole('button', { name: 'Keçən ay' }))

    expect(screen.getByTestId('search')).toHaveTextContent('?basis=last')
    await waitFor(() => expect(decisionsApi.fetchDecisionContext).toHaveBeenCalledTimes(2))
    expect(decisionsApi.fetchDecisionContext.mock.calls[1][0]).toBe(107)
    expect(decisionsApi.fetchDecisionContext.mock.calls[1][1]).toEqual({ basis: 'PreviousMonth' })
    expect(await within(card()).findByText('Keçən aya görə')).toBeInTheDocument()
    expect(within(card()).queryByText('Son 3 ayın ortalamasına görə')).toBeNull()
    for (const link of screen.getAllByRole('link', { name: 'Sifarişə bax' })) {
      expect(link.getAttribute('href')).toMatch(/\?basis=last$/)
    }
  })

  it('reads as last month when the URL names no basis', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    await renderPage()

    await waitFor(() => expect(decisionsApi.fetchDecisionContext).toHaveBeenCalled())
    expect(decisionsApi.fetchDecisionContext.mock.calls[0][1]).toEqual({ basis: 'PreviousMonth' })
    expect(await within(card()).findByText('Keçən aya görə')).toBeInTheDocument()
    expect(within(card()).getByRole('button', { name: 'Keçən ay' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('still shows the latest order when the comparison cannot be read', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    decisionsApi.fetchDecisionContext.mockReset().mockRejectedValue(new Error('500'))
    await renderPage('/locations/43?basis=avg3')

    await waitFor(() => expect(decisionsApi.fetchDecisionContext).toHaveBeenCalled())
    await waitFor(() => expect(card().querySelector('.animate-pulse')).toBeNull())
    expect(within(card()).getByText(/Son sifariş · İyul 2026/)).toBeInTheDocument()
    expect(within(card()).getByText('4.700,00 ₼', { selector: '.text-2xl' })).toBeInTheDocument()
    expect(within(card()).getByRole('link', { name: 'Sifarişə bax' })).toHaveAttribute('href', '/orders/107?basis=avg3')
    expect(within(card()).queryByText(/Müqayisə:/)).toBeNull()
  })
})

/**
 * Brief acceptance 5 (11.1): there is no separate comparison page. "Müqayisə et" opens the latest order's analysis
 * and each row's "Müqayisə" opens that order's, with the chosen basis.
 */
describe('"Müqayisə" opens the order’s analysis', () => {
  function hrefs(): string[] {
    return screen.getAllByRole('link').map((link) => link.getAttribute('href') ?? '')
  }

  it('from the header, as the latest order, with the basis', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    await renderPage('/locations/43?basis=avg3')

    expect(screen.getByRole('link', { name: 'Müqayisə et' })).toHaveAttribute('href', '/orders/107?basis=avg3')
    expect(hrefs().filter((href) => href.includes('/analytics'))).toEqual([])
  })

  it('from every row, as that row’s order, with the basis', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    await renderPage('/locations/43?basis=avg3')

    // The same order the row's "Sifarişə bax" opens, and the same words and name as before.
    const rows = table().getAllByRole('row').slice(1)
    const compare = rows.map((row) => within(row).getByRole('link', { name: /dövrünü müqayisə et$/ }))
    expect(compare.map((link) => link.getAttribute('href')))
      .toEqual(rows.map((row) => within(row).getByRole('link', { name: 'Sifarişə bax' }).getAttribute('href')))
    expect(compare.map((link) => link.textContent)).toEqual(['Müqayisə', 'Müqayisə', 'Müqayisə'])
    expect(compare[2]).toHaveAccessibleName('İyun 2026 dövrünü müqayisə et')
  })

  it('still opens the latest order under a filter whose rows do not hold it', async () => {
    // Filtered, the page lists June alone; the header still names July's newest order.
    ordersApi.fetchLocationHistory.mockImplementation(
      (_id: number, query: { year?: number }) => Promise.resolve(query.year === undefined
        ? history(twoOfJuly)
        : history([twoOfJuly[2]], { latestOrderRequestId: 107 })))
    await renderPage('/locations/43?basis=avg3')

    const [yearFilter] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(yearFilter, '2026')
    await waitFor(() => expect(table().getAllByRole('link', { name: /dövrünü müqayisə et$/ })).toHaveLength(1))

    expect(screen.getByRole('link', { name: 'Müqayisə et' })).toHaveAttribute('href', '/orders/107?basis=avg3')
    expect(table().getByRole('link', { name: /dövrünü müqayisə et$/ })).toHaveAttribute('href', '/orders/104?basis=avg3')
  })

  it('still opens the latest order on the second page', async () => {
    const many = Array.from({ length: 24 }, (_, index) => entry({ orderRequestId: 200 + index }))
    ordersApi.fetchLocationHistory.mockImplementation(
      (_id: number, query: { page: number }) => Promise.resolve(history(many, {
        requests: { items: query.page === 1 ? many : [twoOfJuly[2]], page: query.page, pageSize: 24, totalCount: 25 },
        latestOrderRequestId: 200,
      })))
    await renderPage('/locations/43?basis=avg3')

    await userEvent.click(screen.getByRole('button', { name: 'Növbəti' }))
    await screen.findByText('Səhifə 2 / 2 · 25 sifariş')

    expect(screen.getByRole('link', { name: 'Müqayisə et' })).toHaveAttribute('href', '/orders/200?basis=avg3')
    expect(table().getByRole('link', { name: /dövrünü müqayisə et$/ })).toHaveAttribute('href', '/orders/104?basis=avg3')
  })

  it('is not offered for an object with no order: there is nothing to open', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history([], { earliestPeriod: null, latestPeriod: null }))
    await renderPage('/locations/43?basis=avg3')

    expect(screen.queryByRole('link', { name: 'Müqayisə et' })).toBeNull()
    expect(hrefs().filter((href) => href.includes('/analytics'))).toEqual([])
  })
})

describe('where the card and the strip are shown', () => {
  it('not under a year or month filter, and nothing is compared then', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    await renderPage()
    await within(card()).findByText('Keçən aya görə')
    decisionsApi.fetchDecisionContext.mockClear()

    const [yearFilter] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(yearFilter, '2026')
    await waitFor(() => expect(ordersApi.fetchLocationHistory).toHaveBeenLastCalledWith(
      43, expect.objectContaining({ year: 2026 }), expect.anything()))
    await screen.findAllByRole('link', { name: 'Sifarişə bax' })

    expect(screen.queryByRole('region', { name: 'Son sifariş və tarixçə' })).toBeNull()
    expect(screen.queryByRole('list', { name: 'Son ayların məbləğləri' })).toBeNull()
    expect(decisionsApi.fetchDecisionContext).not.toHaveBeenCalled()
  })

  it('not on the second page, where the first row is not the latest order', async () => {
    const many = Array.from({ length: 24 }, (_, index) => entry({ orderRequestId: 200 + index }))
    ordersApi.fetchLocationHistory.mockImplementation(
      (_id: number, query: { page: number }) => Promise.resolve(history(many, {
        requests: { items: query.page === 1 ? many : [twoOfJuly[2]], page: query.page, pageSize: 24, totalCount: 25 },
      })))
    await renderPage()
    await within(card()).findByText('Keçən aya görə')
    decisionsApi.fetchDecisionContext.mockClear()

    await userEvent.click(screen.getByRole('button', { name: 'Növbəti' }))
    await screen.findByText('Səhifə 2 / 2 · 25 sifariş')

    expect(screen.queryByRole('region', { name: 'Son sifariş və tarixçə' })).toBeNull()
    expect(screen.queryByText(/Son sifariş ·/)).toBeNull()
    expect(decisionsApi.fetchDecisionContext).not.toHaveBeenCalled()
  })
})

/** Brief acceptance 3: each count is shown apart and says which period it belongs to. */
describe('the counts and their periods', () => {
  it('says the lifetime counts are the whole history, and names its months', async () => {
    // Heydər Əliyev-shaped: fifteen owed prices across the whole history, and some internal supply.
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly, {
      earliestPeriod: '2025-11-01',
      latestPeriod: '2026-07-01',
      missingPriceItemCount: 15,
      internalSupplyItemCount: 4,
    }))
    await renderPage()

    const lead = screen.getByText('Bütün tarixçə (Noyabr 2025–İyul 2026):')
    const line = lead.parentElement!
    expect(within(line).getByText('Qiymət yoxdur').nextElementSibling).toHaveTextContent('15')
    expect(within(line).getByText('15')).toHaveClass('text-amber-800')
    expect(within(line).getByText('Daxili təminat').nextElementSibling).toHaveTextContent('4')
    expect(within(line).getByText('4')).not.toHaveClass('text-amber-800')
    // The facts that were already there stay under the same lead.
    expect(within(line).getByText('Dövrlər')).toBeInTheDocument()
    expect(within(line).getByText('Sifarişlər')).toBeInTheDocument()
  })

  it('leaves out a count of nothing', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history(twoOfJuly))
    await renderPage()

    const line = screen.getByText(/^Bütün tarixçə/).parentElement!
    expect(line).not.toHaveTextContent('Qiymət yoxdur')
    expect(line).not.toHaveTextContent('Daxili təminat')
  })

  it('has no months to name for an object that has never ordered', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history([], { earliestPeriod: null, latestPeriod: null }))
    await renderPage()

    expect(screen.getByText('Bütün tarixçə:')).toBeInTheDocument()
    expect(screen.getByText('Bu obyektin hələ sifarişi yoxdur.')).toBeInTheDocument()
    expect(decisionsApi.fetchDecisionContext).not.toHaveBeenCalled()
  })

  it('names the latest order’s counts with its month', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history([
      entry({ orderRequestId: 109, requestPeriod: '2026-09-01', missingPriceItemCount: 1, internalSupplyItemCount: 1 }),
      ...twoOfJuly,
    ]))
    await renderPage()

    expect(within(card()).getByText(/sifarişində:/))
      .toHaveTextContent('Sentyabr 2026 sifarişində: Qiymət yoxdur 1 · Daxili təminat 1')
  })

  it('gives each row its own internal supply, beside its owed prices', async () => {
    ordersApi.fetchLocationHistory.mockResolvedValue(history([
      entry({ orderRequestId: 107, version: 2, missingPriceItemCount: 1, internalSupplyItemCount: 2 }),
      twoOfJuly[2],
    ]))
    await renderPage()

    const [july, june] = table().getAllByRole('row').slice(1)
    expect(within(july).getByText('1 sətirdə qiymət yoxdur')).toHaveClass('text-amber-800')
    expect(within(july).getByText('2 sətir daxili təminat (ödənişsiz)')).toHaveClass('text-slate-500')
    expect(june).not.toHaveTextContent('daxili təminat')
  })
})
