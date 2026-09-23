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

beforeEach(() => reportsApi.fetchMonthlyReport.mockReset().mockResolvedValue(report()))
afterEach(() => vi.clearAllMocks())

async function renderPage(url = '/dashboard/monthly') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <MonthlyReportPage />
    </MemoryRouter>,
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
    reportsApi.fetchMonthlyReport.mockResolvedValue(report({
      rows: [row({
        months: [noRequest(1), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))],
      })],
    }))
    await renderPage()

    // No amount, no link, and above all no zero.
    expect(within(table()).queryByRole('link', { name: /· Yan/ })).toBeNull()
    expect(within(table()).queryByText('0,00 ₼')).toBeNull()
  })

  it('names the unpriced products in the cell they belong to', async () => {
    reportsApi.fetchMonthlyReport.mockResolvedValue(report({
      rows: [row({
        months: [
          cell(1, { missingPriceItemCount: 2, amountIsComplete: false }),
          ...Array.from({ length: 11 }, (_, index) => cell(index + 2)),
        ],
      })],
    }))
    await renderPage()

    expect(within(table()).getByText('2 məhsulun qiyməti yoxdur')).toBeInTheDocument()
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
    reportsApi.fetchMonthlyReport.mockResolvedValue(report({ filteredLocationCount: 1, locationCount: 26 }))
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
    const list = document.querySelector('.lg\\:hidden ul')!
    expect(within(list as HTMLElement).getByRole('link', { name: /Fəvvarələr meydanı/ })).toHaveAttribute(
      'href',
      '/orders/103',
    )
  })

  it('gathers the locations with no order for that month into one quiet line', async () => {
    reportsApi.fetchMonthlyReport.mockResolvedValue(report({
      rows: [row({ months: [noRequest(1), ...Array.from({ length: 11 }, (_, index) => cell(index + 2))] })],
    }))
    await renderPage('/dashboard/monthly?month=1')

    expect(screen.getByText('1 obyektin bu ay üçün sifarişi yoxdur')).toBeInTheDocument()
  })
})
