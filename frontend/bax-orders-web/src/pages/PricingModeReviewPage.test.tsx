import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PricingModeReview, PricingModeReviewRow } from '../api/pricing'
import { findOldTerms } from '../test/oldTerms'
import { PricingModeReviewPage } from './PricingModeReviewPage'

/**
 * The queue of unpriced lines nobody has classified.
 *
 * Three things are load-bearing here. The screen must show enough of where a line came from that somebody can
 * actually answer the question — for the lines that never matched a catalogue supplier, the workbook cell is
 * the only record there is. It must never offer to answer it for a whole supplier at once, because one
 * supplier being both is the reason the queue exists. And a manager may read it and may not decide on it,
 * which the server enforces whatever this screen shows.
 */
const pricingApi = vi.hoisted(() => ({
  fetchPricingModeReview: vi.fn(),
  setPricingMode: vi.fn(),
}))

vi.mock('../api/pricing', async () => {
  const actual = await vi.importActual<typeof import('../api/pricing')>('../api/pricing')
  return { ...actual, ...pricingApi }
})

const auth = vi.hoisted(() => ({ canManageCatalog: true }))
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { canManageCatalog: auth.canManageCatalog } }),
}))

function row(overrides: Partial<PricingModeReviewRow> = {}): PricingModeReviewRow {
  return {
    orderRequestItemId: 3469,
    orderRequestId: 91,
    requestPeriod: '2026-05-01',
    locationId: 21,
    locationName: 'Fəvvarələr meydanı',
    productVariantId: 77,
    productCode: 'PRD-000077',
    productName: 'Ağac dirəyi yaşıl rəngli faskalı',
    specificationValue: null,
    specificationDescriptor: null,
    orderUnitCode: 'PCS',
    quantity: 12,
    supplierId: null,
    supplierName: null,
    workbookSupplierName: 'Azpetrol baza',
    importRowId: 812,
    sheetName: 'May',
    rowNumber: 44,
    pricingMode: 'Unresolved',
    ...overrides,
  }
}

function review(overrides: Partial<PricingModeReview> = {}): PricingModeReview {
  const rows = overrides.rows ?? [row()]
  return {
    rows,
    totalCount: rows.length,
    unresolved: 94,
    missingRequiredPrice: 1,
    internalFreeSupply: 1,
    ...overrides,
  }
}

function renderPage() {
  render(
    <MemoryRouter>
      <PricingModeReviewPage />
    </MemoryRouter>,
  )

  // Several rows carry the same product name once the fixture pages; wait for any of them.
  return screen.findAllByText('Ağac dirəyi yaşıl rəngli faskalı')
}

beforeEach(() => {
  auth.canManageCatalog = true
  pricingApi.fetchPricingModeReview.mockReset().mockResolvedValue(review())
  pricingApi.setPricingMode.mockReset()
})

afterEach(() => vi.clearAllMocks())

describe('the queue', () => {
  it('opens on the lines nobody has classified', async () => {
    await renderPage()

    expect(pricingApi.fetchPricingModeReview).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'Unresolved' }),
      expect.anything(),
    )
  })

  it('counts the three states apart', async () => {
    await renderPage()

    const totals = within(screen.getByLabelText('Qiyməti olmayan sətirlərin sayı'))
    expect(totals.getByText('Təsnif edilməyib').closest('div')).toHaveTextContent('94')
    expect(totals.getByText('Ödənişsiz daxili təminat').closest('div')).toHaveTextContent('1')
  })

  /**
   * The workbook cell is not decoration. "Azpetrol baza" never matched a catalogue supplier, and it is the
   * only thing that says where those lines came from — it is what settled the question for them.
   */
  it('shows where a line came from, including the workbook cell', async () => {
    await renderPage()

    const table = within(document.querySelector('table')!)
    expect(table.getByText('«Azpetrol baza»')).toBeInTheDocument()
    expect(table.getByText(/May:44/)).toBeInTheDocument()
    expect(table.getByText('Fəvvarələr meydanı')).toBeInTheDocument()
    expect(table.getByText('May 2026')).toBeInTheDocument()
    // The unit as a word (5.4): the formatter is shared with the manager's screens.
    expect(table.getByText(/12 ədəd/)).toBeInTheDocument()
  })
})

