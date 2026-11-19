import { afterAll, describe, expect, it, vi } from 'vitest'
import { useFixture } from '../test/fixture'

useFixture()
const areas = await import('./areas')
const { clusterPoints } = await import('../exec/map/cluster')
const { AREA_LOCATIONS } = await import('../data/areaLocations')

afterAll(() => vi.useRealTimers())

const dataMonths2026 = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11]

describe('areas and their coordinates', () => {
  it('ships with no coordinates at all: none is ever guessed', () => {
    expect(AREA_LOCATIONS).toEqual({})
    const all = areas.resolveAreas()
    expect(all.map((area) => area.id)).toEqual(['alfa', 'beta', 'delta', 'gamma'])
    expect(all.every((area) => area.location === null && area.locationIssue === null)).toBe(true)
  })

  it('draws a valid pair, refuses one outside Azerbaijan, and names a pair for an unknown area', () => {
    const locations = { alfa: { lat: 40.41, lng: 49.87 }, beta: { lat: 0, lng: 0 }, zz: { lat: 40.4, lng: 49.8 } }
    const [alfa, beta, , gamma] = areas.resolveAreas(locations)
    expect(alfa.location).toEqual({ lat: 40.41, lng: 49.87, source: 'config', note: undefined })
    expect(beta.location).toBeNull()
    expect(beta.locationIssue).toBe('Koordinat Azərbaycan ərazisindən kənardır')
    expect(gamma.location).toBeNull()
    expect(areas.unknownLocationIds(locations)).toEqual(['zz'])
    expect(areas.locationProblem(Number.NaN, 49)).toBe('Koordinat rəqəm deyil')
    expect(areas.locationProblem(39.1, 45.4)).toBeNull()
  })

  it('fills only the gaps with development samples, and marks them as samples', () => {
    const resolved = areas.resolveAreas({ alfa: { lat: 40.41, lng: 49.87 } }, { alfa: { lat: 40.5, lng: 49.5 }, gamma: { lat: 40.5, lng: 49.6 } })
    expect(resolved.find((area) => area.id === 'alfa')!.location!.source).toBe('config')
    expect(resolved.find((area) => area.id === 'gamma')!.location!.source).toBe('sample')
    expect(resolved.find((area) => area.id === 'beta')!.location).toBeNull()
  })
})

describe('one area’s figures', () => {
  it('reads only that area’s lines', () => {
    const alfa = areas.areaFigures('alfa', 2026, dataMonths2026, 'monthly')
    expect([alfa.comparison.current, alfa.comparison.previous, alfa.comparison.delta]).toEqual([1280, 1000, 280])
    expect(alfa.approval).toMatchObject({ approved: 1040, pending: 240 })
    const beta = areas.areaFigures('beta', 2026, dataMonths2026, 'monthly')
    expect([beta.comparison.current, beta.comparison.previous]).toEqual([450, 500])
  })

  it('tells a zero month from a missing one', () => {
    const march = areas.areaFigures('beta', 2026, [3], 'monthly')
    expect(march.state).toBe('zero')
    expect(march.comparison).toMatchObject({ current: 0, previous: 50, delta: -50, pct: -1 })
    expect(march.previousMonth).toMatchObject({ year: 2026, month: 2, amount: 50, delta: -50 })
    expect(areas.areaFigures('alfa', 2026, [7], 'monthly').state).toBe('missing')
    const never = areas.areaFigures('gamma', 2026, dataMonths2026, 'monthly')
    expect(never.state).toBe('zero')
    expect(never.everOrdered).toBe(false)
  })

  it('gives a new area a difference but no percentage', () => {
    const delta = areas.areaFigures('delta', 2026, [1], 'all')
    expect(delta.comparison).toMatchObject({ current: 20, previous: 0, delta: 20, pct: null })
  })

  it('compares January with the December before it', () => {
    expect(areas.areaFigures('alfa', 2026, [1], 'monthly').previousMonth).toMatchObject({ year: 2025, month: 12, amount: 100, delta: 20 })
  })

  it('lists the orders of the period with their approval, and the paid products', () => {
    const may = areas.areaFigures('alfa', 2026, [5], 'all')
    expect(may.orders.map((order) => [order.type, order.amount, order.approval])).toEqual([['monthly', 120, 'approved'], ['outside', 40, null]])
    const february = areas.areaFigures('alfa', 2026, [2], 'monthly')
    expect(february.products.map((row) => [row.id, row.amount, row.qty, row.unit])).toEqual([['p1', 120, 12, 'ədəd']])
    expect(areas.areaFigures('alfa', 2026, [10], 'monthly').orders[0].approval).toBe('pending')
  })

  it('draws the year month by month beside the year before, a missing month empty', () => {
    const july = areas.areaFigures('alfa', 2026, [11], 'monthly').months.find((pair) => pair.month === 7)!
    expect(july).toMatchObject({ current: null, previous: 100 })
  })
})

describe('every area in a period', () => {
  it('keeps areas without orders in the list, with a zero and no invented change', () => {
    const rows = areas.areaRows(areas.resolveAreas(), 2026, [3], 'monthly')
    const byId = Object.fromEntries(rows.map((row) => [row.area.id, row]))
    expect(byId.alfa).toMatchObject({ amount: 120, previous: 100, delta: 20 })
    expect(byId.beta).toMatchObject({ amount: 0, previous: 50, delta: -50, pct: -1 })
    expect(byId.gamma).toMatchObject({ amount: 0, previous: 0, delta: 0, pct: null })
  })
})

describe('clustering pins', () => {
  const point = (id: string, x: number, y: number, weight = 1) => ({ id, x, y, weight, item: id })

  it('gathers pins closer than the radius and leaves the far ones alone', () => {
    const clusters = clusterPoints([point('a', 0, 0, 3), point('b', 10, 10, 2), point('c', 300, 300)], 46)
    expect(clusters.map((cluster) => cluster.members.map((member) => member.id))).toEqual([['a', 'b'], ['c']])
    expect(clusters[0]).toMatchObject({ x: 5, y: 5 })
  })

  it('never hides the chosen pin in a cluster', () => {
    const clusters = clusterPoints([point('a', 0, 0, 3), point('b', 10, 10, 2)], 46, 'b')
    expect(clusters).toHaveLength(2)
  })

  it('handles no pins', () => {
    expect(clusterPoints([], 46)).toEqual([])
  })
})
