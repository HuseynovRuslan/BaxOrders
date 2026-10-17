import { StrictMode } from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import type { AnalyticsScope } from '../api/dashboard'
import type { MonthlyReport, MonthlyReportCell, MonthlyReportMonth, MonthlyReportRow } from '../api/reports'
import { costDirectionBarClass } from '../components/analytics/format'
import { historicalImportLabel } from '../components/workflow/labels'
import { findOldTerms } from '../test/oldTerms'
import { MonthlyReportPage } from './MonthlyReportPage'

/**
 * A year of ordering in one place. The whole point of the screen is that the empty cells can be trusted as
 * much as the full ones: a month nobody ordered in has to stay visibly different from a month that cost
 * nothing, on a grid where a reader is scanning twelve columns at a time.
 */
const reportsApi = vi.hoisted(() => ({ fetchMonthlyReport: vi.fn() }))

vi.mock('../api/reports', async () => {
  const actual = await vi.importActual<typeof import('../api/reports')>('../api/reports')
  return { ...actual, ...reportsApi }
})

function cell(month: number, overrides: Partial<MonthlyReportCell> = {}): MonthlyReportCell {
  return {
    month,
    period: `2026-${String(month).padStart(2, '0')}-01`,
    orderRequestId: 100 + month,
    version: 1,
    status: 'Draft',
    knownAmount: 1000 + month,
    itemCount: 10,
    missingPriceItemCount: 0,
    amountIsComplete: true,
    previousMonthKnownAmount: 999 + month,
    deltaAmount: 1,
    deltaPercent: 0.1,
    recentAverageKnownAmount: null,
    recentAveragePercent: null,
    isUnusual: false,
    isHistoricalImport: false,
    monthlyKnownAmount: null,
    monthlyItemCount: 0,
    outsideMonthlyKnownAmount: null,
    outsideMonthlyItemCount: 0,
    unclassifiedKnownAmount: null,
    unclassifiedItemCount: 0,
    ...overrides,
  }
}

/** A month the location has no request for: every figure absent, because none of them exists. */
function noRequest(month: number): MonthlyReportCell {
  return cell(month, {
    orderRequestId: null,
    version: null,
    status: null,
    knownAmount: null,
    itemCount: 0,
    previousMonthKnownAmount: null,
    deltaAmount: null,
    deltaPercent: null,
  })
}

function row(overrides: Partial<MonthlyReportRow> = {}): MonthlyReportRow {
  const months = overrides.months ?? Array.from({ length: 12 }, (_, index) => cell(index + 1))
  return {
    locationId: 21,
    locationCode: 'LOC-000021',
    locationName: 'Fəvvarələr meydanı',
    isActive: true,
    requestCount: months.filter((month) => month.orderRequestId !== null).length,
    knownAmount: 12066,
    missingPriceItemCount: 0,
    monthsWithoutRequest: months.filter((month) => month.orderRequestId === null).length,
    hasAnyRequest: true,
    monthlyKnownAmount: null,
    monthlyItemCount: 0,
    outsideMonthlyKnownAmount: null,
    outsideMonthlyItemCount: 0,
    unclassifiedKnownAmount: null,
    unclassifiedItemCount: 0,
    ...overrides,
    months,
  }
}

/** The company's month, as the totals row reads it. */
function companyMonth(month: number, overrides: Partial<MonthlyReportMonth> = {}): MonthlyReportMonth {
  return {
    month,
    period: `2026-${String(month).padStart(2, '0')}-01`,
    locationsWithRequest: 1,
    knownAmount: 1000,
    missingPriceItemCount: 0,
    amountIsComplete: true,
    monthlyKnownAmount: null,
    monthlyItemCount: 0,
    outsideMonthlyKnownAmount: null,
    outsideMonthlyItemCount: 0,
    unclassifiedKnownAmount: null,
    unclassifiedItemCount: 0,
    ...overrides,
  }
}

function report(overrides: Partial<MonthlyReport> = {}): MonthlyReport {
  return {
    year: 2026,
    availableYears: [2026, 2025],
    rows: [row()],
    months: Array.from({ length: 12 }, (_, index) => companyMonth(index + 1)),
    locationCount: 26,
    filteredLocationCount: 26,
    requestCount: 167,
    knownAmount: 431670.91,
    missingPriceItemCount: 0,
    amountIsComplete: true,
    monthlyKnownAmount: null,
    monthlyItemCount: 0,
    outsideMonthlyKnownAmount: null,
    outsideMonthlyItemCount: 0,
    unclassifiedKnownAmount: null,
    unclassifiedItemCount: 0,
    ...overrides,
  }
}

/**
 * A mock that behaves like `fetch` does: an aborted request <b>rejects</b>, it does not quietly deliver its
 * answer anyway. Without that, a page that abandons its only request still looks healthy under test and hangs
 * in the browser — which is exactly how this page shipped broken once.
 */
function respondWith(data: MonthlyReport) {
  return (_query: unknown, signal?: AbortSignal) =>
    new Promise<MonthlyReport>((resolve, reject) => {
      const abort = () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
      if (signal?.aborted) {
        abort()
        return
      }

      signal?.addEventListener('abort', abort)
      queueMicrotask(() => resolve(data))
    })
}

/** Convenience for the cases that only care about what comes back. */
function serving(data: MonthlyReport) {
  reportsApi.fetchMonthlyReport.mockImplementation(respondWith(data))
}

/** What the page asks the server: the query it passes to `fetchMonthlyReport`. */
interface Query {
  year?: number
  search?: string
  scope?: AnalyticsScope
}

/**
 * Answers as the server does, by the scope asked about: the `scope=All` question with `all`, every other with `main`
 * (UI V2, 03 §3.3: «Ümumi faktiki xərc» is the «All» answer's own figure).
 */
function servingByScope({ main, all }: { main: MonthlyReport; all: MonthlyReport }) {
  reportsApi.fetchMonthlyReport.mockImplementation((query: Query, signal?: AbortSignal) =>
    respondWith(query.scope === 'All' ? all : main)(query, signal))
}

/** Every query the page has asked, in order. */
function queries(): Query[] {
  return reportsApi.fetchMonthlyReport.mock.calls.map(([query]) => query as Query)
}

/**
 * Each main question comes after its own «All» question, asked first and without the search (03 §3.3): the calls are
 * pairs, `all` then `main`, as many times as the page asked.
 */
function expectPairs(asked: Query[], all: Query, main: Query) {
  expect(asked.length).toBeGreaterThan(0)
  expect(asked.length % 2).toBe(0)
  asked.forEach((query, index) => expect(query).toEqual(index % 2 === 0 ? all : main))
}

/** A request the test answers by hand, to see the page while it waits. */
interface Asked {
  query: Query
  signal?: AbortSignal
  settled: boolean
  resolve: (data: MonthlyReport) => void
  reject: (reason: unknown) => void
}

/**
 * Nothing is answered until the test says so; an aborted request still rejects, as `fetch` does. Returns the list the
 * requests are written into as they are made.
 */
function answeringByHand(): Asked[] {
  const asked: Asked[] = []
  reportsApi.fetchMonthlyReport.mockImplementation((query: Query, signal?: AbortSignal) =>
    new Promise<MonthlyReport>((resolve, reject) => {
      const abort = () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
      if (signal?.aborted) {
        abort()
        return
      }

      signal?.addEventListener('abort', abort)
      asked.push({ query, signal, settled: false, resolve, reject })
    }))
  return asked
}

/** The latest request still waiting for its answer whose query matches. */
function open(asked: Asked[], match: (query: Query) => boolean): Asked {
  const found = [...asked].reverse().find((item) => !item.settled && !item.signal?.aborted && match(item.query))
  if (found === undefined) {
    throw new Error('No request like that is waiting')
  }

  return found
}

async function answer(item: Asked, data: MonthlyReport) {
  item.settled = true
  await act(async () => item.resolve(data))
}

async function fail(item: Asked, reason: unknown) {
  item.settled = true
  await act(async () => item.reject(reason))
}

const isAll = (query: Query) => query.scope === 'All'
const isMain = (scope: AnalyticsScope) => (query: Query) => query.scope === scope

beforeEach(() => {
  reportsApi.fetchMonthlyReport.mockReset()
  serving(report())
})

afterEach(() => vi.clearAllMocks())

/**
 * Rendered the way the application renders it — inside StrictMode, whose double-invoked effects are the real
 * conditions this page runs under. A fetch guarded by a ref survives a plain render and deadlocks here.
 */
async function renderPage(url = '/dashboard/monthly') {
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[url]}>
        <MonthlyReportPage />
      </MemoryRouter>
    </StrictMode>,
  )
  await screen.findByRole('region', { name: 'İlin xülasəsi' })
}

/**
 * The report's table — the real one, named by the heading above it. UI V2 (03 §4.3) draws a copy of its header for the
 * floating header, an unnamed table hidden from screen readers, ahead of it in the page; this never returns that.
 */
function table(): HTMLTableElement {
  return document.querySelector<HTMLTableElement>('table[aria-labelledby]')!
}

/**
 * The elements in `scope` whose class names contain `fragment`. jsdom's selector engine cannot match a `[` inside an
 * attribute selector's value: `[class*="min-w-["]` finds nothing there whatever the page holds, so it is filtered here.
 */
function withClass(scope: ParentNode, fragment: string): Element[] {
  return [...scope.querySelectorAll('[class]')].filter((element) => (element.getAttribute('class') ?? '').includes(fragment))
}

/** The year's figures at the top of the page. */
function summary(): HTMLElement {
  return screen.getByRole('region', { name: 'İlin xülasəsi' })
}

/** One figure of the year summary — its label and its value — read by the label. */
function figure(label: string): HTMLElement {
  return within(summary()).getByText(label).closest('div') as HTMLElement
}

/** The money figures of the year summary, in the order they are read. */
function figureAmounts(): string[] {
  return within(summary()).getAllByText(/₼$/).map((element) => (element.textContent ?? '').replace(/\s/g, ' '))
}

function searchField(): HTMLInputElement {
  return screen.getByRole('searchbox', { name: 'Obyekt axtar' })
}

/**
 * The page with the address it is on in sight, an earlier page behind it in the history, and the browser's Back as a
 * button: for what a control writes into the address, and whether it pushed an entry of its own.
 */
function renderAt(url: string) {
  function Address() {
    const { pathname, search } = useLocation()
    return <p data-testid="current-address">{pathname + search}</p>
  }

  function Back() {
    const navigate = useNavigate()
    return <button type="button" onClick={() => navigate(-1)}>Brauzerdə geri</button>
  }

  return render(
    <StrictMode>
      <MemoryRouter initialEntries={['/elsewhere', url]}>
        <Address />
        <Back />
        <Routes>
          <Route path="/dashboard/monthly" element={<MonthlyReportPage />} />
          <Route path="/elsewhere" element={<p>Əvvəlki səhifə</p>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  )
}

function currentAddress(): string {
  return screen.getByTestId('current-address').textContent ?? ''
}

describe('the grid', () => {
  it('gives every location a row and every month a column', async () => {
    await renderPage()

    expect(within(table()).getByText('Fəvvarələr meydanı')).toBeInTheDocument()
    for (const month of ['Yan', 'Fev', 'Dek']) {
      expect(within(table()).getByRole('columnheader', { name: month })).toBeInTheDocument()
    }
  })

  it('opens the order behind a month when the cell is clicked', async () => {
    await renderPage()

    const cells = within(table()).getAllByRole('link', { name: /Fəvvarələr meydanı · Yan/ })
    // Task 24: marked as opened from the report, so the order offers the way back to it.
    expect(cells[0]).toHaveAttribute('href', '/orders/101?back=monthly')
  })

  it('never lets a month with no request read as a month that cost nothing', async () => {
    serving(report({
      rows: [row({
        months: [noRequest(1), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))],
      })],
    }))
    await renderPage()

    // No amount, no link, and above all no zero.
    expect(within(table()).queryByRole('link', { name: /· Yan/ })).toBeNull()
    expect(within(table()).queryByText('0,00 ₼')).toBeNull()
  })

  it('marks unpriced lines compactly, beside the percentage, and still says what the mark means', async () => {
    const unpricedJanuary = () => report({
      rows: [row({
        months: [
          cell(1, { missingPriceItemCount: 2, amountIsComplete: false, deltaPercent: 12.5 }),
          ...Array.from({ length: 11 }, (_, index) => cell(index + 2)),
        ],
      })],
    })

    // «Standart» (UI V2, D-50 №6): the percentage is in the cell, beside the unpriced lines.
    serving(unpricedJanuary())
    const standard = renderAt('/dashboard/monthly?view=standart')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })

    // A sentence twelve times to a row would drown the money, so the cell shows a count and explains itself.
    const link = within(table()).getByRole('link', { name: /Yanvar 2026/ })
    expect(within(link).getByText('⚠ 2')).toBeInTheDocument()
    // The partial figure still moved, and the reader needs both (brief: "⚠ və faiz eyni hücrədə").
    expect(within(link).getByText('+12,5%')).toBeInTheDocument()
    expect(link).toHaveAccessibleName(expect.stringContaining('2 sətirdə qiymət yoxdur') as unknown as string)
    expect(link).toHaveAttribute('title', expect.stringContaining('2 sətirdə qiymət yoxdur') as unknown as string)
    standard.unmount()

    // «Yığcam», the default: the count stays and says the same; the percentage is left to the name and the tooltip.
    serving(unpricedJanuary())
    await renderPage()
    const compact = within(table()).getByRole('link', { name: /Yanvar 2026/ })
    expect(within(compact).getByText('⚠ 2')).toBeInTheDocument()
    expect(within(compact).queryByText('+12,5%')).toBeNull()
    expect(compact).toHaveAccessibleName(expect.stringContaining('2 sətirdə qiymət yoxdur') as unknown as string)
    expect(compact).toHaveAttribute('title', expect.stringContaining('2 sətirdə qiymət yoxdur') as unknown as string)
  })

  it('keeps the location column pinned while the months scroll', async () => {
    await renderPage()

    const header = within(table()).getByRole('columnheader', { name: 'Obyekt' })
    expect(header.className).toContain('sticky')
    // UI V2: pinned to the box's left edge.
    expect(header.className).toContain('left-0')
  })
})

describe('the controls', () => {
  it('offers the years the data actually has', async () => {
    await renderPage()

    const year = screen.getByRole('combobox', { name: /İl/ })
    expect(within(year).getByRole('option', { name: '2026' })).toBeInTheDocument()
    expect(within(year).getByRole('option', { name: '2025' })).toBeInTheDocument()
  })

  it('asks the server for the year that was chosen', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /İl/ }), '2025')

    expect(reportsApi.fetchMonthlyReport).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2025 }),
      expect.anything(),
    )
  })

  it('reads its state from the URL, so a year can be sent as a link', async () => {
    await renderPage('/dashboard/monthly?year=2025&search=meydan')

    expect(reportsApi.fetchMonthlyReport).toHaveBeenCalledWith(
      { year: 2025, search: 'meydan', scope: 'Monthly' },
      expect.anything(),
    )
  })

  it('says how much of the catalogue a search left, without shrinking the totals', async () => {
    serving(report({ filteredLocationCount: 1, locationCount: 26 }))
    await renderPage('/dashboard/monthly?search=meydan')

    // UI V2 (03 §6.6, DK-03): one live region under the filters, in neither the table's part nor the cards' part, so
    // it is seen and heard at every width.
    const count = screen.getByText('1 / 26 obyekt')
    expect(count).toHaveAttribute('role', 'status')
    expect(count.closest('.lg\\:block')).toBeNull()
    expect(count.closest('.lg\\:hidden')).toBeNull()
    expect(searchField().compareDocumentPosition(count) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // The year's figures are every object's, and say so while a search is on (D-51, S-1).
    const summary = screen.getByRole('region', { name: 'İlin xülasəsi' })
    expect(within(summary).getByText('26')).toBeInTheDocument()
    expect(within(summary).getByText('Bütün obyektlər üzrə — axtarış bu rəqəmləri dəyişmir.')).toBeInTheDocument()
    expect(summary).not.toContainElement(count)
  })
})

/**
 * The phone (Task 12). Brief: "Mobil aylıq hesabatda obyektin il üzrə gedişatı görünür". The narrow layout used to
 * show the objects of one month chosen with an "Ay" select, and an object's year could not be seen at all; now it
 * is a card per object with all twelve months. jsdom applies no CSS, so these are scoped to the part that shows
 * below 1024 pixels.
 */
