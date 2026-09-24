import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type {
  AnalyticsComparisonBasis,
  BaselineSide,
  ComparisonSide,
  ComparisonSummary,
  VariantComparison,
} from '../../api/analytics'
import { MaterialRows, ServiceRows } from './ComparisonRows'

/**
 * Task 6B's accepted behaviour, kept honest now that its formatting is shared with the dashboard. Each case
 * here is a rule that was signed off: a service has no quantity, a missing history is not a new product, and
 * a percentage that does not exist is an em dash.
 */
function side(overrides: Partial<ComparisonSide> = {}): ComparisonSide {
  return {
    quantity: 30,
    itemCount: 1,
    knownAmount: 300,
    weightedUnitPrice: 10,
    priceCoverage: {
      state: 'Complete',
      totalQuantity: 30,
      knownPriceQuantity: 30,
      missingPriceQuantity: 0,
      knownPriceItemCount: 1,
      missingRequiredPriceItemCount: 0,
      priceNotRequiredItemCount: 0,
    },
    ...overrides,
  }
}

function baseline(overrides: Partial<BaselineSide> = {}): BaselineSide {
  return { ...side(), availablePeriodCount: 1, expectedPeriodCount: 1, ...overrides }
}

function comparison(overrides: Partial<VariantComparison> = {}): VariantComparison {
  return {
    variant: {
      productVariantId: 1,
      productId: 1,
      productCode: 'PRD-000001',
      productName: 'Mop',
      specificationValue: '50',
      specificationUnitCode: 'CM',
      specificationUnitName: 'Santimetr',
      specificationDescriptor: null,
      modelCode: null,
      orderUnitCode: 'PCS',
      orderUnitName: 'Ədəd',
    },
    analyticsKind: 'QuantityComparable',
    state: 'Increased',
    current: side(),
    baseline: baseline({ quantity: 20, knownAmount: 200 }),
    delta: {
      quantityDelta: 10,
      quantityPercentChange: 50,
      priceDelta: 0,
      pricePercentChange: 0,
      amountDelta: 100,
      amountPercentChange: 50,
    },
    ...overrides,
  }
}

function summary(basis: AnalyticsComparisonBasis = 'PreviousMonth'): ComparisonSummary {
  return {
    locationId: 21,
    locationCode: 'LOC-000017',
    locationName: 'Fəvvarələr meydanı',
    currentPeriod: '2026-07-01',
    basis,
    customStart: null,
    customEnd: null,
    baselineWindowPeriods: ['2026-06-01'],
    currentRequestId: 105,
    currentVersion: 1,
    currentStatus: 'Draft',
    expectedBaselinePeriodCount: basis === 'PreviousMonth' ? 1 : 3,
    availableBaselinePeriodCount: basis === 'PreviousMonth' ? 1 : 2,
    missingBaselinePeriods: [],
    baselinePeriods: [],
    baselineAvailable: true,
    currentItemCount: 95,
    baselineAverageItemCount: 100,
    currentKnownAmountTotal: 12317.61,
    baselineKnownAmountTotal: 14419.97,
    knownAmountDelta: -2102.36,
    knownAmountPercentChange: -14.5795,
    currentMissingPriceItemCount: 0,
    baselineMissingPriceItemCount: 1,
    currentPriceNotRequiredItemCount: 0,
  baselinePriceNotRequiredItemCount: 0,
  amountIsComplete: false,
    newVariantCount: 72,
    noLongerOrderedVariantCount: 61,
    increasedVariantCount: 3,
    decreasedVariantCount: 5,
    unchangedVariantCount: 12,
    notComparableVariantCount: 1,
    insufficientHistoryVariantCount: 0,
    quantityComparableVariantCount: 153,
    amountOrientedServiceCount: 1,
    totalVariantCount: 154,
  }
}

