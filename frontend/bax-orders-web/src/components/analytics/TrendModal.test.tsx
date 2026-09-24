import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VariantIdentity, VariantOrderFrequency, VariantTrend, VariantTrendPoint } from '../../api/analytics'
import type { DecisionDriver } from '../../api/decisions'
import { TrendModal } from './TrendModal'

/**
 * One product at one object, over time.
 *
 * The table is the management view of that history — month, quantity, price, amount — and the technical record
 * of which request and which version each month came from belongs to a different job, so it is folded away.
 * Two distinctions in it are business rules rather than layout: a month with no request is not a month of
 * zero, and a month supplied from the company's own store is complete rather than missing a price.
 */
const analyticsApi = vi.hoisted(() => ({ fetchVariantTrend: vi.fn() }))
vi.mock('../../api/analytics', async () => {
  const actual = await vi.importActual<typeof import('../../api/analytics')>('../../api/analytics')
  return { ...actual, ...analyticsApi }
})

// The chart is loaded lazily and draws nothing useful in jsdom; the numbers under it are the point here.
vi.mock('./TrendChart', () => ({ TrendChart: () => <div data-testid="chart" /> }))

function variant(overrides: Partial<VariantIdentity> = {}): VariantIdentity {
  return {
    productVariantId: 21,
    productId: 11,
    productCode: 'PRD-000011',
    productName: 'York qatlama salfet',
    specificationValue: null,
    specificationUnitCode: null,
    specificationUnitName: null,
    specificationDescriptor: null,
    modelCode: null,
    orderUnitCode: 'PCS',
    orderUnitName: 'Ədəd',
    ...overrides,
  }
}

function point(period: string, overrides: Partial<VariantTrendPoint> = {}): VariantTrendPoint {
  return {
    period,
    orderRequestId: 91,
    version: 1,
    quantity: 30,
    knownAmount: 84,
    weightedUnitPrice: 2.8,
    itemCount: 1,
    knownPriceItemCount: 1,
    missingRequiredPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    ...overrides,
  }
}

function frequency(overrides: Partial<VariantOrderFrequency> = {}): VariantOrderFrequency {
  return {
    availableMonthCount: 9,
    orderedMonthCount: 6,
    firstOrderedPeriod: '2026-01-01',
    lastOrderedPeriod: '2026-09-01',
    monthsSinceLastOrder: 0,
    intervalsInMonths: [1, 2, 1, 2, 1],
    typicalIntervalMonths: 1,
    shortestIntervalMonths: 1,
    longestIntervalMonths: 2,
    ...overrides,
  }
}

function trend(overrides: Partial<VariantTrend> = {}): VariantTrend {
  return {
    locationId: 21,
    locationCode: 'LOC-000021',
    locationName: 'Fəvvarələr meydanı',
    variant: variant(),
    analyticsKind: 'QuantityComparable',
    from: '2026-05-01',
    to: '2026-07-01',
    points: [point('2026-05-01'), point('2026-07-01', { quantity: 40, knownAmount: 164, weightedUnitPrice: 4.1 })],
    frequency: frequency(),
    ...overrides,
  }
}

function driver(overrides: Partial<DecisionDriver> = {}): DecisionDriver {
  return {
    variant: variant(),
    analyticsKind: 'QuantityComparable',
    category: 'PriceChange',
    amountImpact: 39,
    quantityImpact: 0,
    priceImpact: 39,
    currentQuantity: 30,
    baselineQuantity: 30,
    quantityPercentChange: 0,
    currentUnitPrice: 4.1,
    baselineUnitPrice: 2.8,
    unitPricePercentChange: 46.4286,
    currentKnownAmount: 123,
    baselineKnownAmount: 84,
    currentItemCount: 1,
    baselineItemCount: 1,
    missingPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    priceIsComplete: true,
    supplyChanged: false,
    ...overrides,
  }
}

async function renderModal(props: Partial<Parameters<typeof TrendModal>[0]> = {}) {
  render(
    <TrendModal
      locationId={21}
      variant={variant()}
      isService={false}
      to="2026-07"
      onClose={() => {}}
      {...props}
    />,
  )

  await screen.findAllByRole('table')
}

/** The month/quantity/price/amount table, which is the first one in the modal. */
function primary() {
  return within(screen.getAllByRole('table')[0])
}

beforeEach(() => analyticsApi.fetchVariantTrend.mockReset().mockResolvedValue(trend()))
afterEach(() => vi.clearAllMocks())

