import { useEffect } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { YEAR } from '../data/model'
import { money, monthName, percent } from '../lib/format'
import { basisReference, changeOf, type YearReading } from '../lib/year'
import { useThemeChoice } from '../ui/theme'
import './concepts.css'

export * from '../lib/year'

/*
 * What the three year-screen concepts share: the same reading of the same demo data, so they differ only in how they
 * show it. Every figure comes from `analysis` exactly as the current screen takes it — no concept computes its own.
 */

const countWords = ['', 'bir', 'iki', 'üç', 'dörd', 'beş', 'altı', 'yeddi', 'səkkiz', 'doqquz', 'on', 'on bir', 'on iki']
const monthGenitives = ['yanvarın', 'fevralın', 'martın', 'aprelin', 'mayın', 'iyunun', 'iyulun', 'avqustun', 'sentyabrın', 'oktyabrın', 'noyabrın', 'dekabrın']
const capital = (text: string) => text.charAt(0).toLocaleUpperCase('az') + text.slice(1)

/** The year in a few plain sentences, written from the figures on the screen and nothing else. */
export function yearSentences(reading: YearReading): string[] {
  const { kind, total, peak, latest, basis, approvedMonths, waiting, totals } = reading
  const months = capital(`${countWords[total.months.length]} ayda`)
  const sentences: string[] = []
  if (kind === 'monthly') sentences.push(`${months} ${money(total.amount)} məbləğində aylıq sifariş verilib.`)
  if (kind === 'outside') sentences.push(`${months} ${total.outsideCount} aylıqdan kənar sifariş verilib, cəmi ${money(total.amount)}. Hər biri ayrıca razılıqla verilir və aylıq sifarişlərin təsdiqinə daxil deyil.`)
  if (kind === 'all') sentences.push(`${months} aylıq və aylıqdan kənar sifarişlərin cəmi ${money(totals.all)} olub. Bu, ümumi xərcdir, təsdiq ediləcək məbləğ deyil.`)
  if (peak?.amount) sentences.push(`Ən yüksək ay ${monthName(peak.month).toLocaleLowerCase('az')} oldu: ${money(peak.amount)}.`)
  if (latest) {
    const change = changeOf(latest)
    if (change.kind === 'value' && change.way !== 'flat') {
      sentences.push(`${monthName(latest.month)} ${basisReference[basis]} ${percent(Math.abs(change.pct), false)} ${change.way === 'up' ? 'çoxdur' : 'azdır'}.`)
    }
  }
  if (kind === 'monthly') {
    const pending = waiting.map((tile) => monthGenitives[tile.month - 1]).join(', ')
    sentences.push(`${capital(countWords[approvedMonths])} ayın sifarişləri təsdiqlənib${pending ? `, ${pending} sifarişləri isə təsdiq gözləyir` : ''}.`)
  }
  return sentences
}

/** A light / dark choice drawn by each concept in its own style, over the one remembered setting. */
export function ThemeSwitch({ group, active, idle }: { group: string; active: string; idle: string }) {
  const [theme, choose] = useThemeChoice()
  return (
    <div role="group" aria-label="Mövzu" className={group}>
      {(['light', 'dark'] as const).map((value) => (
        <button key={value} type="button" aria-pressed={theme === value} onClick={() => choose(value)} className={theme === value ? active : idle}>
          {value === 'light' ? 'Açıq' : 'Tünd'}
        </button>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------------------------------
 * The review frame: the concepts' own pages, and one small switcher to move between them. Not part of any design.
 */

const conceptLinks = [
  { path: '/konsept', label: 'Müqayisə' },
  { path: '/konsept/a', label: 'A · Minimal' },
  { path: '/konsept/b', label: 'B · Editorial' },
  { path: '/konsept/c', label: 'C · Analytics' },
  { path: `/${YEAR}`, label: 'Mövcud' },
]

export function ConceptLayout() {
  const location = useLocation()
  useEffect(() => {
    const frame = requestAnimationFrame(() => document.getElementById('page-title')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])
  return (
    <>
      <Outlet />
      <ConceptSwitcher />
      <ScrollRestoration />
    </>
  )
}

/** A quiet pill at the bottom of the window: the comparison, the three concepts, and the screen as it is today. */
function ConceptSwitcher() {
  const location = useLocation()
  return (
    <nav
      aria-label="Konseptlər"
      className="fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full bg-neutral-900/90 p-1 text-[13px] text-white/75 shadow-lg backdrop-blur"
    >
      {conceptLinks.map((item) => {
        const active = location.pathname === item.path
        return (
          <Link
            key={item.path}
            to={`${item.path}${location.search}`}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition-colors ${active ? 'bg-white text-neutral-900' : 'hover:bg-white/10 hover:text-white'}`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
