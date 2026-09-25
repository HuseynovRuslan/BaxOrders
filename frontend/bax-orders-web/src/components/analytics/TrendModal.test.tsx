import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    supplierNames: [],
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
    state: 'Unchanged',
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

describe('closing', () => {
  /** Task 17 (17.2): the product history is only read, so a press on its background closes it. */
  it('closes on a press on the background', async () => {
    const onClose = vi.fn()
    await renderModal({ onClose })

    await userEvent.click(screen.getByRole('dialog').parentElement as HTMLElement)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('the name of the screen', () => {
  /** Owner decision 5.1: "Trend" is "Məhsul tarixçəsi". */
  it('is called the product history', async () => {
    await renderModal()

    expect(screen.getByRole('heading', { name: 'Məhsul tarixçəsi' })).toBeInTheDocument()
    expect(screen.queryByText(/Trend/)).toBeNull()
  })
})

describe('the history table', () => {
  /** Brief (Task 10): the supplier is shown — a month-by-month column, so a change of supplier is visible. */
  it('is the figures a manager thinks in, with who supplied each month', async () => {
    await renderModal()

    const headers = primary().getAllByRole('columnheader').map((cell) => cell.textContent)
    expect(headers).toEqual(['Ay', 'Miqdar', 'Qiymət', 'Məbləğ', 'Təchizatçı'])
  })

  it('names each month s suppliers, and an em dash where the lines name none', async () => {
    analyticsApi.fetchVariantTrend.mockResolvedValue(trend({
      points: [
        point('2026-05-01'),
        point('2026-07-01', { supplierNames: ['Çinar MMC', 'Zəfər LTD'] }),
      ],
    }))
    await renderModal()

    const july = primary().getByRole('row', { name: /İyul 2026/ })
    expect(within(july).getByText('Çinar MMC · Zəfər LTD')).toBeInTheDocument()
    const may = primary().getByRole('row', { name: /May 2026/ })
    expect(within(may).getAllByRole('cell').at(-1)).toHaveTextContent('—')
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

    expect(primary().getByText('30 ədəd')).toBeInTheDocument()
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
    expect(primary().queryByText('0 ədəd')).toBeNull()
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
    expect(primary().getByText('30 ədəd')).toBeInTheDocument()
    expect(primary().queryByText('0,00 ₼')).toBeNull()
  })

  /**
   * Brief (Task 10, Task 2): an unpriced line reads "—". The count moves into Task 9's short mark, whose name is
   * still Task 2's one sentence for it.
   */
  it('shows an unpriced month as an em dash with the short mark, still warning where a price is owed', async () => {
    analyticsApi.fetchVariantTrend.mockResolvedValue(trend({
      points: [point('2026-07-01', {
        knownAmount: null,
        weightedUnitPrice: null,
        knownPriceItemCount: 0,
        missingRequiredPriceItemCount: 2,
      })],
    }))
    await renderModal()

    const july = primary().getByRole('row', { name: /İyul 2026/ })
    const [, price, amount] = within(july).getAllByRole('cell')
    expect(price).toHaveTextContent('—')
    const mark = within(price).getByRole('img', { name: '2 sətirdə qiymət yoxdur' })
    expect(mark).toHaveTextContent('⚠ 2')
    expect(mark).toHaveClass('text-amber-800')
    expect(amount).toHaveTextContent('—')
  })

  it('shows a real price on an internally supplied product that has one', async () => {
    analyticsApi.fetchVariantTrend.mockResolvedValue(trend({
      points: [point('2026-07-01', { weightedUnitPrice: 4.1, priceNotRequiredItemCount: 1 })],
    }))
    await renderModal()

    expect(primary().getByText('4,10 ₼')).toBeInTheDocument()
    expect(primary().queryByText('Daxili təminat')).toBeNull()
  })

  /** Brief, "Mütləq qorunmalı": the technical record stays folded away. */
  it('keeps the source and version record in a closed section', async () => {
    await renderModal()

    const summary = screen.getByText('Mənbə və versiya məlumatı')
    const details = summary.closest('details')
    expect(details).not.toBeNull()
    expect(details).not.toHaveAttribute('open')
  })
})

describe('who supplies it', () => {
  it('names the suppliers of the latest month the product was ordered in', async () => {
    analyticsApi.fetchVariantTrend.mockResolvedValue(trend({
      points: [
        point('2026-05-01', { supplierNames: ['Köhnə şirkət'] }),
        point('2026-07-01', { supplierNames: ['Aqro MMC', 'Bakı Texnika'] }),
      ],
    }))
    await renderModal()

    expect(screen.getByText('Təchizatçı: Aqro MMC · Bakı Texnika')).toBeInTheDocument()
  })

  /** A month ordered without this product is not the product's latest order; the month that was is named. */
  it('names the month when the latest order of the product is not the last month shown', async () => {
    analyticsApi.fetchVariantTrend.mockResolvedValue(trend({
      from: '2026-07-01',
      to: '2026-08-01',
      points: [
        point('2026-07-01', { supplierNames: ['Aqro MMC'] }),
        point('2026-08-01', { quantity: 0, itemCount: 0, knownAmount: null, weightedUnitPrice: null, knownPriceItemCount: 0 }),
      ],
    }))
    await renderModal()

    expect(screen.getByText('Təchizatçı (İyul 2026): Aqro MMC')).toBeInTheDocument()
  })

  it('says so when no line recorded a supplier', async () => {
    await renderModal()

    expect(screen.getByText('Təchizatçı qeyd olunmayıb')).toBeInTheDocument()
    expect(screen.queryByText(/^Təchizatçı:/)).toBeNull()
  })
})

describe('this month against the basis', () => {
  /** Brief: "orta 30 ədəd, bu ay 40 — 1.3×", against the basis the reader chose (Task 1). */
  it('divides the row s own two quantities, in the chosen basis s words', async () => {
    await renderModal({
      driver: driver({ baselineQuantity: 30, currentQuantity: 40 }),
      quantityRatio: { basis: 'Previous3MonthAverage', windowPeriods: ['2026-04', '2026-05', '2026-06'], baseline: 30, current: 40 },
    })

    const section = within(screen.getByLabelText('Bu ayın müqayisəsi'))
    expect(section.getByText('Son 3 ayın ortalaması: 30 ədəd · bu ay: 40 ədəd — 1,3×')).toBeInTheDocument()
  })

  /** Opened from the comparison page there is no driver; the page's own row and basis give the same line. */
  it('gives the same line when opened without a driver', async () => {
    await renderModal({
      quantityRatio: { basis: 'PreviousMonth', windowPeriods: ['2026-06'], baseline: 30, current: 40 },
    })

    expect(screen.getByText('Keçən ay: 30 ədəd · bu ay: 40 ədəd — 1,3×')).toBeInTheDocument()
    expect(screen.queryByLabelText('Bu ayın müqayisəsi')).toBeNull()
  })

  it('offers no ratio for a service, or without a basis', async () => {
    await renderModal({ isService: true, quantityRatio: { basis: 'PreviousMonth', windowPeriods: ['2026-06'], baseline: 1, current: 2 } })
    expect(screen.queryByText(/bu ay:/)).toBeNull()
  })
})

describe('the chart tabs', () => {
  it('offers quantity, money and the average price', async () => {
    await renderModal()

    const tabs = within(screen.getByRole('group', { name: 'Göstərici' }))
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

    // Owner decision 5.1, with the ending "altı" takes.
    expect(screen.getByText('Son 9 ayın 6-da sifariş edilib')).toBeInTheDocument()
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
    // ₼ is joined to its amount by a no-break space (U+00A0), so it can never fall onto a line of its own.
    const nbsp = String.fromCharCode(0xa0)
    expect(section.textContent).toContain('30 ədəd → 30 ədəd')
    expect(section.textContent).toContain(`2,80${nbsp}₼ → 4,10${nbsp}₼`)
    expect(section.textContent).toContain(`84,00${nbsp}₼ → 123,00${nbsp}₼`)
    expect(detail.getByText('Miqdar təsiri')).toBeInTheDocument()
    expect(detail.getByText('Qiymət təsiri')).toBeInTheDocument()
  })

  /** 9.1: a cost that went up is red and one that went down is green — the direction, said in words too. */
  it('colours each effect by the direction of the cost', async () => {
    await renderModal({ driver: driver({ amountImpact: 30, quantityImpact: 50, priceImpact: -20 }) })

    const detail = within(screen.getByLabelText('Bu ayın müqayisəsi'))
    const up = detail.getByText('+50,00 ₼')
    const down = detail.getByText('−20,00 ₼')
    expect(up).toHaveClass('text-red-700')
    expect(down).toHaveClass('text-emerald-700')
    expect(within(up).getByText(/xərc artıb/)).toHaveClass('sr-only')
    expect(within(down).getByText(/xərc azalıb/)).toHaveClass('sr-only')
    expect(screen.getByLabelText('Bu ayın müqayisəsi').innerHTML).not.toMatch(/text-rose-700/)
  })

  it('says nothing about a comparison when it was not opened from one', async () => {
    await renderModal()

    expect(screen.queryByLabelText('Bu ayın müqayisəsi')).toBeNull()
  })
})