describe('the phone', () => {
  afterEach(() => vi.useRealTimers())

  /** The part of the page that shows below 1024 pixels: the legend, the objects' cards, the company's months. */
  function phoneView(): HTMLElement {
    return screen.getByRole('list', { name: 'Kartlardakı işarələr' }).parentElement!
  }

  function card(locationName: string): HTMLElement {
    return within(phoneView()).getByRole('link', { name: locationName }).closest('li')!
  }

  /** The twelve months under a card's strip, a quarter to a row. */
  function monthGrid(scope: HTMLElement): HTMLElement[] {
    return [...scope.querySelector('ul.grid-cols-3')!.children] as HTMLElement[]
  }

  function strip(scope: HTMLElement): HTMLElement[] {
    return [...scope.querySelector('.grid-cols-12')!.children] as HTMLElement[]
  }

  const threeObjects = () => report({
    rows: [
      row({ locationId: 1, locationName: 'Bayıl yolu' }),
      row({ locationId: 21, locationName: 'Fəvvarələr meydanı' }),
      row({ locationId: 3, locationName: 'Heydər Əliyev' }),
    ],
  })

  it('shows every month at once, so there is no month to choose', async () => {
    // An old link that chose a month still opens the report.
    await renderPage('/dashboard/monthly?month=3')

    expect(screen.queryByRole('combobox', { name: /Ay/ })).toBeNull()
    // UI V2 (03 §6.4): the year, and — below lg, where there is no table header to press — the order. Nothing else.
    expect(screen.getAllByRole('combobox')).toEqual([
      screen.getByRole('combobox', { name: 'İl' }),
      screen.getByRole('combobox', { name: 'Sıralama' }),
    ])
    expect(screen.getByRole('combobox', { name: 'Sıralama' }).closest('.lg\\:hidden')).not.toBeNull()
    expect(phoneView()).toHaveClass('lg:hidden')
    const months = card('Fəvvarələr meydanı').querySelector('ul.grid-cols-3')!
    expect(monthGrid(card('Fəvvarələr meydanı'))).toHaveLength(12)
    // Three to a row on a phone, six from 640 pixels.
    expect(months).toHaveClass('grid-cols-3', 'sm:grid-cols-6')
  })

  it('gives every object a card, in the report’s order, with its twelve months January first', async () => {
    serving(threeObjects())
    await renderPage()

    const cards = [...phoneView().children[1].children] as HTMLElement[]
    expect(cards.map((item) => within(item).getAllByRole('link')[0].textContent)).toEqual([
      'Bayıl yolu', 'Fəvvarələr meydanı', 'Heydər Əliyev',
    ])

    for (const item of cards) {
      expect(monthGrid(item).map((month) => month.firstElementChild!.textContent)).toEqual([
        'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek',
      ])
    }

    // The name opens the object, as the table's does.
    expect(within(card('Bayıl yolu')).getByRole('link', { name: 'Bayıl yolu' })).toHaveAttribute('href', '/locations/1')
  })

  it('opens a month’s order without a basis, and says what the table’s cell says', async () => {
    await renderPage()

    const january = within(card('Fəvvarələr meydanı')).getByRole('link', { name: /Yanvar 2026/ })
    expect(january).toHaveAttribute('href', '/orders/101?back=monthly')
    expect(january.getAttribute('href')).not.toContain('basis')
    const amount = within(january).getByText('1.001,00 ₼')
    // Kept to its ₼ by a no-break space (Task 5), and on one line, in the product's tabular figures (UI V2: `.tabular`).
    expect(amount.textContent).toBe(`1.001,00${nbsp}₼`)
    expect(amount.className).toContain('whitespace-nowrap')
    expect(amount.className.split(' ')).toContain('tabular')

    // One definition of what a month says: the same accessible name as the table's cell.
    const inTable = within(table()).getByRole('link', { name: /Yanvar 2026/ })
    expect(january.getAttribute('aria-label')).toBe(inTable.getAttribute('aria-label'))
    expect(january.getAttribute('aria-label')).toMatch(/^Fəvvarələr meydanı · Yanvar 2026 · /)
  })

  it('tints an unusual month by the direction its cost moved, both ways (8.2, 9.1)', async () => {
    serving(report({
      rows: [row({
        months: [
          ...Array.from({ length: 5 }, (_, index) => cell(index + 1)),
          cell(6, { knownAmount: 36010.19, isUnusual: true, recentAverageKnownAmount: 14458.58, recentAveragePercent: 149.06 }),
          cell(7, { knownAmount: 400, isUnusual: true, recentAverageKnownAmount: 1000, recentAveragePercent: -60 }),
          ...Array.from({ length: 5 }, (_, index) => cell(index + 8)),
        ],
      })],
    }))
    await renderPage()

    const phone = card('Fəvvarələr meydanı')
    const june = within(phone).getByRole('link', { name: /İyun 2026/ })
    expect(june.className).toContain('bg-red-50')
    // UI V2 (AC-04): the direction has a shape of its own as well as the colour — ▲ up in red — and the amount keeps
    // its ordinary weight, so neighbouring sums keep their gap (DK-07).
    expect(within(june).getByText('▲')).toHaveClass('text-red-700')
    expect(within(june).queryByText('▼')).toBeNull()
    expect(within(june).getByText('36.010,19 ₼').className).not.toContain('font-semibold')

    const july = within(phone).getByRole('link', { name: /İyul 2026/ })
    expect(july.className).toContain('bg-emerald-50')
    expect(within(july).getByText('▼')).toHaveClass('text-emerald-700')
    expect(within(july).queryByText('▲')).toBeNull()

    const august = within(phone).getByRole('link', { name: /Avqust 2026/ })
    expect(august.className).not.toMatch(/bg-red-50|bg-emerald-50/)
    expect(within(august).queryByText(/[▲▼]/)).toBeNull()

    // The same direction on the strip; the ordinary months stay neutral, in the shared helper's neutral.
    const bars = strip(phone)
    expect(bars[5]).toHaveClass('bg-red-500')
    expect(bars[6]).toHaveClass('bg-emerald-500')
    expect(bars[7]).toHaveClass('bg-slate-300')
    expect(bars[7]).toHaveClass(costDirectionBarClass(0))
  })

  it('marks the lines nobody priced, beside the change', async () => {
    const unpricedJanuary = () => report({
      rows: [row({
        months: [
          cell(1, { missingPriceItemCount: 2, amountIsComplete: false, deltaPercent: 12.5 }),
          ...Array.from({ length: 11 }, (_, index) => cell(index + 2)),
        ],
      })],
    })

    // «Standart» (UI V2, D-50 №6): the count and the change side by side, the change in the cost colour.
    serving(unpricedJanuary())
    const standard = renderAt('/dashboard/monthly?view=standart')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })
    const january = within(card('Fəvvarələr meydanı')).getByRole('link', { name: /Yanvar 2026/ })
    expect(within(january).getByText('⚠ 2')).toBeInTheDocument()
    expect(within(january).getByText('+12,5%')).toHaveClass('text-red-700')
    expect(january).toHaveAccessibleName(expect.stringContaining('2 sətirdə qiymət yoxdur') as unknown as string)
    standard.unmount()

    // «Yığcam», the default: the count, and no percentage in the cell; its name still says both.
    serving(unpricedJanuary())
    await renderPage()
    const compact = within(card('Fəvvarələr meydanı')).getByRole('link', { name: /Yanvar 2026/ })
    expect(within(compact).getByText('⚠ 2')).toBeInTheDocument()
    expect(within(compact).queryByText('+12,5%')).toBeNull()
    expect(compact).toHaveAccessibleName(expect.stringContaining('2 sətirdə qiymət yoxdur') as unknown as string)
    expect(compact).toHaveAccessibleName(expect.stringContaining('+12,5%') as unknown as string)
  })

  it('draws a past month with no order as a dash, never a zero', async () => {
    serving(report({
      rows: [row({ months: [noRequest(1), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))] })],
    }))
    await renderPage()

    const phone = card('Fəvvarələr meydanı')
    const january = within(phone).getByLabelText('Fəvvarələr meydanı · Yanvar 2026 · sifariş yoxdur')
    expect(january).toHaveTextContent('—')
    // UI V2 (AC-17): the dash in the product's own secondary text, which reads at 9:1 rather than 1,5:1.
    expect(january).toHaveClass('text-on-surface-variant')
    expect(within(phone).queryByRole('link', { name: /Yanvar 2026/ })).toBeNull()
    expect(within(phone).queryByText('0,00 ₼')).toBeNull()
    // And its slot on the strip is empty.
    expect(strip(phone)[0].getAttribute('style')).toBeNull()
  })

  it('says the year’s total, and draws the year as twelve bars against its largest month', async () => {
    await renderPage()

    const phone = card('Fəvvarələr meydanı')
    expect(within(phone).getByText('İl cəmi')).toBeInTheDocument()
    expect(within(phone).getByText('12.066,00 ₼')).toHaveClass('whitespace-nowrap')

    const bars = strip(phone)
    expect(bars).toHaveLength(12)
    expect(bars[0].parentElement).toHaveAttribute('aria-hidden', 'true')
    // December, 1.012,00 ₼, is the largest; January, 1.001,00 ₼, is drawn against it.
    expect(bars[11].style.height).toBe('100%')
    expect(bars[0].style.height).toBe(`${(1001 / 1012) * 100}%`)
    expect(bars[0].style.minHeight).toBe('2px')
  })

  it('says an object that has never ordered in one line, with no months', async () => {
    serving(report({
      rows: [
        row(),
        row({
          locationId: 27,
          locationName: 'Çadır',
          knownAmount: null,
          hasAnyRequest: false,
          months: Array.from({ length: 12 }, (_, index) => noRequest(index + 1)),
        }),
      ],
    }))
    await renderPage()

    const chadir = card('Çadır')
    // UI V2: in the product's own secondary text colour.
    expect(within(chadir).getByText('Sistemdə hələ sifarişi yoxdur')).toHaveClass('text-on-surface-variant')
    expect(chadir.querySelector('ul')).toBeNull()
    expect(chadir.querySelector('.grid-cols-12')).toBeNull()
    expect(within(chadir).queryAllByLabelText(/sifariş yoxdur/)).toHaveLength(0)
  })

  it('closes the list with the company’s months: amounts only, no percentage (8.1)', async () => {
    serving(report({
      months: [
        companyMonth(1, { locationsWithRequest: 0, knownAmount: null }),
        ...auditMonths.slice(1, 8),
        { ...auditMonths[8], missingPriceItemCount: 3, amountIsComplete: false },
        ...auditMonths.slice(9),
      ],
      knownAmount: 431670.91,
    }))
    today(new Date(2026, 8, 24))
    await renderPage()

    const totals = within(phoneView()).getByRole('region', { name: 'Cəmi' })
    expect(phoneView().lastElementChild).toBe(totals)

    const months = monthGrid(totals)
    expect(months).toHaveLength(12)
    expect(months.map((month) => month.firstElementChild!.textContent)).toEqual([
      'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek',
    ])
    expect(totals.textContent).not.toContain('%')
    expect(totals.querySelector('.text-red-700, .text-emerald-700')).toBeNull()

    expect(within(months[0]).getByTitle('Yanvar 2026: sifariş yoxdur')).toHaveTextContent('—')
    expect(within(months[1]).getByText('25.652,22 ₼')).toBeInTheDocument()
    expect(within(months[8]).getByText('⚠ 3')).toBeInTheDocument()
    expect(within(months[9]).getByLabelText('Oktyabr 2026: gələcək ay')).toBeInTheDocument()
    expect(within(totals).getByText('İl cəmi')).toBeInTheDocument()
    expect(within(totals).getByText('431.670,91 ₼')).toBeInTheDocument()
  })

  it('says the company’s months are the whole company’s while a search narrows the cards', async () => {
    serving(report({ filteredLocationCount: 1, locationCount: 26 }))
    await renderPage('/dashboard/monthly?search=meydan')

    expect(within(phoneView()).getByRole('region', { name: 'Cəmi — bütün obyektlər' })).toBeInTheDocument()
  })

  it('explains the marks above the cards, as the table’s legend does above the table', async () => {
    await renderPage()

    const legend = within(phoneView()).getByRole('list', { name: 'Kartlardakı işarələr' })
    expect(phoneView().firstElementChild).toBe(legend)
    for (const word of ['Təsdiq gözləyir', 'Təsdiqlənib', 'Düzəliş tələb olunur', 'Qiymət yoxdur', 'Qeyri-adi ay', 'Gələcək ay']) {
      expect(within(legend).getByText(word)).toBeInTheDocument()
    }
  })

  it('is lists and grids, not a table, and uses no retired word', async () => {
    serving(threeObjects())
    await renderPage()

    expect(phoneView().querySelector('table')).toBeNull()
    // Filtered rather than `[class*="min-w-["]`, which jsdom never matches — this check could not fail before.
    expect(withClass(phoneView(), 'min-w-[')).toEqual([])
    expect(findOldTerms(phoneView())).toEqual([])
  })
})

describe('the loading it actually does', () => {
  it('asks the server and shows the year, under StrictMode s double-invoked effects', async () => {
    await renderPage()

    // The failure this guards against is silent: the page keeps its skeleton forever and nothing is logged.
    expect(reportsApi.fetchMonthlyReport).toHaveBeenCalled()
    expect(screen.queryByText('Hesabat yüklənir')).toBeNull()
    expect(within(table()).getByText('Fəvvarələr meydanı')).toBeInTheDocument()
  })
})

