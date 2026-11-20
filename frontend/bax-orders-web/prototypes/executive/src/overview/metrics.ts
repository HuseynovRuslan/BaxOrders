import { approvalFor, categories, linesOfEveryYear, monthsWithDataIn, products, sites, TODAY, YEARS, type ApprovalState, type Line } from '../data/model'
import type { Kind } from '../data/analysis'
import { monthName, shortMonthNames } from '../lib/format'

/*
 * The figures of the overview and the map, read for any year without choosing it for the year screens: those screens
 * keep one «year on screen» in the model (`selectYear`), and nothing here reads or changes it. Every figure is a sum of
 * line amounts, as everywhere in the prototype (see the baxorders-analytics skill for the rules):
 *
 * - A year's reporting months are those with a monthly package (`monthsWithDataIn`); outside-monthly figures are read
 *   within the same months, as on the year screens.
 * - Two years are compared over the same months only: January–November against January–November, never 11 months
 *   against 12. A month the earlier year does not have is left out of the comparison and named.
 * - Approval belongs to the monthly package of a month (one decision for every object); outside-monthly orders have no
 *   approval record. The approval filter therefore chooses months of the focus year, and only for monthly orders.
 * - A percentage of zero is not a number: `pct` is null where the comparison is 0 or missing.
 */

export type StatusFilter = 'all' | 'approved' | 'pending'

export interface Scope {
  kind: Kind
  siteId?: string
  /** A category at any of its three levels. */
  categoryId?: string
}

const round2 = (value: number) => Math.round(value * 100) / 100
const sumOf = (lines: readonly Line[]) => round2(lines.reduce((total, line) => total + line.amount, 0))

/** Every line by year and month (index 0 = January), built once: the figures never change while the page is open. */
const byYearMonth = new Map<number, Line[][]>()
for (const line of linesOfEveryYear) {
  let months = byYearMonth.get(line.year)
  if (!months) byYearMonth.set(line.year, (months = Array.from({ length: 12 }, () => [])))
  months[line.month - 1]?.push(line)
}

function matches(line: Line, scope: Scope): boolean {
  if (scope.kind !== 'all' && line.type !== scope.kind) return false
  if (scope.siteId && line.siteId !== scope.siteId) return false
  if (scope.categoryId) {
    const product = products.get(line.productId)
    if (!product || (product.rootId !== scope.categoryId && product.midId !== scope.categoryId && product.leafId !== scope.categoryId)) return false
  }
  return true
}

/** One month's lines of one year in the scope. */
export function linesIn(year: number, month: number, scope: Scope): Line[] {
  return (byYearMonth.get(year)?.[month - 1] ?? []).filter((line) => matches(line, scope))
}

export function amountIn(year: number, month: number, scope: Scope): number {
  return sumOf(linesIn(year, month, scope))
}

export function amountOver(year: number, months: readonly number[], scope: Scope): number {
  return round2(months.reduce((total, month) => total + amountIn(year, month, scope), 0))
}

/** The month is a reporting month of the year: it has a monthly package. */
export const hasMonth = (year: number, month: number) => monthsWithDataIn(year).includes(month)

/** The month is still running: its outside-monthly orders may still come in, so its figure can grow. */
export const isInProgress = (year: number, month: number) => year === TODAY.year && month === TODAY.month

export const statusOf = (year: number, month: number): ApprovalState | null => approvalFor(year, month)?.state ?? null

/** The latest year with figures: the overview's focus, and where «Müdiriyyət» opens. */
export const latestYear = (): number => YEARS.at(-1) ?? TODAY.year

/** The year before, when it has figures. */
export const previousYearOf = (year: number): number | null => (YEARS.includes(year - 1) ? year - 1 : null)

/**
 * The years a period can be read in: those with at least one monthly package, oldest first. Taken from the figures
 * themselves, never from a list of years: a year comes into the choices when its lines are imported (2020–2024 once the
 * historical workbook is in), and a year with outside-monthly lines alone has no reporting month to show.
 */
export const reportingYears = (): number[] => YEARS.filter((year) => monthsWithDataIn(year).length > 0)

