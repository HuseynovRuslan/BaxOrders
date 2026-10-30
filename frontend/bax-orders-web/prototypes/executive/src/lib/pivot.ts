import { useLocation, useSearchParams } from 'react-router'
import { kindOptions, quantityOf, resolvePeriod, type Basis, type Kind, type QuantityFigure } from '../data/analysis'
import { allLines, allSuppliers, categories, LAST_MONTH_WITH_DATA, monthsWithData, products, sites, YEAR, type Line, type Product } from '../data/model'
import { monthName, percent, shortMonthNames } from './format'
import { paths, useComparison } from './links'
import { filterParams, type Change } from './year'

/*
 * The analysis screen's reading (owner, 2026-10-19 — «Turbo.az kimi»): faceted filters — several objects, categories
 * at the three levels, products; any of the chosen within a filter, every filter together — and the result pivoted by
 * two directions, rows and columns, any of months, objects, companies, the three levels of the catalogue and products. Read from
 * the same order lines as every other screen. The measure is the amount everywhere; quantities only for one product at
 * a time and in its own unit(s), never different products' or units' quantities added together.
 */

export type Dim = 'ay' | 'obyekt' | 'sirket' | 'ana' | 'orta' | 'alt' | 'mehsul'

export const dimLabels: Record<Dim, string> = {
  ay: 'Aylar',
  obyekt: 'Obyektlər',
  sirket: 'Şirkətlər',
  ana: 'Ana kateqoriyalar',
  orta: 'Orta kateqoriyalar',
  alt: 'Alt kateqoriyalar',
  mehsul: 'Məhsullar',
}
/** One of a direction, for a column head: «Obyekt», «Ana kateqoriya». */
export const dimSingular: Record<Dim, string> = { ay: 'Ay', obyekt: 'Obyekt', sirket: 'Şirkət', ana: 'Ana kateqoriya', orta: 'Orta kateqoriya', alt: 'Alt kateqoriya', mehsul: 'Məhsul' }
export const dimOrder: readonly Dim[] = ['ay', 'obyekt', 'sirket', 'ana', 'orta', 'alt', 'mehsul']

export interface Facets {
  sites: string[]
  suppliers: string[]
  roots: string[]
  mids: string[]
  leaves: string[]
  products: string[]
}

export type Sort = 'mebleg' | 'ferq' | 'ad'

export interface Analysis {
  from: number
  to: number
  facets: Facets
  rows: Dim
  cols: Dim | null
  view: 'qrafik' | 'cedvel'
  sort: Sort
}

export const analysisParams = {
  from: 'ay1', to: 'ay2', sites: 'obyekt', suppliers: 'sirket', roots: 'ana', mids: 'orta', leaves: 'alt', products: 'mehsul',
  rows: 'setir', cols: 'sutun', view: 'gorunus', sort: 'sira',
} as const
type ParamKey = keyof typeof analysisParams

const round2 = (value: number) => Math.round(value * 100) / 100
const parentOf = (id: string) => categories.get(id)!.parentId!

const list = (value: string | null, known: (id: string) => boolean) => [...new Set((value ?? '').split(',').filter((id) => id && known(id)))]
const isLevel = (level: number) => (id: string) => categories.get(id)?.level === level

/**
 * The three levels kept one tree of choices: a middle category only under a chosen top one (when any top one is
 * chosen), a bottom one only under a chosen middle one (or, with none, under a chosen top one). Taking a top one off
 * takes its middle and bottom ones with it.
 */
export function normalizeFacets(facets: Facets): Facets {
  const mids = facets.roots.length ? facets.mids.filter((id) => facets.roots.includes(parentOf(id))) : facets.mids
  const leaves = facets.leaves.filter((id) =>
    mids.length ? mids.includes(parentOf(id)) : facets.roots.length ? facets.roots.includes(parentOf(parentOf(id))) : true)
  return { ...facets, mids, leaves }
}

