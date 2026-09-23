import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AnalyticsComparisonBasis } from '../../api/analytics'
import type {
  DashboardAmount,
  LocationDashboardRow,
  ManagementDashboardSummary,
} from '../../api/dashboard'
import { LocationRows } from './LocationRows'

/**
 * The three situations the backend keeps apart have to stay apart on the screen. An object that did not order
 * must never read as one that ordered nothing, and an object with no history must never read as one full of
 * new products.
 */
function amount(overrides: Partial<DashboardAmount> = {}): DashboardAmount {
  return {
    knownAmount: 1000,
    itemCount: 10,
    knownPriceItemCount: 10,
    missingPriceItemCount: 0,
    isComplete: true,
    ...overrides,
  }
}

function row(overrides: Partial<LocationDashboardRow> = {}): LocationDashboardRow {
  return {
    locationId: 21,
    locationCode: 'LOC-000017',
    locationName: 'Fəvvarələr meydanı',
    hasCurrentRequest: true,
    currentRequestId: 105,
    currentVersion: 1,
    currentStatus: 'Draft',
    current: amount(),
    currentPriceCoverage: 'Complete',
    expectedBaselinePeriodCount: 1,
    availableBaselinePeriodCount: 1,
    missingBaselinePeriods: [],
    baselinePeriods: [],
    baseline: amount({ knownAmount: 800 }),
    knownAmountDelta: 200,
    knownAmountPercentChange: 25,
    historyCoverage: 'Complete',
    comparisonAvailability: 'Available',
    comparisonAvailable: true,
    newVariantCount: 3,
    increasedVariantCount: 2,
    decreasedVariantCount: 1,
    unchangedVariantCount: 4,
    noLongerOrderedVariantCount: 5,
    insufficientHistoryVariantCount: 0,
    notComparableVariantCount: 0,
    quantityComparableVariantCount: 15,
    amountOrientedServiceCount: 0,
    comparedVariantCount: 15,
    deepLinkPeriod: '2026-07-01',
    deepLinkBasis: 'PreviousMonth',
    ...overrides,
  }
}

function summary(basis: AnalyticsComparisonBasis = 'PreviousMonth'): ManagementDashboardSummary {
  return {
    selectedPeriod: '2026-07-01',
    basis,
    locationCount: 26,
    locationsWithCurrentRequest: 25,
    locationsWithoutCurrentRequest: 1,
    currentRequestCount: 25,
    current: amount(),
    baseline: amount(),
    knownAmountDelta: 0,
    knownAmountPercentChange: 0,
    locationsWithMissingPrices: 0,
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
  }
}

function renderRows(rows: LocationDashboardRow[], basis: AnalyticsComparisonBasis = 'PreviousMonth') {
  return render(
    <MemoryRouter>
      <LocationRows rows={rows} summary={summary(basis)} />
    </MemoryRouter>,
  )
}

describe('an object that did not order this month', () => {
  const dormant = row({
    locationId: 32,
    locationName: 'Puşkin parkı',
    hasCurrentRequest: false,
    currentRequestId: null,
    currentVersion: null,
    currentStatus: null,
    current: amount({ knownAmount: null, itemCount: 0, knownPriceItemCount: 0 }),
    currentPriceCoverage: null,
    baseline: amount({ knownAmount: null, itemCount: 0, knownPriceItemCount: 0 }),
    knownAmountDelta: null,
    knownAmountPercentChange: null,
    historyCoverage: 'Unavailable',
    comparisonAvailability: 'NoCurrentRequest',
    comparisonAvailable: false,
    newVariantCount: 0,
    increasedVariantCount: 0,
    decreasedVariantCount: 0,
    noLongerOrderedVariantCount: 0,
    comparedVariantCount: 0,
  })

  it('says so instead of showing a figure', () => {
    renderRows([dormant])
    expect(screen.getAllByText('Bu ay sifariş yoxdur').length).toBeGreaterThan(0)
  })

  it('never shows its money as zero', () => {
    renderRows([dormant])
    expect(screen.queryByText('0,00 ₼')).toBeNull()
    expect(screen.getAllByText(/—/).length).toBeGreaterThan(0)
  })

  it('shows no product change counts', () => {
    renderRows([dormant])
    expect(screen.queryByText('Yeni')).toBeNull()
    expect(screen.queryByText('Artıb')).toBeNull()
  })
})

describe('an object with a month but no history to compare it with', () => {
  const expo = row({
    locationId: 46,
    locationName: 'EXPO',
    current: amount({ knownAmount: 123.68, itemCount: 15, knownPriceItemCount: 15 }),
    baseline: amount({ knownAmount: null, itemCount: 0, knownPriceItemCount: 0 }),
    knownAmountDelta: null,
    knownAmountPercentChange: null,
    missingBaselinePeriods: ['2026-06-01'],
    availableBaselinePeriodCount: 0,
    historyCoverage: 'Unavailable',
    comparisonAvailability: 'NoBaselineHistory',
    comparisonAvailable: false,
    newVariantCount: 0,
    increasedVariantCount: 0,
    decreasedVariantCount: 0,
    noLongerOrderedVariantCount: 0,
    insufficientHistoryVariantCount: 15,
    comparedVariantCount: 15,
  })

  it('says the previous period is missing', () => {
    renderRows([expo])
    expect(screen.getAllByText(/Müqayisə üçün əvvəlki dövr məlumatı yoxdur/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Tarixçə yoxdur/).length).toBeGreaterThan(0)
  })

  it('does not present its products as new', () => {
    renderRows([expo])
    // The backend calls these fifteen variants history-not-sufficient, and so must the screen.
    expect(screen.getAllByText(/Tarixçə kifayət deyil/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/15 yeni/i)).toBeNull()
  })
})

