import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { BarChart3, SquareArrowOutUpRight, X } from 'lucide-react'
import type { Kind } from '../../data/analysis'
import { money, monthName, percent, shortMonthNames, signedMoney } from '../../lib/format'
import { axisLabel, niceScale } from '../../pages/YearPage'
import { kindNames } from '../../lib/year'
import { overviewLinks, hasYear } from '../../overview/links'
import type { MonthPair } from '../../overview/metrics'
import { CardTitle, ChangeChip, Swatch } from '../ui'

/*
 * «İllərarası xərc dinamikası»: each month of the period, the earlier year (teal) beside the focus year (violet). A month
 * is one button: hover or focus shows both figures and the difference in manats and per cent; a click pins it below the
 * chart with the way into that month's analysis in either year. Arrow keys move between months. A year can be hidden
 * from the key. A month a year has no figures for is drawn as an empty outline, never as a zero; a month whose monthly
 * package still waits for approval is hatched.
 */

export function YoyChart({ pairs, focusYear, previousYear, kind }: {
  pairs: readonly MonthPair[]
  focusYear: number
  previousYear: number | null
  kind: Kind
}) {
  const [shown, setShown] = useState({ previous: previousYear !== null, focus: true })
  const [selected, setSelected] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const pinned = pairs.find((pair) => pair.month === selected) ?? null
  const active = hovered ?? focused
  const activeIndex = pairs.findIndex((pair) => pair.month === active)

  const largest = Math.max(0, ...pairs.flatMap((pair) => [shown.previous ? pair.previous ?? 0 : 0, shown.focus ? pair.current ?? 0 : 0]))
  const scale = niceScale(largest)
  const height = (value: number | null) => (value === null || scale.top <= 0 ? 0 : Math.max(value > 0 ? 1 : 0, (value / scale.top) * 100))
  const hatchPending = kind === 'monthly'
  const anyPending = hatchPending && pairs.some((pair) => pair.currentStatus === 'pending')
  const rovingIndex = Math.max(0, pairs.findIndex((pair) => pair.month === (focused ?? selected)))

  function toggle(which: 'previous' | 'focus') {
    const next = { ...shown, [which]: !shown[which] }
    // One year always stays: an empty chart says nothing.
    if (!next.previous && !next.focus) return
    setShown(next)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: pairs.length - 1 }
    if (event.key === 'Escape') {
      setSelected(null)
      return
    }
    if (!(event.key in moves)) return
    event.preventDefault()
    const next = Math.min(pairs.length - 1, Math.max(0, moves[event.key]))
    buttons.current[next]?.focus()
  }

  const label = (pair: MonthPair) => {
    const parts = [`${monthName(pair.month)}`]
    if (previousYear !== null) parts.push(`${previousYear}: ${pair.previous === null ? 'məlumat yoxdur' : money(pair.previous)}`)
    parts.push(`${focusYear}: ${pair.current === null ? 'məlumat yoxdur' : money(pair.current)}`)
    if (pair.delta !== null) parts.push(`fərq ${signedMoney(pair.delta)}${pair.pct !== null ? `, ${percent(pair.pct)}` : ''}`)
    if (pair.inProgress) parts.push('ay davam edir')
    if (hatchPending && pair.currentStatus === 'pending') parts.push(`${focusYear} sifarişləri təsdiq gözləyir`)
    return parts.join('; ')
  }

  return (
    <section aria-labelledby="yoy-title" className="x-card flex min-w-0 flex-col px-5 pb-4 pt-5 sm:px-6">
      <CardTitle
        id="yoy-title"
        icon={BarChart3}
        aside={(
          <div className="flex flex-col items-end gap-2">
            {hasYear(focusYear) && (
              <Link to={overviewLinks.analysis(focusYear, kind)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md text-sm font-semibold text-(--x-link) underline-offset-4 hover:underline">
                <SquareArrowOutUpRight aria-hidden="true" className="size-4" />
                Ətraflı analiz
              </Link>
            )}
            <div role="group" aria-label="Göstərilən illər" className="flex flex-wrap items-center justify-end gap-1.5">
              {previousYear !== null && (
                <LegendButton pressed={shown.previous} onClick={() => toggle('previous')} tone="prev" year={previousYear} />
              )}
              <LegendButton pressed={shown.focus} onClick={() => toggle('focus')} tone="focus" year={focusYear} />
            </div>
          </div>
        )}
      >
        <span className="flex flex-col">
          İllərarası xərc dinamikası
          <span className="text-sm font-medium tracking-normal text-(--x-ink-2)">Aylıq məbləğ · {kindNames[kind]}</span>
        </span>
      </CardTitle>

      {/* On a phone the months keep their width and the chart scrolls inside its card, never the page. */}
      <div className="relative -mx-1 mt-3 overflow-x-auto px-1 pb-1">
        <div className="relative min-w-[520px] pt-3">
          <div className="relative grid h-60 grid-cols-[3.5rem_minmax(0,1fr)]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {scale.ticks.map((value) => (
                <div key={value} className="absolute inset-x-0 border-t border-dashed border-(--x-line)" style={{ bottom: `${(value / scale.top) * 100}%` }}>
                  <span className="tnum absolute -top-2.5 left-0 w-12 text-right text-xs text-(--x-muted)">{axisLabel(value)}</span>
                </div>
              ))}
            </div>
            <span />
            <div className="relative grid" style={{ gridTemplateColumns: `repeat(${pairs.length}, minmax(0, 1fr))` }} onPointerLeave={() => setHovered(null)}>
              {pairs.map((pair, index) => {
                const isActive = active === pair.month || selected === pair.month
                const pending = hatchPending && pair.currentStatus === 'pending'
                return (
                  <button
                    key={pair.month}
                    ref={(element) => { buttons.current[index] = element }}
                    type="button"
                    tabIndex={index === rovingIndex ? 0 : -1}
                    aria-pressed={selected === pair.month}
                    aria-label={label(pair)}
                    onPointerEnter={(event) => { if (event.pointerType !== 'touch') setHovered(pair.month) }}
                    onFocus={() => setFocused(pair.month)}
                    onBlur={() => setFocused(null)}
                    onKeyDown={(event) => onKeyDown(event, index)}
                    onClick={() => setSelected(selected === pair.month ? null : pair.month)}
                    className="group relative flex h-full items-end justify-center gap-[3px] rounded-md px-[12%] focus-visible:outline-offset-0"
                  >
                    <span aria-hidden="true" className={`absolute inset-0 rounded-md transition-colors ${isActive ? 'bg-(--x-band)' : 'group-hover:bg-(--x-band)/70'}`} />
                    {shown.previous && <Bar value={pair.previous} height={height(pair.previous)} tone="prev" />}
                    {shown.focus && <Bar value={pair.current} height={height(pair.current)} tone="focus" pending={pending} />}
                  </button>
                )
              })}
              {activeIndex >= 0 && (
                <ChartTip
                  pair={pairs[activeIndex]}
                  index={activeIndex}
                  count={pairs.length}
                  barTop={Math.max(shown.previous ? height(pairs[activeIndex].previous) : 0, shown.focus ? height(pairs[activeIndex].current) : 0)}
                  focusYear={focusYear}
                  previousYear={previousYear}
                  pending={hatchPending && pairs[activeIndex].currentStatus === 'pending'}
                />
              )}
            </div>
          </div>
          <div aria-hidden="true" className="mt-2 grid grid-cols-[3.5rem_minmax(0,1fr)]">
            <span />
            <div className="grid" style={{ gridTemplateColumns: `repeat(${pairs.length}, minmax(0, 1fr))` }}>
              {pairs.map((pair) => (
                <span key={pair.month} className={`text-center text-sm ${selected === pair.month || active === pair.month ? 'font-bold text-(--x-ink)' : 'text-(--x-ink-2)'}`}>
                  {shortMonthNames[pair.month - 1]}
                  {pair.inProgress && <span className="ml-0.5 text-(--x-focus-year-ink)" title="Ay davam edir">•</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {(anyPending || pairs.some((pair) => pair.inProgress)) && (
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--x-muted)">
          {anyPending && <span className="inline-flex items-center gap-1.5"><Swatch tone="focus" hatch />Ştrixli: {focusYear} sifarişləri təsdiq gözləyir</span>}
          {pairs.some((pair) => pair.inProgress) && <span><span className="font-bold text-(--x-focus-year-ink)">•</span> Ay davam edir: məbləğ hələ arta bilər</span>}
        </p>
      )}

      <div className="mt-3 border-t border-(--x-line) pt-3" aria-live="polite">
        {pinned ? (
          <PinnedMonth pair={pinned} focusYear={focusYear} previousYear={previousYear} kind={kind} onClose={() => { setSelected(null); buttons.current[pairs.indexOf(pinned)]?.focus() }} />
        ) : (
          <p className="text-sm text-(--x-muted)">Aya klikləyin: iki ilin fərqi və həmin ayın təhlilinə keçid burada açılır.</p>
        )}
      </div>
    </section>
  )
}

function LegendButton({ pressed, onClick, tone, year }: { pressed: boolean; onClick: () => void; tone: 'prev' | 'focus'; year: number }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      title={pressed ? `${year} ilini gizlət` : `${year} ilini göstər`}
      className={`inline-flex min-h-8 items-center gap-2 rounded-md px-2 text-sm font-semibold transition-colors hover:bg-(--x-band) ${pressed ? 'text-(--x-ink)' : 'text-(--x-muted) line-through decoration-2'}`}
    >
      <span className={pressed ? '' : 'opacity-40'}><Swatch tone={tone} /></span>
      {year}
    </button>
  )
}

