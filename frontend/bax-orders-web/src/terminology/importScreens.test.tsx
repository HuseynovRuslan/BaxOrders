import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImportRow } from '../api/imports'
import type { PricingModeReview } from '../api/pricing'
import type { UnresolvedSummaryItem } from '../api/review'
import type { ImportRowDetail } from '../api/rows'
import { RowDetailDialog } from '../components/imports/review/RowDetailDialog'
import { ImportsPage } from '../pages/ImportsPage'
import { PricingModeReviewPage } from '../pages/PricingModeReviewPage'
import { pricingModeLabels } from '../pricing/labels'
import {
  confirmationPreview,
  confirmationResult,
  importPreview,
  importReadiness,
  pricingReview,
} from '../test/importFixtures'
import { findOldPriceTerms } from '../test/oldTerms'

/**
 * Brief (Task 16), acceptance 5: "Import ekranında və qalan ekranlarda eyni sözləri görürəm."
 *
 * The import screens are rendered with data that reaches every price path — unpriced rows unclassified, bought
 * and free, a row with no price, a confirmation and its result — and swept for the brief's old price words
 * (5.3). Only those: the import screens are the Koordinator's working screens, and legitimately show what Task
 * 05b took out of the manager's view ("Versiya", the workbook's own "Ö/v" header).
 */
const importsApi = vi.hoisted(() => ({
  fetchImport: vi.fn(),
  fetchImportRows: vi.fn(),
  fetchConfirmationPreview: vi.fn(),
  confirmImport: vi.fn(),
}))
const reviewApi = vi.hoisted(() => ({ fetchUnresolvedSummary: vi.fn() }))
const rowsApi = vi.hoisted(() => ({ fetchReadiness: vi.fn(), fetchRow: vi.fn() }))
const importPricingApi = vi.hoisted(() => ({ fetchImportPricing: vi.fn(), setImportPricing: vi.fn() }))
const pricingApi = vi.hoisted(() => ({ fetchPricingModeReview: vi.fn(), setPricingMode: vi.fn() }))

vi.mock('../api/imports', async () => ({
  ...(await vi.importActual<typeof import('../api/imports')>('../api/imports')),
  ...importsApi,
}))
vi.mock('../api/review', async () => ({
  ...(await vi.importActual<typeof import('../api/review')>('../api/review')),
  ...reviewApi,
}))
vi.mock('../api/rows', async () => ({
  ...(await vi.importActual<typeof import('../api/rows')>('../api/rows')),
  ...rowsApi,
}))
vi.mock('../api/importPricing', async () => ({
  ...(await vi.importActual<typeof import('../api/importPricing')>('../api/importPricing')),
  ...importPricingApi,
}))
vi.mock('../api/pricing', async () => ({
  ...(await vi.importActual<typeof import('../api/pricing')>('../api/pricing')),
  ...pricingApi,
}))
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: { canManageCatalog: true } }) }))

const emptySummary: UnresolvedSummaryItem[] = (
  ['Location', 'Supplier', 'ResponsiblePerson', 'OrderUnit', 'SpecificationUnit', 'CategoryPath', 'Product', 'ProductVariant'] as const
).map((kind) => ({ kind, distinctValues: 0, affectedRows: 0, dependencyBlockedRows: 0, totalValues: 2, resolvedValues: 2 }))

/** A staged row with no price, as the row preview lists it. */
const unpricedRow: ImportRow = {
  id: 812,
  sheetName: 'Mart',
  rowNumber: 44,
  productName: 'Maye sabun',
  specificationValue: '5',
  specificationUnit: 'litr',
  modelCode: null,
  quantity: '12',
  parsedQuantity: 12,
  orderUnit: 'ədəd',
  unitPrice: null,
  parsedUnitPrice: null,
  lineTotal: null,
  supplierName: 'Qala baza',
  locationName: 'H.Ə.M Təmizlik',
  requestDate: '2026-03-01',
  parsedRequestPeriod: '2026-03-01',
  responsiblePersonName: null,
  validationStatus: 'NeedsReview',
  issues: [{ issueType: 'MissingPrice', severity: 'Warning', fieldName: 'UnitPrice', message: 'Qiymət yoxdur' }],
}

const unpricedRowDetail: ImportRowDetail = {
  id: 812,
  importBatchId: 6,
  sheetName: 'Mart',
  rowNumber: 44,
  sequenceNumber: '17',
  status: 'NeedsReview',
  isExcluded: false,
  exclusionReason: null,
  excludedAtUtc: null,
  parsedQuantity: 12,
  parsedUnitPrice: null,
  parsedRequestPeriod: '2026-03-01',
  calculatedLineTotal: null,
  originalLineTotal: null,
  correctionCount: 0,
  fields: [],
  matches: {
    location: 'Heydər Əliyev Mərkəzi',
    supplier: null,
    responsiblePerson: null,
    category: null,
    product: 'Maye sabun',
    productVariant: null,
    orderUnit: 'ədəd',
    specificationUnit: null,
  },
  issues: [{ issueType: 'MissingPrice', severity: 'Warning', origin: 'Validation', fieldName: 'UnitPrice', message: 'Qiymət yoxdur' }],
}

/** The words the import screens used to say, as whole labels. */
function expectNoRetiredImportWords(root: HTMLElement) {
  expect(findOldPriceTerms(root)).toEqual([])
  expect(within(root).queryByText(/Qiymətli \/ qiymətsiz/i)).toBeNull()
  expect(within(root).queryByText('Qiymətsiz')).toBeNull()
  expect(within(root).queryByText('Qiyməti olmayan')).toBeNull()
  expect(within(root).queryByText('bilinmir')).toBeNull()
}