/** The analysis in the address, every id checked against the catalogue and the objects. */
export function readAnalysis(params: URLSearchParams): Analysis {
  const month = (value: string | null, fallback: number) => {
    const number = Number(value)
    return value && Number.isInteger(number) && number >= 1 && number <= 12 ? number : fallback
  }
  let from = month(params.get(analysisParams.from), 1)
  let to = month(params.get(analysisParams.to), 12)
  if (from > to) [from, to] = [to, from]
  const dim = (value: string | null) => (dimOrder.includes(value as Dim) ? value as Dim : null)
  const rows = dim(params.get(analysisParams.rows)) ?? 'obyekt'
  const askedCols = params.get(analysisParams.cols)
  const cols = askedCols === 'yox' ? null : dim(askedCols) ?? (rows === 'ay' ? 'obyekt' : 'ay')
  const sort = (['mebleg', 'ferq', 'ad'] as const).find((item) => item === params.get(analysisParams.sort)) ?? (rows === 'ay' ? 'ad' : 'mebleg')
  return {
    from,
    to,
    facets: normalizeFacets({
      sites: list(params.get(analysisParams.sites), (id) => sites.has(id)),
      suppliers: list(params.get(analysisParams.suppliers), (id) => allSuppliers.has(id)),
      roots: list(params.get(analysisParams.roots), isLevel(1)),
      mids: list(params.get(analysisParams.mids), isLevel(2)),
      leaves: list(params.get(analysisParams.leaves), isLevel(3)),
      products: list(params.get(analysisParams.products), (id) => products.has(id)),
    }),
    rows,
    cols: cols === rows ? null : cols,
    view: params.get(analysisParams.view) === 'cedvel' ? 'cedvel' : 'qrafik',
    sort,
  }
}

/**
 * The three category levels as one choice: a lower level narrows its parent — Yaşıllıq with Bitkilər is the Bitkilər
 * part of Yaşıllıq — and a parent without a chosen child counts whole. Within a level, any of the chosen.
 */
function categoryTest(roots: readonly string[], mids: readonly string[], leaves: readonly string[]): (product: Product) => boolean {
  if (!roots.length && !mids.length && !leaves.length) return () => true
  const leafSet = new Set(leaves)
  const midsNarrowed = new Set(leaves.map(parentOf))
  const midSet = new Set(mids.filter((id) => !midsNarrowed.has(id)))
  const rootsNarrowed = new Set([...mids.map(parentOf), ...leaves.map((id) => parentOf(parentOf(id)))])
  const rootSet = new Set(roots.filter((id) => !rootsNarrowed.has(id)))
  return (product) => leafSet.has(product.leafId) || midSet.has(product.midId) || rootSet.has(product.rootId)
}

type Skip = 'sites' | 'suppliers' | 'categories' | 'mids' | 'leaves' | 'products'

/** Whether a line is inside the filters (months apart), leaving one facet out when that facet's own list is counted. */
function lineTest(kind: Kind, facets: Facets, skip?: Skip): (line: Line) => boolean {
  const siteSet = skip === 'sites' || !facets.sites.length ? null : new Set(facets.sites)
  const productSet = skip === 'products' || !facets.products.length ? null : new Set(facets.products)
  const supplierSet = skip === 'suppliers' || !facets.suppliers.length ? null : new Set(facets.suppliers)
  const category = skip === 'categories' ? () => true
    : skip === 'mids' ? categoryTest(facets.roots, [], [])
      : skip === 'leaves' ? categoryTest(facets.roots, facets.mids, [])
        : categoryTest(facets.roots, facets.mids, facets.leaves)
  return (line) => (kind === 'all' || line.type === kind)
    && (!siteSet || siteSet.has(line.siteId))
    && (!productSet || productSet.has(line.productId))
    && (!supplierSet || supplierSet.has(line.supplierId))
    && category(products.get(line.productId)!)
}

const inRange = (analysis: Analysis) => (line: Line) => line.month >= analysis.from && line.month <= analysis.to

export interface FacetOption { id: string; name: string; parent?: string; amount: number }
export type FacetKey = keyof Facets

/**
 * Each facet's choices with their amounts under every other filter — the way a catalogue shows what is left. The
 * middle level lists only what is under the chosen top ones, the bottom level only what is under the chosen middle (or
 * top) ones. A chosen item stays in its list even when nothing is left for it.
 */
