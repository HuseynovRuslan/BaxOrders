import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CurrentUser } from '../api/auth'
import { App } from '../App'
import { AuthProvider } from '../auth/AuthProvider'
import { EnvironmentProvider } from './EnvironmentProvider'
import { sandboxBanner } from './labels'

/**
 * Task 4b: the test environment says so at the top of every page — the sign-in page included — and the normal
 * system shows no trace of it. The API decides which one this is; the screens only repeat what it said.
 */
const environmentApi = vi.hoisted(() => ({ fetchEnvironment: vi.fn() }))
vi.mock('../api/environment', () => environmentApi)

const authApi = vi.hoisted(() => ({
  primeCsrf: vi.fn(),
  fetchCurrentUser: vi.fn(),
}))

vi.mock('../api/auth', async () => {
  const actual = await vi.importActual<typeof import('../api/auth')>('../api/auth')
  return { ...actual, ...authApi }
})

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

const rehber: CurrentUser = {
  isAuthenticated: true,
  userId: '4f1f0a2e-0000-4000-8000-00000000000b',
  userName: 'sinaq.rehber',
  displayName: 'Sınaq Rəhbəri',
  role: 'Manager',
  canManageImports: false,
  canSubmitOrders: false,
  canDecideOrders: true,
  canManageUsers: false,
  canManageCatalog: false,
  canViewApprovals: true,
  canDecideProductMatches: false,
}

beforeEach(() => {
  authApi.primeCsrf.mockReset().mockResolvedValue(undefined)
  authApi.fetchCurrentUser.mockReset().mockResolvedValue(anonymous)
  environmentApi.fetchEnvironment.mockReset()
})

afterEach(() => vi.clearAllMocks())

/** The whole application, as main.tsx puts it together. */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <EnvironmentProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </EnvironmentProvider>
    </MemoryRouter>,
  )
}

describe('in the test environment', () => {
  beforeEach(() => environmentApi.fetchEnvironment.mockResolvedValue({ isSandbox: true }))

  it('says so on the sign-in page, before anybody signs in', async () => {
    renderAt('/login')

    expect(await screen.findByRole('heading', { name: 'Sistemə daxil olun' })).toBeInTheDocument()
    expect(await screen.findByText(sandboxBanner)).toBeInTheDocument()
  })

  it('says so on the pages behind the sign-in, above everything else', async () => {
    authApi.fetchCurrentUser.mockResolvedValue(rehber)
    renderAt('/no-such-page')

    expect(await screen.findByRole('heading', { name: 'Səhifə tapılmadı' })).toBeInTheDocument()
    const banner = await screen.findByText(sandboxBanner)
    expect(banner).toHaveAttribute('role', 'status')
    // Before the header, so it is the first thing the page says.
    expect(banner.compareDocumentPosition(screen.getByText('Material sifarişlərinin idarə edilməsi')))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('uses the exact words of the specification', () => {
    expect(sandboxBanner).toBe(
      'Sınaq mühiti — burada real sifariş yoxdur. Burada edilən təsdiq və düzəlişlər real dataya təsir etmir.',
    )
  })
})

describe('in the normal system', () => {
  beforeEach(() => environmentApi.fetchEnvironment.mockResolvedValue({ isSandbox: false }))

  it('shows no banner on the sign-in page', async () => {
    renderAt('/login')

    expect(await screen.findByRole('heading', { name: 'Sistemə daxil olun' })).toBeInTheDocument()
    await vi.waitFor(() => expect(environmentApi.fetchEnvironment).toHaveBeenCalled())
    expect(screen.queryByText(sandboxBanner)).toBeNull()
  })

  it('shows no banner behind the sign-in either', async () => {
    authApi.fetchCurrentUser.mockResolvedValue(rehber)
    renderAt('/no-such-page')

    expect(await screen.findByRole('heading', { name: 'Səhifə tapılmadı' })).toBeInTheDocument()
    await vi.waitFor(() => expect(environmentApi.fetchEnvironment).toHaveBeenCalled())
    expect(screen.queryByText(sandboxBanner)).toBeNull()
  })
})

describe('when the environment cannot be asked', () => {
  it('shows no banner and the sign-in page works as it always has', async () => {
    environmentApi.fetchEnvironment.mockRejectedValue(new TypeError('Failed to fetch'))
    renderAt('/login')

    expect(await screen.findByRole('heading', { name: 'Sistemə daxil olun' })).toBeInTheDocument()
    await vi.waitFor(() => expect(environmentApi.fetchEnvironment).toHaveBeenCalled())
    expect(screen.queryByText(sandboxBanner)).toBeNull()
    expect(screen.getByRole('button', { name: 'Daxil ol' })).toBeInTheDocument()
  })
})