function Bar({ value, height, tone, pending = false }: { value: number | null; height: number; tone: 'prev' | 'focus'; pending?: boolean }) {
  if (value === null) {
    return <span aria-hidden="true" className="relative block h-[18%] w-full max-w-7 rounded-t-[5px] border border-b-0 border-dashed border-(--x-line-2)" />
  }
  return (
    <span
      aria-hidden="true"
      className={`relative block w-full max-w-7 rounded-t-[5px] transition-[height] duration-300 ease-out motion-reduce:transition-none ${tone === 'prev' ? 'bg-(--x-prev)' : 'bg-(--x-focus-year)'} ${pending ? 'x-hatch' : ''}`}
      style={{ height: `${height}%` }}
    />
  )
}

/**
 * The month's two figures and their difference, never over its own bars: above them when they are short, beside the
 * column when they are tall — on the side with more room — and always inside the plot, so no scrolling box cuts it.
 */
function ChartTip({ pair, index, count, barTop, focusYear, previousYear, pending }: {
  pair: MonthPair
  index: number
  count: number
  /** The taller shown bar of the month, in per cent of the plot. */
  barTop: number
  focusYear: number
  previousYear: number | null
  pending: boolean
}) {
  const start = (index / count) * 100
  const end = ((index + 1) / count) * 100
  let style: CSSProperties
  if (barTop <= 52) {
    const edge = index < 2 ? 'left' : index > count - 3 ? 'right' : 'centre'
    style = {
      bottom: `calc(${barTop}% + 10px)`,
      ...(edge === 'left' ? { left: `${start}%` } : edge === 'right' ? { right: `${100 - end}%` } : { left: `${(start + end) / 2}%`, transform: 'translateX(-50%)' }),
    }
  } else {
    style = { top: 0, ...(index < count / 2 ? { left: `calc(${end}% + 6px)` } : { right: `calc(${100 - start}% + 6px)` }) }
  }
  return (
    <div role="presentation" className="pointer-events-none absolute z-10 w-52 rounded-lg bg-(--x-tip) px-3.5 py-2.5 text-(--x-tip-ink) shadow-xl" style={style}>
      <p className="text-sm font-extrabold">{monthName(pair.month)}{pair.inProgress ? ' · davam edir' : ''}</p>
      <dl className="mt-1 flex flex-col gap-0.5 text-[13px]">
        {previousYear !== null && (
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5"><Swatch tone="prev" />{previousYear}</dt>
            <dd className="tnum font-bold">{pair.previous === null ? 'yoxdur' : money(pair.previous)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5"><Swatch tone="focus" hatch={pending} />{focusYear}</dt>
          <dd className="tnum font-bold">{pair.current === null ? 'yoxdur' : money(pair.current)}</dd>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-current/20 pt-1">
          <dt>Fərq</dt>
          <dd className="tnum font-bold">{pair.delta === null ? '—' : `${signedMoney(pair.delta)}${pair.pct !== null ? ` · ${percent(pair.pct)}` : ''}`}</dd>
        </div>
        {pending && <p className="opacity-80">{focusYear}: təsdiq gözləyir</p>}
      </dl>
    </div>
  )
}

function PinnedMonth({ pair, focusYear, previousYear, kind, onClose }: { pair: MonthPair; focusYear: number; previousYear: number | null; kind: Kind; onClose: () => void }) {
  const button = 'inline-flex min-h-9 items-center rounded-lg border border-(--x-line-2) px-3 text-sm font-semibold hover:bg-(--x-band)'
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <p className="text-base font-extrabold">{monthName(pair.month)}</p>
      <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        {previousYear !== null && <div className="flex items-center gap-1.5"><Swatch tone="prev" /><dt className="text-(--x-muted)">{previousYear}:</dt><dd className="tnum font-bold">{pair.previous === null ? 'məlumat yoxdur' : money(pair.previous)}</dd></div>}
        <div className="flex items-center gap-1.5"><Swatch tone="focus" /><dt className="text-(--x-muted)">{focusYear}:</dt><dd className="tnum font-bold">{pair.current === null ? 'məlumat yoxdur' : money(pair.current)}</dd></div>
        <div className="flex items-center gap-1.5"><dt className="text-(--x-muted)">Fərq:</dt><dd className="flex items-center gap-1.5"><span className="tnum font-bold">{signedMoney(pair.delta)}</span><ChangeChip pct={pair.pct} delta={pair.delta} reason="müqayisə yoxdur" /></dd></div>
      </dl>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {pair.current !== null && <Link to={overviewLinks.month(focusYear, pair.month, kind)} className={button}>{monthName(pair.month)} {focusYear} təhlili</Link>}
        {previousYear !== null && pair.previous !== null && <Link to={overviewLinks.month(previousYear, pair.month, kind)} className={button}>{monthName(pair.month)} {previousYear}</Link>}
        <button type="button" onClick={onClose} aria-label="Seçimi bağla" className="grid size-9 place-items-center rounded-lg text-(--x-muted) hover:bg-(--x-band) hover:text-(--x-ink)">
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  )
}
