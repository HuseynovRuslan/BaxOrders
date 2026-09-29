import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardAmount, DashboardLineTypeSplit, DashboardTrendPoint, LocationDashboardRow, ManagementDashboard } from '../api/dashboard'
import { partition, partitionMember } from '../test/dashboardFixtures'
import { readableText } from '../test/oldTerms'
import { ManagementDashboardPage } from './ManagementDashboardPage'

/**
 * A month with nothing in it but planned material: the monthly figure is the whole month, which is what
 * every fixture here describes. The other two sides hold no lines at all, so their amount is null rather
 * than a zero standing in for one.
 */
function monthlyOnly(current: DashboardAmount): DashboardLineTypeSplit {
  const none: DashboardAmount = {
    knownAmount: null,
    itemCount: 0,
    knownPriceItemCount: 0,
    missingPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    isComplete: true,
  }

  return { monthly: current, outsideMonthly: none, unclassified: none, unclassifiedItemCount: 0 }
}

/** Half a year of months, September last and highest, so the selected month is the one that stands out. */
function trend(): DashboardTrendPoint[] {
  return [
    ['2026-04-01', 20_000],
    ['2026-05-01', 24_000],
    ['2026-06-01', 22_000],
    ['2026-07-01', 30_000],
    ['2026-08-01', 29_921.78],
    ['2026-09-01', 70_855.25],
  ].map(([period, knownAmount]) => ({
    period: period as string,
    knownAmount: knownAmount as number,
    locationCount: 24,
    missingPriceItemCount: 0,
  }))
}


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
    responsibility: null,
  }
}

/**
 * The month's total, as the headline.
 *
 * The same figure also appears in the split under it — in a fixture whose month is all planned material the
 * monthly figure is the whole month — so the query says which of the two it wants.
 */
/**
 * The month's own figure, wherever the view puts it: «Sadə baxış» sets it as a paragraph, the Stitch KPI card
 * as a metric span beside its currency mark.
 */
function headlineAmount(): HTMLElement {
  const candidates = screen.getAllByText('71.210,29 ₼')
  return candidates.find((node) => node.tagName === 'P')
    ?? candidates.find((node) => node.className.includes('font-metric-val'))!
}

