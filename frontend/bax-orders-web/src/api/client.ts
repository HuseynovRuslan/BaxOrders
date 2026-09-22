export interface ProblemDetails {
  title?: string
  detail?: string
  status?: number
  [extension: string]: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetails | null

  constructor(status: number, message: string, problem: ProblemDetails | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }

  /** The session is gone or was never there. The caller signs the user out rather than retrying. */
  get isUnauthenticated(): boolean {
    return this.status === 401
  }

  /** Signed in, but not allowed to do this. Signing in again would not help, so the session is kept. */
  get isForbidden(): boolean {
    return this.status === 403
  }
}

/** Builds an ApiError from a failed response body, keeping ProblemDetails extensions. */
export function toApiError(status: number, body: string): ApiError {
  let problem: ProblemDetails | null = null
  try {
    problem = JSON.parse(body) as ProblemDetails
  } catch {
    // The body is not JSON; keep the generic message.
  }

  const message = problem?.detail ?? problem?.title ?? `Sorğu uğursuz oldu (HTTP ${status})`
  return new ApiError(status, message, problem)
}

/** The header the server expects the antiforgery token in, and the cookie it arrives by. */
const csrfHeader = 'X-CSRF-TOKEN'
const csrfCookie = 'BAXORDERS-CSRF'

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((entry) => entry.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

/**
 * Asks the server for an antiforgery token when we do not have one yet.
 * </summary>
 * Kept here so every write is covered by one piece of code: a component that forgot would otherwise be a
 * request that silently fails, or worse, a write that nothing protects.
 */
async function csrfToken(): Promise<string | null> {
  const existing = readCookie(csrfCookie)
  if (existing) {
    return existing
  }

  await fetch('/api/v1/auth/csrf', { method: 'GET' })
  return readCookie(csrfCookie)
}

/** Called when the server says the session is gone, so the application can stop showing private data. */
let onUnauthenticated: (() => void) | null = null

export function setUnauthenticatedHandler(handler: (() => void) | null): void {
  onUnauthenticated = handler
}

async function ensureOk(response: Response): Promise<Response> {
  if (!response.ok) {
    const error = toApiError(response.status, await response.text())
    if (error.isUnauthenticated) {
      onUnauthenticated?.()
    }

    throw error
  }

  return response
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { headers: { Accept: 'application/json' }, signal })
  await ensureOk(response)
  return (await response.json()) as T
}

async function send<T>(method: string, path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const token = await csrfToken()
  const response = await fetch(path, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { [csrfHeader]: token } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })

  await ensureOk(response)

  // A 204 has nothing to read; callers that expect nothing are typed as void.
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

export function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return send<T>('POST', path, body, signal)
}

export function putJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return send<T>('PUT', path, body, signal)
}

export function patchJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return send<T>('PATCH', path, body, signal)
}

export async function deleteJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const token = await csrfToken()
  const response = await fetch(path, {
    method: 'DELETE',
    headers: { Accept: 'application/json', ...(token ? { [csrfHeader]: token } : {}) },
    signal,
  })

  await ensureOk(response)
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

export async function getText(path: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(path, { signal })
  await ensureOk(response)
  return response.text()
}