export function facetOptions(analysis: Analysis, kind: Kind): Record<FacetKey, FacetOption[]> {
  const { facets } = analysis
  const range = inRange(analysis)
  const sums = (skip: Skip, keyOf: (line: Line) => string) => {
    const test = lineTest(kind, facets, skip)
    const groups = new Map<string, number>()
    for (const line of allLines) if (range(line) && test(line)) groups.set(keyOf(line), (groups.get(keyOf(line)) ?? 0) + line.amount)
    return groups
  }
  const build = (groups: Map<string, number>, ids: readonly string[], nameOf: (id: string) => string, parentName?: (id: string) => string | undefined, selected: readonly string[] = []) =>
    ids
      .filter((id) => (groups.get(id) ?? 0) > 0 || selected.includes(id))
      .map((id) => ({ id, name: nameOf(id), parent: parentName?.(id), amount: round2(groups.get(id) ?? 0) }))
      .sort((left, right) => left.name.localeCompare(right.name, 'az'))
  const productOf = (line: Line) => products.get(line.productId)!
  const allOf = (level: number) => [...categories.values()].filter((item) => item.level === level)
  const midIds = allOf(2).filter((item) => !facets.roots.length || facets.roots.includes(item.parentId!)).map((item) => item.id)
  const leafIds = allOf(3).filter((item) => facets.mids.length ? facets.mids.includes(item.parentId!) : !facets.roots.length || facets.roots.includes(parentOf(item.parentId!))).map((item) => item.id)
  const categoryName = (id: string) => categories.get(id)!.name
  return {
    sites: build(sums('sites', (line) => line.siteId), [...sites.keys()], (id) => sites.get(id)!.name, undefined, facets.sites),
    suppliers: build(sums('suppliers', (line) => line.supplierId), [...allSuppliers.keys()], (id) => allSuppliers.get(id)!.name, undefined, facets.suppliers),
    roots: build(sums('categories', (line) => productOf(line).rootId), allOf(1).map((item) => item.id), categoryName, undefined, facets.roots),
    mids: build(sums('mids', (line) => productOf(line).midId), midIds, categoryName, (id) => categoryName(parentOf(id)), facets.mids),
    leaves: build(sums('leaves', (line) => productOf(line).leafId), leafIds, categoryName, (id) => categoryName(parentOf(id)), facets.leaves),
    products: build(sums('products', (line) => line.productId), [...products.keys()], (id) => products.get(id)!.name, (id) => categoryName(products.get(id)!.leafId), facets.products),
  }
}

/* ---- The pivot ------------------------------------------------------------------------------------------------------- */

const keyOf: Record<Dim, (line: Line) => string> = {
  ay: (line) => String(line.month),
  obyekt: (line) => line.siteId,
  sirket: (line) => line.supplierId,
  ana: (line) => products.get(line.productId)!.rootId,
  orta: (line) => products.get(line.productId)!.midId,
  alt: (line) => products.get(line.productId)!.leafId,
  mehsul: (line) => line.productId,
}

export function labelOf(dim: Dim, key: string): { name: string; short: string; parent?: string } {
  switch (dim) {
    case 'ay': return { name: monthName(Number(key)), short: shortMonthNames[Number(key) - 1] }
    case 'obyekt': return { name: sites.get(key)!.name, short: sites.get(key)!.name }
    case 'sirket': return { name: allSuppliers.get(key)!.name, short: allSuppliers.get(key)!.name }
    case 'mehsul': return { name: products.get(key)!.name, short: products.get(key)!.name, parent: categories.get(products.get(key)!.leafId)!.name }
    default: {
      const category = categories.get(key)!
      return { name: category.name, short: category.name, parent: category.parentId ? categories.get(category.parentId)!.name : undefined }
    }
  }
}

/** One product's quantities and weighted prices — in its own unit(s) only — and how they moved. */
export interface ProductFigures {
  /** Over the row: the range for a product, the month for a month. */
  range: QuantityFigure
  latest: QuantityFigure
  /** The comparison as a month's average: quantities divided by its months, the weighted price as it is. */
  comparison: QuantityFigure | null
  /** Per cent change of the quantity and of the weighted price, where the unit is one and the same and the comparison whole. */
  qtyPct: number | null
  pricePct: number | null
}

export interface PivotRow {
  key: string
  name: string
  short: string
  parent?: string
  total: number
  cells: Map<string, number>
  /** For a month, its own change; for anything else, the latest month in the range against the comparison. */
  change: Change
  /** The figures the change reads: the row's latest month (a month's own amount) and the comparison, a month's average. */
  current: number
  comparison: number | null
  /** One product's quantities and prices — a product row, or a month row when one product is chosen. */
  product?: ProductFigures
}

export interface PivotColumn { key: string; name: string; short: string; parent?: string; total: number; folded?: string[] }

