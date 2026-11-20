import type { AreaLocation } from '../data/areaLocations'
import { FINANCE_LINK_CANDIDATES, FINANCE_LINKS, type FinanceLink, type FinanceLinkCandidate } from '../data/areaFinanceLinks'
import type { Kind } from '../data/analysis'
import { VISIBLE_LOCATIONS } from '../data/locationVisibility'
import { allSuppliers, linesOfEveryYear, sites, type Line } from '../data/model'
import {
  approvalSplit, hasMonth, isInProgress, linesIn, monthPairs, shareBy, statusOf,
  type ApprovalSplit, type MonthPair, type ShareRow,
} from './metrics'
import { amountFor, comparePeriod, type CompareMode, type PeriodComparison, type YearMonth } from './compare'

/*
 * The map's areas: the owner's location records (data/areaLocations) the map draws — every one but a duplicate the owner
 * has had hidden (data/locationVisibility) — each with the financial object its money belongs to when — and only
 * when — that is written down with its evidence (data/areaFinanceLinks). A location without such a line
 * keeps its pin, its name, its manager and its map link, and shows no money: never a 0 ₼ it did not spend. Figures are
 * the object's own lines, summed by its stable id; an object several locations share is counted once in every total.
 */

/** What is known about a location's money. */
export type Finance =
  | {
    state: 'linked'
    siteId: string
    /** The object's name in the order workbook. */
    siteName: string
    link: FinanceLink
    /** Other locations on the same object: its figures are the whole object's, shown on each of them. */
    sharedWith: string[]
  }
  | {
    state: 'unlinked'
    /** No line at all; a candidate still to be confirmed; a line to an object the figures do not have. */
    reason: 'none' | 'candidate' | 'unknown-site'
    candidate: FinanceLinkCandidate | null
    /** The object a line names that the figures do not have (a renamed object, a typo). */
    missingSiteId: string | null
  }

export interface MapArea {
  location: AreaLocation
  finance: Finance
}

export function resolveMapAreas(
  locations: readonly AreaLocation[] = VISIBLE_LOCATIONS,
  links: Readonly<Record<string, FinanceLink>> = FINANCE_LINKS,
  candidates: Readonly<Record<string, FinanceLinkCandidate>> = FINANCE_LINK_CANDIDATES,
): MapArea[] {
  const bySite = new Map<string, string[]>()
  for (const location of locations) {
    const link = links[location.id]
    if (link && sites.has(link.siteId)) bySite.set(link.siteId, [...(bySite.get(link.siteId) ?? []), location.id])
  }
  return locations.map((location): MapArea => {
    const link = links[location.id]
    if (link && sites.has(link.siteId)) {
      return {
        location,
        finance: {
          state: 'linked',
          siteId: link.siteId,
          siteName: sites.get(link.siteId)!.name,
          link,
          sharedWith: bySite.get(link.siteId)!.filter((id) => id !== location.id),
        },
      }
    }
    const candidate = candidates[location.id] ?? null
    return {
      location,
      finance: {
        state: 'unlinked',
        reason: link ? 'unknown-site' : candidate ? 'candidate' : 'none',
        candidate,
        missingSiteId: link ? link.siteId : null,
      },
    }
  })
}

export const siteOf = (area: MapArea): string | null => (area.finance.state === 'linked' ? area.finance.siteId : null)

/** The objects behind some areas, each once. */
export const distinctSites = (areas: readonly MapArea[]): string[] => [...new Set(areas.map(siteOf).filter((id): id is string => id !== null))]

/** How far the locations and the figures are matched: the map's overview and the audit. */
export interface LinkCoverage {
  locations: number
  linked: number
  /** Linked by the owner's answer, by the data, by the same name. */
  byBasis: Record<FinanceLink['basis'], number>
  candidates: number
  /** Lines naming objects the figures do not have, by location. */
  unknownSites: { locationId: string; siteId: string }[]
  /** Lines for locations the export does not have (a deleted record). */
  orphanLinks: string[]
  /** Objects of the figures no location is linked to. */
  unlinkedSites: { id: string; name: string }[]
  /** Objects more than one location is linked to. */
  sharedSites: { siteId: string; locationIds: string[] }[]
}