describe('an object with partial history', () => {
  it('shows what the average actually rests on', () => {
    renderRows(
      [row({
        historyCoverage: 'Partial',
        availableBaselinePeriodCount: 2,
        expectedBaselinePeriodCount: 3,
        missingBaselinePeriods: ['2026-05-01'],
      })],
      'Previous3MonthAverage',
    )

    expect(screen.getAllByText('Natamam tarixçə').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2/3 ay').length).toBeGreaterThan(0)
  })

  it('shows the denominator for complete history too', () => {
    renderRows([row()])
    expect(screen.getAllByText('Tam tarixçə').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1/1 ay').length).toBeGreaterThan(0)
  })
})

describe('an object whose prices are partly missing', () => {
  it('names the missing line count next to the amount it affects', () => {
    renderRows([row({
      current: amount({ knownAmount: 500, itemCount: 10, knownPriceItemCount: 7, missingPriceItemCount: 3, isComplete: false }),
      currentPriceCoverage: 'Partial',
    })])

    expect(screen.getAllByText(/3 qiymətsiz sətir/).length).toBeGreaterThan(0)
  })

  it('says nothing of the sort when every line is priced', () => {
    renderRows([row()])
    expect(screen.queryByText(/qiymətsiz sətir/)).toBeNull()
  })
})

describe('the drill-down', () => {
  it('opens the object on the same month and basis the backend named', () => {
    renderRows([row({ deepLinkPeriod: '2026-07-01', deepLinkBasis: 'Previous3MonthAverage' })], 'Previous3MonthAverage')

    const links = screen.getAllByRole('link', { name: /Fəvvarələr meydanı üzrə analitikaya bax/ })
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/locations/21/analytics?period=2026-07&basis=Previous3MonthAverage')
    }
  })
})

describe('a compared object', () => {
  it('shows the counts the backend gave, and its money difference', () => {
    const { container } = renderRows([row()])
    const table = container.querySelector('table')!

    expect(within(table).getByText('+200,00 ₼')).toBeInTheDocument()
    expect(within(table).getByText('+25%')).toBeInTheDocument()
    expect(within(table).getByText('Yeni')).toBeInTheDocument()
    expect(within(table).getByText('Artıq sifariş olunmur')).toBeInTheDocument()
  })

  it('counts services separately from quantity changes', () => {
    const { container } = renderRows([row({ amountOrientedServiceCount: 2 })])
    const table = container.querySelector('table')!

    expect(within(table).getByText('Xidmət: 2')).toBeInTheDocument()
  })

  it('is money — never wraps between the amount and its manat sign', () => {
    const { container } = renderRows([row()])
    const table = container.querySelector('table')!

    for (const value of within(table).getAllByText(/₼/)) {
      expect(value).toHaveClass('whitespace-nowrap')
    }
  })
})

describe('the changes column', () => {
  it('shows the three main states compactly, on one line', () => {
    const { container } = renderRows([row()])
    const table = container.querySelector('table')!
    const line = within(table).getByText('Yeni').closest('p')!

    expect(line).toHaveTextContent('Yeni 3 · Artıb 2 · Azalıb 1')
  })

  it('keeps NoLongerOrdered and services out of that line, as quieter secondary text', () => {
    const { container } = renderRows([row({ amountOrientedServiceCount: 1 })])
    const table = container.querySelector('table')!
    const primary = within(table).getByText('Yeni').closest('p')!

    expect(primary).not.toHaveTextContent('sifariş olunmur')
    expect(primary).not.toHaveTextContent('Xidmət')

    const noLongerOrdered = within(table).getByText('Artıq sifariş olunmur').closest('span')!
    expect(noLongerOrdered).toHaveClass('text-slate-400')
  })

  it('says nothing at all about NoLongerOrdered or services when there are none', () => {
    const { container } = renderRows([row({ noLongerOrderedVariantCount: 0, amountOrientedServiceCount: 0 })])
    const table = container.querySelector('table')!

    expect(within(table).queryByText('Artıq sifariş olunmur')).toBeNull()
    expect(within(table).queryByText(/Xidmət/)).toBeNull()
  })

  it('never removes the underlying counts — they are still there, just quieter', () => {
    const { container } = renderRows([row({ noLongerOrderedVariantCount: 5, amountOrientedServiceCount: 2 })])
    const table = container.querySelector('table')!

    expect(within(table).getByText('Artıq sifariş olunmur')).toBeInTheDocument()
    expect(within(table).getByText('5')).toBeInTheDocument()
    expect(within(table).getByText('Xidmət: 2')).toBeInTheDocument()
  })
})
