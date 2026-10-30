import { Link } from 'react-router'
import { basisOptions, type Basis, type Kind, type MonthTile } from '../data/analysis'
import { YEAR } from '../data/model'
import { money, moneyParts, monthName } from '../lib/format'
import { arrowOf, basisReference, changeOf, isCurrent, kindNames, kindOrder, signedRounded, statusOf, ThemeSwitch, updatedText, useYearReading, yearSentences } from './shared'

/**
 * B — Premium Editorial. The year as the opening page of an annual report: on the left the headline figure and the
 * year told in a few sentences written from the figures; on the right the twelve months as a ledger set in a newspaper
 * serif, to the qəpik, each with a fine bar of its size. Rules instead of boxes; one blue for the figures.
 */
export function ConceptB() {
  const reading = useYearReading()
  const { kind, basis, setBasis, tiles, total, largest } = reading
  const { whole, cents } = moneyParts(total.amount)

  return (
    <div className="concept-b min-h-dvh">
      <div className="mx-auto max-w-[1240px] px-8">
        <header className="flex items-center justify-between border-b border-(--b-rule-strong) py-4 text-sm">
          <p><span className="font-semibold">BaxOrders</span> <span className="ml-2 text-(--b-muted)">Rəhbərlik hesabatı</span></p>
          <div className="flex items-center gap-6 text-xs text-(--b-muted)">
            <span>Yenilənib {updatedText} · demo məlumat</span>
            <ThemeSwitch
              group="flex gap-3"
              active="font-semibold text-(--b-ink) underline decoration-1 underline-offset-4"
              idle="text-(--b-muted) hover:text-(--b-ink)"
            />
          </div>
        </header>

        <main className="grid grid-cols-1 gap-x-12 gap-y-10 pb-24 pt-9 lg:grid-cols-12">
          <section className="lg:col-span-4">
            <h1 id="page-title" tabIndex={-1} className="font-display text-[26px] italic leading-tight text-(--b-ink-2) outline-none">İllik icmal, {YEAR}</h1>
            <p className="mt-6 text-sm text-(--b-muted)">{kindNames[kind]} · {reading.period}</p>
            <p className="font-display tnum mt-1 text-[clamp(3.25rem,5.6vw,4.5rem)] font-normal leading-[0.95] tracking-[-0.02em]">
              {whole}<span className="text-[0.42em] tracking-normal text-(--b-ink-2)">,{cents} ₼</span>
            </p>
            <div aria-hidden="true" className="mt-6 h-px w-14 bg-(--b-rule-strong)" />
            <p className="font-display mt-5 max-w-[36ch] text-[18px] leading-[1.6] text-(--b-ink-2)">{yearSentences(reading).join(' ')}</p>

            <div className="mt-8 flex flex-col gap-5">
              <div>
                <p className="text-xs text-(--b-muted)">Sifariş növü</p>
                <nav aria-label="Sifariş növü" className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
                  {kindOrder.map((value) => (
                    <Link
                      key={value}
                      to={reading.kindHref(value)}
                      replace
                      aria-current={value === kind ? 'true' : undefined}
                      className={value === kind ? 'font-semibold underline decoration-1 underline-offset-[5px]' : 'text-(--b-muted) hover:text-(--b-ink)'}
                    >
                      {kindNames[value]}
                    </Link>
                  ))}
                </nav>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-(--b-muted)">Müqayisə üçün</span>
                <select
                  value={basis}
                  onChange={(event) => setBasis(event.target.value as Basis)}
                  className="font-display w-full max-w-80 border-0 border-b border-(--b-rule-strong) bg-transparent py-1 pr-6 text-[17px] text-(--b-ink)"
                >
                  {basisOptions.map((option) => <option key={option.value} value={option.value} className="bg-(--b-bg)">{option.label}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section aria-labelledby="ledger-title" className="lg:col-span-8">
            <div className="flex items-baseline justify-between border-b border-(--b-rule-strong) pb-2">
              <h2 id="ledger-title" className="font-display text-lg">Aylar üzrə</h2>
              <p className="text-xs text-(--b-muted)">Fərq {basisReference[basis]}</p>
            </div>
            <div aria-hidden="true" className="grid grid-cols-[7rem_9.5rem_minmax(0,1fr)_5.5rem_6.5rem_8rem] gap-x-4 border-b border-(--b-rule) py-1.5 text-xs text-(--b-muted)">
              <span>Ay</span><span className="text-right">Məbləğ</span><span /><span className="text-right">Fərq</span><span className="text-right">₼ ilə</span>
              <span>{kind === 'monthly' ? 'Təsdiq' : kind === 'outside' ? 'Sifarişlər' : ''}</span>
            </div>
            <ol>
              {tiles.map((tile) => (
                <li key={tile.month} className="border-b border-(--b-rule)">
                  {tile.state === 'data' ? <LedgerRow tile={tile} kind={kind} largest={largest} to={reading.monthHref(tile.month)} /> : <QuietRow tile={tile} />}
                </li>
              ))}
            </ol>
            <div className="grid grid-cols-[7rem_9.5rem_minmax(0,1fr)] gap-x-4 border-t border-(--b-rule-strong) pt-2.5">
              <span className="font-display text-[17px] italic">Cəmi</span>
              <span className="font-display tnum text-right text-[17px] font-medium">{money(total.amount)}</span>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

const rowGrid = 'grid grid-cols-[7rem_9.5rem_minmax(0,1fr)_5.5rem_6.5rem_8rem] items-center gap-x-4'

function LedgerRow({ tile, kind, largest, to }: { tile: MonthTile; kind: Kind; largest: number; to: string }) {
  const change = changeOf(tile)
  const status = statusOf(tile, kind)
  const share = largest > 0 ? Math.max(1.5, ((tile.amount ?? 0) / largest) * 100) : 0
  const tone = change.kind === 'value' ? (change.way === 'up' ? 'text-(--b-up)' : change.way === 'down' ? 'text-(--b-down)' : 'text-(--b-muted)') : 'text-(--b-muted)'
  return (
    <Link
      to={to}
      aria-label={`${monthName(tile.month)} ${YEAR}: ${money(tile.amount)}${change.kind === 'value' ? `, ${change.text}` : ''}${status.long ? `, ${status.long}` : ''}`}
      className={`group ${rowGrid} h-[38px] transition-colors hover:bg-(--b-hover)`}
    >
      <span className="font-display text-[17px] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
        {monthName(tile.month)}{isCurrent(tile) && <span className="ml-1.5 align-middle font-sans text-[11px] text-(--b-muted)">cari ay</span>}
      </span>
      <span className="font-display tnum text-right text-[17px]">{money(tile.amount)}</span>
      <span aria-hidden="true" className="block h-2">
        <span
          className={`block h-full ${kind === 'monthly' && tile.approval?.state === 'pending' ? 'bg-(--b-bar-pending)' : 'bg-(--b-bar)'}`}
          style={{ width: `${share}%` }}
        />
      </span>
      <span className={`tnum text-right text-[13px] font-semibold ${tone}`} title={change.kind === 'none' ? change.detail : undefined}>
        {change.kind === 'value'
          ? <><span aria-hidden="true" className="mr-0.5 text-[9px]">{arrowOf(change.way)}</span>{change.text}</>
          : <><span aria-hidden="true">—</span><span className="sr-only">{change.text}</span></>}
      </span>
      <span className="tnum text-right text-[13px] text-(--b-muted)">{change.kind === 'value' ? signedRounded(change.delta) : ''}</span>
      <span className="text-[13px]" title={status.long}>
        {status.tone === 'approved' && <span className="text-(--b-ink-2)">Təsdiqlənib</span>}
        {status.tone === 'pending' && <span className="bg-(--b-amber-soft) px-1.5 py-0.5 font-medium text-(--b-amber)">{status.short}</span>}
        {status.tone === 'count' && <span className="text-(--b-ink-2)">{status.short}</span>}
      </span>
    </Link>
  )
}

function QuietRow({ tile }: { tile: MonthTile }) {
  return (
    <div className={`${rowGrid} h-[38px] text-(--b-muted)`}>
      <span className="font-display text-[17px]">{monthName(tile.month)}</span>
      <span className="text-right text-[13px] italic">{tile.state === 'future' ? 'hələ başlamayıb' : 'məlumat yoxdur'}</span>
    </div>
  )
}
