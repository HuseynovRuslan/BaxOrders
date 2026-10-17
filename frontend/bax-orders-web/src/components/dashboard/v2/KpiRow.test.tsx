import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ManagementDashboardSummary } from '../../../api/dashboard'
import { KpiRow } from './KpiRow'

const none = { knownAmount: null, itemCount: 0, knownPriceItemCount: 0, missingPriceItemCount: 0, priceNotRequiredItemCount: 0, isComplete: true }

function summary(overrides: Partial<ManagementDashboardSummary> = {}): ManagementDashboardSummary {
  return {
    selectedPeriod: '2026-09-01',
    basis: 'PreviousMonth',
    baselinePeriods: ['2026-08-01'],
    locationCount: 27,
    locationsWithCurrentRequest: 24,
    locationsWithoutCurrentRequest: 3,
    current: { ...none, knownAmount: 71_210, itemCount: 300, knownPriceItemCount: 300 },
    comparedCurrent: { ...none, knownAmount: 71_210, itemCount: 300, knownPriceItemCount: 300 },
    baseline: { ...none, knownAmount: 63_340, itemCount: 290, knownPriceItemCount: 290 },
    knownAmountDelta: 7_870,
    knownAmountPercentChange: 12.4,
    locationsWithComparison: 24,
    ...overrides,
  } as ManagementDashboardSummary
}

function card(name: string | RegExp) {
  return screen.getByRole('heading', { name }).closest('section')!
}

/**
 * The month in four figures. Every one of them is the answer the API gave; the row's whole job is to say which
 * is which, and to say the direction of the third one in a way that does not depend on seeing colour.
 */
describe('the four figures', () => {
  it('names the selected amount by the scope it is of', () => {
    render(<KpiRow summary={summary()} scope="All" />)

    expect(card('Ümumi faktiki xərc')).toHaveTextContent('71.210,00')
  })

  it('says which months the comparison is of', () => {
    render(<KpiRow summary={summary({ basis: 'Previous3MonthAverage', baselinePeriods: ['2026-06-01', '2026-07-01', '2026-08-01'] })} scope="Monthly" />)

    const baseline = card('Müqayisə dövrü · Son 3 ayın ortalaması')
    expect(baseline).toHaveTextContent('63.340,00')
    expect(baseline).toHaveTextContent('İyun–Avqust 2026')
  })

  it('counts the objects of the month against the company', () => {
    render(<KpiRow summary={summary()} scope="Monthly" />)

    expect(card('Aktiv obyektlər')).toHaveTextContent('24 / 27 obyekt')
    expect(card('Aktiv obyektlər')).toHaveTextContent('3 obyektdə bu ay sifariş yoxdur')
  })

  /** What the selected figure leaves out, said where the figure is rather than in a footnote. */
  it('says when lines are left out of the amount for want of a price', () => {
    render(<KpiRow summary={summary({ current: { ...none, knownAmount: 71_210, itemCount: 300, knownPriceItemCount: 288, missingPriceItemCount: 12 } })} scope="Monthly" />)

    expect(card('Aylıq sifarişlərin məbləği')).toHaveTextContent('Qiyməti olmayan sətirlər bu məbləğə daxil deyil.')
  })
})

/**
 * This product's rule, which the mock designs have inverted more than once: money going up is the bad
 * direction. Colour says it, and the words beside it say it too.
 */
