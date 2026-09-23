import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DashboardAmount, ManagementDashboardSummary } from '../../api/dashboard'
import { DashboardSummary } from './DashboardSummary'

/**
 * The one number a reader needs first, told apart from everything that only qualifies it: a coverage gap is
 * a fact to notice, never a verdict, and it is said once — not repeated as a card, a note and a warning all
 * saying the same thing.
 */
function amount(overrides: Partial<DashboardAmount> = {}): DashboardAmount {
  return {
    knownAmount: 48430.78,
    itemCount: 480,
    knownPriceItemCount: 480,
    missingPriceItemCount: 0,
    isComplete: true,
    ...overrides,
  }
}

function summary(overrides: Partial<ManagementDashboardSummary> = {}): ManagementDashboardSummary {
  return {
    selectedPeriod: '2026-07-01',
    basis: 'PreviousMonth',
    locationCount: 26,
    locationsWithCurrentRequest: 24,
    locationsWithoutCurrentRequest: 2,
    currentRequestCount: 24,
    current: amount(),
    baseline: amount({ knownAmount: 71210.29 }),
    knownAmountDelta: -22561.84,
    knownAmountPercentChange: -31.8,
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
    ...overrides,
  }
}

describe('the headline amount', () => {
  it('is the primary number, with the change directly beneath it', () => {
    render(<DashboardSummary summary={summary()} />)

    expect(screen.getByText('48.430,78 ₼')).toBeInTheDocument()
    expect(screen.getByText('−22.561,84 ₼')).toBeInTheDocument()
    expect(screen.getByText('−31,8%')).toBeInTheDocument()
  })

  it('says nothing about missing prices when the month is fully priced', () => {
    render(<DashboardSummary summary={summary()} />)

    expect(screen.queryByText(/qiymətsiz sətir/)).toBeNull()
    expect(screen.queryByText(/qiyməti məlum olan/)).toBeNull()
  })
})

describe('a month with unpriced lines', () => {
  it('names the qualifier and the missing count as one quiet line under the amount, not a repeated warning', () => {
    render(<DashboardSummary summary={summary({
      current: amount({ knownAmount: 48430.78, isComplete: false, missingPriceItemCount: 11 }),
    })} />)

    expect(screen.getByText('48.430,78 ₼')).toBeInTheDocument()
    expect(screen.getByText(/11 qiymətsiz sətir/)).toBeInTheDocument()
  })

  it('shows the one warning line when either side of the comparison is short of prices', () => {
    render(<DashboardSummary summary={summary({
      current: amount({ isComplete: false, missingPriceItemCount: 11 }),
      locationsWithMissingPrices: 4,
    })} />)

    expect(screen.getByRole('status')).toHaveTextContent('4 obyekt üzrə qiymət məlumatı natamamdır.')
  })

  it('shows no warning at all once every line is priced', () => {
    render(<DashboardSummary summary={summary()} />)

    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('objects with and without a current request', () => {
  it('gives them one compact fact, not two equal cards', () => {
    render(<DashboardSummary summary={summary({ locationsWithCurrentRequest: 24, locationCount: 26, locationsWithoutCurrentRequest: 2 })} />)

    expect(screen.getByText('24 / 26')).toBeInTheDocument()
    expect(screen.getByText('2 obyekt hələ göndərməyib')).toBeInTheDocument()
  })

  it('says nothing extra when every object has ordered', () => {
    render(<DashboardSummary summary={summary({ locationsWithCurrentRequest: 26, locationCount: 26, locationsWithoutCurrentRequest: 0 })} />)

    expect(screen.getByText('26 / 26')).toBeInTheDocument()
    expect(screen.queryByText(/hələ göndərməyib/)).toBeNull()
  })
})

describe('data coverage', () => {
  it('keeps NoCurrentRequest, NoBaselineHistory and PartialHistory apart and readable', () => {
    render(<DashboardSummary summary={summary({
      locationsWithCompleteHistory: 20,
      locationsWithPartialHistory: 3,
      locationsWithNoBaselineHistory: 3,
      locationsWithoutCurrentRequest: 2,
    })} />)

    expect(screen.getByText('Tam tarixçə')).toBeInTheDocument()
    expect(screen.getByText('Natamam tarixçə')).toBeInTheDocument()
    expect(screen.getByText('Tarixçə yoxdur')).toBeInTheDocument()
    expect(screen.getByText('Sifariş olmayan obyektlər')).toBeInTheDocument()
  })
})
