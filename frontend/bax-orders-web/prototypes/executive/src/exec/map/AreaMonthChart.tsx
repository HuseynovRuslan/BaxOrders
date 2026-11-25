import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { BarChart3 } from 'lucide-react'
import type { Kind } from '../../data/analysis'
import { money, monthName, percent, shortMonthNames, signedMoney } from '../../lib/format'
import { kindNames } from '../../lib/year'
import { axisLabel, niceScale } from '../../pages/YearPage'
import { isFuture, type CompareMode, type YearMonth } from '../../overview/compare'
import type { MonthPair } from '../../overview/metrics'
import { Swatch } from '../ui'

/*
 * One object's twelve months: the year before (teal) beside the focus year (violet), as on the overview's chart. The
 * period's months stand on a band; under «Əvvəlki ay / dövr» the months it is compared with are outlined. Each month is a
 * button — the bars and the name alike: a click opens that month's orders («Sifarişlər»). A month a year has no figures
 * for is an empty outline, never a zero; a month still to come cannot be opened; a month whose monthly package waits
 * for approval is hatched. Arrow keys move between months.
 */

export function AreaMonthChart({ pairs, focusYear, previousYear, kind, period, baseline, mode, drill, onDrill, areaName }: {
  pairs: readonly MonthPair[]
  focusYear: number
  previousYear: number | null
  kind: Kind
  /** The focus year's months in the period. */
  period: readonly number[]
  /** The months the period is compared with. */
  baseline: readonly YearMonth[]
  mode: CompareMode
  /** The month whose orders are open, if any. */
  drill: number | null
  onDrill: (month: number) => void
  areaName: string
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const active = hovered ?? focused
  const activeIndex = pairs.findIndex((pair) => pair.month === active)

  const largest = Math.max(0, ...pairs.flatMap((pair) => [pair.previous ?? 0, pair.current ?? 0]))
  const scale = niceScale(largest)
  const height = (value: number | null) => (value === null || scale.top <= 0 ? 0 : Math.max(value > 0 ? 1.5 : 0, (value / scale.top) * 100))
  const hatchPending = kind === 'monthly'
  const anyPending = hatchPending && pairs.some((pair) => pair.currentStatus === 'pending')
  const future = (month: number) => isFuture({ year: focusYear, month })
  const isBase = (year: number | null, month: number) => mode === 'previous' && year !== null && baseline.some((at) => at.year === year && at.month === month)
  const enabled = pairs.map((pair) => !future(pair.month))
  const roving = Math.max(0, pairs.findIndex((pair, index) => enabled[index] && pair.month === (focused ?? drill ?? period.at(-1))))

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 }
    let next: number | null = null
    if (event.key in step) {
      for (let at = index + step[event.key]; at >= 0 && at < pairs.length; at += step[event.key]) if (enabled[at]) { next = at; break }
    } else if (event.key === 'Home') next = enabled.indexOf(true)
    else if (event.key === 'End') next = enabled.lastIndexOf(true)
    if (next === null || next < 0) return
    event.preventDefault()
    buttons.current[next]?.focus()
  }

  const describe = (pair: MonthPair) => {
    const parts = [`${monthName(pair.month)} ${focusYear}`]
    if (future(pair.month)) return `${parts[0]}: ay hələ gəlməyib`
    if (previousYear !== null) parts.push(`${previousYear}: ${pair.previous === null ? 'məlumat yoxdur' : money(pair.previous)}`)
    parts.push(`${focusYear}: ${pair.current === null ? 'məlumat yoxdur' : money(pair.current)}`)
    if (pair.delta !== null) parts.push(`fərq ${signedMoney(pair.delta)}${pair.pct !== null ? `, ${percent(pair.pct)}` : ''}`)
    if (pair.inProgress) parts.push('ay davam edir')
    if (hatchPending && pair.currentStatus === 'pending') parts.push('təsdiq gözləyir')
    parts.push('sifarişləri açmaq üçün seçin')
    return parts.join('; ')
  }

  return (
    <section aria-labelledby="area-chart-title" className="rounded-xl border border-(--x-line) bg-(--x-surface) px-4 pb-3 pt-3.5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 id="area-chart-title" className="flex items-center gap-2 text-[16px] font-extrabold">
            <BarChart3 aria-hidden="true" className="size-5 shrink-0" />
            {previousYear !== null ? `Aylıq məbləğ · ${previousYear} və ${focusYear}` : `Aylıq məbləğ · ${focusYear}`}
          </h3>
          <p className="text-[13px] text-(--x-ink-2)">{kindNames[kind]} · aya klikləyin — sifarişlər açılır</p>
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold">
          {previousYear !== null && <span className="flex items-center gap-1.5"><Swatch tone="prev" />{previousYear}</span>}
          <span className="flex items-center gap-1.5"><Swatch tone="focus" />{focusYear}</span>
          {mode === 'previous' && <span className="flex items-center gap-1.5 font-medium text-(--x-ink-2)"><span aria-hidden="true" className="inline-block size-3 rounded-[3px] border-2 border-dashed border-(--x-ink-2)" />baza</span>}
        </p>
      </div>

      {/* On a narrow panel the months keep their width and the chart scrolls inside its box, never the page. */}
      <div className="relative -mx-1 mt-3 overflow-x-auto px-1 pb-1">
        <div className="relative min-w-[360px] pt-2">
          <div className="relative grid h-44 grid-cols-[3.25rem_minmax(0,1fr)]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-6 top-0">
              {scale.ticks.map((value) => (
                <div key={value} className="absolute inset-x-0 border-t border-dashed border-(--x-line)" style={{ bottom: `${(value / scale.top) * 100}%` }}>
                  <span className="tnum absolute -top-2.5 left-0 w-12 whitespace-nowrap text-right text-[11px] text-(--x-muted)">{axisLabel(value)}</span>
                </div>
              ))}
            </div>
            <span />
            <ol
              aria-label={`${areaName}: aylar üzrə məbləğ`}
              className="relative grid"
              style={{ gridTemplateColumns: `repeat(${pairs.length}, minmax(0, 1fr))` }}
              onPointerLeave={() => setHovered(null)}
            >
              {pairs.map((pair, index) => {
                const inPeriod = period.includes(pair.month)
                const opened = drill === pair.month
                const pending = hatchPending && pair.currentStatus === 'pending'
                const later = !enabled[index]
                return (
                  <li key={pair.month} className="flex min-w-0">
                    <button
                      ref={(element) => { buttons.current[index] = element }}
                      type="button"
                      disabled={later}
                      tabIndex={index === roving ? 0 : -1}
                      aria-pressed={opened}
                      aria-label={describe(pair)}
                      data-month={pair.month}
                      onPointerEnter={(event) => { if (event.pointerType !== 'touch') setHovered(pair.month) }}
                      onFocus={() => setFocused(pair.month)}
                      onBlur={() => setFocused(null)}
                      onKeyDown={(event) => onKeyDown(event, index)}
                      onClick={() => onDrill(pair.month)}
                      className={`group relative flex h-full w-full flex-col items-stretch rounded-md focus-visible:outline-offset-0 disabled:cursor-not-allowed ${opened ? 'ring-2 ring-(--x-focus)' : ''}`}
                    >
                      <span aria-hidden="true" className={`absolute inset-0 rounded-md transition-colors ${inPeriod ? 'bg-(--x-band)' : later ? '' : 'group-hover:bg-(--x-band)/60'}`} />
                      <span aria-hidden="true" className="relative flex min-h-0 flex-1 items-end justify-center gap-[2px] px-[14%]">
                        {later ? (
                          <span className="mb-1 text-[11px] text-(--x-muted)">—</span>
                        ) : (
                          <>
                            {previousYear !== null && <Bar value={pair.previous} height={height(pair.previous)} tone="prev" base={isBase(previousYear, pair.month)} />}
                            <Bar value={pair.current} height={height(pair.current)} tone="focus" pending={pending} base={isBase(focusYear, pair.month)} />
                          </>
                        )}
                      </span>
                      <span aria-hidden="true" className={`relative mt-1 h-5 text-center text-[12px] leading-5 ${opened || inPeriod ? 'font-bold text-(--x-ink)' : later ? 'text-(--x-muted)' : 'text-(--x-ink-2)'}`}>
                        {shortMonthNames[pair.month - 1]}
                        {pair.inProgress && <span className="text-(--x-focus-year-ink)">•</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
              {activeIndex >= 0 && enabled[activeIndex] && (
                <Tip
                  pair={pairs[activeIndex]}
                  index={activeIndex}
                  count={pairs.length}
                  top={Math.max(height(pairs[activeIndex].previous), height(pairs[activeIndex].current))}
                  focusYear={focusYear}
                  previousYear={previousYear}
                  pending={hatchPending && pairs[activeIndex].currentStatus === 'pending'}
                />
              )}
            </ol>
          </div>
        </div>
      </div>

      {(anyPending || pairs.some((pair) => pair.inProgress) || pairs.some((pair) => pair.current === null && !future(pair.month))) && (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--x-muted)">
          {anyPending && <span className="inline-flex items-center gap-1.5"><Swatch tone="focus" hatch />Ştrixli: təsdiq gözləyir</span>}
          {pairs.some((pair) => pair.inProgress) && <span><span className="font-bold text-(--x-focus-year-ink)">•</span> Ay davam edir</span>}
          {pairs.some((pair) => (pair.current === null && !future(pair.month)) || (previousYear !== null && pair.previous === null)) && (
            <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-3 w-2.5 rounded-t-[3px] border border-b-0 border-dashed border-(--x-line-2)" />Məlumat yoxdur</span>
          )}
        </p>
      )}
    </section>
  )
}

function Bar({ value, height, tone, pending = false, base = false }: { value: number | null; height: number; tone: 'prev' | 'focus'; pending?: boolean; base?: boolean }) {
  // Only a bar that stands can be outlined: an empty month keeps its own dashed «no figures» outline.
  const ring = base && value ? 'outline-2 outline-offset-1 outline-dashed outline-(--x-ink-2)' : ''
  if (value === null) {
    return <span className="block h-[18%] w-full max-w-5 rounded-t-[4px] border border-b-0 border-dashed border-(--x-line-2)" />
  }
  return (
    <span
      className={`block w-full max-w-5 rounded-t-[4px] transition-[height] duration-300 ease-out motion-reduce:transition-none ${tone === 'prev' ? 'bg-(--x-prev)' : 'bg-(--x-focus-year)'} ${pending ? 'x-hatch' : ''} ${ring}`}
      style={{ height: `${height}%` }}
    />
  )
}

/** The month's two figures and their difference, above the bars or beside a tall column, always inside the plot. */
function Tip({ pair, index, count, top, focusYear, previousYear, pending }: {
  pair: MonthPair
  index: number
  count: number
  top: number
  focusYear: number
  previousYear: number | null
  pending: boolean
}) {
  const start = (index / count) * 100
  const end = ((index + 1) / count) * 100
  let style: CSSProperties
  if (top <= 45) {
    const edge = index < 2 ? 'left' : index > count - 3 ? 'right' : 'centre'
    style = {
      bottom: `calc(${top * 0.86}% + 34px)`,
      ...(edge === 'left' ? { left: `${start}%` } : edge === 'right' ? { right: `${100 - end}%` } : { left: `${(start + end) / 2}%`, transform: 'translateX(-50%)' }),
    }
  } else {
    style = { top: 0, ...(index < count / 2 ? { left: `calc(${end}% + 4px)` } : { right: `calc(${100 - start}% + 4px)` }) }
  }
  return (
    <div role="presentation" className="pointer-events-none absolute z-10 w-48 rounded-lg bg-(--x-tip) px-3 py-2 text-(--x-tip-ink) shadow-xl" style={style}>
      <p className="text-[13px] font-extrabold">{monthName(pair.month)}{pair.inProgress ? ' · davam edir' : ''}</p>
      <dl className="mt-1 flex flex-col gap-0.5 text-[12px]">
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
        {previousYear !== null && (
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-current/20 pt-1">
            <dt>Fərq</dt>
            <dd className="tnum font-bold">{pair.delta === null ? '—' : `${signedMoney(pair.delta)}${pair.pct !== null ? ` · ${percent(pair.pct)}` : ''}`}</dd>
          </div>
        )}
        {pending && <p className="opacity-80">təsdiq gözləyir</p>}
      </dl>
    </div>
  )
}
