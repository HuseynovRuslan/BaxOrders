import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/client'
import type { ImportPricingResult } from '../../../api/importPricing'
import { pricingModeLabels } from '../../../pricing/labels'
import { importPreview, pricingReview, pricingRow, pricingRows } from '../../../test/importFixtures'
import { findOldPriceTerms } from '../../../test/oldTerms'
import { PricingClassificationTab } from './PricingClassificationTab'

/**
 * Brief (Task 16): "Yoxlama zamanı hər qiymətsiz sətri «Alış qiyməti tələb olunur» və ya «Ödənişsiz daxili
 * təminat» kimi təsnif etmək olur", and "Mənbəyə görə avtomatik təsnifat olmur" (acceptance 4). A person ticks
 * the rows one by one and names the state; nothing is chosen for them, and nothing is chosen by source.
 */
const pricingApi = vi.hoisted(() => ({ fetchImportPricing: vi.fn(), setImportPricing: vi.fn() }))

vi.mock('../../../api/importPricing', async () => {
  const actual = await vi.importActual<typeof import('../../../api/importPricing')>('../../../api/importPricing')
  return { ...actual, ...pricingApi }
})

function result(overrides: Partial<ImportPricingResult> = {}): ImportPricingResult {
  return { changed: 2, unchanged: 0, pricingMode: 'InternalFreeSupply', preview: importPreview(), ...overrides }
}

function renderTab({ canClassify = true, onChanged = vi.fn() } = {}) {
  render(
    <MemoryRouter>
      <PricingClassificationTab importId={6} canClassify={canClassify} onChanged={onChanged} />
    </MemoryRouter>,
  )
  return { onChanged }
}

const soap = 'Maye sabun · Heydər Əliyev Mərkəzi · Mart 2026'
const bags = 'Zibil paketi · Heydər Əliyev Mərkəzi · Mart 2026'
const gloves = 'Əlcək · Fəvvarələr meydanı · Mart 2026'

function totals() {
  return within(screen.getByLabelText('Qiyməti olmayan sətirlərin sayı'))
}

function filterButton(name: string) {
  return within(screen.getByRole('group', { name: 'Təsnifata görə süz' })).getByRole('button', { name })
}

beforeEach(() => {
  pricingApi.fetchImportPricing.mockReset().mockResolvedValue(pricingReview())
  pricingApi.setImportPricing.mockReset().mockResolvedValue(result())
})

afterEach(() => vi.clearAllMocks())

