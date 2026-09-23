import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VariantIdentity, VariantTrend } from '../api/analytics'
import type { DecisionDriver, OrderDecisionContext } from '../api/decisions'
import type { OrderRequestDetail, OrderRequestItem } from '../api/orders'
import type { OrderRevision } from '../api/revisions'
import type { OrderWorkflow } from '../api/workflow'
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
    previousMonth: {
      available: true,
      period: '2026-06-01',
      request: { period: '2026-06-01', orderRequestId: 104, version: 1, status: 'Approved' },
      amount: {
        knownAmount: 4200,
        itemCount: 38,
        knownPriceItemCount: 38,
        missingPriceItemCount: 0,
        priceNotRequiredItemCount: 0,
        isComplete: true,
      },
      deltaAmount: 600,
      deltaPercent: 14.2857,
    },
    threeMonth: {
      basis: 'Previous3MonthAverage',
      expectedPeriodCount: 3,
      availablePeriodCount: 2,
      missingPeriods: ['2026-04-01'],
      periods: [],
      averageKnownAmount: 4000,
      deltaAmount: 800,
      deltaPercent: 20,
      amountIsComplete: true,
    },
    sixMonth: {
      basis: 'Previous6MonthAverage',
      expectedPeriodCount: 6,
      availablePeriodCount: 3,
      missingPeriods: [],
      periods: [],
      averageKnownAmount: 3800,
      deltaAmount: 1000,
      deltaPercent: 26.3158,
      amountIsComplete: true,
    },
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
      drivers: [driver()],
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
    supplierPriceRequirement: 'Required',
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
    expect(within(headline()).getByText(/40 sətir/)).toBeInTheDocument()
  })

  it('puts the comparison with last month directly under it', async () => {
    await renderPage()

    expect(within(headline()).getByText('İyun 2026')).toBeInTheDocument()
    expect(within(headline()).getByText('4.200,00 ₼')).toBeInTheDocument()
    expect(within(headline()).getByText('+600,00 ₼')).toBeInTheDocument()
    expect(within(headline()).getByText('+14,29%')).toBeInTheDocument()
  })

  it('keeps the longer runs of months as quiet context beside it', async () => {
    await renderPage()

    expect(within(headline()).getByText('Son 3 ayın ortalaması')).toBeInTheDocument()
    expect(within(headline()).getByText(/2\/3 ay/)).toBeInTheDocument()
    expect(within(headline()).getByText('Son 6 ayın ortalaması')).toBeInTheDocument()
  })

  it('answers why it changed, and offers the decision', async () => {
    await renderPage()

    expect(screen.getByText('Niyə dəyişib?')).toBeInTheDocument()
    // The decision panel loads on its own; what matters is that it arrives beside the explanation.
    expect(await screen.findByRole('button', { name: 'Təsdiqlə' })).toBeInTheDocument()
  })
})

describe('a month with nothing before it', () => {
  it('says so, and does not present its products as new', async () => {
    decisionsApi.fetchDecisionContext.mockResolvedValue(context({
      previousMonth: {
        available: false,
        period: '2026-06-01',
        request: null,
        amount: null,
        deltaAmount: null,
        deltaPercent: null,
      },
      decomposition: null,
    }))
    await renderPage()

    expect(within(headline()).getByText('Keçən ay üçün müqayisə məlumatı yoxdur.')).toBeInTheDocument()
    expect(screen.queryByText('Niyə dəyişib?')).toBeNull()
    expect(screen.queryByText('Yeni sifarişlər')).toBeNull()
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

    expect(within(headline()).getByText(/2 məhsulun qiyməti yoxdur/)).toBeInTheDocument()
  })
})

describe('the drivers', () => {
  it('names the product, the prices it moved between and what that was worth', async () => {
    await renderPage()

    expect(screen.getByText('Əsas dəyişikliklər')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'York qatlama salfet' })).toBeInTheDocument()
    expect(screen.getByText(/Qiymət 2,80 ₼ → 4,10 ₼/)).toBeInTheDocument()
  })

  it('opens that product s own history when it is clicked', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'York qatlama salfet' }))

    await waitFor(() => expect(analyticsApi.fetchVariantTrend).toHaveBeenCalled())
    // Twelve months ending on the month being decided — the history of this product at this object.
    expect(analyticsApi.fetchVariantTrend).toHaveBeenCalledWith(
      21,
      21,
      { from: '2025-08', to: '2026-07' },
      expect.anything(),
    )
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
      },
    }))
    await renderPage()

    expect(await screen.findByText(/Özünüzün təsdiqə göndərdiyiniz sifarişi təsdiqləyə bilməzsiniz/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
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
    expect(screen.getByRole('link', { name: /Versiya 2-ə bax/ })).toHaveAttribute('href', '/orders/106')
  })
})

describe('the evidence below the decision', () => {
  it('still carries the order s own lines', async () => {
    await renderPage()

    expect(screen.getByText('Sətirlər')).toBeInTheDocument()
    expect(within(document.querySelector('table')!).getByText('York qatlama salfet')).toBeInTheDocument()
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
        items: [{ ...item(), unitPrice: null, lineTotal: null, supplierName: 'Kənar şirkət', supplierPriceRequirement: 'Required' }],
        page: 1,
        pageSize: 50,
        totalCount: 1,
      },
    } as never))
    await renderPage()

    const table = within(document.querySelector('table')!)
    expect(table.getByText('Qiymət yoxdur')).toHaveClass('text-amber-800')
    expect(table.queryByText(/Daxili anbardan/)).toBeNull()
  })

  it('is a plain fact when the material came out of our own store', async () => {
    ordersApi.fetchOrder.mockResolvedValue(detail({
      items: {
        items: [{ ...item(), unitPrice: null, lineTotal: null, supplierName: 'Qala baza', supplierPriceRequirement: 'NotRequired' }],
        page: 1,
        pageSize: 50,
        totalCount: 1,
      },
    } as never))
    await renderPage()

    const table = within(document.querySelector('table')!)
    // Not "Qiymət yoxdur", and above all not amber: nobody is meant to go looking for this number.
    expect(table.getByText('Daxili anbardan')).toBeInTheDocument()
    expect(table.queryByText('Qiymət yoxdur')).toBeNull()
    expect(table.getByText('Daxili anbardan').closest('span')).not.toHaveClass('text-amber-800')
    // The supplier stays visible; it is the reason the price is absent.
    expect(table.getByText('Qala baza')).toBeInTheDocument()
  })

  it('shows a real price even on an internally supplied line', async () => {
    ordersApi.fetchOrder.mockResolvedValue(detail({
      items: {
        items: [{ ...item(), unitPrice: 4.1, supplierName: 'Qala baza', supplierPriceRequirement: 'NotRequired' }],
        page: 1,
        pageSize: 50,
        totalCount: 1,
      },
    } as never))
    await renderPage()

    const table = within(document.querySelector('table')!)
    expect(table.queryByText('Daxili anbardan')).toBeNull()
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

    expect(within(headline()).getByText(/Daxili təminat: 3 sətir/)).toBeInTheDocument()
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

    expect(within(headline()).getByText(/1 məhsulun qiyməti yoxdur/)).toHaveClass('text-amber-800')
    expect(within(headline()).getByText(/Daxili təminat: 3 sətir/)).toBeInTheDocument()
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
        drivers: [],
      },
    }))
    await renderPage()

    expect(screen.getByText('Daxili təminat')).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText(/tam izah edilə bilmir/)).toBeNull()
  })
})