describe('deciding', () => {
  it('names the lines before changing anything about them', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('checkbox', { name: /Ağac dirəyi/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Şirkətdaxili təminat kimi qeyd et' }))

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('Ağac dirəyi yaşıl rəngli faskalı')).toBeInTheDocument()
    expect(dialog.getByText(/qiymət xəbərdarlıqlarında görünməyəcək/)).toBeInTheDocument()
  })

  it('sends the chosen lines by id, one by one', async () => {
    pricingApi.setPricingMode.mockResolvedValue({ changed: 1, unchanged: 0, pricingMode: 'InternalFreeSupply' })
    await renderPage()

    await userEvent.click(screen.getByRole('checkbox', { name: /Ağac dirəyi/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Şirkətdaxili təminat kimi qeyd et' }))
    await userEvent.type(screen.getByRole('textbox'), 'Obyekt təsdiqlədi')
    await userEvent.click(screen.getByRole('button', { name: 'Qeyd et' }))

    await waitFor(() => expect(pricingApi.setPricingMode).toHaveBeenCalledWith({
      orderRequestItemIds: [3469],
      pricingMode: 'InternalFreeSupply',
      reason: 'Obyekt təsdiqlədi',
    }))
  })

  it('reports what actually changed', async () => {
    pricingApi.setPricingMode.mockResolvedValue({ changed: 1, unchanged: 0, pricingMode: 'InternalFreeSupply' })
    await renderPage()

    await userEvent.click(screen.getByRole('checkbox', { name: /Ağac dirəyi/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Şirkətdaxili təminat kimi qeyd et' }))
    await userEvent.click(screen.getByRole('button', { name: 'Qeyd et' }))

    expect(await screen.findByText(/1 sətir «Ödənişsiz daxili təminat» kimi qeyd edildi/)).toBeInTheDocument()
  })

  it('shows the server s refusal rather than pretending it worked', async () => {
    pricingApi.setPricingMode.mockRejectedValue(new Error('Bu əməliyyat üçün icazəniz yoxdur.'))
    await renderPage()

    await userEvent.click(screen.getByRole('checkbox', { name: /Ağac dirəyi/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Şirkətdaxili təminat kimi qeyd et' }))
    await userEvent.click(screen.getByRole('button', { name: 'Qeyd et' }))

    expect(await screen.findByText('Bu əməliyyat üçün icazəniz yoxdur.')).toBeInTheDocument()
  })

  /**
   * The mistake this whole screen undoes was classifying a mixed supplier in one go. There is deliberately no
   * control for it, so nobody can make it again in one click.
   */
  it('offers no way to answer for a whole supplier at once', async () => {
    await renderPage()

    expect(screen.queryByRole('button', { name: /təchizatçı/i })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: /hamısı/i })).toBeNull()
  })
})

describe('a manager', () => {
  it('reads the queue', async () => {
    auth.canManageCatalog = false
    await renderPage()

    expect(screen.getByText('Ağac dirəyi yaşıl rəngli faskalı')).toBeInTheDocument()
    const totals = within(screen.getByLabelText('Qiyməti olmayan sətirlərin sayı'))
    expect(totals.getByText('Təsnif edilməyib').closest('div')).toHaveTextContent('94')
  })

  it('is offered nothing to decide with', async () => {
    auth.canManageCatalog = false
    await renderPage()

    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Şirkətdaxili təminat kimi qeyd et' })).toBeNull()
  })

  /** 14.1: read-only, and told so; the header describes the page instead of instructing a reader who may not act. */
  it('is told the page is read-only, and is not given an instruction', async () => {
    auth.canManageCatalog = false
    await renderPage()

    const note = screen.getByText('Yalnız baxış: bu bölmədə dəyişiklik etmək səlahiyyətiniz yoxdur.')
    expect(note).toHaveAttribute('role', 'note')
    expect(screen.getByText('Qiyməti olmayan sətirlər və onların təsnifatı')).toBeInTheDocument()
    expect(screen.queryByText(/qeyd edin/)).toBeNull()
    // "Alış qiyməti tələb olunur" names a filter as well as a decision; only the filter is here.
    const [only] = screen.getAllByRole('button', { name: 'Alış qiyməti tələb olunur' })
    expect(screen.getAllByRole('button', { name: 'Alış qiyməti tələb olunur' })).toHaveLength(1)
    expect(only).toHaveAttribute('aria-pressed')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(findOldTerms(note)).toEqual([])
  })

  it('shows no such note to somebody who may decide', async () => {
    await renderPage()

    expect(screen.queryByText(/Yalnız baxış/)).toBeNull()
    expect(screen.getByText(/alınan, yoxsa şirkətdaxili təmin olunan material olduğunu qeyd edin/)).toBeInTheDocument()
  })
})

/**
 * 14.1: a Rəhbər opens this page from an order's price warning, not from the menu. It is then that order's unpriced
 * lines — every state of them, because the warning counted every state that is a gap — with the way back.
 */
describe('opened from an order', () => {
  function renderAt(url: string) {
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/pricing-modes" element={<PricingModeReviewPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  function scopeLine() {
    return screen.getByLabelText('Sifarişin qiyməti olmayan sətirləri')
  }

  it('asks for that order only, and lists every state of its lines', async () => {
    renderAt('/pricing-modes?order=42&basis=avg3')
    await screen.findAllByText('Ağac dirəyi yaşıl rəngli faskalı')

    expect(pricingApi.fetchPricingModeReview).toHaveBeenCalledWith(
      { mode: undefined, search: undefined, page: 1, pageSize: 50, orderRequestId: 42 },
      expect.anything(),
    )
    expect(screen.getByRole('button', { name: 'Hamısı' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Təsnif edilməyib' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('names the object and the month the lines belong to', async () => {
    renderAt('/pricing-modes?order=42')
    await screen.findAllByText('Ağac dirəyi yaşıl rəngli faskalı')

    expect(within(scopeLine()).getByText('Fəvvarələr meydanı · May 2026 sifarişinin qiyməti olmayan sətirləri'))
      .toBeInTheDocument()
    expect(findOldTerms(scopeLine())).toEqual([])
  })

  it('counts the order’s lines, as the server narrowed them', async () => {
    pricingApi.fetchPricingModeReview.mockResolvedValue(review({ unresolved: 1, missingRequiredPrice: 1, internalFreeSupply: 0 }))
    renderAt('/pricing-modes?order=42')
    await screen.findAllByText('Ağac dirəyi yaşıl rəngli faskalı')

    const totals = within(screen.getByLabelText('Qiyməti olmayan sətirlərin sayı'))
    expect(totals.getByText('Təsnif edilməyib').closest('div')).toHaveTextContent('1')
    expect(totals.getByText('Alış qiyməti tələb olunur').closest('div')).toHaveTextContent('1')
  })

  it('goes back to the order with the basis it was left with (Task 1)', async () => {
    renderAt('/pricing-modes?order=42&basis=custom&from=2026-03&to=2026-05')
    await screen.findAllByText('Ağac dirəyi yaşıl rəngli faskalı')

    expect(within(scopeLine()).getByRole('link', { name: 'Sifarişə qayıt' }))
      .toHaveAttribute('href', '/orders/42?basis=custom&from=2026-03&to=2026-05')
  })

  it('offers the whole queue, which is the page exactly as it is without an order', async () => {
    renderAt('/pricing-modes?order=42&basis=avg3')
    await screen.findAllByText('Ağac dirəyi yaşıl rəngli faskalı')

    const all = within(scopeLine()).getByRole('link', { name: 'Bütün sətirlər' })
    expect(all).toHaveAttribute('href', '/pricing-modes')
    await userEvent.click(all)

    await waitFor(() => expect(pricingApi.fetchPricingModeReview).toHaveBeenLastCalledWith(
      { mode: 'Unresolved', search: undefined, page: 1, pageSize: 50 },
      expect.anything(),
    ))
    expect(screen.queryByLabelText('Sifarişin qiyməti olmayan sətirləri')).toBeNull()
    expect(screen.getByRole('button', { name: 'Təsnif edilməyib' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('says once that an order has no unpriced line, rather than twice', async () => {
    pricingApi.fetchPricingModeReview.mockResolvedValue(review({
      rows: [],
      unresolved: 0,
      missingRequiredPrice: 0,
      internalFreeSupply: 0,
    }))
    renderAt('/pricing-modes?order=42')

    expect(await screen.findByText('Bu sifarişdə qiyməti olmayan sətir yoxdur.')).toBeInTheDocument()
    expect(screen.queryByText('Təsnif edilməmiş sətir qalmayıb.')).toBeNull()
    expect(screen.queryByText('Bu filtrə uyğun sətir tapılmadı.')).toBeNull()
  })

  it('is read-only for a manager here too', async () => {
    auth.canManageCatalog = false
    renderAt('/pricing-modes?order=42')
    await screen.findAllByText('Ağac dirəyi yaşıl rəngli faskalı')

    expect(screen.getByText(/Yalnız baxış/)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Şirkətdaxili təminat kimi qeyd et' })).toBeNull()
  })

  it('reads an address with no usable order as the whole queue', async () => {
    renderAt('/pricing-modes?order=abc')
    await screen.findAllByText('Ağac dirəyi yaşıl rəngli faskalı')

    expect(pricingApi.fetchPricingModeReview).toHaveBeenCalledWith(
      { mode: 'Unresolved', search: undefined, page: 1, pageSize: 50 },
      expect.anything(),
    )
    expect(screen.queryByLabelText('Sifarişin qiyməti olmayan sətirləri')).toBeNull()
  })
})

describe('without an order', () => {
  it('asks for the whole queue exactly as before, opening on the unclassified lines', async () => {
    await renderPage()

    expect(pricingApi.fetchPricingModeReview).toHaveBeenCalledWith(
      { mode: 'Unresolved', search: undefined, page: 1, pageSize: 50 },
      expect.anything(),
    )
    expect(screen.getByRole('button', { name: 'Təsnif edilməyib' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByLabelText('Sifarişin qiyməti olmayan sətirləri')).toBeNull()
  })
})

/**
 * The pager must pace the set on screen.
 *
 * It used to count the whole queue — "Səhifə 1 / 2 · 95 sətir" under a table showing one filtered row — and
 * offered a "Növbəti" that led nowhere.
 */
describe('paging the filtered queue', () => {
  it('counts the filtered set, not the whole queue', async () => {
    pricingApi.fetchPricingModeReview.mockResolvedValue(review({ totalCount: 1, unresolved: 94 }))
    await renderPage()

    expect(screen.queryByText(/95 sətir/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Növbəti' })).toBeNull()
  })

  it('offers another page only when the filtered set has one', async () => {
    pricingApi.fetchPricingModeReview.mockResolvedValue(review({
      rows: Array.from({ length: 50 }, (_, index) => row({ orderRequestItemId: 1000 + index })),
      totalCount: 94,
    }))
    await renderPage()

    expect(screen.getByText(/94 sətir/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Növbəti' })).toBeEnabled()
  })

  it('goes back to the first page when the filter changes', async () => {
    pricingApi.fetchPricingModeReview.mockResolvedValue(review({
      rows: Array.from({ length: 50 }, (_, index) => row({ orderRequestItemId: 1000 + index })),
      totalCount: 94,
    }))
    await renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Növbəti' }))
    await waitFor(() => expect(pricingApi.fetchPricingModeReview).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything(),
    ))

    await userEvent.click(screen.getByRole('button', { name: 'Ödənişsiz daxili təminat' }))

    await waitFor(() => expect(pricingApi.fetchPricingModeReview).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, mode: 'InternalFreeSupply' }),
      expect.anything(),
    ))
  })

  it('goes back to the first page when the search changes', async () => {
    pricingApi.fetchPricingModeReview.mockResolvedValue(review({
      rows: Array.from({ length: 50 }, (_, index) => row({ orderRequestItemId: 1000 + index })),
      totalCount: 94,
    }))
    await renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Növbəti' }))
    await waitFor(() => expect(pricingApi.fetchPricingModeReview).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything(),
    ))

    await userEvent.type(screen.getByLabelText('Məhsul, kod və ya obyekt üzrə axtar'), 'dirək{Enter}')

    await waitFor(() => expect(pricingApi.fetchPricingModeReview).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, search: 'dirək' }),
      expect.anything(),
    ))
  })
})
