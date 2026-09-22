import { getText } from './client'

/** Resolves when the API and its database dependency report healthy. */
export async function fetchHealth(signal: AbortSignal): Promise<string> {
  return getText('/health', signal)
}
