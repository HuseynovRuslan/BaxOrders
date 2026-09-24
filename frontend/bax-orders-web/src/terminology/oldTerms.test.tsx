import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ComparisonSide,
  ComparisonSummary,
  LocationComparison,
  VariantComparison,
  VariantIdentity,
  VariantTrend,
} from '../api/analytics'
import type { ApprovalInbox, ApprovalInboxRow } from '../api/approvals'
import type { DashboardAmount, LocationDashboardRow, ManagementDashboard } from '../api/dashboard'
import type { DecisionDriver, OrderDecisionContext } from '../api/decisions'
import type { LocationOrderHistory, OrderRequestDetail, OrderRequestItem } from '../api/orders'
import type { MonthlyReport, MonthlyReportCell } from '../api/reports'
import type { OrderRevision } from '../api/revisions'
import type { OrderWorkflow } from '../api/workflow'
import { TrendModal } from '../components/analytics/TrendModal'
import { ApprovalInboxPage } from '../pages/ApprovalInboxPage'
import { LocationAnalyticsPage } from '../pages/LocationAnalyticsPage'
import { LocationDetailPage } from '../pages/LocationDetailPage'
import { ManagementDashboardPage } from '../pages/ManagementDashboardPage'
import { MonthlyReportPage } from '../pages/MonthlyReportPage'
import { OrderDetailPage } from '../pages/OrderDetailPage'
import { partition, partitionMember } from '../test/dashboardFixtures'
import { findOldTerms } from '../test/oldTerms'

/**
 * Owner decision 5.1 and the brief's pairs, checked where the manager reads them.
 *
 * Every screen the brief names is rendered with data that reaches the old wording's code paths — a missing
 * price, an average over fewer months than asked, a product new this month and one not ordered, a unit code,
 * a price with four decimals — and the whole readable text is searched for every retired word at once.
 */
const dashboardApi = vi.hoisted(() => ({ fetchDashboard: vi.fn(), fetchDashboardPeriods: vi.fn() }))
const ordersApi = vi.hoisted(() => ({
  fetchOrder: vi.fn(),
  fetchOrderItemSource: vi.fn(),
  fetchLocationHistory: vi.fn(),
}))
const revisionsApi = vi.hoisted(() => ({ fetchRevision: vi.fn() }))
const workflowApi = vi.hoisted(() => ({ fetchWorkflow: vi.fn() }))
const decisionsApi = vi.hoisted(() => ({ fetchDecisionContext: vi.fn() }))
const analyticsApi = vi.hoisted(() => ({
  fetchVariantTrend: vi.fn(),
  fetchAnalyticsPeriods: vi.fn(),
  fetchComparison: vi.fn(),
}))
const reportsApi = vi.hoisted(() => ({ fetchMonthlyReport: vi.fn() }))
const approvalsApi = vi.hoisted(() => ({ fetchApprovalInbox: vi.fn() }))

vi.mock('../api/dashboard', async () => ({
  ...(await vi.importActual<typeof import('../api/dashboard')>('../api/dashboard')),
  ...dashboardApi,
}))
vi.mock('../api/orders', async () => ({
  ...(await vi.importActual<typeof import('../api/orders')>('../api/orders')),
  ...ordersApi,
}))
vi.mock('../api/revisions', async () => ({
  ...(await vi.importActual<typeof import('../api/revisions')>('../api/revisions')),
  ...revisionsApi,
}))
vi.mock('../api/workflow', async () => ({
  ...(await vi.importActual<typeof import('../api/workflow')>('../api/workflow')),
  ...workflowApi,
}))
vi.mock('../api/decisions', async () => ({
  ...(await vi.importActual<typeof import('../api/decisions')>('../api/decisions')),
  ...decisionsApi,
}))
vi.mock('../api/analytics', async () => ({
  ...(await vi.importActual<typeof import('../api/analytics')>('../api/analytics')),
  ...analyticsApi,
}))
vi.mock('../api/reports', async () => ({
  ...(await vi.importActual<typeof import('../api/reports')>('../api/reports')),
  ...reportsApi,
}))
vi.mock('../api/approvals', async () => ({
  ...(await vi.importActual<typeof import('../api/approvals')>('../api/approvals')),
  ...approvalsApi,
}))

// The chart draws nothing useful in jsdom; the words around it are what is checked.
vi.mock('../components/analytics/TrendChart', () => ({ TrendChart: () => <div data-testid="chart" /> }))

