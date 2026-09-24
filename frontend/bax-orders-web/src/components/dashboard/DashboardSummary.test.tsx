import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DashboardAmount, ManagementDashboardSummary } from '../../api/dashboard'
import { DashboardSummary } from './DashboardSummary'

/**
 * The three-second read, in the order a decision needs it: the amount, which way it moved, how much of the
 * company that covers, and only then anything wrong with the records.
 *
 * Two of these are business rules rather than presentation: the system never says *why* an object has no
 * request, because it does not know, and material the company supplies itself is never counted as a missing
 * price, because nothing about it is missing.
 */
function amount(overrides: Partial<DashboardAmount> = {}): DashboardAmount {
  return {
    knownAmount: 48430.78,
    itemCount: 480,
    knownPriceItemCount: 480,
    missingPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    isComplete: true,
    ...overrides,
  }
}

function summary(overrides: Partial<ManagementDashboardSummary> = {}): ManagementDashboardSummary {
  return {
    selectedPeriod: '2026-07-01',
    basis: 'PreviousMonth',
    baselinePeriods: ['2026-06-01'],
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
  it('is named by its own month rather than as "the current period"', () => {
    render(<DashboardSummary summary={summary()} />)

    expect(screen.getByText(/İyul 2026 sifarişlərinin məbləği/)).toBeInTheDocument()
    expect(screen.queryByText(/Cari dövrün məbləği/)).toBeNull()
  })

  it('is the primary number, with the change directly beneath it', () => {
    render(<DashboardSummary summary={summary()} />)

    expect(screen.getByText('48.430,78 ₼')).toBeInTheDocument()
    expect(screen.getByText(/−22\.561,84 ₼/)).toBeInTheDocument()
    expect(screen.getByText(/−31,8%/)).toBeInTheDocument()
  })

  it('says which way it went and against what, in words', () => {
    render(<DashboardSummary summary={summary({ basis: 'Previous6MonthAverage', baselinePeriods: [] })} />)

    expect(screen.getByText('Son 6 ayın ortalamasından aşağıdır')).toBeInTheDocument()
    expect(screen.getByText(/Müqayisə bazası:/)).toHaveTextContent('71.210,29 ₼')
  })

  it('says a rise is a rise', () => {
    render(<DashboardSummary summary={summary({ knownAmountDelta: 10626.82, knownAmountPercentChange: 17.54 })} />)

    expect(screen.getByText('Keçən aydan yüksəkdir')).toBeInTheDocument()
  })

  /** Colour is direction and nothing else: less spending is not "good", and more is not "bad". */
  it('colours the change by direction alone', () => {
    const { unmount } = render(<DashboardSummary summary={summary()} />)
    expect(screen.getByText(/−22\.561,84 ₼/).closest('p')).toHaveClass('text-rose-700')
    unmount()

    render(<DashboardSummary summary={summary({ knownAmountDelta: 10626.82, knownAmountPercentChange: 17.54 })} />)
    expect(screen.getByText(/\+10\.626,82 ₼/).closest('p')).toHaveClass('text-emerald-700')
  })

  it('never breaks a money value between the amount and its manat sign', () => {
    render(<DashboardSummary summary={summary()} />)

    expect(screen.getByText('48.430,78 ₼')).toHaveClass('whitespace-nowrap')
    expect(screen.getByText(/−22\.561,84 ₼/).closest('p')).toHaveClass('whitespace-nowrap')
  })

  /** "Məlum qiymətlər üzrə" is a caveat, not a headline, and it is not repeated as primary copy. */
  it('does not qualify the headline when nothing is missing', () => {
    render(<DashboardSummary summary={summary()} />)

    expect(screen.queryByText(/Məlum qiymətlər üzrə/)).toBeNull()
    expect(screen.queryByText(/natamamdır/)).toBeNull()
  })
})

describe('incomplete price data', () => {
  it('is one short line naming how many objects it affects', () => {
    render(<DashboardSummary summary={summary({
      current: amount({ isComplete: false, missingPriceItemCount: 11 }),
      locationsWithMissingPrices: 1,
    })} />)

    expect(screen.getByText('1 obyektdə qiymət məlumatı natamamdır.')).toBeInTheDocument()
  })

  /**
   * A month supplied entirely from the company's own store is complete. The backend counts internal supply
   * apart from a missing price, and the screen must not put the two back together.
   */
  it('says nothing when the only unpriced lines are internally supplied', () => {
    render(<DashboardSummary summary={summary({
      current: amount({ isComplete: true, missingPriceItemCount: 0, priceNotRequiredItemCount: 11 }),
      locationsWithMissingPrices: 0,
    })} />)

    expect(screen.queryByText(/natamamdır/)).toBeNull()
  })
})

describe('object coverage', () => {
  it('counts the objects that ordered, without saying why the rest did not', () => {
    render(<DashboardSummary summary={summary()} />)

    expect(screen.getByText('Bu ay sifariş olan obyektlər')).toBeInTheDocument()
    expect(screen.getByText(/24/)).toBeInTheDocument()
    expect(screen.getByText('2 obyekt üzrə sifariş qeydə alınmayıb')).toBeInTheDocument()
  })

  /**
   * The system knows an object has no request. It does not know whether one is late, was not needed, or was
   * never expected — so it must not imply any of them.
   */
  it('never says an object has "not sent yet"', () => {
    render(<DashboardSummary summary={summary()} />)

    expect(screen.queryByText(/hələ göndərməyib/)).toBeNull()
    expect(screen.queryByText(/hələ/)).toBeNull()
  })

  it('says nothing extra when every object has ordered', () => {
    render(<DashboardSummary summary={summary({ locationsWithCurrentRequest: 26, locationsWithoutCurrentRequest: 0 })} />)

    expect(screen.queryByText(/sifariş qeydə alınmayıb/)).toBeNull()
  })
})

describe('data coverage', () => {
  it('keeps the ordinary case quiet and chips only the exceptions', () => {
    render(<DashboardSummary summary={summary({
      locationsWithCompleteHistory: 20,
      locationsWithPartialHistory: 3,
      locationsWithNoBaselineHistory: 3,
      locationsWithMissingPrices: 1,
      locationsWithoutCurrentRequest: 2,
    })} />)

    expect(screen.getByText('Tam tarixçə').closest('div')).not.toHaveClass('bg-amber-50')
    expect(screen.getByText('Tarixçə natamam').closest('div')).toHaveClass('bg-amber-50')
    expect(screen.getByText('Tarixçə yoxdur').closest('div')).toHaveClass('bg-amber-50')
    expect(screen.getByText('Qiymət yoxdur').closest('div')).toHaveClass('bg-amber-50')
    expect(screen.getByText('Sifariş yoxdur').closest('div')).toHaveClass('bg-amber-50')
  })

  /** A chip on every healthy row is one a reader learns to skip, and the real ones get skipped with it. */
  it('leaves a clean month with one plain line and no chips at all', () => {
    render(<DashboardSummary summary={summary({
      locationsWithCurrentRequest: 26,
      locationsWithoutCurrentRequest: 0,
      locationsWithCompleteHistory: 26,
      locationsWithPartialHistory: 0,
      locationsWithNoBaselineHistory: 0,
      locationsWithMissingPrices: 0,
    })} />)

    expect(screen.getByText('Tam tarixçə')).toBeInTheDocument()
    expect(screen.queryByText('Tarixçə natamam')).toBeNull()
    expect(screen.queryByText('Tarixçə yoxdur')).toBeNull()
    expect(screen.queryByText('Qiymət yoxdur')).toBeNull()
    expect(screen.queryByText('Sifariş yoxdur')).toBeNull()
  })
})