describe('the panorama', () => {
  /**
   * Brief: "12 aylıq cədvəl təxminən 1024px-dən başlayaraq işləyir" and "1200px enində də 12 aylıq cədvəli görürəm".
   * Below the width the twelve months need, the table scrolls inside its own box rather than becoming a list.
   *
   * UI V2 (AC-14, B-07; D-51, S-2a = A): the page itself never scrolls sideways at any width. The box scrolls at every
   * desktop width, whenever the months need more room than it has; the header that a scrolling box cannot hold to the
   * page is the floating copy («the panorama › keeps the header row …» and «the floating header»). The minimum is what
   * twelve months at 12 px need (S-2b): 120 + 12 × 74 + 88 = 1096 in «Yığcam», 120 + 12 × 106 + 88 = 1480 in «Standart».
   */
  it('scrolls only inside its own box, at every desktop width', async () => {
    await renderPage()

    const panorama = table().closest('.lg\\:block')!
    expect(panorama.className).toContain('hidden')

    const box = table().closest('div')!
    expect(box.className.split(' ')).toContain('overflow-x-auto')
    // Not a box only below some width: below it the page would scroll sideways again (B-07).
    expect(box.className).not.toMatch(/(max-|min-)\[\d+px\]:overflow/)

    // Fixed layout: a long value can never push a month out. The minimum is what twelve readable months need.
    expect(table().className).toContain('table-fixed')
    expect(table().className).toContain('w-full')
    expect(table().className).toContain('min-w-[1096px]')
  })

  it('needs the room of twelve 106-pixel months in «Standart», still only inside its box', async () => {
    await renderPage('/dashboard/monthly?view=standart')

    expect(table().className).toContain('min-w-[1480px]')
    expect(table().className).not.toContain('min-w-[1096px]')
    expect(table().closest('div')!.className.split(' ')).toContain('overflow-x-auto')
  })

  /**
   * The header outranks every sticky cell in the body. Both axes are sticky here — the header along the top, the
   * name and year columns along the sides — and whichever carries the higher z-index is the one that paints on top.
   */
  it('keeps the header above the rows that pass under it', async () => {
    await renderPage()

    const headerCells = [...table().querySelectorAll('thead th')]
    expect(headerCells.length).toBeGreaterThan(0)
    for (const cell of headerCells) {
      expect(cell.className).toContain('sticky')
      expect(cell.className).toMatch(/z-\[(2|3)\]/)
    }

    // Every sticky cell in the body sits below the header, never level with it.
    for (const cell of [...table().querySelectorAll('tbody [class*="sticky"]')]) {
      expect(cell.className).toContain('z-[1]')
    }

    // UI V2 (Seçim A): above them all but the application's header (z-20), the floating copy of the header — a
    // picture of it, hidden from screen readers.
    const floating = document.querySelector('[data-floating-header]')!
    expect(floating).toHaveClass('z-10')
    expect(floating).toHaveAttribute('aria-hidden', 'true')
  })

  it('gives every month at least 74 pixels, with the object at 120 and the year at 88', async () => {
    await renderPage()

    const cols = [...table().querySelectorAll('col')]
    expect(cols).toHaveLength(14)
    // UI V2 (D-51, S-2b = 12 px): 120 + 12 × 74 + 88 = 1096, the table's minimum width.
    expect(cols[0].className).toContain('w-[7.5rem]')
    expect(cols[13].className).toContain('w-[5.5rem]')
    expect(table().className).toContain('min-w-[1096px]')
    // The twelve in between carry no width of their own, so a fixed layout divides the remainder equally.
    for (const month of cols.slice(1, 13)) {
      expect(month.className).toBe('')
    }
  })

  /** Brief: "1440-da cədvəl yuxarıdakı kartların hüdudundan kənara çıxır". The cards above set the edge now. */
  it('stays within the page, as wide as the cards above it', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard/monthly']}>
        <MonthlyReportPage />
      </MemoryRouter>,
    )
    await screen.findByRole('region', { name: 'İlin xülasəsi' })

    expect(container.querySelector('[class*="-mx-"]')).toBeNull()
  })

  it('keeps the header row at the top of the page, under the application header', async () => {
    await renderPage()

    const headers = [...table().querySelectorAll('thead th')]
    expect(headers).toHaveLength(14)
    for (const header of headers) {
      expect(header.className).toContain('sticky')
      // Never 8 pixels under the 72-pixel application header again (B-07, S-01).
      expect(header.className).not.toContain('top-16')
    }

    // UI V2 (Seçim A): the copy of the row is what stays at the top — at 72 pixels, right under the application's
    // header — with the same fourteen cells, so each name stands over its own month.
    const floating = document.querySelector<HTMLElement>('[data-floating-header]')!
    expect(floating).toHaveClass('sticky', 'top-18')
    expect(floating.querySelectorAll('thead th')).toHaveLength(14)
    expect([...floating.querySelectorAll('thead th')].map((cell) => cell.textContent))
      .toEqual(headers.map((cell) => cell.textContent))
  })

  it('keeps the year pinned on the right while the months scroll', async () => {
    await renderPage()

    const year = within(table()).getByRole('columnheader', { name: 'İl cəmi' })
    expect(year.className).toContain('sticky')
    expect(year.className).toContain('right-0')
  })

  it('shows every month of the year at once', async () => {
    await renderPage()

    const headers = within(table()).getAllByRole('columnheader').map((cell) => cell.textContent)
    expect(headers).toEqual([
      'Obyekt', 'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek', 'İl cəmi',
    ])
  })

  it('keeps money on one line, in figures of one width', async () => {
    // Both views, with a change given only in manat, which the «Standart» cell writes as money.
    serving(report({
      rows: [row({ months: [cell(1, { deltaPercent: null, deltaAmount: 120 }), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))] })],
    }))
    const standard = renderAt('/dashboard/monthly?view=standart')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })
    const inStandard = within(table()).getAllByText(/₼/)
    expect(inStandard.some((value) => value.textContent === `+120,00${nbsp}₼`)).toBe(true)
    for (const value of inStandard) {
      expect(value.className).toContain('whitespace-nowrap')
      // UI V2: the product's `.tabular`, not the stock utility.
      expect(value.className.split(' ')).toContain('tabular')
    }
    standard.unmount()

    await renderPage()
    for (const value of within(table()).getAllByText(/₼/)) {
      expect(value.className).toContain('whitespace-nowrap')
      expect(value.className.split(' ')).toContain('tabular')
    }
  })

  it('still opens the decision page from the cell', async () => {
    await renderPage()

    expect(within(table()).getByRole('link', { name: /Yanvar 2026/ })).toHaveAttribute('href', '/orders/101?back=monthly')
  })

  it('shows the change as a percentage, which is far shorter than the money', async () => {
    const movedJanuary = () => report({
      rows: [row({
        months: [cell(1, { deltaAmount: 1287.91, deltaPercent: 65.8 }), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))],
      })],
    })

    // «Standart» (UI V2, D-50 №6) is the view that writes the change in the cell.
    serving(movedJanuary())
    const standard = renderAt('/dashboard/monthly?view=standart')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })
    expect(within(table()).getByText('+65,8%')).toBeInTheDocument()
    // The manat difference is not lost — it moves into the cell's own description, with ₼ kept to its amount
    // by a no-break space (U+00A0).
    expect(within(table()).getByRole('link', { name: /Yanvar 2026/ }))
      .toHaveAttribute('title', expect.stringContaining(`+1.287,91${String.fromCharCode(0xa0)}₼`) as unknown as string)
    const titleInStandard = within(table()).getByRole('link', { name: /Yanvar 2026/ }).getAttribute('title')
    standard.unmount()

    // «Yığcam»: no percentage in the cell, and the same description, word for word.
    serving(movedJanuary())
    await renderPage()
    expect(within(table()).queryByText('+65,8%')).toBeNull()
    expect(within(table()).getByRole('link', { name: /Yanvar 2026/ })).toHaveAttribute('title', titleInStandard!)
  })

  it('leaves the undecided state unmarked and marks anything else', async () => {
    serving(report({
      rows: [row({
        months: [cell(1, { status: 'Approved' }), cell(2, { status: 'Draft' }), ...Array.from({ length: 10 }, (_, index) => cell(index + 3))],
      })],
    }))
    await renderPage()

    // Every row is undecided today; a mark on all twelve would be noise rather than information. UI V2 (DK-05): the
    // mark is the product's own sign, ✓ for approved.
    const approved = within(table()).getByRole('link', { name: /Yanvar 2026/ })
    const mark = approved.querySelector('[data-status-mark="Approved"]')
    expect(mark).not.toBeNull()
    expect(mark).toHaveTextContent('✓')
    expect(approved).toHaveAttribute('title', expect.stringContaining('Təsdiqlənib') as unknown as string)

    const draft = within(table()).getByRole('link', { name: /Fevral 2026/ })
    expect(draft.querySelector('[data-status-mark]')).toBeNull()
  })

  it('says a month has no order without drawing a zero', async () => {
    serving(report({
      rows: [row({ months: [noRequest(1), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))] })],
    }))
    await renderPage()

    expect(within(table()).getByTitle('Yanvar 2026: sifariş yoxdur')).toBeInTheDocument()
    expect(within(table()).queryByText('0,00 ₼')).toBeNull()
  })
})

/** U+00A0, by its code point: the no-break space the money formatter puts before ₼. */
const nbsp = String.fromCharCode(0xa0)

/** The row of company totals under the locations. */
function totalsRow(): HTMLElement {
  return table().querySelector('tfoot tr')!
}

/** Today pinned, where which months have not begun matters. Only `Date` is faked; timers stay real. */
function today(date: Date) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(date)
}

/** The brief's audit figures for the company's months of 2026; October to December have not begun. */
const auditMonths = [
  11084.35, 25652.22, 48296.72, 49106.54, 62556.61, 70992.62, 48430.78, 44340.78, 71210.29,
].map((amount, index) => companyMonth(index + 1, { knownAmount: amount }))
  .concat([10, 11, 12].map((month) => companyMonth(month, { locationsWithRequest: 0, knownAmount: null })))

describe('the totals row (owner decision 8.1)', () => {
  it('adds each month and the year up under the locations, from the backend’s own figures', async () => {
    serving(report({ months: auditMonths, knownAmount: 431670.91 }))
    await renderPage()

    const totals = totalsRow()
    expect(within(totals).getByRole('rowheader', { name: 'Cəmi' })).toBeInTheDocument()
    expect(within(totals).getByText('11.084,35 ₼')).toBeInTheDocument()
    // September is the dashboard's month total, 71.210,29 ₼ on the audit data (brief).
    expect(within(totals).getByText('71.210,29 ₼')).toBeInTheDocument()
    expect(within(totals).getByText('431.670,91 ₼')).toBeInTheDocument()
  })

  it('shows no percentage, no change and no direction colour', async () => {
    serving(report({ months: auditMonths, knownAmount: 431670.91 }))
    await renderPage()

    const totals = totalsRow()
    expect(totals.textContent).not.toContain('%')
    expect(totals.querySelector('.text-red-700')).toBeNull()
    expect(totals.querySelector('.text-emerald-700')).toBeNull()
  })

  it('says when a month’s total leaves out a line nobody has priced', async () => {
    serving(report({
      months: auditMonths.map((month) =>
        month.month === 9 ? { ...month, missingPriceItemCount: 3, amountIsComplete: false } : month),
    }))
    await renderPage()

    const mark = within(totalsRow()).getByText('⚠ 3')
    expect(mark.parentElement).toHaveAttribute('title', '3 sətirdə qiymət yoxdur')
    expect(within(totalsRow()).getByText('3 sətirdə qiymət yoxdur')).toHaveClass('sr-only')
  })

  it('says it is the whole company’s while a search narrows the rows', async () => {
    serving(report({ filteredLocationCount: 1, locationCount: 26 }))
    await renderPage('/dashboard/monthly?search=meydan')

    // The rows above are one object; the totals are all of them, and the label says so.
    expect(within(totalsRow()).getByRole('rowheader', { name: 'Cəmi — bütün obyektlər' })).toBeInTheDocument()
  })

  it('draws a month nobody ordered in as a dash, never a zero', async () => {
    serving(report({
      months: [companyMonth(1, { locationsWithRequest: 0, knownAmount: null }), ...auditMonths.slice(1)],
    }))
    await renderPage()

    expect(within(totalsRow()).getByTitle('Yanvar 2026: sifariş yoxdur')).toHaveTextContent('—')
    expect(within(totalsRow()).queryByText('0,00 ₼')).toBeNull()
  })
})

describe('an unusual month (owner decision 8.2)', () => {
  /** Heydər Əliyev: June 36.010,19 ₼ after March–May averaging 14.458,58 ₼ — +149,06%. */
  const heyderAliyev = () => row({
    locationName: 'Heydər Əliyev',
    months: [
      ...Array.from({ length: 5 }, (_, index) => cell(index + 1)),
      cell(6, { knownAmount: 36010.19, isUnusual: true, recentAverageKnownAmount: 14458.58, recentAveragePercent: 149.06 }),
      cell(7, { knownAmount: 400, isUnusual: true, recentAverageKnownAmount: 1000, recentAveragePercent: -60 }),
      cell(8, { knownAmount: 11985.02, isUnusual: false, recentAverageKnownAmount: 23048.12, recentAveragePercent: -48 }),
      ...Array.from({ length: 4 }, (_, index) => cell(index + 9)),
    ],
  })

  it('tints the month by the direction its cost moved, so it is seen before it is read', async () => {
    serving(report({ rows: [heyderAliyev()] }))
    await renderPage()

    const june = within(table()).getByRole('link', { name: /İyun 2026/ })
    expect(june.className).toContain('bg-red-50')
    expect(june.className).toContain('ring-red-200')
    // UI V2 (AC-04, DK-07): a shape for the direction as well as the colour — ▲ up, in red — and the amount at its
    // ordinary weight, which keeps neighbouring sums apart.
    expect(within(june).getByText('▲')).toHaveClass('text-red-700')
    expect(within(june).getByText('36.010,19 ₼').className).not.toContain('font-semibold')

    const july = within(table()).getByRole('link', { name: /İyul 2026/ })
    expect(july.className).toContain('bg-emerald-50')
    expect(july.className).toContain('ring-emerald-200')
    expect(within(july).getByText('▼')).toHaveClass('text-emerald-700')
    expect(within(july).queryByText('▲')).toBeNull()
  })

  it('says why in words, with the average and the difference', async () => {
    serving(report({ rows: [heyderAliyev()] }))
    await renderPage()

    const june = within(table()).getByRole('link', { name: /İyun 2026/ })
    const why = `Qeyri-adi ay: əvvəlki 3 mövcud ayın ortalaması 14.458,58${nbsp}₼, fərq +149,06%`
    expect(june).toHaveAttribute('title', expect.stringContaining(why) as unknown as string)
    expect(june).toHaveAccessibleName(expect.stringContaining(why) as unknown as string)
    // Still the order, and still without a basis, so it opens on "Keçən ay" (Task 1).
    expect(june).toHaveAttribute('href', '/orders/106?back=monthly')
  })

  it('leaves a month within half of its average as it is', async () => {
    serving(report({ rows: [heyderAliyev()] }))
    await renderPage()

    // August, −48,00% from May–July: not marked, and not described as unusual.
    const august = within(table()).getByRole('link', { name: /Avqust 2026/ })
    expect(august.className).not.toContain('bg-red-50')
    expect(august.className).not.toContain('bg-emerald-50')
    expect(august.className).not.toContain('ring-1')
    expect(august.getAttribute('title')).not.toContain('Qeyri-adi ay')
    // UI V2 (DK-07): every amount in a month column is at the ordinary weight; and no direction mark.
    expect(within(august).getByText('11.985,02 ₼').className).toContain('font-normal')
    expect(within(august).queryByText(/[▲▼]/)).toBeNull()
  })
})

describe('months that have not begun', () => {
  afterEach(() => vi.useRealTimers())

  const withFutureGap = () => row({
    months: [
      noRequest(1),
      ...Array.from({ length: 8 }, (_, index) => cell(index + 2)),
      noRequest(10),
      cell(11),
      noRequest(12),
    ],
  })

  it('draws a future month without a dash, and never says nothing was ordered', async () => {
    today(new Date(2026, 8, 24))
    serving(report({ rows: [withFutureGap()] }))
    await renderPage()

    const october = within(table()).getByLabelText('Fəvvarələr meydanı · Oktyabr 2026: gələcək ay')
    expect(october).toHaveAttribute('title', 'Oktyabr 2026: gələcək ay')
    expect(october.textContent).toBe('')
    expect(within(table()).queryByTitle('Oktyabr 2026: sifariş yoxdur')).toBeNull()
    expect(within(table()).queryByTitle('Dekabr 2026: sifariş yoxdur')).toBeNull()

    // A past month with no order is still a dash, and looks different.
    const january = within(table()).getByLabelText('Fəvvarələr meydanı · Yanvar 2026 · sifariş yoxdur')
    expect(january.textContent).toBe('—')
    expect(october.className).not.toBe(january.className)
  })

  it('shows an order entered ahead of time as an ordinary month', async () => {
    today(new Date(2026, 8, 24))
    serving(report({ rows: [withFutureGap()] }))
    await renderPage()

    expect(within(table()).getByRole('link', { name: /Noyabr 2026/ })).toHaveAttribute('href', '/orders/111?back=monthly')
  })

  it('marks the headers of the months to come, on the screen and in words', async () => {
    today(new Date(2026, 8, 24))
    await renderPage()

    // UI V2 (DK-14, AC-17): not a faded name (2,45:1) but the month's name at full contrast with the hatch under it,
    // and the words on hover.
    for (const [month, name] of [['Okt', 'Oktyabr'], ['Noy', 'Noyabr'], ['Dek', 'Dekabr']]) {
      const header = within(table()).getByRole('columnheader', { name: month })
      expect(header).toHaveAttribute('data-future')
      expect(header.className).toContain('after:bg-[image:repeating-linear-gradient')
      expect(header).toHaveAttribute('title', `${name} 2026: gələcək ay`)
      expect(header.className).not.toContain('text-slate-400')
    }

    for (const month of ['Yan', 'Sen']) {
      const header = within(table()).getByRole('columnheader', { name: month })
      expect(header).not.toHaveAttribute('data-future')
      expect(header.className).not.toContain('repeating-linear-gradient')
      expect(header).not.toHaveAttribute('title')
    }
  })

  it('treats no month of a year gone by as future', async () => {
    today(new Date(2027, 1, 3))
    serving(report({ rows: [withFutureGap()] }))
    await renderPage()

    expect(within(table()).getByTitle('Oktyabr 2026: sifariş yoxdur')).toHaveTextContent('—')
    expect(within(table()).queryByLabelText(/gələcək ay/)).toBeNull()
    for (const header of within(table()).getAllByRole('columnheader')) {
      expect(header.className).not.toContain('text-slate-400')
      // UI V2: and no header carries the mark of a month to come.
      expect(header).not.toHaveAttribute('data-future')
    }
  })

  it('says so on the phone too, by the same hatch, and never that nothing was ordered', async () => {
    today(new Date(2026, 8, 24))
    serving(report({ rows: [withFutureGap()] }))
    await renderPage()

    const phone = screen.getByRole('list', { name: 'Kartlardakı işarələr' }).parentElement!
    const october = within(phone).getByLabelText('Fəvvarələr meydanı · Oktyabr 2026: gələcək ay')
    expect(october.textContent).toBe('')
    expect(october.className).toContain('bg-[image:repeating-linear-gradient')
    expect(within(phone).queryByLabelText(/Oktyabr 2026 · sifariş yoxdur/)).toBeNull()
    expect(within(phone).queryByLabelText(/Dekabr 2026 · sifariş yoxdur/)).toBeNull()
    // An order entered ahead of time is an ordinary month here as well.
    expect(within(phone).getByRole('link', { name: /Noyabr 2026/ })).toHaveAttribute('href', '/orders/111?back=monthly')
    // Its slot on the strip is the same hatch; a past month with no order is an empty slot.
    const bars = [...phone.querySelector('.grid-cols-12')!.children] as HTMLElement[]
    expect(bars[9].className).toContain('bg-[image:repeating-linear-gradient')
    expect(bars[0].className).not.toContain('bg-[image:')
  })
})

