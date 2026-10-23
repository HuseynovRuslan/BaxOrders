import { useLocation, useSearchParams } from 'react-router'
import {
  approvalOf, figure, hasData, kindOptions, linesFor, outsideRequestsIn, quantityOf, resolvePeriod,
  type Basis, type Kind, type MonthTile, type Period, type QuantityFigure,
} from '../data/analysis'
import { categories, DATA_UPDATED_AT, linesById, monthsWithData, products, sites, TODAY, YEAR, type Line } from '../data/model'
import { minus, moneyParts, monthName, monthRange, percent } from './format'
import { paths, useComparison } from './links'
import { packageWords } from '../ui/kinds'

/*
 * The year as every year screen reads it: the order kind and the comparison from the address, and — on the year screen
 * — the Rəhbər's filters: a range of months, an object, a category at any of its three levels. Every figure is read
 * for that one scope, from `analysis` exactly: the months, the total, the changes, the cards. A comparison is always of
 * the same kind of order and the same scope. Approval stays the month's: one decision for all of its monthly orders,
 * whatever part of them a filter shows.
 */

export const kindNames: Record<Kind, string> = Object.fromEntries(kindOptions.map((option) => [option.value, option.label])) as Record<Kind, string>
export const kindOrder: readonly Kind[] = ['monthly', 'outside', 'all']

/** «… görə»: what a month's change is measured against, under each comparison choice. */
export const basisReference: Record<Basis, string> = {
  previous: 'əvvəlki aya görə',
  avg3: 'əvvəlki 3 ayın ortalamasına görə',
  avg6: 'əvvəlki 6 ayın ortalamasına görə',
  all: 'bütün əvvəlki ayların ortalamasına görə',
}

export const updatedText = `${DATA_UPDATED_AT.day} ${monthName(DATA_UPDATED_AT.month).toLocaleLowerCase('az')} ${DATA_UPDATED_AT.year}, ${DATA_UPDATED_AT.time}`

const round2 = (value: number) => Math.round(value * 100) / 100
const amountOf = (lines: readonly Line[]) => round2(lines.reduce((total, line) => total + line.amount, 0))

/* ---- Scope and filters ------------------------------------------------------------------------------------------- */

/** Where in the year a figure is read: one kind of order, optionally one object, one category (any level), one product. */
export interface YearScope {
  kind: Kind
  siteId?: string
  categoryId?: string
  productId?: string
}

/** How the chart groups the scope: by month (the default), by object, or by one level of the catalogue. */
export type Grouping = 'aylar' | 'obyekt' | 'ana' | 'orta' | 'alt'

export const groupings: readonly { value: Grouping; label: string }[] = [
  { value: 'aylar', label: 'Aylar' },
  { value: 'obyekt', label: 'Obyektlər' },
  { value: 'ana', label: 'Ana kateqoriyalar' },
  { value: 'orta', label: 'Orta kateqoriyalar' },
  { value: 'alt', label: 'Alt kateqoriyalar' },
]

/** The year screen's filters, as the address carries them. */
export interface YearFilters {
  group: Grouping
  from: number
  to: number
  site?: string
  root?: string
  mid?: string
  leaf?: string
}

export const filterParams = { group: 'qrup', from: 'ay1', to: 'ay2', site: 'obyekt', root: 'ana', mid: 'orta', leaf: 'alt' } as const
type FilterKey = keyof typeof filterParams

const categoryAt = (id: string | null, level: number) => (id && categories.get(id)?.level === level ? id : undefined)

/**
 * The filters from the address, made to hang together: a sub-category brings its parents with it, and a parent that
 * does not match it drops it — so the three levels are always one path, Ana → Orta → Alt.
 */