// ---- fixtures ----------------------------------------------------------------------------------------

/** "Zibil paketi" at Fəvvarələr: sold by the piece, and priced to four decimals in the workbook. */
function variant(overrides: Partial<VariantIdentity> = {}): VariantIdentity {
  return {
    productVariantId: 21,
    productId: 11,
    productCode: 'PRD-000011',
    productName: 'Zibil paketi',
    specificationValue: '120',
    specificationUnitCode: 'L',
    specificationUnitName: 'Litr',
    specificationDescriptor: null,
    modelCode: null,
    orderUnitCode: 'PCS',
    orderUnitName: 'Ədəd',
    ...overrides,
  }
}

function amount(overrides: Partial<DashboardAmount> = {}): DashboardAmount {
  return {
    knownAmount: 1000,
    itemCount: 40,
    knownPriceItemCount: 38,
    missingPriceItemCount: 2,
    priceNotRequiredItemCount: 0,
    isComplete: false,
    ...overrides,
  }
}

function dashboardRow(overrides: Partial<LocationDashboardRow> = {}): LocationDashboardRow {
  return {
    locationId: 21,
    locationCode: 'LOC-000017',
    locationName: 'Fəvvarələr meydanı',
    hasCurrentRequest: true,
    currentRequestId: 105,
    currentVersion: 1,
    currentStatus: 'PendingApproval',
    current: amount(),
    currentPriceCoverage: 'Partial',
    expectedBaselinePeriodCount: 3,
    availableBaselinePeriodCount: 2,
    missingBaselinePeriods: [],
    baselinePeriods: [],
    baseline: amount({ knownAmount: 800 }),
    knownAmountDelta: 200,
    knownAmountPercentChange: 25,
    historyCoverage: 'Partial',
    comparisonAvailability: 'Available',
    comparisonAvailable: true,
    newVariantCount: 1,
    increasedVariantCount: 0,
    decreasedVariantCount: 0,
    unchangedVariantCount: 0,
    noLongerOrderedVariantCount: 1,
    insufficientHistoryVariantCount: 0,
    notComparableVariantCount: 0,
    quantityComparableVariantCount: 2,
    amountOrientedServiceCount: 0,
    comparedVariantCount: 2,
    deepLinkPeriod: '2026-07-01',
    deepLinkBasis: 'Previous3MonthAverage',
    deepLinkCustomStart: null,
    deepLinkCustomEnd: null,
    causes: [
      { category: 'NewOrders', amount: 300, variantCount: 1 },
      { category: 'NoLongerOrdered', amount: -150, variantCount: 1 },
      { category: 'UnattributedDueToMissingPrice', amount: 50, variantCount: 1 },
    ],
    primaryCause: 'NewOrders',
    primaryCauseAmount: 300,
    explanationIsComplete: false,
    unattributedAmount: 50,
    supplyChangedVariantCount: 0,
    ...overrides,
  }
}

function dashboard(): ManagementDashboard {
  const first = dashboardRow()
  const second = dashboardRow({
    locationId: 22,
    locationName: 'Nərimanov heykəli',
    historyCoverage: 'Complete',
    primaryCause: 'UnattributedDueToMissingPrice',
    primaryCauseAmount: 50,
  })
  const third = dashboardRow({
    locationId: 23,
    locationName: 'Bakı Konqres Mərkəzi',
    historyCoverage: 'Complete',
    primaryCause: 'NoLongerOrdered',
    primaryCauseAmount: -150,
  })

  return {
    summary: {
      selectedPeriod: '2026-07-01',
      basis: 'AllPriorMonths',
      baselinePeriods: ['2026-04-01', '2026-05-01', '2026-06-01'],
      locationCount: 3,
      locationsWithCurrentRequest: 3,
      locationsWithoutCurrentRequest: 0,
      currentRequestCount: 3,
      current: amount({ knownAmount: 3000 }),
      comparedCurrent: amount({ knownAmount: 3000 }),
      baseline: amount({ knownAmount: 2400 }),
      knownAmountDelta: 600,
      knownAmountPercentChange: 25,
      partition: partition({
        compared: [
          partitionMember(21, 'Fəvvarələr meydanı'),
          partitionMember(22, 'Nərimanov heykəli'),
          partitionMember(23, 'Bakı Konqres Mərkəzi'),
        ],
      }),
      locationsWithMissingPrices: 3,
      locationsWithCompleteHistory: 2,
      locationsWithPartialHistory: 1,
      locationsWithNoBaselineHistory: 0,
      locationsWithComparison: 3,
      newVariantCount: 3,
      increasedVariantCount: 0,
      decreasedVariantCount: 0,
      unchangedVariantCount: 0,
      noLongerOrderedVariantCount: 3,
      insufficientHistoryVariantCount: 0,
      amountOrientedServiceCount: 0,
    },
    filteredLocationCount: 3,
    attention: [
      { reason: 'MissingRequiredPrice', location: first },
      { reason: 'LargestIncrease', location: second },
      { reason: 'LargestDecrease', location: third },
    ],
    rows: { items: [first, second, third], page: 1, pageSize: 25, totalCount: 3 },
  }
}

