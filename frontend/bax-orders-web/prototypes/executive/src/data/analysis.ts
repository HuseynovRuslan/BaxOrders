import {
  allLines,
  allSuppliers,
  allOutsideRequests,
  approvals,
  categories,
  LAST_MONTH_WITH_DATA,
  monthsWithData,
  products,
  sites,
  TODAY,
  YEAR,
  type Line,
  type MonthApproval,
  type OutsideRequest,
} from './model'
import { monthName, monthRange } from '../lib/format'

/**
 * Everything the screens show, read from the demo's lines. Amounts are sums of line amounts; a comparison over
 * several months is the monthly average of those months — never a three-month total against one month.
 */

/**
 * Which orders a figure is about — the product's own three words (D-R1). «Aylıq sifarişlər» is the monthly package and
 * the default; «Aylıqdan kənar» the urgent requests, compared only with themselves; «Hamısı» what the company spent,
 * never presented as the amount to approve.
 */
export type Kind = 'monthly' | 'outside' | 'all'

export const kindOptions: { value: Kind; param: string; label: string }[] = [
  { value: 'monthly', param: '', label: 'Aylıq sifarişlər' },
  { value: 'outside', param: 'kenar', label: 'Aylıqdan kənar' },
  { value: 'all', param: 'hamisi', label: 'Hamısı' },
]

export function readKind(param: string | null): Kind {
  return kindOptions.find((option) => option.param !== '' && option.param === param)?.value ?? 'monthly'
}

export type Basis = 'previous' | 'avg3' | 'avg6' | 'all'

export const basisOptions: { value: Basis; param: string; label: string }[] = [
  { value: 'previous', param: '', label: 'Əvvəlki ay' },
  { value: 'avg3', param: '3ay', label: 'Əvvəlki 3 ayın ortalaması' },
  { value: 'avg6', param: '6ay', label: 'Əvvəlki 6 ayın ortalaması' },
  { value: 'all', param: 'hamisi', label: 'Bütün əvvəlki ayların ortalaması' },
]

export function readBasis(param: string | null): Basis {
  return basisOptions.find((option) => option.param !== '' && option.param === param)?.value ?? 'previous'
}

export interface Period {
  basis: Basis
  /** The months the comparison actually stands on. */
  months: number[]
  /** How many months the rule asks for; null for «all». */
  wanted: number | null
  isAverage: boolean
  /** No month to compare with at all. */
  unavailable: boolean
  /** Fewer months exist than the rule asks for. */
  incomplete: boolean
  /** «Sentyabr 2026», «İyul–Sentyabr 2026 · aylıq ortalama». */
  label: string
}

export function resolvePeriod(month: number, basis: Basis): Period {
  const before = monthsWithData.filter((item) => item < month)
  const wanted = basis === 'previous' ? 1 : basis === 'avg3' ? 3 : basis === 'avg6' ? 6 : null
  const months = basis === 'previous'
    ? before.filter((item) => item === month - 1)
    : wanted === null ? before : before.slice(-wanted)

  const unavailable = months.length === 0
  const isAverage = basis !== 'previous'
  return {
    basis,
    months,
    wanted,
    isAverage,
    unavailable,
    incomplete: !unavailable && wanted !== null && months.length < wanted,
    label: unavailable
      ? 'Müqayisə üçün əvvəlki ay yoxdur'
      : isAverage
        ? `${monthRange(months, YEAR)} · aylıq ortalama`
        : `${monthName(months[0])} ${YEAR}`,
  }
}

// ---- scopes ---------------------------------------------------------------------------------------------------------

export interface Scope {
  /** Required: no figure is ever about «whatever kind», so none can mix the monthly package with urgent requests. */
  kind: Kind
  siteId?: string
  categoryId?: string
  productId?: string
  supplierId?: string
}

