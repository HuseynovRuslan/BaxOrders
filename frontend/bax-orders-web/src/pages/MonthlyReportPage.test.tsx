import { StrictMode } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MonthlyReport, MonthlyReportCell, MonthlyReportRow } from '../api/reports'
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
    ...overrides,
    months,
  }
}

function report(overrides: Partial<MonthlyReport> = {}): MonthlyReport {
  return {
    year: 2026,
    availableYears: [2026, 2025],
    rows: [row()],
    months: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      period: `2026-${String(index + 1).padStart(2, '0')}-01`,
      locationsWithRequest: 1,
      knownAmount: 1000,
      missingPriceItemCount: 0,
      amountIsComplete: true,
    })),
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

  it('marks unpriced lines compactly, and still says what the mark means', async () => {
    serving(report({
      rows: [row({
        months: [
          cell(1, { missingPriceItemCount: 2, amountIsComplete: false }),
          ...Array.from({ length: 11 }, (_, index) => cell(index + 2)),
        ],
      })],
    }))
    await renderPage()

    // A sentence twelve times to a row would drown the money, so the cell shows a count and explains itself.
    expect(within(table()).getByText('⚠ 2')).toBeInTheDocument()
    const link = within(table()).getByRole('link', { name: /Yanvar 2026/ })
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

describe('the phone', () => {
  it('is a month of locations rather than a squeezed twelve-column table', async () => {
    await renderPage('/dashboard/monthly?month=3')

    const month = screen.getByRole('combobox', { name: /Ay/ })
    expect(month).toHaveValue('3')

    // The narrow layout lists the locations of the one chosen month, each linking to its own order.
    const list = document.querySelector('.xl\\:hidden ul')!
    expect(within(list as HTMLElement).getByRole('link', { name: /Fəvvarələr meydanı/ })).toHaveAttribute(
      'href',
      '/orders/103',
    )
  })

  it('gathers the locations with no order for that month into one quiet line', async () => {
    serving(report({
      rows: [row({ months: [noRequest(1), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))] })],
    }))
    await renderPage('/dashboard/monthly?month=1')

    expect(screen.getByText('1 obyektin bu ay üçün sifarişi yoxdur')).toBeInTheDocument()
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
  it('lays the year out at a fixed width, so a long value can never push a month off the screen', async () => {
    await renderPage()

    // Fixed layout plus full width is what makes horizontal scrolling structurally impossible: the table is
    // exactly as wide as its container, whatever is inside it.
    expect(table().className).toContain('table-fixed')
    expect(table().className).toContain('w-full')
    expect(table().closest('div')!.className).not.toContain('overflow-x-auto')
  })

  it('spends its width on twelve equal months, with the object and the year fixed', async () => {
    await renderPage()

    const cols = [...table().querySelectorAll('col')]
    expect(cols).toHaveLength(14)
    expect(cols[0].className).toContain('w-[180px]')
    expect(cols[13].className).toContain('w-[96px]')
    // The twelve in between carry no width of their own, so a fixed layout divides the remainder equally.
    for (const month of cols.slice(1, 13)) {
      expect(month.className).toBe('')
    }
  })

  it('reclaims the page gutters that the rest of the application keeps', async () => {
    await renderPage()

    const wrapper = table().closest('div')!
    expect(wrapper.className).toContain('-mx-4')
    expect(wrapper.className).toContain('xl:-mx-8')
  })

  it('shows every month of the year at once', async () => {
    await renderPage()

    const headers = within(table()).getAllByRole('columnheader').map((cell) => cell.textContent)
    expect(headers).toEqual([
      'Obyekt', 'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek', 'İl cəmi',
    ])
  })

  it('keeps money on one line', async () => {
    await renderPage()

    for (const value of within(table()).getAllByText(/₼/)) {
      expect(value.className).toContain('whitespace-nowrap')
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
    // The manat difference is not lost — it moves into the cell's own description.
    expect(within(table()).getByRole('link', { name: /Yanvar 2026/ }))
      .toHaveAttribute('title', expect.stringContaining('+1.287,91 ₼') as unknown as string)
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
