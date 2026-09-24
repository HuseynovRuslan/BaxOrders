import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardAmount, LocationDashboardRow, ManagementDashboard } from '../api/dashboard'
import { partition, partitionMember } from '../test/dashboardFixtures'
import { ManagementDashboardPage } from './ManagementDashboardPage'

/**
 * Choosing what a month is compared against.
 *
 * The rule the whole screen rests on is that the reader always knows which comparison they are looking at. A
 * hand-picked window is not sent until both of its months are chosen, the months are dropped the moment a
 * basis that does not use them is picked, and the figures of the previous basis never linger under a heading
 * that now names a different one.
 */
const dashboardApi = vi.hoisted(() => ({
  fetchDashboard: vi.fn(),
  fetchDashboardPeriods: vi.fn(),
}))

vi.mock('../api/dashboard', async () => {
  const actual = await vi.importActual<typeof import('../api/dashboard')>('../api/dashboard')
  return { ...actual, ...dashboardApi }
})

function amount(overrides: Partial<DashboardAmount> = {}): DashboardAmount {
  return {
    knownAmount: 71210.29,
    itemCount: 480,
    knownPriceItemCount: 461,
    missingPriceItemCount: 19,
    priceNotRequiredItemCount: 1,
    isComplete: false,
    ...overrides,
  }
}

function row(): LocationDashboardRow {
  return {
    locationId: 21,
    locationCode: 'LOC-000017',
    locationName: 'Fəvvarələr meydanı',
    hasCurrentRequest: true,
    currentRequestId: 154,
    currentVersion: 1,
    currentStatus: 'Approved',
    current: amount({ knownAmount: 1000, missingPriceItemCount: 0, isComplete: true }),
    currentPriceCoverage: 'Complete',
    expectedBaselinePeriodCount: 1,
    availableBaselinePeriodCount: 1,
    missingBaselinePeriods: [],
    baselinePeriods: [],
    baseline: amount({ knownAmount: 800, missingPriceItemCount: 0, isComplete: true }),
    knownAmountDelta: 200,
    knownAmountPercentChange: 25,
    historyCoverage: 'Complete',
    comparisonAvailability: 'Available',
    comparisonAvailable: true,
    newVariantCount: 0,
    increasedVariantCount: 0,
    decreasedVariantCount: 0,
    unchangedVariantCount: 0,
    noLongerOrderedVariantCount: 0,
    insufficientHistoryVariantCount: 0,
    notComparableVariantCount: 0,
    quantityComparableVariantCount: 0,
    amountOrientedServiceCount: 0,
    comparedVariantCount: 0,
    deepLinkPeriod: '2026-09-01',
    deepLinkBasis: 'PreviousMonth',
    deepLinkCustomStart: null,
    deepLinkCustomEnd: null,
    causes: [{ category: 'QuantityChange', amount: 200, variantCount: 1 }],
    primaryCause: 'QuantityChange',
    primaryCauseAmount: 200,
    primaryCauseProduct: null,
    explanationIsComplete: true,
    unattributedAmount: 0,
    supplyChangedVariantCount: 0,
  }
}

function dashboard(baselinePeriods: string[] = ['2026-08-01']): ManagementDashboard {
  return {
    summary: {
      selectedPeriod: '2026-09-01',
      basis: 'PreviousMonth',
      baselinePeriods,
      locationCount: 26,
      locationsWithCurrentRequest: 24,
      locationsWithoutCurrentRequest: 2,
      currentRequestCount: 24,
      current: amount(),
      comparedCurrent: amount(),
      baseline: amount({ knownAmount: 60583.47 }),
      knownAmountDelta: 10626.82,
      knownAmountPercentChange: 17.54,
      partition: partition({
        compared: Array.from({ length: 24 }, (_, index) => partitionMember(index + 1, `Obyekt ${index + 1}`)),
        noOrderThisMonth: [partitionMember(98, 'Puşkin parkı'), partitionMember(99, 'Təmir-tikinti')],
      }),
      locationsWithMissingPrices: 10,
      locationsWithCompleteHistory: 23,
      locationsWithPartialHistory: 0,
      locationsWithNoBaselineHistory: 3,
      locationsWithComparison: 23,
      newVariantCount: 0,
      increasedVariantCount: 0,
      decreasedVariantCount: 0,
      unchangedVariantCount: 0,
      noLongerOrderedVariantCount: 0,
      insufficientHistoryVariantCount: 0,
      amountOrientedServiceCount: 0,
    },
    filteredLocationCount: 1,
    attention: [{ reason: 'LargestIncrease', location: row() }],
    rows: { items: [row()], page: 1, pageSize: 25, totalCount: 1 },
  }
}

