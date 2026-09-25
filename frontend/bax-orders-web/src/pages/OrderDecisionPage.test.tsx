import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VariantIdentity, VariantTrend } from '../api/analytics'
import type { DecisionComparison, DecisionDriver, OrderDecisionContext } from '../api/decisions'
import type { OrderRequestDetail, OrderRequestItem } from '../api/orders'
import type { OrderRevision } from '../api/revisions'
import type { OrderWorkflow } from '../api/workflow'
import { findOldTerms } from '../test/oldTerms'
import { OrderDetailPage } from './OrderDetailPage'

/**
 * The order screen read as a decision rather than as a record.
 * <para>
 * What is pinned here is the order of the answers — how much, how different, why, may I decide — and the
 * refusals: nothing claimed about a month that has no predecessor, no confident cause over a missing price,
 * and no approval rule worked out in the browser.
 * </para>
 */
const ordersApi = vi.hoisted(() => ({ fetchOrder: vi.fn(), fetchOrderItemSource: vi.fn() }))
const revisionsApi = vi.hoisted(() => ({ fetchRevision: vi.fn() }))
const workflowApi = vi.hoisted(() => ({ fetchWorkflow: vi.fn() }))
const decisionsApi = vi.hoisted(() => ({ fetchDecisionContext: vi.fn() }))
const analyticsApi = vi.hoisted(() => ({ fetchVariantTrend: vi.fn() }))

vi.mock('../api/orders', async () => {
  const actual = await vi.importActual<typeof import('../api/orders')>('../api/orders')
  return { ...actual, ...ordersApi }
})
vi.mock('../api/revisions', async () => {
  const actual = await vi.importActual<typeof import('../api/revisions')>('../api/revisions')
  return { ...actual, ...revisionsApi }
})
vi.mock('../api/workflow', async () => {
  const actual = await vi.importActual<typeof import('../api/workflow')>('../api/workflow')
  return { ...actual, ...workflowApi }
})
vi.mock('../api/decisions', async () => {
  const actual = await vi.importActual<typeof import('../api/decisions')>('../api/decisions')
  return { ...actual, ...decisionsApi }
})
vi.mock('../api/analytics', async () => {
  const actual = await vi.importActual<typeof import('../api/analytics')>('../api/analytics')
  return { ...actual, ...analyticsApi }
})

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

/** One basis resolved for the order. Whichever is primary, the shape is the same. */
function comparison(overrides: Partial<DecisionComparison> = {}): DecisionComparison {
  return {
    basis: 'PreviousMonth',
    customStart: null,
    customEnd: null,
    windowPeriods: ['2026-06-01'],
    expectedPeriodCount: 1,
    availablePeriodCount: 1,
    missingPeriods: [],
    periods: [],
    available: true,
    baselineKnownAmount: 4200,
    deltaAmount: 600,
    deltaPercent: 14.2857,
    amountIsComplete: true,
    baselineMissingPriceItemCount: 0,
    ...overrides,
  }
}

function context(overrides: Partial<OrderDecisionContext> = {}): OrderDecisionContext {
  return {
    orderRequestId: 105,
    locationId: 21,
    locationCode: 'LOC-000021',
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    version: 2,
    status: 'Draft',
    isLatestVersion: true,
    latestOrderRequestId: 105,
    latestVersion: 2,
    current: {
      knownAmount: 4800,
      itemCount: 40,
      knownPriceItemCount: 40,
      missingPriceItemCount: 0,
      priceNotRequiredItemCount: 0,
      isComplete: true,
    },
    primary: comparison({
      basis: 'PreviousMonth',
      windowPeriods: ['2026-06-01'],
      expectedPeriodCount: 1,
      availablePeriodCount: 1,
      periods: [{ period: '2026-06-01', orderRequestId: 104, version: 1, status: 'Approved' }],
      baselineKnownAmount: 4200,
      deltaAmount: 600,
      deltaPercent: 14.2857,
    }),
    secondary: [
      comparison({
        basis: 'Previous3MonthAverage',
        windowPeriods: ['2026-04-01', '2026-05-01', '2026-06-01'],
        expectedPeriodCount: 3,
        availablePeriodCount: 2,
        missingPeriods: ['2026-04-01'],
        baselineKnownAmount: 4000,
        deltaAmount: 800,
        deltaPercent: 20,
      }),
      comparison({
        basis: 'Previous6MonthAverage',
        windowPeriods: ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01'],
        expectedPeriodCount: 6,
        availablePeriodCount: 3,
        baselineKnownAmount: 3800,
        deltaAmount: 1000,
        deltaPercent: 26.3158,
      }),
      comparison({
        basis: 'AllPriorMonths',
        windowPeriods: ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01'],
        expectedPeriodCount: 6,
        availablePeriodCount: 3,
        baselineKnownAmount: 3700,
        deltaAmount: 1100,
        deltaPercent: 29.7297,
      }),
    ],
    decomposition: {
      categories: [
        { category: 'NewOrders', amount: 50, variantCount: 1 },
        { category: 'QuantityChange', amount: 511, variantCount: 2 },
        { category: 'PriceChange', amount: 39, variantCount: 1 },
        { category: 'NoLongerOrdered', amount: 0, variantCount: 0 },
        { category: 'Services', amount: 0, variantCount: 0 },
        { category: 'UnattributedDueToMissingPrice', amount: 0, variantCount: 0 },
      ],
      totalAmountImpact: 600,
      explanationIsComplete: true,
      unattributedVariantCount: 0,
      internalSupplyVariantCount: 0,
      supplyChangedVariantCount: 0,
      drivers: [driver()],
      products: {
        comparedCount: 45,
        inCurrentOrderCount: 40,
        newCount: 1,
        noLongerOrderedCount: 0,
        listedCount: 1,
        increasedCount: 2,
        decreasedCount: 0,
        serviceCount: 0,
      },
      steady: [],
      variantTransitions: [],
    },
    ...overrides,
  }
}

function item(): OrderRequestItem {
  return {
    orderRequestItemId: 501,
    productId: 11,
    productCode: 'PRD-000011',
    productName: 'York qatlama salfet',
    productVariantId: 21,
    specificationValue: null,
    specificationUnitCode: null,
    specificationUnitName: null,
    specificationDescriptor: null,
    modelCode: null,
    orderUnitCode: 'PCS',
    orderUnitName: 'Ədəd',
    quantity: 30,
    unitPrice: 4.1,
    lineTotal: 123,
    supplierId: null,
    supplierName: null,
    pricingMode: 'PriceRequired',
    sourceSupplierName: null,
    categoryPath: [],
    source: null,
    sourceOrderRequestItemId: null,
  }
}

function detail(overrides: Partial<OrderRequestDetail> = {}): OrderRequestDetail {
  // Honour a caller's own lines; the default is one ordinary priced row.
  const items = overrides.items?.items ?? [item()]
  return {
    orderRequestId: 105,
    locationId: 21,
    locationCode: 'LOC-000021',
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    requestDate: null,
    version: 2,
    status: 'Draft',
    createdAtUtc: '2026-09-22T10:00:00Z',
    sourceImportBatchId: null,
    itemCount: 40,
    knownPriceItemCount: 40,
    missingPriceItemCount: 0,
    knownAmountTotal: 4800,
    isRevision: false,
    sourceOrderRequestId: null,
    sourceVersion: null,
    hasRevision: false,
    revisionOrderRequestId: null,
    revisionVersion: null,
    canCreateRevision: false,
    canEditRevision: false,
    ...overrides,
    items: { items, page: 1, pageSize: 50, totalCount: items.length, ...overrides.items },
  }
}

