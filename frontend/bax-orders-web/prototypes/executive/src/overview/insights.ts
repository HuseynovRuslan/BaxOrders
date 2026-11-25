import type { Kind } from '../data/analysis'
import { money, monthName, percent, signedMoney } from '../lib/format'
import { overviewLinks } from './links'
import type { MonthPair, ShareRow } from './metrics'

/*
 * «Ağıllı qeydlər»: short observations worked out from the figures on screen — never written by a model, never a guess.
 * Each says what happened, not whether it is good: a cost that rose is «artım», not a success or a failure, and its chip
 * carries no green or red. A note is left out when the figures cannot carry it (one month, no earlier year, no orders).
 */

export type Way = 'up' | 'down' | 'flat'

export interface Insight {
  id: string
  icon: 'calendar' | 'map' | 'layers'
  /** The subject: a month, an object, a category. */
  subject: string
  /** What is observed about it, in a few words. */
  text: string
  /** The figure on the chip: a change in per cent (with its way), or a share. */
  value: { text: string; way?: Way }
  /** The whole observation in one sentence: the tip and what a screen reader says. */
  detail: string
  href: string
}

export const wayOf = (delta: number | null): Way => (delta === null || Math.abs(delta) < 0.5 ? 'flat' : delta > 0 ? 'up' : 'down')

function monthNote(id: string, pair: MonthPair, text: string, focusYear: number, previousYear: number, kind: Kind): Insight {
  return {
    id,
    icon: 'calendar',
    subject: monthName(pair.month),
    text,
    value: { text: percent(pair.pct), way: wayOf(pair.delta) },
    detail: `${monthName(pair.month)} ${focusYear}: ${money(pair.current)}, ${monthName(pair.month)} ${previousYear}: ${money(pair.previous)} — fərq ${signedMoney(pair.delta)} (${percent(pair.pct)}).`,
    href: overviewLinks.month(focusYear, pair.month, kind),
  }
}

export interface InsightInput {
  focusYear: number
  previousYear: number | null
  kind: Kind
  pairs: readonly MonthPair[]
  /** The focus year's objects over the same months, largest first. */
  sites: readonly ShareRow[]
  /** The focus year's root categories over the same months, largest first. */
  roots: readonly ShareRow[]
  /** At most this many notes: the card keeps its height. */
  limit?: number
}

/**
 * The notes, most telling first. Over several months: the month that rose most against the same month a year before and
 * the one that fell most (by manats, so a small month's doubling does not outrank a large month's shift); over one month:
 * that month against the year before. Then the object that moved most in manats, and where the money concentrates: the
 * three largest objects' share and the largest root category.
 */
export function buildInsights({ focusYear, previousYear, kind, pairs, sites, roots, limit = 4 }: InsightInput): Insight[] {
  const notes: Insight[] = []
  const compared = pairs.filter((pair) => pair.delta !== null && pair.pct !== null)

  if (previousYear !== null && pairs.length > 1) {
    const rise = compared.filter((pair) => pair.delta! > 0).sort((left, right) => right.delta! - left.delta!)[0]
    const fall = compared.filter((pair) => pair.delta! < 0).sort((left, right) => left.delta! - right.delta!)[0]
    if (rise) notes.push(monthNote('rise', rise, 'ən böyük artım', focusYear, previousYear, kind))
    if (fall) notes.push(monthNote('fall', fall, 'ən böyük azalma', focusYear, previousYear, kind))
  }

  if (previousYear !== null && pairs.length === 1 && compared.length === 1) {
    notes.push(monthNote('month', compared[0], `${previousYear} ilə müqayisədə`, focusYear, previousYear, kind))
  }

  // The object whose spending moved most in manats against the same months a year before, either way.
  const moved = sites.filter((row) => row.delta !== null && Math.abs(row.delta) >= 0.5)
    .sort((left, right) => Math.abs(right.delta!) - Math.abs(left.delta!))[0]
  if (moved) {
    notes.push({
      id: 'site-move',
      icon: 'map',
      subject: moved.name,
      text: moved.delta! > 0 ? 'ən çox artan ərazi' : 'ən çox azalan ərazi',
      value: { text: moved.pct === null ? signedMoney(moved.delta) : percent(moved.pct), way: wayOf(moved.delta) },
      detail: `${moved.name}: ${money(moved.amount)}, bir il əvvəl eyni aylarda ${money(moved.previous)} — fərq ${signedMoney(moved.delta)}.`,
      href: overviewLinks.siteYear(focusYear, moved.id, kind),
    })
  }

  const total = sites.reduce((sum, row) => sum + row.amount, 0)
  if (sites.length > 3 && total > 0) {
    const top = sites.slice(0, 3)
    const share = top.reduce((sum, row) => sum + row.amount, 0) / total
    notes.push({
      id: 'concentration',
      icon: 'map',
      subject: '3 ərazi',
      text: `xərcin ${percent(share, false)}-i`,
      value: { text: percent(share, false) },
      detail: `Ən çox xərclənən 3 ərazi — ${top.map((row) => row.name).join(', ')} — ${sites.length} ərazinin ümumi məbləğinin ${percent(share, false)}-ni təşkil edir.`,
      href: overviewLinks.grouped(focusYear, 'obyekt', kind),
    })
  }

  const largest = roots[0]
  if (largest && largest.amount > 0) {
    notes.push({
      id: 'category',
      icon: 'layers',
      subject: largest.name,
      text: 'ən böyük kateqoriya',
      value: { text: percent(largest.share, false) },
      detail: `${largest.name}: ${money(largest.amount)}, seçilmiş dövrün xərcinin ${percent(largest.share, false)}-i.`,
      href: overviewLinks.rootYear(focusYear, largest.id, kind),
    })
  }

  return notes.slice(0, limit)
}