describe('an incomplete month that also moved', () => {
  /** Bayıl yolu's September: one line without a price, and +254,03% on the month before (brief). */
  it('shows the unpriced line and the percentage together', async () => {
    const bayil = () => report({
      rows: [row({
        locationName: 'Bayıl yolu',
        months: [
          ...Array.from({ length: 8 }, (_, index) => cell(index + 1)),
          cell(9, { amountIsComplete: false, missingPriceItemCount: 1, deltaPercent: 254.03, deltaAmount: 5080.6 }),
          ...Array.from({ length: 3 }, (_, index) => cell(index + 10)),
        ],
      })],
    })

    // «Standart» (UI V2, D-50 №6): both in the cell.
    serving(bayil())
    const standard = renderAt('/dashboard/monthly?view=standart')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })
    const september = within(table()).getByRole('link', { name: /Sentyabr 2026/ })
    expect(within(september).getByText('⚠ 1')).toBeInTheDocument()
    expect(within(september).getByText('+254,03%')).toBeInTheDocument()
    standard.unmount()

    // «Yığcam»: the unpriced line stays in the cell; the change is in its name.
    serving(bayil())
    await renderPage()
    const compact = within(table()).getByRole('link', { name: /Sentyabr 2026/ })
    expect(within(compact).getByText('⚠ 1')).toBeInTheDocument()
    expect(within(compact).queryByText('+254,03%')).toBeNull()
    expect(compact).toHaveAccessibleName(expect.stringContaining('+254,03%') as unknown as string)
  })
})

describe('the colour of a change (owner decision 9.1)', () => {
  const upThenDown = () => report({
    rows: [row({
      months: [
        cell(1, { deltaPercent: 12, deltaAmount: 120 }),
        cell(2, { deltaPercent: -8, deltaAmount: -90 }),
        ...Array.from({ length: 10 }, (_, index) => cell(index + 3)),
      ],
    })],
  })

  it('is red when the cost went up and green when it went down', async () => {
    // «Standart» (UI V2, D-50 №6) writes the change in the cell.
    serving(upThenDown())
    await renderPage('/dashboard/monthly?view=standart')

    const up = within(table()).getByRole('link', { name: /Yanvar 2026/ })
    expect(within(up).getByText('+12%').className).toContain('text-red-700')
    expect(up).toHaveAccessibleName(expect.stringContaining('xərc artıb') as unknown as string)

    const down = within(table()).getByRole('link', { name: /Fevral 2026/ })
    expect(within(down).getByText('−8%').className).toContain('text-emerald-700')
    expect(down).toHaveAccessibleName(expect.stringContaining('xərc azalıb') as unknown as string)
  })

  it('says the direction in the cell’s name in «Yığcam», which writes no percentage', async () => {
    serving(upThenDown())
    await renderPage()

    const up = within(table()).getByRole('link', { name: /Yanvar 2026/ })
    expect(within(up).queryByText('+12%')).toBeNull()
    expect(up).toHaveAccessibleName(expect.stringContaining('xərc artıb') as unknown as string)

    const down = within(table()).getByRole('link', { name: /Fevral 2026/ })
    expect(within(down).queryByText('−8%')).toBeNull()
    expect(down).toHaveAccessibleName(expect.stringContaining('xərc azalıb') as unknown as string)
  })

  it('no longer uses the rule 9.1 replaced', async () => {
    const fall = () => report({
      rows: [row({ months: [cell(1, { deltaPercent: -8, deltaAmount: -90 }), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))] })],
    })

    // UI V2: in both views — «Standart» is the one with a percentage in the cell.
    for (const url of ['/dashboard/monthly', '/dashboard/monthly?view=standart']) {
      serving(fall())
      const page = renderAt(url)
      await screen.findByRole('region', { name: 'İlin xülasəsi' })

      // The old rule painted a fall rose and a rise emerald.
      expect(table().querySelector('.text-rose-700')).toBeNull()
      const text = table().textContent ?? ''
      expect(text).not.toMatch(/yaxşı|\bpis\b/i)
      page.unmount()
    }
  })
})

describe('the legend', () => {
  it('explains every mark in the grid on the screen, not only on hover', async () => {
    await renderPage()

    const legend = screen.getByRole('list', { name: 'Cədvəldəki işarələr' })
    for (const word of [
      'Təsdiq gözləyir', 'Təsdiqlənib', 'Düzəliş tələb olunur',
      'Qiymət yoxdur',
      'Qeyri-adi ay', 'Gələcək ay',
    ]) {
      expect(within(legend).getByText(word)).toBeInTheDocument()
    }

    // UI V2 (DK-05, AC-04): the marks themselves, drawn as the cells draw them — ✓ ⏳ ↩ and ▲ ▼.
    for (const status of ['PendingApproval', 'Approved', 'ReturnedForCorrection']) {
      expect(legend.querySelector(`[data-status-mark="${status}"]`)).not.toBeNull()
    }
    expect(within(legend).getByText('▲')).toHaveClass('text-red-700')
    expect(within(legend).getByText('▼')).toHaveClass('text-emerald-700')
    expect(legend).toHaveTextContent('əvvəlki 3 mövcud ayın ortalamasından 50%-dən çox fərq')

    // «Yığcam» writes no percentage, so its legend explains none (AC-02).
    expect(legend).not.toHaveTextContent('Faiz — əvvəlki aya görə')
    expect(within(legend).queryByText('xərc artıb')).toBeNull()
    // Directly above the table, in the part of the page that shows from 1024 pixels.
    expect(legend.closest('.lg\\:block')).toBe(table().closest('.lg\\:block'))
  })

  it('explains the percentage, both ways, where «Standart» writes one', async () => {
    await renderPage('/dashboard/monthly?view=standart')

    const legend = screen.getByRole('list', { name: 'Cədvəldəki işarələr' })
    expect(legend).toHaveTextContent('Faiz — əvvəlki aya görə')
    expect(within(legend).getByText('xərc artıb')).toHaveClass('text-red-700')
    expect(within(legend).getByText('xərc azalıb')).toHaveClass('text-emerald-700')
    for (const word of ['Təsdiq gözləyir', 'Təsdiqlənib', 'Düzəliş tələb olunur', 'Qiymət yoxdur', 'Qeyri-adi ay', 'Gələcək ay']) {
      expect(within(legend).getByText(word)).toBeInTheDocument()
    }
  })
})

/**
 * Task 22b: the report says a historical order the way the order page does (brief acceptance 4, 22.2) — in the
 * cell's words, where the report already says a status. The dot and the legend are the marks of the grid, and a
 * historical order is approved (22.1), so they stay exactly as they were.
 */
describe('an order carried in from Excel', () => {
  const phrase = 'Təsdiqlənib · Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb'

  /** Two objects whose January is the same approved order in every figure; only the first was carried in. */
  function twins() {
    return report({
      rows: [
        row({
          locationId: 21,
          locationName: 'Fəvvarələr meydanı',
          months: [cell(1, { status: 'Approved', isHistoricalImport: true }), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))],
        }),
        row({
          locationId: 1,
          locationName: 'Bayıl yolu',
          months: [cell(1, { status: 'Approved' }), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))],
        }),
      ],
    })
  }

  function january(scope: HTMLElement, locationName: string): HTMLElement {
    return within(scope).getByRole('link', { name: new RegExp(`^${locationName} · Yanvar 2026`) })
  }

  it('says the phrase after Təsdiqlənib in the cell’s tooltip and its accessible name', async () => {
    serving(twins())
    await renderPage()

    const historical = january(table(), 'Fəvvarələr meydanı')
    expect(historical.getAttribute('title')).toContain(phrase)
    expect(historical.getAttribute('title')!.endsWith(phrase)).toBe(true)
    expect(historical).toHaveAccessibleName(`Fəvvarələr meydanı · ${historical.getAttribute('title')}`)
  })

  it('leaves an order approved in this system with exactly the words it had', async () => {
    serving(twins())
    await renderPage()

    const plain = january(table(), 'Bayıl yolu').getAttribute('title')!
    const historical = january(table(), 'Fəvvarələr meydanı').getAttribute('title')!
    expect(plain.endsWith(' · Təsdiqlənib')).toBe(true)
    expect(plain).not.toContain('Tarixi sifariş')
    // The same figures, and the phrase added after the status — nothing else in the words moved.
    expect(historical).toBe(`${plain} · ${historicalImportLabel}`)
  })

  it('keeps the approved mark, in the approved colour', async () => {
    serving(twins())
    await renderPage()

    // UI V2 (DK-05, S-3 = grey): the product's ✓, in the neutral grey — the same mark, byte for byte, as an order
    // approved in this system carries.
    const historicalMark = january(table(), 'Fəvvarələr meydanı').querySelector('[data-status-mark="Approved"]')!
    const plainMark = january(table(), 'Bayıl yolu').querySelector('[data-status-mark="Approved"]')!
    expect(historicalMark).toHaveTextContent('✓')
    expect(historicalMark).toHaveClass('text-on-surface-variant')
    expect(historicalMark.outerHTML).toBe(plainMark.outerHTML)
    expect(table()).not.toHaveTextContent('Tarixi sifariş')
  })

  it('adds nothing to either legend', async () => {
    // UI V2: the list is exact for each view — the marks drawn as the cells draw them (⏳ is an outline icon, so it
    // adds no text), the percentage only in «Standart» — and «Tarixi sifariş» is in neither.
    const compact = [
      'Təsdiq gözləyir',
      '✓Təsdiqlənib',
      '↩︎Düzəliş tələb olunur',
      '⚠ NQiymət yoxdur',
      '▲▼Qeyri-adi ay — əvvəlki 3 mövcud ayın ortalamasından 50%-dən çox fərq',
      'Gələcək ay',
    ]
    const standard = [...compact.slice(0, 4), 'Faiz — əvvəlki aya görə:xərc artıb·xərc azalıb', ...compact.slice(4)]

    for (const [url, items] of [['/dashboard/monthly', compact], ['/dashboard/monthly?view=standart', standard]] as const) {
      serving(twins())
      const page = renderAt(url)
      await screen.findByRole('region', { name: 'İlin xülasəsi' })

      for (const name of ['Cədvəldəki işarələr', 'Kartlardakı işarələr']) {
        const legend = screen.getByRole('list', { name })
        expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toEqual(items)
        expect(legend).not.toHaveTextContent('Tarixi sifariş')
      }
      page.unmount()
    }
  })

  it('says the same words on the phone card', async () => {
    serving(twins())
    await renderPage()

    const phone = screen.getByRole('list', { name: 'Kartlardakı işarələr' }).parentElement!
    const onPhone = january(phone, 'Fəvvarələr meydanı')
    expect(onPhone.getAttribute('title')).toContain(phrase)
    expect(onPhone.getAttribute('aria-label')).toBe(january(table(), 'Fəvvarələr meydanı').getAttribute('aria-label'))
    expect(january(phone, 'Bayıl yolu').getAttribute('title')).not.toContain('Tarixi sifariş')
  })

  it('never calls an order that is not approved historical, whatever the flag says', async () => {
    serving(report({
      rows: [row({
        months: [
          cell(1, { status: 'PendingApproval', isHistoricalImport: true }),
          cell(2, { status: 'ReturnedForCorrection', isHistoricalImport: true }),
          cell(3, { status: 'Draft', isHistoricalImport: true }),
          ...Array.from({ length: 9 }, (_, index) => cell(index + 4)),
        ],
      })],
    }))
    await renderPage()

    expect(document.body.innerHTML).not.toContain('Tarixi sifariş')
  })
})

describe('a location that has never ordered', () => {
  it('reads as one line in the dashboard’s words, not as twelve empty months', async () => {
    serving(report({
      rows: [
        row(),
        row({
          locationId: 27,
          locationName: 'Çadır',
          knownAmount: null,
          hasAnyRequest: false,
          months: Array.from({ length: 12 }, (_, index) => noRequest(index + 1)),
        }),
      ],
    }))
    await renderPage()

    const words = within(table()).getByText('Sistemdə hələ sifarişi yoxdur')
    const merged = words.closest('td')!
    expect(merged).toHaveAttribute('colspan', '12')
    // The object, the one merged cell and the year: still the row it always was, in its place.
    const chadir = merged.closest('tr')!
    expect(chadir.children).toHaveLength(3)
    expect(within(chadir).getByRole('rowheader', { name: 'Çadır' })).toBeInTheDocument()
    expect(within(chadir).queryByTitle(/sifariş yoxdur/)).toBeNull()
  })

  it('leaves a location that ordered in an earlier year with its twelve months', async () => {
    serving(report({
      rows: [row({
        knownAmount: null,
        hasAnyRequest: true,
        months: Array.from({ length: 12 }, (_, index) => noRequest(index + 1)),
      })],
    }))
    await renderPage()

    expect(within(table()).queryByText('Sistemdə hələ sifarişi yoxdur')).toBeNull()
    expect(within(table()).getByTitle('Yanvar 2026: sifariş yoxdur')).toBeInTheDocument()
  })
})

/** Three objects, as the report lists them; each has its own January order, so a Back can tell them apart. */
function threeRows() {
  const months = (first: number) => Array.from({ length: 12 }, (_, index) => cell(index + 1, { orderRequestId: first + index }))
  return report({
    rows: [
      row({ locationId: 1, locationName: 'Bayıl yolu', months: months(1100) }),
      row({ locationId: 21, locationName: 'Fəvvarələr meydanı', months: months(2100) }),
      row({ locationId: 3, locationName: 'Heydər Əliyev', months: months(3100) }),
    ],
  })
}

/** The part of the page that shows below 1024 pixels. */
function phoneList(): HTMLElement {
  return screen.getByRole('list', { name: 'Kartlardakı işarələr' }).parentElement!
}

/**
 * Task 24 (brief acceptance 3; 24.3): each row, and each phone card, carries the id Back's scroll memory looks for, and
 * every month opens its order marked as opened from here. Nothing else about a cell or a name link changed.
 */