function driver(overrides: Partial<DecisionDriver> = {}): DecisionDriver {
  return {
    variant: variant(),
    analyticsKind: 'QuantityComparable',
    category: 'NoLongerOrdered',
    amountImpact: -2281.04,
    quantityImpact: null,
    priceImpact: null,
    currentQuantity: 0,
    baselineQuantity: 71,
    quantityPercentChange: -100,
    currentUnitPrice: null,
    baselineUnitPrice: 32.1273,
    unitPricePercentChange: null,
    currentKnownAmount: null,
    baselineKnownAmount: 2281.04,
    currentItemCount: 0,
    baselineItemCount: 1,
    missingPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    priceIsComplete: true,
    supplyChanged: false,
    ...overrides,
  }
}

function decisionContext(): OrderDecisionContext {
  return {
    orderRequestId: 105,
    locationId: 21,
    locationCode: 'LOC-000017',
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    version: 1,
    status: 'PendingApproval',
    isLatestVersion: true,
    latestOrderRequestId: 105,
    latestVersion: 1,
    current: {
      knownAmount: 4800,
      itemCount: 40,
      knownPriceItemCount: 36,
      missingPriceItemCount: 2,
      priceNotRequiredItemCount: 2,
      isComplete: false,
    },
    primary: {
      basis: 'Previous3MonthAverage',
      customStart: null,
      customEnd: null,
      windowPeriods: ['2026-04-01', '2026-05-01', '2026-06-01'],
      expectedPeriodCount: 3,
      availablePeriodCount: 2,
      missingPeriods: ['2026-04-01'],
      periods: [],
      available: true,
      baselineKnownAmount: 4200,
      deltaAmount: 600,
      deltaPercent: 14.2857,
      amountIsComplete: false,
    },
    secondary: [],
    decomposition: {
      categories: [
        { category: 'NewOrders', amount: 2900, variantCount: 1 },
        { category: 'QuantityChange', amount: 0, variantCount: 0 },
        { category: 'PriceChange', amount: 0, variantCount: 0 },
        { category: 'NoLongerOrdered', amount: -2281.04, variantCount: 1 },
        { category: 'Services', amount: 0, variantCount: 0 },
        { category: 'UnattributedDueToMissingPrice', amount: -18.96, variantCount: 1 },
      ],
      totalAmountImpact: 600,
      explanationIsComplete: false,
      unattributedVariantCount: 1,
      internalSupplyVariantCount: 0,
      supplyChangedVariantCount: 0,
      drivers: [
        driver(),
        driver({
          variant: variant({ productVariantId: 22, productName: 'Rosmarinus', orderUnitCode: 'BAG', orderUnitName: 'Kisə' }),
          category: 'NewOrders',
          amountImpact: 2900,
          currentQuantity: 10,
          baselineQuantity: 0,
          currentUnitPrice: 290,
          baselineUnitPrice: null,
          currentKnownAmount: 2900,
          baselineKnownAmount: null,
        }),
        driver({
          variant: variant({ productVariantId: 23, productName: 'Əlcək', orderUnitCode: 'PAIR', orderUnitName: 'Cüt' }),
          category: 'UnattributedDueToMissingPrice',
          amountImpact: -18.96,
          currentQuantity: 20,
          baselineQuantity: 20,
          currentUnitPrice: null,
          baselineUnitPrice: 0.948,
          missingPriceItemCount: 2,
          priceIsComplete: false,
        }),
      ],
    },
  }
}