export function readFilters(params: URLSearchParams): YearFilters {
  const month = (value: string | null, fallback: number) => {
    const number = Number(value)
    return value && Number.isInteger(number) && number >= 1 && number <= 12 ? number : fallback
  }
  let from = month(params.get(filterParams.from), 1)
  let to = month(params.get(filterParams.to), 12)
  if (from > to) [from, to] = [to, from]
  const asked = params.get(filterParams.group)
  const group = groupings.some((item) => item.value === asked) ? asked as Grouping : 'aylar'
  const site = sites.has(params.get(filterParams.site) ?? '') ? params.get(filterParams.site)! : undefined
  let root = categoryAt(params.get(filterParams.root), 1)
  let mid = categoryAt(params.get(filterParams.mid), 2)
  let leaf = categoryAt(params.get(filterParams.leaf), 3)
  if (leaf) {
    const parent = categories.get(leaf)!.parentId!
    if (mid && mid !== parent) leaf = undefined
    else mid = parent
  }
  if (mid) {
    const parent = categories.get(mid)!.parentId!
    if (root && root !== parent) { mid = undefined; leaf = undefined } else root = parent
  }
  return { group, from, to, site, root, mid, leaf }
}

export const scopeOf = (filters: YearFilters, kind: Kind): YearScope => ({ kind, siteId: filters.site, categoryId: filters.leaf ?? filters.mid ?? filters.root })

const monthsBetween = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index)

const inCategory = (productId: string, categoryId: string) => {
  const product = products.get(productId)!
  return product.rootId === categoryId || product.midId === categoryId || product.leafId === categoryId
}

/** The month's outside-monthly requests in the scope — for a category, only the lines that belong to it. */
export function scopeRequests(month: number, scope: YearScope) {
  return outsideRequestsIn(month, scope.siteId)
    .map((request) => {
      if (!scope.categoryId) return request
      const lines = request.lineIds.map((id) => linesById.get(id)!).filter((line) => inCategory(line.productId, scope.categoryId!))
      return { ...request, lineIds: lines.map((line) => line.id), amount: amountOf(lines) }
    })
    .filter((request) => request.lineIds.length > 0)
}

/** The month split by kind, within the scope. */
export function scopeSplit(month: number, scope: YearScope) {
  const of = (kind: Kind) => amountOf(linesFor(month, { ...scope, kind }))
  return { monthly: of('monthly'), outside: of('outside'), all: of('all'), outsideCount: scopeRequests(month, scope).length }
}

/** The twelve months for a scope — the same rules as `yearTiles`, read for the scope. With no filter they are the same. */
export function scopeTiles(scope: YearScope, basis: Basis = 'previous'): MonthTile[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const future = YEAR > TODAY.year || (YEAR === TODAY.year && month > TODAY.month)
    if (!hasData(month)) {
      return { month, state: future ? 'future' : 'empty', amount: null, approval: null, period: null, comparison: null, delta: null, pct: null, objects: 0, outsideCount: 0, comparable: false, latest: false }
    }
    const lines = linesFor(month, scope)
    const amount = amountOf(lines)
    const period = resolvePeriod(month, basis)
    const whole = !period.unavailable && !period.incomplete
    const comparison = period.unavailable ? null : round2(amountOf(period.months.flatMap((item) => linesFor(item, scope))) / period.months.length)
    return {
      month,
      state: 'data',
      amount,
      approval: approvalOf(month),
      period,
      comparison,
      delta: whole && comparison !== null ? round2(amount - comparison) : null,
      pct: whole && comparison ? (amount - comparison) / comparison : null,
      objects: new Set(lines.map((line) => line.siteId)).size,
      outsideCount: scopeRequests(month, scope).length,
      comparable: whole,
      latest: month === monthsWithData[monthsWithData.length - 1],
    }
  })
}

/** The page a month opens for the scope: the month, an object in it, a category in it, or a category of an object. */
export function scopePath(month: number, scope: YearScope): string {
  if (scope.categoryId) return paths.category(YEAR, month, scope.categoryId, scope.siteId)
  if (scope.siteId) return paths.site(YEAR, month, scope.siteId)
  return paths.month(YEAR, month)
}

/* ---- The reading -------------------------------------------------------------------------------------------------- */