export interface Pivot {
  rows: PivotRow[]
  cols: PivotColumn[]
  total: number
  /** The latest month in the range that has data, its amount, and the scope's change in it. */
  latest: number | null
  latestAmount: number
  comparisonAmount: number | null
  change: Change
  lines: number
  /** The rows carry quantities and prices (one product each, or one product over its months). */
  withProduct: boolean
  /** One product over its months: its quantity over the range — one product, so its own unit(s) add up. */
  productTotal?: QuantityFigure
}

/** A month's or a row's change, by the rules every screen follows: no orders is not −100 %, a short period no per cent. */
function changeFrom(current: number, comparison: number | null, month: number | null, basis: Basis): Change {
  if (!month) return { kind: 'none', text: 'müqayisə yoxdur', detail: 'Seçilmiş dövrdə sifariş yoxdur.' }
  const period = resolvePeriod(month, basis)
  if (!current) return { kind: 'none', text: 'sifariş yoxdur', detail: `${monthName(month)} ayında bu filtrdə sifariş yoxdur.` }
  if (period.unavailable) return { kind: 'none', text: 'müqayisə yoxdur', detail: 'Müqayisə üçün əvvəlki ay yoxdur.' }
  if (period.incomplete) return { kind: 'none', text: 'məlumat azdır', detail: `Müqayisə üçün məlumat azdır: ${period.wanted} ay lazımdır, ${period.months.length} ay var.` }
  if (!comparison) return { kind: 'none', text: 'yeni', detail: 'Müqayisə dövründə sifariş yoxdur.' }
  const delta = round2(current - comparison)
  const way = Math.abs(delta) < 0.005 ? 'flat' : delta > 0 ? 'up' : 'down'
  return { kind: 'value', way, pct: delta / comparison, delta, text: percent(delta / comparison) }
}

function productFigures(rowLines: Line[], current: Line[], before: Line[], months: number, whole: boolean): ProductFigures {
  const latest = quantityOf(current)
  const raw = before.length ? quantityOf(before) : null
  const comparison = raw && months
    ? { ...raw, qty: raw.qty === null ? null : raw.qty / months, parts: raw.parts.map((part) => ({ ...part, qty: part.qty / months })) }
    : null
  const same = whole && comparison && !latest.mixedUnits && !comparison.mixedUnits && latest.unit === comparison.unit
  return {
    range: quantityOf(rowLines),
    latest,
    comparison,
    qtyPct: same && comparison.qty && latest.qty !== null ? (latest.qty - comparison.qty) / comparison.qty : null,
    pricePct: same && comparison.price && latest.price !== null ? (latest.price - comparison.price) / comparison.price : null,
  }
}

/**
 * The filtered lines over the range, pivoted: one direction as rows, the other (or none) as columns, every row with
 * its total and its change on the comparison — the same filters, the same kind, narrowed to the row.
 */
