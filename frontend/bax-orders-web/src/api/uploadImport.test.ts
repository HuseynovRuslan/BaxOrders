import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { uploadImport } from './imports'

/**
 * The workbook upload is the one write that does not go through `client`: it needs XMLHttpRequest to report
 * when the file has finished travelling, so it builds its own request. That is exactly how it came to send no
 * antiforgery token at all, and the server refused every workbook with 400 «Sorğu təsdiq nişanı olmadan
 * göndərilib» — the first step of the whole import, failing before a single row was read.
 *
 * So what is pinned here is not the happy path but the header.
 */
class FakeXhr {
  static last: FakeXhr | null = null
  /** What the next request should answer. Set before the call, because the fake answers within send(). */
  static nextStatus = 201
  static nextResponse = '{"importBatchId":7}'

  public readonly headers: Record<string, string> = {}
  public method = ''
  public url = ''
  public body: unknown = null
  public status = FakeXhr.nextStatus
  public responseText = FakeXhr.nextResponse
  public onload: (() => void) | null = null
  public onerror: (() => void) | null = null
  public upload = { onload: null as (() => void) | null }

  constructor() {
    FakeXhr.last = this
  }

  open(method: string, url: string) {
    this.method = method
    this.url = url
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }

  send(body: unknown) {
    this.body = body
    this.upload.onload?.()
    this.onload?.()
  }
}

const file = new File(['x'], 'sifarisler.xlsx')

beforeEach(() => {
  FakeXhr.last = null
  FakeXhr.nextStatus = 201
  FakeXhr.nextResponse = '{"importBatchId":7}'
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
  document.cookie = 'BAXORDERS-CSRF=the-token; path=/'
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'BAXORDERS-CSRF=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

describe('uploading a workbook', () => {
  it('sends the antiforgery token the server refuses the request without', async () => {
    await uploadImport(file, () => {})

    expect(FakeXhr.last?.headers['X-CSRF-TOKEN']).toBe('the-token')
    expect(FakeXhr.last?.method).toBe('POST')
    expect(FakeXhr.last?.url).toBe('/api/v1/imports/excel')
  })

  /** When the page has no token yet, it asks the server for one rather than sending the file without it. */
  it('asks the server for a token when the page has none', async () => {
    document.cookie = 'BAXORDERS-CSRF=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    const fetched = vi.fn(async () => {
      document.cookie = 'BAXORDERS-CSRF=fetched-token; path=/'
      return new Response(null, { status: 204 })
    })
    vi.stubGlobal('fetch', fetched)

    await uploadImport(file, () => {})

    expect(fetched).toHaveBeenCalledWith('/api/v1/auth/csrf', { method: 'GET' })
    expect(FakeXhr.last?.headers['X-CSRF-TOKEN']).toBe('fetched-token')
  })

  it('still sends the file, and says when it has been sent', async () => {
    const sent = vi.fn()

    const result = await uploadImport(file, sent)

    expect(sent).toHaveBeenCalledOnce()
    expect(FakeXhr.last?.body).toBeInstanceOf(FormData)
    expect((FakeXhr.last?.body as FormData).get('file')).toBe(file)
    expect(result).toEqual({ importBatchId: 7 })
  })

  it('reports what the server said when it refuses the workbook', async () => {
    FakeXhr.nextStatus = 400
    FakeXhr.nextResponse = '{"title":"Antiforgery token required","status":400,"detail":"Sorğu təsdiq nişanı olmadan göndərilib."}'

    await expect(uploadImport(file, () => {})).rejects.toMatchObject({ status: 400 })
  })
})