function matches(line: Line, scope: Scope): boolean {
  if (scope.kind !== 'all' && line.type !== scope.kind) return false
  if (scope.siteId && line.siteId !== scope.siteId) return false
  if (scope.productId && line.productId !== scope.productId) return false
  if (scope.supplierId && line.supplierId !== scope.supplierId) return false
  if (scope.categoryId) {
    const product = products.get(line.productId)!
    if (product.rootId !== scope.categoryId && product.midId !== scope.categoryId && product.leafId !== scope.categoryId) return false
  }
  return true
}

const byMonth = new Map<number, Line[]>()
for (const line of allLines) {
  byMonth.set(line.month, [...(byMonth.get(line.month) ?? []), line])
}

export function linesFor(month: number, scope: Scope): Line[] {
  return (byMonth.get(month) ?? []).filter((line) => matches(line, scope))
}

const round2 = (value: number) => Math.round(value * 100) / 100
const sum = (values: number[]) => round2(values.reduce((total, value) => total + value, 0))

export interface Figure {
  current: number
  /** Something was ordered this month. */
  hasCurrent: boolean
  /** The comparison's monthly figure; null when there is no period to compare with. */
  comparison: number | null
  hasComparison: boolean
  delta: number | null
  /** Null where the comparison is zero: a percentage of nothing is not a number. */
  pct: number | null
}

export function figure(month: number, period: Period, scope: Scope): Figure {
  const current = linesFor(month, scope)
  const currentAmount = sum(current.map((line) => line.amount))
  if (period.unavailable) {
    return { current: currentAmount, hasCurrent: current.length > 0, comparison: null, hasComparison: false, delta: null, pct: null }
  }

  const before = period.months.flatMap((item) => linesFor(item, scope))
  const comparison = round2(sum(before.map((line) => line.amount)) / period.months.length)
  const delta = round2(currentAmount - comparison)
  return {
    current: currentAmount,
    hasCurrent: current.length > 0,
    comparison,
    hasComparison: before.length > 0,
    delta,
    pct: comparison === 0 ? null : delta / comparison,
  }
}

// ---- breakdowns -----------------------------------------------------------------------------------------------------

export interface BreakdownRow {
  id: string
  name: string
  figure: Figure
  /** Products only: quantity and the weighted unit price this month. */
  quantity?: QuantityFigure
  /** Products only: the same product in the comparison period — quantity and price changes. */
  product?: ProductComparison
  /** Products only: the companies it was bought from this month, the largest amount first. */
  suppliers?: SupplierShare[]
  /** Products not bought this month: the companies of the comparison period, so the row still says who sold it. */
  suppliersBefore?: SupplierShare[]
}

export interface SupplierShare {
  id: string
  name: string
  amount: number
}

/** The companies of a set of lines, with what was bought from each, the largest first. */
export function suppliersOf(lines: readonly Line[]): SupplierShare[] {
  const byId = new Map<string, number>()
  for (const line of lines) byId.set(line.supplierId, (byId.get(line.supplierId) ?? 0) + line.amount)
  return [...byId]
    .map(([id, amount]) => ({ id, name: allSuppliers.get(id)!.name, amount: round2(amount) }))
    .sort((left, right) => right.amount - left.amount)
}

export interface QuantityFigure {
  qty: number | null
  unit: string | null
  price: number | null
  mixedUnits: boolean
  /** Each unit's own quantity, where the lines use more than one: «312 cüt + 2 qutu». */
  parts: { qty: number; unit: string }[]
}

function presentIn(month: number, period: Period, scope: Scope, key: (line: Line) => string): Set<string> {
  const months = [month, ...period.months]
  return new Set(months.flatMap((item) => linesFor(item, scope)).map(key))
}

const byAmount = (left: BreakdownRow, right: BreakdownRow) =>
  right.figure.current - left.figure.current || (right.figure.comparison ?? 0) - (left.figure.comparison ?? 0)

