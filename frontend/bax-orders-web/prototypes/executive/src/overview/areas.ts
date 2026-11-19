import { AREA_LOCATIONS, type AreaLocation } from '../data/areaLocations'
import type { Kind } from '../data/analysis'
import { allSuppliers, linesOfEveryYear, monthsWithDataIn, sites, type Line, type Site } from '../data/model'
import {
  amountOver, approvalSplit, compareYears, hasMonth, isInProgress, linesIn, monthPairs, shareBy, statusOf,
  type ApprovalSplit, type MonthPair, type ShareRow, type YearComparison,
} from './metrics'

/*
 * The operational areas of the map. An area is an object of the figures («Obyekt»: a park, a street, a base) — the only
 * place the workbook names, so its id is the object's id and every figure of an area is the sum of that object's own
 * lines, never matched by a display name. Coordinates come from `AREA_LOCATIONS` (or, later, from the figures); an area
 * without them is still an area — in the list, with its figures — it just has no pin.
 */

export type LocationSource = 'data' | 'config' | 'sample'

export interface Area {
  /** Stable: the object's id in the figures. */
  id: string
  name: string
  location: { lat: number; lng: number; source: LocationSource; note?: string } | null
  /** Why a given pair was not drawn: outside Azerbaijan, not a number. */
  locationIssue: string | null
}

/** Azerbaijan's extent with a small margin (Naxçıvan to the Caspian shore, Astara to Balakən). */
const BOUNDS = { south: 38.3, north: 41.95, west: 44.7, east: 50.9 }

/** Why a pair cannot be a place in Azerbaijan, or null when it can. */
export function locationProblem(lat: unknown, lng: unknown): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return 'Koordinat rəqəm deyil'
  if (lat < BOUNDS.south || lat > BOUNDS.north || lng < BOUNDS.west || lng > BOUNDS.east) return 'Koordinat Azərbaycan ərazisindən kənardır'
  return null
}

type SiteWithPlace = Site & { lat?: unknown; lng?: unknown }

/**
 * Every object as an area, alphabetically. A pair in the figures wins over the configured one; `sample` (development
 * only, see `devSample`) fills in for areas that have neither, and says so.
 */
export function resolveAreas(locations: Readonly<Record<string, AreaLocation>> = AREA_LOCATIONS, sample?: Readonly<Record<string, AreaLocation>>): Area[] {
  return [...sites.values()]
    .map((site: SiteWithPlace): Area => {
      const own = site.lat !== undefined || site.lng !== undefined ? { lat: site.lat, lng: site.lng, source: 'data' as const } : null
      const configured = locations[site.id] ? { ...locations[site.id], source: 'config' as const } : null
      const given = own ?? configured
      if (given) {
        const problem = locationProblem(given.lat, given.lng)
        if (problem) return { id: site.id, name: site.name, location: null, locationIssue: problem }
        return { id: site.id, name: site.name, location: { lat: given.lat as number, lng: given.lng as number, source: given.source, note: 'note' in given ? given.note : undefined }, locationIssue: null }
      }
      const example = sample?.[site.id]
      if (example) return { id: site.id, name: site.name, location: { ...example, source: 'sample' }, locationIssue: null }
      return { id: site.id, name: site.name, location: null, locationIssue: null }
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'az'))
}

/** Configured ids the figures do not have: a pair for an object that is not there (a typo, a renamed object). */
export function unknownLocationIds(locations: Readonly<Record<string, AreaLocation>> = AREA_LOCATIONS): string[] {
  return Object.keys(locations).filter((id) => !sites.has(id))
}

/* ---- One area's figures ---------------------------------------------------------------------------------------------- */

/** How a period's figure stands: orders, none in a month that has figures, or a month with no figures at all. */
export type FigureState = 'orders' | 'zero' | 'missing'

export interface AreaOrder {
  key: string
  type: 'monthly' | 'outside'
  month: number
  /** Outside-monthly only: the day and the reason, when the source has them. */
  day?: number
  reason?: string
  amount: number
  lines: number
  approval: 'approved' | 'pending' | null
}

export interface AreaProduct extends ShareRow {
  unit: string | null
  qty: number | null
  lines: number
  /** The latest month of the period it was ordered in: where its page opens. */
  lastMonth: number
}

export interface AreaFigures {
  state: FigureState
  /** The period has a month still running: its figure can grow. */
  inProgress: boolean
  comparison: YearComparison
  /** Against the month before, for a one-month period; null otherwise or when that month has no figures. */
  previousMonth: { year: number; month: number; amount: number; delta: number; pct: number | null } | null
  approval: ApprovalSplit
  /** The area's months of the focus year beside the year before, January to the year's last month. */
  months: MonthPair[]
  categories: ShareRow[]
  products: AreaProduct[]
  orders: AreaOrder[]
  suppliers: { name: string; amount: number }[]
  /** The area has an order in any year: an area with none at all is named as such. */
  everOrdered: boolean
}