export function computePivot(analysis: Analysis, kind: Kind, basis: Basis): Pivot {
  const test = lineTest(kind, analysis.facets)
  const range = inRange(analysis)
  const rowKey = keyOf[analysis.rows]
  const colKey = analysis.cols ? keyOf[analysis.cols] : null
  const latest = monthsWithData.filter((month) => month >= analysis.from && month <= Math.min(analysis.to, LAST_MONTH_WITH_DATA)).at(-1) ?? null
  const period = latest ? resolvePeriod(latest, basis) : null
  const periodMonths = new Set(period && !period.unavailable ? period.months : [])
  const nPeriod = periodMonths.size || 1
  const monthRows = analysis.rows === 'ay'

  interface Acc { total: number; cells: Map<string, number>; latest: number; comparison: number; lines: Line[]; latestLines: Line[]; beforeLines: Line[] }
  const rows = new Map<string, Acc>()
  const cols = new Map<string, number>()
  const byMonth = new Map<number, Line[]>()
  let total = 0, latestTotal = 0, comparisonTotal = 0, count = 0
  const rowOf = (key: string) => {
    let row = rows.get(key)
    if (!row) { row = { total: 0, cells: new Map(), latest: 0, comparison: 0, lines: [], latestLines: [], beforeLines: [] }; rows.set(key, row) }
    return row
  }
  for (const line of allLines) {
    if (!test(line)) continue
    const monthLines = byMonth.get(line.month)
    if (monthLines) monthLines.push(line)
    else byMonth.set(line.month, [line])
    if (line.month === latest) {
      latestTotal += line.amount
      if (!monthRows) { const row = rowOf(rowKey(line)); row.latest += line.amount; row.latestLines.push(line) }
    }
    if (periodMonths.has(line.month)) {
      comparisonTotal += line.amount
      if (!monthRows) { const row = rowOf(rowKey(line)); row.comparison += line.amount; row.beforeLines.push(line) }
    }
    if (!range(line)) continue
    const row = rowOf(rowKey(line))
    row.total += line.amount
    row.lines.push(line)
    if (colKey) {
      const key = colKey(line)
      row.cells.set(key, (row.cells.get(key) ?? 0) + line.amount)
      cols.set(key, (cols.get(key) ?? 0) + line.amount)
    }
    total += line.amount
    count++
  }

  const sumOf = (lines: readonly Line[] | undefined) => round2((lines ?? []).reduce((sum, line) => sum + line.amount, 0))
  // Quantities only where they belong to one product: a product's row, or a month's row when one product is chosen.
  const withProduct = !analysis.cols && (analysis.rows === 'mehsul' || (monthRows && analysis.facets.products.length === 1))

  const pivotRows: PivotRow[] = [...rows].filter(([, row]) => row.total > 0).map(([key, row]) => {
    let current: number, comparison: number | null, change: Change
    let product: ProductFigures | undefined
    if (monthRows) {
      const month = Number(key)
      const own = resolvePeriod(month, basis)
      const before = own.unavailable ? [] : own.months.flatMap((item) => byMonth.get(item) ?? [])
      current = sumOf(byMonth.get(month))
      comparison = own.unavailable ? null : round2(sumOf(before) / own.months.length)
      change = changeFrom(current, comparison, month, basis)
      if (withProduct) product = productFigures(row.lines, row.lines, before, own.months.length, !own.unavailable && !own.incomplete)
    } else {
      current = round2(row.latest)
      comparison = period && !period.unavailable ? round2(row.comparison / nPeriod) : null
      change = changeFrom(current, comparison, latest, basis)
      if (withProduct) product = productFigures(row.lines, row.latestLines, row.beforeLines, periodMonths.size, Boolean(period && !period.unavailable && !period.incomplete))
    }
    return {
      key,
      ...labelOf(analysis.rows, key),
      total: round2(row.total),
      cells: new Map([...row.cells].map(([cell, value]) => [cell, round2(value)])),
      change,
      current,
      comparison,
      product,
    }
  })

  const sortRows = (items: PivotRow[]) => {
    if (analysis.sort === 'ad') {
      return monthRows ? items.sort((left, right) => Number(left.key) - Number(right.key)) : items.sort((left, right) => left.name.localeCompare(right.name, 'az'))
    }
    if (analysis.sort === 'ferq') {
      // The largest rise first, the largest fall last; a row with no comparison after them all.
      const has = (row: PivotRow) => row.change.kind === 'value'
      const delta = (row: PivotRow) => (row.change.kind === 'value' ? row.change.delta : 0)
      return items.sort((left, right) => Number(has(right)) - Number(has(left)) || delta(right) - delta(left) || right.total - left.total)
    }
    return items.sort((left, right) => right.total - left.total)
  }

  const pivotCols: PivotColumn[] = [...cols].filter(([, value]) => value > 0).map(([key, value]) => ({ key, ...labelOf(analysis.cols!, key), total: round2(value) }))
  if (analysis.cols === 'ay') pivotCols.sort((left, right) => Number(left.key) - Number(right.key))
  else pivotCols.sort((left, right) => right.total - left.total)

  const comparisonAmount = period && !period.unavailable ? round2(comparisonTotal / nPeriod) : null
  return {
    rows: sortRows(pivotRows),
    cols: pivotCols,
    total: round2(total),
    latest,
    latestAmount: round2(latestTotal),
    comparisonAmount,
    change: changeFrom(round2(latestTotal), comparisonAmount, latest, basis),
    lines: count,
    withProduct,
    productTotal: withProduct && monthRows ? quantityOf(pivotRows.length ? [...rows.values()].flatMap((row) => row.lines) : []) : undefined,
  }
}

/**
 * Many columns — a hundred objects, forty sub-categories — read as the largest few and one «Digər» column that adds
 * the rest, until the reader asks for them all. Months are never folded: a year has twelve.
 */
