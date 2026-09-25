import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BaxOrdersRole, CurrentUser } from '../api/auth'
import { ApiError } from '../api/client'
import { CurrentUserMenu } from '../layout/CurrentUserMenu'
import { Sidebar } from '../layout/Sidebar'
import { LoginPage } from '../pages/LoginPage'
import { AuthProvider } from './AuthProvider'
import { RequireAuth, RequirePermission } from './RequireAuth'

/**
 * Signing in, and what the application does with the answer. None of this is the protection — every endpoint
 * decides for itself — but a screen that showed the wrong person's work, or kept showing it after the session
 * ended, would be its own kind of wrong.
 */
const authApi = vi.hoisted(() => ({
  primeCsrf: vi.fn(),
  fetchCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  changeOwnPassword: vi.fn(),
}))

vi.mock('../api/auth', async () => {
  const actual = await vi.importActual<typeof import('../api/auth')>('../api/auth')
  return { ...actual, ...authApi }
})

function person(role: BaxOrdersRole, overrides: Partial<CurrentUser> = {}): CurrentUser {
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
    // Only an administrator decides product matches and alternative product names (13.2).
    canDecideProductMatches: role === 'Admin',
    ...overrides,
  }
}

const anonymous: CurrentUser = {
  isAuthenticated: false,
  userId: null,
  userName: null,
  displayName: null,
  role: null,
  canManageImports: false,
  canSubmitOrders: false,
  canDecideOrders: false,
  canManageUsers: false,
  canManageCatalog: false,
  canViewApprovals: false,
  canDecideProductMatches: false,
}

beforeEach(() => {
  authApi.primeCsrf.mockReset().mockResolvedValue(undefined)
  authApi.fetchCurrentUser.mockReset().mockResolvedValue(anonymous)
  authApi.login.mockReset()
  authApi.logout.mockReset().mockResolvedValue(undefined)
  authApi.changeOwnPassword.mockReset().mockResolvedValue(undefined)
})

afterEach(() => vi.clearAllMocks())