/** The objects table, by its own name: the page has other tables, and the first one is not always this one. */
function locationsTable(): HTMLElement {
  return screen.getByRole('table', { name: /obyektlər üzrə görünüşü/ })
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
      // EXPO Center's 180,04 ₼ is in the month and not in the comparison.
      comparedCurrent: amount({ knownAmount: 71030.25 }),
      baseline: amount({ knownAmount: 60583.47 }),
      knownAmountDelta: 10626.82,
      knownAmountPercentChange: 17.54,
      partition: partition({
        compared: Array.from({ length: 23 }, (_, index) => partitionMember(index + 1, `Obyekt ${index + 1}`)),
        noBaseline: [partitionMember(97, 'EXPO Center', { currentKnownAmount: 180.04 })],
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
      lineTypes: monthlyOnly(amount()),
      trend: trend(),
      categories: [],
    },
    filteredLocationCount: 1,
    attention: [{ reason: 'LargestIncrease', location: row(), rank: 1, alsoFirstIn: [] }],
    rows: { items: [row()], page: 1, pageSize: 100, totalCount: 1 },
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
  // Where each page was left is kept per history entry, and a memory router's first entry is always "default".
  window.sessionStorage.clear()
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

/**
 * Since the Stitch ribbon the comparison is one menu rather than five buttons — the bar carries three controls
 * and five buttons pushed the other two off it. The five choices, their order and their words are unchanged,
 * which is what these tests are about.
 */
async function chooseBasis(value: string) {
  await userEvent.selectOptions(screen.getByLabelText('Müqayisə'), value)
}

describe('the comparison choices', () => {
  it('offers all five, including the whole period and a hand-picked one', async () => {
    await renderPage()

    const menu = screen.getByLabelText('Müqayisə')
    // The whole-period choice carries the same words as the sentence it produces (5.3).
    expect(within(menu).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Keçən ay', 'Son 3 ayın ortalaması', 'Son 6 ayın ortalaması', 'Bütün dövrün ortalaması', 'Xüsusi seçim',
    ])
  })

  it('asks for the whole period by name', async () => {
    await renderPage()
    await chooseBasis('all')

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

    await chooseBasis('custom')

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
    await chooseBasis('custom')

    const start = await screen.findByLabelText('Başlanğıc ay')
    const options = within(start).getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['İyul 2026', 'Avqust 2026'])
    expect(options).not.toContain('Sentyabr 2026')
  })

  /** Picked the wrong way round: the end follows the start rather than producing an empty window. */
  it('never lets the range end before it starts', async () => {
    await renderPage()
    await chooseBasis('custom')
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
    await chooseBasis('custom')

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
    await chooseBasis('custom')
    await userEvent.selectOptions(await screen.findByLabelText('Başlanğıc ay'), '2026-07')
    await userEvent.selectOptions(screen.getByLabelText('Son ay'), '2026-08')
    await waitFor(() => expect(dashboardApi.fetchDashboard).toHaveBeenCalled())

    await chooseBasis('last')

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
    expect(screen.getByLabelText('Müqayisə')).toHaveValue('avg6')
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
    await chooseBasis('avg3')

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

  /** Task 1's "…görə" stays; Task 09 finishes the sentence with the direction of the cost (9.1). */
  it('says on each attention card which basis its figures use', async () => {
    await renderPage('/dashboard?period=2026-09&basis=avg3&view=etrafli')

    const cards = screen.getByRole('region', { name: 'Diqqət tələb edən obyektlər' })
    expect(cards).toHaveTextContent('Son 3 ayın ortalamasına görə')
  })
})

/**
 * Task 20 (brief acceptance 6): tabbing through the dashboard stops on each card's two actions and once per row, in the order
 * they are read. The one extra stop is the ⓘ on a percentage card, which explains and is not a link.
 */
describe('the keyboard through the cards and the table', () => {
  function bayil(): LocationDashboardRow {
    return {
      ...row(),
      locationId: 22,
      locationName: 'Bayıl yolu',
      currentRequestId: 155,
      current: amount({ knownAmount: 300, missingPriceItemCount: 0, isComplete: true }),
      baseline: amount({ knownAmount: 100, missingPriceItemCount: 0, isComplete: true }),
      knownAmountDelta: 200,
      knownAmountPercentChange: 200,
    }
  }

  beforeEach(() => {
    dashboardApi.fetchDashboard.mockImplementation((_period: string, query: { basis: string }) => {
      const data = dashboard()
      return Promise.resolve({
        ...data,
        summary: { ...data.summary, basis: query.basis },
        attention: [
          { reason: 'LargestIncrease', location: row(), rank: 1, alsoFirstIn: [] },
          { reason: 'StrongPercentageChange', location: bayil(), rank: 1, alsoFirstIn: [] },
        ],
        rows: { ...data.rows, items: [row(), bayil()], totalCount: 2 },
      })
    })
  })

  /** What a keyboard stop is, in words: its role and its name. */
  function describeStop(element: Element): string {
    const role = element.tagName === 'A' ? 'link' : element.tagName.toLowerCase()
    return `${role}: ${element.getAttribute('aria-label') ?? element.textContent}`
  }

  it('stops on each card two actions and once per row, in reading order', async () => {
    const user = userEvent.setup()
    await renderPage('/dashboard?period=2026-09&view=etrafli')
    const cards = screen.getByRole('region', { name: 'Diqqət tələb edən obyektlər' })
    const table = locationsTable()

    // Every stop on the page, once round; jsdom draws no layout, so the hidden phone list is scoped out by hand.
    const stops: Element[] = []
    for (let press = 0; press < 200; press++) {
      await user.tab()
      const focused = document.activeElement
      if (focused === null || focused === document.body || stops.includes(focused)) {
        break
      }
      stops.push(focused)
    }

    const inCards = stops.filter((stop) => cards.contains(stop)).map(describeStop)
    const inTable = stops.filter((stop) => table.contains(stop)).map(describeStop)
    // Since the Stitch cards, each one offers two things and so takes two stops: the object itself, and the
    // decomposition beside the page. Both are real destinations — this is not a card that can be tabbed into
    // and out of with nothing to do in between.
    expect(inCards).toEqual([
      'link: Fəvvarələr meydanı · Detallara bax',
      'button: Fəvvarələr meydanı — təfərrüat',
      'link: Bayıl yolu · Detallara bax',
      'button: Bayıl yolu — təfərrüat',
    ])
    expect(inTable).toEqual([
      'link: Fəvvarələr meydanı · Detallara bax',
      'link: Bayıl yolu · Detallara bax',
    ])
    // The cards come before the table.
    expect(stops.indexOf(stops.find((stop) => table.contains(stop))!))
      .toBeGreaterThan(stops.indexOf(stops.filter((stop) => cards.contains(stop)).at(-1)!))

    // A table row is still a surface: a click anywhere on it is handed to its one link. A Stitch card is not —
    // the approved design gives it an explicit «Detallara bax →», so the link is where the reader can see it.
    for (const stop of stops.filter((element) => table.contains(element) && element.tagName === 'A')) {
      expect(stop).toHaveAttribute('data-surface-link')
    }
  })

  it('gives the percentage card one link as well, carrying the basis', async () => {
    await renderPage('/dashboard?period=2026-09&basis=avg3&view=etrafli')

    const card = document.getElementById('attention-22')!
    expect(within(card).getAllByRole('link')).toHaveLength(1)
    expect(within(card).getByRole('link')).toHaveAttribute('href', '/orders/155?basis=avg3')
  })

  it('shows the figures it showed before, on the cards, in the table and in its footer', async () => {
    await renderPage('/dashboard?period=2026-09&view=etrafli')

    // The difference and the main cause are both +200,00 ₼ here: the deviation at the top, the cause below.
    const card = within(document.getElementById('attention-21')!)
    expect(card.getByText('1.000,00 ₼')).toBeInTheDocument()
    expect(card.getAllByText(/\+200,00 ₼/)).toHaveLength(2)
    expect(card.getByText('+25%')).toBeInTheDocument()
    // The colour is never the only carrier: the direction is said in words to a screen reader.
    expect(card.getByText(', xərc artıb')).toHaveClass('sr-only')

    const tableRow = within(document.getElementById('row-21')!)
    expect(tableRow.getByText('1.000,00 ₼')).toBeInTheDocument()
    expect(tableRow.getByText('800,00 ₼')).toBeInTheDocument()
    expect(tableRow.getAllByText('+200,00 ₼')).toHaveLength(2)
    expect(tableRow.getByText('+25%')).toBeInTheDocument()

    const footer = within(document.querySelector('tfoot')!)
    expect(footer.getByText('71.030,25 ₼')).toBeInTheDocument()
    expect(footer.getByText('60.583,47 ₼')).toBeInTheDocument()
    expect(footer.getByText('+10.626,82 ₼')).toBeInTheDocument()
    expect(footer.getByText('+17,54%')).toBeInTheDocument()
    expect(headlineAmount()).toBeInTheDocument()
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
        attention: [{ reason: 'LargestIncrease', location, rank: 1, alsoFirstIn: [] }],
        rows: { ...data.rows, items: [location] },
      })
    })

    await renderPage('/dashboard?period=2026-09&view=etrafli')
    // The Stitch card sets the product on its own line and its share beneath it, so the two are read together
    // but are separate elements; what matters is that both are the chosen basis's.
    const cards = () => within(screen.getByRole('region', { name: 'Diqqət tələb edən obyektlər' }))
    expect(cards().getByText(/Əlcək/)).toBeInTheDocument()
    expect(cards().getByText('artımların 75%-i')).toBeInTheDocument()

    await chooseBasis('avg3')

    await waitFor(() => expect(dashboardApi.fetchDashboard).toHaveBeenLastCalledWith(
      '2026-09',
      expect.objectContaining({ basis: 'Previous3MonthAverage' }),
      expect.anything(),
    ))
    await waitFor(() => expect(cards().getByText(/Zibil paketi/)).toBeInTheDocument())
    expect(cards().getByText('artımların 25%-i')).toBeInTheDocument()
    expect(cards().queryByText(/Əlcək/)).toBeNull()
  })
})