function revision(): OrderRevision {
  return {
    orderRequestId: 105,
    locationId: 21,
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    version: 2,
    status: 'Draft',
    isRevision: false,
    revisedFrom: null,
    revisedInto: null,
    isLatestVersion: true,
    canCreateRevision: false,
    canEditRevision: false,
    rowVersion: '00FF01',
    itemCount: 40,
    missingPriceItemCount: 0,
    knownAmountTotal: 4800,
    amountIsComplete: true,
    editHistory: [],
  }
}

function workflow(overrides: Partial<OrderWorkflow> = {}): OrderWorkflow {
  return {
    orderRequestId: 105,
    locationId: 21,
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    version: 2,
    status: 'PendingApproval',
    allowedActions: {
      canSubmit: false,
      canApprove: true,
      canReturn: true,
      blockedBySelfApproval: false,
      blockedByOwnContribution: false,
      blockedByMissingAuthority: false,
    },
    submittedByUserId: 'bbbb',
    submittedAtUtc: '2026-09-22T10:00:00Z',
    approvedAtUtc: null,
    returnedAtUtc: null,
    itemCount: 40,
    missingPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    knownAmountTotal: 4800,
    amountIsComplete: true,
    requiresMissingPriceAcknowledgement: false,
    history: [],
    decisionFacts: {
      isHistoricalImport: false,
      submissionNumber: 1,
      submittedByDisplayName: 'Test Koordinator',
      submittedAtUtc: '2026-09-22T10:00:00Z',
      previousReturn: null,
      decision: null,
    },
    ...overrides,
  }
}

function trend(): VariantTrend {
  return {
    locationId: 21,
    locationCode: 'LOC-000021',
    locationName: 'Fəvvarələr meydanı',
    variant: variant(),
    analyticsKind: 'QuantityComparable',
    from: '2026-06-01',
    to: '2026-07-01',
    frequency: {
      availableMonthCount: 2,
      orderedMonthCount: 2,
      firstOrderedPeriod: '2026-06-01',
      lastOrderedPeriod: '2026-07-01',
      monthsSinceLastOrder: 0,
      intervalsInMonths: [1],
      typicalIntervalMonths: null,
      shortestIntervalMonths: 1,
      longestIntervalMonths: 1,
    },
    points: [
      {
        period: '2026-06-01',
        orderRequestId: 104,
        version: 1,
        quantity: 30,
        knownAmount: 84,
        weightedUnitPrice: 2.8,
        itemCount: 1,
        knownPriceItemCount: 1,
        missingRequiredPriceItemCount: 0,
        priceNotRequiredItemCount: 0,
        supplierNames: [],
      },
      {
        period: '2026-07-01',
        orderRequestId: 105,
        version: 2,
        quantity: 30,
        knownAmount: 123,
        weightedUnitPrice: 4.1,
        itemCount: 1,
        knownPriceItemCount: 1,
        missingRequiredPriceItemCount: 0,
        priceNotRequiredItemCount: 0,
        supplierNames: ['Cleanfix MMC'],
      },
    ],
  }
}

beforeEach(() => {
  ordersApi.fetchOrder.mockReset().mockResolvedValue(detail())
  ordersApi.fetchOrderItemSource.mockReset()
  revisionsApi.fetchRevision.mockReset().mockResolvedValue(revision())
  workflowApi.fetchWorkflow.mockReset().mockResolvedValue(workflow())
  decisionsApi.fetchDecisionContext.mockReset().mockResolvedValue(context())
  analyticsApi.fetchVariantTrend.mockReset().mockResolvedValue(trend())
})

afterEach(() => vi.clearAllMocks())

async function renderPage() {
  render(
    <MemoryRouter initialEntries={['/orders/105']}>
      <Routes>
        <Route path="/orders/:orderRequestId" element={<OrderDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByRole('region', { name: 'Sifarişin məbləği və müqayisəsi' })
}

function headline() {
  return screen.getByRole('region', { name: 'Sifarişin məbləği və müqayisəsi' })
}

describe('the first screenful', () => {
  it('leads with what the order costs', async () => {
    await renderPage()

    expect(within(headline()).getByText('4.800,00 ₼')).toBeInTheDocument()
    // The line count left this line (5.3): beside "2 sətirdə qiymət yoxdur" it said "sətir" twice, and with
    // every line priced it was the only thing on it.
    expect(within(headline()).queryByText(/40 sətir/)).toBeNull()
  })

  it('puts the comparison with last month directly under it', async () => {
    await renderPage()

    // The comparison names itself and the months it covers, so the figure under it cannot be misread.
    expect(within(headline()).getByText(/Müqayisə: Keçən ay \(İyun 2026\)/)).toBeInTheDocument()
    expect(within(headline()).getByText('4.200,00 ₼')).toBeInTheDocument()
    expect(within(headline()).getByText('+600,00 ₼')).toBeInTheDocument()
    expect(within(headline()).getByText('+14,29%')).toBeInTheDocument()
  })

  /** The audit: "17.583,62 ₼" beside a large coloured figure, and nothing said which one was the basis. */
  it('says which figure is the basis and which the difference', async () => {
    await renderPage()

    const basisLabel = within(headline()).getByText('Baza')
    expect(basisLabel.nextElementSibling).toHaveTextContent('4.200,00 ₼')

    const differenceLabel = within(headline()).getByText('Fərq')
    const [amount, percent] = Array.from(differenceLabel.parentElement!.children).slice(1)
    expect(amount).toHaveTextContent('+600,00 ₼')
    expect(percent).toHaveTextContent('+14,29%')
  })

  /** Owner decision 9.1: the direction of the cost — up red, down green — never green for "more". */
  it('colours a rise in cost red', async () => {
    await renderPage()

    expect(within(headline()).getByText('+600,00 ₼')).toHaveClass('text-red-700')
    expect(within(headline()).getByText('+14,29%')).toHaveClass('text-red-700')
    // The small bases beside it follow the same rule.
    const beside = within(within(headline()).getByLabelText('Digər müqayisə bazaları'))
    expect(beside.getByText('+800,00 ₼')).toHaveClass('text-red-700')
    expect(headline().querySelector('[class*="text-emerald"]')).toBeNull()
  })

  it('colours a fall in cost green', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      primary: comparison({ baselineKnownAmount: 5400, deltaAmount: -600, deltaPercent: -11.1111 }),
      secondary: [comparison({ basis: 'Previous3MonthAverage', baselineKnownAmount: 5000, deltaAmount: -200, deltaPercent: -4 })],
    }))
    await renderPage()

    expect(within(headline()).getByText('−600,00 ₼')).toHaveClass('text-emerald-700')
    expect(within(headline()).getByText('−11,11%')).toHaveClass('text-emerald-700')
    expect(within(within(headline()).getByLabelText('Digər müqayisə bazaları')).getByText('−200,00 ₼'))
      .toHaveClass('text-emerald-700')
    expect(headline().querySelector('[class*="text-rose"], [class*="text-red"]')).toBeNull()
  })

  it('explains the change against the basis the reader chose', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      primary: comparison({
        basis: 'Previous3MonthAverage',
        windowPeriods: ['2026-04-01', '2026-05-01', '2026-06-01'],
        expectedPeriodCount: 3,
        availablePeriodCount: 3,
      }),
    }))
    await renderPage()

    const causes = within(screen.getByRole('region', { name: 'Dəyişikliyin səbəbləri' }))
    expect(causes.getByText('Son 3 ayın ortalamasına görə')).toBeInTheDocument()
    expect(causes.queryByText(/Keçən aya görə/)).toBeNull()
  })

  it('keeps the other bases as quiet context beside it', async () => {
    await renderPage()

    const beside = within(within(headline()).getByLabelText('Digər müqayisə bazaları'))
    // Named in the small print, not in the headline: context, never a second verdict.
    expect(beside.getByText('Son 3 ayın ortalaması')).toBeInTheDocument()
    expect(beside.getByText(/2\/3 ay/)).toBeInTheDocument()
    expect(beside.getByText('Son 6 ayın ortalaması')).toBeInTheDocument()
    // "Bütün dövr" was missing from this screen entirely; it is a first-class basis now.
    expect(beside.getByText('Bütün dövrün ortalaması')).toBeInTheDocument()
  })

  it('offers the same five choices the dashboard offers', async () => {
    await renderPage()

    const picker = within(within(headline()).getByRole('group', { name: 'Müqayisə' }))
    // The whole-period button carries the same words as the sentence it produces (5.3).
    for (const label of ['Keçən ay', 'Son 3 ayın ortalaması', 'Son 6 ayın ortalaması', 'Bütün dövrün ortalaması', 'Xüsusi seçim']) {
      expect(picker.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('answers why it changed, and offers the decision', async () => {
    await renderPage()

    expect(screen.getByText('Niyə dəyişib?')).toBeInTheDocument()
    // The decision panel loads on its own; what matters is that it arrives beside the explanation.
    expect(await screen.findByRole('button', { name: 'Təsdiqlə' })).toBeInTheDocument()
  })
})

/**
 * Brief, "Mütləq qorunmalı": "Obyektin sifarişləri" leads to the object page — and now keeps the basis, so the
 * object page compares against what the reader was looking at here (Task 11).
 */
describe('the way back to the object', () => {
  it('leads to the object page with the basis this page is reading', async () => {
    render(
      <MemoryRouter initialEntries={['/orders/105?basis=avg3']}>
        <Routes>
          <Route path="/orders/:orderRequestId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await screen.findByRole('region', { name: 'Sifarişin məbləği və müqayisəsi' })

    expect(screen.getByRole('link', { name: 'Obyektin sifarişləri' })).toHaveAttribute('href', '/locations/21?basis=avg3')
  })

  it('says last month when the page is reading last month', async () => {
    await renderPage()

    expect(screen.getByRole('link', { name: 'Obyektin sifarişləri' })).toHaveAttribute('href', '/locations/21?basis=last')
  })
})

describe('a month with nothing before it', () => {
  it('says so, and does not present its products as new', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      primary: comparison({
        available: false,
        availablePeriodCount: 0,
        periods: [],
        baselineKnownAmount: null,
        deltaAmount: null,
        deltaPercent: null,
      }),
      decomposition: null,
    }))
    await renderPage()

    // About the window the reader chose, not about "last month": they may have chosen any window.
    expect(within(headline()).getByText('Seçilmiş dövrdə müqayisə üçün sifariş yoxdur')).toBeInTheDocument()
    expect(screen.queryByText('Niyə dəyişib?')).toBeNull()
    expect(screen.queryByText('Yeni məhsullar')).toBeNull()
  })
})

