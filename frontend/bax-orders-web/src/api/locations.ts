import { getJson } from './client'

export interface LocationSummary {
  id: number
  code: string
  name: string
  isActive: boolean
}

export function fetchLocations(signal: AbortSignal): Promise<LocationSummary[]> {
  return getJson<LocationSummary[]>('/api/v1/locations?includeInactive=true', signal)
}