/** The categories one level under `parentId` (the roots when null), within an optional object. */
export function categoryRows(month: number, period: Period, kind: Kind, parentId: string | null, siteId?: string): BreakdownRow[] {
  const parent = parentId ? categories.get(parentId)! : null
  const level = parent ? parent.level + 1 : 1
  const scope: Scope = { kind, siteId, categoryId: parentId ?? undefined }
  const ids = presentIn(month, period, scope, (line) => {
    const product = products.get(line.productId)!
    return level === 1 ? product.rootId : level === 2 ? product.midId : product.leafId
  })
  return [...ids]
    .map((id) => ({ id, name: categories.get(id)!.name, figure: figure(month, period, { kind, siteId, categoryId: id }) }))
    .sort(byAmount)
}

/** The objects, within an optional category. */
export function siteRows(month: number, period: Period, kind: Kind, categoryId?: string): BreakdownRow[] {
  const ids = presentIn(month, period, { kind, categoryId }, (line) => line.siteId)
  return [...ids]
    .map((id) => ({ id, name: sites.get(id)!.name, figure: figure(month, period, { kind, siteId: id, categoryId }) }))
    .sort(byAmount)
}

/** The products of a sub-category, within an optional object. */
export function productRows(month: number, period: Period, kind: Kind, leafId: string, siteId?: string): BreakdownRow[] {
  const ids = presentIn(month, period, { kind, siteId, categoryId: leafId }, (line) => line.productId)
  return [...ids]
    .map((id) => ({
      id,
      name: products.get(id)!.name,
      figure: figure(month, period, { kind, siteId, productId: id }),
      quantity: quantityOf(linesFor(month, { kind, siteId, productId: id })),
      product: compareProduct(month, period, kind, id, siteId),
      suppliers: suppliersOf(linesFor(month, { kind, siteId, productId: id })),
      suppliersBefore: suppliersOf(period.months.flatMap((item) => linesFor(item, { kind, siteId, productId: id }))),
    }))
    .sort(byAmount)
}

export function quantityOf(lines: readonly Line[]): QuantityFigure {
  if (lines.length === 0) return { qty: null, unit: null, price: null, mixedUnits: false, parts: [] }
  const parts = unitParts(lines)
  if (parts.length > 1) return { qty: null, unit: null, price: null, mixedUnits: true, parts }
  const qty = lines.reduce((total, line) => total + line.qty, 0)
  const amount = sum(lines.map((line) => line.amount))
  return { qty, unit: lines[0].unit, price: qty === 0 ? null : amount / qty, mixedUnits: false, parts }
}

/** Quantities kept apart by unit: a pair and a box are never added together. */
export function unitParts(lines: readonly Line[]): { qty: number; unit: string }[] {
  const byUnit = new Map<string, number>()
  for (const line of lines) byUnit.set(line.unit, (byUnit.get(line.unit) ?? 0) + line.qty)
  return [...byUnit].map(([unit, qty]) => ({ unit, qty }))
}

// ---- one product ----------------------------------------------------------------------------------------------------

export interface ProductSide {
  /** Each unit's quantity per month, where the lines use more than one unit. */
  parts: { qty: number; unit: string }[]
  amount: number
  /** Per month: the month's own, or the comparison's monthly average. */
  qty: number | null
  /** Amount ÷ quantity over the period: a weighted average, never an average of prices. */
  price: number | null
  units: string[]
  lineCount: number
  priceRange: [number, number] | null
  months: number
}

export interface ProductComparison {
  current: ProductSide
  comparison: ProductSide | null
  /** One unit on both sides: quantity and price can be compared. */
  comparable: boolean
  deltaAmount: number | null
  deltaQty: number | null
  qtyPct: number | null
  pricePct: number | null
  /** Arithmetic split of the amount difference: (P₁ − P₀) × Q₁ and (Q₁ − Q₀) × P₀. */
  priceEffect: number | null
  qtyEffect: number | null
}

