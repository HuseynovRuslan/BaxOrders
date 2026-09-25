import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BaxOrdersRole, CurrentUser } from '../api/auth'
import { ApiError } from '../api/client'
import type {
  ProductMatchDecision,
  ProductMatchKind,
  ProductMatchSide,
  ProductMatchSuggestion,
  ProductMatchSuggestionList,
} from '../api/productMatches'
import { AuthProvider } from '../auth/AuthProvider'
import { findOldTerms } from '../test/oldTerms'
import { ProductsPage } from './ProductsPage'

/**
 * The Products page (Task 13b): what the rules suggest, of both kinds, and what an administrator may do about it —
 * nothing happens until a button is pressed, and only somebody holding `canDecideProductMatches` sees one.
 */
const authApi = vi.hoisted(() => ({
  primeCsrf: vi.fn(),
  fetchCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  changeOwnPassword: vi.fn(),
}))

const matchApi = vi.hoisted(() => ({
  fetchProductMatchSuggestions: vi.fn(),
  fetchProductMatchDecisions: vi.fn(),
  fetchProductMatchFamilies: vi.fn(),
  approveProductMatch: vi.fn(),
  rejectProductMatch: vi.fn(),
  undoProductMatch: vi.fn(),
}))

vi.mock('../api/auth', async () => {
  const actual = await vi.importActual<typeof import('../api/auth')>('../api/auth')
  return { ...actual, ...authApi }
})

vi.mock('../api/productMatches', async () => {
  const actual = await vi.importActual<typeof import('../api/productMatches')>('../api/productMatches')
  return { ...actual, ...matchApi }
})

function person(role: BaxOrdersRole): CurrentUser {
  return {
    isAuthenticated: true,
    userId: '4f1f0a2e-0000-4000-8000-00000000000a',
    userName: role.toLowerCase(),
    displayName: `Test ${role}`,
    role,
    canManageImports: role !== 'Manager',
    canSubmitOrders: role !== 'Manager',
    canDecideOrders: role === 'Manager',
    canManageUsers: role === 'Admin',
    canManageCatalog: role !== 'Manager',
    canViewApprovals: role !== 'Coordinator',
    canDecideProductMatches: role === 'Admin',
  }
}

function side(overrides: Partial<ProductMatchSide>): ProductMatchSide {
  return {
    productId: 1,
    productCode: 'PRD-000001',
    productName: '',
    variantId: null,
    specificationValue: null,
    specificationUnitCode: null,
    specificationDescriptor: null,
    modelCode: null,
    orderUnitCode: null,
    lineCount: 1,
    locationCount: 1,
    firstMonth: '2026-08-01',
    lastMonth: '2026-08-01',
    ...overrides,
  }
}

const lampa: ProductMatchSuggestion = {
  kind: 'SameItem',
  source: side({ productId: 11, productName: 'Lampa 15 W', variantId: 21, orderUnitCode: 'PCS', lineCount: 2, firstMonth: '2026-05-01', lastMonth: '2026-06-01' }),
  target: side({ productId: 12, productName: 'Lampa 15W', variantId: 22, orderUnitCode: 'PCS', lineCount: 3, firstMonth: '2026-04-01', lastMonth: '2026-06-01' }),
  difference: 'Whitespace',
  proposedLabel: null,
}

const sabun: ProductMatchSuggestion = {
  kind: 'Variant',
  source: side({ productId: 2, productName: 'Sabun elano lavanda ətirli', firstMonth: '2026-09-01', lastMonth: '2026-09-01' }),
  target: side({ productId: 1, productName: 'Sabun elano' }),
  difference: null,
  proposedLabel: 'lavanda ətirli',
}

function suggestions(kind: ProductMatchKind): ProductMatchSuggestionList {
  const items = kind === 'SameItem' ? [lampa] : [sabun]
  return {
    kind,
    sameItemCount: 1,
    variantCount: 4,
    filteredCount: items.length,
    suggestions: { items, page: 1, pageSize: 50, totalCount: items.length },
  }
}