function orderItem(overrides: Partial<OrderRequestItem> = {}): OrderRequestItem {
  return {
    orderRequestItemId: 501,
    productId: 11,
    productCode: 'PRD-000011',
    productName: 'Zibil paketi',
    productVariantId: 21,
    specificationValue: '120',
    specificationUnitCode: 'L',
    specificationUnitName: 'Litr',
    specificationDescriptor: null,
    modelCode: null,
    orderUnitCode: 'PACK',
    orderUnitName: 'Paçka',
    quantity: 30,
    unitPrice: 32.1273,
    lineTotal: 963.82,
    supplierId: null,
    supplierName: 'Kənar şirkət',
    pricingMode: 'PriceRequired',
    sourceSupplierName: null,
    categoryPath: [],
    source: null,
    sourceOrderRequestItemId: null,
    ...overrides,
  }
}

function orderDetail(overrides: Partial<OrderRequestDetail> = {}): OrderRequestDetail {
  const items = [
    orderItem(),
    orderItem({ orderRequestItemId: 502, orderUnitCode: 'ROLL', orderUnitName: 'Top (rulon)', unitPrice: null, lineTotal: null }),
    orderItem({ orderRequestItemId: 503, orderUnitCode: 'KG', orderUnitName: 'Kiloqram', specificationUnitCode: 'M2' }),
  ]

  return {
    orderRequestId: 105,
    locationId: 21,
    locationCode: 'LOC-000017',
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    requestDate: null,
    version: 1,
    status: 'PendingApproval',
    createdAtUtc: '2026-09-22T10:00:00Z',
    sourceImportBatchId: null,
    itemCount: 40,
    knownPriceItemCount: 38,
    missingPriceItemCount: 2,
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
    items: { items, page: 1, pageSize: 50, totalCount: items.length },
  }
}

function orderRevision(): OrderRevision {
  return {
    orderRequestId: 105,
    locationId: 21,
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    version: 1,
    status: 'PendingApproval',
    isRevision: false,
    revisedFrom: null,
    revisedInto: null,
    isLatestVersion: true,
    canCreateRevision: false,
    canEditRevision: false,
    rowVersion: '00FF01',
    itemCount: 40,
    missingPriceItemCount: 2,
    knownAmountTotal: 4800,
    amountIsComplete: false,
    editHistory: [],
  }
}

function orderWorkflow(): OrderWorkflow {
  return {
    orderRequestId: 105,
    locationId: 21,
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    version: 1,
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
    missingPriceItemCount: 2,
    priceNotRequiredItemCount: 2,
    knownAmountTotal: 4800,
    amountIsComplete: false,
    requiresMissingPriceAcknowledgement: true,
    history: [
      {
        id: 1,
        action: 'ReturnedForCorrection',
        fromStatus: 'PendingApproval',
        toStatus: 'ReturnedForCorrection',
        actorUserId: 'aaaa',
        actorDisplayName: 'Test Rəhbər',
        comment: 'Zibil paketi sayı çoxdur',
        missingPriceItemCount: 0,
        missingPricesAcknowledged: false,
        occurredAtUtc: '2026-09-21T09:00:00Z',
      },
      {
        id: 2,
        action: 'Approved',
        fromStatus: 'PendingApproval',
        toStatus: 'Approved',
        actorUserId: 'aaaa',
        actorDisplayName: 'Test Rəhbər',
        comment: null,
        missingPriceItemCount: 2,
        missingPricesAcknowledged: true,
        occurredAtUtc: '2026-09-22T12:00:00Z',
      },
    ],
    decisionFacts: {
      isHistoricalImport: false,
      submissionNumber: 1,
      submittedByDisplayName: 'Test Koordinator',
      submittedAtUtc: '2026-09-22T10:00:00Z',
      previousReturn: null,
      decision: null,
    },
  }
}

function variantTrend(): VariantTrend {
  const point = {
    orderRequestId: 104,
    version: 1,
    quantity: 71,
    knownAmount: 2281.04,
    weightedUnitPrice: 32.1273,
    itemCount: 1,
    knownPriceItemCount: 1,
    missingRequiredPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
  }

  return {
    locationId: 21,
    locationCode: 'LOC-000017',
    locationName: 'Fəvvarələr meydanı',
    variant: variant(),
    analyticsKind: 'QuantityComparable',
    from: '2026-04-01',
    to: '2026-07-01',
    frequency: {
      availableMonthCount: 9,
      orderedMonthCount: 3,
      firstOrderedPeriod: '2026-04-01',
      lastOrderedPeriod: '2026-07-01',
      monthsSinceLastOrder: 0,
      intervalsInMonths: [2, 1],
      typicalIntervalMonths: 1,
      shortestIntervalMonths: 1,
      longestIntervalMonths: 2,
    },
    points: [
      { ...point, period: '2026-04-01' },
      {
        ...point,
        period: '2026-06-01',
        knownAmount: null,
        weightedUnitPrice: null,
        knownPriceItemCount: 0,
        missingRequiredPriceItemCount: 2,
      },
      { ...point, period: '2026-07-01', orderRequestId: 105, weightedUnitPrice: 29.4567 },
    ],
  }
}