/* ---- Periods -------------------------------------------------------------------------------------------------------- */

export interface PeriodOption {
  id: string
  /** In the period list: «İlin əvvəlindən (Yan–Noy)», «IV rüb (Okt–Noy)», «Oktyabr». */
  label: string
  group: 'ytd' | 'quarter' | 'month'
  /** The calendar months the choice names; the focus year's months without data are dropped when it is read. */
  months: number[]
  /**
   * The whole of the period in any year: January–December for the year, the quarter's three months, the month. A year
   * that is over is shown over all of it (`periodTotal`); `months` stops at the focus year's latest month.
   */
  span: number[]
}

const romanQuarters = ['I', 'II', 'III', 'IV']

/** «Yan–Noy», «Okt», or «Yan, Mar» for months that are not one run. */
export function shortRange(months: readonly number[]): string {
  if (months.length === 0) return '—'
  const sorted = [...months].sort((a, b) => a - b)
  const contiguous = sorted.every((month, index) => index === 0 || month === sorted[index - 1] + 1)
  if (sorted.length === 1) return shortMonthNames[sorted[0] - 1]
  if (contiguous) return `${shortMonthNames[sorted[0] - 1]}–${shortMonthNames[sorted.at(-1)! - 1]}`
  return sorted.map((month) => shortMonthNames[month - 1]).join(', ')
}

/** «Yanvar–Noyabr», «Oktyabr». */
export function longRange(months: readonly number[]): string {
  if (months.length === 0) return '—'
  const sorted = [...months].sort((a, b) => a - b)
  const contiguous = sorted.every((month, index) => index === 0 || month === sorted[index - 1] + 1)
  if (sorted.length === 1) return monthName(sorted[0])
  if (contiguous) return `${monthName(sorted[0])}–${monthName(sorted.at(-1)!)}`
  return sorted.map(monthName).join(', ')
}

/**
 * What the period list offers for a year: from January to the latest reporting month (the default), each quarter that
 * has a reporting month, and each reporting month. A quarter still running names the months it has.
 */
export function periodOptions(year: number): PeriodOption[] {
  const months = monthsWithDataIn(year)
  if (months.length === 0) return []
  const last = months.at(-1)!
  const toDate = Array.from({ length: last }, (_, index) => index + 1)
  const options: PeriodOption[] = [{
    id: 'ytd',
    label: last === 12 ? 'Bütün il (Yan–Dek)' : `İlin əvvəlindən (${shortRange(toDate)})`,
    group: 'ytd',
    months: toDate,
    span: Array.from({ length: 12 }, (_, index) => index + 1),
  }]
  for (let quarter = 0; quarter < 4; quarter++) {
    const whole = [1, 2, 3].map((step) => quarter * 3 + step)
    const inQuarter = whole.filter((month) => months.includes(month))
    if (inQuarter.length === 0) continue
    options.push({
      id: `q${quarter + 1}`,
      label: inQuarter.length === 3 ? `${romanQuarters[quarter]} rüb` : `${romanQuarters[quarter]} rüb (${shortRange(inQuarter)})`,
      group: 'quarter',
      months: inQuarter,
      span: whole,
    })
  }
  for (const month of months) options.push({ id: `m${month}`, label: monthName(month), group: 'month', months: [month], span: [month] })
  return options
}

export function periodById(year: number, id: string | null): PeriodOption | null {
  const options = periodOptions(year)
  return options.find((option) => option.id === id) ?? options[0] ?? null
}

/* ---- Comparing two years over the same months ---------------------------------------------------------------------- */

/** Which of a year's compared months are approved and which wait, for the monthly package. */
export interface StatusCoverage {
  approved: number[]
  pending: number[]
}

export function coverageOf(year: number, months: readonly number[]): StatusCoverage {
  const approved: number[] = []
  const pending: number[] = []
  for (const month of months) {
    const state = statusOf(year, month)
    if (state === 'approved') approved.push(month)
    else if (state === 'pending') pending.push(month)
  }
  return { approved, pending }
}