function side(lines: readonly Line[], months: number): ProductSide {
  const units = [...new Set(lines.map((line) => line.unit))]
  const totalAmount = sum(lines.map((line) => line.amount))
  const totalQty = units.length === 1 ? lines.reduce((total, line) => total + line.qty, 0) : null
  const prices = lines.map((line) => line.price)
  return {
    parts: unitParts(lines).map((part) => ({ unit: part.unit, qty: part.qty / months })),
    amount: round2(totalAmount / months),
    qty: totalQty === null ? null : totalQty / months,
    price: totalQty ? totalAmount / totalQty : null,
    units,
    lineCount: lines.length,
    priceRange: prices.length ? [Math.min(...prices), Math.max(...prices)] : null,
    months,
  }
}

export function compareProduct(month: number, period: Period, kind: Kind, productId: string, siteId?: string, supplierId?: string): ProductComparison {
  const current = side(linesFor(month, { kind, productId, siteId, supplierId }), 1)
  if (period.unavailable) {
    return { current, comparison: null, comparable: false, deltaAmount: null, deltaQty: null, qtyPct: null, pricePct: null, priceEffect: null, qtyEffect: null }
  }

  const before = period.months.flatMap((item) => linesFor(item, { kind, productId, siteId, supplierId }))
  const comparison = side(before, period.months.length)
  const comparable = current.units.length === 1 && comparison.units.length === 1 && current.units[0] === comparison.units[0]
    && current.qty !== null && comparison.qty !== null
  const deltaAmount = round2(current.amount - comparison.amount)

  if (!comparable) {
    return { current, comparison, comparable, deltaAmount, deltaQty: null, qtyPct: null, pricePct: null, priceEffect: null, qtyEffect: null }
  }

  const q1 = current.qty!, q0 = comparison.qty!, p1 = current.price!, p0 = comparison.price!
  return {
    current,
    comparison,
    comparable,
    deltaAmount,
    deltaQty: q1 - q0,
    qtyPct: q0 === 0 ? null : (q1 - q0) / q0,
    pricePct: p0 === 0 ? null : (p1 - p0) / p0,
    priceEffect: round2((p1 - p0) * q1),
    qtyEffect: round2((q1 - q0) * p0),
  }
}

export interface ProductSiteRow {
  siteId: string
  name: string
  comparison: ProductComparison
}

/** Who ordered the product, this month or in the comparison, largest change first. */
export function productBySite(month: number, period: Period, kind: Kind, productId: string): ProductSiteRow[] {
  const ids = presentIn(month, period, { kind, productId }, (line) => line.siteId)
  return [...ids]
    .map((siteId) => ({ siteId, name: sites.get(siteId)!.name, comparison: compareProduct(month, period, kind, productId, siteId) }))
    .sort((left, right) => Math.abs(right.comparison.deltaAmount ?? right.comparison.current.amount) - Math.abs(left.comparison.deltaAmount ?? left.comparison.current.amount))
}

export interface ProductSupplierRow {
  supplierId: string
  name: string
  comparison: ProductComparison
}

/**
 * Which companies the product was bought from, this month or in the comparison, within an optional object — the
 * largest this month first. Each with its own quantity and weighted price, so two companies' prices sit side by side.
 */
export function productBySupplier(month: number, period: Period, kind: Kind, productId: string, siteId?: string): ProductSupplierRow[] {
  const ids = presentIn(month, period, { kind, productId, siteId }, (line) => line.supplierId)
  return [...ids]
    .map((supplierId) => ({ supplierId, name: allSuppliers.get(supplierId)!.name, comparison: compareProduct(month, period, kind, productId, siteId, supplierId) }))
    .sort((left, right) => right.comparison.current.amount - left.comparison.current.amount || (right.comparison.comparison?.amount ?? 0) - (left.comparison.comparison?.amount ?? 0))
}

// ---- one order's changes --------------------------------------------------------------------------------------------

/** Which way a product's unit price or quantity moved. */
export type Move = 'up' | 'down'