function decision(overrides: Partial<ProductMatchDecision> = {}): ProductMatchDecision {
  return {
    id: 501,
    kind: 'SameItem',
    outcome: 'Rejected',
    sourceProductId: 11,
    sourceProductName: 'Lampa 15 W',
    targetProductId: 12,
    targetProductName: 'Lampa 15W',
    sourceVariantId: 21,
    sourceVariantDescription: 'PCS',
    targetVariantId: 22,
    targetVariantDescription: 'PCS',
    variantLabel: null,
    reason: null,
    decidedByUserId: '4f1f0a2e-0000-4000-8000-00000000000a',
    decidedByDisplayName: 'Test Admin',
    decidedAtUtc: '2026-09-25T08:00:00Z',
    undoneByUserId: null,
    undoneByDisplayName: null,
    undoneAtUtc: null,
    undoReason: null,
    isLive: true,
    ...overrides,
  }
}

beforeEach(() => {
  authApi.primeCsrf.mockReset().mockResolvedValue(undefined)
  authApi.fetchCurrentUser.mockReset().mockResolvedValue(person('Admin'))
  matchApi.fetchProductMatchSuggestions.mockReset().mockImplementation((query: { kind: ProductMatchKind }) =>
    Promise.resolve(suggestions(query.kind)))
  matchApi.fetchProductMatchDecisions.mockReset().mockResolvedValue({
    items: [decision({ outcome: 'Approved', kind: 'Variant', sourceProductName: 'Sabun elano lavanda ətirli', targetProductName: 'Sabun elano', variantLabel: 'lavanda ətirli', sourceVariantDescription: null, targetVariantDescription: null })],
    page: 1,
    pageSize: 50,
    totalCount: 1,
  })
  matchApi.fetchProductMatchFamilies.mockReset().mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0 })
  matchApi.approveProductMatch.mockReset().mockResolvedValue(decision({ outcome: 'Approved' }))
  matchApi.rejectProductMatch.mockReset().mockResolvedValue(decision())
  matchApi.undoProductMatch.mockReset().mockResolvedValue(decision({ isLive: false }))
})

afterEach(() => vi.clearAllMocks())

async function renderPage(initialPath = '/products') {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <ProductsPage />
      </AuthProvider>
    </MemoryRouter>,
  )

  await screen.findByRole('tab', { name: 'Təkliflər' })
}

