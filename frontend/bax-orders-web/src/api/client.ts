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

async function ensureOk(response: Response): Promise<Response> {
  if (!response.ok) {
    throw toApiError(response.status, await response.text())
  }
  return response
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { headers: { Accept: 'application/json' }, signal })
  await ensureOk(response)
  return (await response.json()) as T
}

export async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  await ensureOk(response)
  return (await response.json()) as T
}

export async function putJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  await ensureOk(response)
  return (await response.json()) as T
}

export async function deleteJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: 'DELETE', headers: { Accept: 'application/json' }, signal })
  await ensureOk(response)
  return (await response.json()) as T
}

export async function getText(path: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(path, { signal })
  await ensureOk(response)
  return response.text()
}
