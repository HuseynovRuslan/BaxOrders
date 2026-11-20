import { describe, expect, it } from 'vitest'
import raw from './areaLocations.json'
import { AREA_LOCATIONS, LOCATION_SOURCE, REJECTED_LOCATIONS, locationProblem, mapLinkOf, readLocations, safeMapUrl } from './areaLocations'
import { FINANCE_LINK_CANDIDATES, FINANCE_LINKS } from './areaFinanceLinks'

/*
 * The owner's 48 locations, as checked in: every record kept exactly, none added, none guessed — and nothing about people
 * but the area manager.
 */

const records = (raw as { locations: Record<string, unknown>[] }).locations

describe('the checked-in locations', () => {
  it('has exactly 48 records, each with its own id, all of them drawable', () => {
    expect(records).toHaveLength(48)
    expect((raw as { record_count: number }).record_count).toBe(48)
    expect(AREA_LOCATIONS).toHaveLength(48)
    expect(REJECTED_LOCATIONS).toEqual([])
    expect(new Set(AREA_LOCATIONS.map((location) => location.id)).size).toBe(48)
    expect(AREA_LOCATIONS.every((location) => /^LOC-\d{4}$/.test(location.id))).toBe(true)
    expect(LOCATION_SOURCE).toEqual({ workbook: 'BaxOrders_Area_Locations_Final_49.xlsx', worksheet: 'Areas', declared: 48 })
  })

  it('never brings back LOC-0025, which the owner deleted', () => {
    expect(AREA_LOCATIONS.find((location) => location.id === 'LOC-0025')).toBeUndefined()
    expect(FINANCE_LINKS['LOC-0025']).toBeUndefined()
    expect(FINANCE_LINK_CANDIDATES['LOC-0025']).toBeUndefined()
    // The gap is the only one: LOC-0001 … LOC-0049 without 0025.
    const expected = Array.from({ length: 49 }, (_, index) => `LOC-${String(index + 1).padStart(4, '0')}`).filter((id) => id !== 'LOC-0025')
    expect(AREA_LOCATIONS.map((location) => location.id)).toEqual(expected)
  })

  it('has LOC-0049 as the Aeroport yolu record, managed by Məmmədov Nizami', () => {
    const airport = AREA_LOCATIONS.find((location) => location.id === 'LOC-0049')!
    expect(airport).toMatchObject({ name: 'Aeroport yolu', manager: 'Məmmədov Nizami', managers: ['Məmmədov Nizami'], lat: 40.4695221, lng: 50.0934978 })
  })

  it('keeps every coordinate to its last digit, and each inside Azerbaijan', () => {
    for (const [index, location] of AREA_LOCATIONS.entries()) {
      expect(location.lat).toBe(records[index].latitude)
      expect(location.lng).toBe(records[index].longitude)
      expect(locationProblem(location.lat, location.lng)).toBeNull()
      expect(location.lat).toBeGreaterThan(40)
      expect(location.lat).toBeLessThan(41)
      expect(location.lng).toBeGreaterThan(49.5)
      expect(location.lng).toBeLessThan(50.5)
    }
    expect(AREA_LOCATIONS.find((location) => location.id === 'LOC-0001')).toMatchObject({ lat: 40.38140869140625, lng: 49.82112884521484 })
  })

  it('keeps the review statuses and the duplicate groups, and merges nothing', () => {
    const by = (status: string) => AREA_LOCATIONS.filter((location) => location.status === status).map((location) => location.id)
    expect(by('NEEDS_REVIEW')).toEqual(['LOC-0009', 'LOC-0018', 'LOC-0031', 'LOC-0047'])
    expect(by('POSSIBLE_DUPLICATE')).toEqual(['LOC-0014', 'LOC-0020', 'LOC-0026'])
    expect(by('VERIFIED')).toHaveLength(41)
    // Two records with one name and nearby points stay two records.
    const twins = AREA_LOCATIONS.filter((location) => location.duplicateGroup === 'DUP-01')
    expect(twins.map((location) => location.id)).toEqual(['LOC-0014', 'LOC-0020'])
    expect(twins[0].name).toBe(twins[1].name)
    expect(twins[0].lat).not.toBe(twins[1].lat)
    expect(AREA_LOCATIONS.find((location) => location.id === 'LOC-0014')!.reviewIssues).toEqual(['NR-002', 'NR-010', 'NR-012'])
  })

  it('holds no person but the area manager, and no private column', () => {
    const allowed = ['record_id', 'area_name_normalized', 'latitude', 'longitude', 'map_url', 'area_manager', 'extraction_status', 'confidence', 'duplicate_group', 'review_issue_ids', 'baxorders_area_id']
    for (const record of records) expect(Object.keys(record).sort()).toEqual([...allowed].sort())
    // The records themselves (the file's notes may say what was left out).
    const text = JSON.stringify(records).toLocaleLowerCase('az')
    for (const word of ['supervisor', 'warehouse', 'keeper', 'phone', 'telefon', 'anbardar', 'nəzarətçi', 'message', 'mesaj']) expect(text).not.toContain(word)
    // Several managers are one record's, each kept.
    expect(AREA_LOCATIONS.find((location) => location.id === 'LOC-0046')!.managers).toEqual(['İbrahimov Xəyal', 'Babayev Əbülfəz'])
  })

  it('opens every record on its own https map link', () => {
    for (const location of AREA_LOCATIONS) {
      expect(location.mapUrl).not.toBeNull()
      expect(mapLinkOf(location).startsWith('https://maps.google.com/maps')).toBe(true)
    }
  })
})

