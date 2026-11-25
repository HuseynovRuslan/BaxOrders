import { afterAll, describe, expect, it, vi } from 'vitest'
import { useFixture } from '../test/fixture'
import type { AreaLocation } from '../data/areaLocations'
import type { FinanceLink, FinanceLinkCandidate } from '../data/areaFinanceLinks'

useFixture()
const areas = await import('./areas')
const { clusterPoints } = await import('../exec/map/cluster')
const { AREA_LOCATIONS } = await import('../data/areaLocations')

afterAll(() => vi.useRealTimers())

/*
 * Locations and money are kept apart: a location shows figures only through a written link to its object. The fixture's
 * objects (alfa, beta, delta, gamma) stand in for the workbook's; the links below are the test's own.
 */

const place = (id: string, name: string, extra: Partial<AreaLocation> = {}): AreaLocation => ({
  id, name, lat: 40.4, lng: 49.9, mapUrl: null, manager: 'Sınaq Rəhbər', managers: ['Sınaq Rəhbər'], status: 'VERIFIED', confidence: 'HIGH',
  duplicateGroup: null, reviewIssues: [], sourceAreaId: null, ...extra,
})
const link = (siteId: string, basis: FinanceLink['basis'] = 'business'): FinanceLink => ({ siteId, sourceName: siteId, basis, ref: basis === 'same-name' ? null : 'CB-00' })

const locations = [
  place('LOC-0001', 'Alfa parkı'),
  place('LOC-0002', 'Beta meydanı'),
  place('LOC-0003', 'Delta 1'),
  place('LOC-0004', 'Delta 2'),
  place('LOC-0005', 'Namizəd'),
  place('LOC-0006', 'Köhnə ad'),
  place('LOC-0007', 'Heç nə'),
]
const links: Record<string, FinanceLink> = {
  'LOC-0001': link('alfa'),
  'LOC-0002': link('beta', 'same-name'),
  // One object, two pins: its money is the object's, shown on both, counted once.
  'LOC-0003': link('delta', 'data'),
  'LOC-0004': link('delta', 'data'),
  // A line to an object the figures do not have.
  'LOC-0006': link('yoxdur'),
  // A line for a record the export does not have.
  'LOC-0099': link('gamma'),
}
const candidates: Record<string, FinanceLinkCandidate> = { 'LOC-0005': { siteId: 'gamma', sourceName: 'Gamma', question: 'Eyni obyektdirmi?' } }
const mapAreas = areas.resolveMapAreas(locations, links, candidates)
const byId = (id: string) => mapAreas.find((area) => area.location.id === id)!
const at = (year: number, month: number) => ({ year, month })
const ytd2026 = Array.from({ length: 11 }, (_, index) => at(2026, index + 1))