describe('the direction of the difference', () => {
  it('shows a rise in red, and says so in words', () => {
    render(<KpiRow summary={summary({ knownAmountDelta: 7_870, knownAmountPercentChange: 12.4 })} scope="Monthly" />)

    const difference = within(card('Fərq'))
    expect(difference.getByText(/\+7\.870,00/)).toHaveClass('text-red-500')
    expect(difference.getByText('+12,4%')).toHaveClass('text-red-500')
    expect(difference.getByText('xərc artıb')).toBeInTheDocument()
  })

  it('shows a fall in green, and says so in words', () => {
    render(<KpiRow summary={summary({ knownAmountDelta: -4_200, knownAmountPercentChange: -6.2 })} scope="Monthly" />)

    const difference = within(card('Fərq'))
    expect(difference.getByText(/−4\.200,00/)).toHaveClass('text-green-500')
    expect(difference.getByText('xərc azalıb')).toBeInTheDocument()
  })

  it('says nothing about a direction there is no comparison for', () => {
    render(<KpiRow summary={summary({ knownAmountDelta: null, knownAmountPercentChange: null })} scope="Monthly" />)

    expect(card('Fərq')).toHaveTextContent('—')
    expect(screen.queryByText('xərc artıb')).toBeNull()
  })
})

/**
 * The difference is a cohort figure, so subtracting the two cards beside it does not always give it. Where it
 * does not, the card says how many objects it is actually over — without that the reader finds a number that
 * does not add up and has no way to learn why.
 */
describe('what the difference is over', () => {
  it('names the objects the comparison could not reach', () => {
    render(<KpiRow summary={summary({ locationsWithCurrentRequest: 24, locationsWithComparison: 21 })} scope="Monthly" />)

    expect(card('Fərq')).toHaveTextContent('21 obyekt üzrə — 3 obyekt müqayisəyə daxil deyil')
  })

  it('says nothing where every object of the month is in the comparison', () => {
    render(<KpiRow summary={summary()} scope="Monthly" />)

    expect(card('Fərq')).not.toHaveTextContent('müqayisəyə daxil deyil')
  })
})


describe('inline KPI details', () => {
  const member = (locationId: number, locationName: string, currentKnownAmount: number | null, baselineKnownAmount: number | null, knownAmountDelta: number | null) => ({
    locationId, locationName, locationCode: String(locationId), currentKnownAmount,
    baselineKnownAmount, knownAmountDelta, lastOrderPeriod: null, lastOrderKnownAmount: null,
  })

  const withPortfolio = summary({
    partition: {
      locationCount: 3,
      comparableLocationCount: 2,
      compared: [member(1, 'Birinci obyekt', 200, 300, -100)],
      noBaseline: [member(2, 'Yeni obyekt', 50, null, null)],
      noOrderThisMonth: [member(3, 'Sifarişsiz obyekt', null, 80, null)],
      noHistory: [],
    },
  })

  it('opens a breakdown under the cards, switches metrics and closes on second click', () => {
    render(<KpiRow summary={withPortfolio} scope="All" />)
    expect(screen.queryByRole('region', { name: 'Xərclər obyektlər üzrə' })).toBeNull()

    fireEvent.click(within(card('Ümumi faktiki xərc')).getByRole('button'))
    expect(screen.getByRole('region', { name: 'Xərclər obyektlər üzrə' })).toHaveTextContent('Yeni obyekt')

    fireEvent.click(within(card('Fərq')).getByRole('button'))
    const difference = screen.getByRole('region', { name: 'Fərqi yaradan obyektlər' })
    expect(difference).toHaveTextContent('Birinci obyekt')
    expect(difference).not.toHaveTextContent('Yeni obyekt')

    fireEvent.click(within(card('Fərq')).getByRole('button'))
    expect(screen.queryByRole('region', { name: 'Fərqi yaradan obyektlər' })).toBeNull()
  })

  it('includes objects with no order in activity details', () => {
    render(<KpiRow summary={withPortfolio} scope="All" />)
    fireEvent.click(within(card('Aktiv obyektlər')).getByRole('button'))
    const detail = screen.getByRole('region', { name: 'Obyektlərin sifariş vəziyyəti' })
    expect(detail).toHaveTextContent('Sifarişsiz obyekt')
    expect(detail).toHaveTextContent('Sifariş yoxdur')
    fireEvent.click(within(detail).getByRole('button', { name: 'Kart detallarını bağla' }))
    expect(screen.queryByRole('region', { name: 'Obyektlərin sifariş vəziyyəti' })).toBeNull()
  })
})