const orderedEver = new Set(linesOfEveryYear.map((line) => line.siteId))

const round2 = (value: number) => Math.round(value * 100) / 100

export function areaFigures(siteId: string, year: number, months: readonly number[], kind: Kind): AreaFigures {
  const scope = { siteId }
  const comparison = compareYears(year, months, kind, scope)
  const lines: Line[] = months.flatMap((month) => linesIn(year, month, { kind, siteId }))
  const state: FigureState = months.length === 0 || months.every((month) => !hasMonth(year, month)) ? 'missing' : lines.length ? 'orders' : 'zero'

  let previousMonth: AreaFigures['previousMonth'] = null
  if (months.length === 1) {
    const before = months[0] === 1 ? { year: year - 1, month: 12 } : { year, month: months[0] - 1 }
    if (hasMonth(before.year, before.month)) {
      const amount = amountOver(before.year, [before.month], { kind, siteId })
      const delta = round2(comparison.current - amount)
      previousMonth = { ...before, amount, delta, pct: amount ? delta / amount : null }
    }
  }

  const last = monthsWithDataIn(year).at(-1) ?? 12
  const productRows = shareBy(year, months, kind, 'product', scope)
  const products: AreaProduct[] = productRows.slice(0, 12).map((row) => {
    const own = lines.filter((line) => line.productId === row.id)
    const units = [...new Set(own.map((line) => line.unit))]
    return {
      ...row,
      unit: units.length === 1 ? units[0] : null,
      qty: units.length === 1 ? own.reduce((total, line) => total + line.qty, 0) : null,
      lines: own.length,
      lastMonth: Math.max(...own.map((line) => line.month)),
    }
  })

  const orders: AreaOrder[] = []
  for (const month of months) {
    const monthly = linesIn(year, month, { kind: 'monthly', siteId })
    if (kind !== 'outside' && monthly.length) {
      orders.push({ key: `m-${month}`, type: 'monthly', month, amount: round2(monthly.reduce((sum, line) => sum + line.amount, 0)), lines: monthly.length, approval: statusOf(year, month) })
    }
    if (kind !== 'monthly') {
      const outside = linesIn(year, month, { kind: 'outside', siteId })
      const byOrder = new Map<string, Line[]>()
      for (const line of outside) byOrder.set(line.orderId, [...(byOrder.get(line.orderId) ?? []), line])
      for (const [orderId, group] of byOrder) {
        orders.push({ key: orderId, type: 'outside', month, amount: round2(group.reduce((sum, line) => sum + line.amount, 0)), lines: group.length, approval: null })
      }
    }
  }
  orders.sort((left, right) => right.month - left.month || (left.type === right.type ? right.amount - left.amount : left.type === 'monthly' ? -1 : 1))

  const bySupplier = new Map<string, number>()
  for (const line of lines) bySupplier.set(line.supplierId, (bySupplier.get(line.supplierId) ?? 0) + line.amount)

  return {
    state,
    inProgress: months.some((month) => isInProgress(year, month)),
    comparison,
    previousMonth,
    approval: approvalSplit(year, months, scope),
    months: monthPairs(year, Array.from({ length: last }, (_, index) => index + 1), kind, scope),
    categories: shareBy(year, months, kind, 'root', scope),
    products,
    orders,
    suppliers: [...bySupplier]
      .map(([id, amount]) => ({ name: allSuppliers.get(id)?.name ?? id, amount: round2(amount) }))
      .filter((row) => row.amount > 0)
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 5),
    everOrdered: orderedEver.has(siteId),
  }
}

/** Every area's amount over the period, and its change against the same months a year before: the list and the pins. */
export interface AreaRow {
  area: Area
  amount: number
  previous: number | null
  delta: number | null
  pct: number | null
}

export function areaRows(areas: readonly Area[], year: number, months: readonly number[], kind: Kind): AreaRow[] {
  const current = new Map(shareBy(year, months, kind, 'site').map((row) => [row.id, row]))
  const compared = compareYears(year, months, kind)
  const before = compared.previousYear !== null && compared.aligned.length
    ? new Map(shareBy(compared.previousYear, compared.aligned, kind, 'site').map((row) => [row.id, row.amount]))
    : null
  return areas.map((area) => {
    const amount = current.get(area.id)?.amount ?? 0
    const aligned = compared.aligned.length === months.length ? amount : amountOver(year, compared.aligned, { kind, siteId: area.id })
    const previous = before ? before.get(area.id) ?? 0 : null
    const delta = previous === null ? null : round2(aligned - previous)
    return { area, amount, previous, delta, pct: previous ? (aligned - previous) / previous : null }
  })
}