/** The router's own URL, so a test can watch what the page writes back to it. */
function Search() {
  return <span data-testid="search">{useLocation().search}</span>
}

async function renderPage(url = '/dashboard?period=2026-09') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Search />
      <Routes>
        <Route path="/dashboard" element={<ManagementDashboardPage />} />
      </Routes>
    </MemoryRouter>,
  )

  // The object appears in both the table and the stacked phone layout, so both are awaited.
  await screen.findAllByText('Fəvvarələr meydanı')
}

beforeEach(() => {
  dashboardApi.fetchDashboardPeriods.mockReset().mockResolvedValue({
    periods: [
      { period: '2026-09-01', locationCount: 24, requestCount: 24, itemCount: 480 },
      { period: '2026-08-01', locationCount: 23, requestCount: 23, itemCount: 340 },
      { period: '2026-07-01', locationCount: 25, requestCount: 25, itemCount: 682 },
    ],
  })
  dashboardApi.fetchDashboard.mockReset().mockImplementation((_period: string, query: { basis: string }) => {
    const data = dashboard()
    // The API answers about the basis it was asked for; the captions on screen are read from that answer.
    return Promise.resolve({ ...data, summary: { ...data.summary, basis: query.basis } })
  })
})

afterEach(() => vi.clearAllMocks())

describe('the comparison choices', () => {
  it('offers all five, including the whole period and a hand-picked one', async () => {
    await renderPage()

    const group = within(screen.getByRole('group', { name: 'Müqayisə' }))
    // The whole-period button carries the same words as the sentence it produces (5.3).
    for (const label of ['Keçən ay', 'Son 3 ayın ortalaması', 'Son 6 ayın ortalaması', 'Bütün dövrün ortalaması', 'Xüsusi seçim']) {
      expect(group.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(group.queryByRole('button', { name: 'Bütün dövr' })).toBeNull()
  })

  it('asks for the whole period by name', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Bütün dövrün ortalaması' }))

    await waitFor(() => expect(dashboardApi.fetchDashboard).toHaveBeenLastCalledWith(
      '2026-09',
      expect.objectContaining({ basis: 'AllPriorMonths' }),
      expect.anything(),
    ))
    expect(dashboardApi.fetchDashboard.mock.lastCall![1]).not.toHaveProperty('customStart')
  })
})

describe('a hand-picked window', () => {
  /**
   * It used to blank the whole dashboard — month total and all — until both months were chosen, which
   * punished a manager for so much as looking at the option. It now opens on the previous month, which is a
   * real comparison, and the figures stay on screen while they narrow it.
   */
  it('never blanks the screen while the months are being chosen', async () => {
    await renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Xüsusi seçim' }))

    expect(screen.queryByText('Müqayisə üçün başlanğıc və son ayı seçin.')).toBeNull()
    expect(screen.getAllByText('Fəvvarələr meydanı').length).toBeGreaterThan(0)
    await waitFor(() => expect(dashboardApi.fetchDashboard).toHaveBeenLastCalledWith(
      '2026-09',
      expect.objectContaining({ basis: 'CustomRange', customStart: '2026-08', customEnd: '2026-08' }),
      expect.anything(),
    ))
  })

  /** Only months before the selected one: a window that reached it would compare it with itself. */
  it('offers only the months that lie before the month being looked at', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Xüsusi seçim' }))

    const start = await screen.findByLabelText('Başlanğıc ay')
    const options = within(start).getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['İyul 2026', 'Avqust 2026'])
    expect(options).not.toContain('Sentyabr 2026')
  })

  /** Picked the wrong way round: the end follows the start rather than producing an empty window. */
  it('never lets the range end before it starts', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Xüsusi seçim' }))
    await userEvent.selectOptions(await screen.findByLabelText('Başlanğıc ay'), '2026-07')
    await userEvent.selectOptions(screen.getByLabelText('Son ay'), '2026-07')
    await userEvent.selectOptions(screen.getByLabelText('Başlanğıc ay'), '2026-08')

    await waitFor(() => expect(dashboardApi.fetchDashboard).toHaveBeenLastCalledWith(
      '2026-09',
      expect.objectContaining({ customStart: '2026-08', customEnd: '2026-08' }),
      expect.anything(),
    ))
  })

  it('sends both months once both are chosen', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Xüsusi seçim' }))

    await userEvent.selectOptions(await screen.findByLabelText('Başlanğıc ay'), '2026-07')
    await userEvent.selectOptions(screen.getByLabelText('Son ay'), '2026-08')

    await waitFor(() => expect(dashboardApi.fetchDashboard).toHaveBeenLastCalledWith(
      '2026-09',
      expect.objectContaining({ basis: 'CustomRange', customStart: '2026-07', customEnd: '2026-08' }),
      expect.anything(),
    ))
  })

  /** The API rejects them with any other basis, and a screen showing months it is not using would be lying. */
  it('drops the months when a basis that does not use them is chosen', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Xüsusi seçim' }))
    await userEvent.selectOptions(await screen.findByLabelText('Başlanğıc ay'), '2026-07')
    await userEvent.selectOptions(screen.getByLabelText('Son ay'), '2026-08')
    await waitFor(() => expect(dashboardApi.fetchDashboard).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('button', { name: 'Keçən ay' }))

    await waitFor(() => expect(dashboardApi.fetchDashboard).toHaveBeenLastCalledWith(
      '2026-09',
      expect.objectContaining({ basis: 'PreviousMonth' }),
      expect.anything(),
    ))
    expect(dashboardApi.fetchDashboard.mock.lastCall![1]).not.toHaveProperty('customStart')
    expect(screen.queryByLabelText('Başlanğıc ay')).toBeNull()
  })
})

