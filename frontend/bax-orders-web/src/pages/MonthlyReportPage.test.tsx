import { StrictMode } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MonthlyReport, MonthlyReportCell, MonthlyReportMonth, MonthlyReportRow } from '../api/reports'
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
  await screen.findByRole('group', { name: 'İlin xülasəsi' })
}

function table() {
  return document.querySelector('table')!
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
    expect(cells[0]).toHaveAttribute('href', '/orders/101')
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
    serving(report({
      rows: [row({
        months: [
          cell(1, { missingPriceItemCount: 2, amountIsComplete: false, deltaPercent: 12.5 }),
          ...Array.from({ length: 11 }, (_, index) => cell(index + 2)),
        ],
      })],
    }))
    await renderPage()

    // A sentence twelve times to a row would drown the money, so the cell shows a count and explains itself.
    const link = within(table()).getByRole('link', { name: /Yanvar 2026/ })
    expect(within(link).getByText('⚠ 2')).toBeInTheDocument()
    // The partial figure still moved, and the reader needs both (brief: "⚠ və faiz eyni hücrədə").
    expect(within(link).getByText('+12,5%')).toBeInTheDocument()
    expect(link).toHaveAccessibleName(expect.stringContaining('2 sətirdə qiymət yoxdur') as unknown as string)
    expect(link).toHaveAttribute('title', expect.stringContaining('2 sətirdə qiymət yoxdur') as unknown as string)
  })

  it('keeps the location column pinned while the months scroll', async () => {
    await renderPage()

    const header = within(table()).getByRole('columnheader', { name: 'Obyekt' })
    expect(header.className).toContain('sticky')
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
      { year: 2025, search: 'meydan' },
      expect.anything(),
    )
  })

  it('says how much of the catalogue a search left, without shrinking the totals', async () => {
    serving(report({ filteredLocationCount: 1, locationCount: 26 }))
    await renderPage('/dashboard/monthly?search=meydan')

    expect(screen.getByText('1 / 26 obyekt')).toBeInTheDocument()
    const summary = screen.getByRole('group', { name: 'İlin xülasəsi' })
    expect(within(summary).getByText('26')).toBeInTheDocument()
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
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
    expect(phoneView()).toHaveClass('lg:hidden')
    expect(monthGrid(card('Fəvvarələr meydanı'))).toHaveLength(12)
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
    expect(january).toHaveAttribute('href', '/orders/101')
    expect(january.getAttribute('href')).not.toContain('basis')
    const amount = within(january).getByText('1.001,00 ₼')
    // Kept to its ₼ by a no-break space (Task 5), and on one line.
    expect(amount.textContent).toBe(`1.001,00${nbsp}₼`)
    expect(amount.className).toContain('whitespace-nowrap')
    expect(amount.className).toContain('tabular-nums')

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
    expect(within(june).getByText('36.010,19 ₼').className).toContain('font-semibold')

    const july = within(phone).getByRole('link', { name: /İyul 2026/ })
    expect(july.className).toContain('bg-emerald-50')

    const august = within(phone).getByRole('link', { name: /Avqust 2026/ })
    expect(august.className).not.toMatch(/bg-red-50|bg-emerald-50/)

    // The same direction on the strip; the ordinary months stay grey.
    const bars = strip(phone)
    expect(bars[5]).toHaveClass('bg-red-500')
    expect(bars[6]).toHaveClass('bg-emerald-500')
    expect(bars[7]).toHaveClass('bg-slate-300')
  })

  it('marks the lines nobody priced, beside the change', async () => {
    serving(report({
      rows: [row({
        months: [
          cell(1, { missingPriceItemCount: 2, amountIsComplete: false, deltaPercent: 12.5 }),
          ...Array.from({ length: 11 }, (_, index) => cell(index + 2)),
        ],
      })],
    }))
    await renderPage()

    const january = within(card('Fəvvarələr meydanı')).getByRole('link', { name: /Yanvar 2026/ })
    expect(within(january).getByText('⚠ 2')).toBeInTheDocument()
    expect(within(january).getByText('+12,5%')).toHaveClass('text-red-700')
    expect(january).toHaveAccessibleName(expect.stringContaining('2 sətirdə qiymət yoxdur') as unknown as string)
  })

  it('draws a past month with no order as a dash, never a zero', async () => {
    serving(report({
      rows: [row({ months: [noRequest(1), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))] })],
    }))
    await renderPage()

    const phone = card('Fəvvarələr meydanı')
    const january = within(phone).getByLabelText('Fəvvarələr meydanı · Yanvar 2026 · sifariş yoxdur')
    expect(january).toHaveTextContent('—')
    expect(january).toHaveClass('text-slate-300')
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
    expect(within(chadir).getByText('Sistemdə hələ sifarişi yoxdur')).toHaveClass('text-slate-500')
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
    expect(phoneView().querySelector('[class*="min-w-["]')).toBeNull()
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
   * Below the width the twelve months need, the table scrolls inside its own box rather than becoming a list; from
   * 1340 pixels it fits, and the box stops being a scroll container so the header can follow the page.
   */
  it('shows the twelve months from 1024 pixels, scrolling inside its own box until the year fits', async () => {
    await renderPage()

    const panorama = table().closest('.lg\\:block')!
    expect(panorama.className).toContain('hidden')
    const box = table().closest('div')!
    expect(box.className).toContain('lg:overflow-x-auto')
    expect(box.className).toContain('min-[1340px]:overflow-x-visible')

    // Fixed layout: a long value can never push a month out. The minimum is what twelve readable months need.
    expect(table().className).toContain('table-fixed')
    expect(table().className).toContain('w-full')
    expect(table().className).toContain('min-w-[1000px]')
  })

  it('gives every month at least 64 pixels, with the object and the year fixed', async () => {
    await renderPage()

    const cols = [...table().querySelectorAll('col')]
    expect(cols).toHaveLength(14)
    // 144 + 12 × 64 + 88 = 1000, the table's minimum width.
    expect(cols[0].className).toContain('w-[9rem]')
    expect(cols[13].className).toContain('w-[5.5rem]')
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
    await screen.findByRole('group', { name: 'İlin xülasəsi' })

    expect(container.querySelector('[class*="-mx-"]')).toBeNull()
  })

  it('keeps the header row at the top of the page, under the application header', async () => {
    await renderPage()

    const headers = [...table().querySelectorAll('thead th')]
    expect(headers).toHaveLength(14)
    for (const header of headers) {
      expect(header.className).toContain('sticky')
      expect(header.className).toContain('top-16')
    }
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
    await renderPage()

    for (const value of within(table()).getAllByText(/₼/)) {
      expect(value.className).toContain('whitespace-nowrap')
      expect(value.className).toContain('tabular-nums')
    }
  })

  it('still opens the decision page from the cell', async () => {
    await renderPage()

    expect(within(table()).getByRole('link', { name: /Yanvar 2026/ })).toHaveAttribute('href', '/orders/101')
  })

  it('shows the change as a percentage, which is far shorter than the money', async () => {
    serving(report({
      rows: [row({
        months: [cell(1, { deltaAmount: 1287.91, deltaPercent: 65.8 }), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))],
      })],
    }))
    await renderPage()

    expect(within(table()).getByText('+65,8%')).toBeInTheDocument()
    // The manat difference is not lost — it moves into the cell's own description, with ₼ kept to its amount
    // by a no-break space (U+00A0).
    expect(within(table()).getByRole('link', { name: /Yanvar 2026/ }))
      .toHaveAttribute('title', expect.stringContaining(`+1.287,91${String.fromCharCode(0xa0)}₼`) as unknown as string)
  })

  it('leaves the undecided state unmarked and marks anything else', async () => {
    serving(report({
      rows: [row({
        months: [cell(1, { status: 'Approved' }), cell(2, { status: 'Draft' }), ...Array.from({ length: 10 }, (_, index) => cell(index + 3))],
      })],
    }))
    await renderPage()

    // Every row is undecided today; a dot on all twelve would be noise rather than information.
    const approved = within(table()).getByRole('link', { name: /Yanvar 2026/ })
    expect(approved.querySelector('.rounded-full')).not.toBeNull()
    expect(approved).toHaveAttribute('title', expect.stringContaining('Təsdiqlənib') as unknown as string)

    const draft = within(table()).getByRole('link', { name: /Fevral 2026/ })
    expect(draft.querySelector('.rounded-full')).toBeNull()
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
    expect(within(june).getByText('36.010,19 ₼').className).toContain('font-semibold')

    const july = within(table()).getByRole('link', { name: /İyul 2026/ })
    expect(july.className).toContain('bg-emerald-50')
    expect(july.className).toContain('ring-emerald-200')
  })

  it('says why in words, with the average and the difference', async () => {
    serving(report({ rows: [heyderAliyev()] }))
    await renderPage()

    const june = within(table()).getByRole('link', { name: /İyun 2026/ })
    const why = `Qeyri-adi ay: əvvəlki 3 mövcud ayın ortalaması 14.458,58${nbsp}₼, fərq +149,06%`
    expect(june).toHaveAttribute('title', expect.stringContaining(why) as unknown as string)
    expect(june).toHaveAccessibleName(expect.stringContaining(why) as unknown as string)
    // Still the order, and still without a basis, so it opens on "Keçən ay" (Task 1).
    expect(june).toHaveAttribute('href', '/orders/106')
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
    expect(within(august).getByText('11.985,02 ₼').className).toContain('font-medium')
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

    expect(within(table()).getByRole('link', { name: /Noyabr 2026/ })).toHaveAttribute('href', '/orders/111')
  })

  it('quietens the headers of the months to come', async () => {
    today(new Date(2026, 8, 24))
    await renderPage()

    for (const month of ['Okt', 'Noy', 'Dek']) {
      expect(within(table()).getByRole('columnheader', { name: month }).className).toContain('text-slate-400')
    }

    for (const month of ['Yan', 'Sen']) {
      expect(within(table()).getByRole('columnheader', { name: month }).className).not.toContain('text-slate-400')
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
    expect(within(phone).getByRole('link', { name: /Noyabr 2026/ })).toHaveAttribute('href', '/orders/111')
    // Its slot on the strip is the same hatch; a past month with no order is an empty slot.
    const bars = [...phone.querySelector('.grid-cols-12')!.children] as HTMLElement[]
    expect(bars[9].className).toContain('bg-[image:repeating-linear-gradient')
    expect(bars[0].className).not.toContain('bg-[image:')
  })
})