function locationHistory(): LocationOrderHistory {
  const entry = {
    orderRequestId: 105,
    requestPeriod: '2026-07-01',
    version: 1,
    requestDate: null,
    status: 'PendingApproval' as const,
    itemCount: 40,
    knownPriceItemCount: 39,
    missingPriceItemCount: 1,
    knownAmountTotal: 4800,
    createdAtUtc: '2026-09-22T10:00:00Z',
  }

  return {
    locationId: 22,
    code: 'LOC-000022',
    name: 'Nərimanov heykəli',
    isActive: true,
    orderRequestCount: 2,
    distinctPeriodCount: 2,
    earliestPeriod: '2026-06-01',
    latestPeriod: '2026-07-01',
    totalItemCount: 80,
    knownAmountTotal: 9000,
    missingPriceItemCount: 1,
    years: [2026],
    requests: {
      items: [entry, { ...entry, orderRequestId: 104, requestPeriod: '2026-06-01', knownAmountTotal: 4200 }],
      page: 1,
      pageSize: 24,
      totalCount: 2,
    },
  }
}

function side(overrides: Partial<ComparisonSide> = {}): ComparisonSide {
  return {
    quantity: 30,
    itemCount: 1,
    knownAmount: 963.82,
    weightedUnitPrice: 32.1273,
    priceCoverage: {
      state: 'Partial',
      totalQuantity: 30,
      knownPriceQuantity: 20,
      missingPriceQuantity: 10,
      knownPriceItemCount: 1,
      missingRequiredPriceItemCount: 1,
      priceNotRequiredItemCount: 0,
    },
    ...overrides,
  }
}

function comparisonRow(overrides: Partial<VariantComparison> = {}): VariantComparison {
  return {
    variant: variant(),
    analyticsKind: 'QuantityComparable',
    state: 'NoLongerOrdered',
    current: side(),
    baseline: { ...side(), availablePeriodCount: 2, expectedPeriodCount: 3 },
    delta: {
      quantityDelta: -41,
      quantityPercentChange: -57.7465,
      priceDelta: 0,
      pricePercentChange: 0,
      amountDelta: -1317.22,
      amountPercentChange: -57.7465,
    },
    ...overrides,
  }
}

function comparisonSummary(): ComparisonSummary {
  return {
    locationId: 21,
    locationCode: 'LOC-000017',
    locationName: 'Fəvvarələr meydanı',
    currentPeriod: '2026-07-01',
    basis: 'Previous3MonthAverage',
    customStart: null,
    customEnd: null,
    baselineWindowPeriods: ['2026-04-01', '2026-05-01', '2026-06-01'],
    currentRequestId: 105,
    currentVersion: 1,
    currentStatus: 'PendingApproval',
    expectedBaselinePeriodCount: 3,
    availableBaselinePeriodCount: 2,
    missingBaselinePeriods: ['2026-04-01'],
    baselinePeriods: [],
    baselineAvailable: true,
    currentItemCount: 40,
    baselineAverageItemCount: 38,
    currentKnownAmountTotal: 4800,
    baselineKnownAmountTotal: 4200,
    knownAmountDelta: 600,
    knownAmountPercentChange: 14.2857,
    currentMissingPriceItemCount: 2,
    baselineMissingPriceItemCount: 1,
    amountIsComplete: false,
    currentPriceNotRequiredItemCount: 0,
    baselinePriceNotRequiredItemCount: 0,
    newVariantCount: 1,
    noLongerOrderedVariantCount: 1,
    increasedVariantCount: 0,
    decreasedVariantCount: 0,
    unchangedVariantCount: 0,
    notComparableVariantCount: 1,
    insufficientHistoryVariantCount: 0,
    quantityComparableVariantCount: 2,
    amountOrientedServiceCount: 1,
    totalVariantCount: 3,
  }
}