describe('an order whose prices are not all known', () => {
  it('says how many, once, beside the amount it affects', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      current: {
        knownAmount: 4800,
        itemCount: 40,
        knownPriceItemCount: 38,
        missingPriceItemCount: 2,
        priceNotRequiredItemCount: 0,
        isComplete: false,
      },
    }))
    await renderPage()

    expect(within(headline()).getByText(/2 sətirdə qiymət yoxdur/)).toBeInTheDocument()
    // Task 2's sentence alone, not "40 sətir · 2 sətirdə qiymət yoxdur".
    expect(headline()).not.toHaveTextContent(/40 sətir/)
  })
})

describe('the drivers', () => {
  it('names the product, the prices it moved between and what that was worth', async () => {
    await renderPage()

    expect(screen.getByText('Əsas dəyişikliklər')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /York qatlama salfet/ })).toBeInTheDocument()
    expect(screen.getByText(/Qiymət 2,80 ₼ → 4,10 ₼/)).toBeInTheDocument()
  })

  it('opens that product s own history when it is clicked', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: /York qatlama salfet/ }))

    await waitFor(() => expect(analyticsApi.fetchVariantTrend).toHaveBeenCalled())
    // Twelve months ending on the month being decided — the history of this product at this object.
    expect(analyticsApi.fetchVariantTrend).toHaveBeenCalledWith(
      21,
      21,
      { from: '2025-08', to: '2026-07' },
      expect.anything(),
    )
  })

  /**
   * Brief: every count says what it counts. The list gets the backend's counts and says what "Hamısı" is. The tail
   * changed deliberately in 11b — "məhsulun məbləği dəyişməyib", the words of the chip those products are now under.
   */
  it('says what "Hamısı" counts, from the counts the backend sent', async () => {
    await renderPage()

    const list = screen.getByRole('region', { name: 'Əsas dəyişikliklər' })
    expect(within(list).getByText(
      'Bu sifarişdə 40 məhsul var, müqayisə bazası ilə birlikdə 45. «Hamısı» onlardan dəyişən 1 məhsulu sayır. '
      + '44 məhsulun məbləği dəyişməyib.',
    )).toBeInTheDocument()
    expect(within(list).getByText('Artıb: 2 · Azalıb: 0')).toBeInTheDocument()
  })

  /** 11.1: an order in which nothing moved money still lists the products it was compared on. */
  it('lists the products when none moved money but some were compared', async () => {
    const steady = driver({
      variant: variant({ productVariantId: 71, productName: 'Sabit mal' }),
      category: 'QuantityChange',
      amountImpact: 0,
      quantityImpact: 0,
      priceImpact: 0,
      currentUnitPrice: 2.8,
      unitPricePercentChange: 0,
      currentKnownAmount: 84,
      state: 'Unchanged',
    })
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      decomposition: {
        ...context().decomposition!,
        drivers: [],
        steady: [steady],
        products: { ...context().decomposition!.products, comparedCount: 1, inCurrentOrderCount: 1, listedCount: 0 },
      },
    }))
    await renderPage()

    const list = within(screen.getByRole('region', { name: 'Əsas dəyişikliklər' }))
    await userEvent.click(list.getByRole('button', { name: /Məbləği dəyişməyən/ }))
    expect(list.getByRole('button', { name: /Sabit mal/ })).toHaveTextContent('Dəyişməyib')
  })

  /** The window compares against the basis the page compares against (Task 1), with the row's own figures. */
  it('opens the history with this month against the page s own basis, and the supplier', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      primary: comparison({
        basis: 'Previous3MonthAverage',
        windowPeriods: ['2026-04-01', '2026-05-01', '2026-06-01'],
        expectedPeriodCount: 3,
        availablePeriodCount: 3,
      }),
      decomposition: {
        ...context().decomposition!,
        drivers: [driver({ baselineQuantity: 30, currentQuantity: 40, quantityImpact: 28, priceImpact: 11 })],
      },
    }))
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: /York qatlama salfet/ }))

    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Son 3 ayın ortalaması: 30 ədəd · bu ay: 40 ədəd — 1,3×')).toBeInTheDocument()
    expect(within(dialog).getByText('Təchizatçı: Cleanfix MMC')).toBeInTheDocument()
  })
})