export function linkCoverage(areas: readonly MapArea[], links: Readonly<Record<string, FinanceLink>> = FINANCE_LINKS): LinkCoverage {
  const linked = areas.filter((area) => area.finance.state === 'linked')
  const byBasis = { business: 0, data: 0, 'same-name': 0 }
  for (const area of linked) if (area.finance.state === 'linked') byBasis[area.finance.link.basis]++
  const linkedSites = new Set(distinctSites(linked))
  const ids = new Set(areas.map((area) => area.location.id))
  const groups = new Map<string, string[]>()
  for (const area of linked) groups.set(siteOf(area)!, [...(groups.get(siteOf(area)!) ?? []), area.location.id])
  return {
    locations: areas.length,
    linked: linked.length,
    byBasis,
    candidates: areas.filter((area) => area.finance.state === 'unlinked' && area.finance.reason === 'candidate').length,
    unknownSites: areas.flatMap((area) => (area.finance.state === 'unlinked' && area.finance.missingSiteId ? [{ locationId: area.location.id, siteId: area.finance.missingSiteId }] : [])),
    orphanLinks: Object.keys(links).filter((id) => !ids.has(id)),
    unlinkedSites: [...sites.values()].filter((site) => !linkedSites.has(site.id)).map((site) => ({ id: site.id, name: site.name })).sort((a, b) => a.name.localeCompare(b.name, 'az')),
    sharedSites: [...groups].filter(([, locationIds]) => locationIds.length > 1).map(([siteId, locationIds]) => ({ siteId, locationIds })),
  }
}

/* ---- Every area in a period: the list, the pins and the overview -------------------------------------------------- */

export interface AreaRow {
  area: MapArea
  /** The period's amount of the area's object; null without a confirmed object or without figures. */
  amount: number | null
  comparison: PeriodComparison | null
}

export function areaRows(areas: readonly MapArea[], span: readonly YearMonth[], mode: CompareMode, kind: Kind): AreaRow[] {
  const bySite = new Map<string, PeriodComparison>()
  return areas.map((area) => {
    const siteId = siteOf(area)
    if (!siteId) return { area, amount: null, comparison: null }
    let comparison = bySite.get(siteId)
    if (!comparison) bySite.set(siteId, (comparison = comparePeriod(span, mode, kind, [siteId])))
    return { area, amount: comparison.amount, comparison }
  })
}

/** The period's money on the map: every object, the linked ones (each once) and the rest. Null without figures. */
export interface PeriodCoverage {
  total: number | null
  linked: number | null
  unlinked: number | null
  unlinkedSites: { id: string; name: string; amount: number }[]
}

export function periodCoverage(areas: readonly MapArea[], span: readonly YearMonth[], kind: Kind): PeriodCoverage {
  const withFigures = span.filter((at) => hasMonth(at.year, at.month))
  if (withFigures.length === 0) return { total: null, linked: null, unlinked: null, unlinkedSites: [] }
  const linkedIds = new Set(distinctSites(areas))
  const sum = (ids?: readonly string[]) => Math.round(withFigures.reduce((total, at) => total + (amountFor(at, kind, ids) ?? 0), 0) * 100) / 100
  const total = sum()
  const linked = sum([...linkedIds])
  const unlinkedSites = [...sites.values()]
    .filter((site) => !linkedIds.has(site.id))
    .map((site) => ({ id: site.id, name: site.name, amount: sum([site.id]) }))
    .sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name, 'az'))
  return { total, linked, unlinked: Math.round((total - linked) * 100) / 100, unlinkedSites }
}

/* ---- One object's figures ---------------------------------------------------------------------------------------- */

/** How a period's figure stands: orders, none in months that have figures, or no figures at all. */
export type FigureState = 'orders' | 'zero' | 'missing'