/**
 * How far a weighted unit price has to move, either way, to be a price change (owner decision: 1%). 32,00 → 32,13 ₼
 * still shows on the row, but no price filter lists it.
 */
export const PRICE_CHANGE_THRESHOLD = 0.01

/** Below this a price has not moved at all: the weighted prices are quotients, and 0,0% is not a change. */
const PRICE_UNMOVED = 0.0005

export type OrderChangeState = 'new' | 'dropped' | 'changed' | 'steady'

export interface OrderChangeRow {
  productId: string
  name: string
  comparison: ProductComparison
  state: OrderChangeState
  /** Supplied free from the company's own store on either side: its quantity moves at no cost (D-45, D-46). */
  internal: boolean
  /** The price moved by at least the threshold — what the price filters list and the row marks ▲ / ▼. */
  priceMove: Move | null
  /** The price moved, but by less than the threshold: on the row, under no price filter. */
  smallPriceMove: Move | null
  /** By the quantity's effect on money, so free store material is under no quantity filter (owner decision). */
  quantityMove: Move | null
}

/**
 * Every product of an object's monthly order, this month or in the comparison, against the comparison — the largest
 * change of money first. Only a product whose quantity and price can both be compared (one unit on both sides, paid on
 * both sides) is given a price or a quantity move; a new product, a dropped one and store material are what they are.
 */
export function orderChanges(month: number, period: Period, siteId: string): OrderChangeRow[] {
  if (period.unavailable) return []
  const scope: Scope = { kind: 'monthly', siteId }
  return [...presentIn(month, period, scope, (line) => line.productId)]
    .map((productId) => {
      const comparison = compareProduct(month, period, 'monthly', productId, siteId)
      const internal = [month, ...period.months].some((item) => linesFor(item, { ...scope, productId }).some((line) => line.price === 0))
      const split = comparison.comparable && !internal

      const pct = comparison.pricePct
      const priceMoved = split && pct !== null && Math.abs(pct) >= PRICE_UNMOVED && Boolean(comparison.priceEffect)
      const way: Move = (pct ?? 0) > 0 ? 'up' : 'down'
      const priceMove = priceMoved && Math.abs(pct!) >= PRICE_CHANGE_THRESHOLD ? way : null
      const smallPriceMove = priceMoved && Math.abs(pct!) < PRICE_CHANGE_THRESHOLD ? way : null
      const quantityMove: Move | null = split && comparison.qtyEffect && comparison.deltaQty
        ? comparison.deltaQty > 0 ? 'up' : 'down'
        : null

      const state: OrderChangeState = comparison.current.lineCount === 0
        ? 'dropped'
        : comparison.comparison?.lineCount === 0
          ? 'new'
          : Math.abs(comparison.deltaAmount ?? 0) >= 0.005 || priceMove || quantityMove ? 'changed' : 'steady'

      return { productId, name: products.get(productId)!.name, comparison, state, internal, priceMove, smallPriceMove, quantityMove }
    })
    .sort((left, right) => Math.abs(right.comparison.deltaAmount ?? 0) - Math.abs(left.comparison.deltaAmount ?? 0)
      || left.name.localeCompare(right.name, 'az'))
}

// ---- the year -------------------------------------------------------------------------------------------------------

export interface MonthTile {
  month: number
  state: 'data' | 'future' | 'empty'
  amount: number | null
  approval: MonthApproval | null
  /** The period the month is compared with, under the chosen comparison. */
  period: Period | null
  /** The comparison's monthly figure (a single month, or the monthly average of several). */
  comparison: number | null
  /** Against the comparison, only where the period is whole (see `comparable`). */
  delta: number | null
  pct: number | null
  objects: number
  /** How many outside-monthly requests the month had. */
  outsideCount: number
  /**
   * The comparison period exists and is whole: the change can be stated. A period with fewer months than the choice
   * asks for (February against «the previous 3 months») is not, so no percentage is shown for it rather than a wrong one.
   */
  comparable: boolean
  /** The latest month with orders: the one the Rəhbər is working on now. */
  latest: boolean
}