function renderImports() {
  return render(
    <MemoryRouter initialEntries={['/imports?id=6']}>
      <Routes>
        <Route path="/imports" element={<ImportsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  importsApi.fetchImport.mockReset().mockResolvedValue(importPreview())
  importsApi.fetchImportRows.mockReset().mockResolvedValue({ items: [unpricedRow], page: 1, pageSize: 50, totalCount: 1 })
  importsApi.fetchConfirmationPreview.mockReset().mockResolvedValue(confirmationPreview())
  importsApi.confirmImport.mockReset().mockResolvedValue(confirmationResult())
  reviewApi.fetchUnresolvedSummary.mockReset().mockResolvedValue(emptySummary)
  rowsApi.fetchReadiness.mockReset().mockResolvedValue(importReadiness())
  rowsApi.fetchRow.mockReset().mockResolvedValue(unpricedRowDetail)
  importPricingApi.fetchImportPricing.mockReset().mockResolvedValue(pricingReview())
  importPricingApi.setImportPricing.mockReset()
})

afterEach(() => vi.clearAllMocks())

describe('no old price word on the import screens', () => {
  it('the review, the classification tab, the confirmation dialog and the result', async () => {
    const user = userEvent.setup()
    const { container } = renderImports()

    // The review: readiness with its price strip, the groups, the row preview.
    expect(await screen.findByText('7 sətirdə qiymət yoxdur')).toBeInTheDocument()
    await screen.findByText('Maye sabun')
    expect(screen.getByText('Təsnif edilməyib 5')).toBeInTheDocument()
    expect(screen.getByText('5 sətir importdan sonra Qiymət təsnifatına «Təsnif edilməyib» kimi düşəcək.')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(
      expect.arrayContaining(['Qiymət yoxdur', 'Daxili təminat']),
    )
    expectNoRetiredImportWords(container)

    // The classification tab.
    await user.click(screen.getByRole('button', { name: /^Qiymət təsnifatı/ }))
    await screen.findByText('Zibil paketi')
    expect(screen.getByText(/Təsnif edilməyən sətirlər importdan sonra Qiymət təsnifatına/)).toBeInTheDocument()
    expectNoRetiredImportWords(container)

    // The confirmation dialog.
    await user.click(screen.getByRole('button', { name: 'İdxalı təsdiqlə' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('Fəvvarələr meydanı')
    expect(within(dialog).getByText('Qiymət yoxdur', { selector: 'dt' })).toBeInTheDocument()
    expect(within(dialog).getByText('Təsnif edilməyib', { selector: 'dt' })).toBeInTheDocument()
    expect(within(dialog).getByText('Daxili təminat', { selector: 'dt' })).toBeInTheDocument()
    expectNoRetiredImportWords(container)

    // The result.
    const row = within(dialog).getByText('Fəvvarələr meydanı').closest('tr') as HTMLElement
    await user.click(within(row).getByRole('radio', { name: 'Bu qrupu idxal etmə' }))
    await user.type(within(row).getByPlaceholderText('Səbəb (məcburidir)'), 'Növbəti ay')
    await user.click(within(dialog).getByRole('button', { name: /sifariş və .* sətir yarat/ }))
    expect(await screen.findByText('4 sətir Qiymət təsnifatına «Təsnif edilməyib» kimi düşdü.')).toBeInTheDocument()
    expectNoRetiredImportWords(container)
  })

  it('the row detail says «—» for a missing price, not «bilinmir» and not a state it cannot know', async () => {
    render(<RowDetailDialog importId={6} rowId={812} onClose={() => {}} onChanged={() => {}} />)

    const price = (await screen.findByText('Qiymət', { selector: 'dt' })).nextElementSibling
    expect(price).toHaveTextContent(/^—$/)
    expectNoRetiredImportWords(document.body)
  })
})

describe('the same three words as Qiymət təsnifatı', () => {
  it('the tab’s chips and the page’s chips read pricingModeLabels', async () => {
    const pageReview: PricingModeReview = {
      rows: [],
      totalCount: 0,
      unresolved: 94,
      missingRequiredPrice: 1,
      internalFreeSupply: 95,
    }
    pricingApi.fetchPricingModeReview.mockReset().mockResolvedValue(pageReview)

    const page = render(
      <MemoryRouter>
        <PricingModeReviewPage />
      </MemoryRouter>,
    )
    const pageTotals = within(await within(page.container).findByLabelText('Qiyməti olmayan sətirlərin sayı'))
    const pageLabels = Array.from(pageTotals.getAllByRole('term')).map((term) => term.textContent)
    page.unmount()

    const user = userEvent.setup()
    renderImports()
    await user.click(await screen.findByRole('button', { name: /^Qiymət təsnifatı/ }))
    const tabTotals = within(await screen.findByLabelText('Qiyməti olmayan sətirlərin sayı'))
    const tabLabels = Array.from(tabTotals.getAllByRole('term')).map((term) => term.textContent)

    const expected = [pricingModeLabels.Unresolved, pricingModeLabels.PriceRequired, pricingModeLabels.InternalFreeSupply]
    expect(pageLabels).toEqual(expected)
    expect(tabLabels).toEqual(expected)
  })
})