export interface YearComparison {
  focusYear: number
  /** Null when there is no earlier year with figures. */
  previousYear: number | null
  /** The focus year's months in the period (reporting months, narrowed by the approval filter). */
  months: number[]
  /** The months both years have: the only ones compared. */
  aligned: number[]
  /** Months of `months` the earlier year has no figures for: shown, never compared. */
  unmatched: number[]
  /** The focus year over `months`. */
  current: number
  /** The focus year over `aligned`: the left side of the difference. */
  currentAligned: number
  /** The earlier year over `aligned`; null without an earlier year or a month to compare. */
  previous: number | null
  delta: number | null
  /** Null where `previous` is 0 or missing: a percentage of nothing is not a number. */
  pct: number | null
  coverage: { focus: StatusCoverage; previous: StatusCoverage | null }
}

/**
 * A year over the whole of a period — the full year, the whole quarter — as far as it has figures: what the earlier
 * year's card shows («2025 · Yan–Dek», 12 months). It is a different figure from `YearComparison.previous`, the earlier
 * year over the months both years have, and it is never set against the focus year: the change is read from
 * `compareYears` only.
 */
export interface PeriodTotal {
  year: number
  /** The calendar months of the whole period. */
  span: number[]
  /** Those the year has figures for. */
  months: number[]
  amount: number
  /** Every month of the span has figures. */
  complete: boolean
}

export function periodTotal(year: number, span: readonly number[], kind: Kind, scope: Omit<Scope, 'kind'> = {}): PeriodTotal {
  const months = span.filter((month) => hasMonth(year, month))
  return { year, span: [...span], months, amount: amountOver(year, months, { ...scope, kind }), complete: months.length === span.length }
}

/** The focus year's months for a period and an approval filter (the filter applies to monthly orders only). */
export function monthsFor(year: number, period: PeriodOption | null, status: StatusFilter, kind: Kind): number[] {
  if (!period) return []
  const withData = period.months.filter((month) => hasMonth(year, month))
  if (status === 'all' || kind !== 'monthly') return withData
  return withData.filter((month) => statusOf(year, month) === status)
}

export function compareYears(focusYear: number, months: readonly number[], kind: Kind, scope: Omit<Scope, 'kind'> = {}): YearComparison {
  const previousYear = previousYearOf(focusYear)
  const full: Scope = { ...scope, kind }
  const aligned = previousYear === null ? [] : months.filter((month) => hasMonth(previousYear, month))
  const unmatched = months.filter((month) => !aligned.includes(month))
  const current = amountOver(focusYear, months, full)
  const currentAligned = amountOver(focusYear, aligned, full)
  const previous = previousYear === null || aligned.length === 0 ? null : amountOver(previousYear, aligned, full)
  const delta = previous === null ? null : round2(currentAligned - previous)
  return {
    focusYear,
    previousYear,
    months: [...months],
    aligned,
    unmatched,
    current,
    currentAligned,
    previous,
    delta,
    pct: previous ? (currentAligned - previous) / previous : null,
    coverage: { focus: coverageOf(focusYear, months), previous: previousYear === null ? null : coverageOf(previousYear, aligned) },
  }
}

/* ---- Month by month ------------------------------------------------------------------------------------------------- */

export interface MonthPair {
  month: number
  /** Null where the year has no figures for the month — never shown as zero. */
  current: number | null
  previous: number | null
  delta: number | null
  pct: number | null
  currentStatus: ApprovalState | null
  previousStatus: ApprovalState | null
  /** The focus month is still running. */
  inProgress: boolean
}

export function monthPairs(focusYear: number, months: readonly number[], kind: Kind, scope: Omit<Scope, 'kind'> = {}): MonthPair[] {
  const previousYear = previousYearOf(focusYear)
  const full: Scope = { ...scope, kind }
  return months.map((month) => {
    const current = hasMonth(focusYear, month) ? amountIn(focusYear, month, full) : null
    const previous = previousYear !== null && hasMonth(previousYear, month) ? amountIn(previousYear, month, full) : null
    const delta = current !== null && previous !== null ? round2(current - previous) : null
    return {
      month,
      current,
      previous,
      delta,
      pct: delta !== null && previous ? delta / previous : null,
      currentStatus: statusOf(focusYear, month),
      previousStatus: previousYear === null ? null : statusOf(previousYear, month),
      inProgress: isInProgress(focusYear, month),
    }
  })
}

