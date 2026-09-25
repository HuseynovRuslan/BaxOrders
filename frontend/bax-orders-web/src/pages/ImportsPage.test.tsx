import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImportConfirmationResult } from '../api/imports'
import type { UnresolvedSummaryItem } from '../api/review'
import {
  confirmationPreview,
  confirmationResult,
  importPreview,
  importReadiness,
  pricingReview,
} from '../test/importFixtures'
import { findOldPriceTerms } from '../test/oldTerms'
import { ImportsPage } from './ImportsPage'

/**
 * Brief (Task 16): "importdan sonra hansı işin qaldığını bilsin" — the result says what landed on Qiymət
 * təsnifatı unclassified, and leads there, where what the review decided can still be changed (16.1).
 */
const importsApi = vi.hoisted(() => ({
  fetchImport: vi.fn(),
  fetchImportRows: vi.fn(),
  fetchConfirmationPreview: vi.fn(),
  confirmImport: vi.fn(),
}))
const reviewApi = vi.hoisted(() => ({ fetchUnresolvedSummary: vi.fn() }))
const rowsApi = vi.hoisted(() => ({ fetchReadiness: vi.fn() }))
const pricingApi = vi.hoisted(() => ({ fetchImportPricing: vi.fn(), setImportPricing: vi.fn() }))

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
  ...pricingApi,
}))

/** Every review queue is empty: the batch is ready, and only the prices are left to look at. */
const emptySummary: UnresolvedSummaryItem[] = (
  ['Location', 'Supplier', 'ResponsiblePerson', 'OrderUnit', 'SpecificationUnit', 'CategoryPath', 'Product', 'ProductVariant'] as const
).map((kind) => ({ kind, distinctValues: 0, affectedRows: 0, dependencyBlockedRows: 0, totalValues: 2, resolvedValues: 2 }))

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/imports?id=6']}>
      <Routes>
        <Route path="/imports" element={<ImportsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Opens the confirmation, decides on group B, and confirms. */
async function confirmWith(result: ImportConfirmationResult) {
  importsApi.confirmImport.mockResolvedValue(result)
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'İdxalı təsdiqlə' }))

  const dialog = await screen.findByRole('dialog')
  const row = (await within(dialog).findByText('Fəvvarələr meydanı')).closest('tr') as HTMLElement
  await user.click(within(row).getByRole('radio', { name: 'Bu qrupu idxal etmə' }))
  await user.type(within(row).getByPlaceholderText('Səbəb (məcburidir)'), 'Növbəti ay')
  await user.click(within(dialog).getByRole('button', { name: /sifariş və .* sətir yarat/ }))

  await screen.findByText('İdxal tamamlandı')
  return user
}

function resultPanel() {
  return screen.getByText('İdxal tamamlandı').closest('section') as HTMLElement
}

function detail(label: string) {
  return within(resultPanel()).getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement
}

beforeEach(() => {
  importsApi.fetchImport.mockReset().mockResolvedValue(importPreview())
  importsApi.fetchImportRows.mockReset().mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0 })
  importsApi.fetchConfirmationPreview.mockReset().mockResolvedValue(confirmationPreview())
  importsApi.confirmImport.mockReset()
  reviewApi.fetchUnresolvedSummary.mockReset().mockResolvedValue(emptySummary)
  rowsApi.fetchReadiness.mockReset().mockResolvedValue(importReadiness())
  pricingApi.fetchImportPricing.mockReset().mockResolvedValue(pricingReview())
  pricingApi.setImportPricing.mockReset()
})

afterEach(() => vi.clearAllMocks())