describe('the decision', () => {
  it('offers exactly what the server allowed, and nothing worked out here', async () => {
    workflowApi.fetchWorkflow.mockResolvedValue(workflow({
      allowedActions: {
        canSubmit: false,
        canApprove: false,
        canReturn: false,
        blockedBySelfApproval: true,
        blockedByOwnContribution: false,
        blockedByMissingAuthority: false,
      },
    }))
    await renderPage()

    expect(await screen.findByText(/Özünüzün təsdiqə göndərdiyiniz sifarişi təsdiqləyə bilməzsiniz/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
  })

  it('puts the decision first in the column beside the analysis, which stays on screen and never outgrows it', async () => {
    await renderPage()

    const panel = await screen.findByRole('region', { name: 'Qərar' })
    const column = panel.parentElement!

    // The decision panel comes before the correction panel and any note, and its buttons come first in it.
    expect(column.firstElementChild).toBe(panel)
    expect(within(panel).getAllByRole('button')[0]).toHaveTextContent('Təsdiqlə')
    expect(within(panel).getByRole('button', { name: 'Düzəliş tələb et' })).toBeInTheDocument()

    // Sticky on a wide screen, as before — and capped to the viewport, scrolling inside itself.
    expect(column).toHaveClass('lg:sticky', 'lg:top-4', 'lg:max-h-[calc(100vh-2rem)]', 'lg:overflow-y-auto')
  })

  it('shows the status once, in the header, and not again beside the decision', async () => {
    ordersApi.fetchOrder.mockResolvedValue(detail({ status: 'PendingApproval' }) as never)
    await renderPage()

    const panel = await screen.findByRole('region', { name: 'Qərar' })

    expect(screen.getAllByText('Təsdiq gözləyir')).toHaveLength(1)
    expect(within(panel).queryByText('Təsdiq gözləyir')).toBeNull()
  })

  it('shows who approved and when, once approved — and still the status only once', async () => {
    ordersApi.fetchOrder.mockResolvedValue(detail({ status: 'Approved' }) as never)
    workflowApi.fetchWorkflow.mockResolvedValue(workflow({
      status: 'Approved',
      allowedActions: {
        canSubmit: false,
        canApprove: false,
        canReturn: false,
        blockedBySelfApproval: false,
        blockedByOwnContribution: false,
        blockedByMissingAuthority: false,
      },
      decisionFacts: {
        isHistoricalImport: false,
        submissionNumber: 1,
        submittedByDisplayName: 'Test Koordinator',
        submittedAtUtc: '2026-09-22T10:00:00Z',
        previousReturn: null,
        decision: { action: 'Approved', actorDisplayName: 'Test Rəhbər', occurredAtUtc: '2026-09-23T09:30:00Z', reason: null },
      },
    }))
    await renderPage()

    const panel = await screen.findByRole('region', { name: 'Qərar' })

    expect(within(panel).getByText('Təsdiqləyən')).toBeInTheDocument()
    expect(within(panel).getByText('Test Rəhbər')).toBeInTheDocument()
    expect(screen.getAllByText('Təsdiqlənib')).toHaveLength(1)
    expect(within(panel).queryByText('Təsdiqlənib')).toBeNull()
  })
})

describe('an older version', () => {
  it('answers about the version that was opened, and offers the newer one rather than substituting it', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      version: 1,
      isLatestVersion: false,
      latestOrderRequestId: 106,
      latestVersion: 2,
    }))
    await renderPage()

    expect(within(headline()).getByText('4.800,00 ₼')).toBeInTheDocument()
    // In business words (Task 05b): the newer order of the month, not "Versiya 2".
    expect(screen.getByText(/Bu ay üçün bu obyektin daha yeni sifarişi var\. Rəqəmlər açdığınız sifarişə aiddir\./))
      .toBeInTheDocument()
    // With the basis the page is reading (11b: every link out keeps it), which here is last month.
    expect(screen.getByRole('link', { name: 'Ən son sifarişə bax' })).toHaveAttribute('href', '/orders/106?basis=last')
    expect(document.body).not.toHaveTextContent(/versiya/i)
  })

  it('offers the newer one with the basis the reader chose', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      version: 1,
      isLatestVersion: false,
      latestOrderRequestId: 106,
      latestVersion: 2,
    }))
    render(
      <MemoryRouter initialEntries={['/orders/105?basis=avg3']}>
        <Routes>
          <Route path="/orders/:orderRequestId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await screen.findByRole('region', { name: 'Sifarişin məbləği və müqayisəsi' })

    expect(screen.getByRole('link', { name: 'Ən son sifarişə bax' })).toHaveAttribute('href', '/orders/106?basis=avg3')
  })
})

/**
 * 11.1, sub-line 3: what the comparison page said about the window, said on the order page — which months are
 * missing, every month with the order behind it, and when both sides owe prices.
 */
describe('what the window is made of', () => {
  const partial = comparison({
    basis: 'Previous3MonthAverage',
    windowPeriods: ['2026-04-01', '2026-05-01', '2026-06-01'],
    expectedPeriodCount: 3,
    availablePeriodCount: 2,
    missingPeriods: ['2026-04-01'],
    periods: [
      { period: '2026-05-01', orderRequestId: 103, version: 1, status: 'Approved' },
      { period: '2026-06-01', orderRequestId: 104, version: 1, status: 'Approved' },
    ],
  })

  async function renderAt(url: string) {
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/orders/:orderRequestId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await screen.findByRole('region', { name: 'Sifarişin məbləği və müqayisəsi' })
  }

  it('names the missing months where the average says how many it rests on', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({ primary: partial }))
    await renderAt('/orders/105?basis=avg3')

    expect(within(headline()).getByText('(2/3 ay · Çatışmayan: Aprel 2026)')).toBeInTheDocument()
  })

  it('lists every month of the window on request, each order opened with the basis', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({ primary: partial }))
    await renderAt('/orders/105?basis=avg3')

    const toggle = within(headline()).getByRole('button', { name: 'Müqayisəyə daxil olan aylar' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(headline()).queryByText('Aprel 2026 — sifariş yoxdur')).toBeNull()

    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const months = within(headline()).getAllByRole('listitem')
    expect(months.map((month) => month.textContent)).toEqual([
      'Aprel 2026 — sifariş yoxdur',
      'May 2026 · Sifarişə bax',
      'İyun 2026 · Sifarişə bax',
    ])
    expect(months[0]).toHaveClass('text-amber-900')
    expect(months[0].querySelector('svg')).toBeNull()
    expect(within(months[1]).getByRole('link', { name: 'Sifarişə bax' })).toHaveAttribute('href', '/orders/103?basis=avg3')
    expect(within(months[2]).getByRole('link', { name: 'Sifarişə bax' })).toHaveAttribute('href', '/orders/104?basis=avg3')
  })

  it('lists the window even when it holds no order at all', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      primary: comparison({
        windowPeriods: ['2026-06-01'],
        available: false,
        availablePeriodCount: 0,
        missingPeriods: ['2026-06-01'],
        periods: [],
        baselineKnownAmount: null,
        deltaAmount: null,
        deltaPercent: null,
      }),
      decomposition: null,
    }))
    await renderAt('/orders/105')

    expect(within(headline()).getByText('Seçilmiş dövrdə müqayisə üçün sifariş yoxdur')).toBeInTheDocument()
    await userEvent.click(within(headline()).getByRole('button', { name: 'Müqayisəyə daxil olan aylar' }))
    expect(within(headline()).getByText('İyun 2026 — sifariş yoxdur')).toBeInTheDocument()
    expect(within(headline()).queryByRole('link', { name: 'Sifarişə bax' })).toBeNull()
  })

  const owing = {
    knownAmount: 4800,
    itemCount: 40,
    knownPriceItemCount: 38,
    missingPriceItemCount: 2,
    priceNotRequiredItemCount: 0,
    isComplete: false,
  }

  it('says neither amount is whole when both sides owe prices', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      current: owing,
      primary: comparison({ ...partial, baselineMissingPriceItemCount: 3 }),
    }))
    await renderAt('/orders/105?basis=avg3')

    expect(within(headline()).getByText('Müqayisə dövründə də 3 sətirdə qiymət yoxdur — hər iki məbləğ tam deyil.'))
      .toBeInTheDocument()
  })

  it('says nothing of the sort when only this order owes prices', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      current: owing,
      primary: comparison({ ...partial, baselineMissingPriceItemCount: 0 }),
    }))
    await renderAt('/orders/105?basis=avg3')

    expect(within(headline()).getByText(/2 sətirdə qiymət yoxdur/)).toBeInTheDocument()
    expect(within(headline()).queryByText(/hər iki məbləğ tam deyil/)).toBeNull()
  })

  it('says nothing of the sort when only the window owes prices', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      primary: comparison({ ...partial, baselineMissingPriceItemCount: 3 }),
    }))
    await renderAt('/orders/105?basis=avg3')

    expect(within(headline()).getByText('(2/3 ay · Çatışmayan: Aprel 2026)')).toBeInTheDocument()
    expect(within(headline()).queryByText(/hər iki məbləğ tam deyil/)).toBeNull()
  })
})

