import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { monthSplit, basisOptions, type Basis, type Kind, type MonthTile } from '../data/analysis'
import { YEAR } from '../data/model'
import { money, moneyParts, monthName, monthRange, shortMonthNames, signedMoney } from '../lib/format'
import { Tip, useTipTrigger } from '../ui/tip'
import { arrowOf, basisReference, changeOf, isCurrent, kindNames, kindOrder, rounded, signedRounded, statusOf, ThemeSwitch, updatedText, useYearReading, type YearReading } from './shared'

/**
 * C — Modern Analytics. An analyst's chart, made for a Rəhbər: a real value axis, each month's bar with a mark at the
 * level it is compared with (so «more or less than usual» is seen before it is read), the figures under the bars, and
 * a single approval track along the year. One strip of headline figures above; the month's detail on hover.
 */
export function ConceptC() {
  const reading = useYearReading()
  const { kind, basis, setBasis, tiles, largest } = reading
  const scale = niceScale(Math.max(largest, ...tiles.map((tile) => tile.comparison ?? 0)))
  // The bars rise once when the page opens; after that they move only when the figures do.
  const [risen, setRisen] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRisen(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="concept-c min-h-dvh">
      <header className="border-b border-(--c-line) bg-(--c-surface)">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
          <p className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="grid size-6 place-items-center rounded-md bg-(--c-bar) text-[11px] font-extrabold text-white">B</span>
            <span className="font-bold">BaxOrders</span>
            <span className="text-(--c-muted)">/</span>
            <span className="text-(--c-ink-2)">Rəhbərlik</span>
          </p>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-(--c-band) px-2.5 py-1 text-xs font-semibold text-(--c-ink-2)" title="Prototip: bütün rəqəmlər uydurmadır">Demo</span>
            <ThemeSwitch
              group="flex rounded-lg bg-(--c-band) p-0.5 text-xs font-semibold"
              active="rounded-md bg-(--c-surface) px-2.5 py-1 text-(--c-ink) shadow-sm"
              idle="rounded-md px-2.5 py-1 text-(--c-muted) hover:text-(--c-ink)"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-6 pb-24 pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 id="page-title" tabIndex={-1} className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] outline-none">İllik icmal {YEAR}</h1>
            <p className="mt-0.5 text-sm text-(--c-muted)">Yenilənib {updatedText}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <nav aria-label="Sifariş növü" className="flex rounded-lg border border-(--c-line) bg-(--c-surface) p-1">
              {kindOrder.map((value) => (
                <Link
                  key={value}
                  to={reading.kindHref(value)}
                  replace
                  aria-current={value === kind ? 'true' : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${value === kind ? 'bg-(--c-ink) text-(--c-surface)' : 'text-(--c-ink-2) hover:bg-(--c-band)'}`}
                >
                  {kindNames[value]}
                </Link>
              ))}
            </nav>
            <label className="flex items-center gap-2 rounded-lg border border-(--c-line) bg-(--c-surface) py-1 pl-3 pr-1 text-sm">
              <span className="text-(--c-muted)">Müqayisə üçün</span>
              <select
                value={basis}
                onChange={(event) => setBasis(event.target.value as Basis)}
                className="h-8 rounded-md bg-transparent pl-1 pr-7 font-semibold text-(--c-ink)"
              >
                {basisOptions.map((option) => <option key={option.value} value={option.value} className="bg-(--c-surface)">{option.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        <Headline reading={reading} />

        <section aria-labelledby="chart-title" className="mt-4 rounded-xl border border-(--c-line) bg-(--c-surface) px-5 pb-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="chart-title" className="text-sm font-bold">Aylar üzrə · {kindNames[kind]}</h2>
            <p className="flex items-center gap-4 text-xs text-(--c-ink-2)">
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-2.5 rounded-sm bg-(--c-bar)" />Ayın məbləği</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-0.5 w-4 bg-(--c-marker)" />Müqayisə səviyyəsi ({basisOptions.find((option) => option.value === basis)!.label.toLocaleLowerCase('az')})</span>
            </p>
          </div>

          <div className="relative mt-3 grid grid-cols-[3.25rem_repeat(12,minmax(0,1fr))]">
            {/* The value axis and its gridlines, behind the twelve months. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[clamp(10rem,calc(100dvh-29rem),16rem)]">
              {scale.ticks.map((value) => (
                <div key={value} className={`absolute inset-x-0 border-t ${value === 0 ? 'border-(--c-line)' : 'border-dashed border-(--c-grid)'}`} style={{ bottom: `${(value / scale.top) * 100}%` }}>
                  <span className="tnum absolute -top-2 left-0 w-11 text-right text-[11px] leading-4 text-(--c-muted)">{axisLabel(value)}</span>
                </div>
              ))}
            </div>
            <div />
            {tiles.map((tile, index) => (
              tile.state === 'data'
                ? <MonthBar key={tile.month} tile={tile} kind={kind} top={scale.top} to={reading.monthHref(tile.month)} risen={risen} order={index} />
                : <FutureBar key={tile.month} tile={tile} />
            ))}
          </div>

          {kind !== 'all' && (
            <div className="mt-2 grid grid-cols-[3.25rem_repeat(12,minmax(0,1fr))] items-center border-t border-(--c-line) pt-2.5">
              <span className="text-[11px] font-semibold text-(--c-muted)">{kind === 'monthly' ? 'Təsdiq' : 'Sifariş'}</span>
              {tiles.map((tile) => <TrackCell key={tile.month} tile={tile} kind={kind} />)}
            </div>
          )}
        </section>
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-(--c-muted)">
          {kind === 'monthly' && (
            <>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-4 rounded-full bg-(--c-ok)" />Sifarişlər təsdiqlənib</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="track-pending h-1.5 w-4 rounded-full" />Sifarişlər təsdiq gözləyir</span>
            </>
          )}
          <span>Aya klikləyin, həmin ayın təhlili açılır.</span>
        </p>
      </main>
    </div>
  )
}

/** One strip of the figures the chart is about — no cards: one panel, four columns, the kind's own terms. */
function Headline({ reading }: { reading: YearReading }) {
  const { kind, total, latest, basis } = reading
  const change = latest ? changeOf(latest) : null
  const { whole, cents } = moneyParts(total.amount)
  const cells: { label: string; value: string; note: string; tone?: string }[] = []
  if (kind === 'monthly') {
    cells.push({ label: 'Təsdiqlənib', value: money(reading.approvedAmount), note: `${reading.approvedMonths} ayın sifarişləri` })
    for (const tile of reading.waiting) cells.push({ label: 'Təsdiq gözləyir', value: money(tile.amount), note: `${monthName(tile.month)} sifarişləri`, tone: 'text-(--c-amber)' })
  }
  if (kind === 'outside') {
    cells.push({ label: 'Sifarişlər', value: `${total.outsideCount}`, note: 'hər biri ayrıca razılıqla' })
    if (reading.peak) cells.push({ label: 'Ən yüksək ay', value: money(reading.peak.amount), note: monthName(reading.peak.month) })
  }
  if (kind === 'all') {
    cells.push({ label: 'Aylıq sifarişlər', value: money(reading.totals.monthly), note: 'ay üzrə bir dəfə təsdiq olunur' })
    cells.push({ label: 'Aylıqdan kənar', value: money(reading.totals.outside), note: 'hər biri ayrıca razılıqla' })
  }
  return (
    <dl className="mt-5 grid grid-cols-1 overflow-hidden rounded-xl border border-(--c-line) bg-(--c-surface) sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr] lg:divide-x lg:divide-(--c-line)">
      <div className="px-5 py-3.5">
        <dt className="text-xs font-semibold text-(--c-muted)">{kindNames[kind]} · {reading.period}</dt>
        <dd className="tnum mt-1 text-[30px] font-extrabold leading-none tracking-[-0.02em]">{whole}<span className="text-[0.5em] font-bold text-(--c-ink-2)">,{cents} ₼</span></dd>
        {kind === 'all' && <dd className="mt-1 text-xs text-(--c-muted)">Ümumi xərc, təsdiq ediləcək məbləğ deyil</dd>}
      </div>
      {cells.map((cell) => (
        <div key={cell.label} className="px-5 py-3.5">
          <dt className="text-xs font-semibold text-(--c-muted)">{cell.label}</dt>
          <dd className={`tnum mt-1.5 text-lg font-bold leading-none ${cell.tone ?? ''}`}>{cell.value}</dd>
          <dd className="mt-1 text-xs text-(--c-muted)">{cell.note}</dd>
        </div>
      ))}
      {latest && change && (
        <div className="px-5 py-3.5">
          <dt className="text-xs font-semibold text-(--c-muted)">{monthName(latest.month)}, {basisReference[basis]}</dt>
          {change.kind === 'value' ? (
            <>
              <dd className="mt-1.5"><Chip change={change} large /></dd>
              <dd className="tnum mt-1 text-xs text-(--c-muted)">{signedMoney(change.delta)}</dd>
            </>
          ) : <dd className="mt-1.5 text-sm text-(--c-muted)">{change.detail}</dd>}
        </div>
      )}
    </dl>
  )
}

function Chip({ change, large = false }: { change: Extract<ReturnType<typeof changeOf>, { kind: 'value' }>; large?: boolean }) {
  const tone = change.way === 'up' ? 'bg-(--c-up-soft) text-(--c-up)' : change.way === 'down' ? 'bg-(--c-down-soft) text-(--c-down)' : 'bg-(--c-band) text-(--c-muted)'
  return (
    <span className={`tnum inline-flex items-center gap-1 rounded-full font-bold ${large ? 'px-2.5 py-1 text-base' : 'px-1.5 py-0.5 text-[11px]'} ${tone}`}>
      <span aria-hidden="true" className={large ? 'text-xs' : 'text-[8px]'}>{arrowOf(change.way)}</span>{change.text}
    </span>
  )
}

const plotHeight = 'h-[clamp(10rem,calc(100dvh-29rem),16rem)]'

function MonthBar({ tile, kind, top, to, risen, order }: { tile: MonthTile; kind: Kind; top: number; to: string; risen: boolean; order: number }) {
  const change = changeOf(tile)
  const { open, handlers } = useTipTrigger()
  const bar = useRef<HTMLSpanElement>(null)
  const anchor = useCallback(() => bar.current, [])
  const height = top > 0 ? Math.max(tile.amount ? 1.5 : 0, ((tile.amount ?? 0) / top) * 100) : 0
  const mark = change.kind === 'value' && tile.comparison !== null ? (tile.comparison / top) * 100 : null
  const pending = kind === 'monthly' && tile.approval?.state === 'pending'
  const current = isCurrent(tile)
  const tipId = `c-tip-${tile.month}`
  const split = monthSplit(tile.month)
  const status = statusOf(tile, kind)

  return (
    <>
      <Link
        to={to}
        aria-describedby={tipId}
        aria-label={`${monthName(tile.month)} ${YEAR}: ${money(tile.amount)}`}
        {...handlers}
        className="group relative flex min-w-0 flex-col items-center rounded-lg pb-1 outline-offset-0"
      >
        {/* The hovered month's band, the full height of the plot. */}
        <span aria-hidden="true" className={`absolute inset-x-0.5 top-0 rounded-md transition-colors ${plotHeight} ${current ? 'bg-(--c-band)/60' : ''} group-hover:bg-(--c-band)`} />
        <span aria-hidden="true" className={`relative block w-full ${plotHeight}`}>
          <span
            ref={bar}
            className={`absolute bottom-0 left-1/2 w-[46%] max-w-9 origin-bottom rounded-t-[5px] transition-[height,transform,background-color] duration-500 ease-out motion-reduce:transition-none ${
              pending ? 'bg-(--c-bar-pending)' : 'bg-(--c-bar) group-hover:bg-(--c-bar-hover)'
            }`}
            style={{ height: `${height}%`, transform: `translateX(-50%) scaleY(${risen ? 1 : 0})`, transitionDelay: risen ? `${order * 35}ms` : '0ms' }}
          />
          {mark !== null && (
            <span
              className="absolute left-1/2 h-0.5 w-[70%] max-w-[3.25rem] -translate-x-1/2 rounded-full bg-(--c-marker) transition-[bottom] duration-500 ease-out motion-reduce:transition-none"
              style={{ bottom: `calc(${mark}% - 1px)` }}
            />
          )}
        </span>
        <span className={`mt-2 text-xs font-semibold ${current ? 'text-(--c-bar)' : 'text-(--c-ink-2)'}`}>{shortMonthNames[tile.month - 1]}</span>
        <span className="tnum mt-1 whitespace-nowrap text-[14px] font-extrabold leading-5 tracking-[-0.01em] xl:text-[15px]">{rounded(tile.amount)}</span>
        <span className="mt-1 flex h-5 items-center">
          {change.kind === 'value' ? <Chip change={change} /> : <span className="text-xs text-(--c-muted)" aria-label={change.detail}>—</span>}
        </span>
      </Link>
      <Tip id={tipId} anchor={anchor} open={open} surface="bg-(--c-tip) text-(--c-tip-ink)" arrow="bg-(--c-tip)" width="w-60">
        <p className="text-xs font-semibold opacity-70">{monthName(tile.month)} {YEAR} · {kindNames[kind]}</p>
        <p className="tnum text-lg font-extrabold leading-snug">{money(tile.amount)}</p>
        <dl className="mt-1.5 flex flex-col gap-0.5 text-xs">
          {change.kind === 'value' ? (
            <>
              <div className="flex justify-between gap-3">
                <dt className="opacity-70">{tile.period?.isAverage ? `Ortalama (${monthRange(tile.period.months, YEAR)})` : monthName(tile.month - 1)}</dt>
                <dd className="tnum font-semibold">{money(tile.comparison)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="opacity-70">Fərq</dt>
                <dd className="tnum font-semibold">{arrowOf(change.way)} {change.text} ({signedRounded(change.delta)})</dd>
              </div>
            </>
          ) : <div className="opacity-80">{change.detail}</div>}
        </dl>
        <dl className="mt-2 flex flex-col gap-0.5 border-t border-current/15 pt-2 text-xs">
          <div className="flex justify-between gap-3"><dt className="opacity-70">Aylıq sifarişlər</dt><dd className="tnum">{money(split.monthly)}</dd></div>
          {tile.approval && <div className="opacity-70">{statusOf(tile, 'monthly').long}</div>}
          <div className="flex justify-between gap-3"><dt className="opacity-70">Aylıqdan kənar ({split.outsideCount})</dt><dd className="tnum">{money(split.outside)}</dd></div>
          {status.tone === 'none' && kind === 'all' && <div className="mt-0.5 opacity-70">«Hamısı» təsdiq ediləcək məbləğ deyil</div>}
        </dl>
      </Tip>
    </>
  )
}

function FutureBar({ tile }: { tile: MonthTile }) {
  return (
    <div className="flex min-w-0 flex-col items-center pb-1 text-(--c-muted)" aria-label={`${monthName(tile.month)} ${YEAR}: hələ başlamayıb`}>
      <span aria-hidden="true" className={`relative block w-full ${plotHeight}`}>
        <span className="absolute inset-y-0 left-1/2 w-[46%] max-w-9 -translate-x-1/2 rounded-t-[5px] border border-b-0 border-dashed border-(--c-line)" />
      </span>
      <span className="mt-2 text-xs font-semibold">{shortMonthNames[tile.month - 1]}</span>
      <span className="mt-1 text-[11px] leading-5">hələ başlamayıb</span>
      <span className="mt-1 h-5" />
    </div>
  )
}

/** One month on the approval track: approved, waiting, or — for the outside-monthly requests — their count. */
function TrackCell({ tile, kind }: { tile: MonthTile; kind: Kind }) {
  if (tile.state !== 'data') return <span aria-hidden="true" className="mx-1 h-1.5 rounded-full border border-dashed border-(--c-line)" />
  if (kind === 'outside') return <span className="tnum text-center text-xs font-semibold text-(--c-ink-2)">{tile.outsideCount}</span>
  const status = statusOf(tile, kind)
  return (
    <span
      role="img"
      aria-label={`${monthName(tile.month)}: ${status.long}`}
      title={status.long}
      className={`mx-1 h-1.5 rounded-full ${status.tone === 'approved' ? 'bg-(--c-ok)' : status.tone === 'pending' ? 'track-pending' : 'bg-(--c-line)'}`}
    />
  )
}

/** A round top for the value axis and four or five steps up to it. */
function niceScale(max: number): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 1, ticks: [0] }
  const rough = max / 5
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? 10 * power
  const top = Math.ceil(max / step) * step
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step) }
}

const axisLabel = (value: number) => (value >= 1000 ? `${(value / 1000).toLocaleString('az')} min` : `${value}`)