describe('the rows a reader comes back to', () => {
  it('gives every table row row-{id} and every phone card row-{id}-phone, each once', async () => {
    serving(threeRows())
    await renderPage()

    const rows = [...table().querySelectorAll('tbody tr')]
    expect(rows.map((element) => element.id)).toEqual(['row-1', 'row-21', 'row-3'])
    expect(rows.map((element) => within(element as HTMLElement).getByRole('rowheader').textContent))
      .toEqual(['Bayıl yolu', 'Fəvvarələr meydanı', 'Heydər Əliyev'])

    const cards = [...phoneList().querySelectorAll('li[id]')]
    expect(cards.map((element) => element.id)).toEqual(['row-1-phone', 'row-21-phone', 'row-3-phone'])
    expect(document.getElementById('row-21-phone')).toHaveTextContent('Fəvvarələr meydanı')

    const ids = [...document.querySelectorAll('[id^="row-"]')].map((element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(6)
  })

  it('opens every filled month, in both layouts, at its order marked as from the report, with no basis', async () => {
    serving(threeRows())
    await renderPage()

    for (const scope of [table(), phoneList()]) {
      const months = within(scope).getAllByRole('link', { name: / · .+ 2026 · / })
      expect(months).toHaveLength(36)
      for (const link of months) {
        expect(link.getAttribute('href')).toMatch(/^\/orders\/\d+\?back=monthly$/)
        expect(link.getAttribute('href')).not.toContain('basis')
      }
    }

    expect(within(document.getElementById('row-21')!).getByRole('link', { name: /Yanvar 2026/ }))
      .toHaveAttribute('href', '/orders/2100?back=monthly')
    expect(within(document.getElementById('row-21-phone')!).getByRole('link', { name: /Yanvar 2026/ }))
      .toHaveAttribute('href', '/orders/2100?back=monthly')
  })

  it('leaves the object names opening the object, and the cells saying what they said', async () => {
    serving(threeRows())
    await renderPage()

    expect(within(table()).getByRole('link', { name: 'Fəvvarələr meydanı' })).toHaveAttribute('href', '/locations/21')
    expect(within(phoneList()).getByRole('link', { name: 'Fəvvarələr meydanı' })).toHaveAttribute('href', '/locations/21')

    const january = within(document.getElementById('row-21')!).getByRole('link', { name: /Yanvar 2026/ })
    const title = january.getAttribute('title')!
    expect(title.startsWith(`Yanvar 2026 · 1.001,00${nbsp}₼ · keçən aya görə +1,00${nbsp}₼`)).toBe(true)
    expect(title).not.toMatch(/Aylıq|monthly|back/i)
    expect(january).toHaveAccessibleName(`Fəvvarələr meydanı · ${title}`)
    expect(within(january).getByText('1.001,00 ₼')).toBeInTheDocument()
  })
})

/**
 * Brief acceptance 3 and 4 (24.3). The order page is a stub here, with the browser's Back as a button: what is under
 * test is that Back from a month brings its row — or on a phone its card — into view once the matrix is on the page,
 * and that the search the reader submitted comes back with it, in the box and in the request.
 */
describe('coming back from an order', () => {
  function OrderStub() {
    const navigate = useNavigate()
    const { state } = useLocation()
    return (
      <>
        <p data-testid="order-state">{JSON.stringify(state)}</p>
        <button type="button" onClick={() => navigate(-1)}>Geri</button>
        <Link to="/dashboard/monthly">Hesabata</Link>
      </>
    )
  }

  function Address() {
    const { pathname, search } = useLocation()
    return <p data-testid="address">{pathname + search}</p>
  }

  function renderWithOrder(url = '/dashboard/monthly') {
    return render(
      <StrictMode>
        <MemoryRouter initialEntries={[url]}>
          <Address />
          <Routes>
            <Route path="/dashboard/monthly" element={<MonthlyReportPage />} />
            <Route path="/orders/:orderRequestId" element={<OrderStub />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    )
  }

  function address(): string {
    return screen.getByTestId('address').textContent ?? ''
  }

  function searchBox(): HTMLInputElement {
    return screen.getByRole('searchbox', { name: 'Obyekt axtar' })
  }

  async function loaded() {
    await screen.findByRole('region', { name: 'İlin xülasəsi' })
  }

  async function goBack() {
    await userEvent.click(screen.getByRole('button', { name: 'Geri' }))
    await loaded()
  }

  let scrollIntoView = vi.fn()
  beforeEach(() => {
    // Each test is a fresh visit. A memory router's first entry is always keyed "default", and the scroll memory
    // is kept per key in the session, so a place remembered by one test would otherwise be restored in the next.
    window.sessionStorage.clear()
    scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    serving(threeRows())
  })
  afterEach(() => {
    delete (Element.prototype as Partial<Element>).scrollIntoView
  })

  it('opens a month as an entry marked as the report’s', async () => {
    renderWithOrder()
    await loaded()

    await userEvent.click(within(document.getElementById('row-21')!).getByRole('link', { name: /Mart 2026/ }))

    expect(address()).toBe('/orders/2102?back=monthly')
    expect(screen.getByTestId('order-state')).toHaveTextContent('{"monthlyReport":true}')
  })

  it('brings the row whose month was opened into view, once the matrix is there', async () => {
    renderWithOrder()
    await loaded()

    await userEvent.click(within(document.getElementById('row-3')!).getByRole('link', { name: /Avqust 2026/ }))
    await screen.findByRole('button', { name: 'Geri' })
    await goBack()

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' }))
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute('id', 'row-3')
    expect(address()).toBe('/dashboard/monthly')
  })

  it('brings the phone card back instead, when the month was opened from a card', async () => {
    renderWithOrder()
    await loaded()

    await userEvent.click(within(document.getElementById('row-21-phone')!).getByRole('link', { name: /Yanvar 2026/ }))
    await screen.findByRole('button', { name: 'Geri' })
    await goBack()

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' }))
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute('id', 'row-21-phone')
  })

  it('restores nothing on a fresh arrival, even with a place remembered for another visit', async () => {
    renderWithOrder()
    await loaded()

    await userEvent.click(within(document.getElementById('row-3')!).getByRole('link', { name: /Avqust 2026/ }))
    await userEvent.click(screen.getByRole('link', { name: 'Hesabata' }))
    await loaded()

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  /** Brief acceptance 4: "Novxan" searched, a month opened, Back — the text and the filtered matrix are back. */
  it('comes back with the search the reader submitted, in the box, in the address and in the request', async () => {
    renderWithOrder()
    await loaded()

    await userEvent.type(searchBox(), 'Novxan')
    // Typing alone asks for nothing and writes nothing.
    expect(address()).toBe('/dashboard/monthly')
    await userEvent.type(searchBox(), '{Enter}')
    await waitFor(() => expect(address()).toBe('/dashboard/monthly?search=Novxan'))
    await waitFor(() => expect(reportsApi.fetchMonthlyReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Novxan' }), expect.anything()))
    await loaded()

    await userEvent.click(within(document.getElementById('row-21')!).getByRole('link', { name: /Yanvar 2026/ }))
    await screen.findByRole('button', { name: 'Geri' })
    reportsApi.fetchMonthlyReport.mockClear()
    await goBack()

    expect(address()).toBe('/dashboard/monthly?search=Novxan')
    expect(searchBox()).toHaveValue('Novxan')
    expect(reportsApi.fetchMonthlyReport).toHaveBeenCalled()
    // Every question is the reader's search, each after the «All» question for «Ümumi faktiki xərc», which never
    // carries the search (UI V2, 03 §3.3).
    expectPairs(queries(), { year: undefined, scope: 'All' }, { year: undefined, search: 'Novxan', scope: 'Monthly' })
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute('id', 'row-21')
  })

  /** Brief acceptance 4, its second half: a reload opens the same search again. */
  it('keeps the search through a reload, and after Back from an opened month', async () => {
    const first = renderWithOrder('/dashboard/monthly?search=Novxan')
    await loaded()
    expect(searchBox()).toHaveValue('Novxan')

    await userEvent.click(within(document.getElementById('row-1')!).getByRole('link', { name: /Fevral 2026/ }))
    await screen.findByRole('button', { name: 'Geri' })
    await goBack()

    expect(searchBox()).toHaveValue('Novxan')
    expect(reportsApi.fetchMonthlyReport).toHaveBeenLastCalledWith({ year: undefined, search: 'Novxan', scope: 'Monthly' }, expect.anything())
    const url = address()
    expect(new URLSearchParams(url.split('?')[1]).get('search')).toBe('Novxan')
    first.unmount()

    // The reload: the same address, rendered anew.
    reportsApi.fetchMonthlyReport.mockClear()
    renderWithOrder(url)
    await loaded()

    expect(searchBox()).toHaveValue('Novxan')
    expect(reportsApi.fetchMonthlyReport).toHaveBeenLastCalledWith({ year: undefined, search: 'Novxan', scope: 'Monthly' }, expect.anything())
    // UI V2 (03 §3.3): and nothing but that question, each time after its «All» question, which has no search.
    expectPairs(queries(), { year: undefined, scope: 'All' }, { year: undefined, search: 'Novxan', scope: 'Monthly' })
    expect(address()).toBe('/dashboard/monthly?search=Novxan')
  })

  it('writes a submitted search over the entry it is on, so the history does not grow', async () => {
    function Back() {
      const navigate = useNavigate()
      return <button type="button" onClick={() => navigate(-1)}>Brauzerdə geri</button>
    }

    render(
      <MemoryRouter initialEntries={['/elsewhere', '/dashboard/monthly?year=2026']}>
        <Address />
        <Back />
        <Routes>
          <Route path="/dashboard/monthly" element={<MonthlyReportPage />} />
          <Route path="/elsewhere" element={<p>Əvvəlki səhifə</p>} />
        </Routes>
      </MemoryRouter>,
    )
    await loaded()

    await userEvent.type(searchBox(), 'Novxan{Enter}')
    await waitFor(() => expect(address()).toBe('/dashboard/monthly?year=2026&search=Novxan'))
    await userEvent.clear(searchBox())
    await userEvent.type(searchBox(), 'Bayıl{Enter}')
    await waitFor(() => expect(address()).toBe('/dashboard/monthly?year=2026&search=Bay%C4%B1l'))

    // One Back leaves the report: neither search pushed an entry of its own.
    await userEvent.click(screen.getByRole('button', { name: 'Brauzerdə geri' }))
    expect(screen.getByText('Əvvəlki səhifə')).toBeInTheDocument()
  })
})

/**
 * The grid compares months, and a month-on-month comparison only means something about material the company
 * orders every month. So the headline is the figure the reader asked for, named in those words, and the other two
 * answers stand beside it, smaller — nothing lost, nothing competing with the answer (D-50 №3; UI V2 02 §6, 03 §6.8).
 *
 * «Ümumi faktiki xərc» is never the browser's sum. Beside another scope it is the `scope=All` answer's own figure, and
 * the mock gives that answer a figure no sum of the others comes to: 431.079,17 ₼, where planned and off-plan come to
 * 431.051,16 ₼ and the three kinds of line to 431.079,16 ₼ (each kind is rounded to the qəpik on its own, 03 §6.9.6).
 */
describe('the three kinds of money', () => {
  const year = (overrides: Partial<MonthlyReport> = {}) => report({
    knownAmount: 428000,
    monthlyKnownAmount: 428000,
    monthlyItemCount: 3293,
    outsideMonthlyKnownAmount: 3051.16,
    outsideMonthlyItemCount: 325,
    unclassifiedKnownAmount: 28,
    unclassifiedItemCount: 1,
    ...overrides,
  })

  /** The `scope=All` answer: the same year, every line, the server's own figure. */
  const allLines = () => year({ knownAmount: 431079.17 })

  it('heads the year with one figure, in the words of the scope it was read in', async () => {
    servingByScope({ main: year(), all: allLines() })
    await renderPage()

    const summary = screen.getByRole('region', { name: 'İlin xülasəsi' })
    expect(within(summary).getByRole('heading', { level: 2, name: 'Aylıq sifarişlərin məbləği' })).toBeInTheDocument()
    // One heading and one number at headline size, under it; the two beside it are other answers, not this one again.
    expect(within(summary).getAllByRole('heading')).toHaveLength(1)
    expect(figure('Aylıq sifarişlərin məbləği')).toHaveTextContent('428.000,00 ₼')
    expect(within(summary).getAllByText('428.000,00 ₼')).toHaveLength(1)
    expect(figureAmounts()).toEqual(['428.000,00 ₼', '3.051,16 ₼', '431.079,17 ₼'])
  })

  it('stands the other two beside it: off-plan from the same answer, the actual spend from the «All» answer, never a sum', async () => {
    servingByScope({ main: year(), all: allLines() })
    await renderPage()

    expect(figure('Aylıqdan Kənar sifarişlər')).toHaveTextContent('3.051,16 ₼')
    expect(figure('Ümumi faktiki xərc')).toHaveTextContent('431.079,17 ₼')
    // Neither sum the browser could have made is anywhere in the summary.
    expect(summary()).not.toHaveTextContent('431.051,16')
    expect(summary()).not.toHaveTextContent('431.079,16')
  })

  it('keeps the composition of the year itself, whichever scope the grid was read in', async () => {
    // Read about off-plan spending the headline is 3 051,16 — and the year still held 428 000 of plan.
    servingByScope({ main: year({ knownAmount: 3051.16 }), all: allLines() })
    await renderPage('/dashboard/monthly?scope=OutsideMonthly')

    const summary = screen.getByRole('region', { name: 'İlin xülasəsi' })
    expect(within(summary).getByRole('heading', { level: 2, name: 'Aylıqdan kənar xərclər' })).toBeInTheDocument()
    expect(figure('Aylıqdan kənar xərclər')).toHaveTextContent('3.051,16 ₼')
    expect(figure('Aylıqdan kənar xərclər')).toHaveTextContent('Plandan kənar alınanlar. Xərcdir, aylıq tələb deyil.')
    expect(figure('Aylıq sifarişlər')).toHaveTextContent('428.000,00 ₼')
    expect(figure('Ümumi faktiki xərc')).toHaveTextContent('431.079,17 ₼')
    expect(figureAmounts()).toEqual(['3.051,16 ₼', '428.000,00 ₼', '431.079,17 ₼'])
    expect(summary).not.toHaveTextContent('431.051,16')
    expect(summary).not.toHaveTextContent('431.079,16')
  })

  it('heads the year with the actual spend when that is the scope, its parts beside it, from one answer', async () => {
    servingByScope({ main: year(), all: allLines() })
    await renderPage('/dashboard/monthly?scope=All')

    const summary = screen.getByRole('region', { name: 'İlin xülasəsi' })
    expect(within(summary).getByRole('heading', { level: 2, name: 'Ümumi faktiki xərc' })).toBeInTheDocument()
    expect(figure('Ümumi faktiki xərc')).toHaveTextContent('431.079,17 ₼')
    expect(figure('Ümumi faktiki xərc'))
      .toHaveTextContent('Bütün sətirlər, təsnif edilməyənlər də daxil. Aylıq tələb kimi oxunmur.')
    expect(figure('Aylıq sifarişlər')).toHaveTextContent('428.000,00 ₼')
    expect(figure('Aylıqdan Kənar sifarişlər')).toHaveTextContent('3.051,16 ₼')
    expect(figureAmounts()).toEqual(['431.079,17 ₼', '428.000,00 ₼', '3.051,16 ₼'])
    // Its own figure is the actual spend: nothing else is asked for.
    expect(queries().every((query) => query.scope === 'All')).toBe(true)
  })

  it('says nothing about lines nobody classified when there are none', async () => {
    reportsApi.fetchMonthlyReport.mockResolvedValue(report())
    await renderPage()

    expect(screen.queryByText(/təsnif edilməyib/)).not.toBeInTheDocument()
  })

  it('warns that unclassified lines are in neither figure', async () => {
    reportsApi.fetchMonthlyReport.mockResolvedValue(report({
      unclassifiedKnownAmount: 28,
      unclassifiedItemCount: 1,
    }))
    await renderPage()

    const note = screen.getByText(/1 sətir təsnif edilməyib/)
    expect(note).toHaveTextContent('28,00 ₼')
    expect(note).toHaveTextContent('Nə aylıq müqayisəyə, nə də aylıqdan kənar məbləğə daxil deyil')
  })
})

/**
 * The same three questions the dashboard asks, in the same words. A manager who scopes one screen and moves to
 * the other must not have to work out whether the two mean the same thing.
 */
describe('which lines the year is about', () => {
  it('opens on the planned material, and asks the server for nothing else', async () => {
    reportsApi.fetchMonthlyReport.mockResolvedValue(report())
    await renderPage()

    expect(screen.getByRole('button', { name: 'Aylıq sifarişlər' })).toHaveAttribute('aria-pressed', 'true')
    expect(reportsApi.fetchMonthlyReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'Monthly' }), expect.anything())
    // UI V2 (03 §3.3): besides the question itself, only the «All» one asked before it each time, for «Ümumi faktiki
    // xərc» — and nothing else.
    expectPairs(queries(), { year: undefined, scope: 'All' }, { year: undefined, search: undefined, scope: 'Monthly' })
  })

  it('asks again about the scope the reader chose, and keeps it in the address', async () => {
    reportsApi.fetchMonthlyReport.mockResolvedValue(report())
    await renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Aylıqdan kənar' }))

    await waitFor(() => expect(reportsApi.fetchMonthlyReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'OutsideMonthly' }), expect.anything()))
  })

  it('opens on the scope a pasted link carries', async () => {
    reportsApi.fetchMonthlyReport.mockResolvedValue(report())
    await renderPage('/dashboard/monthly?scope=All')

    expect(screen.getByRole('button', { name: 'Hamısı' })).toHaveAttribute('aria-pressed', 'true')
    expect(reportsApi.fetchMonthlyReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'All' }), expect.anything())
    // UI V2 (03 §3.3): «Hamısı» is itself the actual spend, so there is no second question. StrictMode mounts the page
    // twice: one question each time.
    expect(reportsApi.fetchMonthlyReport).toHaveBeenCalledTimes(2)
    for (const query of queries()) {
      expect(query).toEqual({ year: undefined, search: undefined, scope: 'All' })
    }
  })

  it('falls back to the planned material when the address says something it does not know', async () => {
    reportsApi.fetchMonthlyReport.mockResolvedValue(report())
    await renderPage('/dashboard/monthly?scope=Nonsense')

    expect(screen.getByRole('button', { name: 'Aylıq sifarişlər' })).toHaveAttribute('aria-pressed', 'true')
  })
})

/**
 * UI V2 (D-50 №3; 03 §3.3, §6.8.3, UX-12, UX-13): beside another scope, «Ümumi faktiki xərc» is the `scope=All`
 * answer's own figure. That question is asked first, with every main question, without the search and with the main
 * question's year — never kept from an earlier one — and until it is answered the figure reads «…»; when it fails it
 * reads «—» and offers to ask again. Never, in any of these, the figures on the screen added up.
 */
describe('the actual spend beside another scope', () => {
  const planned = () => report({ knownAmount: 428000, monthlyKnownAmount: 428000, outsideMonthlyKnownAmount: 3051.16 })
  const allLines = (overrides: Partial<MonthlyReport> = {}) => report({ knownAmount: 431079.17, ...overrides })

  it('asks for it first, with every main question, without the search — and asks nothing to redraw the answer', async () => {
    servingByScope({ main: planned(), all: allLines() })
    renderAt('/dashboard/monthly?search=meydan')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })

    expectPairs(queries(), { year: undefined, scope: 'All' }, { year: undefined, search: 'meydan', scope: 'Monthly' })

    // A new search asks both again: nothing is kept from the last time, even for the same year.
    reportsApi.fetchMonthlyReport.mockClear()
    await userEvent.clear(searchField())
    await userEvent.type(searchField(), 'Bayıl{Enter}')
    await waitFor(() => expect(queries()).toHaveLength(2))
    expect(queries()).toEqual([
      { year: undefined, scope: 'All' },
      { year: undefined, search: 'Bayıl', scope: 'Monthly' },
    ])

    // A year chosen goes to both questions.
    reportsApi.fetchMonthlyReport.mockClear()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'İl' }), '2025')
    await waitFor(() => expect(queries()).toHaveLength(2))
    expect(queries()).toEqual([
      { year: 2025, scope: 'All' },
      { year: 2025, search: 'Bayıl', scope: 'Monthly' },
    ])
    await waitFor(() => expect(summary().parentElement).not.toHaveAttribute('inert'))

    // How the answer is drawn asks nothing at all.
    reportsApi.fetchMonthlyReport.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'Standart' }))
    expect(currentAddress()).toContain('view=standart')
    expect(reportsApi.fetchMonthlyReport).not.toHaveBeenCalled()
  })

  it('reads «…» until the «All» answer is here, with the other figures already on the screen, never a sum', async () => {
    const asked = answeringByHand()
    renderAt('/dashboard/monthly')
    await answer(open(asked, isMain('Monthly')), planned())
    await screen.findByRole('region', { name: 'İlin xülasəsi' })

    const waitingFor = figure('Ümumi faktiki xərc')
    expect(waitingFor).toHaveTextContent('…')
    expect(within(waitingFor).getByText('Yüklənir…')).toHaveClass('sr-only')
    expect(waitingFor.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(figure('Aylıq sifarişlərin məbləği')).toHaveTextContent('428.000,00 ₼')
    expect(figure('Aylıqdan Kənar sifarişlər')).toHaveTextContent('3.051,16 ₼')
    expect(summary()).not.toHaveTextContent('431.051,16')

    await answer(open(asked, isAll), allLines())

    expect(figure('Ümumi faktiki xərc')).toHaveTextContent('431.079,17 ₼')
    expect(figure('Ümumi faktiki xərc').querySelector('[aria-busy]')).toBeNull()
  })

  it('takes the «All» answer that came first, once the main one says it is the same year', async () => {
    const asked = answeringByHand()
    renderAt('/dashboard/monthly')
    await answer(open(asked, isAll), allLines())
    // The figures wait for the question that was asked, not for the one that answered first.
    expect(screen.queryByRole('region', { name: 'İlin xülasəsi' })).toBeNull()

    await answer(open(asked, isMain('Monthly')), planned())

    expect(figure('Ümumi faktiki xərc')).toHaveTextContent('431.079,17 ₼')
    expect(asked.filter((item) => !item.signal?.aborted)).toHaveLength(2)
  })

  it('reads «—», says it failed and offers to ask again when the «All» answer fails — never a sum', async () => {
    const asked = answeringByHand()
    renderAt('/dashboard/monthly')
    await fail(open(asked, isAll), new ApiError(500, 'Server xətası'))
    await answer(open(asked, isMain('Monthly')), planned())
    await screen.findByRole('region', { name: 'İlin xülasəsi' })

    const failed = figure('Ümumi faktiki xərc')
    expect(failed).toHaveTextContent('—')
    expect(within(failed).getByText('Ümumi faktiki xərc alınmadı.')).toHaveAttribute('role', 'status')
    expect(summary()).not.toHaveTextContent('431.051,16')
    // Only the one figure failed: the year itself is on the screen, and nothing is an error of the page.
    expect(screen.queryByRole('alert')).toBeNull()
    expect(within(table()).getByText('Fəvvarələr meydanı')).toBeInTheDocument()

    // Asked again for the year on the screen, the figure keeps the focus the button had while it waits.
    await userEvent.click(within(failed).getByRole('button', { name: 'Yenidən cəhd et' }))
    const again = open(asked, isAll)
    expect(again.query).toEqual({ year: 2026, scope: 'All' })
    expect(figure('Ümumi faktiki xərc')).toHaveFocus()
    expect(figure('Ümumi faktiki xərc')).toHaveTextContent('…')

    await answer(again, allLines())

    expect(figure('Ümumi faktiki xərc')).toHaveTextContent('431.079,17 ₼')
    expect(screen.queryByText('Ümumi faktiki xərc alınmadı.')).toBeNull()
    expect(within(figure('Ümumi faktiki xərc')).queryByRole('button')).toBeNull()
  })

  it('says it failed when the «All» answer fails after the main one, too', async () => {
    const asked = answeringByHand()
    renderAt('/dashboard/monthly')
    await answer(open(asked, isMain('Monthly')), planned())
    await screen.findByRole('region', { name: 'İlin xülasəsi' })

    await fail(open(asked, isAll), new ApiError(500, 'Server xətası'))

    expect(figure('Ümumi faktiki xərc')).toHaveTextContent('—')
    expect(within(figure('Ümumi faktiki xərc')).getByText('Ümumi faktiki xərc alınmadı.')).toBeInTheDocument()
    expect(within(figure('Ümumi faktiki xərc')).getByRole('button', { name: 'Yenidən cəhd et' })).toBeInTheDocument()
  })

  it('asks again, once, for the main answer’s year when a new year arrived between the two answers', async () => {
    const asked = answeringByHand()
    renderAt('/dashboard/monthly')
    // No year in the address: both questions are about the server's latest, and the latest changed between them.
    await answer(open(asked, isAll), allLines({ year: 2027, availableYears: [2027, 2026, 2025], knownAmount: 999 }))
    await answer(open(asked, isMain('Monthly')), planned())
    await screen.findByRole('region', { name: 'İlin xülasəsi' })

    expect(figure('Ümumi faktiki xərc')).toHaveTextContent('…')
    expect(summary()).not.toHaveTextContent('999,00')
    const again = open(asked, isAll)
    expect(again.query).toEqual({ year: 2026, scope: 'All' })

    await answer(again, allLines())

    expect(figure('Ümumi faktiki xərc')).toHaveTextContent('431.079,17 ₼')
    expect(asked.filter((item) => !item.signal?.aborted && isAll(item.query))).toHaveLength(2)
  })
})

