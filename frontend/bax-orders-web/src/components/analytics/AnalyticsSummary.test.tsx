import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { ComparisonSummary } from '../../api/analytics'
import { AnalyticsSummary } from './AnalyticsSummary'

/**
 * Brief (Task 10): "Heydər Əliyev, Sentyabr: sifariş səhifəsində 'Yeni 58 / Hamısı 113', obyekt müqayisə
 * səhifəsində 'Yeni 60 / 119 mövqe'". Every count says what it counts; the comparison page's counts are counted
 * out of this month's products and the basis window's together — the number the order page gives the same name.
 */
function summary(overrides: Partial<ComparisonSummary> = {}): ComparisonSummary {
  return {
    locationId: 21,
    locationCode: 'LOC-000031',
    locationName: 'Heydər Əliyev Mərkəzi',
    currentPeriod: '2026-09-01',
    basis: 'PreviousMonth',
    customStart: null,
    customEnd: null,
    baselineWindowPeriods: ['2026-08-01'],
    currentRequestId: 305,
    currentVersion: 1,
    currentStatus: 'Draft',
    expectedBaselinePeriodCount: 1,
    availableBaselinePeriodCount: 1,
    missingBaselinePeriods: [],
    baselinePeriods: [],
    baselineAvailable: true,
    currentItemCount: 90,
    baselineAverageItemCount: 80,
    currentKnownAmountTotal: 52000,
    baselineKnownAmountTotal: 28147.3,
    knownAmountDelta: 23852.7,
    knownAmountPercentChange: 84.74,
    currentMissingPriceItemCount: 0,
    baselineMissingPriceItemCount: 0,
    currentPriceNotRequiredItemCount: 0,
    baselinePriceNotRequiredItemCount: 0,
    amountIsComplete: true,
    newVariantCount: 60,
    noLongerOrderedVariantCount: 29,
    increasedVariantCount: 12,
    decreasedVariantCount: 9,
    unchangedVariantCount: 8,
    notComparableVariantCount: 1,
    insufficientHistoryVariantCount: 0,
    quantityComparableVariantCount: 118,
    amountOrientedServiceCount: 1,
    totalVariantCount: 119,
    ...overrides,
  }
}

describe('the product counts', () => {
  it('say what they are counted out of before the counts themselves', () => {
    render(<MemoryRouter><AnalyticsSummary summary={summary()} /></MemoryRouter>)

    const lead = screen.getByText('Müqayisədə 119 məhsul: bu ay və ya müqayisə bazasında sifariş olunanlar ·')
    // The state counts keep their own labels, after the lead.
    const counts = lead.parentElement!
    expect(counts.firstElementChild).toBe(lead)
    expect(counts).toHaveTextContent('Yeni məhsullar: 60')
    expect(counts).toHaveTextContent('Bu ay yazılmayan məhsullar: 29')
    expect(counts).not.toHaveTextContent(/mövqe/)
  })
})