/** The year as the screens read it: the kind, the comparison and the filters in the address, one scope for everything. */
export function useYearReading() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { kind, basis, setBasis, link } = useComparison(1)
  const filters = readFilters(params)
  const scope = scopeOf(filters, kind)
  const months = monthsBetween(filters.from, filters.to)
  const inRange = (tile: MonthTile) => tile.month >= filters.from && tile.month <= filters.to
  const tiles = scopeTiles(scope, basis).filter(inRange)
  const monthly = scopeTiles({ ...scope, kind: 'monthly' }).filter(inRange)
  const withData = tiles.filter((tile) => tile.state === 'data')
  const sumOf = (of: Kind) => round2(months.reduce((total, month) => total + amountOf(linesFor(month, { ...scope, kind: of })), 0))
  const approved = monthly.filter((tile) => tile.approval?.state === 'approved')
  const total = {
    amount: sumOf(kind),
    months: withData.map((tile) => tile.month),
    approvedPackage: round2(approved.reduce((sum, tile) => sum + (tile.amount ?? 0), 0)),
    monthly: sumOf('monthly'),
    outside: sumOf('outside'),
    outsideCount: months.reduce((count, month) => count + scopeRequests(month, scope).length, 0),
  }

  // A change of filter is a new reading of the same place: it replaces the entry, keeps the scroll, and closes an
  // open row of the split (its id may not be in the new scope).
  const write = (changes: Partial<Record<FilterKey, string | null>>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      const name = filterParams[key as FilterKey]
      if (value) next.set(name, value)
      else next.delete(name)
    }
    next.delete('sec')
    next.delete('yol')
    setParams(next, { replace: true, preventScrollReset: true })
  }

  return {
    kind,
    basis,
    setBasis,
    filters,
    scope,
    /** The months in the range, with data or not. */
    months,
    /** An object or a category narrows the scope. */
    scoped: Boolean(scope.siteId || scope.categoryId),
    /** Any filter is on, the range included. */
    filtered: Boolean(scope.siteId || scope.categoryId || filters.from !== 1 || filters.to !== 12),
    /** The scope has orders in the range: without them the screen says so, rather than showing zeros. */
    hasOrders: withData.some((tile) => (tile.amount ?? 0) > 0),
    /** The range holds no month with data yet (November and December, today). */
    notStarted: withData.length === 0,
    tiles,
    total,
    totals: { monthly: total.monthly, outside: total.outside, all: sumOf('all') } as Record<Kind, number>,
    approvedMonths: approved.length,
    approvedAmount: total.approvedPackage,
    waiting: monthly.filter((tile) => tile.approval?.state === 'pending'),
    latest: withData.at(-1) ?? null,
    peak: withData.reduce<MonthTile | null>((best, tile) => ((tile.amount ?? 0) > (best?.amount ?? -1) ? tile : best), null),
    largest: Math.max(0, ...withData.map((tile) => tile.amount ?? 0)),
    period: withData.length ? monthRange(total.months, YEAR) : `${monthName(filters.from)}–${monthName(filters.to)} ${YEAR}`,
    monthlyTiles: monthly,
    /** A month's page for the scope: the month, or the object or category in it. */
    monthHref: (month: number) => link(scopePath(month, scope)),
    /** Any page's address, keeping the kind and the comparison. */
    href: (path: string, extra?: Record<string, string>) => link(path, extra),
    /** The same screen for another kind of order: the filters stay, an open card closes. */
    kindHref: (next: Kind) => {
      const nextParams = new URLSearchParams(location.search)
      const value = kindOptions.find((option) => option.value === next)!.param
      if (value) nextParams.set('nov', value)
      else nextParams.delete('nov')
      for (const name of ['panel', 'sec', 'yol', 'bolgu']) nextParams.delete(name)
      const query = nextParams.toString()
      return query ? `${location.pathname}?${query}` : location.pathname
    },
    setFilters: write,
    /** Every filter chip off: the whole year, every object and category. The kind, the comparison and the grouping stay. */
    resetFilters: () => write({ from: null, to: null, site: null, root: null, mid: null, leaf: null }),
  }
}