describe('the history table', () => {
  it('is the four figures a manager thinks in', async () => {
    await renderModal()

    const headers = primary().getAllByRole('columnheader').map((cell) => cell.textContent)
    expect(headers).toEqual(['Ay', 'Miqdar', 'Qiymət', 'Məbləğ'])
  })

  /** Which request a month came from answers a different question, from a different job. */
  it('keeps the line count and the version out of it', async () => {
    await renderModal()

    expect(primary().queryByRole('columnheader', { name: 'Sətir' })).toBeNull()
    expect(primary().queryByRole('columnheader', { name: 'Versiya' })).toBeNull()
    // Still reachable, just not in the way.
    expect(screen.getByText('Mənbə və versiya məlumatı')).toBeInTheDocument()
  })

  it('shows each month with its quantity, price and amount', async () => {
    await renderModal()

    expect(primary().getByText('30 PCS')).toBeInTheDocument()
    expect(primary().getByText('2,80 ₼')).toBeInTheDocument()
    expect(primary().getByText('84,00 ₼')).toBeInTheDocument()
  })

  /**
   * A month the object has no request for is a gap in the history, not an order of nothing. Writing a zero
   * there would make a comparison out of a month nobody recorded.
   */
  it('says a month with no request has none, rather than showing zeros', async () => {
    await renderModal()

    expect(primary().getByText('sifariş yoxdur')).toBeInTheDocument()
    expect(primary().queryByText('0 PCS')).toBeNull()
  })

  /** Nothing is missing about it, so it is not amber and it is certainly not "Qiymət çatışmır". */
  it('describes an internally supplied month instead of warning about it', async () => {
    analyticsApi.fetchVariantTrend.mockResolvedValue(trend({
      points: [point('2026-07-01', {
        knownAmount: null,
        weightedUnitPrice: null,
        knownPriceItemCount: 0,
        priceNotRequiredItemCount: 1,
      })],
    }))
    await renderModal()

    const label = primary().getByText('Daxili təminat')
    expect(label).toBeInTheDocument()
    expect(label).not.toHaveClass('text-amber-800')
    expect(primary().queryByText(/Qiymət çatışmır/)).toBeNull()
    // Real quantity, and no fabricated zero money.
    expect(primary().getByText('30 PCS')).toBeInTheDocument()
    expect(primary().queryByText('0,00 ₼')).toBeNull()
  })

  it('still warns where a price is genuinely owed', async () => {
    analyticsApi.fetchVariantTrend.mockResolvedValue(trend({
      points: [point('2026-07-01', {
        knownAmount: null,
        weightedUnitPrice: null,
        knownPriceItemCount: 0,
        missingRequiredPriceItemCount: 2,
      })],
    }))
    await renderModal()

    expect(primary().getByText('2 sətir qiymətsiz')).toHaveClass('text-amber-800')
  })

  it('shows a real price on an internally supplied product that has one', async () => {
    analyticsApi.fetchVariantTrend.mockResolvedValue(trend({
      points: [point('2026-07-01', { weightedUnitPrice: 4.1, priceNotRequiredItemCount: 1 })],
    }))
    await renderModal()

    expect(primary().getByText('4,10 ₼')).toBeInTheDocument()
    expect(primary().queryByText('Daxili təminat')).toBeNull()
  })
})

describe('the chart tabs', () => {
  it('offers quantity, money and the average price', async () => {
    await renderModal()

    const tabs = within(screen.getByRole('group', { name: 'Trend göstəricisi' }))
    expect(tabs.getByRole('button', { name: 'Miqdar' })).toBeInTheDocument()
    expect(tabs.getByRole('button', { name: 'Məbləğ' })).toBeInTheDocument()
    expect(tabs.getByRole('button', { name: 'Orta qiymət' })).toBeInTheDocument()
  })

  it('explains that the average is weighted', async () => {
    await renderModal()

    expect(screen.getByRole('button', { name: 'Orta qiymət necə hesablanır?' })).toBeInTheDocument()
  })
})

describe('how often it is ordered', () => {
  it('counts the months that exist, not the months of the year', async () => {
    await renderModal()

    expect(screen.getByText('Son 9 mövcud aydan 6-də sifariş edilib')).toBeInTheDocument()
    expect(screen.getByText(/İlk sifariş: Yanvar 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Son sifariş: Sentyabr 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Tipik interval: 1–2 ay/)).toBeInTheDocument()
  })

  /** With one gap there is nothing typical yet, so nothing is claimed. */
  it('claims no typical interval until there is a median to give', async () => {
    analyticsApi.fetchVariantTrend.mockResolvedValue(trend({
      frequency: frequency({ intervalsInMonths: [2], typicalIntervalMonths: null, shortestIntervalMonths: 2, longestIntervalMonths: 2 }),
    }))
    await renderModal()

    expect(screen.queryByText(/Tipik interval/)).toBeNull()
  })

  it('says how long it has been since the product was last ordered', async () => {
    analyticsApi.fetchVariantTrend.mockResolvedValue(trend({ frequency: frequency({ monthsSinceLastOrder: 3 }) }))
    await renderModal()

    expect(screen.getByText(/Son sifarişdən sonra 3 ay keçib/)).toBeInTheDocument()
  })
})

describe('the comparison it was opened from', () => {
  it('gives both sides of every figure and the split of the difference', async () => {
    await renderModal({ driver: driver() })

    const section = screen.getByLabelText('Bu ayın müqayisəsi')
    const detail = within(section)
    // The arrow sits in its own element, so the pair is read from the line rather than matched as one string.
    expect(section.textContent).toContain('30 PCS → 30 PCS')
    expect(section.textContent).toContain('2,80 ₼ → 4,10 ₼')
    expect(section.textContent).toContain('84,00 ₼ → 123,00 ₼')
    expect(detail.getByText('Miqdar təsiri')).toBeInTheDocument()
    expect(detail.getByText('Qiymət təsiri')).toBeInTheDocument()
    expect(detail.getByText('+39,00 ₼')).toHaveClass('text-emerald-700')
  })

  it('says nothing about a comparison when it was not opened from one', async () => {
    await renderModal()

    expect(screen.queryByLabelText('Bu ayın müqayisəsi')).toBeNull()
  })
})
