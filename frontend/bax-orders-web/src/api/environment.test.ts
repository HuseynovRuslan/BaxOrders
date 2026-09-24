import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchEnvironment } from './environment'

/** Task 4b: the screens ask the API which environment it is, with a plain read and nothing else. */
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('fetchEnvironment', () => {
  it('reads /api/v1/environment and returns what the API said', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ isSandbox: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )

    await expect(fetchEnvironment()).resolves.toEqual({ isSandbox: true })

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/v1/environment')
    expect(init.method).toBeUndefined()
    expect(init.headers['X-CSRF-TOKEN']).toBeUndefined()
  })

  it('fails rather than guessing when the API does not answer', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 404 }))

    await expect(fetchEnvironment()).rejects.toMatchObject({ status: 404 })
  })
})
