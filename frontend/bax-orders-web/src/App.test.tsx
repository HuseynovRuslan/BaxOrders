import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BaxOrdersRole, CurrentUser } from './api/auth'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'

/**
 * What only the whole application can show: a link nobody should be using any more still goes somewhere real,
 * rather than to a page that only explained where to go; and a page a role is not offered does not open when its
 * address is typed either (brief 14).
 */
const authApi = vi.hoisted(() => ({
  primeCsrf: vi.fn(),
  fetchCurrentUser: vi.fn(),
}))

vi.mock('./api/auth', async () => {
  const actual = await vi.importActual<typeof import('./api/auth')>('./api/auth')
  return { ...actual, ...authApi }
})

/**
 * The guarded pages stand in for themselves: what is checked is whether the route renders one at all. A page that
 * is never rendered makes no request, so "not rendered" is the proof that nothing of it was read.
 */
const rendered = vi.hoisted(() => new Set<string>())

vi.mock('./pages/ImportsPage', () => ({
  ImportsPage: () => {
    rendered.add('imports')
    return <h1>Excel importları səhifəsi</h1>
  },
}))
vi.mock('./pages/AdminUsersPage', () => ({
  AdminUsersPage: () => {
    rendered.add('users')
    return <h1>İstifadəçilər səhifəsi</h1>
  },
}))
vi.mock('./pages/ProductsPage', () => ({
  ProductsPage: () => {
    rendered.add('products')
    return <h1>Məhsullar səhifəsi</h1>
  },
}))
vi.mock('./pages/ProductCategoriesPage', () => ({
  ProductCategoriesPage: () => {
    rendered.add('categories')
    return <h1>Kateqoriyalar səhifəsi</h1>
  },
}))
vi.mock('./pages/SuppliersPage', () => ({
  SuppliersPage: () => {
    rendered.add('suppliers')
    return <h1>Təchizatçılar səhifəsi</h1>
  },
}))
vi.mock('./pages/PricingModeReviewPage', () => ({
  PricingModeReviewPage: () => {
    rendered.add('pricing')
    return <h1>Qiymət təsnifatı səhifəsi</h1>
  },
}))

/** A signed-in person with the flags the server gives each role (`AuthController`). */
function person(role: BaxOrdersRole, overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    isAuthenticated: true,
    userId: '4f1f0a2e-0000-4000-8000-00000000000b',
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
    ...overrides,
  }
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

const currentUser: CurrentUser = {
  isAuthenticated: true,
  userId: '4f1f0a2e-0000-4000-8000-00000000000a',
  userName: 'coordinator',
  displayName: 'Test Koordinator',
  role: 'Coordinator',
  canManageImports: true,
  canSubmitOrders: true,
  canDecideOrders: false,
  canManageUsers: false,
  canManageCatalog: true,
  canViewApprovals: false,
  canDecideProductMatches: false,
}

beforeEach(() => {
  rendered.clear()
  authApi.primeCsrf.mockReset().mockResolvedValue(undefined)
  authApi.fetchCurrentUser.mockReset().mockResolvedValue(currentUser)
})

afterEach(() => vi.clearAllMocks())

describe('the retired orders page', () => {
  it('sends /orders straight to the objects it is browsed from, rather than a placeholder', async () => {
    render(
      <MemoryRouter initialEntries={['/orders']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Obyektlər' })).toBeInTheDocument()
    expect(screen.queryByText('Sifariş obyektdən açılır')).toBeNull()
  })
})

/** Owner decision 11.1: the object comparison page is gone. A saved link to it still lands somewhere sensible. */
describe('the retired comparison page', () => {
  function Where() {
    const location = useLocation()
    return <span data-testid="where">{`${location.pathname}${location.search}`}</span>
  }

  async function landingOf(url: string): Promise<string> {
    render(
      <MemoryRouter initialEntries={[url]}>
        <AuthProvider>
          <App />
          <Where />
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByTestId('where')).not.toHaveTextContent('/analytics'))
    return screen.getByTestId('where').textContent ?? ''
  }

  it('lands on the object page, keeping the basis and nothing else', async () => {
    expect(await landingOf('/locations/43/analytics?period=2026-07&basis=avg3&kind=AmountOrientedService&page=2'))
      .toBe('/locations/43?basis=avg3')
  })

  it('keeps a hand-picked range with its months', async () => {
    expect(await landingOf('/locations/43/analytics?period=2026-07&basis=custom&from=2026-03&to=2026-05'))
      .toBe('/locations/43?basis=custom&from=2026-03&to=2026-05')
  })

  it('reads a link with no basis as last month, as every screen does', async () => {
    expect(await landingOf('/locations/43/analytics?period=2026-07')).toBe('/locations/43?basis=last')
  })
})

/** Brief 14: "Excel importlarının və İstifadəçilərin linkini əllə yazsam da açılmır." */
describe('a page a Rəhbər is not offered, typed into the address bar', () => {
  it.each([
    ['/imports', 'imports', 'Excel importları səhifəsi'],
    ['/admin/users', 'users', 'İstifadəçilər səhifəsi'],
    ['/products', 'products', 'Məhsullar səhifəsi'],
    ['/products/categories', 'categories', 'Kateqoriyalar səhifəsi'],
  ])('%s is refused, and the page is never rendered', async (url, page, heading) => {
    authApi.fetchCurrentUser.mockResolvedValue(person('Manager'))
    renderAt(url)

    expect(await screen.findByRole('alert')).toHaveTextContent('Bu səhifəyə icazəniz yoxdur.')
    expect(screen.queryByRole('heading', { name: heading })).toBeNull()
    expect(rendered.has(page)).toBe(false)
  })

  /** 14.1: both open for a Rəhbər, read-only; the pages themselves say so (their own tests). */
  it.each([
    ['/suppliers', 'Təchizatçılar səhifəsi'],
    ['/pricing-modes', 'Qiymət təsnifatı səhifəsi'],
  ])('%s opens for a Rəhbər', async (url, heading) => {
    authApi.fetchCurrentUser.mockResolvedValue(person('Manager'))
    renderAt(url)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.queryByText('Bu səhifəyə icazəniz yoxdur.')).toBeNull()
  })
})

describe('the catalogue pages, for the people who shape the catalogue', () => {
  it.each(['Coordinator', 'Admin'] as const)('open for a %s as before', async (role) => {
    authApi.fetchCurrentUser.mockResolvedValue(person(role))
    const { unmount } = renderAt('/products')
    expect(await screen.findByRole('heading', { name: 'Məhsullar səhifəsi' })).toBeInTheDocument()
    unmount()

    renderAt('/products/categories')
    expect(await screen.findByRole('heading', { name: 'Kateqoriyalar səhifəsi' })).toBeInTheDocument()
  })
})

/**
 * Brief 14: "Başlıqda 'Administrator' yazılmır." The audit saw it because it signed in as an administrator; a
 * Rəhbər account is named for what it is, and the word appears nowhere in the layout around the page.
 */
describe('the header for a Rəhbər', () => {
  it('names the person and "Rəhbər", and says "Administrator" nowhere', async () => {
    authApi.fetchCurrentUser.mockResolvedValue(person('Manager', { displayName: 'Test Rəhbər' }))
    renderAt('/suppliers')

    await screen.findByRole('heading', { name: 'Təchizatçılar səhifəsi' })
    const header = within(screen.getByRole('banner'))
    expect(header.getByText('Test Rəhbər')).toBeInTheDocument()
    // The role on a line of its own, exactly as the label says it.
    expect(header.getByText('Rəhbər')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Administrator')
  })
})