/** The screens under test, behind the same guards the real application puts them behind. */
function renderApp(initialPath = '/orders') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route
              path="/orders"
              element={
                <div>
                  <CurrentUserMenu />
                  <h1>Sifarişlər</h1>
                </div>
              }
            />
            <Route element={<RequirePermission permission="canManageUsers" />}>
              <Route path="/admin/users" element={<h1>İstifadəçilər</h1>} />
            </Route>
            <Route element={<RequirePermission permission="canViewApprovals" />}>
              <Route path="/approvals" element={<h1>Təsdiq gözləyənlər</h1>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('signing in', () => {
  it('asks for a name and a password, and will not send an empty one', async () => {
    const user = userEvent.setup()
    renderApp('/login')

    const submit = await screen.findByRole('button', { name: 'Daxil ol' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('İstifadəçi adı'), 'test.koordinator')
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('Şifrə'), 'nümunə-şifrə-10')
    expect(submit).toBeEnabled()

    authApi.login.mockResolvedValue(person('Coordinator'))
    await user.click(submit)

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith('test.koordinator', 'nümunə-şifrə-10'),
    )
  })

  it('says the same thing whether the name or the password was wrong', async () => {
    const user = userEvent.setup()
    authApi.login.mockRejectedValue(new ApiError(401, 'Unauthorized'))
    renderApp('/login')

    await user.type(await screen.findByLabelText('İstifadəçi adı'), 'yoxdur')
    await user.type(screen.getByLabelText('Şifrə'), 'səhv-şifrə')
    await user.click(screen.getByRole('button', { name: 'Daxil ol' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('İstifadəçi adı və ya şifrə yanlışdır.')
    // Nothing about which of the two it was, and no name echoed back.
    expect(screen.getByRole('alert')).not.toHaveTextContent('yoxdur')
  })
})

describe('the guard in front of the operational screens', () => {
  it('renders the screen for somebody the server recognises', async () => {
    authApi.fetchCurrentUser.mockResolvedValue(person('Coordinator'))
    renderApp('/orders')

    expect(await screen.findByRole('heading', { name: 'Sifarişlər' })).toBeInTheDocument()
  })

  it('sends an anonymous visitor to sign in instead', async () => {
    renderApp('/orders')

    expect(await screen.findByRole('heading', { name: 'Sistemə daxil olun' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sifarişlər' })).toBeNull()
  })

  it('shows nothing private while the server is still being asked', () => {
    // A promise that never settles: the first paint must not guess an answer.
    authApi.fetchCurrentUser.mockReturnValue(new Promise(() => {}))
    renderApp('/orders')

    expect(screen.queryByRole('heading', { name: 'Sifarişlər' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Sistemə daxil olun' })).toBeNull()
  })

  it('refuses a screen the role may not open, without pretending it does not exist', async () => {
    authApi.fetchCurrentUser.mockResolvedValue(person('Coordinator'))
    renderApp('/admin/users')

    expect(await screen.findByRole('alert')).toHaveTextContent('Bu səhifəyə icazəniz yoxdur.')
    expect(screen.queryByRole('heading', { name: 'İstifadəçilər' })).toBeNull()
  })

  it('opens that same screen for an administrator', async () => {
    authApi.fetchCurrentUser.mockResolvedValue(person('Admin'))
    renderApp('/admin/users')

    expect(await screen.findByRole('heading', { name: 'İstifadəçilər' })).toBeInTheDocument()
  })

  it('keeps the approval inbox from a coordinator, who has nothing of anyone else’s to decide', async () => {
    authApi.fetchCurrentUser.mockResolvedValue(person('Coordinator'))
    renderApp('/approvals')

    expect(await screen.findByRole('alert')).toHaveTextContent('Bu səhifəyə icazəniz yoxdur.')
    expect(screen.queryByRole('heading', { name: 'Təsdiq gözləyənlər' })).toBeNull()
  })

  it('opens the approval inbox for a manager', async () => {
    authApi.fetchCurrentUser.mockResolvedValue(person('Manager'))
    renderApp('/approvals')

    expect(await screen.findByRole('heading', { name: 'Təsdiq gözləyənlər' })).toBeInTheDocument()
  })

  it('opens the approval inbox for an administrator too', async () => {
    authApi.fetchCurrentUser.mockResolvedValue(person('Admin'))
    renderApp('/approvals')

    expect(await screen.findByRole('heading', { name: 'Təsdiq gözləyənlər' })).toBeInTheDocument()
  })

  it('opens it on seeing the queue, not on deciding: an administrator without approval authority still gets it', async () => {
    authApi.fetchCurrentUser.mockResolvedValue(person('Admin', { canDecideOrders: false, canViewApprovals: true }))
    renderApp('/approvals')

    expect(await screen.findByRole('heading', { name: 'Təsdiq gözləyənlər' })).toBeInTheDocument()
  })
})

describe('who is signed in', () => {
  it('is named in the chrome, with the role in Azerbaijani', async () => {
    authApi.fetchCurrentUser.mockResolvedValue(person('Manager', { displayName: 'Test Rəhbər' }))
    renderApp('/orders')

    expect(await screen.findByText('Test Rəhbər')).toBeInTheDocument()
    expect(screen.getByText('Rəhbər')).toBeInTheDocument()
    // The internal role name and the user id are not chrome.
    expect(screen.queryByText('Manager')).toBeNull()
    expect(screen.queryByText(/4f1f0a2e/)).toBeNull()
  })

  it('signs out, and the screen stops being available', async () => {
    const user = userEvent.setup()
    authApi.fetchCurrentUser.mockResolvedValue(person('Coordinator'))
    renderApp('/orders')

    await screen.findByRole('heading', { name: 'Sifarişlər' })
    await user.click(screen.getByRole('button', { name: 'Çıxış' }))

    await waitFor(() => expect(authApi.logout).toHaveBeenCalled())
    expect(await screen.findByRole('heading', { name: 'Sistemə daxil olun' })).toBeInTheDocument()
  })

  it('changes a password through the server, and never keeps it', async () => {
    const user = userEvent.setup()
    authApi.fetchCurrentUser.mockResolvedValue(person('Coordinator'))
    renderApp('/orders')

    await user.click(await screen.findByRole('button', { name: 'Şifrəni dəyiş' }))
    await user.type(screen.getByLabelText('Cari şifrə'), 'köhnə-şifrə-10')
    await user.type(screen.getByLabelText('Yeni şifrə'), 'yeni-şifrə-2026')
    await user.type(screen.getByLabelText('Yeni şifrəni təkrar et'), 'yeni-şifrə-2026')
    await user.click(screen.getByRole('button', { name: 'Dəyiş' }))

    await waitFor(() =>
      expect(authApi.changeOwnPassword).toHaveBeenCalledWith('köhnə-şifrə-10', 'yeni-şifrə-2026'),
    )
    expect(await screen.findByText('Şifrəniz dəyişdirildi.')).toBeInTheDocument()
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  it('will not send two different new passwords', async () => {
    const user = userEvent.setup()
    authApi.fetchCurrentUser.mockResolvedValue(person('Coordinator'))
    renderApp('/orders')

    await user.click(await screen.findByRole('button', { name: 'Şifrəni dəyiş' }))
    await user.type(screen.getByLabelText('Cari şifrə'), 'köhnə-şifrə-10')
    await user.type(screen.getByLabelText('Yeni şifrə'), 'yeni-şifrə-2026')
    await user.type(screen.getByLabelText('Yeni şifrəni təkrar et'), 'yeni-şifrə-2027')

    expect(screen.getByText('Yeni şifrələr uyğun gəlmir.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dəyiş' })).toBeDisabled()
    expect(authApi.changeOwnPassword).not.toHaveBeenCalled()
  })
})

describe('the navigation', () => {
  async function renderSidebar(current: CurrentUser) {
    authApi.fetchCurrentUser.mockResolvedValue(current)
    render(
      <MemoryRouter>
        <AuthProvider>
          <Sidebar open onClose={() => {}} />
        </AuthProvider>
      </MemoryRouter>,
    )

    await screen.findByRole('link', { name: /Obyektlər/ })
  }

  it('offers user management only to an administrator', async () => {
    await renderSidebar(person('Admin'))
    expect(screen.getByRole('link', { name: /İstifadəçilər/ })).toBeInTheDocument()
  })

  it('does not offer it to a coordinator or a manager', async () => {
    await renderSidebar(person('Coordinator'))
    expect(screen.queryByRole('link', { name: /İstifadəçilər/ })).toBeNull()
  })

  it('offers Excel import to a coordinator', async () => {
    await renderSidebar(person('Coordinator'))
    expect(screen.getByRole('link', { name: /Excel importları/ })).toBeInTheDocument()
  })

  it('does not offer Excel import to a manager', async () => {
    await renderSidebar(person('Manager'))
    expect(screen.queryByRole('link', { name: /Excel importları/ })).toBeNull()
  })

  it('offers the shared screens to every role', async () => {
    await renderSidebar(person('Manager'))

    expect(screen.getByRole('link', { name: /İdarəetmə paneli/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Obyektlər/ })).toBeInTheDocument()
  })

  it('no longer offers a separate orders link — Obyektlər is where orders are browsed from', async () => {
    await renderSidebar(person('Manager'))

    expect(screen.queryByRole('link', { name: /Sifarişlər/ })).toBeNull()
  })

  it('offers the approval inbox to a manager', async () => {
    await renderSidebar(person('Manager'))
    expect(screen.getByRole('link', { name: /Təsdiq gözləyənlər/ })).toBeInTheDocument()
  })

  it('offers the approval inbox to an administrator, who sees it without approval authority', async () => {
    await renderSidebar(person('Admin', { canDecideOrders: false, canViewApprovals: true }))
    expect(screen.getByRole('link', { name: /Təsdiq gözləyənlər/ })).toBeInTheDocument()
  })

  it('does not offer the approval inbox to a coordinator, who cannot decide anyway', async () => {
    await renderSidebar(person('Coordinator'))
    expect(screen.queryByRole('link', { name: /Təsdiq gözləyənlər/ })).toBeNull()
  })
})
