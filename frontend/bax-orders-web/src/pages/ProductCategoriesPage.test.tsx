import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BaxOrdersRole, CurrentUser } from '../api/auth'
import type { ProductCategoryList } from '../api/productCategories'
import { AuthProvider } from '../auth/AuthProvider'
import { ProductCategoriesPage } from './ProductCategoriesPage'

/**
 * The catalogue's category screen: what it shows, who it offers the bulk action to, and what it sends when
 * that action is taken — which is nothing at all, because the server decides what qualifies.
 */
const authApi = vi.hoisted(() => ({
  primeCsrf: vi.fn(),
  fetchCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  changeOwnPassword: vi.fn(),
}))

const catalogApi = vi.hoisted(() => ({
  fetchProductCategories: vi.fn(),
  applySafeProductCategories: vi.fn(),
  assignProductCategory: vi.fn(),
}))

vi.mock('../api/auth', async () => {
  const actual = await vi.importActual<typeof import('../api/auth')>('../api/auth')
  return { ...actual, ...authApi }
})

vi.mock('../api/productCategories', async () => {
  const actual = await vi.importActual<typeof import('../api/productCategories')>('../api/productCategories')
  return { ...actual, ...catalogApi }
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
    // Only the Rəhbər holds approval authority (4.3); an administrator sees the queue without it.
    canDecideOrders: role === 'Manager',
    canManageUsers: role === 'Admin',
    canManageCatalog: role !== 'Manager',
    canViewApprovals: role !== 'Coordinator',
    canDecideProductMatches: role === 'Admin',
  }
}

function list(overrides: Partial<ProductCategoryList> = {}): ProductCategoryList {
  return {
    summary: {
      totalProductCount: 1112,
      assignedCount: 0,
      uniqueEvidenceCount: 1105,
      ambiguousCount: 7,
      noEvidenceCount: 0,
    },
    filteredCount: 1112,
    rows: {
      items: [{
        productId: 105,
        productCode: 'PRD-000105',
        productName: 'Pambıq',
        currentCategoryId: null,
        currentCategoryPath: [],
        state: 'UniqueEvidence',
        evidence: [{ categoryId: 7, path: ['Təmizlik', 'Təmizlik ləvazimatı', 'Təmizlik bezi'], occurrences: 18 }],
      }],
      page: 1,
      pageSize: 25,
      totalCount: 1112,
    },
    ...overrides,
  }
}

beforeEach(() => {
  authApi.primeCsrf.mockReset().mockResolvedValue(undefined)
  authApi.fetchCurrentUser.mockReset().mockResolvedValue(person('Coordinator'))
  catalogApi.fetchProductCategories.mockReset().mockResolvedValue(list())
  catalogApi.applySafeProductCategories.mockReset()
  catalogApi.assignProductCategory.mockReset()
})

afterEach(() => vi.clearAllMocks())

async function renderPage(initialPath = '/products/categories') {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <ProductCategoriesPage />
      </AuthProvider>
    </MemoryRouter>,
  )

  await screen.findByText('Kanonik kateqoriyası olan')
}

/**
 * A summary metric's label and its big number are siblings, whatever wraps them. Scoped to the summary group,
 * since a filter chip below repeats some of the same labels.
 */
function metricValue(label: string): string | null {
  const summary = screen.getByRole('group', { name: 'Kataloqun xülasəsi' })
  return within(summary).getByText(label).nextElementSibling?.textContent ?? null
}

describe('the summary', () => {
  it('counts the whole catalogue in the four states the server keeps apart', async () => {
    await renderPage()

    expect(metricValue('Kanonik kateqoriyası olan')).toBe('0')
    expect(metricValue('Təhlükəsiz uyğunlaşdırma')).toBe('1.105')
    expect(metricValue('Ziddiyyətli')).toBe('7')
    expect(metricValue('Məlumatsız')).toBe('0')
  })
})

describe('the filters', () => {
  it('asks the server for one state and marks that choice as active', async () => {
    const user = userEvent.setup()
    await renderPage()

    await waitFor(() => expect(catalogApi.fetchProductCategories).toHaveBeenCalled())
    catalogApi.fetchProductCategories.mockClear()

    await user.click(screen.getByRole('button', { name: /Ziddiyyətli/ }))

    await waitFor(() => expect(catalogApi.fetchProductCategories).toHaveBeenCalledWith(
      expect.objectContaining({ filter: 'Ambiguous' }),
      expect.anything(),
    ))
    expect(screen.getByRole('button', { name: /Ziddiyyətli/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('reproduces a shared link, so a refresh shows the same view', async () => {
    await renderPage('/products/categories?filter=Ambiguous&search=Pambıq')

    await waitFor(() => expect(catalogApi.fetchProductCategories).toHaveBeenCalledWith(
      expect.objectContaining({ filter: 'Ambiguous', search: 'Pambıq' }),
      expect.anything(),
    ))
  })
})

describe('the bulk action', () => {
  it('shows what it will and will not touch before it writes anything', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Təhlükəsiz uyğunluqları tətbiq et' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('məhsula kateqoriya təyin ediləcək')).toBeInTheDocument()
    expect(within(dialog).getByText('1.105')).toBeInTheDocument()
    expect(within(dialog).getByText('ziddiyyətli məhsula toxunulmayacaq')).toBeInTheDocument()
    expect(within(dialog).getByText('7')).toBeInTheDocument()
    expect(catalogApi.applySafeProductCategories).not.toHaveBeenCalled()
  })

  it('sends nothing but the request itself, and reads the queue again afterwards', async () => {
    const user = userEvent.setup()
    catalogApi.applySafeProductCategories.mockResolvedValue({
      assignedCount: 1105,
      skippedAmbiguousCount: 7,
      skippedNoEvidenceCount: 0,
      skippedAlreadyAssignedCount: 0,
    })
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Təhlükəsiz uyğunluqları tətbiq et' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Tətbiq et' }))

    // No product list and no count go with it: the server works out what qualifies.
    await waitFor(() => expect(catalogApi.applySafeProductCategories).toHaveBeenCalledWith())
    expect(await screen.findByRole('status')).toHaveTextContent('1.105 məhsula kateqoriya təyin edildi')
    await waitFor(() => expect(catalogApi.fetchProductCategories).toHaveBeenCalledTimes(2))
  })
})

describe('what a manager is offered', () => {
  it('may read the catalogue but is offered no way to change it', async () => {
    authApi.fetchCurrentUser.mockResolvedValue(person('Manager'))
    await renderPage()

    expect(screen.queryByRole('button', { name: 'Təhlükəsiz uyğunluqları tətbiq et' })).toBeNull()
    expect(screen.getAllByText('Yalnız oxumaq').length).toBeGreaterThan(0)
    // The evidence itself is not hidden from them.
    expect(screen.getAllByText('Təmizlik › Təmizlik ləvazimatı › Təmizlik bezi').length).toBeGreaterThan(0)
  })
})