function locationComparison(kind: string): LocationComparison {
  const rows = kind === 'AmountOrientedService'
    ? [comparisonRow({
      variant: variant({ productVariantId: 30, productName: 'Ayaqyolu pulu', orderUnitCode: 'MONTH', orderUnitName: 'Ay' }),
      analyticsKind: 'AmountOrientedService',
      state: 'NotComparable',
    })]
    : [comparisonRow(), comparisonRow({ variant: variant({ productVariantId: 22, productName: 'Rosmarinus' }), state: 'New' })]

  return { summary: comparisonSummary(), rows: { items: rows, page: 1, pageSize: 50, totalCount: rows.length } }
}

function reportCell(month: number, overrides: Partial<MonthlyReportCell> = {}): MonthlyReportCell {
  return {
    month,
    period: `2026-${String(month).padStart(2, '0')}-01`,
    orderRequestId: 100 + month,
    version: 1,
    status: 'Draft',
    knownAmount: 1000.25 + month,
    itemCount: 10,
    missingPriceItemCount: month === 3 ? 2 : 0,
    amountIsComplete: month !== 3,
    previousMonthKnownAmount: 999 + month,
    deltaAmount: 1.25,
    deltaPercent: 0.1,
    ...overrides,
  }
}

function monthlyReport(): MonthlyReport {
  const months = Array.from({ length: 12 }, (_, index) => reportCell(index + 1))
  return {
    year: 2026,
    availableYears: [2026],
    rows: [{
      locationId: 21,
      locationCode: 'LOC-000017',
      locationName: 'Fəvvarələr meydanı',
      isActive: true,
      requestCount: 12,
      knownAmount: 12066,
      missingPriceItemCount: 2,
      monthsWithoutRequest: 0,
      months,
    }],
    months: months.map((cell) => ({
      month: cell.month,
      period: cell.period,
      locationsWithRequest: 1,
      knownAmount: cell.knownAmount,
      missingPriceItemCount: cell.missingPriceItemCount,
      amountIsComplete: cell.amountIsComplete,
    })),
    locationCount: 27,
    filteredLocationCount: 27,
    requestCount: 12,
    knownAmount: 431670.91,
    missingPriceItemCount: 2,
    amountIsComplete: false,
  }
}

function inboxRow(overrides: Partial<ApprovalInboxRow> = {}): ApprovalInboxRow {
  return {
    orderRequestId: 105,
    locationId: 21,
    locationCode: 'LOC-000017',
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    version: 1,
    submittedAtUtc: '2026-09-22T10:32:00Z',
    submittedByUserId: 'bbbb',
    submittedByDisplayName: 'Test Koordinator',
    itemCount: 40,
    knownAmount: 4800,
    missingPriceItemCount: 2,
    amountIsComplete: false,
    isRevision: false,
    sourceVersion: null,
    sourceOrderRequestId: null,
    canApprove: true,
    canReturn: true,
    blockedBySelfApproval: false,
    blockedByOwnContribution: false,
    blockedByMissingAuthority: false,
    ...overrides,
  }
}

function inbox(): ApprovalInbox {
  const rows = [inboxRow(), inboxRow({ orderRequestId: 106, locationName: 'Nərimanov heykəli', missingPriceItemCount: 0, amountIsComplete: true })]
  return {
    summary: {
      pendingCount: 2,
      actionableByCurrentUserCount: 2,
      blockedForCurrentUserCount: 0,
      missingPriceRequestCount: 1,
      missingPriceItemCount: 2,
      revisionCount: 0,
    },
    filteredCount: 2,
    rows: { items: rows, page: 1, pageSize: 25, totalCount: 2 },
  }
}