describe('the list', () => {
  it('opens on the rows nobody classified, and lists them with the three totals', async () => {
    renderTab()

    expect(await screen.findByText('Maye sabun')).toBeInTheDocument()
    expect(pricingApi.fetchImportPricing).toHaveBeenCalledWith(
      6,
      { mode: 'Unresolved', search: undefined, page: 1, pageSize: 50 },
      expect.anything(),
    )
    expect(filterButton('Təsnif edilməyib')).toHaveAttribute('aria-pressed', 'true')

    expect(totals().getByText('Təsnif edilməyib').nextElementSibling).toHaveTextContent('5')
    expect(totals().getByText('Alış qiyməti tələb olunur').nextElementSibling).toHaveTextContent('2')
    expect(totals().getByText('Ödənişsiz daxili təminat').nextElementSibling).toHaveTextContent('2')
  })

  it('makes «Təsnif edilməyib» amber when above 0, and «Ödənişsiz daxili təminat» never', async () => {
    renderTab()

    await screen.findByText('Maye sabun')
    expect(totals().getByText('Təsnif edilməyib').parentElement?.className).toMatch(/amber/)
    expect(totals().getByText('Ödənişsiz daxili təminat').parentElement?.className).not.toMatch(/amber/)
  })

  it('filters with the right mode, and «Hamısı» with none', async () => {
    const user = userEvent.setup()
    renderTab()
    await screen.findByText('Maye sabun')

    for (const [name, mode] of [
      ['Alış qiyməti tələb olunur', 'PriceRequired'],
      ['Ödənişsiz daxili təminat', 'InternalFreeSupply'],
      ['Hamısı', undefined],
      ['Təsnif edilməyib', 'Unresolved'],
    ] as const) {
      await user.click(filterButton(name))
      await waitFor(() =>
        expect(pricingApi.fetchImportPricing).toHaveBeenLastCalledWith(
          6,
          { mode, search: undefined, page: 1, pageSize: 50 },
          expect.anything(),
        ),
      )
    }
  })

  it('searches on Enter', async () => {
    const user = userEvent.setup()
    renderTab()
    await screen.findByText('Maye sabun')

    await user.type(screen.getByPlaceholderText('Məhsul, obyekt və ya təchizatçı…'), 'sabun{Enter}')
    await waitFor(() =>
      expect(pricingApi.fetchImportPricing).toHaveBeenLastCalledWith(
        6,
        { mode: 'Unresolved', search: 'sabun', page: 1, pageSize: 50 },
        expect.anything(),
      ),
    )
  })

  it('shows where each row came from: the supplier, the workbook cell and the sheet row', async () => {
    renderTab()

    const row = (await screen.findByText('Maye sabun')).closest('tr') as HTMLElement
    expect(within(row).getByText('«Qala baza»')).toBeInTheDocument()
    expect(within(row).getByText('Mart:44')).toBeInTheDocument()
    expect(within(row).getByText('Heydər Əliyev Mərkəzi')).toBeInTheDocument()
    expect(within(row).getByText('Mart 2026')).toBeInTheDocument()
    expect(within(row).getByText('5')).toBeInTheDocument()

    const bagsRow = screen.getByText('Zibil paketi').closest('tr') as HTMLElement
    expect(within(bagsRow).getByText('Cleanfix MMC')).toBeInTheDocument()
  })

  it('shows each row’s state and who classified it, in the page’s words', async () => {
    pricingApi.fetchImportPricing.mockResolvedValue(
      pricingReview({
        rows: [
          pricingRow({ classification: 'InternalFreeSupply', classifiedByDisplayName: 'Aynur Koordinator' }),
          pricingRow({ importRowId: 813, productName: 'Zibil paketi', classification: 'PriceRequired', classifiedByDisplayName: 'Admin' }),
          pricingRow({ importRowId: 814, productName: 'Əlcək' }),
        ],
      }),
    )
    renderTab()

    const free = (await screen.findByText('Maye sabun')).closest('tr') as HTMLElement
    expect(within(free).getByText(pricingModeLabels.InternalFreeSupply)).toBeInTheDocument()
    expect(within(free).getByText('Aynur Koordinator')).toBeInTheDocument()
    const bought = screen.getByText('Zibil paketi').closest('tr') as HTMLElement
    expect(within(bought).getByText(pricingModeLabels.PriceRequired)).toBeInTheDocument()
    const open = screen.getByText('Əlcək').closest('tr') as HTMLElement
    expect(within(open).getByText(pricingModeLabels.Unresolved)).toBeInTheDocument()
  })

  it('pages at 50, and says where it is', async () => {
    const user = userEvent.setup()
    pricingApi.fetchImportPricing.mockResolvedValue(pricingReview({ totalCount: 88 }))
    renderTab()

    expect(await screen.findByText('Səhifə 1 / 2 · 88 sətir')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Növbəti' }))
    await waitFor(() =>
      expect(pricingApi.fetchImportPricing).toHaveBeenLastCalledWith(
        6,
        { mode: 'Unresolved', search: undefined, page: 2, pageSize: 50 },
        expect.anything(),
      ),
    )
  })

  it('says when nothing is left to classify, and when a filter finds nothing', async () => {
    const user = userEvent.setup()
    pricingApi.fetchImportPricing.mockResolvedValue(pricingReview({ rows: [], totalCount: 0, unclassified: 0 }))
    renderTab()
    expect(await screen.findByText('Təsnif edilməmiş sətir qalmayıb.')).toBeInTheDocument()

    await user.click(filterButton('Alış qiyməti tələb olunur'))
    expect(await screen.findByText('Bu filtrə uyğun sətir tapılmadı.')).toBeInTheDocument()
  })

  it('says when the import has no unpriced row', async () => {
    pricingApi.fetchImportPricing.mockResolvedValue(
      pricingReview({ rows: [], totalCount: 0, unclassified: 0, priceRequired: 0, internalFreeSupply: 0 }),
    )
    renderTab()
    expect(await screen.findByText('Bu importda qiyməti olmayan sətir yoxdur.')).toBeInTheDocument()
  })

  it('says no old price word', async () => {
    renderTab()
    await screen.findByText('Maye sabun')
    expect(findOldPriceTerms(document.body)).toEqual([])
  })
})

describe('classifying', () => {
  async function select(...labels: string[]) {
    const user = userEvent.setup()
    await screen.findByText('Maye sabun')
    for (const label of labels) {
      await user.click(screen.getByRole('checkbox', { name: label }))
    }
    return user
  }

  it('names the two selected rows, and sends exactly their ids as «Ödənişsiz daxili təminat»', async () => {
    const { onChanged } = renderTab()
    const user = await select(soap, gloves)

    await user.click(screen.getByRole('button', { name: 'Ödənişsiz daxili təminat kimi qeyd et' }))

    const dialog = screen.getByRole('dialog')
    const listed = within(within(dialog).getByRole('list', { name: 'Seçilmiş sətirlər' })).getAllByRole('listitem')
    expect(listed).toHaveLength(2)
    expect(listed[0]).toHaveTextContent('Maye sabun')
    expect(listed[1]).toHaveTextContent('Əlcək')
    expect(within(dialog).queryByText('Zibil paketi')).toBeNull()
    // The same explanation as Qiymət təsnifatı's dialog.
    expect(within(dialog).getByRole('button', { name: 'Daxili təminat nədir?' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Qeyd et' }))

    expect(pricingApi.setImportPricing).toHaveBeenCalledTimes(1)
    expect(pricingApi.setImportPricing).toHaveBeenCalledWith(6, { importRowIds: [812, 814], pricingMode: 'InternalFreeSupply' })
    expect(await screen.findByText('2 sətir «Ödənişsiz daxili təminat» kimi qeyd edildi.')).toBeInTheDocument()
    expect(onChanged).toHaveBeenCalledWith({ preview: importPreview() })
  })

  it('sends «Alış qiyməti tələb olunur» for the rows it names', async () => {
    pricingApi.setImportPricing.mockResolvedValue(result({ changed: 1, pricingMode: 'PriceRequired' }))
    renderTab()
    const user = await select(bags)

    await user.click(screen.getByRole('button', { name: 'Alış qiyməti tələb olunur kimi qeyd et' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Zibil paketi')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Daxili təminat nədir?' })).toBeNull()
    await user.click(within(dialog).getByRole('button', { name: 'Qeyd et' }))

    expect(pricingApi.setImportPricing).toHaveBeenCalledWith(6, { importRowIds: [813], pricingMode: 'PriceRequired' })
    expect(await screen.findByText('1 sətir «Alış qiyməti tələb olunur» kimi qeyd edildi.')).toBeInTheDocument()
  })

  it('clears a classification with «Təsnifatı geri al»', async () => {
    pricingApi.setImportPricing.mockResolvedValue(result({ changed: 2, pricingMode: 'Unresolved' }))
    renderTab()
    const user = await select(bags, soap)

    await user.click(screen.getByRole('button', { name: 'Təsnifatı geri al' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Qeyd et' }))

    // In the order of the list, as the ids were ticked or not.
    expect(pricingApi.setImportPricing).toHaveBeenCalledWith(6, { importRowIds: [812, 813], pricingMode: 'Unresolved' })
    expect(await screen.findByText('2 sətrin təsnifatı geri alındı.')).toBeInTheDocument()
  })

  it('reloads the list and clears the selection after saving', async () => {
    renderTab()
    const user = await select(soap)
    expect(pricingApi.fetchImportPricing).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Ödənişsiz daxili təminat kimi qeyd et' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Qeyd et' }))

    await waitFor(() => expect(pricingApi.fetchImportPricing).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('checkbox', { name: soap })).not.toBeChecked()
    expect(screen.queryByRole('button', { name: 'Ödənişsiz daxili təminat kimi qeyd et' })).toBeNull()
  })

  it('shows the server’s refusal in the dialog, and changes nothing else', async () => {
    pricingApi.setImportPricing.mockRejectedValue(
      new ApiError(422, 'Bu sətir importdan çıxarılıb; təsnif edilə bilməz.'),
    )
    const { onChanged } = renderTab()
    const user = await select(soap)

    await user.click(screen.getByRole('button', { name: 'Ödənişsiz daxili təminat kimi qeyd et' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Qeyd et' }))

    expect(await within(screen.getByRole('dialog')).findByText('Bu sətir importdan çıxarılıb; təsnif edilə bilməz.')).toBeInTheDocument()
    expect(onChanged).not.toHaveBeenCalled()
    expect(pricingApi.fetchImportPricing).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/kimi qeyd edildi/)).toBeNull()
    expect(screen.getByRole('checkbox', { name: soap })).toBeChecked()
  })

  it('cancels without a request', async () => {
    renderTab()
    const user = await select(soap)

    await user.click(screen.getByRole('button', { name: 'Ödənişsiz daxili təminat kimi qeyd et' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'İmtina' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(pricingApi.setImportPricing).not.toHaveBeenCalled()
  })

  it('leaves the selection behind when the filter, the search or the page changes', async () => {
    pricingApi.fetchImportPricing.mockResolvedValue(pricingReview({ totalCount: 88 }))
    renderTab()

    let user = await select(soap)
    await user.click(screen.getByRole('button', { name: 'Növbəti' }))
    expect(await screen.findByRole('checkbox', { name: soap })).not.toBeChecked()

    user = await select(soap)
    await user.click(filterButton('Hamısı'))
    expect(await screen.findByRole('checkbox', { name: soap })).not.toBeChecked()

    user = await select(soap)
    await user.type(screen.getByPlaceholderText('Məhsul, obyekt və ya təchizatçı…'), 'sabun{Enter}')
    await waitFor(() => expect(screen.getByRole('checkbox', { name: soap })).not.toBeChecked())
  })
})

describe('no classification by source (acceptance 4)', () => {
  it('pre-checks nothing and pre-chooses nothing: a «Qala baza» row is «Təsnif edilməyib» and unchecked', async () => {
    renderTab()

    const row = (await screen.findByText('Maye sabun')).closest('tr') as HTMLElement
    expect(within(row).getByText('«Qala baza»')).toBeInTheDocument()
    expect(within(row).getByText('Təsnif edilməyib')).toBeInTheDocument()
    expect(within(row).getByRole('checkbox')).not.toBeChecked()
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked()
    }
    // No row picked, so no state can be set.
    expect(screen.queryByRole('button', { name: /kimi qeyd et$/ })).toBeNull()
  })

  it('has no select-all, and no control by supplier, workbook text, object, product or category', async () => {
    renderTab()
    await screen.findByText('Maye sabun')

    // One checkbox per row, and nothing else to tick.
    expect(screen.getAllByRole('checkbox')).toHaveLength(pricingRows.length)
    expect(screen.queryByRole('checkbox', { name: /hamısı|hamısını|bütün|seç/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /hamısını seç|bütün|səhifəni seç/i })).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('button', { name: /Qala|Azpetrol|Cleanfix|təchizatçı|obyekt|kateqoriya/i })).toBeNull()
    // The only buttons: the four filters, and the pager when there is one.
    const buttons = screen.getAllByRole('button').map((button) => button.textContent)
    expect(buttons).toEqual(['Təsnif edilməyib', 'Alış qiyməti tələb olunur', 'Ödənişsiz daxili təminat', 'Hamısı'])
  })

  it('still offers no source control once rows are ticked: only the three states', async () => {
    renderTab()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('checkbox', { name: soap }))

    const buttons = screen.getAllByRole('button').map((button) => button.textContent)
    expect(buttons).toEqual([
      'Təsnif edilməyib',
      'Alış qiyməti tələb olunur',
      'Ödənişsiz daxili təminat',
      'Hamısı',
      'Alış qiyməti tələb olunur kimi qeyd et',
      'Ödənişsiz daxili təminat kimi qeyd et',
      'Təsnifatı geri al',
    ])
  })
})

describe('an imported batch', () => {
  it('is read-only: no checkbox, no button, and the way to Qiymət təsnifatı', async () => {
    renderTab({ canClassify: false })

    expect(await screen.findByText('Maye sabun')).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /kimi qeyd et|geri al/ })).toBeNull()

    const note = screen.getByRole('note')
    expect(note).toHaveTextContent('Bu import artıq təsdiqlənib. Təsnifatı Qiymət təsnifatında dəyişə bilərsiniz.')
    expect(within(note).getByRole('link', { name: 'Qiymət təsnifatına bax' })).toHaveAttribute('href', '/pricing-modes')

    // The list, the totals and the filter are still there to read.
    expect(screen.getByLabelText('Qiyməti olmayan sətirlərin sayı')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Təsnifata görə süz' })).toBeInTheDocument()
  })
})