describe('the result of an import', () => {
  it('says what landed on Qiymət təsnifatı, in Task 2’s words, and leads there', async () => {
    renderPage()
    await confirmWith(confirmationResult())

    expect(detail('Qiymət yoxdur')).toHaveTextContent(/^5$/)
    expect(detail('Təsnif edilməyib')).toHaveTextContent(/^4$/)
    expect(detail('Daxili təminat')).toHaveTextContent(/^1$/)
    expect(within(resultPanel()).queryByText('Qiyməti olmayan')).toBeNull()

    const panel = within(resultPanel())
    expect(panel.getByText('4 sətir Qiymət təsnifatına «Təsnif edilməyib» kimi düşdü.')).toBeInTheDocument()
    expect(panel.getByRole('link', { name: 'Qiymət təsnifatına bax' })).toHaveAttribute('href', '/pricing-modes')
    expect(panel.getByRole('link', { name: 'Qiymət təsnifatına bax' })).not.toHaveAttribute('target')
    expect(panel.getByText(/Yoxlamada verilən təsnifatı orada dəyişə bilərsiniz\./)).toBeInTheDocument()
    expect(
      panel.getByText(
        'Xəbərdarlıqlar yox olmayıb: qiyməti olmayan sətirlər Qiymət təsnifatında görünür, mümkün təkrarlar ayrı-ayrı '
        + 'sətir olaraq qalır. Sifariş siyahıları növbəti mərhələdə əlavə olunacaq.',
      ),
    ).toBeInTheDocument()
    expect(findOldPriceTerms(resultPanel())).toEqual([])
  })

  it('leads to Qiymət təsnifatı without the "landed" sentence when every row was classified', async () => {
    renderPage()
    await confirmWith(confirmationResult({ missingPriceItems: 1, unclassifiedPriceItems: 0, priceRequiredItems: 1, internalSupplyItems: 1 }))

    expect(detail('Təsnif edilməyib')).toHaveTextContent(/^0$/)
    expect(within(resultPanel()).queryByText(/kimi düşdü/)).toBeNull()
    expect(within(resultPanel()).getByRole('link', { name: 'Qiymət təsnifatına bax' })).toBeInTheDocument()
  })

  it('has no link when the import wrote no unpriced line', async () => {
    renderPage()
    await confirmWith(confirmationResult({ missingPriceItems: 0, unclassifiedPriceItems: 0, priceRequiredItems: 0, internalSupplyItems: 0 }))

    expect(within(resultPanel()).queryByRole('link', { name: 'Qiymət təsnifatına bax' })).toBeNull()
  })

  it('shows no price figure or price sentence for a replay, whose price counts the server returns as zeros', async () => {
    renderPage()
    await confirmWith(
      confirmationResult({
        alreadyImported: true,
        missingPriceItems: 0,
        unclassifiedPriceItems: 0,
        priceRequiredItems: 0,
        internalSupplyItems: 0,
      }),
    )

    const panel = within(resultPanel())
    expect(panel.getByText('Bu idxal artıq sifarişlərə çevrilib.')).toBeInTheDocument()
    expect(panel.queryByText('Qiymət yoxdur')).toBeNull()
    expect(panel.queryByText('Təsnif edilməyib')).toBeNull()
    expect(panel.queryByText('Daxili təminat')).toBeNull()
    expect(panel.queryByText(/kimi düşdü/)).toBeNull()
    expect(panel.queryByRole('link', { name: 'Qiymət təsnifatına bax' })).toBeNull()
    // What the server did return is still shown.
    expect(detail('Yaradılan sifariş')).toHaveTextContent('1')
  })

  it('turns the review’s classification tab read-only once the batch is imported', async () => {
    renderPage()
    const user = await confirmWith(confirmationResult())

    // The readiness read before the confirmation no longer says "will land": the rows have landed.
    expect(screen.getByText('7 sətirdə qiymət yoxdur')).toBeInTheDocument()
    expect(screen.queryByText(/kimi düşəcək/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Təsnif et' })).toBeNull()

    await user.click(screen.getByRole('button', { name: /^Qiymət təsnifatı/ }))
    expect(await screen.findByText('Bu import artıq təsdiqlənib. Təsnifatı Qiymət təsnifatında dəyişə bilərsiniz.')).toBeInTheDocument()
    await screen.findByText('Maye sabun')
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })
})

describe('the review', () => {
  it('badges the classification tab with the unclassified rows, from the readiness it already read', async () => {
    renderPage()

    const tab = await screen.findByRole('button', { name: /^Qiymət təsnifatı/ })
    await waitFor(() => expect(tab).toHaveTextContent('Qiymət təsnifatı5'))
    expect(rowsApi.fetchReadiness).toHaveBeenCalledTimes(1)
    expect(pricingApi.fetchImportPricing).not.toHaveBeenCalled()
  })

  it('opens the tab from the readiness panel’s «Təsnif et», classifiable while the batch is under review', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Təsnif et' }))
    expect(await screen.findByText('Maye sabun')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0)
    expect(screen.queryByText(/Bu import artıq təsdiqlənib/)).toBeNull()
  })

  it('refreshes the readiness, the badge and the groups after a classification', async () => {
    const user = userEvent.setup()
    const refreshed = importPreview()
    refreshed.groups[0] = { ...refreshed.groups[0], missingPriceRows: 3, internalSupplyRows: 3 }
    pricingApi.setImportPricing.mockResolvedValue({ changed: 2, unchanged: 0, pricingMode: 'InternalFreeSupply', preview: refreshed })
    rowsApi.fetchReadiness
      .mockResolvedValueOnce(importReadiness())
      .mockResolvedValue(importReadiness({ missingPrice: 5, unclassifiedPrice: 3, priceRequired: 2, priceNotRequired: 4 }))
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Təsnif et' }))
    await user.click(await screen.findByRole('checkbox', { name: 'Maye sabun · Heydər Əliyev Mərkəzi · Mart 2026' }))
    await user.click(screen.getByRole('checkbox', { name: 'Zibil paketi · Heydər Əliyev Mərkəzi · Mart 2026' }))
    await user.click(screen.getByRole('button', { name: 'Ödənişsiz daxili təminat kimi qeyd et' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Qeyd et' }))

    expect(pricingApi.setImportPricing).toHaveBeenCalledWith(6, { importRowIds: [812, 813], pricingMode: 'InternalFreeSupply' })
    expect(await screen.findByText('5 sətirdə qiymət yoxdur')).toBeInTheDocument()
    expect(screen.getByText('3 sətir importdan sonra Qiymət təsnifatına «Təsnif edilməyib» kimi düşəcək.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: /^Qiymət təsnifatı/ })).toHaveTextContent('Qiymət təsnifatı3'))

    const groupRow = screen.getAllByText('Heydər Əliyev Mərkəzi').map((cell) => cell.closest('tr')).find(
      (row) => row?.closest('section')?.querySelector('h2')?.textContent === 'Obyekt və dövr üzrə qruplar',
    ) as HTMLElement
    const cells = within(groupRow).getAllByRole('cell')
    expect(cells[3]).toHaveTextContent(/^3$/)
    expect(cells[4]).toHaveTextContent(/^3$/)
  })
})