/**
 * Task 21, brief acceptance 4: on "Son 6 ayın ortalaması", every compared object whose baseline is partial says
 * how much of it there is — "Baza N/6 ay", its own N — on its card and on its row, table and phone alike. A
 * complete baseline, no baseline and no difference say nothing, and no percentage is called "təxmini" (21.3).
 */
describe('the baseline coverage on six months', () => {
  const partialTwo: LocationDashboardRow = {
    ...row(),
    expectedBaselinePeriodCount: 6,
    availableBaselinePeriodCount: 2,
    historyCoverage: 'Partial',
  }
  const partialFour: LocationDashboardRow = {
    ...row(),
    locationId: 22,
    locationName: 'Bayıl yolu',
    currentRequestId: 155,
    current: amount({ knownAmount: 300, missingPriceItemCount: 0, isComplete: true }),
    baseline: amount({ knownAmount: 100, missingPriceItemCount: 0, isComplete: true }),
    knownAmountDelta: 200,
    knownAmountPercentChange: 200,
    expectedBaselinePeriodCount: 6,
    availableBaselinePeriodCount: 4,
    historyCoverage: 'Partial',
  }
  const complete: LocationDashboardRow = {
    ...row(),
    locationId: 23,
    locationName: 'Nərimanov heykəli',
    currentRequestId: 156,
    knownAmountDelta: -200,
    knownAmountPercentChange: -16.67,
    baseline: amount({ knownAmount: 1200, missingPriceItemCount: 0, isComplete: true }),
    expectedBaselinePeriodCount: 6,
    availableBaselinePeriodCount: 6,
    historyCoverage: 'Complete',
  }
  const noBaseline: LocationDashboardRow = {
    ...row(),
    locationId: 97,
    locationName: 'EXPO Center',
    currentRequestId: 157,
    current: amount({ knownAmount: 180.04, missingPriceItemCount: 0, isComplete: true }),
    baseline: amount({ knownAmount: null, itemCount: 0, knownPriceItemCount: 0, missingPriceItemCount: 0 }),
    expectedBaselinePeriodCount: 6,
    availableBaselinePeriodCount: 0,
    historyCoverage: 'Unavailable',
    comparisonAvailability: 'NoBaselineHistory',
    comparisonAvailable: false,
    knownAmountDelta: null,
    knownAmountPercentChange: null,
    causes: [],
    primaryCause: null,
    primaryCauseAmount: null,
  }

  beforeEach(() => {
    dashboardApi.fetchDashboard.mockImplementation((_period: string, query: { basis: string }) => {
      const data = dashboard()
      return Promise.resolve({
        ...data,
        summary: { ...data.summary, basis: query.basis, locationsWithPartialHistory: 2 },
        attention: [
          { reason: 'LargestIncrease', location: partialTwo, rank: 1, alsoFirstIn: [] },
          { reason: 'LargestDecrease', location: complete, rank: 1, alsoFirstIn: [] },
          { reason: 'StrongPercentageChange', location: partialFour, rank: 1, alsoFirstIn: [] },
          { reason: 'NoComparisonHistory', location: noBaseline, rank: 1, alsoFirstIn: [] },
        ],
        rows: { ...data.rows, items: [partialTwo, partialFour, complete, noBaseline], totalCount: 4 },
      })
    })
  })

  /**
   * The object's table row, its phone row, and its card where it has one. Since the Stitch block only three
   * objects have cards — the three whose money moved most — and the rest are read in the table and in the
   * exceptions block, so a surface that is not on the page is not a surface this rule can be checked on.
   */
  function surfaces(locationId: number): HTMLElement[] {
    return [`attention-${locationId}`, `row-${locationId}`, `row-${locationId}-phone`]
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)
  }

  it('says "Baza N/6 ay" with each partial object\'s own N, on its card and on both its rows', async () => {
    await renderPage('/dashboard?period=2026-09&basis=avg6&view=etrafli')

    for (const [locationId, label] of [[21, 'Baza 2/6 ay'], [22, 'Baza 4/6 ay']] as const) {
      for (const surface of surfaces(locationId)) {
        const coverage = within(surface).getByText(label)
        expect(coverage.className, surface.id).toMatch(/text-slate-500|text-on-surface-variant/)
        expect(coverage.className).not.toMatch(/amber|red|emerald|error/)
      }
    }

    for (const locationId of [23, 97]) {
      for (const surface of surfaces(locationId)) {
        expect(surface.textContent, surface.id).not.toMatch(/Baza \d/)
      }
    }
  })

  it('leaves every percentage as it was and calls none of them "təxmini"', async () => {
    await renderPage('/dashboard?period=2026-09&basis=avg6&view=etrafli')

    expect(within(document.getElementById('attention-21')!).getByText('+25%')).toBeInTheDocument()
    expect(within(document.getElementById('attention-22')!).getByText('+200%')).toBeInTheDocument()
    expect(within(document.getElementById('row-22')!).getByText('+200%')).toBeInTheDocument()
    expect(within(document.getElementById('attention-23')!).getByText('−16,67%')).toBeInTheDocument()
    // Nowhere on the page: not in its text, and not in what it says to a screen reader or on hover.
    expect(readableText(document.body)).not.toMatch(/təxmini|təqribi/i)
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

  /** The old "Məlumat vəziyyəti" select's filters have no control now, but a saved link still means them. */
  it('still sends the filters of the select the chips replaced', async () => {
    await renderPage('/dashboard?period=2026-09&priceCoverage=Partial&hasCurrentRequest=false&historyCoverage=Unavailable')

    expect(dashboardApi.fetchDashboard).toHaveBeenLastCalledWith(
      '2026-09',
      expect.objectContaining({ priceCoverage: 'Partial', hasCurrentRequest: false, historyCoverage: 'Unavailable' }),
      expect.anything(),
    )
  })
})

// ---- Task 09 ------------------------------------------------------------------------------------------------

/** The last request's query, as the page sent it. */
function lastQuery(): Record<string, unknown> {
  return dashboardApi.fetchDashboard.mock.lastCall![1] as Record<string, unknown>
}

function urlParams(): URLSearchParams {
  return new URLSearchParams(screen.getByTestId('search').textContent ?? '')
}

/** Brief: "27 sətir bir səhifədədir; varsayılan sıra dəyişmənin böyüklüyünə görədir". */
describe('the table', () => {
  it('asks for every object on one page, largest change first, and writes nothing for that default', async () => {
    await renderPage()

    expect(dashboardApi.fetchDashboard).toHaveBeenCalledWith(
      '2026-09',
      expect.objectContaining({ pageSize: 100, sort: 'AbsoluteKnownAmountDelta', descending: true, page: 1 }),
      expect.anything(),
    )
    expect(urlParams().has('sort')).toBe(false)
    expect(screen.getByRole('combobox', { name: /^Sıralama/ })).toHaveValue('AbsoluteKnownAmountDelta')
  })

  it('offers three orders, the size of the change first', async () => {
    await renderPage()

    const options = within(screen.getByRole('combobox', { name: /^Sıralama/ })).getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(['Ən çox dəyişən', 'Bu ayın məbləği üzrə', 'Obyekt adı üzrə'])
  })

  it('sends the name when the name is chosen, and nothing in the URL when the default is chosen back', async () => {
    await renderPage()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /^Sıralama/ }), 'LocationName')
    await waitFor(() => expect(lastQuery()).toMatchObject({ sort: 'LocationName', descending: false }))
    expect(urlParams().get('sort')).toBe('LocationName')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /^Sıralama/ }), 'AbsoluteKnownAmountDelta')
    await waitFor(() => expect(lastQuery()).toMatchObject({ sort: 'AbsoluteKnownAmountDelta', descending: true }))
    expect(urlParams().has('sort')).toBe(false)
    expect(urlParams().has('descending')).toBe(false)
  })

  /** An older link's sort the page no longer offers opens on the default rather than on a hidden order. */
  it('treats a sort it does not offer as none', async () => {
    await renderPage('/dashboard?period=2026-09&sort=KnownAmountDelta&descending=true')

    expect(lastQuery()).toMatchObject({ sort: 'AbsoluteKnownAmountDelta', descending: true })
  })

  it('has no "Məlumat vəziyyəti" select any more: the chips do its work', async () => {
    await renderPage()

    expect(screen.queryByRole('combobox', { name: /Məlumat vəziyyəti/ })).toBeNull()
    expect(screen.queryByText('Məlumat vəziyyəti: hamısı')).toBeNull()
    // The month, the comparison and the order: nothing else is a select on the page.
    expect(screen.getAllByRole('combobox')).toHaveLength(3)
  })
})