export type YearReading = ReturnType<typeof useYearReading>

/* ---- What the filters can be set to, and the grouped chart --------------------------------------------------------- */

export interface Option { id: string; name: string; amount: number }

const sumBy = (lines: readonly Line[], keyOf: (line: Line) => string) => {
  const groups = new Map<string, number>()
  for (const line of lines) groups.set(keyOf(line), (groups.get(keyOf(line)) ?? 0) + line.amount)
  return groups
}

/**
 * What each filter can be set to, given the others: the objects with orders in the chosen category, the categories
 * with orders at the chosen object, a middle level only under a chosen top one, a bottom level only under a middle one.
 */
export function filterOptions(filters: YearFilters, kind: Kind) {
  const months = monthsBetween(filters.from, filters.to)
  const linesIn = (scope: YearScope) => months.flatMap((month) => linesFor(month, scope))
  const list = (groups: Map<string, number>, nameOf: (id: string) => string, keep?: string): Option[] => {
    if (keep && !groups.has(keep)) groups.set(keep, 0)
    return [...groups].map(([id, amount]) => ({ id, name: nameOf(id), amount: round2(amount) })).sort((left, right) => left.name.localeCompare(right.name, 'az'))
  }
  const categoryName = (id: string) => categories.get(id)!.name
  return {
    sites: list(sumBy(linesIn({ kind, categoryId: filters.leaf ?? filters.mid ?? filters.root }), (line) => line.siteId), (id) => sites.get(id)!.name, filters.site),
    roots: list(sumBy(linesIn({ kind, siteId: filters.site }), (line) => products.get(line.productId)!.rootId), categoryName, filters.root),
    mids: filters.root ? list(sumBy(linesIn({ kind, siteId: filters.site, categoryId: filters.root }), (line) => products.get(line.productId)!.midId), categoryName, filters.mid) : [],
    leaves: filters.mid ? list(sumBy(linesIn({ kind, siteId: filters.site, categoryId: filters.mid }), (line) => products.get(line.productId)!.leafId), categoryName, filters.leaf) : [],
  }
}

/** One bar of the grouped chart: an object or a category, its amount over the range, and its latest month's change. */
export interface GroupRow {
  id: string
  name: string
  /** The level above, for a middle or bottom category: its names repeat under different parents. */
  parent?: string
  amount: number
  share: number
  change: Change
  /** The filter a click on the bar sets, and the grouping it opens next. */
  filter: 'site' | 'root' | 'mid' | 'leaf'
  next: Grouping
}

/**
 * The scope over the range, grouped by object or by one level of the catalogue, largest first. Each row's change is
 * its latest month in the range against the chosen comparison — the same kind, the same scope, narrowed to the row.
 */
export function groupRows(filters: YearFilters, kind: Kind, basis: Basis, latest: number | null): GroupRow[] {
  if (filters.group === 'aylar') return []
  const scope = scopeOf(filters, kind)
  const lines = monthsBetween(filters.from, filters.to).flatMap((month) => linesFor(month, scope))
  const key: Record<Exclude<Grouping, 'aylar'>, (line: Line) => string> = {
    obyekt: (line) => line.siteId,
    ana: (line) => products.get(line.productId)!.rootId,
    orta: (line) => products.get(line.productId)!.midId,
    alt: (line) => products.get(line.productId)!.leafId,
  }
  const groups = sumBy(lines, key[filters.group])
  const whole = [...groups.values()].reduce((sum, value) => sum + value, 0)
  const period = latest ? resolvePeriod(latest, basis) : null
  const filter = ({ obyekt: 'site', ana: 'root', orta: 'mid', alt: 'leaf' } as const)[filters.group]
  const next = ({ obyekt: 'ana', ana: 'orta', orta: 'alt', alt: 'aylar' } as const)[filters.group]
  return [...groups].map(([id, amount]) => {
    const rowScope: YearScope = filter === 'site' ? { ...scope, siteId: id } : { ...scope, categoryId: id }
    const category = filter === 'site' ? null : categories.get(id)!
    return {
      id,
      name: category ? category.name : sites.get(id)!.name,
      // The level above only where it tells something: not when it is the very category the filter already names.
      parent: category?.parentId && category.parentId !== (filters.mid ?? filters.root) ? categories.get(category.parentId)!.name : undefined,
      amount: round2(amount),
      share: whole ? amount / whole : 0,
      change: latest && period ? changeOfFigure(figure(latest, period, rowScope), period) : { kind: 'none', text: 'müqayisə yoxdur', detail: 'Seçilmiş dövrdə sifariş yoxdur.' },
      filter,
      next,
    } satisfies GroupRow
  }).sort((left, right) => right.amount - left.amount)
}