/** UI V2 (03 §6.8.2, §6.8.4): the line under the year's figures, and what the band says while a search is on. */
describe('what the year summary says under its figures', () => {
  /** The approved sentence (D-51, S-4), word for word. */
  const unapprovedIncluded = 'Təsdiqlənməmiş sifarişlər də daxildir; təsdiq gözləyənlər cədvəldə ⏳ ilə işarələnib.'

  function counters(): HTMLElement {
    return within(summary()).getByText('Sifariş').closest('dl') as HTMLElement
  }

  it('counts the orders, the objects and the unpriced lines, neutral when nothing is missing', async () => {
    serving(report({ requestCount: 167, locationCount: 26, missingPriceItemCount: 0 }))
    await renderPage()

    expect(within(counters()).getByText('Sifariş').nextElementSibling).toHaveTextContent('167')
    expect(within(counters()).getByText('Obyekt').nextElementSibling).toHaveTextContent('26')
    const missing = within(counters()).getByText('Qiymət yoxdur')
    expect(missing.nextElementSibling).toHaveTextContent('0')
    expect(missing.closest('div')).not.toHaveClass('text-amber-800')
    expect(summary()).not.toHaveTextContent('Məbləğ tam deyil')
  })

  it('says beside the figures that the money is not complete, and why, when a line has no price (M-05)', async () => {
    serving(report({ missingPriceItemCount: 3, amountIsComplete: false }))
    await renderPage()

    const missing = within(counters()).getByText('Qiymət yoxdur').closest('div') as HTMLElement
    expect(missing).toHaveClass('text-amber-800')
    expect(missing).toHaveTextContent('⚠')
    expect(within(missing).getByText('3')).toBeInTheDocument()
    expect(missing).toHaveTextContent('— Məbləğ tam deyil.')
    expect(missing).toHaveTextContent('Qiyməti olmayan sətirlər bu məbləğə daxil deyil.')
  })

  it.each([
    ['the planned material', '/dashboard/monthly'],
    ['off-plan spending', '/dashboard/monthly?scope=OutsideMonthly'],
    ['all lines', '/dashboard/monthly?scope=All'],
    ['a search', '/dashboard/monthly?search=meydan'],
  ])('always says that orders nobody has approved are in the figures, read as %s (D-51, S-4)', async (_, url) => {
    await renderPage(url)

    const note = within(summary()).getByText((_, element) => element?.tagName === 'P' && element.textContent === unapprovedIncluded)
    // No figure in it, and its sign drawn as an outline in the state's colour — never a colour emoji — and said as
    // the sign to a screen reader, so the words are exactly the approved ones.
    expect(note.textContent).not.toMatch(/\d/)
    const icon = note.querySelector('svg')!
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveClass('text-sky-700')
    expect(within(note).getByText('⏳')).toHaveClass('sr-only')
  })

  it('says the figures are every object’s, which the search does not change, only while a search is on (D-51, S-1)', async () => {
    servingByScope({
      main: report({ filteredLocationCount: 1, locationCount: 26, knownAmount: 428000 }),
      all: report({ knownAmount: 431079.17 }),
    })
    await renderPage('/dashboard/monthly?search=meydan')

    expect(within(summary()).getByText('Bütün obyektlər üzrə — axtarış bu rəqəmləri dəyişmir.')).toBeInTheDocument()
    // The server's figures for every object — not the one row the search left (12.066,00 ₼).
    expect(figure('Aylıq sifarişlərin məbləği')).toHaveTextContent('428.000,00 ₼')
    expect(figure('Ümumi faktiki xərc')).toHaveTextContent('431.079,17 ₼')
    expect(summary()).not.toHaveTextContent('12.066,00')
  })

  it('says nothing about a search when there is none', async () => {
    await renderPage()

    expect(screen.queryByText('Bütün obyektlər üzrə — axtarış bu rəqəmləri dəyişmir.')).toBeNull()
  })
})

/** UI V2 (03 §6.7, 04 §5.3): the questions in one row, each with its name above it. */
describe('the filter row', () => {
  it('names each control by the label above it', async () => {
    await renderPage()

    expect(screen.getByText('İl').tagName).toBe('LABEL')
    expect(screen.getByRole('combobox', { name: 'İl' })).toBeInTheDocument()
    expect(screen.getByText('Obyekt axtar').tagName).toBe('LABEL')
    expect(searchField()).toHaveAttribute('placeholder', 'Obyekt adı…')
    expect(within(screen.getByRole('group', { name: 'Sifariş növü' })).getAllByRole('button')).toHaveLength(3)
    expect(within(screen.getByRole('group', { name: 'Baxış' })).getAllByRole('button').map((button) => button.textContent))
      .toEqual(['Yığcam', 'Standart'])
  })

  it('shows the year the address names, offering it even when the server does not list it, and the answer’s year otherwise', async () => {
    await renderPage('/dashboard/monthly?year=2019')

    const year = screen.getByRole('combobox', { name: 'İl' })
    expect(year).toHaveValue('2019')
    expect(within(year).getAllByRole('option').map((option) => option.textContent)).toEqual(['2026', '2025', '2019'])
  })

  it('shows the answer’s year when the address names none', async () => {
    await renderPage()

    const year = screen.getByRole('combobox', { name: 'İl' })
    expect(year).toHaveValue('2026')
    expect(within(year).getAllByRole('option').map((option) => option.textContent)).toEqual(['2026', '2025'])
  })

  it('opens on «Yığcam» and writes «Standart» over the entry it is on (D-50 №6, AC-01)', async () => {
    renderAt('/dashboard/monthly?year=2026')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })

    expect(screen.getByRole('button', { name: 'Yığcam' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Standart' })).toHaveAttribute('aria-pressed', 'false')

    reportsApi.fetchMonthlyReport.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'Standart' }))

    expect(currentAddress()).toBe('/dashboard/monthly?year=2026&view=standart')
    expect(screen.getByRole('button', { name: 'Standart' })).toHaveAttribute('aria-pressed', 'true')
    expect(reportsApi.fetchMonthlyReport).not.toHaveBeenCalled()

    // The default travels as nothing at all.
    await userEvent.click(screen.getByRole('button', { name: 'Yığcam' }))
    expect(currentAddress()).toBe('/dashboard/monthly?year=2026')

    // One Back leaves the report: neither choice pushed an entry of its own.
    await userEvent.click(screen.getByRole('button', { name: 'Brauzerdə geri' }))
    expect(screen.getByText('Əvvəlki səhifə')).toBeInTheDocument()
  })

  it.each([
    ['standart', 'Standart'],
    ['etrafli', 'Yığcam'],
    ['Standart', 'Yığcam'],
  ])('opens a pasted view=%s as «%s»', async (value, pressed) => {
    await renderPage(`/dashboard/monthly?view=${value}`)

    expect(screen.getByRole('button', { name: pressed })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps «Sıfırla»’s place at the end of the row, hidden and out of reach while there is nothing to put back', async () => {
    await renderPage('/dashboard/monthly?year=2025')

    expect(screen.queryByRole('button', { name: 'Sıfırla' })).toBeNull()
    const reset = screen.getByText('Sıfırla').closest('button')!
    expect(reset).toHaveClass('invisible')
    expect(reset).toHaveAttribute('aria-hidden', 'true')
    expect(reset).toHaveAttribute('tabindex', '-1')
    expect(reset.parentElement!.lastElementChild).toBe(reset)
  })

  it.each([
    ['a search', 'search=meydan'],
    ['a scope', 'scope=OutsideMonthly'],
    ['a view', 'view=standart'],
    ['an order', 'sort=cem-azalan'],
    ['a chosen month', 'cell=21-06'],
  ])('shows «Sıfırla» in the same place when %s is set', async (_, query) => {
    await renderPage(`/dashboard/monthly?year=2026&${query}`)

    const reset = screen.getByRole('button', { name: 'Sıfırla' })
    expect(reset).not.toHaveClass('invisible')
    expect(reset).not.toHaveAttribute('tabindex')
    expect(reset).toHaveAttribute('title', 'Axtarışı, sifariş növünü, baxışı və sıralamanı ilkin vəziyyətə qaytarır.')
    expect(reset.parentElement!.lastElementChild).toBe(reset)
  })

  it('puts back everything but the year, over the entry it is on, and leaves the focus in the search (S-03)', async () => {
    renderAt('/dashboard/monthly?year=2025&search=meydan&scope=All&view=standart&sort=cem-azalan&cell=21-06')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })
    const reset = screen.getByRole('button', { name: 'Sıfırla' })

    await userEvent.click(reset)

    expect(currentAddress()).toBe('/dashboard/monthly?year=2025')
    expect(searchField()).toHaveValue('')
    expect(searchField()).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Aylıq sifarişlər' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Yığcam' })).toHaveAttribute('aria-pressed', 'true')
    // The same button, hidden in its place: nothing beside it moved.
    expect(screen.queryByRole('button', { name: 'Sıfırla' })).toBeNull()
    expect(screen.getByText('Sıfırla').closest('button')).toBe(reset)
    await waitFor(() => expect(reportsApi.fetchMonthlyReport)
      .toHaveBeenLastCalledWith({ year: 2025, search: undefined, scope: 'Monthly' }, expect.anything()))

    await userEvent.click(screen.getByRole('button', { name: 'Brauzerdə geri' }))
    expect(screen.getByText('Əvvəlki səhifə')).toBeInTheDocument()
  })
})

