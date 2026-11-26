import { useRef, type KeyboardEvent } from 'react'
import { CalendarRange } from 'lucide-react'
import type { Kind } from '../../data/analysis'
import { money, monthName, percent, signedMoney } from '../../lib/format'
import { kindNames } from '../../lib/year'
import { isInProgress, monthsLabel, type YearTotal } from '../../overview/metrics'
import { niceScale } from '../../pages/YearPage'
import { CardTitle, ChangeChip } from '../ui'

/*
 * «İllər üzrə xərc»: every year the figures have, each over all of its own months, so a year is never read alone. The
 * year on screen is violet and the year it is compared with teal, as everywhere on the page. When the year on screen is
 * not whole («2026 · Yan–Noy»), every other bar is split: its lower part is the year over those same months — what the
 * comparison above stands on — and its upper part the rest of the year; the whole year's figure stays on top. Beside a
 * whole year on screen, a year that is not whole is only outlined: it is shown, never read against it. Under each bar its change against the year before, over the months both
 * have. A click on a year puts it on screen. The chart reads neither the period nor the approval filter.
 */

export function YearsChart({ years, focusYear, kind, filtered, onYear }: {
  years: readonly YearTotal[]
  focusYear: number
  kind: Kind
  /** The period or the approval filter narrows the cards above: said, since this chart reads whole years. */
  filtered: boolean
  onYear: (year: number) => void
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const focus = years.find((item) => item.year === focusYear)
  const compared = focus?.change?.previousYear ?? null
  const split = years.some((item) => item.sameMonths !== null)
  const focusRange = focus ? monthsLabel(focus.months) : ''
  const scale = niceScale(Math.max(0, ...years.map((item) => item.amount)))
  const height = (value: number) => (scale.top <= 0 ? 0 : Math.max(value > 0 ? 1 : 0, (value / scale.top) * 100))
  const running = focus?.inProgress ? focus.months.find((month) => isInProgress(focusYear, month)) ?? null : null

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: years.length - 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    buttons.current[Math.min(years.length - 1, Math.max(0, moves[event.key]))]?.focus()
  }

  const range = (item: YearTotal) => (item.whole ? 'Yan–Dek' : monthsLabel(item.months))
  const label = (item: YearTotal) => {
    const parts = [`${item.year}, ${range(item)}: ${money(item.amount)}`]
    if (item.sameMonths !== null) parts.push(`${focusRange}: ${money(item.sameMonths)}`)
    if (item.change) parts.push(`${item.change.previousYear} ilinə görə, ${monthsLabel(item.change.aligned)}: ${signedMoney(item.change.delta)}${item.change.pct !== null ? `, ${percent(item.change.pct)}` : ''}`)
    if (item.inProgress) parts.push('il davam edir')
    if (item.year === focusYear) parts.push('ekrandadır')
    return parts.join('; ')
  }

  return (
    <section aria-labelledby="years-title" className="x-card flex min-w-0 flex-col px-5 pb-4 pt-5 sm:px-6">
      <CardTitle id="years-title" icon={CalendarRange} aside={<span className="tnum pt-1 text-sm font-semibold text-(--x-ink-2)">{years[0]?.year}–{years.at(-1)?.year}</span>}>
        <span className="flex flex-col">
          İllər üzrə xərc
          <span className="text-sm font-medium tracking-normal text-(--x-ink-2)">{kindNames[kind]} · hər il öz ayları üzrə · ilə klikləyin, ekrana gəlir</span>
        </span>
      </CardTitle>

      <div className="relative -mx-1 mt-3 overflow-x-auto px-1 pb-1">
        <div className="relative min-w-[460px] pt-6">
          <div className="relative grid h-56 grid-cols-[3.5rem_minmax(0,1fr)]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {scale.ticks.map((value) => (
                <div key={value} className="absolute inset-x-0 border-t border-dashed border-(--x-line)" style={{ bottom: `${(value / scale.top) * 100}%` }}>
                  <span className="tnum absolute -top-2.5 left-0 w-12 text-right text-xs text-(--x-muted)">{yearAxisLabel(value)}</span>
                </div>
              ))}
            </div>
            <span />
            <div role="group" aria-label="İllər" className="relative grid" style={{ gridTemplateColumns: `repeat(${years.length}, minmax(0, 1fr))` }}>
              {years.map((item, index) => {
                const current = item.year === focusYear
                const tone = current ? 'focus' : item.year === compared ? 'prev' : 'other'
                const solid = item.sameMonths ?? item.amount
                return (
                  <button
                    key={item.year}
                    ref={(element) => { buttons.current[index] = element }}
                    type="button"
                    data-year={item.year}
                    aria-current={current ? 'true' : undefined}
                    aria-label={label(item)}
                    tabIndex={current ? 0 : -1}
                    onKeyDown={(event) => onKeyDown(event, index)}
                    onClick={() => { if (!current) onYear(item.year) }}
                    className={`group relative flex h-full flex-col items-center justify-end rounded-md px-[18%] focus-visible:outline-offset-0 ${current ? 'bg-(--x-focus-year-soft)/60' : 'hover:bg-(--x-band)/70'}`}
                  >
                    <span aria-hidden="true" className={`tnum mb-1 whitespace-nowrap text-[13px] ${current ? 'font-extrabold text-(--x-ink)' : 'font-semibold text-(--x-ink-2)'}`}>{money(item.amount)}</span>
                    <span aria-hidden="true" className="relative flex w-full max-w-14 flex-col justify-end" style={{ height: `${height(item.amount)}%` }}>
                      {item.sameMonths !== null && item.amount > solid && (
                        <span className={`block w-full rounded-t-[5px] ${barTone[tone].rest}`} style={{ height: `${((item.amount - solid) / item.amount) * 100}%` }} />
                      )}
                      <span
                        className={`block w-full ${item.sameMonths !== null && item.amount > solid ? '' : 'rounded-t-[5px]'} ${item.whole || current ? barTone[tone].solid : barTone[tone].partial}`}
                        style={{ height: item.amount > 0 ? `${(solid / item.amount) * 100}%` : '0%' }}
                      />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div aria-hidden="true" className="mt-2 grid grid-cols-[3.5rem_minmax(0,1fr)]">
            <span />
            <div className="grid" style={{ gridTemplateColumns: `repeat(${years.length}, minmax(0, 1fr))` }}>
              {years.map((item) => (
                <span key={item.year} className="flex flex-col items-center gap-0.5 text-center leading-tight">
                  <span className={`tnum text-sm ${item.year === focusYear ? 'font-extrabold text-(--x-focus-year-ink)' : 'font-semibold text-(--x-ink-2)'}`}>{item.year}</span>
                  <span className="text-[11.5px] text-(--x-muted)">{range(item)}</span>
                  {item.sameMonths !== null && <span className="tnum text-[11.5px] text-(--x-ink-2)">{focusRange}: {money(item.sameMonths)}</span>}
                  <span className="mt-1">
                    {item.change
                      ? <span title={`${monthsLabel(item.change.aligned)} ${item.year} ilə ${monthsLabel(item.change.aligned)} ${item.change.previousYear}: ${money(item.change.previous)} → ${money(item.change.current)}`}><ChangeChip pct={item.change.pct} delta={item.change.delta} /></span>
                      : <span className="text-xs text-(--x-muted)">əvvəlki il yoxdur</span>}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-1 border-t border-(--x-line) pt-3 text-[12.5px] text-(--x-muted)">
        <li>Fərq hər ilin altında: əvvəlki illə, hər ikisində məlumatı olan aylar üzrə.</li>
        {split && <li>{focusYear} natamamdır ({focusRange}): sütunların alt hissəsi digər illərin eyni aylarıdır və müqayisə onlarla aparılır; üst hissə ilin qalan aylarıdır.</li>}
        {!split && years.some((item) => !item.whole && item.year !== focusYear) && <li>Kəsik xətt: il natamamdır, yalnız göstərilən ayları var — tam illə tutuşdurulmur.</li>}
        {running && <li>{monthName(running)} {focusYear} davam edir: məbləğ arta bilər.</li>}
        {filtered && <li>Bu qrafik dövr və təsdiq filtrindən asılı deyil: hər il bütün ayları ilə göstərilir.</li>}
      </ul>
    </section>
  )
}

/** «500 min», «1,5 mln»: the axis of yearly sums. */
function yearAxisLabel(value: number): string {
  if (value >= 1_000_000) return `${String(Math.round(value / 100_000) / 10).replace('.', ',')} mln`
  if (value >= 1000) return `${Math.round(value / 1000)} min`
  return String(value)
}

const barTone = {
  focus: { solid: 'bg-(--x-focus-year)', partial: 'border border-b-0 border-dashed border-(--x-focus-year) bg-(--x-focus-year-soft)', rest: 'bg-(--x-focus-year)/35' },
  prev: { solid: 'bg-(--x-prev)', partial: 'border border-b-0 border-dashed border-(--x-prev) bg-(--x-prev-soft)', rest: 'bg-(--x-prev)/35' },
  other: { solid: 'bg-(--x-ink-2)/45', partial: 'border border-b-0 border-dashed border-(--x-ink-2)/70 bg-(--x-ink-2)/10', rest: 'bg-(--x-ink-2)/20' },
} as const