describe('the suggestions', () => {
  it('shows both kinds with their totals, and the spelling pair with what it differs by', async () => {
    await renderPage()

    expect(await screen.findByRole('button', { name: 'Yazılış fərqi (1)' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Variant fərqi (4)' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText(/Təsdiqlənsə, hesabatlarda bir mal sayılır; sifarişlər və məbləğlər dəyişmir\./)).toBeInTheDocument()

    expect(screen.getByText('Lampa 15 W')).toBeInTheDocument()
    expect(screen.getByText('Lampa 15W')).toBeInTheDocument()
    expect(screen.getByText('Boşluq fərqi')).toBeInTheDocument()
    expect(screen.getByText('2 sətir · 1 obyekt · May–İyun 2026')).toBeInTheDocument()
    expect(screen.getAllByText('ədəd')).toHaveLength(2)
  })

  it('shows the Sabun pair under "Variant fərqi" with its label', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: /Variant fərqi/ }))

    await waitFor(() => expect(matchApi.fetchProductMatchSuggestions).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'Variant', page: 1 }),
      expect.anything(),
    ))
    expect(await screen.findByText('Sabun elano lavanda ətirli')).toBeInTheDocument()
    expect(screen.getByText('lavanda ətirli')).toBeInTheDocument()
    expect(screen.getByText(/iki məhsul birləşmir/)).toBeInTheDocument()
  })

  it('opens on the kind the address names, so going back returns to the same view', async () => {
    await renderPage('/products?kind=Variant&search=sabun')

    await waitFor(() => expect(matchApi.fetchProductMatchSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'Variant', search: 'sabun' }),
      expect.anything(),
    ))
    expect(await screen.findByText('Sabun elano lavanda ətirli')).toBeInTheDocument()
  })

  it('does nothing by itself: reading sends no decision', async () => {
    await renderPage()
    await screen.findByText('Lampa 15W')

    expect(matchApi.approveProductMatch).not.toHaveBeenCalled()
    expect(matchApi.rejectProductMatch).not.toHaveBeenCalled()
    expect(matchApi.undoProductMatch).not.toHaveBeenCalled()
  })

  it('shows no placeholder and none of the old words, on any tab', async () => {
    const user = userEvent.setup()
    await renderPage()
    await screen.findByText('Lampa 15W')

    expect(screen.queryByText(/Bu bölmə hələ hazırlanır/)).toBeNull()
    expect(screen.queryByText('Məhsul kataloqu')).toBeNull()
    expect(screen.queryByText(/Excel yazılışları üçün alternativ adlar/)).toBeNull()
    expect(findOldTerms(document.body)).toEqual([])

    await user.click(screen.getByRole('button', { name: /Variant fərqi/ }))
    await screen.findByText('Sabun elano lavanda ətirli')
    expect(findOldTerms(document.body)).toEqual([])

    await user.click(screen.getByRole('tab', { name: 'Qərarlar' }))
    await screen.findByText(/Sabun elano lavanda ətirli/)
    expect(findOldTerms(document.body)).toEqual([])
  })
})