/* ---- Reading a figure ----------------------------------------------------------------------------------------------- */

export const isCurrent = (tile: MonthTile) => tile.latest && tile.month === TODAY.month

/** To the manat, for a chart or a cell: «35.444 ₼». The exact figure is always one step away. */
export const rounded = (value: number | null) => (value === null ? '—' : `${moneyParts(Math.round(value)).whole} ₼`)

export function signedRounded(value: number | null): string {
  if (value === null) return '—'
  const whole = moneyParts(Math.round(Math.abs(value))).whole
  return `${value > 0 ? '+' : value < 0 ? minus : ''}${whole} ₼`
}

/** A month's change against the chosen comparison, or why there is none — never a percentage it cannot stand behind. */
export type Change =
  | { kind: 'value'; way: 'up' | 'down' | 'flat'; pct: number; delta: number; text: string }
  | { kind: 'none'; text: string; detail: string }

export function changeOf(tile: MonthTile): Change {
  const period = tile.period
  if (tile.state === 'data' && !tile.amount) return { kind: 'none', text: 'sifariş yoxdur', detail: 'Bu ay seçilmiş filtrdə sifariş yoxdur.' }
  if (!period || period.unavailable) return { kind: 'none', text: 'müqayisə yoxdur', detail: 'Müqayisə üçün əvvəlki ay yoxdur.' }
  if (period.incomplete) {
    return { kind: 'none', text: 'məlumat azdır', detail: `Müqayisə üçün məlumat azdır: ${period.wanted} ay lazımdır, ${period.months.length} ay var.` }
  }
  if (tile.pct === null || tile.delta === null) return { kind: 'none', text: tile.amount ? 'yeni' : 'sifariş yoxdur', detail: 'Müqayisə dövründə sifariş yoxdur.' }
  const way = Math.abs(tile.delta) < 0.005 ? 'flat' : tile.delta > 0 ? 'up' : 'down'
  return { kind: 'value', way, pct: tile.pct, delta: tile.delta, text: percent(tile.pct) }
}

/** The same rules for a figure of one part of a month. */
function changeOfFigure(f: ReturnType<typeof figure>, period: Period): Change {
  if (!f.current) return { kind: 'none', text: 'sifariş yoxdur', detail: 'Son ayda seçilmiş filtrdə sifariş yoxdur.' }
  if (period.unavailable) return { kind: 'none', text: 'müqayisə yoxdur', detail: 'Müqayisə üçün əvvəlki ay yoxdur.' }
  if (period.incomplete) {
    return { kind: 'none', text: 'məlumat azdır', detail: `Müqayisə üçün məlumat azdır: ${period.wanted} ay lazımdır, ${period.months.length} ay var.` }
  }
  if (f.pct === null || f.delta === null) return { kind: 'none', text: f.current ? 'yeni' : 'sifariş yoxdur', detail: f.current ? 'Müqayisə dövründə sifariş yoxdur.' : 'Son ayda sifariş yoxdur.' }
  const way = Math.abs(f.delta) < 0.005 ? 'flat' : f.delta > 0 ? 'up' : 'down'
  return { kind: 'value', way, pct: f.pct, delta: f.delta, text: percent(f.pct) }
}

