import { DATA_EDITS, DATA_SOURCE, monthsWithDataIn, TODAY } from '../data/model'
import { monthName } from '../lib/format'
import { updatedText } from '../lib/year'
import { latestYear } from './metrics'

/*
 * How current the figures are, said from the figures themselves: the latest month with a monthly package against today.
 * «Aktualdır» only when the current month is in; a month behind is normal in the first days of a month and is said as
 * such; anything older is «köhnəlib». The demo says it is the demo.
 */

export type Freshness =
  | { state: 'current' | 'behind' | 'stale'; year: number; month: number; text: string }
  | { state: 'demo' | 'empty'; text: string }

export function freshness(): Freshness {
  if (DATA_SOURCE.kind === 'demo') return { state: 'demo', text: 'Demo məlumat — rəqəmlər real deyil' }
  const year = latestYear()
  const month = monthsWithDataIn(year).at(-1)
  if (!month) return { state: 'empty', text: 'Məlumat yoxdur' }
  const behind = (TODAY.year - year) * 12 + (TODAY.month - month)
  if (behind <= 0) return { state: 'current', year, month, text: `Aktualdır — cari ay (${monthName(month)} ${year}) məlumatdadır` }
  if (behind === 1) {
    return { state: 'behind', year, month, text: `Son ay: ${monthName(month)} ${year} — ${monthName(TODAY.month)} paketi hələ yüklənməyib` }
  }
  return { state: 'stale', year, month, text: `Köhnəlib — son məlumat ${monthName(month)} ${year}` }
}

/** The figures' source and history, for «Yenilənmə tarixçəsi». */
export function sourceInfo() {
  return {
    updated: updatedText,
    source: DATA_SOURCE,
    edits: [...DATA_EDITS].reverse(),
  }
}
