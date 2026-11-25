import { TODAY, type ApprovalState } from '../data/model'
import type { Kind } from '../data/analysis'
import { monthName, shortMonthNames } from '../lib/format'
import { hasMonth, isInProgress, linesIn, statusOf } from './metrics'

/*
 * A period against what it is compared with, for the map's areas (see the baxorders-analytics skill):
 *
 * - «Ötən ilin eyni ayı / dövrü» (`yoy`): each month against the same month a year before.
 * - «Əvvəlki ay / dövr» (`previous`): the period against the run of months just before it, as long as it is — November
 *   against October, January against the December before it, Oct–Nov against Aug–Sep, Jan–Nov 2026 against Feb–Dec 2025.
 *   Never 11 months against 12.
 *
 * Months are paired one to one. A pair is compared only when both of its months have figures (a monthly package); a
 * pair without them is left out and named, never read as zero. A period never reaches into the future. A percentage of
 * nothing is not a number: `pct` is null where the base is 0 or missing.
 */

export type CompareMode = 'yoy' | 'previous'

export interface YearMonth {
  year: number
  month: number
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** The month `by` months on (or back): `shift({ year: 2026, month: 1 }, -1)` is December 2025. */
export function shift({ year, month }: YearMonth, by: number): YearMonth {
  const index = year * 12 + (month - 1) + by
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 }
}

/** Later than today's month: nothing can be known about it yet. */
export const isFuture = ({ year, month }: YearMonth) => year > TODAY.year || (year === TODAY.year && month > TODAY.month)

const sameMonth = (left: YearMonth, right: YearMonth) => left.year === right.year && left.month === right.month

/* ---- Every object's figure in a month, read once ------------------------------------------------------------------ */

const totals = new Map<string, Map<string, number>>()

/** Every object's amount in one month, for one kind of order: read from the lines once, then kept (they never change). */
export function siteTotals(year: number, month: number, kind: Kind): ReadonlyMap<string, number> {
  const key = `${year}-${month}-${kind}`
  let found = totals.get(key)
  if (!found) {
    found = new Map()
    for (const line of linesIn(year, month, { kind })) found.set(line.siteId, (found.get(line.siteId) ?? 0) + line.amount)
    for (const [siteId, amount] of found) found.set(siteId, round2(amount))
    totals.set(key, found)
  }
  return found
}

/**
 * The month's amount for the objects (each counted once), or for every object without `siteIds`; null when the month
 * has no figures at all — a month that has them and no order from these objects is a real 0.
 */
export function amountFor(at: YearMonth, kind: Kind, siteIds?: readonly string[]): number | null {
  if (!hasMonth(at.year, at.month)) return null
  const month = siteTotals(at.year, at.month, kind)
  if (!siteIds) return round2([...month.values()].reduce((sum, value) => sum + value, 0))
  return round2([...new Set(siteIds)].reduce((sum, id) => sum + (month.get(id) ?? 0), 0))
}

/* ---- The period and its counterpart ------------------------------------------------------------------------------ */

/**
 * A period's calendar months in a year, up to the year's latest month with figures — so the running quarter or year is
 * read over the months it has had, and its counterpart is as long.
 */
export function spanOf(year: number, months: readonly number[], lastMonth: number): YearMonth[] {
  return [...months].sort((a, b) => a - b).filter((month) => month <= lastMonth).map((month) => ({ year, month }))
}

/** The months a period is compared with, one for each of its months, in the same order. */
export function baselineOf(span: readonly YearMonth[], mode: CompareMode): YearMonth[] {
  if (mode === 'yoy') return span.map((at) => ({ year: at.year - 1, month: at.month }))
  if (span.length === 0) return []
  const first = span[0]
  const last = span.at(-1)!
  const length = (last.year - first.year) * 12 + (last.month - first.month) + 1
  return span.map((at) => shift(at, -length))
}

export interface ComparedMonth {
  current: YearMonth
  baseline: YearMonth
  /** Null where the month has no figures. */
  currentAmount: number | null
  baselineAmount: number | null
  currentStatus: ApprovalState | null
  baselineStatus: ApprovalState | null
}