describe('a material row', () => {
  it('writes a percentage that does not exist as an em dash, not as zero', () => {
    const { container } = render(
      <MaterialRows
        rows={[comparison({
          state: 'New',
          baseline: baseline({ quantity: 0, knownAmount: null, weightedUnitPrice: null }),
          delta: { quantityDelta: 10, quantityPercentChange: null, priceDelta: null, pricePercentChange: null, amountDelta: null, amountPercentChange: null },
        })]}
        summary={summary()}
        onTrend={() => {}}
      />,
    )

    const table = container.querySelector('table')!
    expect(within(table).getAllByText('—').length).toBeGreaterThan(0)
    expect(within(table).queryByText('0%')).toBeNull()
    expect(within(table).getByText('Yeni')).toBeInTheDocument()
  })

  it('calls a variant with no history history-not-sufficient, never new', () => {
    render(
      <MaterialRows
        rows={[comparison({
          state: 'InsufficientHistory',
          baseline: baseline({ quantity: null, knownAmount: null, weightedUnitPrice: null, availablePeriodCount: 0 }),
          delta: { quantityDelta: null, quantityPercentChange: null, priceDelta: null, pricePercentChange: null, amountDelta: null, amountPercentChange: null },
        })]}
        summary={summary()}
        onTrend={() => {}}
      />,
    )

    expect(screen.getAllByText('Tarixçə kifayət deyil').length).toBeGreaterThan(0)
    expect(screen.queryByText('Yeni')).toBeNull()
  })

  it('names an average basis in the column heading, never "keçən ay"', () => {
    const { container } = render(
      <MaterialRows rows={[comparison()]} summary={summary('Previous3MonthAverage')} onTrend={() => {}} />,
    )

    const table = container.querySelector('table')!
    expect(within(table).getByText('Son 3 ayın ortalaması')).toBeInTheDocument()
    expect(within(table).getByText('2/3 ay əsasında')).toBeInTheDocument()
    expect(within(table).queryByText('Keçən ay')).toBeNull()
  })

  it('says when a price rests on only part of the quantity', () => {
    render(
      <MaterialRows
        rows={[comparison({
          current: side({
            knownAmount: 50,
            priceCoverage: {
              state: 'Partial',
              totalQuantity: 100,
              knownPriceQuantity: 10,
              missingPriceQuantity: 90,
              knownPriceItemCount: 1,
              missingRequiredPriceItemCount: 2,
      priceNotRequiredItemCount: 0,
            },
          }),
        })]}
        summary={summary()}
        onTrend={() => {}}
      />,
    )

    expect(screen.getAllByText(/Qiymət qismən məlumdur/).length).toBeGreaterThan(0)
  })

  /** One product's row says the state in the singular; the filter and the counts use the 5.1 plural. */
  it('badges a product not ordered this month in the approved words', () => {
    const { container } = render(
      <MaterialRows rows={[comparison({ state: 'NoLongerOrdered' })]} summary={summary()} onTrend={() => {}} />,
    )

    const table = container.querySelector('table')!
    expect(within(table).getByText('Bu ay yazılmayıb')).toBeInTheDocument()
    expect(within(table).queryByText(/Artıq sifariş olunmur/)).toBeNull()
  })

  it('calls the weighted price the average price, to the qəpik', () => {
    const { container } = render(
      <MaterialRows
        rows={[comparison({ current: side({ weightedUnitPrice: 32.1273 }) })]}
        summary={summary()}
        onTrend={() => {}}
      />,
    )

    const table = container.querySelector('table')!
    expect(within(table).getByText(/Orta qiymət: 32,13 ₼/)).toBeInTheDocument()
    expect(within(table).queryByText(/Çəkili/)).toBeNull()
  })

  it('writes the units under the name as words', () => {
    const { container } = render(<MaterialRows rows={[comparison()]} summary={summary()} onTrend={() => {}} />)

    const table = container.querySelector('table')!
    expect(within(table).getByText('50 sm · ədəd')).toBeInTheDocument()
  })

  /** Owner decision 5.1: "Trend" is "Məhsul tarixçəsi" — on the button, in its name, and in the column. */
  it('opens the product history by that name', () => {
    const { container } = render(<MaterialRows rows={[comparison()]} summary={summary()} onTrend={() => {}} />)

    const table = container.querySelector('table')!
    expect(within(table).getByRole('button', { name: 'Mop — məhsul tarixçəsinə bax' }))
      .toHaveTextContent('Məhsul tarixçəsi')
    expect(within(table).queryByText(/Trend/)).toBeNull()
  })
})

describe('a service row', () => {
  const service = comparison({
    variant: {
      productVariantId: 2,
      productId: 2,
      productCode: 'PRD-000002',
      productName: 'Ayaqyolu pulu',
      specificationValue: null,
      specificationUnitCode: null,
      specificationUnitName: null,
      specificationDescriptor: null,
      modelCode: null,
      orderUnitCode: 'MONTH',
      orderUnitName: 'Ay',
    },
    analyticsKind: 'AmountOrientedService',
    state: 'NotComparable',
    current: side({ quantity: null, knownAmount: 150 }),
    baseline: baseline({ quantity: null, knownAmount: 100 }),
    delta: {
      quantityDelta: null,
      quantityPercentChange: null,
      priceDelta: null,
      pricePercentChange: null,
      amountDelta: 50,
      amountPercentChange: 50,
    },
  })

  it('has no quantity column at all', () => {
    const { container } = render(<ServiceRows rows={[service]} summary={summary()} onTrend={() => {}} />)
    const table = container.querySelector('table')!

    expect(within(table).queryByText('Cari')).toBeNull()
    // "Məlum" is gone from the heading (5.1); the price coverage column beside it says what is missing.
    expect(within(table).getByText(/Cari məbləğ/)).toBeInTheDocument()
    expect(within(table).queryByText(/məlum məbləğ/)).toBeNull()
  })

  it('is compared by money', () => {
    const { container } = render(<ServiceRows rows={[service]} summary={summary()} onTrend={() => {}} />)
    const table = container.querySelector('table')!

    expect(within(table).getByText('150,00 ₼')).toBeInTheDocument()
    expect(within(table).getByText('+50,00 ₼')).toBeInTheDocument()
    expect(within(table).getByText('+50%')).toBeInTheDocument()
  })
})
