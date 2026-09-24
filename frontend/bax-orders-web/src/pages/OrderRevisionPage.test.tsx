import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import type { OrderRequestDetail, OrderRequestItem, OrderItemProvenance } from '../api/orders'
import type { OrderEditEvent, OrderRevision } from '../api/revisions'
import type { OrderWorkflow } from '../api/workflow'
import { OrderDetailPage } from './OrderDetailPage'

/**
 * Correcting a returned order, from the screen.
 * <para>
 * Two rules are load-bearing here and are tested as rules, not as pixels: what may be edited is the server's
 * answer and never worked out in the browser, and a field the person did not touch is not sent — so a price
 * that was left alone cannot be wiped by a round trip through a form.
 * </para>
 */
const ordersApi = vi.hoisted(() => ({
  fetchOrder: vi.fn(),
  fetchOrderItemSource: vi.fn(),
}))

const revisionsApi = vi.hoisted(() => ({
  fetchRevision: vi.fn(),
  createRevision: vi.fn(),
  editOrderItem: vi.fn(),
  addOrderItem: vi.fn(),
  removeOrderItem: vi.fn(),
}))

const workflowApi = vi.hoisted(() => ({
  fetchWorkflow: vi.fn(),
}))

const reviewApi = vi.hoisted(() => ({
  searchReference: vi.fn(),
  searchProductVariants: vi.fn(),
}))

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

vi.mock('../api/review', async () => {
  const actual = await vi.importActual<typeof import('../api/review')>('../api/review')
  return { ...actual, ...reviewApi }
})

const navigate = vi.hoisted(() => vi.fn())
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...actual, useNavigate: () => navigate }
})

function item(overrides: Partial<OrderRequestItem> = {}): OrderRequestItem {
  return {
    orderRequestItemId: 501,
    productId: 11,
    productCode: 'PRD-000011',
    productName: 'Bel',
    productVariantId: 21,
    specificationValue: null,
    specificationUnitCode: null,
    specificationUnitName: null,
    specificationDescriptor: null,
    modelCode: null,
    orderUnitCode: 'PCS',
    orderUnitName: 'Ədəd',
    quantity: 10,
    unitPrice: 2,
    lineTotal: 20,
    supplierId: null,
    supplierName: null,
    pricingMode: 'PriceRequired',
    sourceSupplierName: null,
    categoryPath: [],
    source: { importBatchId: 7, importRowId: 70, sheetName: 'Əsas', rowNumber: 4 },
    sourceOrderRequestItemId: 401,
    ...overrides,
  }
}

function detail(overrides: Partial<OrderRequestDetail> = {}): OrderRequestDetail {
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
    itemCount: items.length,
    knownPriceItemCount: items.filter((line) => line.unitPrice !== null).length,
    missingPriceItemCount: items.filter((line) => line.unitPrice === null).length,
    knownAmountTotal: 20,
    isRevision: true,
    sourceOrderRequestId: 104,
    sourceVersion: 1,
    hasRevision: false,
    revisionOrderRequestId: null,
    revisionVersion: null,
    canCreateRevision: false,
    canEditRevision: true,
    ...overrides,
    items: { items, page: 1, pageSize: 50, totalCount: items.length, ...overrides.items },
  }
}

function revision(overrides: Partial<OrderRevision> = {}): OrderRevision {
  return {
    orderRequestId: 105,
    locationId: 21,
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    version: 2,
    status: 'Draft',
    isRevision: true,
    revisedFrom: {
      orderRequestId: 104,
      version: 1,
      status: 'ReturnedForCorrection',
      createdByUserId: 'aaaa',
      createdByDisplayName: 'Test Koordinator',
      createdAtUtc: '2026-09-22T10:00:00Z',
    },
    revisedInto: null,
    isLatestVersion: true,
    canCreateRevision: false,
    canEditRevision: true,
    rowVersion: '00FF01',
    itemCount: 1,
    missingPriceItemCount: 0,
    knownAmountTotal: 20,
    amountIsComplete: true,
    editHistory: [],
    ...overrides,
  }
}