export const arrowOf = (way: 'up' | 'down' | 'flat') => (way === 'up' ? '▲' : way === 'down' ? '▼' : '•')

/**
 * Under a month: the monthly orders' approval; for the outside-monthly requests, how many there were (each has its
 * own consent); for «Hamısı», nothing — it is spending, not an amount to approve.
 */
export type Status = { tone: 'approved' | 'pending' | 'count' | 'none'; short: string; long: string }

export function statusOf(tile: MonthTile, kind: Kind): Status {
  if (kind === 'outside') return { tone: 'count', short: `${tile.outsideCount} sifariş`, long: `${tile.outsideCount} aylıqdan kənar sifariş, hər biri ayrıca razılıqla` }
  if (kind === 'all' || !tile.approval) return { tone: 'none', short: '', long: '' }
  return tile.approval.state === 'approved'
    ? { tone: 'approved', short: 'Təsdiqlənib', long: packageWords(tile.approval) }
    : { tone: 'pending', short: 'Təsdiq gözləyir', long: packageWords(tile.approval) }
}

/* ---- The year inside a scope, for the cards' details ----------------------------------------------------------------- */

const yearLines = (scope: YearScope, months?: readonly number[]) =>
  Array.from({ length: 12 }, (_, index) => (!months || months.includes(index + 1) ? linesFor(index + 1, scope) : []))

/** The scope's amount in each month, January to December; months outside the range are zero. */
export function yearMonths(scope: YearScope, months?: readonly number[]): number[] {
  return yearLines(scope, months).map(amountOf)
}

/** One step down the catalogue from a scope: its categories one level under, or — under a sub-category — its products. */
export interface YearChild {
  id: string
  name: string
  type: 'category' | 'product' | 'site'
  amount: number
  /** Of the scope's amount over the range. */
  share: number
  /** Products only: the quantity in its unit(s) and the weighted price — never units added together. */
  quantity?: QuantityFigure
}

const withShares = <T extends { amount: number }>(rows: T[]) => {
  const whole = rows.reduce((total, row) => total + row.amount, 0)
  return rows.map((row) => ({ ...row, share: whole ? row.amount / whole : 0 })).sort((left, right) => right.amount - left.amount)
}

export function yearChildren(scope: YearScope, months?: readonly number[]): YearChild[] {
  const level = scope.categoryId ? categories.get(scope.categoryId)!.level : 0
  const keyOf = (productId: string) => {
    const product = products.get(productId)!
    return level === 0 ? product.rootId : level === 1 ? product.midId : level === 2 ? product.leafId : productId
  }
  const lines = yearLines(scope, months).flat()
  const groups = new Map<string, Line[]>()
  for (const line of lines) groups.set(keyOf(line.productId), [...(groups.get(keyOf(line.productId)) ?? []), line])
  return withShares([...groups].map(([id, group]) => ({
    id,
    name: level === 3 ? products.get(id)!.name : categories.get(id)!.name,
    type: (level === 3 ? 'product' : 'category') as YearChild['type'],
    amount: amountOf(group),
    quantity: level === 3 ? quantityOf(group) : undefined,
  })))
}

/** The scope's objects over the range, largest first. */
export function yearSites(scope: YearScope, months?: readonly number[]): YearChild[] {
  const groups = sumBy(yearLines(scope, months).flat(), (line) => line.siteId)
  return withShares([...groups].map(([id, amount]) => ({ id, name: sites.get(id)!.name, type: 'site' as const, amount: round2(amount) })))
}

/** The catalogue level a scope's children are at, in the owner's words: Ana → Orta → Alt → Məhsul. */
export function childLevelName(scope: YearScope): string {
  const level = scope.categoryId ? categories.get(scope.categoryId)!.level : 0
  return ['Ana kateqoriyalar', 'Orta kateqoriyalar', 'Alt kateqoriyalar', 'Məhsullar'][level]
}