export interface PeriodComparison {
  mode: CompareMode
  span: YearMonth[]
  baselineSpan: YearMonth[]
  pairs: ComparedMonth[]
  /** The period's own figure: its months with figures. Null when none of them has figures. */
  amount: number | null
  /** The pairs whose two months both have figures: the only ones the difference is read over. */
  aligned: ComparedMonth[]
  /** Pairs left out of the difference, each with the side that has no figures. */
  left: (ComparedMonth & { missing: 'current' | 'baseline' | 'both' })[]
  /** The period over the aligned months: the left side of the difference. */
  currentAligned: number | null
  /** The counterpart over the aligned months; null when no pair can be compared. */
  baseline: number | null
  delta: number | null
  /** Null where the base is 0 or missing. */
  pct: number | null
  /** For monthly orders: an aligned month waits for approval on one side and is approved on the other. */
  approvalDiffers: boolean
  /** A month of the period is still running: its figure can grow. */
  inProgress: boolean
}

export function comparePeriod(span: readonly YearMonth[], mode: CompareMode, kind: Kind, siteIds?: readonly string[]): PeriodComparison {
  const current = span.filter((at) => !isFuture(at))
  const baselineSpan = baselineOf(current, mode)
  const pairs: ComparedMonth[] = current.map((at, index) => {
    const base = baselineSpan[index]
    return {
      current: at,
      baseline: base,
      currentAmount: amountFor(at, kind, siteIds),
      baselineAmount: amountFor(base, kind, siteIds),
      currentStatus: statusOf(at.year, at.month),
      baselineStatus: statusOf(base.year, base.month),
    }
  })
  const aligned = pairs.filter((pair) => pair.currentAmount !== null && pair.baselineAmount !== null)
  const left = pairs
    .filter((pair) => pair.currentAmount === null || pair.baselineAmount === null)
    .map((pair) => ({ ...pair, missing: pair.currentAmount === null && pair.baselineAmount === null ? 'both' as const : pair.currentAmount === null ? 'current' as const : 'baseline' as const }))
  const withFigures = pairs.filter((pair) => pair.currentAmount !== null)
  const amount = withFigures.length ? round2(withFigures.reduce((sum, pair) => sum + pair.currentAmount!, 0)) : null
  const currentAligned = aligned.length ? round2(aligned.reduce((sum, pair) => sum + pair.currentAmount!, 0)) : null
  const baseline = aligned.length ? round2(aligned.reduce((sum, pair) => sum + pair.baselineAmount!, 0)) : null
  const delta = currentAligned !== null && baseline !== null ? round2(currentAligned - baseline) : null
  return {
    mode,
    span: current,
    baselineSpan,
    pairs,
    amount,
    aligned,
    left,
    currentAligned,
    baseline,
    delta,
    pct: delta !== null && baseline ? delta / baseline : null,
    approvalDiffers: kind === 'monthly' && aligned.some((pair) => pair.currentStatus !== null && pair.baselineStatus !== null && pair.currentStatus !== pair.baselineStatus),
    inProgress: current.some((at) => isInProgress(at.year, at.month)),
  }
}

/* ---- Words ------------------------------------------------------------------------------------------------------ */

/** The comparison's name for the toolbar and the cards. */
export function modeLabel(mode: CompareMode, single: boolean): string {
  if (mode === 'yoy') return single ? 'Ötən ilin eyni ayı' : 'Ötən ilin eyni dövrü'
  return single ? 'Əvvəlki ay' : 'Əvvəlki dövr'
}

/** «Noyabr 2026», «Yan–Noy 2026», «Fev–Dek 2025», «Dek 2025–Yan 2026»; months that are not one run are listed. */
export function rangeLabel(months: readonly YearMonth[]): string {
  if (months.length === 0) return '—'
  const first = months[0]
  const last = months.at(-1)!
  if (months.length === 1) return `${monthName(first.month)} ${first.year}`
  const run = months.every((at, index) => index === 0 || sameMonth(at, shift(months[index - 1], 1)))
  if (!run) return months.map((at) => `${shortMonthNames[at.month - 1]} ${at.year}`).join(', ')
  return first.year === last.year
    ? `${shortMonthNames[first.month - 1]}–${shortMonthNames[last.month - 1]} ${last.year}`
    : `${shortMonthNames[first.month - 1]} ${first.year}–${shortMonthNames[last.month - 1]} ${last.year}`
}

/** A month in a sentence: «Dekabr 2025». */
export const monthLabel = (at: YearMonth) => `${monthName(at.month)} ${at.year}`