/** Brief: "Hər çip klik olunur və cədvəli həmin obyektlərə süzür ... 'Qiymət yoxdur · N obyekt' həmin obyektləri göstərir". */
describe('the chips', () => {
  function chips() {
    return within(screen.getByText('Məlumatın əhatəsi').closest('section')!)
  }

  it('opens exactly the objects of the price chip, and says so in the URL', async () => {
    await renderPage('/dashboard?period=2026-09&group=NoBaseline')

    await userEvent.click(chips().getByRole('button', { name: 'Qiymət yoxdur · 10 obyekt' }))

    await waitFor(() => expect(lastQuery()).toMatchObject({ missingPrice: true }))
    expect(lastQuery().group).toBeUndefined()
    expect(urlParams().get('missingPrice')).toBe('true')
    expect(urlParams().has('group')).toBe(false)
    await waitFor(() =>
      expect(chips().getByRole('button', { name: 'Qiymət yoxdur · 10 obyekt' })).toHaveAttribute('aria-pressed', 'true'))
  })

  it('opens a group with its chip', async () => {
    await renderPage()

    await userEvent.click(chips().getByText('Bazası yoxdur').closest('button')!)

    await waitFor(() => expect(lastQuery()).toMatchObject({ group: 'NoBaseline' }))
    expect(lastQuery().missingPrice).toBeUndefined()
    expect(urlParams().get('group')).toBe('NoBaseline')
  })

  it('clears its filter when the chip that is on is clicked again', async () => {
    await renderPage('/dashboard?period=2026-09&group=NoBaseline&search=Obyekt')

    await userEvent.click(chips().getByText('Bazası yoxdur').closest('button')!)

    await waitFor(() => expect(urlParams().has('group')).toBe(false))
    // The search is the reader's own, and a chip leaves it alone.
    expect(urlParams().get('search')).toBe('Obyekt')
  })

  it('clears every filter, chip and search alike, with "Filtri təmizlə"', async () => {
    await renderPage('/dashboard?period=2026-09&group=NoBaseline&missingPrice=true&priceCoverage=Partial&historyCoverage=Partial&hasCurrentRequest=false&search=Obyekt')

    await userEvent.click(screen.getByRole('button', { name: 'Filtri təmizlə' }))

    await waitFor(() => expect(urlParams().toString()).toBe('period=2026-09'))
    expect(lastQuery()).toMatchObject({
      group: undefined,
      missingPrice: undefined,
      priceCoverage: undefined,
      historyCoverage: undefined,
      hasCurrentRequest: undefined,
      search: undefined,
    })
  })

  /**
   * Brief: "Qiymət xəbərdarlığından həmin obyektlərə birbaşa keçid".
   *
   * The Stitch headline is four figures and carries no links, so the route is the price chip — which sits
   * directly over the table it filters, and brings it into view. The capability is the same one; where it is
   * offered moved with the approved design.
   */
  it('opens the objects that owe a price, and brings the table into view', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      await renderPage('/dashboard?period=2026-09&view=etrafli')

      await userEvent.click(chips().getByRole('button', { name: 'Qiymət yoxdur · 10 obyekt' }))

      await waitFor(() => expect(lastQuery()).toMatchObject({ missingPrice: true }))
      await waitFor(() =>
        expect(chips().getByRole('button', { name: 'Qiymət yoxdur · 10 obyekt' })).toHaveAttribute('aria-pressed', 'true'))
    } finally {
      delete (Element.prototype as Partial<Element>).scrollIntoView
    }
  })
})

