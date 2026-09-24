import { getJson } from './client'

/** Which environment the API is. It says nothing else: no name, no database, no version. */
export interface EnvironmentInfo {
  /** True in Task 4's test environment, where no order is real. */
  isSandbox: boolean
}

/** Anonymous, so the sign-in page can carry the test environment's banner too. */
export function fetchEnvironment(signal?: AbortSignal): Promise<EnvironmentInfo> {
  return getJson<EnvironmentInfo>('/api/v1/environment', signal)
}
