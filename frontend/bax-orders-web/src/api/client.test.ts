import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getJson, patchJson, postJson, setUnauthenticatedHandler } from './client'

/**
 * The shared request helper. Two things here carry weight beyond convenience: every write sends the
 * antiforgery token, so no component can forget it and leave a write unprotected; and the two refusals are
 * told apart, because a session that has ended and a permission that was never granted call for opposite
 * responses.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function problemResponse(status: number, detail: string): Response {
  return new Response(JSON.stringify({ status, detail }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

function clearCookies() {
  for (const entry of document.cookie.split('; ')) {
    const name = entry.split('=')[0]
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  }
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  clearCookies()
  setUnauthenticatedHandler(null)
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  setUnauthenticatedHandler(null)
  clearCookies()
  vi.unstubAllGlobals()
})

describe('the antiforgery token', () => {
  it('goes with every write, taken from the cookie the server set', async () => {
    document.cookie = 'BAXORDERS-CSRF=token-from-server; path=/'
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await postJson('/api/v1/orders/1/workflow/submit', { comment: null })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.headers['X-CSRF-TOKEN']).toBe('token-from-server')
  })

  it('is fetched first when the page does not have one yet', async () => {
    fetchMock.mockImplementation((path: string) => {
      if (path === '/api/v1/auth/csrf') {
        document.cookie = 'BAXORDERS-CSRF=freshly-issued; path=/'
        return Promise.resolve(new Response(null, { status: 204 }))
      }

      return Promise.resolve(jsonResponse({ ok: true }))
    })

    await patchJson('/api/v1/admin/users/abc', { isActive: false })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/auth/csrf')
    const [, init] = fetchMock.mock.calls[1]
    expect(init.method).toBe('PATCH')
    expect(init.headers['X-CSRF-TOKEN']).toBe('freshly-issued')
  })

  it('is not attached to a read, which changes nothing', async () => {
    document.cookie = 'BAXORDERS-CSRF=token-from-server; path=/'
    fetchMock.mockResolvedValue(jsonResponse([]))

    await getJson('/api/v1/orders')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['X-CSRF-TOKEN']).toBeUndefined()
  })
})

describe('the two refusals', () => {
  it('treats 401 as the session having ended, and says so once', async () => {
    const endedSession = vi.fn()
    setUnauthenticatedHandler(endedSession)
    fetchMock.mockResolvedValue(problemResponse(401, 'Unauthorized'))

    await expect(getJson('/api/v1/orders')).rejects.toSatisfy(
      (error: ApiError) => error.isUnauthenticated && !error.isForbidden,
    )
    expect(endedSession).toHaveBeenCalledTimes(1)
  })

  it('keeps the session on 403: signing in again would not grant the permission', async () => {
    const endedSession = vi.fn()
    setUnauthenticatedHandler(endedSession)
    fetchMock.mockResolvedValue(problemResponse(403, 'Bu əməliyyat üçün icazəniz yoxdur.'))

    await expect(postJson('/api/v1/orders/1/workflow/approve', {})).rejects.toSatisfy(
      (error: ApiError) => error.isForbidden && !error.isUnauthenticated,
    )
    expect(endedSession).not.toHaveBeenCalled()
  })

  it('carries the server’s own wording rather than inventing one', async () => {
    fetchMock.mockResolvedValue(problemResponse(422, 'Bu sifariş artıq təsdiqlənib.'))

    await expect(getJson('/api/v1/orders/1/workflow')).rejects.toThrow('Bu sifariş artıq təsdiqlənib.')
  })
})

describe('an answer with no body', () => {
  it('returns nothing rather than failing to parse', async () => {
    document.cookie = 'BAXORDERS-CSRF=token-from-server; path=/'
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(postJson('/api/v1/auth/logout', {})).resolves.toBeUndefined()
  })
})