describe('an administrator', () => {
  it('approves a spelling pair keeping the other spelling, which swaps the two ids', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: 'Təsdiqlə' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Hansı yazılış saxlanılsın?')).toBeInTheDocument()
    // The suggestion's own choice is preselected ...
    expect(within(dialog).getByRole('radio', { name: /^Lampa 15W/ })).toBeChecked()

    // ... and the administrator keeps "Lampa 15 W" instead.
    await user.click(within(dialog).getByRole('radio', { name: /^Lampa 15 W/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Təsdiqlə' }))

    await waitFor(() => expect(matchApi.approveProductMatch).toHaveBeenCalledWith({ kind: 'SameItem', sourceId: 22, targetId: 21 }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(matchApi.fetchProductMatchSuggestions).toHaveBeenCalledTimes(2))
  })

  it('approves a variant link under the label it edited, with a reason', async () => {
    const user = userEvent.setup()
    await renderPage('/products?kind=Variant')

    await user.click(await screen.findByRole('button', { name: 'Təsdiqlə' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/iki məhsul birləşmir/)).toBeInTheDocument()

    const label = within(dialog).getByRole('textbox', { name: 'Variantın adı' })
    expect(label).toHaveValue('lavanda ətirli')
    await user.clear(label)
    await user.type(label, '  lavanda ')
    await user.type(within(dialog).getByRole('textbox', { name: /Səbəb/ }), 'ətir fərqi')
    await user.click(within(dialog).getByRole('button', { name: 'Təsdiqlə' }))

    await waitFor(() => expect(matchApi.approveProductMatch).toHaveBeenCalledWith({
      kind: 'Variant', sourceId: 2, targetId: 1, variantLabel: 'lavanda', reason: 'ətir fərqi',
    }))
  })

  it('is refused an empty label in the browser, and nothing is sent', async () => {
    const user = userEvent.setup()
    await renderPage('/products?kind=Variant')

    await user.click(await screen.findByRole('button', { name: 'Təsdiqlə' }))
    const dialog = await screen.findByRole('dialog')
    await user.clear(within(dialog).getByRole('textbox', { name: 'Variantın adı' }))
    await user.type(within(dialog).getByRole('textbox', { name: 'Variantın adı' }), '   ')
    await user.click(within(dialog).getByRole('button', { name: 'Təsdiqlə' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Variantın adı 1–100 simvol olmalıdır.')
    expect(matchApi.approveProductMatch).not.toHaveBeenCalled()
  })

  it('rejects at once, and is offered "Geri al" straight away', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: 'Rədd et' }))

    await waitFor(() => expect(matchApi.rejectProductMatch).toHaveBeenCalledWith({ kind: 'SameItem', sourceId: 21, targetId: 22 }))
    expect(screen.queryByRole('dialog')).toBeNull()
    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('«Lampa 15 W» / «Lampa 15W» rədd edildi.')
    await waitFor(() => expect(matchApi.fetchProductMatchSuggestions).toHaveBeenCalledTimes(2))

    await user.click(within(notice).getByRole('button', { name: 'Geri al' }))

    await waitFor(() => expect(matchApi.undoProductMatch).toHaveBeenCalledWith(501))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    await waitFor(() => expect(matchApi.fetchProductMatchSuggestions).toHaveBeenCalledTimes(3))
  })

  it("sees the server's refusal in the dialog, and the list is read again", async () => {
    const user = userEvent.setup()
    matchApi.approveProductMatch.mockRejectedValue(new ApiError(422, 'This pair is not a current suggestion.'))
    await renderPage()

    await user.click(await screen.findByRole('button', { name: 'Təsdiqlə' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Təsdiqlə' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('This pair is not a current suggestion.')
    await waitFor(() => expect(matchApi.fetchProductMatchSuggestions).toHaveBeenCalledTimes(2))
    expect(matchApi.approveProductMatch).toHaveBeenCalledTimes(1)
  })

  it('takes a live decision back from "Qərarlar"', async () => {
    const user = userEvent.setup()
    await renderPage('/products?tab=decisions')

    await user.click(await screen.findByRole('button', { name: 'Geri al' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Geri al' }))

    await waitFor(() => expect(matchApi.undoProductMatch).toHaveBeenCalledWith(501, undefined))
  })
})

describe('everybody else', () => {
  it.each(['Manager', 'Coordinator'] as const)('as %s reads every tab and is offered no button to decide', async (role) => {
    const user = userEvent.setup()
    authApi.fetchCurrentUser.mockResolvedValue(person(role))
    matchApi.fetchProductMatchFamilies.mockResolvedValue({
      items: [{
        productId: 1,
        productName: 'Sabun elano',
        usage: { lineCount: 1, locationCount: 1, firstMonth: '2026-08-01', lastMonth: '2026-08-01' },
        variants: [{
          decisionId: 501,
          productId: 2,
          productName: 'Sabun elano lavanda ətirli',
          variantLabel: 'lavanda ətirli',
          decidedByDisplayName: 'Test Admin',
          decidedAtUtc: '2026-09-25T08:00:00Z',
          usage: null,
        }],
      }],
      page: 1,
      pageSize: 50,
      totalCount: 1,
    })
    await renderPage()

    await screen.findByText('Lampa 15W')
    expect(screen.getByText('Təklifləri yalnız administrator təsdiqləyir və ya rədd edir.')).toBeInTheDocument()
    expectNoDecisionButtons()

    await user.click(screen.getByRole('button', { name: /Variant fərqi/ }))
    await screen.findByText('Sabun elano lavanda ətirli')
    expectNoDecisionButtons()

    await user.click(screen.getByRole('tab', { name: 'Məhsullar və variantlar' }))
    await screen.findByText('Sabun elano')
    expectNoDecisionButtons()

    await user.click(screen.getByRole('tab', { name: 'Qərarlar' }))
    await screen.findByText(/Sabun elano lavanda ətirli/)
    expectNoDecisionButtons()
  })
})

function expectNoDecisionButtons() {
  expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Rədd et' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Geri al' })).toBeNull()
}
