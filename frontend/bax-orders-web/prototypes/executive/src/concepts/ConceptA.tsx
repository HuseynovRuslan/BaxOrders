import { Link } from 'react-router'
import { ArrowUpRight, Check, Hourglass } from 'lucide-react'
import { basisOptions, type Basis, type Kind, type MonthTile } from '../data/analysis'
import { YEAR } from '../data/model'
import { money, moneyParts, monthName } from '../lib/format'
import { arrowOf, basisReference, changeOf, isCurrent, kindNames, kindOrder, rounded, signedRounded, statusOf, ThemeSwitch, updatedText, useYearReading, type YearReading } from './shared'

/**
 * A — Executive Minimal. The number first: one total, three facts beside it, and the twelve months as a two-row ledger
 * of figures — each month's amount large, its change and its approval under it, a hairline of its share beneath.
 * Nothing is hidden behind a hover; nothing on the page is there for decoration.
 */
export function ConceptA() {
  const reading = useYearReading()
  const { kind, basis, setBasis, tiles, total, largest } = reading
  const { whole, cents } = moneyParts(total.amount)

  return (
    <div className="concept-a min-h-dvh">
      <header className="border-b border-(--a-line) bg-(--a-surface)">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <p className="flex items-baseline gap-3">
            <span className="text-[15px] font-semibold tracking-tight">BaxOrders</span>
            <span className="text-sm text-(--a-muted)">Rəhbərlik paneli</span>
          </p>
          <div className="flex items-center gap-5">
            <span className="text-xs text-(--a-muted)" title="Prototip: bütün rəqəmlər uydurmadır">Demo məlumat</span>
            <ThemeSwitch
              group="flex text-xs font-medium"
              active="border-b border-(--a-ink) px-1.5 pb-0.5 text-(--a-ink)"
              idle="border-b border-transparent px-1.5 pb-0.5 text-(--a-muted) hover:text-(--a-ink)"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-8">
        <div className="flex flex-col gap-6 border-b border-(--a-line) pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 id="page-title" tabIndex={-1} className="text-sm font-medium text-(--a-ink-2) outline-none">İllik icmal · {YEAR}</h1>
            <p className="tnum mt-2 text-[clamp(2.75rem,5vw,3.75rem)] font-semibold leading-none tracking-[-0.025em]">
              {whole}<span className="text-[0.45em] font-medium tracking-normal text-(--a-ink-2)">,{cents} ₼</span>
            </p>
            <p className="mt-2.5 text-sm text-(--a-muted)">{kindNames[kind]} · {reading.period} · yenilənib {updatedText}</p>
          </div>
          <Facts reading={reading} />
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <nav aria-label="Sifariş növü" className="flex gap-7">
            {kindOrder.map((value) => {
              const active = value === kind
              return (
                <Link
                  key={value}
                  to={reading.kindHref(value)}
                  replace
                  aria-current={active ? 'true' : undefined}
                  className={`border-b-2 pb-2 text-sm transition-colors ${active ? 'border-(--a-ink) font-semibold text-(--a-ink)' : 'border-transparent font-medium text-(--a-muted) hover:text-(--a-ink)'}`}
                >
                  {kindNames[value]} <span className="tnum ml-1 font-normal text-(--a-muted)">{rounded(reading.totals[value])}</span>
                </Link>
              )
            })}
          </nav>
          <label className="flex items-center gap-3 pb-1 text-sm text-(--a-muted)">
            Müqayisə üçün
            <select
              value={basis}
              onChange={(event) => setBasis(event.target.value as Basis)}
              className="h-9 rounded-md border border-(--a-line-2) bg-(--a-surface) pl-3 pr-8 text-sm text-(--a-ink)"
            >
              {basisOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <h2 className="sr-only">Aylar: {kindNames[kind]}, {basisReference[basis]}</h2>
        <ol className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border border-(--a-line) bg-(--a-surface) sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map((tile) => (
            <li key={tile.month} className="-mb-px -mr-px border-b border-r border-(--a-line)">
              {tile.state === 'data' ? <MonthCell tile={tile} kind={kind} largest={largest} to={reading.monthHref(tile.month)} /> : <EmptyCell tile={tile} />}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-(--a-muted)">Fərqlər {basisReference[basis]}. Aya klikləyin, həmin ayın təhlili açılır.</p>
      </main>
    </div>
  )
}

/** The three facts a Rəhbər asks first, beside the total, in the kind's own terms. */
function Facts({ reading }: { reading: YearReading }) {
  const { kind, latest, basis } = reading
  const change = latest ? changeOf(latest) : null
  const facts: { label: string; value: string; note: string; tone?: string }[] = []
  if (kind === 'monthly') {
    facts.push({ label: 'Təsdiqlənib', value: money(reading.approvedAmount), note: `${reading.approvedMonths} ayın sifarişləri` })
    for (const tile of reading.waiting) facts.push({ label: 'Təsdiq gözləyir', value: money(tile.amount), note: `${monthName(tile.month)} sifarişləri`, tone: 'text-(--a-amber)' })
  }
  if (kind === 'outside') facts.push({ label: 'Sifarişlər', value: `${reading.total.outsideCount}`, note: 'hər biri ayrıca razılıqla' })
  if (kind === 'all') {
    facts.push({ label: 'Aylıq sifarişlər', value: money(reading.totals.monthly), note: 'ay üzrə bir dəfə təsdiq olunur' })
    facts.push({ label: 'Aylıqdan kənar', value: money(reading.totals.outside), note: 'hər biri ayrıca razılıqla' })
  }
  if (latest && change?.kind === 'value') {
    facts.push({
      label: `${monthName(latest.month)}, ${basisReference[basis]}`,
      value: `${arrowOf(change.way)} ${change.text}`,
      note: signedRounded(change.delta),
      tone: change.way === 'up' ? 'text-(--a-up)' : change.way === 'down' ? 'text-(--a-down)' : '',
    })
  }
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-(--a-line)">
      {facts.map((fact) => (
        <div key={fact.label} className="sm:px-6 sm:last:pr-0">
          <dt className="text-xs text-(--a-muted)">{fact.label}</dt>
          <dd className={`tnum mt-1 text-lg font-semibold leading-tight ${fact.tone ?? ''}`}>{fact.value}</dd>
          <dd className="text-xs text-(--a-muted)">{fact.note}</dd>
        </div>
      ))}
    </dl>
  )
}

function MonthCell({ tile, kind, largest, to }: { tile: MonthTile; kind: Kind; largest: number; to: string }) {
  const change = changeOf(tile)
  const status = statusOf(tile, kind)
  const share = largest > 0 ? Math.max(2, ((tile.amount ?? 0) / largest) * 100) : 0
  const current = isCurrent(tile)
  return (
    <Link
      to={to}
      aria-label={`${monthName(tile.month)} ${YEAR}: ${money(tile.amount)}`}
      className={`group flex h-full flex-col gap-2.5 px-5 pb-4 pt-4 transition-colors hover:bg-(--a-hover) ${current ? 'shadow-[inset_0_2px_0_var(--a-accent)]' : ''}`}
    >
      <span className="flex items-center justify-between text-sm">
        <span className="font-medium">{monthName(tile.month)}{current && <span className="ml-2 text-xs font-normal text-(--a-accent)">cari ay</span>}</span>
        <ArrowUpRight aria-hidden="true" className="size-4 text-(--a-muted) opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      <span className="tnum text-[26px] font-semibold leading-none tracking-[-0.02em]">
        {moneyParts(Math.round(tile.amount ?? 0)).whole}<span className="ml-1 text-[0.6em] font-medium text-(--a-ink-2)">₼</span>
      </span>
      <span className="tnum flex h-4 items-center gap-2 text-[13px] leading-none" title={change.kind === 'none' ? change.detail : `Fərq: ${money(change.delta)}`}>
        {change.kind === 'value' ? (
          <>
            <span className={`font-semibold ${change.way === 'up' ? 'text-(--a-up)' : change.way === 'down' ? 'text-(--a-down)' : 'text-(--a-muted)'}`}>
              <span aria-hidden="true" className="mr-0.5 text-[10px]">{arrowOf(change.way)}</span>{change.text}
            </span>
            <span className="text-(--a-muted)">{signedRounded(change.delta)}</span>
          </>
        ) : <span className="text-(--a-muted)">{change.text}</span>}
      </span>
      <span aria-hidden="true" className="mt-1 block h-[3px] w-full rounded-full bg-(--a-line)">
        <span
          className={`block h-full rounded-full ${kind === 'monthly' && tile.approval?.state === 'pending' ? 'bg-(--a-bar-pending)' : 'bg-(--a-bar)'}`}
          style={{ width: `${share}%` }}
        />
      </span>
      <span className="flex h-5 items-center text-xs" title={status.long}>
        {status.tone === 'approved' && <span className="inline-flex items-center gap-1 text-(--a-ink-2)"><Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />{status.short}</span>}
        {status.tone === 'pending' && <span className="inline-flex items-center gap-1 rounded-sm bg-(--a-amber-soft) px-1.5 py-0.5 font-medium text-(--a-amber)"><Hourglass aria-hidden="true" className="size-3.5" />{status.short}</span>}
        {status.tone === 'count' && <span className="text-(--a-ink-2)">{status.short}</span>}
      </span>
    </Link>
  )
}

function EmptyCell({ tile }: { tile: MonthTile }) {
  return (
    <div className="flex h-full flex-col gap-2.5 px-5 pb-4 pt-4 text-(--a-muted)">
      <span className="text-sm font-medium">{monthName(tile.month)}</span>
      <span className="text-[26px] font-light leading-none">—</span>
      <span className="h-4 text-[13px] leading-none">{tile.state === 'future' ? 'hələ başlamayıb' : 'məlumat yoxdur'}</span>
      <span aria-hidden="true" className="mt-1 block h-[3px] w-full rounded-full border-t border-dashed border-(--a-line-2)" />
      <span className="h-5" />
    </div>
  )
}