describe('the URL is the state', () => {
  it('restores the basis from the query string', async () => {
    await renderPage('/dashboard?period=2026-09&basis=avg6')

    expect(dashboardApi.fetchDashboard).toHaveBeenLastCalledWith(
      '2026-09',
      expect.objectContaining({ basis: 'Previous6MonthAverage' }),
      expect.anything(),
    )
    expect(screen.getByRole('button', { name: 'Son 6 ayın ortalaması' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('restores a hand-picked range from the query string', async () => {
    await renderPage('/dashboard?period=2026-09&basis=custom&from=2026-05&to=2026-08')

    expect(dashboardApi.fetchDashboard).toHaveBeenLastCalledWith(
      '2026-09',
      expect.objectContaining({ basis: 'CustomRange', customStart: '2026-05', customEnd: '2026-08' }),
      expect.anything(),
    )
  })

  /** A hand-edited URL should show a dashboard, not a crash. */
  it('falls back to last month on a basis it does not know', async () => {
    await renderPage('/dashboard?period=2026-09&basis=avg12')

    expect(dashboardApi.fetchDashboard).toHaveBeenLastCalledWith(
      '2026-09',
      expect.objectContaining({ basis: 'PreviousMonth' }),
      expect.anything(),
    )
  })

  it('writes the short name back when a basis is chosen', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Son 3 ayın ortalaması' }))

    await waitFor(() => expect(screen.getByTestId('search').textContent).toContain('basis=avg3'))
    expect(screen.getByTestId('search').textContent).not.toContain('from=')
  })
})

describe('carrying the basis into the order', () => {
  /**
   * The bug this whole task is about: the card said "+200,00 ₼ against the three-month average", the link
   * opened an order comparing against last month, and the manager had two answers to one question.
   */
  it('puts the basis on every "Detallara bax"', async () => {
    await renderPage('/dashboard?period=2026-09&basis=avg3')

    for (const link of screen.getAllByRole('link', { name: /Detallara bax/ })) {
      expect(link).toHaveAttribute('href', '/orders/154?basis=avg3')
    }
  })

  it('carries a hand-picked range too', async () => {
    await renderPage('/dashboard?period=2026-09&basis=custom&from=2026-05&to=2026-08')

    const link = screen.getAllByRole('link', { name: /Detallara bax/ })[0]
    expect(link).toHaveAttribute('href', '/orders/154?basis=custom&from=2026-05&to=2026-08')
  })

  it('says on each attention card which basis its figures use', async () => {
    await renderPage('/dashboard?period=2026-09&basis=avg3')

    expect(screen.getAllByText('Son 3 ayın ortalamasına görə').length).toBeGreaterThan(0)
  })
})

/**
 * The product under a card's "Əsas səbəb" and its share are the chosen basis's (Task 07): another basis is
 * another comparison, so it can name another product and another share. Nothing is recomputed in the browser —
 * the new answer is asked for, and shown.
 */
describe('the product behind the main cause', () => {
  it('is asked for again on a new basis, and the card shows the new product and share', async () => {
    dashboardApi.fetchDashboard.mockImplementation((_period: string, query: { basis: string }) => {
      const data = dashboard()
      const location: LocationDashboardRow = {
        ...row(),
        primaryCauseProduct: query.basis === 'Previous3MonthAverage'
          ? { productVariantId: 8, productName: 'Zibil paketi', amount: 150, sameDirectionAmount: 600 }
          : { productVariantId: 7, productName: 'Əlcək', amount: 120, sameDirectionAmount: 160 },
      }
      return Promise.resolve({
        ...data,
        summary: { ...data.summary, basis: query.basis },
        attention: [{ reason: 'LargestIncrease', location }],
        rows: { ...data.rows, items: [location] },
      })
    })

    await renderPage()
    const cards = () => within(screen.getByRole('region', { name: 'Diqqət tələb edən obyektlər' }))
    expect(cards().getByText(/Əlcək/)).toHaveTextContent('(artımların 75%-i)')

    await userEvent.click(screen.getByRole('button', { name: 'Son 3 ayın ortalaması' }))

    await waitFor(() => expect(dashboardApi.fetchDashboard).toHaveBeenLastCalledWith(
      '2026-09',
      expect.objectContaining({ basis: 'Previous3MonthAverage' }),
      expect.anything(),
    ))
    await waitFor(() => expect(cards().getByText(/Zibil paketi/)).toHaveTextContent('(artımların 25%-i)'))
    expect(cards().queryByText(/Əlcək/)).toBeNull()
  })
})

/**
 * A link somebody saved before the short names existed.
 *
 * It must open the comparison it was saved with — otherwise the same address quietly answers a different
 * question — and it must then become an address written the way the screen writes them, so the next person
 * it is passed to does not inherit the old one. The rewrite replaces the history entry rather than adding
 * one: nobody pressed anything, so Back still goes where the reader came from.
 */
describe('an older link', () => {
  it('is read, and asks the API for the comparison it names', async () => {
    await renderPage('/dashboard?period=2026-09&basis=Previous6MonthAverage')

    await waitFor(() => expect(dashboardApi.fetchDashboard).toHaveBeenCalledWith(
      '2026-09',
      expect.objectContaining({ basis: 'Previous6MonthAverage' }),
      expect.anything(),
    ))
  })

  it('is rewritten in the address bar, keeping everything that is not the basis', async () => {
    await renderPage('/dashboard?period=2026-09&basis=Previous6MonthAverage&sort=KnownAmountDelta')

    await waitFor(() => {
      const search = new URLSearchParams(screen.getByTestId('search').textContent ?? '')
      expect(search.get('basis')).toBe('avg6')
      expect(search.get('period')).toBe('2026-09')
      expect(search.get('sort')).toBe('KnownAmountDelta')
    })
  })

  it('carries a hand-picked range across onto the short month names', async () => {
    await renderPage('/dashboard?period=2026-09&basis=CustomRange&customStart=2026-05&customEnd=2026-08')

    await waitFor(() => {
      const search = new URLSearchParams(screen.getByTestId('search').textContent ?? '')
      expect(search.get('basis')).toBe('custom')
      expect(search.get('from')).toBe('2026-05')
      expect(search.get('to')).toBe('2026-08')
      expect(search.has('customStart')).toBe(false)
    })

    expect(dashboardApi.fetchDashboard).toHaveBeenCalledWith(
      '2026-09',
      expect.objectContaining({ basis: 'CustomRange', customStart: '2026-05', customEnd: '2026-08' }),
      expect.anything(),
    )
  })

  /** Nothing to rewrite means the URL is left exactly as it was found. */
  it('leaves a current link untouched', async () => {
    await renderPage('/dashboard?period=2026-09&basis=avg6')

    await waitFor(() => expect(screen.getByTestId('search').textContent).toBe('?period=2026-09&basis=avg6'))
  })
})
