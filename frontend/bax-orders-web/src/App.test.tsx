import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CurrentUser } from './api/auth'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'

/**
 * The one thing worth testing at this level: a link nobody should be using any more still goes somewhere
 * real, rather than to a page that only explained where to go.
 */
const authApi = vi.hoisted(() => ({
  primeCsrf: vi.fn(),
  fetchCurrentUser: vi.fn(),
}))

vi.mock('./api/auth', async () => {
  const actual = await vi.importActual<typeof import('./api/auth')>('./api/auth')
  return { ...actual, ...authApi }
})

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
}

beforeEach(() => {
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