describe('reading an export', () => {
  const record = (extra: Record<string, unknown>) => ({
    record_id: 'LOC-0100', area_name_normalized: 'Sınaq', latitude: 40.4, longitude: 49.9, map_url: null, area_manager: null,
    extraction_status: 'VERIFIED', confidence: 'HIGH', duplicate_group: null, review_issue_ids: null, baxorders_area_id: null, ...extra,
  })

  it('refuses a repeated id, a missing id and a coordinate outside Azerbaijan, and keeps the rest', () => {
    const { locations, rejected } = readLocations({
      locations: [
        record({}),
        record({ area_name_normalized: 'Təkrar' }),
        record({ record_id: 'LOC-0101', latitude: 0, longitude: 0 }),
        record({ record_id: 'LOC-0102', latitude: 'x' }),
        record({ record_id: null }),
        record({ record_id: 'LOC-0103', extraction_status: 'BİLİNMİR', area_manager: '  ' }),
      ],
    })
    expect(locations.map((location) => location.id)).toEqual(['LOC-0100', 'LOC-0103'])
    expect(rejected.map((item) => [item.id, item.problem])).toEqual([
      ['LOC-0100', 'record_id təkrarlanır'],
      ['LOC-0101', 'Koordinat Azərbaycan ərazisindən kənardır'],
      ['LOC-0102', 'Koordinat rəqəm deyil'],
      ['—', 'record_id yoxdur'],
    ])
    // An unknown status is never read as verified; an empty manager is none.
    expect(locations[1]).toMatchObject({ status: 'NEEDS_REVIEW', manager: null, managers: [] })
  })

  it('says so when the file has no records at all', () => {
    expect(readLocations(null).rejected).toHaveLength(1)
    expect(readLocations({ locations: [] })).toEqual({ locations: [], rejected: [] })
  })

  it('accepts only https links of known map services, and otherwise opens the coordinates', () => {
    expect(safeMapUrl('https://maps.google.com/maps?q=40.4%2C49.9&z=17')).toBe('https://maps.google.com/maps?q=40.4%2C49.9&z=17')
    expect(safeMapUrl('https://www.google.com/maps/search/X/@40.3,49.8,17z')).not.toBeNull()
    expect(safeMapUrl('javascript:alert(1)')).toBeNull()
    expect(safeMapUrl('http://maps.google.com/maps?q=1,2')).toBeNull()
    expect(safeMapUrl('https://evil.example/maps?q=1,2')).toBeNull()
    expect(safeMapUrl('https://www.google.com/search?q=x')).toBeNull()
    expect(safeMapUrl('https://user:pass@maps.google.com/maps')).toBeNull()
    expect(safeMapUrl(42)).toBeNull()
    expect(mapLinkOf({ mapUrl: null, lat: 40.5, lng: 49.75 })).toBe('https://www.google.com/maps/search/?api=1&query=40.5%2C49.75')
  })
})

describe('the financial links', () => {
  const ids = new Set(AREA_LOCATIONS.map((location) => location.id))
  const fold = (text: string) => text.toLocaleLowerCase('az')

  it('names only locations of the export, each once, never both linked and a candidate', () => {
    for (const id of [...Object.keys(FINANCE_LINKS), ...Object.keys(FINANCE_LINK_CANDIDATES)]) expect(ids.has(id)).toBe(true)
    for (const id of Object.keys(FINANCE_LINKS)) expect(FINANCE_LINK_CANDIDATES[id]).toBeUndefined()
  })

  it('links by the same name only where the two workbooks spell it alike', () => {
    for (const [id, link] of Object.entries(FINANCE_LINKS)) {
      if (link.basis !== 'same-name') continue
      expect(fold(AREA_LOCATIONS.find((location) => location.id === id)!.name)).toBe(fold(link.sourceName))
    }
  })

  it('cites the evidence of every other link', () => {
    for (const link of Object.values(FINANCE_LINKS)) {
      if (link.basis !== 'same-name') expect(link.ref).toMatch(/^(CB|DB)-\d{2}$/)
    }
    expect(FINANCE_LINKS['LOC-0049']).toMatchObject({ siteId: 'aeroport-yolu', basis: 'same-name' })
    expect(FINANCE_LINKS['LOC-0024']).toMatchObject({ siteId: 'h-e-m', sourceName: 'H.Ə.M', basis: 'business', ref: 'CB-08' })
    expect(Object.keys(FINANCE_LINKS)).toHaveLength(17)
  })
})