/** UI V2 (03 §6.6, DK-03, DK-23): how many objects a search left, said in one place at every width. */
describe('how many objects a search left', () => {
  it('is one region under the filters that stays in the page, only its words changing', async () => {
    serving(report({ filteredLocationCount: 1, locationCount: 26 }))
    renderAt('/dashboard/monthly?search=meydan')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })
    const count = screen.getByText('1 / 26 obyekt')

    // An empty Enter clears the search; the region stays, with nothing in it.
    serving(report())
    await userEvent.clear(searchField())
    await userEvent.type(searchField(), '{Enter}')
    await waitFor(() => expect(currentAddress()).toBe('/dashboard/monthly'))
    await waitFor(() => expect(count).toBeEmptyDOMElement())
    expect(count).toBeInTheDocument()
    expect(count).toHaveAttribute('role', 'status')
  })

  it('says 0 of them, with the figures and the filters still there, when nothing matches', async () => {
    serving(report({ rows: [], filteredLocationCount: 0, locationCount: 26 }))
    await renderPage('/dashboard/monthly?search=xyz')

    expect(screen.getByText('0 / 26 obyekt')).toHaveAttribute('role', 'status')
    expect(screen.getByText('Axtarışa uyğun obyekt tapılmadı.')).toBeInTheDocument()
    expect(summary()).toBeInTheDocument()
    expect(searchField()).toHaveValue('xyz')
    expect(screen.getByRole('button', { name: 'Sıfırla' })).toBeInTheDocument()
  })
})

/**
 * UI V2 (DK-04; 03 §3.5, §7, UX-20): while the next answer is on its way the last one stays on the screen — dimmed,
 * out of reach, and in the words of the question it answered — and the controls already say the new question.
 */
describe('an answer on its way', () => {
  async function firstAnswer(asked: Asked[]) {
    await answer(open(asked, isAll), report({ knownAmount: 431079.17 }))
    await answer(open(asked, isMain('Monthly')), report({ knownAmount: 428000, monthlyKnownAmount: 428000 }))
    await screen.findByRole('region', { name: 'İlin xülasəsi' })
  }

  function waitingStatus(): HTMLElement | null {
    return screen.queryByText('Yüklənir…', { selector: '[role="status"]' })
  }

  it('keeps the last answer in its own scope’s words, dimmed and out of reach, while the controls say the new one', async () => {
    const asked = answeringByHand()
    renderAt('/dashboard/monthly')
    await firstAnswer(asked)

    await userEvent.click(screen.getByRole('button', { name: 'Aylıqdan kənar' }))

    expect(screen.getByRole('button', { name: 'Aylıqdan kənar' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(summary()).getByRole('heading', { name: 'Aylıq sifarişlərin məbləği' })).toBeInTheDocument()
    expect(figure('Aylıq sifarişlərin məbləği')).toHaveTextContent('428.000,00 ₼')
    expect(figure('Ümumi faktiki xərc')).toHaveTextContent('431.079,17 ₼')
    for (const part of [summary().parentElement!, table().closest('.lg\\:block')!.parentElement!]) {
      expect(part).toHaveAttribute('inert')
      expect(part).toHaveClass('opacity-60')
    }
    expect(waitingStatus()).toBeInTheDocument()

    await answer(open(asked, isAll), report({ knownAmount: 431079.17 }))
    await answer(open(asked, isMain('OutsideMonthly')), report({ knownAmount: 3051.16, monthlyKnownAmount: 428000 }))

    expect(within(summary()).getByRole('heading', { name: 'Aylıqdan kənar xərclər' })).toBeInTheDocument()
    expect(figure('Aylıqdan kənar xərclər')).toHaveTextContent('3.051,16 ₼')
    expect(summary().parentElement).not.toHaveAttribute('inert')
    expect(table().closest('[inert]')).toBeNull()
    expect(waitingStatus()).toBeNull()
  })

  it('shows the chosen year in its select at once, and the last year’s answer until the new one is here', async () => {
    const asked = answeringByHand()
    renderAt('/dashboard/monthly')
    await firstAnswer(asked)

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'İl' }), '2025')

    expect(screen.getByRole('combobox', { name: 'İl' })).toHaveValue('2025')
    expect(within(table()).getByRole('link', { name: /Yanvar 2026/ })).toBeInTheDocument()
    expect(within(totalsRow()).getByRole('rowheader', { name: 'Cəmi' })).toBeInTheDocument()
    expect(table().closest('[inert]')).not.toBeNull()

    const year2025 = (data: MonthlyReport) => ({
      ...data,
      year: 2025,
      rows: [row({ months: Array.from({ length: 12 }, (_, index) => cell(index + 1, { period: `2025-${String(index + 1).padStart(2, '0')}-01` })) })],
    })
    await answer(open(asked, isAll), year2025(report()))
    await answer(open(asked, isMain('Monthly')), year2025(report()))

    expect(within(table()).getByRole('link', { name: /Yanvar 2025/ })).toBeInTheDocument()
    expect(table().closest('[inert]')).toBeNull()
  })

  it('says the last answer’s search, not the one just typed, until the new answer is here', async () => {
    const asked = answeringByHand()
    renderAt('/dashboard/monthly')
    await firstAnswer(asked)

    await userEvent.type(searchField(), 'meydan{Enter}')

    expect(searchField()).toHaveValue('meydan')
    expect(screen.queryByText('Bütün obyektlər üzrə — axtarış bu rəqəmləri dəyişmir.')).toBeNull()
    expect(screen.queryByText(/ obyekt$/)).toBeNull()

    await answer(open(asked, isAll), report({ knownAmount: 431079.17 }))
    await answer(open(asked, isMain('Monthly')), report({ filteredLocationCount: 1, locationCount: 26 }))

    expect(within(summary()).getByText('Bütün obyektlər üzrə — axtarış bu rəqəmləri dəyişmir.')).toBeInTheDocument()
    expect(screen.getByText('1 / 26 obyekt')).toBeInTheDocument()
  })

  it('takes the last answer away and says what went wrong when the new question fails', async () => {
    const asked = answeringByHand()
    renderAt('/dashboard/monthly')
    await firstAnswer(asked)

    await userEvent.click(screen.getByRole('button', { name: 'Hamısı' }))
    await fail(open(asked, isMain('All')), new ApiError(500, 'Hesabat hazırlanmadı'))

    expect(screen.getByRole('alert')).toHaveTextContent('Hesabat hazırlanmadı')
    expect(screen.queryByRole('region', { name: 'İlin xülasəsi' })).toBeNull()
    expect(document.querySelector('table')).toBeNull()
    expect(waitingStatus()).toBeNull()
    // The questions can still be changed.
    expect(screen.getByRole('button', { name: 'Hamısı' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(screen.getByRole('combobox', { name: 'İl' })).getByRole('option', { name: '2025' })).toBeInTheDocument()
  })
})

// ---- UI V2, phase C: the table ------------------------------------------------------------------------------

/** The table's box: the element that scrolls it sideways. */
function scrollBox(): HTMLElement {
  return table().parentElement!
}

/** The rows of the table, by the object each one names. */
function tableOrder(): string[] {
  return [...table().querySelectorAll('tbody tr')].map((element) =>
    within(element as HTMLElement).getByRole('rowheader').textContent ?? '')
}

/** The phone cards, by the id each one carries. */
function cardOrder(): string[] {
  return [...phoneList().querySelectorAll('li[id$="-phone"]')].map((element) => element.id)
}

function rect(left: number, width: number): DOMRect {
  return { left, width, right: left + width, top: 0, bottom: 40, height: 40, x: left, y: 0, toJSON: () => ({}) } as DOMRect
}

/**
 * The box and its header cells as a browser lays them out in a 1280-pixel window (03 §4.1; D-51): the object 120, the
 * months 74 («Yığcam») or 106 («Standart»), the year 88, the box `clientWidth` wide. jsdom lays nothing out.
 */
function layOut(clientWidth: number): HTMLElement {
  const box = scrollBox()
  const month = () => (table().className.includes('min-w-[1480px]') ? 106 : 74)
  Object.defineProperty(box, 'clientWidth', { configurable: true, get: () => clientWidth })
  Object.defineProperty(box, 'scrollWidth', { configurable: true, get: () => 120 + 12 * month() + 88 })
  box.getBoundingClientRect = () => rect(0, clientWidth)

  const cells = [...table().tHead!.rows[0].cells]
  cells[0].getBoundingClientRect = () => rect(0, 120)
  cells.slice(1, 13).forEach((header, index) => {
    header.getBoundingClientRect = () => rect(120 + index * month() - box.scrollLeft, month())
  })
  cells[13].getBoundingClientRect = () => rect(clientWidth - 88, 88)
  return box
}

/** IntersectionObserver driven by hand: jsdom has none. */
class ObserverStub {
  static all: ObserverStub[] = []
  readonly targets: Element[] = []

  constructor(readonly callback: IntersectionObserverCallback, readonly options: IntersectionObserverInit = {}) {
    ObserverStub.all.push(this)
  }

  observe(target: Element) {
    this.targets.push(target)
  }

  unobserve() {}

  disconnect() {
    this.targets.length = 0
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

/** Tells every observer watching `target` where it now is. */
function intersect(target: Element, { top = 0, isIntersecting = true }: { top?: number; isIntersecting?: boolean }) {
  for (const observer of ObserverStub.all.filter((item) => item.targets.includes(target))) {
    const entry = { target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0, boundingClientRect: rect(0, 0) }
    entry.boundingClientRect = { ...entry.boundingClientRect, top } as DOMRect
    observer.callback([entry as unknown as IntersectionObserverEntry], observer as unknown as IntersectionObserver)
  }
}

/** UI V2 (D-50 №6; AC-01–AC-03; 03 §6.2): «Yığcam» by default, «Standart» from the address, drawn at once. */
describe('the two views of a month', () => {
  const moved = () => report({
    rows: [row({
      months: [
        cell(1, { deltaPercent: 12.5, deltaAmount: 125 }),
        ...Array.from({ length: 4 }, (_, index) => cell(index + 2)),
        cell(6, { knownAmount: 36010.19, isUnusual: true, recentAverageKnownAmount: 14458.58, recentAveragePercent: 149.06, deltaPercent: 40 }),
        ...Array.from({ length: 6 }, (_, index) => cell(index + 7)),
      ],
    })],
  })

  it('draws «Standart» at once when it is chosen — table, cards and legend — and asks the server nothing', async () => {
    serving(moved())
    renderAt('/dashboard/monthly')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })

    expect(within(table()).queryByText('+12,5%')).toBeNull()
    expect(within(phoneList()).queryByText('+12,5%')).toBeNull()

    reportsApi.fetchMonthlyReport.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'Standart' }))

    expect(within(table()).getByText('+12,5%')).toHaveClass('text-red-700')
    expect(within(phoneList()).getByText('+12,5%')).toHaveClass('text-red-700')
    expect(screen.getByRole('list', { name: 'Cədvəldəki işarələr' })).toHaveTextContent('Faiz — əvvəlki aya görə')
    expect(screen.getByRole('list', { name: 'Kartlardakı işarələr' })).toHaveTextContent('Faiz — əvvəlki aya görə')
    expect(table().className).toContain('min-w-[1480px]')
    expect(reportsApi.fetchMonthlyReport).not.toHaveBeenCalled()
  })

  it('puts an unusual month’s ▲ after the marks in «Yığcam», and before the amount in «Standart», never beside a percentage', async () => {
    serving(moved())
    const compact = renderAt('/dashboard/monthly')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })

    let june = within(table()).getByRole('link', { name: /İyun 2026/ })
    let [amountLine, marksLine] = [...june.children] as HTMLElement[]
    expect(amountLine).not.toHaveTextContent('▲')
    expect(marksLine).toHaveTextContent('▲')
    expect(june).not.toHaveTextContent('%')
    compact.unmount()

    serving(moved())
    renderAt('/dashboard/monthly?view=standart')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })
    june = within(table()).getByRole('link', { name: /İyun 2026/ })
    ;[amountLine, marksLine] = [...june.children] as HTMLElement[]
    expect(amountLine.firstElementChild).toHaveTextContent('▲')
    expect(amountLine).toHaveTextContent('36.010,19 ₼')
    // The line under it says the change on the month before; the change on the average is never in a cell (M-04).
    expect(marksLine).toHaveTextContent('+40%')
    expect(marksLine).not.toHaveTextContent('▲')
    expect(june).not.toHaveTextContent('+149,06%')
    expect(june).toHaveAccessibleName(expect.stringContaining('fərq +149,06%') as unknown as string)
  })
})

/** UI V2 (DK-05; D-51: S-3 = grey, the meaning of the marks unchanged): the product's own signs, shape and colour. */
describe('the status marks', () => {
  it('marks approved ✓ grey, awaiting ⏳ sky blue — never a colour emoji — returned ↩ amber, and leaves undecided unmarked', async () => {
    serving(report({
      rows: [row({
        months: [
          cell(1, { status: 'Approved' }),
          cell(2, { status: 'PendingApproval' }),
          cell(3, { status: 'ReturnedForCorrection' }),
          cell(4, { status: 'Draft' }),
          ...Array.from({ length: 8 }, (_, index) => cell(index + 5)),
        ],
      })],
    }))
    await renderPage()

    for (const scope of [table(), phoneList()]) {
      const [approved, pending, returned, draft] = ['Yanvar', 'Fevral', 'Mart', 'Aprel']
        .map((month) => within(scope).getByRole('link', { name: new RegExp(`${month} 2026`) }))

      const check = approved.querySelector('[data-status-mark="Approved"]')!
      expect(check).toHaveTextContent('✓')
      expect(check).toHaveClass('text-on-surface-variant')
      expect(check).toHaveAttribute('aria-hidden', 'true')

      const hourglass = pending.querySelector('[data-status-mark="PendingApproval"]')!
      expect(hourglass.tagName.toLowerCase()).toBe('svg')
      expect(hourglass).toHaveClass('text-sky-700')
      expect(pending.textContent).not.toContain('⏳')

      const back = returned.querySelector('[data-status-mark="ReturnedForCorrection"]')!
      expect(back.textContent).toBe('↩︎')
      expect(back).toHaveClass('text-amber-800')

      expect(draft.querySelector('[data-status-mark]')).toBeNull()

      // The words are the product's, as before: the marks mean what they meant.
      expect(approved).toHaveAccessibleName(expect.stringMatching(/ · Təsdiqlənib$/) as unknown as string)
      expect(pending).toHaveAccessibleName(expect.stringMatching(/ · Təsdiq gözləyir$/) as unknown as string)
      expect(returned).toHaveAccessibleName(expect.stringMatching(/ · Düzəliş tələb olunur$/) as unknown as string)
      expect(draft).toHaveAccessibleName(expect.stringMatching(/ · Təsdiqlənməyib$/) as unknown as string)
    }
  })
})

