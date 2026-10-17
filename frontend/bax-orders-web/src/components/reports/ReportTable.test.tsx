import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { MonthlyReport, MonthlyReportCell, MonthlyReportRow } from '../../api/reports'
import { ReportTable } from './ReportTable'

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

/** Heydər Əliyev's June: 36.010,19 ₼ against 14.458,58 ₼ — unusual, upward. */
const heyderAliyev: MonthlyReportRow = {
  locationId: 21,
  locationCode: 'LOC-000021',
  locationName: 'Heydər Əliyev',
  isActive: true,
  months: [
    ...Array.from({ length: 5 }, (_, index) => cell(index + 1)),
    cell(6, { knownAmount: 36010.19, isUnusual: true, recentAverageKnownAmount: 14458.58, recentAveragePercent: 149.06 }),
    ...Array.from({ length: 6 }, (_, index) => cell(index + 7)),
  ],
  requestCount: 12,
  knownAmount: 70000,
  missingPriceItemCount: 0,
  monthlyKnownAmount: null,
  monthlyItemCount: 0,
  outsideMonthlyKnownAmount: null,
  outsideMonthlyItemCount: 0,
  unclassifiedKnownAmount: null,
  unclassifiedItemCount: 0,
  monthsWithoutRequest: 0,
  hasAnyRequest: true,
}

const report: MonthlyReport = {
  year: 2026,
  availableYears: [2026],
  rows: [heyderAliyev],
  months: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    period: `2026-${String(index + 1).padStart(2, '0')}-01`,
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
  })),
  locationCount: 1,
  filteredLocationCount: 1,
  requestCount: 12,
  knownAmount: 70000,
  missingPriceItemCount: 0,
  monthlyKnownAmount: null,
  monthlyItemCount: 0,
  outsideMonthlyKnownAmount: null,
  outsideMonthlyItemCount: 0,
  unclassifiedKnownAmount: null,
  unclassifiedItemCount: 0,
  amountIsComplete: true,
}

function renderTable(selected: { locationId: number; month: number } | null) {
  render(
    <MemoryRouter>
      <ReportTable
        report={report}
        rows={report.rows}
        view="Compact"
        sort="NameAsc"
        onSort={vi.fn()}
        searchActive={false}
        selected={selected}
        today={new Date(2026, 11, 31)}
      />
    </MemoryRouter>,
  )
  return screen.getByRole('table', { name: 'Obyektlər üzrə aylıq sifariş məbləğləri' })
}

/**
 * UI V2 (03 §6.5, DK-18): the cell the side panel describes (phase D wires it to the address) — the primary ring, its
 * row on the quiet band with a primary bar on the object, and on an unusual month the selection's ring instead of the
 * tint's, never both.
 */
describe('the cell the panel describes', () => {
  it('rings an unusual month in the selection’s colour instead of its tint’s, keeping the tint’s fill', () => {
    const table = renderTable({ locationId: 21, month: 6 })

    const june = within(table).getByRole('link', { name: /İyun 2026/ })
    const classes = june.className.split(' ')
    expect(classes).toEqual(expect.arrayContaining(['bg-red-50', 'ring-2', 'ring-inset', 'ring-primary']))
    expect(classes).not.toContain('ring-1')
    expect(classes).not.toContain('ring-red-200')
    expect(classes.filter((name) => /^ring-\d$/.test(name))).toEqual(['ring-2'])
  })

  it('rings an ordinary month, sets its row on the quiet band and marks the object', () => {
    const table = renderTable({ locationId: 21, month: 2 })

    const february = within(table).getByRole('link', { name: /Fevral 2026/ })
    expect(february).toHaveClass('ring-2', 'ring-inset', 'ring-primary')
    expect(within(table).getByRole('link', { name: /Mart 2026/ })).not.toHaveClass('ring-2')

    const object = within(table).getByRole('rowheader', { name: 'Heydər Əliyev' })
    expect(object).toHaveClass('shadow-[inset_3px_0_0_var(--color-primary)]', 'bg-surface-container-low')
    expect(within(object).getByRole('link')).toHaveClass('font-semibold')
    expect(february.closest('td')).toHaveClass('bg-surface-container-low')
  })

  it('leaves every cell as it is when nothing is selected', () => {
    const table = renderTable(null)

    const june = within(table).getByRole('link', { name: /İyun 2026/ })
    expect(june).toHaveClass('bg-red-50', 'ring-1', 'ring-red-200')
    expect(june).not.toHaveClass('ring-primary')
    expect(within(table).getByRole('rowheader', { name: 'Heydər Əliyev' }))
      .not.toHaveClass('shadow-[inset_3px_0_0_var(--color-primary)]')
  })
})