describe('the evidence below the decision', () => {
  it('still carries the order s own lines', async () => {
    await renderPage()

    expect(screen.getByText('Sətirlər')).toBeInTheDocument()
    expect(within(document.querySelector('table')!).getByText('York qatlama salfet')).toBeInTheDocument()
  })
})

/**
 * Task 12 on the order page. jsdom applies no CSS, so what a phone shows is tested through the classes that decide
 * it; the operator's check on a phone covers what the eye must see.
 */
describe('the order of the page on a phone: what happened, why, then the decision', () => {
  it('moves the decision after the analysis below 1024 pixels, and leaves the wide layout as it was', async () => {
    await renderPage()

    const panel = await screen.findByRole('region', { name: 'Qərar' })
    const decisionColumn = panel.parentElement!
    const analysis = screen.getByRole('region', { name: 'Dəyişikliyin səbəbləri' }).parentElement!
    const headlineCell = headline().parentElement!

    expect(headlineCell).toHaveClass('order-1')
    expect(analysis).toHaveClass('order-2', 'lg:order-3', 'lg:col-start-1', 'lg:row-start-2')
    expect(decisionColumn).toHaveClass('order-3', 'lg:order-2', 'lg:col-start-3', 'lg:row-start-1', 'lg:sticky')
    expect(analysis).not.toHaveClass('order-3')
    expect(decisionColumn).not.toHaveClass('order-2')

    // The page itself is unchanged: the headline, then the decision column, then the analysis, as before.
    const [first, second, third] = Array.from(headlineCell.parentElement!.children)
    expect(first).toBe(headlineCell)
    expect(second).toBe(decisionColumn)
    expect(third).toBe(analysis)
  })

  it('keeps the decision buttons at the bottom of a phone screen, the Rəhbər’s two among them', async () => {
    const user = userEvent.setup()
    await renderPage()

    const panel = await screen.findByRole('region', { name: 'Qərar' })
    const approve = await within(panel).findByRole('button', { name: 'Təsdiqlə' })
    const bar = approve.parentElement!
    expect(bar).toHaveClass('fixed', 'inset-x-0', 'bottom-0', 'z-20', 'lg:static')
    expect(within(bar).getAllByRole('button').map((button) => button.textContent)).toEqual(['Təsdiqlə', 'Düzəliş tələb et'])

    await user.click(within(bar).getByRole('button', { name: 'Düzəliş tələb et' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('leaves room at the end so the last lines can be scrolled clear of the buttons', async () => {
    await renderPage()

    const spacer = document.querySelector('div.h-24[aria-hidden="true"]')!
    expect(spacer).toHaveClass('lg:hidden')
  })
})

/**
 * Brief: "Sifariş sətirləri telefonda yana sürüşdürmədən oxunur". Below 1024 pixels the table gives way to a card
 * per line, with every fact of its row.
 */
describe('the lines on a phone', () => {
  const nbsp = String.fromCharCode(0xa0)

  function line(overrides: Partial<OrderRequestItem>): OrderRequestItem {
    return { ...item(), ...overrides }
  }

  function serveLines(lines: OrderRequestItem[]) {
    ordersApi.fetchOrder.mockResolvedValue(detail({
      items: { items: lines, page: 1, pageSize: 50, totalCount: lines.length },
    } as never))
  }

  function cards(): HTMLElement {
    return screen.getByRole('list', { name: 'Sətirlər' })
  }

  function card(productName: string): HTMLElement {
    return within(cards()).getByText(productName).closest('li')!
  }

  it('shows a priced line whole: number, product, specification, quantity × price, total, supplier, category', async () => {
    serveLines([line({
      productName: 'Distillə su',
      specificationValue: '5',
      specificationUnitCode: 'L',
      specificationUnitName: 'Litr',
      quantity: 30,
      unitPrice: 4.1,
      lineTotal: 123,
      supplierName: 'Cleanfix MMC',
      categoryPath: ['Təsərrüfat', 'Təmizlik'],
    })])
    await renderPage()

    const priced = card('Distillə su')
    expect(within(priced).getByText('1')).toHaveClass('text-xs', 'text-slate-400')
    expect(within(priced).getByText('Distillə su').className).toContain('break-words')
    expect(within(priced).getByText('5 litr')).toBeInTheDocument()
    expect(priced).toHaveTextContent('30 ədəd × 4,10 ₼')
    // The price keeps its ₼ by a no-break space (Task 5), so a narrow card cannot split them.
    expect(priced.textContent).toContain(`× 4,10${nbsp}₼`)
    expect(within(priced).getByText('123,00 ₼')).toHaveClass('whitespace-nowrap')
    expect(priced).toHaveTextContent('Cleanfix MMC · Təsərrüfat › Təmizlik')
    expect(within(priced).getByRole('button', { name: 'Mənbəyə bax' })).toBeInTheDocument()
    // Read-only here: the server did not allow editing.
    expect(within(priced).queryByRole('button', { name: 'Redaktə et' })).toBeNull()
  })

  it('says an internally supplied line in slate, with its explanation, and no total', async () => {
    serveLines([line({
      productName: 'Qum',
      unitPrice: null,
      lineTotal: null,
      supplierName: null,
      pricingMode: 'InternalFreeSupply',
      sourceSupplierName: 'Azpetrol baza',
    })])
    await renderPage()

    const internal = card('Qum')
    const words = within(internal).getByText('Daxili təminat')
    expect(words.closest('span')).toHaveClass('text-slate-500')
    expect(words.closest('span')).not.toHaveClass('text-amber-800')
    expect(within(internal).getByRole('button', { name: 'Daxili təminat nədir?' })).toBeInTheDocument()
    expect(internal).toHaveTextContent('30 ədəd · Daxili təminat')
    expect(within(internal).getByText('Daxili: Azpetrol baza')).toBeInTheDocument()
    expect(within(internal).getByText('—')).toHaveClass('text-slate-400')
    expect(within(internal).queryByText('Qiymət yoxdur')).toBeNull()
    expect(within(internal).queryByText('0,00 ₼')).toBeNull()
  })

  it('says an owed price in amber, once', async () => {
    serveLines([line({ productName: 'Əlcək', unitPrice: null, lineTotal: null, pricingMode: 'PriceRequired' })])
    await renderPage()

    const owed = card('Əlcək')
    expect(within(owed).getByText('Qiymət yoxdur')).toHaveClass('text-amber-800')
    expect(owed).not.toHaveTextContent(/Qiymət\s+Qiymət/)
    expect(within(owed).getByText('Məlum deyil')).toBeInTheDocument()
  })

  it('says a line nobody has classified in amber, with its explanation', async () => {
    serveLines([line({ productName: 'Gübrə', unitPrice: null, lineTotal: null, pricingMode: 'Unresolved' })])
    await renderPage()

    const unclassified = card('Gübrə')
    expect(within(unclassified).getByText('Qiymət yoxdur').closest('span')).toHaveClass('text-amber-800')
    expect(within(unclassified).getByRole('button', { name: 'Təsnif edilməyib nə deməkdir?' })).toBeInTheDocument()
  })

  it('does not repeat the table’s dash for a line with no specification', async () => {
    serveLines([line({ productName: 'York qatlama salfet' })])
    await renderPage()

    const plain = card('York qatlama salfet')
    // The only dash-free card: no specification line at all, and a total that is there.
    expect(within(plain).queryByText('—')).toBeNull()
  })

  it('numbers the cards as the table numbers its rows, across pages', async () => {
    ordersApi.fetchOrder.mockResolvedValue(detail({
      items: { items: [line({ orderRequestItemId: 1, productName: 'Bel' }), line({ orderRequestItemId: 2, productName: 'Vedrə' })], page: 2, pageSize: 50, totalCount: 52 },
    } as never))
    await renderPage()

    expect(within(card('Bel')).getByText('51')).toBeInTheDocument()
    expect(within(card('Vedrə')).getByText('52')).toBeInTheDocument()
  })

  it('opens the source drawer from a card', async () => {
    const user = userEvent.setup()
    ordersApi.fetchOrderItemSource.mockResolvedValue({
      orderRequestItemId: 501,
      orderRequestId: 105,
      version: 2,
      origin: 'ManuallyAdded',
      lineage: [{ orderRequestItemId: 501, orderRequestId: 105, version: 2, status: 'Draft', isImported: false }],
      source: null,
    })
    await renderPage()

    await user.click(within(cards()).getByRole('button', { name: 'Mənbəyə bax' }))

    expect(await screen.findByText('Əl ilə əlavə edilib — Excel mənbəsi yoxdur.')).toBeInTheDocument()
    expect(ordersApi.fetchOrderItemSource).toHaveBeenCalledWith(501, expect.anything())
  })

  it('says there are no lines, and says it is loading, in the table’s words', async () => {
    serveLines([])
    await renderPage()
    expect(within(cards()).getByText('Bu sifarişdə sətir yoxdur.')).toBeInTheDocument()
  })

  it('says it is loading while the lines are on their way', async () => {
    ordersApi.fetchOrder.mockReturnValue(new Promise(() => {}))
    await renderPage()
    expect(within(cards()).getByText('Yüklənir…')).toBeInTheDocument()
  })

  it('hands the table to wide screens only, and forces no width of its own', async () => {
    serveLines([
      line({ orderRequestItemId: 1, productName: 'Columbus 80 BM 100 Şotka üçün çox uzun bir məhsul adı', categoryPath: ['Təsərrüfat', 'Təmizlik'] }),
      line({ orderRequestItemId: 2, productName: 'Qum', unitPrice: null, lineTotal: null, pricingMode: 'InternalFreeSupply' }),
    ])
    await renderPage()

    const wrapper = document.querySelector('table')!.parentElement!
    expect(wrapper).toHaveClass('hidden', 'lg:block', 'overflow-x-auto')
    expect(cards()).toHaveClass('lg:hidden')

    expect(cards().querySelector('[class*="min-w-["]')).toBeNull()
    // Only amounts are kept to one line; a name, a supplier or a category wraps.
    for (const element of cards().querySelectorAll('.whitespace-nowrap')) {
      expect(element.textContent).toMatch(/₼$/)
    }

    expect(findOldTerms(cards())).toEqual([])
  })
})

/**
 * Task 05b: the page speaks the manager's language. The month in the header instead of "Versiya 2"; under a
 * product's name no product code and no model; a specification only when it says what it measures.
 */
describe('what the manager does not have to decode', () => {
  function line(overrides: Partial<OrderRequestItem>): OrderRequestItem {
    return { ...item(), productCode: 'PRD-000110', ...overrides }
  }

  function linesTable() {
    return within(document.querySelector('table')!)
  }

  /** The "Spesifikasiya" cell of the row naming this product. */
  function specificationOf(row: HTMLElement): string {
    return row.querySelectorAll('td')[2].textContent ?? ''
  }

  it('heads the page with the object and the month alone', async () => {
    await renderPage()

    const heading = screen.getByRole('heading', { name: 'Fəvvarələr meydanı' })
    expect(heading.nextElementSibling).toHaveTextContent(/^İyul 2026$/)
    expect(document.body).not.toHaveTextContent(/versiya/i)
    expect(document.body).not.toHaveTextContent('LOC-000021')
  })

  it('names each line without a product code or a model, and keeps the specification that means something', async () => {
    ordersApi.fetchOrder.mockResolvedValue(detail({
      items: {
        items: [
          line({ orderRequestItemId: 1, productName: 'Rosmarinus', specificationValue: '2.8' }),
          line({ orderRequestItemId: 2, productName: 'Yay ayaqqabısı', modelCode: 'M-101-S-2', orderUnitCode: 'PAIR', orderUnitName: 'Cüt' }),
          line({ orderRequestItemId: 3, productName: 'Distillə su', specificationValue: '5', specificationUnitCode: 'L', specificationUnitName: 'Litr' }),
          line({ orderRequestItemId: 4, productName: 'Gübrə', specificationValue: '50', specificationUnitCode: 'KG', specificationUnitName: 'Kiloqram', orderUnitCode: 'BAG', orderUnitName: 'Kisə' }),
          line({ orderRequestItemId: 5, productName: 'Mişar', specificationValue: '28', specificationDescriptor: 'diş' }),
        ],
      } as never,
    }))
    await renderPage()

    const rows = linesTable().getAllByRole('row').slice(1)
    expect(specificationOf(rows[0])).toBe('—')
    expect(specificationOf(rows[1])).toBe('—')
    expect(specificationOf(rows[2])).toBe('5 litr')
    expect(specificationOf(rows[3])).toBe('50 kq')
    expect(specificationOf(rows[4])).toBe('28 diş')

    const table = document.querySelector('table')!
    expect(table).not.toHaveTextContent('PRD-')
    expect(table).not.toHaveTextContent('M-101-S-2')
    expect(table).not.toHaveTextContent('2.8')
    expect(table).not.toHaveTextContent(/model/i)
  })

  it('gives back the hidden detail only to two lines that would otherwise read the same', async () => {
    const columbus = {
      productName: 'Columbus 80 BM 100 Şotka',
      specificationValue: '80',
      specificationUnitCode: 'CM',
      specificationUnitName: 'Santimetr',
    }
    ordersApi.fetchOrder.mockResolvedValue(detail({
      items: {
        items: [
          line({ orderRequestItemId: 1, ...columbus, modelCode: '20078331' }),
          line({ orderRequestItemId: 2, ...columbus, modelCode: '20078332' }),
          line({ orderRequestItemId: 3, productName: 'Yay ayaqqabısı', modelCode: 'M-101-S-2' }),
        ],
      } as never,
    }))
    await renderPage()

    const rows = linesTable().getAllByRole('row').slice(1)
    expect(specificationOf(rows[0])).toBe('80 sm · 20078331')
    expect(specificationOf(rows[1])).toBe('80 sm · 20078332')
    // Unique on the page, so its model stays hidden.
    expect(specificationOf(rows[2])).toBe('—')
  })

  it('asks for a product name in the search, not a code', async () => {
    await renderPage()

    expect(screen.getByPlaceholderText('Məhsul adı…')).toBeInTheDocument()
  })

  it('keeps every technical detail, versions included, one click away in "Mənbəyə bax"', async () => {
    const user = userEvent.setup()
    ordersApi.fetchOrderItemSource.mockResolvedValue({
      orderRequestItemId: 501,
      orderRequestId: 105,
      version: 2,
      origin: 'Imported',
      lineage: [
        { orderRequestItemId: 501, orderRequestId: 105, version: 2, status: 'Draft', isImported: false },
        { orderRequestItemId: 401, orderRequestId: 104, version: 1, status: 'ReturnedForCorrection', isImported: true },
      ],
      source: {
        orderRequestItemId: 401,
        orderRequestId: 104,
        materializedAtUtc: '2026-09-22T09:00:00Z',
        importBatchId: 7,
        importFileName: 'sifarisler.xlsx',
        importStatus: 'Imported',
        importRowId: 70,
        sheetName: 'Əsas',
        rowNumber: 4,
        isExcluded: false,
        originalLineTotal: '123',
        calculatedLineTotal: 123,
        fields: [{
          column: 'Model',
          sourceValue: 'M-101-S-2',
          effectiveValue: 'M-101-S-2',
          isCorrected: false,
          isIntentionallyEmpty: false,
          canonicalValue: null,
        }],
      },
    })
    await renderPage()

    // In the table: below 1024 pixels the same line is also a card (Task 12), with its own "Mənbəyə bax".
    await user.click(linesTable().getByRole('button', { name: 'Mənbəyə bax' }))
    const drawer = await screen.findByRole('dialog')

    expect(await within(drawer).findByText('Sətrin keçdiyi versiyalar')).toBeInTheDocument()
    expect(drawer).toHaveTextContent('Versiya 1')
    expect(within(drawer).getAllByText('M-101-S-2').length).toBeGreaterThan(0)
  })
})

describe('when the comparison cannot be read', () => {
  it('still shows the order rather than failing the whole page', async () => {
    // Rejected per call rather than once at setup, so the failure belongs to the request that made it.
    decisionsApi.fetchDecisionContext.mockImplementation(() => Promise.reject(new Error('down')))
    render(
      <MemoryRouter initialEntries={['/orders/105']}>
        <Routes>
          <Route path="/orders/:orderRequestId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const fallback = await screen.findByRole('region', { name: 'Sifariş xülasəsi' })
    expect(within(fallback).getByText('4.800,00 ₼')).toBeInTheDocument()
    expect(screen.queryByText('Niyə dəyişib?')).toBeNull()
  })
})

describe('a blank price', () => {
  it('is a warning when somebody owes it', async () => {
    ordersApi.fetchOrder.mockResolvedValue(detail({
      items: {
        items: [{ ...item(), unitPrice: null, lineTotal: null, supplierName: 'Kənar şirkət', pricingMode: 'PriceRequired' }],
        page: 1,
        pageSize: 50,
        totalCount: 1,
      },
    } as never))
    await renderPage()

    const table = within(document.querySelector('table')!)
    expect(table.getByText('Qiymət yoxdur')).toHaveClass('text-amber-800')
    expect(table.queryByText(/Daxili təminat/)).toBeNull()
  })

  it('is a plain fact when the material came out of our own store', async () => {
    ordersApi.fetchOrder.mockResolvedValue(detail({
      items: {
        items: [{ ...item(), unitPrice: null, lineTotal: null, supplierName: 'Qala baza', pricingMode: 'InternalFreeSupply' }],
        page: 1,
        pageSize: 50,
        totalCount: 1,
      },
    } as never))
    await renderPage()

    const table = within(document.querySelector('table')!)
    // Not "Qiymət yoxdur", and above all not amber: nobody is meant to go looking for this number.
    expect(table.getByText('Daxili təminat')).toBeInTheDocument()
    expect(table.queryByText('Qiymət yoxdur')).toBeNull()
    expect(table.getByText('Daxili təminat').closest('span')).not.toHaveClass('text-amber-800')
    // The supplier cell says our own warehouse rather than "Məlum deyil", which reads like a gap.
    expect(table.getByText('Daxili anbar')).toBeInTheDocument()
  })

  /** The workbook usually names the store the material was issued by; the cell says which. */
  it('names the store an internally supplied line came out of', async () => {
    ordersApi.fetchOrder.mockResolvedValue(detail({
      items: {
        items: [{
          ...item(),
          unitPrice: null,
          lineTotal: null,
          supplierName: null,
          pricingMode: 'InternalFreeSupply',
          sourceSupplierName: 'Azpetrol baza',
        }],
        page: 1,
        pageSize: 50,
        totalCount: 1,
      },
    } as never))
    await renderPage()

    const table = within(document.querySelector('table')!)
    expect(table.getByText('Daxili: Azpetrol baza')).toBeInTheDocument()
    expect(table.queryByText('Məlum deyil')).toBeNull()
    // And no amount at all — never a fabricated zero.
    expect(table.queryByText('0,00 ₼')).toBeNull()
  })

  it('shows a real price even on an internally supplied line', async () => {
    ordersApi.fetchOrder.mockResolvedValue(detail({
      items: {
        items: [{ ...item(), unitPrice: 4.1, supplierName: 'Qala baza', pricingMode: 'InternalFreeSupply' }],
        page: 1,
        pageSize: 50,
        totalCount: 1,
      },
    } as never))
    await renderPage()

    const table = within(document.querySelector('table')!)
    expect(table.queryByText('Daxili təminat')).toBeNull()
    expect(table.getAllByText(/4,10/).length).toBeGreaterThan(0)
  })
})

describe('internal supply on the decision screen', () => {
  it('is named as context and never as a shortfall', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      current: {
        knownAmount: 4800,
        itemCount: 40,
        knownPriceItemCount: 37,
        missingPriceItemCount: 0,
        priceNotRequiredItemCount: 3,
        isComplete: true,
      },
    }))
    await renderPage()

    expect(within(headline()).getByText(/3 sətir daxili təminat \(ödənişsiz\)/)).toBeInTheDocument()
    expect(within(headline()).queryByText(/qiyməti yoxdur/)).toBeNull()
  })

  it('keeps a genuine gap amber beside it', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      current: {
        knownAmount: 4800,
        itemCount: 40,
        knownPriceItemCount: 36,
        missingPriceItemCount: 1,
        priceNotRequiredItemCount: 3,
        isComplete: false,
      },
    }))
    await renderPage()

    expect(within(headline()).getByText(/1 sətirdə qiymət yoxdur/)).toHaveClass('text-amber-800')
    expect(within(headline()).getByText(/3 sətir daxili təminat \(ödənişsiz\)/)).toBeInTheDocument()
  })

  it('appears among the causes without making the explanation incomplete', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      decomposition: {
        categories: [
          { category: 'NewOrders', amount: 0, variantCount: 0 },
          { category: 'QuantityChange', amount: 0, variantCount: 0 },
          { category: 'PriceChange', amount: 0, variantCount: 0 },
          { category: 'NoLongerOrdered', amount: 0, variantCount: 0 },
          { category: 'Services', amount: 0, variantCount: 0 },
          { category: 'InternalSupply', amount: 600, variantCount: 2 },
          { category: 'UnattributedDueToMissingPrice', amount: 0, variantCount: 0 },
        ],
        totalAmountImpact: 600,
        explanationIsComplete: true,
        unattributedVariantCount: 0,
        internalSupplyVariantCount: 2,
        supplyChangedVariantCount: 0,
        drivers: [],
        products: {
          comparedCount: 40,
          inCurrentOrderCount: 40,
          newCount: 0,
          noLongerOrderedCount: 0,
          listedCount: 0,
          increasedCount: 0,
          decreasedCount: 0,
          serviceCount: 0,
        },
        steady: [],
        variantTransitions: [],
      },
    }))
    await renderPage()

    expect(screen.getByText('Daxili təminat')).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText(/tam izah edilə bilmir/)).toBeNull()
  })
})