/** Brief acceptance 1: at 1366×768 the first card is on the first screen. The order on the page is what makes it so. */
describe('the first screen', () => {
  it('reads: the month, the cards, who was left out, then the chips over the table', async () => {
    await renderPage('/dashboard?period=2026-09&view=etrafli')

    const headline = headlineAmount()
    const cards = screen.getByRole('region', { name: 'Diqqət tələb edən obyektlər' })
    const exceptions = screen.getByText('Müqayisədən kənarda qalan obyektlər')
    const chips = screen.getByText('Məlumatın əhatəsi')
    const table = locationsTable()

    const inOrder = [headline, cards, exceptions, chips, table]
    for (let index = 1; index < inOrder.length; index++) {
      expect(inOrder[index - 1].compareDocumentPosition(inOrder[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  /**
   * Task 12, the decision it carries from Task 1b: "İstisnalar bloku mobildə başlığın dərhal altındadır". Only the
   * phone's layout moves it, by CSS order, so the page above — and Task 9's desktop order — stays as it is.
   */
  it('puts the exceptions directly under the headline on a phone, before the cards', async () => {
    await renderPage('/dashboard?period=2026-09&view=etrafli')

    const cards = screen.getByRole('region', { name: 'Diqqət tələb edən obyektlər' })
    const exceptions = screen.getByText('Müqayisədən kənarda qalan obyektlər').closest('section')!
    const cardsWrapper = cards.parentElement!
    const exceptionsWrapper = exceptions.parentElement!
    const container = cardsWrapper.parentElement!

    expect(exceptionsWrapper).toHaveClass('max-lg:order-1')
    expect(cardsWrapper).toHaveClass('max-lg:order-2')
    expect(exceptionsWrapper.parentElement).toBe(container)
    expect(container).toHaveClass('max-lg:flex', 'max-lg:flex-col')
    // The headline is first in the container, with no order of its own, so it stays first on a phone as well.
    expect(container.firstElementChild).toHaveTextContent('71.210,29 ₼')
    expect(container.firstElementChild!.className).not.toMatch(/order-/)
    // Nothing below 1024 pixels is reordered from 1024 up: every class that moves them is a phone's.
    for (const element of [container, cardsWrapper, exceptionsWrapper]) {
      for (const name of element.classList) {
        expect(name).toMatch(/^max-lg:/)
      }
    }

    // In the page itself the cards still come before the exceptions (Task 9).
    expect(cards.compareDocumentPosition(exceptions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('gathers the month, the lines and the comparison into one ribbon under the title', async () => {
    await renderPage()

    expect(screen.queryByText('Sifarişlərin obyektlər üzrə ümumi görünüşü')).toBeNull()

    // One bar carrying the whole question the screen answers: this month, these lines, against that.
    const ribbon = within(screen.getByRole('region', { name: 'Dövr və müqayisə' }))
    expect(ribbon.getByLabelText('Dövr')).toBeInTheDocument()
    expect(ribbon.getByLabelText('Müqayisə')).toBeInTheDocument()
    expect(ribbon.getByRole('group', { name: 'Sifariş növü' })).toBeInTheDocument()
  })
})

/**
 * Brief: "'Növbəti' basılanda səhifə ən yuxarı qalxır". A reload used to blank the page, and a page that goes
 * blank throws the reader to the top. The last answer stays on screen, marked busy, until the next one lands.
 */
describe('while the next answer loads', () => {
  it('keeps the figures and the table on screen, marked busy', async () => {
    await renderPage()

    let answer: (value: ManagementDashboard) => void = () => {}
    dashboardApi.fetchDashboard.mockImplementationOnce(() => new Promise<ManagementDashboard>((resolve) => { answer = resolve }))
    await userEvent.click(screen.getByRole('button', { name: 'Qiymət yoxdur · 10 obyekt' }))

    await waitFor(() => expect(lastQuery()).toMatchObject({ missingPrice: true }))
    expect(headlineAmount()).toBeInTheDocument()
    expect(locationsTable()).toHaveTextContent('Fəvvarələr meydanı')
    expect(headlineAmount().closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Panel yüklənir')).toBeNull()

    answer(dashboard())
    await waitFor(() => expect(headlineAmount().closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false'))
  })
})

/**
 * Brief acceptance 6: "Heydər Əliyev kartından sifarişə keçib qayıdanda həmin kartın yanına dönürəm". The order
 * page is a stub here; what is under test is that Back brings the card that was opened into view once the
 * figures are there, and that a fresh arrival does not.
 */
describe('coming back', () => {
  function OrderStub() {
    const navigate = useNavigate()
    return (
      <>
        <button type="button" onClick={() => navigate(-1)}>Geri</button>
        <Link to="/dashboard?period=2026-09">Panelə</Link>
      </>
    )
  }

  function renderWithOrder() {
    render(
      <MemoryRouter initialEntries={['/dashboard?period=2026-09&view=etrafli']}>
        <Search />
        <Routes>
          <Route path="/dashboard" element={<ManagementDashboardPage />} />
          <Route path="/orders/:id" element={<OrderStub />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  let scrollIntoView = vi.fn()
  beforeEach(() => {
    scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
  })
  afterEach(() => {
    delete (Element.prototype as Partial<Element>).scrollIntoView
  })

  async function openTheCard() {
    const cards = within(await screen.findByRole('region', { name: 'Diqqət tələb edən obyektlər' }))
    await userEvent.click(cards.getByRole('link', { name: /Detallara bax/ }))
    await screen.findByRole('button', { name: 'Geri' })
  }

  it('returns to the card that was opened, once the figures are there', async () => {
    renderWithOrder()
    await openTheCard()

    await userEvent.click(screen.getByRole('button', { name: 'Geri' }))

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' }))
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute('id', 'attention-21')
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    // And Back brought the comparison back with it (Task 1).
    expect(urlParams().get('period')).toBe('2026-09')
  })

  /**
   * Task 20 (20.1, 20.2): a card or a row opened from its body, not its link, is still the one Back returns to —
   * the surface hands the click to its link, so the page's memory sees the link it always saw.
   */
  it('returns to a card opened by its link', async () => {
    renderWithOrder()
    const cards = within(await screen.findByRole('region', { name: 'Diqqət tələb edən obyektlər' }))
    await userEvent.click(cards.getByRole('link', { name: /Fəvvarələr meydanı/ }))
    await screen.findByRole('button', { name: 'Geri' })

    await userEvent.click(screen.getByRole('button', { name: 'Geri' }))

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' }))
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute('id', 'attention-21')
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('returns to a table row opened by a click on its figures', async () => {
    renderWithOrder()
    await screen.findByRole('region', { name: 'Diqqət tələb edən obyektlər' })
    await userEvent.click(within(locationsTable().querySelector('tbody')!).getByText('800,00 ₼'))
    await screen.findByRole('button', { name: 'Geri' })

    await userEvent.click(screen.getByRole('button', { name: 'Geri' }))

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' }))
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute('id', 'row-21')
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('restores nothing on a fresh arrival, even with a place remembered for another visit', async () => {
    renderWithOrder()
    await openTheCard()

    // A link straight to the panel, which is a fresh arrival — and at whatever view the link carries, so the
    // wait is for the object itself rather than for anything one view has and the other does not.
    await userEvent.click(screen.getByRole('link', { name: 'Panelə' }))
    await screen.findAllByText('Fəvvarələr meydanı')

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('keeps the browser from restoring on its own while the page is shown, and gives it back after', async () => {
    const before = window.history.scrollRestoration
    renderWithOrder()
    await screen.findByRole('region', { name: 'Diqqət tələb edən obyektlər' })

    expect(window.history.scrollRestoration).toBe('manual')

    await openTheCard()
    expect(window.history.scrollRestoration).toBe(before)
  })
})

/**
 * The scope decides what every number on the screen means, so it belongs in the URL beside the month: a link
 * has to carry the question as well as the answer.
 */
describe('the order scope', () => {
  it('asks about the month’s planned material until the reader says otherwise', async () => {
    await renderPage()


    expect(screen.getByRole('button', { name: 'Aylıq sifarişlər' })).toHaveAttribute('aria-pressed', 'true')
    const [, query] = dashboardApi.fetchDashboard.mock.calls.at(-1)!
    expect(query.scope).toBeUndefined()
  })

  it('asks the server about the scope the reader picked, and remembers it in the address', async () => {
    await renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Aylıqdan kənar' }))

    await vi.waitFor(() => {
      const [, query] = dashboardApi.fetchDashboard.mock.calls.at(-1)!
      expect(query.scope).toBe('OutsideMonthly')
    })
    expect(screen.getByTestId('search')).toHaveTextContent('scope=OutsideMonthly')
  })

  it('opens on the scope a pasted link carries', async () => {
    await renderPage('/dashboard?period=2026-09&scope=All')

    expect(screen.getByRole('button', { name: 'Hamısı' })).toHaveAttribute('aria-pressed', 'true')
    const [, query] = dashboardApi.fetchDashboard.mock.calls.at(-1)!
    expect(query.scope).toBe('All')
  })
})

/**
 * Two depths of one screen, not two screens. The simple view answers what the page is opened with; the
 * detailed one keeps everything it has ever had.
 */
describe('how deep the reader wants to go', () => {
  it('opens simple, with the month in three numbers', async () => {
    await renderPage()

    expect(screen.getByRole('button', { name: 'Sadə baxış' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('group', { name: 'Ayın xülasəsi' })).toBeInTheDocument()
  })

  it('keeps the old headline behind «Ətraflı baxış», and remembers the choice in the address', async () => {
    await renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Ətraflı baxış' }))

    expect(screen.queryByRole('group', { name: 'Ayın xülasəsi' })).not.toBeInTheDocument()
    expect(screen.getByTestId('search')).toHaveTextContent('view=etrafli')
  })

  it('opens on the depth a pasted link carries', async () => {
    await renderPage('/dashboard?period=2026-09&view=etrafli')

    expect(screen.getByRole('button', { name: 'Ətraflı baxış' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('group', { name: 'Ayın xülasəsi' })).not.toBeInTheDocument()
  })
})

/**
 * Brief acceptance: LOOK → UNDERSTAND → CLICK FOR DETAIL. The third step is a drawer, so the reader who wants
 * to know how a line was arrived at never loses the screen they were reading.
 */
describe('the detail beside the page', () => {
  it('opens the decomposition of the object from the line that raised the question', async () => {
    await renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Fəvvarələr meydanı — təfərrüat' }))

    const drawer = await screen.findByRole('dialog')
    expect(within(drawer).getByRole('region', { name: 'Rəqəmlər' })).toHaveTextContent('1.000,00 ₼')
    expect(within(drawer).getByRole('region', { name: 'Niyə dəyişib?' })).toHaveTextContent('Miqdar artımı')
  })

  it('leaves the screen it was opened from where it was', async () => {
    await renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Fəvvarələr meydanı — təfərrüat' }))
    await screen.findByRole('dialog')

    // The list and the table are still there behind it: this is a detail, not a page.
    expect(screen.getByRole('region', { name: 'Nə dəyişdi?' })).toBeInTheDocument()
    expect(locationsTable()).toBeInTheDocument()
  })

  it('closes and gives the page back', async () => {
    await renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Fəvvarələr meydanı — təfərrüat' }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Bağla' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
