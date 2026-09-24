import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VariantIdentity, VariantTrend } from '../api/analytics'
import type { DecisionComparison, DecisionDriver, OrderDecisionContext } from '../api/decisions'
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
    supplyChanged: false,
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
    expect(screen.getByRole('link', { name: 'Ən son sifarişə bax' })).toHaveAttribute('href', '/orders/106')
    expect(document.body).not.toHaveTextContent(/versiya/i)
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

    await user.click(screen.getByRole('button', { name: 'Mənbəyə bax' }))
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
      },
    }))
    await renderPage()

    expect(screen.getByText('Daxili təminat')).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText(/tam izah edilə bilmir/)).toBeNull()
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