describe('locations and their objects', () => {
  it('links a location only through a written line, and says why the others have no figures', () => {
    expect(byId('LOC-0001').finance).toMatchObject({ state: 'linked', siteId: 'alfa', siteName: 'Alfa', sharedWith: [] })
    expect(byId('LOC-0005').finance).toMatchObject({ state: 'unlinked', reason: 'candidate', candidate: { sourceName: 'Gamma' } })
    expect(byId('LOC-0006').finance).toMatchObject({ state: 'unlinked', reason: 'unknown-site', missingSiteId: 'yoxdur' })
    expect(byId('LOC-0007').finance).toMatchObject({ state: 'unlinked', reason: 'none', candidate: null })
    // A similar name links nothing: «Alfa parkı» is linked by its line, «Heç nə» by none.
    expect(mapAreas.filter((area) => area.finance.state === 'linked')).toHaveLength(4)
  })

  it('names the pins that share one object', () => {
    expect(byId('LOC-0003').finance).toMatchObject({ state: 'linked', sharedWith: ['LOC-0004'] })
    expect(byId('LOC-0004').finance).toMatchObject({ state: 'linked', sharedWith: ['LOC-0003'] })
  })

  it('reports the coverage: by evidence, candidates, unknown objects, stray lines, unlinked and shared objects', () => {
    const coverage = areas.linkCoverage(mapAreas, links)
    expect(coverage).toMatchObject({ locations: 7, linked: 4, byBasis: { business: 1, data: 2, 'same-name': 1 }, candidates: 1 })
    expect(coverage.unknownSites).toEqual([{ locationId: 'LOC-0006', siteId: 'yoxdur' }])
    expect(coverage.orphanLinks).toEqual(['LOC-0099'])
    expect(coverage.unlinkedSites.map((site) => site.id)).toEqual(['gamma'])
    expect(coverage.sharedSites).toEqual([{ siteId: 'delta', locationIds: ['LOC-0003', 'LOC-0004'] }])
  })

  it('gives the real locations no figures in a workbook whose objects they are not linked to', () => {
    // The fixture has none of the owner's objects: every one of the 47 places keeps its pin and shows no money. The
    // export has 48 records; LOC-0014 is the owner's confirmed second copy of LOC-0020 and is drawn as LOC-0020.
    const real = areas.resolveMapAreas()
    expect(real).toHaveLength(47)
    expect(real.map((area) => area.location.id)).not.toContain('LOC-0014')
    expect(real.every((area) => area.finance.state === 'unlinked')).toBe(true)
    expect(real.find((area) => area.location.id === 'LOC-0049')!.finance).toMatchObject({ reason: 'unknown-site', missingSiteId: 'aeroport-yolu' })
    const rows = areas.areaRows(real, [at(2026, 11)], 'yoy', 'monthly')
    expect(rows.every((row) => row.amount === null && row.comparison === null)).toBe(true)
    expect(AREA_LOCATIONS).toHaveLength(48)
  })
})

describe('the period on the map', () => {
  it('gives each linked location its object’s figure, and an unlinked one none — not a zero', () => {
    const rows = areas.areaRows(mapAreas, [at(2026, 11)], 'yoy', 'monthly')
    const row = (id: string) => rows.find((item) => item.area.location.id === id)!
    expect(row('LOC-0001')).toMatchObject({ amount: 120, comparison: { baseline: 100, delta: 20 } })
    expect(row('LOC-0002')).toMatchObject({ amount: 50, comparison: { baseline: 50, delta: 0, pct: 0 } })
    expect(row('LOC-0007')).toMatchObject({ amount: null, comparison: null })
    expect(row('LOC-0005')).toMatchObject({ amount: null, comparison: null })
  })

  it('counts a shared object once in the totals', () => {
    const rows = areas.areaRows(mapAreas, [at(2026, 1)], 'yoy', 'all')
    expect(rows.find((row) => row.area.location.id === 'LOC-0003')!.amount).toBe(20)
    expect(rows.find((row) => row.area.location.id === 'LOC-0004')!.amount).toBe(20)
    // January 2026, every kind: alfa 120 + beta 50 + delta 20 = 190, of which the map's objects hold all 190, delta once.
    expect(areas.periodCoverage(mapAreas, [at(2026, 1)], 'all')).toMatchObject({ total: 190, linked: 190, unlinked: 0 })
    expect(areas.distinctSites(mapAreas)).toEqual(['alfa', 'beta', 'delta'])
  })

  it('splits the period’s money between the map and the objects without a pin, and has none for a missing month', () => {
    const coverage = areas.periodCoverage(areas.resolveMapAreas(locations, { 'LOC-0001': link('alfa') }, {}), ytd2026, 'monthly')
    expect(coverage).toMatchObject({ total: 1730, linked: 1280, unlinked: 450 })
    expect(coverage.unlinkedSites.map((site) => [site.id, site.amount])).toEqual([['beta', 450], ['delta', 0], ['gamma', 0]])
    expect(areas.periodCoverage(mapAreas, [at(2026, 7)], 'monthly')).toMatchObject({ total: null, linked: null, unlinked: null })
  })
})