export function foldColumns(pivot: Pivot, dim: Dim | null, keep = 12): { cols: PivotColumn[]; folded: number } {
  if (!dim || dim === 'ay' || pivot.cols.length <= keep + 2) return { cols: pivot.cols, folded: 0 }
  const shown = pivot.cols.slice(0, keep)
  const rest = pivot.cols.slice(keep)
  return {
    cols: [...shown, { key: '__rest', name: `Digər ${rest.length}`, short: `Digər ${rest.length}`, total: round2(rest.reduce((sum, col) => sum + col.total, 0)), folded: rest.map((col) => col.key) }],
    folded: rest.length,
  }
}

/** A row's value in a column, the «Digər» column adding its folded ones. */
export const cellOf = (row: PivotRow, col: PivotColumn) =>
  col.folded ? round2(col.folded.reduce((sum, key) => sum + (row.cells.get(key) ?? 0), 0)) : row.cells.get(col.key) ?? 0

/* ---- Ready-made directions ------------------------------------------------------------------------------------------ */

/**
 * «Kateqoriyalar» in a ready-made direction is the level that says the most under the filters: the top level, or —
 * once one top category is chosen — the one under it, and so on down.
 */
export function categoryDim(facets: Facets): Dim {
  if (facets.leaves.length || facets.mids.length === 1) return 'alt'
  if (facets.mids.length) return 'orta'
  if (facets.roots.length === 1) return 'orta'
  return 'ana'
}

export interface Preset { id: string; label: string; rows: Dim | 'kat'; cols: Dim | 'kat' | null; view?: Analysis['view'] }

export const presets: readonly Preset[] = [
  { id: 'obyekt-ay', label: 'Obyektlər × Aylar', rows: 'obyekt', cols: 'ay' },
  { id: 'ay-obyekt', label: 'Aylar × Obyektlər', rows: 'ay', cols: 'obyekt' },
  { id: 'kat-ay', label: 'Kateqoriyalar × Aylar', rows: 'kat', cols: 'ay' },
  { id: 'ay-kat', label: 'Aylar × Kateqoriyalar', rows: 'ay', cols: 'kat' },
  { id: 'obyekt-kat', label: 'Obyektlər × Kateqoriyalar', rows: 'obyekt', cols: 'kat' },
  { id: 'kat-obyekt', label: 'Kateqoriyalar × Obyektlər', rows: 'kat', cols: 'obyekt' },
  { id: 'sirket-ay', label: 'Şirkətlər × Aylar', rows: 'sirket', cols: 'ay' },
  { id: 'sirket-kat', label: 'Şirkətlər × Kateqoriyalar', rows: 'sirket', cols: 'kat' },
  { id: 'mehsul', label: 'Məhsullar: qiymət və miqdar', rows: 'mehsul', cols: null, view: 'cedvel' },
]

const isCategory = (dim: Dim | null) => dim === 'ana' || dim === 'orta' || dim === 'alt'
export const presetMatches = (preset: Preset, analysis: Analysis) => {
  const same = (want: Preset['rows'] | null, have: Dim | null) => (want === 'kat' ? isCategory(have) : want === have)
  return same(preset.rows, analysis.rows) && same(preset.cols, analysis.cols)
}

/* ---- The reading ------------------------------------------------------------------------------------------------------ */

const facetParam: Record<FacetKey, ParamKey> = { sites: 'sites', suppliers: 'suppliers', roots: 'roots', mids: 'mids', leaves: 'leaves', products: 'products' }

