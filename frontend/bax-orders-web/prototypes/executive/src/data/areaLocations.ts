import source from './areaLocations.json'

/*
 * Where the operational areas are: the owner's location workbook (BaxOrders_Area_Locations_Final_49.xlsx, worksheet
 * «Areas»), exported as JSON and brought in by `scripts/import_area_locations.mjs` into `areaLocations.json` beside this
 * file. The records are the owner's own: their ids, names, managers and coordinates are shown exactly as they are — no
 * coordinate is guessed, geocoded or moved, no record merged or made up. LOC-0025 was deleted by the owner; the gap in the
 * numbers is normal. To update: export the worksheet again and run the script (it keeps only the fields below and refuses
 * a file with a repeated id or a coordinate outside Azerbaijan), then the tests.
 *
 * A location is not a financial object. The order workbook names its objects in its own way («H.Ə.M», «F.M»), so which
 * location an object's money belongs to is written down by hand, with its evidence, in `areaFinanceLinks.ts` — never
 * matched by a similar name or by distance.
 *
 * Only the area manager («Ərazi rəhbəri») is shown about people. The export carries no other person, and the import
 * drops any other column.
 */

export type ExtractionStatus = 'VERIFIED' | 'NEEDS_REVIEW' | 'POSSIBLE_DUPLICATE'
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW'

export interface AreaLocation {
  /** The workbook's record id, «LOC-0049»: stable, never reused. */
  id: string
  name: string
  lat: number
  lng: number
  /** The record's own map link, when it is a safe https map address; otherwise null (the coordinates still open one). */
  mapUrl: string | null
  /** «Ərazi rəhbəri» as the source writes it, or null when the source has none. */
  manager: string | null
  /** The same, one person each: the source lists several with «;». */
  managers: string[]
  status: ExtractionStatus
  confidence: Confidence | null
  /** Records the source suspects of being one place: «DUP-01». */
  duplicateGroup: string | null
  /** The source's review notes about the record: «NR-002», «NR-012». */
  reviewIssues: string[]
  /** The source's own link to a financial object; empty in the 2026-11-19 export. */
  sourceAreaId: string | null
}

/** A record that could not be read, and why: it is named on the map's audit, never drawn. */
export interface RejectedLocation {
  id: string
  name: string
  problem: string
}

/** Azerbaijan's extent with a small margin (Naxçıvan to the Caspian shore, Astara to Balakən). */
const BOUNDS = { south: 38.3, north: 41.95, west: 44.7, east: 50.9 }

/** Why a pair cannot be a place in Azerbaijan, or null when it can. */
export function locationProblem(lat: unknown, lng: unknown): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return 'Koordinat rəqəm deyil'
  if (lat < BOUNDS.south || lat > BOUNDS.north || lng < BOUNDS.west || lng > BOUNDS.east) return 'Koordinat Azərbaycan ərazisindən kənardır'
  return null
}

/** Map services a record's link may point to; anything else opens the coordinates instead. */
const MAP_HOSTS = new Set(['maps.google.com', 'www.google.com', 'google.com', 'maps.app.goo.gl', 'www.openstreetmap.org'])

/** The link when it is an https address of a known map service, else null: never a `javascript:` or another site. */
export function safeMapUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || !MAP_HOSTS.has(url.hostname) || url.username || url.password) return null
    if (url.hostname.endsWith('google.com') && url.hostname !== 'maps.google.com' && !url.pathname.startsWith('/maps')) return null
    return url.href
  } catch {
    return null
  }
}

/** The address «Xəritədə aç» opens: the record's own link, or its coordinates on the same service. */
export function mapLinkOf(location: Pick<AreaLocation, 'mapUrl' | 'lat' | 'lng'>): string {
  return location.mapUrl ?? `https://www.google.com/maps/search/?api=1&query=${location.lat}%2C${location.lng}`
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null)
const list = (value: unknown): string[] => (text(value)?.split(';').map((part) => part.trim()).filter(Boolean) ?? [])
const statuses = new Set<ExtractionStatus>(['VERIFIED', 'NEEDS_REVIEW', 'POSSIBLE_DUPLICATE'])
const confidences = new Set<Confidence>(['HIGH', 'MEDIUM', 'LOW'])

/**
 * The export's records as the map reads them, each checked: a record without an id, with a repeated id or with a
 * coordinate that cannot be a place in Azerbaijan is refused and named — the others are kept as they are.
 */
export function readLocations(data: unknown): { locations: AreaLocation[]; rejected: RejectedLocation[] } {
  const records = (data as { locations?: unknown } | null)?.locations
  const locations: AreaLocation[] = []
  const rejected: RejectedLocation[] = []
  if (!Array.isArray(records)) return { locations, rejected: [{ id: '—', name: '—', problem: 'Faylda «locations» siyahısı yoxdur' }] }
  const seen = new Set<string>()
  for (const raw of records as Record<string, unknown>[]) {
    const id = text(raw?.record_id)
    const name = text(raw?.area_name_normalized) ?? ''
    if (!id) {
      rejected.push({ id: '—', name, problem: 'record_id yoxdur' })
      continue
    }
    if (seen.has(id)) {
      rejected.push({ id, name, problem: 'record_id təkrarlanır' })
      continue
    }
    seen.add(id)
    const problem = locationProblem(raw.latitude, raw.longitude)
    if (problem) {
      rejected.push({ id, name, problem })
      continue
    }
    const status = raw.extraction_status as ExtractionStatus
    locations.push({
      id,
      name: name || id,
      lat: raw.latitude as number,
      lng: raw.longitude as number,
      mapUrl: safeMapUrl(raw.map_url),
      manager: text(raw.area_manager),
      managers: list(raw.area_manager),
      // An unknown status is not taken for a verified one.
      status: statuses.has(status) ? status : 'NEEDS_REVIEW',
      confidence: confidences.has(raw.confidence as Confidence) ? raw.confidence as Confidence : null,
      duplicateGroup: text(raw.duplicate_group),
      reviewIssues: list(raw.review_issue_ids),
      sourceAreaId: text(raw.baxorders_area_id),
    })
  }
  return { locations, rejected }
}

const read = readLocations(source)

/** Every location of the export that can be drawn, in the export's order. */
export const AREA_LOCATIONS: readonly AreaLocation[] = Object.freeze(read.locations)
/** Records of the export that cannot be drawn, with the reason. */
export const REJECTED_LOCATIONS: readonly RejectedLocation[] = Object.freeze(read.rejected)
/** Where the records come from, for the page's footnote. */
export const LOCATION_SOURCE = {
  workbook: text((source as { source_workbook?: unknown }).source_workbook) ?? '—',
  worksheet: text((source as { source_worksheet?: unknown }).source_worksheet) ?? '—',
  declared: typeof (source as { record_count?: unknown }).record_count === 'number' ? (source as { record_count: number }).record_count : null,
}