/** UI V2 (S-02, AC-07; 03 §6.4): by name or by the year's total, from the server's own figures, in the address. */
describe('ordering the objects', () => {
  const totals = () => report({
    rows: [
      row({ locationId: 1, locationName: 'Bayıl yolu', knownAmount: 500 }),
      row({
        locationId: 2,
        locationName: 'Çadır',
        knownAmount: null,
        hasAnyRequest: false,
        months: Array.from({ length: 12 }, (_, index) => noRequest(index + 1)),
      }),
      row({ locationId: 3, locationName: 'Fəvvarələr meydanı', knownAmount: 1200 }),
      row({ locationId: 4, locationName: 'Heydər Əliyev', knownAmount: 500 }),
      row({ locationId: 5, locationName: 'Xətai', knownAmount: null }),
    ],
  })

  function header(name: string): HTMLElement {
    return within(table()).getByRole('columnheader', { name })
  }

  it('opens by name, A–Z — the server’s order — and says so on the «Obyekt» header only', async () => {
    serving(totals())
    await renderPage()

    expect(tableOrder()).toEqual(['Bayıl yolu', 'Çadır', 'Fəvvarələr meydanı', 'Heydər Əliyev', 'Xətai'])
    expect(header('Obyekt')).toHaveAttribute('aria-sort', 'ascending')
    expect(header('İl cəmi')).not.toHaveAttribute('aria-sort')
    expect(screen.getByRole('button', { name: 'Obyekt' })).toHaveClass('font-semibold')
  })

  it('turns the names round on «Obyekt», over the entry it is on, without asking the server', async () => {
    serving(totals())
    renderAt('/dashboard/monthly')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })
    reportsApi.fetchMonthlyReport.mockClear()

    await userEvent.click(screen.getByRole('button', { name: 'Obyekt' }))

    expect(currentAddress()).toBe('/dashboard/monthly?sort=ad-azalan')
    expect(tableOrder()).toEqual(['Xətai', 'Heydər Əliyev', 'Fəvvarələr meydanı', 'Çadır', 'Bayıl yolu'])
    expect(cardOrder()).toEqual(['row-5-phone', 'row-4-phone', 'row-3-phone', 'row-2-phone', 'row-1-phone'])
    expect(header('Obyekt')).toHaveAttribute('aria-sort', 'descending')
    // The company's month stays last, and the focus where the reader pressed.
    expect(within(table().rows[table().rows.length - 1]).getByRole('rowheader', { name: 'Cəmi' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Obyekt' })).toHaveFocus()
    expect(reportsApi.fetchMonthlyReport).not.toHaveBeenCalled()

    // And back to A–Z on the next press: the button always does something (D-S3).
    await userEvent.click(screen.getByRole('button', { name: 'Obyekt' }))
    expect(currentAddress()).toBe('/dashboard/monthly')
    expect(tableOrder()[0]).toBe('Bayıl yolu')

    // One Back leaves the report.
    await userEvent.click(screen.getByRole('button', { name: 'Brauzerdə geri' }))
    expect(screen.getByText('Əvvəlki səhifə')).toBeInTheDocument()
  })

  it('orders by the year’s total on «İl cəmi», largest first then smallest, objects without one last both ways', async () => {
    serving(totals())
    renderAt('/dashboard/monthly')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })

    await userEvent.click(screen.getByRole('button', { name: 'İl cəmi' }))
    expect(currentAddress()).toBe('/dashboard/monthly?sort=cem-azalan')
    // Equal totals (Bayıl yolu, Heydər Əliyev) keep the server's order; Çadır and Xətai have none and go last.
    expect(tableOrder()).toEqual(['Fəvvarələr meydanı', 'Bayıl yolu', 'Heydər Əliyev', 'Çadır', 'Xətai'])
    expect(cardOrder()).toEqual(['row-3-phone', 'row-1-phone', 'row-4-phone', 'row-2-phone', 'row-5-phone'])
    expect(header('İl cəmi')).toHaveAttribute('aria-sort', 'descending')
    expect(header('Obyekt')).not.toHaveAttribute('aria-sort')

    await userEvent.click(screen.getByRole('button', { name: 'İl cəmi' }))
    expect(currentAddress()).toBe('/dashboard/monthly?sort=cem-artan')
    expect(tableOrder()).toEqual(['Bayıl yolu', 'Heydər Əliyev', 'Fəvvarələr meydanı', 'Çadır', 'Xətai'])
    expect(header('İl cəmi')).toHaveAttribute('aria-sort', 'ascending')
  })

  it('opens on the order a pasted link carries, and on A–Z when it says something it does not know', async () => {
    serving(totals())
    const pasted = renderAt('/dashboard/monthly?sort=cem-artan')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })
    expect(tableOrder()).toEqual(['Bayıl yolu', 'Heydər Əliyev', 'Fəvvarələr meydanı', 'Çadır', 'Xətai'])
    pasted.unmount()

    serving(totals())
    await renderPage('/dashboard/monthly?sort=nonsense')
    expect(tableOrder()[0]).toBe('Bayıl yolu')
    expect(header('Obyekt')).toHaveAttribute('aria-sort', 'ascending')
  })

  it('offers the same four orders below lg, on a select named «Sıralama», and orders the cards by it', async () => {
    serving(totals())
    renderAt('/dashboard/monthly')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })

    const select = screen.getByRole('combobox', { name: 'Sıralama' })
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Ada görə: A–Z', 'Ada görə: Z–A', 'İl cəminə görə: çoxdan aza', 'İl cəminə görə: azdan çoxa',
    ])
    expect(select).toHaveValue('NameAsc')

    await userEvent.selectOptions(select, 'İl cəminə görə: çoxdan aza')

    expect(currentAddress()).toBe('/dashboard/monthly?sort=cem-azalan')
    expect(cardOrder()).toEqual(['row-3-phone', 'row-1-phone', 'row-4-phone', 'row-2-phone', 'row-5-phone'])
    expect(screen.getByRole('combobox', { name: 'Sıralama' })).toHaveValue('TotalDesc')
  })
})

/** UI V2 (D-51, S-2a = A; 03 §4.3, §6.3; DK-23-3, DK-27): the months' names kept in sight over a box that scrolls. */
describe('the floating header', () => {
  beforeEach(() => {
    ObserverStub.all = []
  })
  afterEach(() => vi.unstubAllGlobals())

  function floatingHeader(): HTMLElement {
    return document.querySelector<HTMLElement>('[data-floating-header]')!
  }

  it('is a hidden picture of the header: not a table to a screen reader, and out of the keyboard’s way', async () => {
    await renderPage()

    expect(floatingHeader()).toHaveAttribute('aria-hidden', 'true')
    expect(floatingHeader()).toHaveAttribute('hidden')
    for (const button of floatingHeader().querySelectorAll('button')) {
      expect(button).toHaveAttribute('tabindex', '-1')
    }

    expect(floatingHeader().querySelectorAll('[id]')).toHaveLength(0)
    expect(screen.getAllByRole('table')).toEqual([table()])
    expect(within(table()).getAllByRole('columnheader')).toHaveLength(14)
  })

  it('shows while the table’s own header is above the application header and rows are still under it', async () => {
    vi.stubGlobal('IntersectionObserver', ObserverStub)
    await renderPage()
    const head = table().tHead!

    // Watching the header against the line under the 72-pixel application header, and the rows against the copy's foot.
    const headerWatch = ObserverStub.all.find((observer) => observer.targets.includes(head))!
    const rowsWatch = ObserverStub.all.find((observer) => observer.targets.includes(table()))!
    expect(headerWatch.options.rootMargin).toBe('-72px 0px 0px 0px')
    expect(rowsWatch.options.rootMargin).toBe('-124px 0px 0px 0px')

    act(() => {
      intersect(head, { top: 30, isIntersecting: false })
      intersect(table(), { isIntersecting: true })
    })
    expect(floatingHeader()).not.toHaveAttribute('hidden')

    // The real header back in sight below the line (a sort button the keyboard returns to stops at 84 pixels).
    act(() => intersect(head, { top: 84 }))
    expect(floatingHeader()).toHaveAttribute('hidden')

    // Scrolled past the table: no rows under the copy, so no copy.
    act(() => {
      intersect(head, { top: -900, isIntersecting: false })
      intersect(table(), { isIntersecting: false })
    })
    expect(floatingHeader()).toHaveAttribute('hidden')
  })

  it('passes a click on its sort button to the real one: the order changes and the focus is on the real button', async () => {
    vi.stubGlobal('IntersectionObserver', ObserverStub)
    renderAt('/dashboard/monthly')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })
    act(() => {
      intersect(table().tHead!, { top: 30, isIntersecting: false })
      intersect(table(), { isIntersecting: true })
    })

    await userEvent.click(floatingHeader().querySelector<HTMLButtonElement>('[data-sort-button="total"]')!)

    expect(currentAddress()).toBe('/dashboard/monthly?sort=cem-azalan')
    expect(screen.getByRole('button', { name: 'İl cəmi' })).toHaveFocus()
    expect(floatingHeader()).not.toContainElement(document.activeElement as HTMLElement)
  })

  it('moves sideways with the table’s box, and its bar moves the box', async () => {
    await renderPage()
    const box = layOut(937)
    box.dispatchEvent(new Event('scroll'))

    const copy = floatingHeader().querySelector<HTMLElement>('.overflow-x-hidden')!
    box.scrollLeft = 150
    box.dispatchEvent(new Event('scroll'))
    expect(copy.scrollLeft).toBe(150)

    // The thin bar under the copy: only while the box scrolls, as wide as the months, out of the keyboard's way.
    const bar = await waitFor(() => {
      const element = floatingHeader().querySelector<HTMLElement>('div[tabindex="-1"]')
      expect(element).not.toBeNull()
      return element!
    })
    expect(bar).toHaveClass('ml-30', 'mr-22')
    expect((bar.firstElementChild as HTMLElement).style.width).toBe(`${12 * 74}px`)
    bar.scrollLeft = 60
    bar.dispatchEvent(new Event('scroll'))
    expect(box.scrollLeft).toBe(60)
  })
})

/** UI V2 (03 §4.1, §4.3; UX-02, UX-04): which months are in sight, a page either way, and where the box opens. */
describe('the months above the table', () => {
  /** Orders up to October, none in November and December (the 2026-10-15 state 03 §4.1 is measured on). */
  const untilOctober = () => report({
    months: Array.from({ length: 12 }, (_, index) => companyMonth(index + 1, index < 10 ? {} : { locationsWithRequest: 0, knownAmount: null })),
  })

  it('shows no buttons while every month is in sight', async () => {
    await renderPage()

    expect(screen.queryByRole('button', { name: 'Əvvəlki aylar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sonrakı aylar' })).toBeNull()
  })

  it('opens on the latest month with orders beside the year, says which months are in sight, and moves a page either way', async () => {
    serving(untilOctober())
    renderAt('/dashboard/monthly')
    await screen.findByRole('region', { name: 'İlin xülasəsi' })

    // A 1280-pixel window: the box is 937 pixels, nine and a bit 74-pixel months.
    const box = layOut(937)
    box.dispatchEvent(new Event('scroll'))
    const previous = await screen.findByRole('button', { name: 'Əvvəlki aylar' })
    const next = screen.getByRole('button', { name: 'Sonrakı aylar' })
    expect(screen.getByText('Yanvar–Sentyabr 2026')).toBeInTheDocument()
    expect(previous).toHaveAttribute('aria-disabled', 'true')
    expect(next).not.toHaveAttribute('aria-disabled')

    // A new view opens the box again where it opens: October wholly in sight beside the year — May–October at 106.
    await userEvent.click(screen.getByRole('button', { name: 'Standart' }))
    expect(box.scrollLeft).toBe(424)
    expect(screen.getByText('May–Oktyabr 2026')).toBeInTheDocument()

    // February–October in «Yığcam», January hidden and November only in part (03 §4.1, S-2b = 12 px).
    await userEvent.click(screen.getByRole('button', { name: 'Yığcam' }))
    expect(box.scrollLeft).toBe(74)
    expect(screen.getByText('Fevral–Oktyabr 2026')).toBeInTheDocument()

    await userEvent.click(previous)
    expect(box.scrollLeft).toBe(0)
    expect(screen.getByText('Yanvar–Sentyabr 2026')).toBeInTheDocument()
    expect(previous).toHaveAttribute('aria-disabled', 'true')
    // At the start it stays where it is, and keeps the focus.
    await userEvent.click(previous)
    expect(box.scrollLeft).toBe(0)
    expect(previous).toHaveFocus()

    await userEvent.click(next)
    expect(box.scrollLeft).toBe(159)
    expect(screen.getByText('Aprel–Dekabr 2026')).toBeInTheDocument()
    expect(next).toHaveAttribute('aria-disabled', 'true')
    expect(previous).not.toHaveAttribute('aria-disabled')
  })
})

/** UI V2 (AC-14, B-07): the page never scrolls sideways; only the table's box does. */
describe('the width of the page', () => {
  it('keeps every minimum width inside a box that scrolls or clips, and nothing around the box wider than the page', async () => {
    await renderPage('/dashboard/monthly?view=standart')

    // The table and its floating copy, 1480 pixels each.
    const widened = withClass(document, 'min-w-[')
    expect(widened).toHaveLength(2)
    for (const element of widened) {
      expect(element.closest('.overflow-x-auto, .overflow-x-hidden')).not.toBeNull()
    }

    expect([...document.querySelectorAll('.overflow-x-auto')]).toEqual([scrollBox()])
    for (let node = scrollBox().parentElement; node !== null; node = node.parentElement) {
      expect(node.getAttribute('class') ?? '').not.toMatch(/overflow-x-|min-w-\[|w-screen|-mx-/)
    }
  })
})

/** UI V2 (DK-01, DK-26, DK-27; 03 §6.3, §8): the keyboard's focus is never hidden under a pinned or floating part. */
describe('keeping the keyboard’s focus in sight', () => {
  it('stops a month reached by Tab between the pinned columns', async () => {
    await renderPage()

    expect(scrollBox()).toHaveClass('scroll-pl-30', 'scroll-pr-22', '[scroll-snap-type:x_proximity]')
    for (const header of [...table().tHead!.rows[0].cells].slice(1, 13)) {
      expect(header).toHaveClass('snap-start')
    }
  })

  it('stops a row’s links under the application header, the floating header and its bar', async () => {
    await renderPage()

    const links = [...table().querySelectorAll('tbody a')]
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      // 72 + 40 + 12 = 124 pixels above, 16 below.
      expect(link).toHaveClass('scroll-mt-31', 'scroll-mb-4')
    }
  })

  it('stops the header’s sort buttons at 84 pixels, below the line the floating copy appears at', async () => {
    await renderPage()

    for (const name of ['Obyekt', 'İl cəmi']) {
      expect(screen.getByRole('button', { name })).toHaveClass('scroll-mt-21')
    }
  })

  it('keeps the controls above the table under the 72-pixel application header', async () => {
    await renderPage('/dashboard/monthly?search=meydan')

    const controls = [
      screen.getByRole('combobox', { name: 'İl' }),
      screen.getByRole('combobox', { name: 'Sıralama' }),
      searchField(),
      ...within(screen.getByRole('group', { name: 'Sifariş növü' })).getAllByRole('button'),
      ...within(screen.getByRole('group', { name: 'Baxış' })).getAllByRole('button'),
      screen.getByRole('button', { name: 'Sıfırla' }),
    ]
    for (const control of controls) {
      expect(control).toHaveClass('scroll-mt-18')
    }
  })
})

/** UI V2 (DK-15, DK-23; 03 §6.1, §6.6): the table is named on the screen, by the heading above it. */
describe('the table’s name', () => {
  it('is the heading above it, which the page’s header no longer repeats', async () => {
    await renderPage()

    const heading = screen.getByRole('heading', { level: 2, name: 'Obyektlər üzrə aylıq sifariş məbləğləri' })
    const named = screen.getByRole('table', { name: 'Obyektlər üzrə aylıq sifariş məbləğləri' })
    expect(named).toBe(table())
    expect(named).toHaveAttribute('aria-labelledby', heading.id)
    expect(named.querySelector('caption')).toBeNull()
    expect(screen.getAllByText('Obyektlər üzrə aylıq sifariş məbləğləri')).toEqual([heading])
    expect(screen.queryByText('Obyektlərin bir il ərzindəki sifariş məbləğləri')).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Aylıq hesabat' }).parentElement!.querySelector('p')).toBeNull()
  })
})

/** UI V2 (03 §4.5–§4.6, AC-15, AC-16): every card target is a finger's height, every mark the table has. */
describe('the cards below the table’s width', () => {
  afterEach(() => vi.useRealTimers())

  it('gives the object’s name and every month a finger’s height', async () => {
    serving(report({
      rows: [row({ months: [...Array.from({ length: 9 }, (_, index) => cell(index + 1)), noRequest(10), noRequest(11), noRequest(12)] })],
    }))
    today(new Date(2026, 8, 24))
    await renderPage()

    const card = document.getElementById('row-21-phone')!
    for (const link of within(card).getAllByRole('link')) {
      expect(link).toHaveClass('min-h-11')
    }
    expect(within(card).getByLabelText('Fəvvarələr meydanı · Oktyabr 2026: gələcək ay')).toHaveClass('min-h-11')
  })
})

/** UI V2 (03 §7): a year the system has no order for says so — it is not a search that found nothing. */
describe('a year with no orders', () => {
  it('says so in place of the table and the cards, with the figures as dashes and the year still chosen', async () => {
    serving(report({
      year: 2024,
      availableYears: [2026, 2025],
      requestCount: 0,
      knownAmount: null,
      months: Array.from({ length: 12 }, (_, index) => companyMonth(index + 1, { locationsWithRequest: 0, knownAmount: null })),
      rows: [row({ knownAmount: null, hasAnyRequest: false, months: Array.from({ length: 12 }, (_, index) => noRequest(index + 1)) })],
    }))
    await renderPage('/dashboard/monthly?year=2024')

    expect(screen.getByText('Bu il üçün sistemdə sifariş yoxdur.')).toBeInTheDocument()
    expect(screen.queryByText('Axtarışa uyğun obyekt tapılmadı.')).toBeNull()
    expect(document.querySelector('table')).toBeNull()
    expect(screen.queryByRole('list', { name: 'Kartlardakı işarələr' })).toBeNull()
    expect(figure('Aylıq sifarişlərin məbləği')).toHaveTextContent('—')
    expect(screen.getByRole('combobox', { name: 'İl' })).toHaveValue('2024')
  })
})