export function yearTiles(kind: Kind, basis: Basis = 'previous'): MonthTile[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const future = YEAR > TODAY.year || (YEAR === TODAY.year && month > TODAY.month)
    if (!monthsWithData.includes(month)) {
      return { month, state: future ? 'future' : 'empty', amount: null, approval: null, period: null, comparison: null, delta: null, pct: null, objects: 0, outsideCount: 0, comparable: false, latest: false }
    }

    const amount = sum(linesFor(month, { kind }).map((line) => line.amount))
    // The same rule as every other screen: a single month, or the monthly average of the months the choice names.
    const period = resolvePeriod(month, basis)
    const whole = !period.unavailable && !period.incomplete
    const comparison = period.unavailable
      ? null
      : round2(sum(period.months.flatMap((item) => linesFor(item, { kind })).map((line) => line.amount)) / period.months.length)
    return {
      month,
      state: 'data',
      amount,
      approval: approvals.find((item) => item.month === month) ?? null,
      period,
      comparison,
      delta: whole && comparison !== null ? round2(amount - comparison) : null,
      pct: whole && comparison ? (amount - comparison) / comparison : null,
      objects: new Set(linesFor(month, { kind }).map((line) => line.siteId)).size,
      outsideCount: outsideRequestsIn(month).length,
      comparable: whole,
      latest: month === monthsWithData[monthsWithData.length - 1],
    }
  })
}

export function approvalOf(month: number): MonthApproval | null {
  return approvals.find((item) => item.month === month) ?? null
}

/**
 * The year so far for one kind, and — always about the monthly package alone — how much of the package is in months
 * already approved. Outside-monthly money is never inside an approved package figure.
 */
export function yearTotal(kind: Kind): { amount: number; months: number[]; approvedPackage: number; monthly: number; outside: number; outsideCount: number } {
  const approvedMonths = approvals.filter((item) => item.state === 'approved').map((item) => item.month)
  const monthly = allLines.filter((line) => line.type === 'monthly')
  const outside = allLines.filter((line) => line.type === 'outside')
  return {
    amount: sum((kind === 'all' ? allLines : kind === 'monthly' ? monthly : outside).map((line) => line.amount)),
    months: [...monthsWithData],
    approvedPackage: sum(monthly.filter((line) => approvedMonths.includes(line.month)).map((line) => line.amount)),
    monthly: sum(monthly.map((line) => line.amount)),
    outside: sum(outside.map((line) => line.amount)),
    outsideCount: allOutsideRequests.length,
  }
}

/** The month's outside-monthly requests, in the order they came, with their own totals. */
export function outsideRequestsIn(month: number, siteId?: string): (OutsideRequest & { amount: number })[] {
  return allOutsideRequests
    .filter((request) => request.month === month && (!siteId || request.siteId === siteId))
    .sort((left, right) => left.day - right.day)
    .map((request) => ({ ...request, amount: sum(allLines.filter((line) => line.orderId === request.id).map((line) => line.amount)) }))
}

/** The month split by kind, for the strip that sets the two apart. */
export function monthSplit(month: number): { monthly: number; outside: number; all: number; outsideCount: number } {
  const lines = linesFor(month, { kind: 'all' })
  const monthly = sum(lines.filter((line) => line.type === 'monthly').map((line) => line.amount))
  const outside = sum(lines.filter((line) => line.type === 'outside').map((line) => line.amount))
  return { monthly, outside, all: sum(lines.map((line) => line.amount)), outsideCount: outsideRequestsIn(month).length }
}

export function isValidMonth(month: number): boolean {
  return Number.isInteger(month) && month >= 1 && month <= 12
}

export function hasData(month: number): boolean {
  return monthsWithData.includes(month)
}

export { LAST_MONTH_WITH_DATA }