describe('one object’s figures', () => {
  const months2026 = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11]

  it('reads only that object’s lines, with the approval of its monthly package', () => {
    const alfa = areas.areaFigures('alfa', 2026, months2026, 'monthly')
    expect(alfa.approval).toMatchObject({ approved: 1040, pending: 240, pendingMonths: [10, 11] })
    expect(alfa.categories.map((row) => [row.name, row.amount])).toEqual([['Təmizlik', 1280]])
  })

  it('tells a zero month from a missing one', () => {
    expect(areas.areaFigures('beta', 2026, [3], 'monthly').state).toBe('zero')
    expect(areas.areaFigures('alfa', 2026, [7], 'monthly').state).toBe('missing')
    const never = areas.areaFigures('gamma', 2026, months2026, 'monthly')
    expect(never.state).toBe('zero')
    expect(never.everOrdered).toBe(false)
  })

  it('lists the month’s orders: the monthly one with its approval, an outside one with none', () => {
    expect(areas.ordersOf('alfa', 2026, [5], 'all').map((order) => [order.type, order.amount, order.approval])).toEqual([['monthly', 120, 'approved'], ['outside', 40, null]])
    expect(areas.ordersOf('alfa', 2026, [5], 'monthly').map((order) => order.type)).toEqual(['monthly'])
    expect(areas.ordersOf('alfa', 2026, [5], 'outside').map((order) => order.type)).toEqual(['outside'])
    expect(areas.ordersOf('alfa', 2026, [11], 'monthly')[0]).toMatchObject({ approval: 'pending', year: 2026, month: 11 })
    expect(areas.ordersOf('beta', 2026, [3], 'monthly')).toEqual([])
    expect(areas.ordersOf('alfa', 2026, [7], 'monthly')).toEqual([])
  })

  it('lists its products with their own units, and never adds two units together', () => {
    const february = areas.areaFigures('alfa', 2026, [2], 'monthly')
    expect(february.products.map((row) => [row.id, row.amount, row.qty, row.unit])).toEqual([['p1', 120, 12, 'ədəd']])
  })

  it('draws twelve months beside the year before, a missing month empty and the future too', () => {
    const pairs = areas.areaFigures('alfa', 2026, [11], 'monthly').months
    expect(pairs).toHaveLength(12)
    expect(pairs.find((pair) => pair.month === 7)).toMatchObject({ current: null, previous: 100 })
    expect(pairs.find((pair) => pair.month === 12)).toMatchObject({ current: null, previous: 100 })
    expect(pairs.find((pair) => pair.month === 4)).toMatchObject({ current: 200, previous: 100, delta: 100 })
  })
})

describe('clustering pins', () => {
  const point = (id: string, x: number, y: number, weight = 1) => ({ id, x, y, weight, item: id })

  it('gathers pins closer than the radius and leaves the far ones alone, every pin kept', () => {
    const clusters = clusterPoints([point('a', 0, 0, 3), point('b', 10, 10, 2), point('c', 300, 300)], 46)
    expect(clusters.map((cluster) => cluster.members.map((member) => member.id))).toEqual([['a', 'b'], ['c']])
    expect(clusters[0]).toMatchObject({ x: 5, y: 5 })
  })

  it('never hides the chosen pin in a cluster', () => {
    expect(clusterPoints([point('a', 0, 0, 3), point('b', 10, 10, 2)], 46, 'b')).toHaveLength(2)
  })

  it('keeps two records on the very same spot as two members', () => {
    const clusters = clusterPoints([point('a', 5, 5), point('b', 5, 5)], 46)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].members.map((member) => member.id).sort()).toEqual(['a', 'b'])
  })

  it('handles no pins', () => {
    expect(clusterPoints([], 46)).toEqual([])
  })
})
