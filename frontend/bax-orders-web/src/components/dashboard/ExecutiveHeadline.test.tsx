import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ManagementDashboardSummary } from '../../api/dashboard'
import { ExecutiveHeadline } from './ExecutiveHeadline'

const none = { knownAmount: null, itemCount: 0, knownPriceItemCount: 0, missingPriceItemCount: 0, priceNotRequiredItemCount: 0, isComplete: true }

function summary(overrides: Partial<ManagementDashboardSummary> = {}): ManagementDashboardSummary {
  return {
    selectedPeriod: '2026-09-01',
    basis: 'PreviousMonth',
    baselinePeriods: ['2026-08-01'],
    locationCount: 27,
    locationsWithCurrentRequest: 24,
    locationsWithoutCurrentRequest: 3,
    comparedLocationCount: 23,
    locationsWithMissingPrices: 0,
    current: { ...none, knownAmount: 71210.29, itemCount: 480, knownPriceItemCount: 480 },
    comparedCurrent: { ...none, knownAmount: 70855.25 },
    baseline: { ...none, knownAmount: 29921.78 },
    knownAmountDelta: 40933.47,
    knownAmountPercentChange: 136.8,
    lineTypes: { monthly: { ...none, knownAmount: 71210.29 }, outsideMonthly: none, unclassified: none, unclassifiedItemCount: 0 },
    partition: { compared: [], noOrderThisMonth: [], noBaseline: [], noHistory: [] },
    ...overrides,
  } as ManagementDashboardSummary
}

function kpi(label: string) {
  return screen.getByText(label).closest('section') as HTMLElement
}

/**
 * A manager said the old headline was «çox qarışıqdır». The answer is not less information in the product — it
 * is three facts here and everything else a click away.
 */
describe('the month in three numbers', () => {
  it('names the money by the scope it is about', () => {
    render(<ExecutiveHeadline summary={summary()} scope="Monthly" />)

    expect(kpi('Aylıq sifarişlərin məbləği')).toHaveTextContent('71.210,29 ₼')
  })

  it('never calls the factual total monthly demand', () => {
    render(<ExecutiveHeadline summary={summary()} scope="All" />)

    expect(kpi('Ümumi faktiki xərc')).toBeInTheDocument()
    expect(screen.queryByText('Aylıq sifarişlərin məbləği')).not.toBeInTheDocument()
    expect(screen.getByText(/Aylıq tələb kimi oxunmur/)).toBeInTheDocument()
  })

  it('says off-plan spending is spending and not demand', () => {
    render(<ExecutiveHeadline summary={summary()} scope="OutsideMonthly" />)

    expect(kpi('Aylıqdan kənar xərclər')).toHaveTextContent('Xərcdir, aylıq tələb deyil.')
  })

  it('gives the change one dominant number and keeps the percentage out of its way', () => {
    render(<ExecutiveHeadline summary={summary()} scope="Monthly" />)

    const change = kpi('Keçən aya görə')
    const amount = within(change).getByText(/40\.933,47/)
    const percent = within(change).getByText(/136,8/)
    expect(amount.className).toContain('text-3xl')
    expect(percent.className).toContain('text-xs')
  })

  it('says how much of the company the month is about as one ratio', () => {
    render(<ExecutiveHeadline summary={summary()} scope="Monthly" />)

    expect(kpi('Sifariş olan obyekt')).toHaveTextContent('24 / 27')
  })

  it('carries exactly three cards, whatever the scope', () => {
    render(<ExecutiveHeadline summary={summary()} scope="Monthly" />)

    const group = screen.getByRole('group', { name: 'Ayın xülasəsi' })
    expect(within(group).getAllByRole('heading', { level: 2 })).toHaveLength(3)
  })
})