describe('an incomplete month that also moved', () => {
  /** Bayıl yolu's September: one line without a price, and +254,03% on the month before (brief). */
  it('shows the unpriced line and the percentage together', async () => {
    serving(report({
      rows: [row({
        locationName: 'Bayıl yolu',
        months: [
          ...Array.from({ length: 8 }, (_, index) => cell(index + 1)),
          cell(9, { amountIsComplete: false, missingPriceItemCount: 1, deltaPercent: 254.03, deltaAmount: 5080.6 }),
          ...Array.from({ length: 3 }, (_, index) => cell(index + 10)),
        ],
      })],
    }))
    await renderPage()

    const september = within(table()).getByRole('link', { name: /Sentyabr 2026/ })
    expect(within(september).getByText('⚠ 1')).toBeInTheDocument()
    expect(within(september).getByText('+254,03%')).toBeInTheDocument()
  })
})

describe('the colour of a change (owner decision 9.1)', () => {
  it('is red when the cost went up and green when it went down', async () => {
    serving(report({
      rows: [row({
        months: [
          cell(1, { deltaPercent: 12, deltaAmount: 120 }),
          cell(2, { deltaPercent: -8, deltaAmount: -90 }),
          ...Array.from({ length: 10 }, (_, index) => cell(index + 3)),
        ],
      })],
    }))
    await renderPage()

    const up = within(table()).getByRole('link', { name: /Yanvar 2026/ })
    expect(within(up).getByText('+12%').className).toContain('text-red-700')
    expect(up).toHaveAccessibleName(expect.stringContaining('xərc artıb') as unknown as string)

    const down = within(table()).getByRole('link', { name: /Fevral 2026/ })
    expect(within(down).getByText('−8%').className).toContain('text-emerald-700')
    expect(down).toHaveAccessibleName(expect.stringContaining('xərc azalıb') as unknown as string)
  })

  it('no longer uses the rule 9.1 replaced', async () => {
    serving(report({
      rows: [row({ months: [cell(1, { deltaPercent: -8, deltaAmount: -90 }), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))] })],
    }))
    await renderPage()

    // The old rule painted a fall rose and a rise emerald.
    expect(table().querySelector('.text-rose-700')).toBeNull()
    const text = table().textContent ?? ''
    expect(text).not.toMatch(/yaxşı|\bpis\b/i)
  })
})

describe('the legend', () => {
  it('explains every mark in the grid on the screen, not only on hover', async () => {
    await renderPage()

    const legend = screen.getByRole('list', { name: 'Cədvəldəki işarələr' })
    for (const word of [
      'Təsdiq gözləyir', 'Təsdiqlənib', 'Düzəliş tələb olunur',
      'Qiymət yoxdur',
      'xərc artıb', 'xərc azalıb',
      'Qeyri-adi ay', 'Gələcək ay',
    ]) {
      expect(within(legend).getByText(word)).toBeInTheDocument()
    }

    expect(legend).toHaveTextContent('Faiz — əvvəlki aya görə')
    expect(legend).toHaveTextContent('əvvəlki 3 mövcud ayın ortalamasından 50%-dən çox fərq')
    // Directly above the table, in the part of the page that shows from 1024 pixels.
    expect(legend.closest('.lg\\:block')).toBe(table().closest('.lg\\:block'))
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
