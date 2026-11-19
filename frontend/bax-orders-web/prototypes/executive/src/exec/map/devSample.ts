import type { AreaLocation } from '../../data/areaLocations'

/**
 * DEVELOPMENT ONLY — NOT REAL LOCATIONS. Until the owner sends the real coordinates the map has no pins, so this lays
 * the areas out on a plain grid over Baku, one row after another in alphabetical order, to see the pins, the clusters and
 * the drawer at work. The grid is deliberately regular so no one mistakes it for places. It exists only in a development
 * build (`import.meta.env.DEV`) and only when the address asks for it (`/xerite?numune=1`); the page then says so in its
 * banner and on every pin's details. A production build drops it entirely.
 */
export const sampleEnabled = (params: URLSearchParams) => import.meta.env.DEV && params.get('numune') === '1'

/** Null in a production build, so the bundler leaves the whole generator out. */
export const sampleLocations: ((ids: readonly string[]) => Record<string, AreaLocation>) | null = import.meta.env.DEV
  ? (ids) => {
    const columns = 7
    const origin = { lat: 40.47, lng: 49.74 }
    const step = 0.032
    return Object.fromEntries(ids.map((id, index) => [id, {
      lat: origin.lat - Math.floor(index / columns) * step,
      lng: origin.lng + (index % columns) * step * 1.3,
      note: 'Nümunə — real yer deyil',
    }]))
  }
  : null