/* ---- Approval of the monthly package ---------------------------------------------------------------------------------- */

export interface ApprovalSplit {
  approved: number
  pending: number
  total: number
  approvedMonths: number[]
  pendingMonths: number[]
}

/** The year's monthly orders over the months, split by their month's approval. */
export function approvalSplit(year: number, months: readonly number[], scope: Omit<Scope, 'kind'> = {}): ApprovalSplit {
  const withData = months.filter((month) => hasMonth(year, month))
  const coverage = coverageOf(year, withData)
  const full: Scope = { ...scope, kind: 'monthly' }
  const approved = amountOver(year, coverage.approved, full)
  const pending = amountOver(year, coverage.pending, full)
  return { approved, pending, total: round2(approved + pending), approvedMonths: coverage.approved, pendingMonths: coverage.pending }
}

export interface ApprovalDrift { month: number; approved: number; now: number }

/**
 * Approved months whose monthly figures moved after the approval (a new workbook, a price changed in «Mallar»): the
 * approval stands (owner, 2026-11-02), and the page says what it was given for and what the figure is now — the year
 * screens' rule (`approvalDrift` in data/analysis), in any year. Only a difference in whole manats counts.
 */
export function approvalDrifts(year: number, months: readonly number[]): ApprovalDrift[] {
  return months.flatMap((month) => {
    const approval = approvalFor(year, month)
    if (approval?.state !== 'approved' || approval.amount === undefined) return []
    const now = amountOver(year, [month], { kind: 'monthly' })
    return Math.round(now) === Math.round(approval.amount) ? [] : [{ month, approved: approval.amount, now }]
  })
}

/* ---- Where the money went ------------------------------------------------------------------------------------------- */

export interface ShareRow {
  id: string
  name: string
  amount: number
  /** Of the whole in the same scope and months. */
  share: number
  /** The same months of the year before, when it has them all. */
  previous: number | null
  delta: number | null
  pct: number | null
}

export type ShareKey = 'site' | 'root' | 'product'

const keyOf: Record<ShareKey, (line: Line) => string> = {
  site: (line) => line.siteId,
  root: (line) => products.get(line.productId)?.rootId ?? '',
  product: (line) => line.productId,
}

const nameOf: Record<ShareKey, (id: string) => string> = {
  site: (id) => sites.get(id)?.name ?? id,
  root: (id) => categories.get(id)?.name ?? id,
  product: (id) => products.get(id)?.name ?? id,
}

function groupAmounts(year: number, months: readonly number[], scope: Scope, key: ShareKey): Map<string, number> {
  const groups = new Map<string, number>()
  for (const month of months) {
    for (const line of linesIn(year, month, scope)) {
      const id = keyOf[key](line)
      groups.set(id, (groups.get(id) ?? 0) + line.amount)
    }
  }
  return groups
}

/** The scope over the months, grouped by object, root category or product, largest first, each against the year before. */
export function shareBy(year: number, months: readonly number[], kind: Kind, key: ShareKey, scope: Omit<Scope, 'kind'> = {}): ShareRow[] {
  const full: Scope = { ...scope, kind }
  const groups = groupAmounts(year, months, full, key)
  const previousYear = previousYearOf(year)
  const comparable = previousYear !== null && months.length > 0 && months.every((month) => hasMonth(previousYear, month))
  const before = comparable ? groupAmounts(previousYear, months, full, key) : null
  const whole = [...groups.values()].reduce((total, value) => total + value, 0)
  return [...groups]
    .map(([id, amount]) => {
      const previous = before ? round2(before.get(id) ?? 0) : null
      const value = round2(amount)
      const delta = previous === null ? null : round2(value - previous)
      return { id, name: nameOf[key](id), amount: value, share: whole ? amount / whole : 0, previous, delta, pct: previous ? (value - previous) / previous : null }
    })
    .filter((row) => row.amount > 0)
    .sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name, 'az'))
}
