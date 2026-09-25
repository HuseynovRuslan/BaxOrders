import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
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
  canViewApprovals: false,
  canDecideProductMatches: false,
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