function emptyWorkflow(): OrderWorkflow {
  return {
    orderRequestId: 105,
    locationId: 21,
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    version: 2,
    status: 'Draft',
    allowedActions: {
      canSubmit: true,
      canApprove: false,
      canReturn: false,
      blockedBySelfApproval: false,
      blockedByOwnContribution: false,
      blockedByMissingAuthority: false,
    },
    submittedByUserId: null,
    submittedAtUtc: null,
    approvedAtUtc: null,
    returnedAtUtc: null,
    itemCount: 1,
    missingPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    knownAmountTotal: 20,
    amountIsComplete: true,
    requiresMissingPriceAcknowledgement: false,
    history: [],
    decisionFacts: {
      isHistoricalImport: false,
      submissionNumber: 0,
      submittedByDisplayName: null,
      submittedAtUtc: null,
      previousReturn: null,
      decision: null,
    },
  }
}

beforeEach(() => {
  navigate.mockReset()
  ordersApi.fetchOrder.mockReset().mockResolvedValue(detail())
  ordersApi.fetchOrderItemSource.mockReset()
  revisionsApi.fetchRevision.mockReset().mockResolvedValue(revision())
  revisionsApi.createRevision.mockReset()
  revisionsApi.editOrderItem.mockReset().mockResolvedValue({ orderRequestItemId: 501, revision: revision() })
  revisionsApi.addOrderItem.mockReset().mockResolvedValue({ orderRequestItemId: 777, revision: revision() })
  revisionsApi.removeOrderItem.mockReset().mockResolvedValue({ orderRequestItemId: 501, revision: revision() })
  workflowApi.fetchWorkflow.mockReset().mockResolvedValue(emptyWorkflow())
  reviewApi.searchReference.mockReset().mockResolvedValue([])
  reviewApi.searchProductVariants.mockReset().mockResolvedValue([])
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

  await screen.findByRole('heading', { name: /Fəvvarələr meydanı/ })
  await waitFor(() => expect(revisionsApi.fetchRevision).toHaveBeenCalled())
}

/**
 * The lines' table. Below 1024 pixels the same lines are cards beside it (Task 12: "Sifariş sətirləri telefonda
 * yana sürüşdürmədən oxunur"), so a line's buttons are on the page twice and are looked for in the table here.
 */
function linesTable() {
  return within(screen.getByRole('columnheader', { name: 'Məhsul' }).closest('table')!)
}

/** The same lines as cards, for a phone. */
function lineCards() {
  return within(screen.getByRole('list', { name: 'Sətirlər' }))
}

// ---- creating a correction -------------------------------------------------------------------------

describe('a returned order', () => {
  const returned = () =>
    revision({
      version: 1,
      status: 'ReturnedForCorrection',
      isRevision: false,
      revisedFrom: null,
      canCreateRevision: true,
      canEditRevision: false,
    })

  it('offers the correction, and says what will and will not happen', async () => {
    const user = userEvent.setup()
    revisionsApi.fetchRevision.mockResolvedValue(returned())
    ordersApi.fetchOrder.mockResolvedValue(detail({ version: 1, status: 'ReturnedForCorrection', isRevision: false, canEditRevision: false }))
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Düzəliş versiyası yarat' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Köhnə versiya dəyişdirilməyəcək/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Yeni, təsdiqlənməmiş versiya yaradılacaq/)).toBeInTheDocument()
  })

  it('opens the new version once it has been created', async () => {
    const user = userEvent.setup()
    revisionsApi.fetchRevision.mockResolvedValue(returned())
    revisionsApi.createRevision.mockResolvedValue({
      orderRequestId: 900,
      version: 2,
      itemCount: 3,
      sourceOrderRequestId: 105,
      sourceVersion: 1,
      alreadyExisted: false,
    })
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Düzəliş versiyası yarat' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Düzəliş versiyası yarat' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/orders/900'))
  })

  it('cannot be asked twice by a double click', async () => {
    const user = userEvent.setup()
    revisionsApi.fetchRevision.mockResolvedValue(returned())
    revisionsApi.createRevision.mockReturnValue(new Promise(() => {}))
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Düzəliş versiyası yarat' }))
    const confirm = within(screen.getByRole('dialog')).getByRole('button', { name: 'Düzəliş versiyası yarat' })

    await user.click(confirm)
    expect(confirm).toBeDisabled()
    await user.click(confirm)

    expect(revisionsApi.createRevision).toHaveBeenCalledTimes(1)
  })

  it('links to the correction it already has instead of offering another', async () => {
    revisionsApi.fetchRevision.mockResolvedValue(revision({
      version: 1,
      status: 'ReturnedForCorrection',
      isRevision: false,
      revisedFrom: null,
      canCreateRevision: false,
      canEditRevision: false,
      revisedInto: {
        orderRequestId: 900,
        version: 2,
        status: 'Draft',
        createdByUserId: 'aaaa',
        createdByDisplayName: 'Test Koordinator',
        createdAtUtc: '2026-09-22T11:00:00Z',
      },
    }))
    await renderPage()

    expect(screen.getByRole('link', { name: 'Düzəldilmiş sifarişə bax' })).toHaveAttribute('href', '/orders/900')
    expect(screen.queryByRole('button', { name: /Düzəliş versiyası yarat/ })).toBeNull()
  })

  it('offers the next correction when it was itself returned', async () => {
    revisionsApi.fetchRevision.mockResolvedValue(revision({
      status: 'ReturnedForCorrection',
      canCreateRevision: true,
      canEditRevision: false,
    }))
    await renderPage()

    expect(screen.getByRole('button', { name: 'Yeni düzəliş versiyası yarat' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Redaktə et' })).toBeNull()
  })
})

// ---- version context -------------------------------------------------------------------------------

describe('where this version sits', () => {
  it('names the order it was made from in business words and links both ways', async () => {
    revisionsApi.fetchRevision.mockResolvedValue(revision({
      revisedInto: {
        orderRequestId: 900,
        version: 3,
        status: 'Draft',
        createdByUserId: 'bbbb',
        createdByDisplayName: 'Test Koordinator',
        createdAtUtc: '2026-09-22T12:00:00Z',
      },
    }))
    await renderPage()

    // Task 05b: "Versiya 1 əsasında yaradılıb" is gone — the banner says where the order came from.
    expect(screen.getByText('Düzəliş tələbindən sonra əvvəlki sifarişdən yaradılıb')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Əvvəlki sifarişə bax' })).toHaveAttribute('href', '/orders/104')
    expect(screen.getByRole('link', { name: 'Düzəldilmiş sifarişə bax' })).toHaveAttribute('href', '/orders/900')
  })

  it('shows an unmistakable banner while looking at a correction, in business words and without a number', async () => {
    await renderPage()

    expect(screen.getByText('Düzəldilmiş sifariş')).toBeInTheDocument()
    expect(screen.getByText('Düzəliş tələbindən sonra əvvəlki sifarişdən yaradılıb')).toBeInTheDocument()
    expect(screen.getByText('Əvvəlki sifariş dəyişdirilmir. Düzəlişlər bu sifarişdə aparılır.')).toBeInTheDocument()
    // Neither the version numbers nor a second copy of the status: the status is in the page header (04a).
    const panel = screen.getByText('Düzəldilmiş sifariş').closest('section')!
    expect(panel).not.toHaveTextContent(/versiya/i)
    expect(panel).not.toHaveTextContent('Təsdiqlənməyib')
  })

  it('shows no such banner for a request that never was a correction', async () => {
    ordersApi.fetchOrder.mockResolvedValue(detail({ version: 1, isRevision: false, canEditRevision: false }))
    revisionsApi.fetchRevision.mockResolvedValue(revision({
      version: 1,
      isRevision: false,
      revisedFrom: null,
      canCreateRevision: true,
      canEditRevision: false,
    }))
    await renderPage()

    expect(screen.queryByText('Düzəldilmiş sifariş')).toBeNull()
    // The Coordinator's action keeps its own words until Task 14 decides what each role sees.
    expect(screen.getByRole('button', { name: 'Düzəliş versiyası yarat' })).toBeInTheDocument()
  })
})

// ---- header and summary -----------------------------------------------------------------------------

describe('the header and the summary', () => {
  it('leads with the object, then the period alone, with the status told apart as its own badge', async () => {
    await renderPage()

    expect(screen.getByRole('heading', { name: 'Fəvvarələr meydanı' })).toBeInTheDocument()
    // The month alone (Task 05b): "Versiya 2" is not the manager's business.
    expect(screen.getByText('İyul 2026')).toBeInTheDocument()
    expect(screen.queryByText(/Versiya 2/)).toBeNull()
    // "Təsdiqlənməyib" is the status; it also labels the workflow panel's own badge, so there are two.
    expect(screen.getAllByText('Təsdiqlənməyib').length).toBeGreaterThan(0)
  })

  /**
   * The line count used to be the quiet second line. Beside a missing-price count it said "sətir" twice
   * ("1 sətir · 1 sətirdə qiymət yoxdur"), so Task 5 dropped it (5.3); the second line now appears only when
   * there is a missing price to name.
   */
  it('gives the amount the primary number, and adds nothing when every price is known', async () => {
    await renderPage()
    const summary = screen.getByRole('region', { name: 'Sifariş xülasəsi' })

    expect(within(summary).getByText('20,00 ₼')).toBeInTheDocument()
    expect(within(summary).getByText('Məbləğ')).toBeInTheDocument()
    expect(within(summary).queryByText('1 sətir')).toBeNull()
  })

  it('names the missing-price count next to the amount, instead of a second banner repeating it', async () => {
    ordersApi.fetchOrder.mockResolvedValue(detail({
      items: { items: [item({ orderRequestItemId: 999, unitPrice: null, lineTotal: null })] } as never,
      knownAmountTotal: null,
    }))
    await renderPage()
    const summary = screen.getByRole('region', { name: 'Sifariş xülasəsi' })

    expect(within(summary).getByText('Qiyməti olan sətirlərin cəmi')).toBeInTheDocument()
    expect(within(summary).getByText('1 sətirdə qiymət yoxdur')).toHaveClass('text-amber-800')
    expect(summary).not.toHaveTextContent('1 sətir ·')
  })
})

// ---- who may edit ----------------------------------------------------------------------------------

describe('what the screen offers', () => {
  it('offers editing only where the server allows it', async () => {
    await renderPage()

    expect(linesTable().getByRole('button', { name: 'Redaktə et' })).toBeInTheDocument()
    expect(linesTable().getByRole('button', { name: 'Sil' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sətir əlavə et' })).toBeInTheDocument()
  })

  it('offers nothing when the server says this person may not edit', async () => {
    revisionsApi.fetchRevision.mockResolvedValue(revision({ canEditRevision: false }))
    await renderPage()

    expect(screen.queryByRole('button', { name: 'Redaktə et' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sil' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sətir əlavə et' })).toBeNull()
  })

  it('leaves an ordinary imported draft read-only, whatever its status says', async () => {
    // The 167 company requests are drafts too. A draft alone is not an invitation to edit.
    ordersApi.fetchOrder.mockResolvedValue(detail({ version: 1, isRevision: false, canEditRevision: false }))
    revisionsApi.fetchRevision.mockResolvedValue(revision({
      version: 1,
      isRevision: false,
      revisedFrom: null,
      canCreateRevision: false,
      canEditRevision: false,
    }))
    await renderPage()

    expect(screen.queryByRole('button', { name: 'Redaktə et' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sətir əlavə et' })).toBeNull()
  })
})

// ---- editing a line --------------------------------------------------------------------------------

describe('editing a line', () => {
  it('sends only the quantity when only the quantity was touched', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(linesTable().getByRole('button', { name: 'Redaktə et' }))
    const dialog = screen.getByRole('dialog')
    const quantity = within(dialog).getByLabelText('Miqdar')
    await user.clear(quantity)
    await user.type(quantity, '12.5')
    await user.click(within(dialog).getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(revisionsApi.editOrderItem).toHaveBeenCalledWith(105, 501, {
      rowVersion: '00FF01',
      quantity: { value: 12.5 },
    }))
  })

  it('clears a price deliberately, and never as a zero', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(linesTable().getByRole('button', { name: 'Redaktə et' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /Qiymət yoxdur/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(revisionsApi.editOrderItem).toHaveBeenCalledWith(105, 501, {
      rowVersion: '00FF01',
      unitPrice: { value: null },
    }))
  })

  it('fills a missing price in', async () => {
    const user = userEvent.setup()
    ordersApi.fetchOrder.mockResolvedValue(detail({ items: { items: [item({ unitPrice: null, lineTotal: null })] } as never }))
    await renderPage()

    await user.click(linesTable().getByRole('button', { name: 'Redaktə et' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /Qiymət yoxdur/ }))
    await user.type(within(dialog).getByLabelText('Qiymət'), '4.5')
    await user.click(within(dialog).getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(revisionsApi.editOrderItem).toHaveBeenCalledWith(105, 501, {
      rowVersion: '00FF01',
      unitPrice: { value: 4.5 },
    }))
  })

  it('clears a supplier deliberately', async () => {
    const user = userEvent.setup()
    ordersApi.fetchOrder.mockResolvedValue(detail({ items: { items: [item({ supplierId: 7, supplierName: 'Anbar' })] } as never }))
    await renderPage()

    await user.click(linesTable().getByRole('button', { name: 'Redaktə et' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Məlum deyil' }))
    await user.click(within(dialog).getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(revisionsApi.editOrderItem).toHaveBeenCalledWith(105, 501, {
      rowVersion: '00FF01',
      supplierId: { value: null },
    }))
  })

  it('will not save a quantity of zero, and says why', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(linesTable().getByRole('button', { name: 'Redaktə et' }))
    const dialog = screen.getByRole('dialog')
    const quantity = within(dialog).getByLabelText('Miqdar')
    await user.clear(quantity)
    await user.type(quantity, '0')

    expect(within(dialog).getByText('Miqdar sıfırdan böyük olmalıdır.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Yadda saxla' })).toBeDisabled()
    expect(revisionsApi.editOrderItem).not.toHaveBeenCalled()
  })

  it('does not offer the product for editing', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(linesTable().getByRole('button', { name: 'Redaktə et' }))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByText(/Məhsul dəyişdirilmir/)).toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/Məhsul axtar/)).toBeNull()
  })

  it('reloads instead of overwriting when somebody else got there first', async () => {
    const user = userEvent.setup()
    revisionsApi.editOrderItem.mockRejectedValue(new ApiError(409, 'Dəyişib'))
    await renderPage()
    const before = ordersApi.fetchOrder.mock.calls.length

    await user.click(linesTable().getByRole('button', { name: 'Redaktə et' }))
    const dialog = screen.getByRole('dialog')
    const quantity = within(dialog).getByLabelText('Miqdar')
    await user.clear(quantity)
    await user.type(quantity, '99')
    await user.click(within(dialog).getByRole('button', { name: 'Yadda saxla' }))

    expect(await screen.findByText(/Məlumat bu vaxt ərzində dəyişib/)).toBeInTheDocument()
    await waitFor(() => expect(ordersApi.fetchOrder.mock.calls.length).toBeGreaterThan(before))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

// ---- adding and removing ---------------------------------------------------------------------------

describe('adding a line', () => {
  it('takes a catalog variant, never typed-in text', async () => {
    const user = userEvent.setup()
    // Products and suppliers are two different catalogs, and the dialog searches both.
    reviewApi.searchReference.mockImplementation((kind: string) =>
      Promise.resolve(kind === 'Product' ? [{ id: 11, label: 'Vedrə', secondary: 'PRD-000011' }] : []),
    )
    reviewApi.searchProductVariants.mockResolvedValue([{ id: 31, label: '10 litr · ədəd', secondary: null }])
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Sətir əlavə et' }))
    const dialog = screen.getByRole('dialog')

    await user.click(await within(dialog).findByRole('button', { name: /Vedrə/ }))
    await user.click(await within(dialog).findByRole('button', { name: /10 litr/ }))
    await user.type(within(dialog).getByLabelText('Miqdar'), '4')
    await user.click(within(dialog).getByRole('button', { name: 'Əlavə et' }))

    await waitFor(() => expect(revisionsApi.addOrderItem).toHaveBeenCalledWith(105, {
      rowVersion: '00FF01',
      productVariantId: 31,
      quantity: 4,
      unitPrice: null,
      supplierId: null,
    }))
  })

  it('will not add anything until a variant is chosen', async () => {
    const user = userEvent.setup()
    reviewApi.searchReference.mockResolvedValue([{ id: 11, label: 'Vedrə', secondary: null }])
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Sətir əlavə et' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Miqdar'), '4')

    expect(within(dialog).getByRole('button', { name: 'Əlavə et' })).toBeDisabled()
  })
})

describe('removing a line', () => {
  it('asks first, and says how far the removal reaches', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(linesTable().getByRole('button', { name: 'Sil' }))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByText(/yalnız cari, təsdiqlənməmiş versiyadan silinəcək/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Əvvəlki versiya dəyişməyəcək/)).toBeInTheDocument()
    expect(revisionsApi.removeOrderItem).not.toHaveBeenCalled()
  })

  it('removes it once confirmed, with the row version it read', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(linesTable().getByRole('button', { name: 'Sil' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sil' }))

    await waitFor(() => expect(revisionsApi.removeOrderItem).toHaveBeenCalledWith(105, 501, '00FF01'))
  })
})

/** Task 12: on a phone the lines are cards, and a card's buttons are the table's — the same dialogs, the same calls. */
describe('a line on a phone', () => {
  it('edits and removes from the card through the same dialogs', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(lineCards().getByRole('button', { name: 'Redaktə et' }))
    const edit = screen.getByRole('dialog')
    expect(within(edit).getByText(/Məhsul dəyişdirilmir/)).toBeInTheDocument()
    const quantity = within(edit).getByLabelText('Miqdar')
    await user.clear(quantity)
    await user.type(quantity, '12.5')
    await user.click(within(edit).getByRole('button', { name: 'Yadda saxla' }))
    await waitFor(() => expect(revisionsApi.editOrderItem).toHaveBeenCalledWith(105, 501, {
      rowVersion: '00FF01',
      quantity: { value: 12.5 },
    }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await user.click(lineCards().getByRole('button', { name: 'Sil' }))
    const remove = screen.getByRole('dialog')
    expect(within(remove).getByText(/yalnız cari, təsdiqlənməmiş versiyadan silinəcək/)).toBeInTheDocument()
    await user.click(within(remove).getByRole('button', { name: 'Sil' }))
    await waitFor(() => expect(revisionsApi.removeOrderItem).toHaveBeenCalledWith(105, 501, '00FF01'))
  })

  it('offers neither when the server says this person may not edit', async () => {
    revisionsApi.fetchRevision.mockResolvedValue(revision({ canEditRevision: false }))
    await renderPage()

    expect(lineCards().getByRole('button', { name: 'Mənbəyə bax' })).toBeInTheDocument()
    expect(lineCards().queryByRole('button', { name: 'Redaktə et' })).toBeNull()
    expect(lineCards().queryByRole('button', { name: 'Sil' })).toBeNull()
  })
})

// ---- the histories ---------------------------------------------------------------------------------

describe('the histories', () => {
  const edits: OrderEditEvent[] = [
    {
      id: 1,
      action: 'RevisionCreated',
      orderRequestItemId: null,
      productVariantId: null,
      productCode: null,
      productName: null,
      field: null,
      oldValue: null,
      newValue: { productVariantId: 0, quantity: 0, unitPrice: null, supplierId: null, supplierName: null, sourceOrderRequestItemId: null },
      actorUserId: 'aaaa',
      actorDisplayName: 'Test Koordinator',
      occurredAtUtc: '2026-09-22T10:00:00Z',
    },
    {
      id: 2,
      action: 'ItemQuantityChanged',
      orderRequestItemId: 501,
      productVariantId: 21,
      productCode: 'PRD-000011',
      productName: 'Bel',
      field: 'Quantity',
      oldValue: 10,
      newValue: 12.5,
      actorUserId: 'aaaa',
      actorDisplayName: 'Test Koordinator',
      occurredAtUtc: '2026-09-22T10:05:00Z',
    },
    {
      id: 3,
      action: 'ItemPriceChanged',
      orderRequestItemId: 502,
      productVariantId: 22,
      productCode: 'PRD-000012',
      productName: 'Vedrə',
      field: 'UnitPrice',
      oldValue: null,
      newValue: 4.5,
      actorUserId: 'aaaa',
      actorDisplayName: 'Test Koordinator',
      occurredAtUtc: '2026-09-22T10:06:00Z',
    },
    {
      id: 4,
      action: 'ItemSupplierChanged',
      orderRequestItemId: 502,
      productVariantId: 22,
      productCode: 'PRD-000012',
      productName: 'Vedrə',
      field: 'Supplier',
      oldValue: { id: 7, name: 'Anbar' },
      newValue: { id: 8, name: 'Qala baza' },
      actorUserId: 'aaaa',
      actorDisplayName: 'Test Koordinator',
      occurredAtUtc: '2026-09-22T10:07:00Z',
    },
    {
      id: 5,
      action: 'ItemRemoved',
      orderRequestItemId: 503,
      productVariantId: 23,
      productCode: 'PRD-000013',
      productName: 'Süpürgə',
      field: null,
      oldValue: { productVariantId: 23, quantity: 3, unitPrice: null, supplierId: null, supplierName: null, sourceOrderRequestItemId: 403 },
      newValue: null,
      actorUserId: 'aaaa',
      actorDisplayName: 'Test Koordinator',
      occurredAtUtc: '2026-09-22T10:08:00Z',
    },
  ]

  it('reads each change as what it was, in the words of the time', async () => {
    revisionsApi.fetchRevision.mockResolvedValue(revision({ editHistory: edits }))
    await renderPage()

    expect(await screen.findByText('Düzəldilmiş sifariş yaradıldı')).toBeInTheDocument()
    expect(screen.getByText('Miqdar: 10 → 12,5')).toBeInTheDocument()
    expect(screen.getByText('Qiymət: Qiymət yoxdur → 4,50 ₼')).toBeInTheDocument()
    expect(screen.getByText('Təchizatçı: Anbar → Qala baza')).toBeInTheDocument()
    expect(screen.getByText('Sətir silindi')).toBeInTheDocument()
    expect(screen.getAllByText(/Test Koordinator/).length).toBeGreaterThan(0)
    // The product is named, never coded (Task 05b).
    const history = screen.getByRole('tabpanel')
    expect(within(history).getAllByText('Vedrə')).toHaveLength(2)
    expect(history).not.toHaveTextContent(/PRD-/)
  })

  it('says an untouched correction in business words', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('tab', { name: /Düzəliş tarixçəsi/ }))

    expect(await screen.findByText('Bu sifarişdə hələ düzəliş edilməyib.')).toBeInTheDocument()
  })

  it('keeps the two histories apart', async () => {
    const user = userEvent.setup()
    revisionsApi.fetchRevision.mockResolvedValue(revision({ editHistory: edits }))
    workflowApi.fetchWorkflow.mockResolvedValue({
      ...emptyWorkflow(),
      history: [{
        id: 9,
        action: 'SubmittedForApproval',
        fromStatus: 'Draft',
        toStatus: 'PendingApproval',
        actorUserId: 'aaaa',
        actorDisplayName: 'Test Koordinator',
        comment: null,
        missingPriceItemCount: 0,
        missingPricesAcknowledged: false,
        occurredAtUtc: '2026-09-22T11:00:00Z',
      }],
    })
    await renderPage()

    // The edit history is what a correction is read for, so it opens on it.
    expect(await screen.findByText('Miqdar: 10 → 12,5')).toBeInTheDocument()
    expect(screen.queryByText('Təsdiqə göndərildi')).toBeNull()

    await user.click(screen.getByRole('tab', { name: /Təsdiq prosesi/ }))

    expect(await screen.findByText('Təsdiqə göndərildi')).toBeInTheDocument()
    expect(screen.queryByText('Miqdar: 10 → 12,5')).toBeNull()
  })
})

// ---- provenance ------------------------------------------------------------------------------------

describe('where a line came from', () => {
  function provenance(overrides: Partial<OrderItemProvenance> = {}): OrderItemProvenance {
    return {
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
        originalLineTotal: '20',
        calculatedLineTotal: 20,
        fields: [],
      },
      ...overrides,
    }
  }

  it('shows the versions a copied line came through, ending at the workbook row', async () => {
    const user = userEvent.setup()
    ordersApi.fetchOrderItemSource.mockResolvedValue(provenance())
    await renderPage()

    await user.click(linesTable().getByRole('button', { name: 'Mənbəyə bax' }))

    const chain = (await screen.findByText('Sətrin keçdiyi versiyalar')).closest('div')!
    const steps = within(chain).getAllByRole('listitem')

    expect(steps).toHaveLength(2)
    expect(steps[0]).toHaveTextContent('Cari sətir')
    expect(steps[0]).not.toHaveTextContent('Excel sətri')
    expect(steps[1]).toHaveTextContent('Versiya 1')
    expect(steps[1]).toHaveTextContent('Excel sətri')
    expect(screen.getByText('sifarisler.xlsx')).toBeInTheDocument()
  })

  it('says a hand-added line has no Excel source, rather than failing to find one', async () => {
    const user = userEvent.setup()
    ordersApi.fetchOrderItemSource.mockResolvedValue(provenance({
      origin: 'ManuallyAdded',
      source: null,
      lineage: [{ orderRequestItemId: 501, orderRequestId: 105, version: 2, status: 'Draft', isImported: false }],
    }))
    await renderPage()

    await user.click(linesTable().getByRole('button', { name: 'Mənbəyə bax' }))

    expect(await screen.findByText('Əl ilə əlavə edilib — Excel mənbəsi yoxdur.')).toBeInTheDocument()
    expect(screen.queryByText('Sətrin keçdiyi versiyalar')).toBeNull()
  })
})