/** The analysis as the screen reads it: the kind and the comparison as everywhere, the filters and the pivot its own. */
export function useAnalysis() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { kind, basis, setBasis, link } = useComparison(1)
  const analysis = readAnalysis(params)

  // A new filter or direction is a new reading of the same place: it replaces the entry and keeps the scroll.
  const write = (changes: Partial<Record<ParamKey, string | null>>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      const name = analysisParams[key as ParamKey]
      if (value) next.set(name, value)
      else next.delete(name)
    }
    setParams(next, { replace: true, preventScrollReset: true })
  }
  const facetsParams = (facets: Facets) => {
    const tidy = normalizeFacets(facets)
    return Object.fromEntries((Object.keys(facetParam) as FacetKey[]).map((key) => [facetParam[key], tidy[key].join(',') || null]))
  }

  const setFacet = (key: FacetKey, ids: string[]) => write(facetsParams({ ...analysis.facets, [key]: ids }))
  const setDirections = (rows: Dim, cols: Dim | null, view?: Analysis['view']) =>
    write({ rows, cols: cols ?? 'yox', sort: null, ...(view ? { view } : {}) })

  /**
   * A row taken as a filter, one level down — the way a catalogue narrows: a month opens its objects, an object its
   * categories, a category the level under it, a sub-category its products, a product its months (with its quantities
   * and prices), a company its categories. The columns stay, unless they are the level the rows now show.
   */
  const drill = (dim: Dim, key: string) => {
    const facets = analysis.facets
    const go = (rows: Dim, changes: Partial<Record<ParamKey, string | null>>) =>
      write({ ...changes, rows, cols: analysis.cols && analysis.cols !== rows ? analysis.cols : 'yox', sort: null })
    const category = categories.get(key)
    switch (dim) {
      case 'ay': return go('obyekt', { from: key, to: key })
      case 'obyekt': return go(categoryDim(facets), facetsParams({ ...facets, sites: [key] }))
      case 'sirket': return go(categoryDim(facets), facetsParams({ ...facets, suppliers: [key] }))
      case 'ana': return go('orta', facetsParams({ ...facets, roots: [key], mids: [], leaves: [] }))
      case 'orta': return go('alt', facetsParams({ ...facets, roots: [category!.parentId!], mids: [key], leaves: [] }))
      case 'alt': return go('mehsul', facetsParams({ ...facets, roots: [category!.path[0]], mids: [category!.parentId!], leaves: [key] }))
      case 'mehsul': return go('ay', facetsParams({ ...facets, products: [key] }))
    }
  }

  /** The year screen with what of the filters it can show: the period, and an object or a category when one is chosen. */
  const yearHref = () => {
    const extra: Record<string, string> = {}
    const { facets } = analysis
    if (analysis.from !== 1) extra[filterParams.from] = String(analysis.from)
    if (analysis.to !== 12) extra[filterParams.to] = String(analysis.to)
    if (facets.sites.length === 1) extra[filterParams.site] = facets.sites[0]
    // The year screen holds one category path: the deepest single choice, when there is exactly one at each level.
    if (!facets.products.length && facets.roots.length <= 1 && facets.mids.length <= 1 && facets.leaves.length <= 1) {
      const deepest = facets.leaves[0] ?? facets.mids[0] ?? facets.roots[0]
      const level = deepest ? categories.get(deepest)!.level : 0
      if (level === 3) extra[filterParams.leaf] = deepest
      if (level === 2) extra[filterParams.mid] = deepest
      if (level === 1) extra[filterParams.root] = deepest
    }
    return link(paths.year(YEAR), extra)
  }

  return {
    kind,
    basis,
    setBasis,
    analysis,
    write,
    setFacet,
    setDirections,
    drill,
    /** Any filter is on: the period or a facet. */
    filtered: analysis.from !== 1 || analysis.to !== 12 || Object.values(analysis.facets).some((ids) => ids.length > 0),
    /** Every filter off — the period and every facet. The kind, the comparison and the directions stay. */
    resetFilters: () => write({ from: null, to: null, sites: null, suppliers: null, roots: null, mids: null, leaves: null, products: null }),
    /** The same analysis for another kind of order. */
    kindHref: (next: Kind) => {
      const nextParams = new URLSearchParams(location.search)
      const value = kindOptions.find((option) => option.value === next)!.param
      if (value) nextParams.set('nov', value)
      else nextParams.delete('nov')
      const query = nextParams.toString()
      return query ? `${location.pathname}?${query}` : location.pathname
    },
    yearHref,
    href: (path: string, extra?: Record<string, string>) => link(path, extra),
  }
}

export type AnalysisReading = ReturnType<typeof useAnalysis>

/** The analysis screen's address from the year screen's filters: the same period, kind, comparison and choices. */
export function analysisSearch(params: URLSearchParams, rows: Dim, cols: Dim | null): string {
  const next = new URLSearchParams()
  for (const name of ['nov', 'muq', filterParams.from, filterParams.to, filterParams.site, filterParams.root, filterParams.mid, filterParams.leaf]) {
    const value = params.get(name)
    if (value) next.set(name, value)
  }
  next.set(analysisParams.rows, rows)
  next.set(analysisParams.cols, cols ?? 'yox')
  return next.toString()
}