beforeEach(() => {
  dashboardApi.fetchDashboardPeriods.mockReset().mockResolvedValue({
    periods: [
      { period: '2026-07-01', locationCount: 3, requestCount: 3, itemCount: 120 },
      { period: '2026-06-01', locationCount: 3, requestCount: 3, itemCount: 110 },
    ],
  })
  dashboardApi.fetchDashboard.mockReset().mockResolvedValue(dashboard())
  ordersApi.fetchOrder.mockReset().mockResolvedValue(orderDetail())
  ordersApi.fetchOrderItemSource.mockReset()
  ordersApi.fetchLocationHistory.mockReset().mockResolvedValue(locationHistory())
  revisionsApi.fetchRevision.mockReset().mockResolvedValue(orderRevision())
  workflowApi.fetchWorkflow.mockReset().mockResolvedValue(orderWorkflow())
  decisionsApi.fetchDecisionContext.mockReset().mockResolvedValue(decisionContext())
  analyticsApi.fetchVariantTrend.mockReset().mockResolvedValue(variantTrend())
  analyticsApi.fetchAnalyticsPeriods.mockReset().mockResolvedValue({
    locationId: 21,
    locationCode: 'LOC-000017',
    locationName: 'Fəvvarələr meydanı',
    periods: [
      { period: '2026-07-01', orderRequestId: 105, version: 1, status: 'PendingApproval', itemCount: 40 },
      { period: '2026-06-01', orderRequestId: 104, version: 1, status: 'Approved', itemCount: 38 },
    ],
  })
  analyticsApi.fetchComparison.mockReset().mockImplementation(
    (_id: number, _period: string, query: { kind: string }) => Promise.resolve(locationComparison(query.kind)))
  reportsApi.fetchMonthlyReport.mockReset().mockResolvedValue(monthlyReport())
  approvalsApi.fetchApprovalInbox.mockReset().mockResolvedValue(inbox())
})

afterEach(() => vi.clearAllMocks())

function renderAt(url: string, path: string, element: ReactNode) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={path} element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

/** A hint's text is in the DOM whether or not it is open, so the hints are searched along with the page. */
function expectNoOldTerms(root: HTMLElement) {
  expect(findOldTerms(root)).toEqual([])
}

// ---- the screens ---------------------------------------------------------------------------------------

describe('no retired word on the manager’s screens', () => {
  it('the dashboard', async () => {
    const { container } = renderAt('/dashboard?period=2026-07&basis=all', '/dashboard', <ManagementDashboardPage />)
    await screen.findAllByText('Nərimanov heykəli')

    expectNoOldTerms(container)
    // The words that replaced them are where the old ones were.
    expect(container).toHaveTextContent('Yeni məhsullar')
    expect(container).toHaveTextContent('Bu ay yazılmayan məhsullar')
    expect(container).toHaveTextContent('Müqayisə üçün data azdır')
    expect(container).toHaveTextContent('Dəyişikliyin bir hissəsi izah edilə bilmir: bəzi sətirlərdə qiymət yoxdur.')
    expect(screen.getByRole('button', { name: 'Bütün dövrün ortalaması' })).toBeInTheDocument()
  })

  it('the order page, with its decision panel and its histories', async () => {
    const { container } = renderAt('/orders/105', '/orders/:orderRequestId', <OrderDetailPage />)
    await screen.findByRole('region', { name: 'Dəyişikliyin səbəbləri' })
    await screen.findByRole('button', { name: 'Təsdiqlə' })
    await waitFor(() => expect(container).toHaveTextContent('Düzəliş tələb olundu'))

    expectNoOldTerms(container)
    expect(container).toHaveTextContent('71 → 0 ədəd')
    expect(container).toHaveTextContent('32,13 ₼')
    expect(container).toHaveTextContent('Yeni məhsullar')
    expect(container).toHaveTextContent('Bu ay yazılmayan məhsullar')
    expect(container).toHaveTextContent('1 məhsul')
    expect(screen.getByRole('columnheader', { name: 'Vahid' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Müqayisə üçün data azdır — bu nə deməkdir?' })).toBeInTheDocument()
  })

  it('the product history, opened from the order page', async () => {
    renderAt('/orders/105', '/orders/:orderRequestId', <OrderDetailPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Zibil paketi/ }))
    const dialog = await screen.findByRole('dialog')
    await screen.findByText('Son 9 ayın 3-də sifariş edilib')

    expectNoOldTerms(dialog)
    expect(dialog).toHaveTextContent('Məhsul tarixçəsi')
    expect(dialog).toHaveTextContent('71 ədəd')
    expect(dialog).toHaveTextContent('2 sətirdə qiymət yoxdur')
  })

  it('the product history on its own', async () => {
    render(
      <TrendModal locationId={21} variant={variant()} isService={false} to="2026-07" onClose={() => {}} />,
    )
    const dialog = await screen.findByRole('dialog')
    await screen.findAllByRole('table')

    expectNoOldTerms(dialog)
  })

  it('the object page', async () => {
    const { container } = renderAt('/locations/22', '/locations/:locationId', <LocationDetailPage />)
    await screen.findByRole('heading', { name: 'Nərimanov heykəli' })

    expectNoOldTerms(container)
    // The same sentence in the header strip and in the table (5.3).
    expect(screen.getAllByText('1 sətirdə qiymət yoxdur').length).toBeGreaterThanOrEqual(2)
    expect(container).toHaveTextContent('Qiyməti olan sətirlərin cəmi')
  })

  it('the object comparison page, materials and services', async () => {
    const { container } = renderAt(
      '/locations/21/analytics?period=2026-07&basis=avg3',
      '/locations/:locationId/analytics',
      <LocationAnalyticsPage />,
    )
    await screen.findAllByText('Rosmarinus')

    expectNoOldTerms(container)
    expect(container).toHaveTextContent('Qiyməti olan sətirlərin cəmi')
    expect(container).toHaveTextContent('Orta qiymət: 32,13 ₼')
    expect(container).toHaveTextContent('2 məhsul')

    await userEvent.click(screen.getByRole('tab', { name: /Xidmətlər/ }))
    await screen.findAllByText('Ayaqyolu pulu')
    expectNoOldTerms(container)
    expect(container).toHaveTextContent('Cari məbləğ')
  })

  it('the monthly report', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard/monthly']}>
        <MonthlyReportPage />
      </MemoryRouter>,
    )
    await screen.findByRole('group', { name: 'İlin xülasəsi' })

    expectNoOldTerms(container)
  })

  it('the approval inbox', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/approvals']}>
        <ApprovalInboxPage />
      </MemoryRouter>,
    )
    await screen.findAllByText('Nərimanov heykəli')

    expectNoOldTerms(container)
    expect(container).toHaveTextContent('Qiyməti olmayan sətiri olan sifarişlər')
    expect(container).toHaveTextContent('2 sətirdə qiymət yoxdur')
  })
})