/**
 * 14.1: Qiymət təsnifatı is not in a Rəhbər's menu; it opens from the price warning, narrowed to this order. The
 * warning itself — its words, its colour, the internal-supply part beside it — is exactly what it was.
 */
describe('the way from the price warning to the lines behind it', () => {
  const missing = (missingPriceItemCount: number, priceNotRequiredItemCount = 0) => context({
    current: {
      knownAmount: 4800,
      itemCount: 40,
      knownPriceItemCount: 40 - missingPriceItemCount - priceNotRequiredItemCount,
      missingPriceItemCount,
      priceNotRequiredItemCount,
      isComplete: missingPriceItemCount === 0,
    },
  })

  function renderAt(url: string) {
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/orders/:orderRequestId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('offers Qiymət təsnifatı beside the count, for this order and with the page’s basis', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(missing(2, 3))
    renderAt('/orders/105?basis=avg3')
    await screen.findByRole('region', { name: 'Sifarişin məbləği və müqayisəsi' })

    const link = within(headline()).getByRole('link', { name: 'Qiymət təsnifatına bax' })
    expect(link).toHaveAttribute('href', '/pricing-modes?order=105&basis=avg3')
    expect(link).toHaveClass('underline')

    // The warning is untouched: the same sentence, still amber, and the internal supply still beside it.
    expect(within(headline()).getByText('2 sətirdə qiymət yoxdur')).toHaveClass('text-amber-800')
    expect(within(headline()).getByText('3 sətir daxili təminat (ödənişsiz)')).not.toHaveClass('text-amber-800')
    expect(link.closest('p')).toHaveTextContent(
      '2 sətirdə qiymət yoxdur · Qiymət təsnifatına bax · 3 sətir daxili təminat (ödənişsiz)',
    )
    expect(findOldTerms(link.closest('p')!)).toEqual([])
  })

  it('offers nothing when every price is known', async () => {
    await renderPage()

    expect(screen.queryByRole('link', { name: 'Qiymət təsnifatına bax' })).toBeNull()
  })

  it('offers nothing when the only unpriced lines come from our own store', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(missing(0, 3))
    await renderPage()

    expect(within(headline()).getByText('3 sətir daxili təminat (ödənişsiz)')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Qiymət təsnifatına bax' })).toBeNull()
  })

  it('offers it on the plain summary too, when the comparison could not be read', async () => {
    decisionsApi.fetchDecisionContext.mockImplementation(() => Promise.reject(new Error('down')))
    ordersApi.fetchOrder.mockResolvedValue(detail({ missingPriceItemCount: 2 }))
    render(
      <MemoryRouter initialEntries={['/orders/105']}>
        <Routes>
          <Route path="/orders/:orderRequestId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const fallback = await screen.findByRole('region', { name: 'Sifariş xülasəsi' })
    await waitFor(() => expect(within(fallback).getByRole('link', { name: 'Qiymət təsnifatına bax' }))
      .toHaveAttribute('href', '/pricing-modes?order=105&basis=last'))
    expect(within(fallback).getByText('2 sətirdə qiymət yoxdur')).toHaveClass('text-amber-800')
  })
})

/**
 * The whole screen for an order approved before this system existed.
 *
 * It is the one order state the domain cannot produce — Approved with neither moment recorded — so the risk is
 * that a screen reads it as broken data and either fails on it or fills the gap with a date nobody can stand
 * behind. It renders as an ordinary approved order, and the gap is stated rather than filled.
 */
describe('an order carried in as already approved', () => {
  beforeEach(() => {
    ordersApi.fetchOrder.mockResolvedValue(detail({ status: 'Approved' }) as never)
    workflowApi.fetchWorkflow.mockResolvedValue(workflow({
      status: 'Approved',
      submittedByUserId: null,
      submittedAtUtc: null,
      approvedAtUtc: null,
      allowedActions: {
        canSubmit: false,
        canApprove: false,
        canReturn: false,
        blockedBySelfApproval: false,
        blockedByOwnContribution: false,
        blockedByMissingAuthority: false,
      },
      decisionFacts: {
        isHistoricalImport: true,
        submissionNumber: 0,
        submittedByDisplayName: null,
        submittedAtUtc: null,
        previousReturn: null,
        decision: null,
      },
      history: [{
        id: 1,
        action: 'ImportedAsApproved',
        fromStatus: 'Draft',
        toStatus: 'Approved',
        actorUserId: null,
        actorDisplayName: 'Sistem',
        comment: 'Tarixi sifariş sistemə artıq təsdiqlənmiş kimi köçürülüb.',
        missingPriceItemCount: 0,
        missingPricesAcknowledged: false,
        occurredAtUtc: '2026-09-23T12:26:42Z',
      }],
    }))
  })

  it('renders the whole page without failing on the missing moments', async () => {
    await renderPage()

    expect(within(headline()).getByText('4.800,00 ₼')).toBeInTheDocument()
    expect(screen.getAllByText('Təsdiqlənib').length).toBeGreaterThan(0)
  })

  it('shows the carried-over event instead of an approval nobody gave', async () => {
    await renderPage()

    // The history panel loads on its own; with no line edits it opens on the approval side.
    expect(await screen.findByText('Təsdiqlənmiş kimi köçürülüb')).toBeInTheDocument()
    expect(screen.queryByText('Təsdiqləndi')).toBeNull()
    expect(screen.getByText(/Tarixi sifariş sistemə artıq təsdiqlənmiş kimi köçürülüb/)).toBeInTheDocument()
  })

  it('invents neither a submission date nor an approval date', async () => {
    await renderPage()

    expect(screen.queryByText(/Təqdim: /)).toBeNull()
    expect(screen.queryByText(/Təsdiq: /)).toBeNull()
    expect(screen.queryByText(/Hələ təqdim olunmayıb/)).toBeNull()
  })

  it('says in the decision panel exactly that it came from Excel and that no approval was recorded (4.1)', async () => {
    await renderPage()

    const panel = await screen.findByRole('region', { name: 'Qərar' })

    expect(within(panel).getByText('Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.')).toBeInTheDocument()
    expect(within(panel).queryByText('Göndərən')).toBeNull()
    expect(within(panel).queryByText('Təsdiqləyən')).toBeNull()
    expect(within(panel).queryByText(/Sistem/)).toBeNull()
  })
})

/**
 * Brief (Task 17): every dialog closes the same way. The product history closes on `Escape`, the page stays where
 * it was, and the focus goes back to the product that opened it (acceptance 1). «Mənbə» is only read, so a press on
 * its background closes it (acceptance 3).
 */
describe('closing the product history and the source', () => {
  it('closes the product history on Escape, with the focus back on the product and the page where it was', async () => {
    const user = userEvent.setup()
    await renderPage()
    const product = screen.getByRole('button', { name: /York qatlama salfet/ })

    await user.click(product)
    await screen.findByRole('dialog', { name: 'Məhsul tarixçəsi' })
    const focus = vi.spyOn(product, 'focus')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(product).toHaveFocus()
    // A plain focus() would scroll the product into view; the page would move.
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('closes «Mənbə» on a press on its background, and does nothing else', async () => {
    const user = userEvent.setup()
    ordersApi.fetchOrderItemSource.mockResolvedValue({
      orderRequestItemId: 501,
      orderRequestId: 105,
      version: 2,
      origin: 'ManuallyAdded',
      lineage: [{ orderRequestItemId: 501, orderRequestId: 105, version: 2, status: 'Draft', isImported: false }],
      source: null,
    })
    await renderPage()

    await user.click(within(screen.getByRole('list', { name: 'Sətirlər' })).getByRole('button', { name: 'Mənbəyə bax' }))
    const dialog = await screen.findByRole('dialog', { name: 'Mənbə' })
    await user.click(dialog.parentElement as HTMLElement)

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ordersApi.fetchOrderItemSource).toHaveBeenCalledTimes(1)
  })
})