export interface AreaOrder {
  key: string
  type: 'monthly' | 'outside'
  year: number
  month: number
  /** Outside-monthly only: the day and the reason, when the source has them (the 2025–2026 workbook has neither). */
  day?: number
  reason?: string
  amount: number
  lines: number
  /** The monthly package's approval; null for outside-monthly orders, which have no approval record. */
  approval: 'approved' | 'pending' | null
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** An object's orders in some months of a year: its monthly order and its outside-monthly requests, newest first. */
export function ordersOf(siteId: string, year: number, months: readonly number[], kind: Kind): AreaOrder[] {
  const orders: AreaOrder[] = []
  for (const month of months) {
    if (kind !== 'outside') {
      const monthly = linesIn(year, month, { kind: 'monthly', siteId })
      if (monthly.length) {
        orders.push({ key: `m-${year}-${month}`, type: 'monthly', year, month, amount: round2(monthly.reduce((sum, line) => sum + line.amount, 0)), lines: monthly.length, approval: statusOf(year, month) })
      }
    }
    if (kind !== 'monthly') {
      const byOrder = new Map<string, Line[]>()
      for (const line of linesIn(year, month, { kind: 'outside', siteId })) byOrder.set(line.orderId, [...(byOrder.get(line.orderId) ?? []), line])
      for (const [orderId, group] of byOrder) {
        orders.push({ key: orderId, type: 'outside', year, month, amount: round2(group.reduce((sum, line) => sum + line.amount, 0)), lines: group.length, approval: null })
      }
    }
  }
  return orders.sort((left, right) => right.month - left.month || (left.type === right.type ? right.amount - left.amount : left.type === 'monthly' ? -1 : 1))
}

export interface AreaProduct extends ShareRow {
  unit: string | null
  /** Null when the lines use more than one unit: quantities in different units are never added. */
  qty: number | null
  lines: number
  /** The latest month of the period it was ordered in: where its page opens. */
  lastMonth: number
}

export interface AreaFigures {
  state: FigureState
  inProgress: boolean
  approval: ApprovalSplit
  /** The object's twelve months of the focus year beside the year before (a month without figures is null). */
  months: MonthPair[]
  categories: ShareRow[]
  products: AreaProduct[]
  orders: AreaOrder[]
  suppliers: { name: string; amount: number }[]
  /** The object has an order in any year. */
  everOrdered: boolean
}

const orderedEver = new Set(linesOfEveryYear.map((line) => line.siteId))

/** One object over the period's months of the focus year (those with figures). */
export function areaFigures(siteId: string, year: number, months: readonly number[], kind: Kind): AreaFigures {
  const scope = { siteId }
  const lines: Line[] = months.flatMap((month) => linesIn(year, month, { kind, siteId }))
  const state: FigureState = months.length === 0 || months.every((month) => !hasMonth(year, month)) ? 'missing' : lines.length ? 'orders' : 'zero'

  const productRows = shareBy(year, months, kind, 'product', scope)
  const products: AreaProduct[] = productRows.map((row) => {
    const own = lines.filter((line) => line.productId === row.id)
    const units = [...new Set(own.map((line) => line.unit))]
    return {
      ...row,
      unit: units.length === 1 ? units[0] : null,
      qty: units.length === 1 ? round2(own.reduce((total, line) => total + line.qty, 0)) : null,
      lines: own.length,
      lastMonth: Math.max(...own.map((line) => line.month)),
    }
  })

  const bySupplier = new Map<string, number>()
  for (const line of lines) bySupplier.set(line.supplierId, (bySupplier.get(line.supplierId) ?? 0) + line.amount)

  return {
    state,
    inProgress: months.some((month) => isInProgress(year, month)),
    approval: approvalSplit(year, months, scope),
    months: monthPairs(year, Array.from({ length: 12 }, (_, index) => index + 1), kind, scope),
    categories: shareBy(year, months, kind, 'root', scope),
    products,
    orders: ordersOf(siteId, year, months, kind),
    suppliers: [...bySupplier]
      .map(([id, amount]) => ({ name: allSuppliers.get(id)?.name ?? id, amount: round2(amount) }))
      .filter((row) => row.amount > 0)
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 5),
    everOrdered: orderedEver.has(siteId),
  }
}