describe('the sweep itself', () => {
  /** A sweep that never fails proves nothing; each retired word is caught when it is there. */
  it('finds every retired word it is given', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <p>Yeni sifarişlər · Artıq sifariş olunmur · 3 mövqe · Məlum qiymətlər üzrə · Cari məlum məbləğ</p>
      <p>Çəkili orta qiymət · Tarixçə natamam · Natamam tarixçə · Son 9 mövcud aydan 3-də · Trend</p>
      <p>Qiyməti olmayanlar · Qiymət məlumatı çatışmır · Qiymət məlumatı natamamdır · 3 qiymətsiz sətir</p>
      <p>1 məhsulun qiyməti yoxdur · Düzəlişə qaytarıldı · Server işləyir · Ö/v · 71 → 0 PCS · 32,1273 ₼</p>
      <button>Bütün dövr</button>
    `

    expect(findOldTerms(root)).toEqual([
      'Yeni sifarişlər',
      'Artıq sifariş olunmayanlar / olunmur',
      'mövqe',
      'Məlum qiymətlər üzrə',
      'Məlum məbləğ',
      'Çəkili orta qiymət',
      'Tarixçə natamam',
      'Natamam tarixçə',
      'mövcud aydan',
      'Trend',
      'Qiyməti olmayanlar',
      'Qiymət məlumatı çatışmır',
      'Qiymət məlumatı natamamdır',
      'qiymətsiz',
      'məhsulun qiyməti yoxdur',
      'Düzəlişə qaytarıldı',
      'Server işləyir',
      'Ö/v',
      'unit code',
      'four-decimal price',
      'ordinary space before ₼',
      'a button reading "Bütün dövr"',
    ])
  })

  it('does not mistake the new words for the old ones', () => {
    // U+00A0, by its code point: the no-break space the formatters put before ₼.
    const nbsp = String.fromCharCode(0xa0)
    const root = document.createElement('div')
    root.innerHTML = `
      <p>Yeni məhsullar · Bu ay yazılmayan məhsullar · 3 məhsul · Qiyməti olan sətirlərin cəmi · Orta qiymət</p>
      <p>Müqayisə üçün data azdır · Son 9 ayın 3-də sifariş edilib · Məhsul tarixçəsi · LOC-000017</p>
      <p>71 → 0 ədəd · 32,13${nbsp}₼ · 431.670,91${nbsp}₼ · Düzəliş tələb olundu · 2 sətirdə qiymət yoxdur</p>
      <button>Bütün dövrün ortalaması</button>
    `

    expect(findOldTerms(root)).toEqual([])
  })
})
