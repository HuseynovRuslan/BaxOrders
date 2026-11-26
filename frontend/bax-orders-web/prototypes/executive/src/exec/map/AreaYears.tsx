import { CalendarRange, CircleAlert } from 'lucide-react'
import type { Kind } from '../../data/analysis'
import { money, monthName, ordinal, percent } from '../../lib/format'
import { kindNames } from '../../lib/year'
import { isInProgress, monthsLabel } from '../../overview/metrics'
import type { AreaYear, AreaYearFacts } from '../../overview/areas'

/*
 * «İllər üzrə»: one object's every year with figures, so the year on screen is never read alone — what the object spent
 * in it, its part of every object's spending, its place among them and its monthly average, and where the period chosen
 * above stands in it. Each year is summed over its own months with figures and says which months they are. Beside a
 * not-whole year on screen («2026 · Yan–Noy») every year that has those months also shows its amount over them
 * («Yan–Noy: 1.000 ₼», the left part of its bar): the figure the comparison above stands on, so «2025» is never two
 * unexplained numbers. Beside a whole year on screen, a year that is not whole is only outlined: shown, never read
 * against it. A year the object ordered nothing in is a real 0 — «sifariş yoxdur» — since the year has figures.
 * A click on a year opens it.
 */

export function AreaYears({ years, facts, kind, period, onYear }: {
  years: readonly AreaYear[]
  facts: AreaYearFacts
  kind: Kind
  /** The period chosen above, when it is only part of the year: its label and amount. */
  period: { label: string; amount: number } | null
  onYear: (year: number) => void
}) {
  const largest = Math.max(0, ...years.map((item) => item.amount))
  const whole = facts.months.length === 12
  const partial = years.some((item) => !item.whole && item.year !== facts.year)
  const running = facts.months.find((month) => isInProgress(facts.year, month)) ?? null
  // The focus year's months: beside a whole year, its amount over these is the one the comparison above uses.
  const focusRange = monthsLabel(facts.months)
  const sameMonths = years.some((item) => item.sameMonths !== null)

  return (
    <section aria-labelledby="area-years" className="flex min-w-0 flex-col gap-3 rounded-xl border border-(--x-line) px-3.5 pb-3 pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h3 id="area-years" className="flex items-center gap-2 text-[15px] font-extrabold"><CalendarRange aria-hidden="true" className="size-4" />İllər üzrə</h3>
        <p className="text-[12.5px] text-(--x-ink-2)">{kindNames[kind]} · hər il öz ayları üzrə</p>
      </div>

      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[14px] text-(--x-ink-2)">{facts.year}, {whole ? 'bütün il' : monthsLabel(facts.months)}:</span>
        <span className="tnum text-[22px] font-extrabold leading-none tracking-[-0.02em]">{money(facts.amount)}</span>
      </p>

      <ul className="flex flex-col gap-2.5 text-[13.5px]">
        {facts.share !== null && (
          <li className="flex flex-wrap gap-x-1.5"><span className="text-(--x-ink-2)">Bütün obyektlərin cəmindən payı:</span><span className="tnum font-bold">{percent(facts.share, false)}</span><span className="tnum text-(--x-muted)">({money(facts.total)})</span></li>
        )}
        <li className="flex flex-wrap gap-x-1.5">
          <span className="text-(--x-ink-2)">Obyektlər arasında yeri:</span>
          {facts.rank === null
            ? <span className="font-bold">bu il sifariş verilməyib</span>
            : <span className="tnum font-bold">{ordinal(facts.rank)} <span className="font-medium text-(--x-ink-2)">({facts.ranked} obyekt arasında)</span></span>}
        </li>
        {facts.average !== null && facts.rank !== null && (
          <li className="flex flex-wrap gap-x-1.5">
            <span className="text-(--x-ink-2)">Aylıq orta:</span><span className="tnum font-bold">{money(facts.average)}</span>
            <span className="text-(--x-muted)">({facts.months.length} ay)</span>
          </li>
        )}
        {period && facts.amount > 0 && (
          <li className="flex flex-wrap gap-x-1.5"><span className="text-(--x-ink-2)">{period.label} bu ilin:</span><span className="tnum font-bold">{percent(period.amount / facts.amount, false)}</span><span className="tnum text-(--x-muted)">({money(period.amount)})</span></li>
        )}
      </ul>

      <ol aria-label="İllər" className="flex flex-col gap-1">
        {years.map((item) => {
          const current = item.year === facts.year
          const width = largest > 0 ? Math.max(item.amount > 0 ? 1.5 : 0, (item.amount / largest) * 100) : 0
          // The year on screen is drawn solid, whole or not; another year that is not whole is only outlined.
          const bar = current
            ? 'bg-(--x-focus-year)'
            : item.whole ? 'bg-(--x-ink-2)/45' : 'border border-dashed border-(--x-ink-2)/70 bg-(--x-ink-2)/10'
          // Beside a focus year that is not whole: the part over the same months, then the rest of the year.
          const same = item.sameMonths !== null && item.amount > 0 ? (item.sameMonths / item.amount) * 100 : 100
          return (
            <li key={item.year}>
              <button
                type="button"
                data-year={item.year}
                aria-current={current ? 'true' : undefined}
                onClick={() => { if (!current) onYear(item.year) }}
                title={current ? `${item.year} ekrandadır` : `${item.year} ilinə keç`}
                className={`grid w-full grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-2 py-1.5 text-left ${current ? 'bg-(--x-focus-year-soft)' : 'hover:bg-(--x-band)'}`}
              >
                <span className="leading-tight">
                  <span className={`tnum block text-[14px] ${current ? 'font-extrabold text-(--x-focus-year-ink)' : 'font-semibold'}`}>{item.year}</span>
                  <span className="block text-[11.5px] text-(--x-ink-2)">{item.whole ? 'Yan–Dek' : monthsLabel(item.months)}</span>
                </span>
                <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full">
                  <span className="flex h-full overflow-hidden rounded-full" style={{ width: `${width}%` }}>
                    <span className={`block h-full ${bar}`} style={{ width: `${same}%` }} />
                    {same < 100 && <span className="block h-full flex-1 bg-(--x-ink-2)/20" />}
                  </span>
                </span>
                <span className="tnum text-right leading-tight">
                  <span className={`block whitespace-nowrap text-[14px] ${item.amount ? 'font-bold' : 'text-(--x-muted)'}`}>{item.amount ? money(item.amount) : 'sifariş yoxdur'}</span>
                  {item.sameMonths !== null && (
                    <span className="block whitespace-nowrap text-[11.5px] text-(--x-ink-2)" title={`${facts.year} ilinin ayları ilə eyni aylar: müqayisə bu məbləğlə aparılır`}>
                      {focusRange}: {money(item.sameMonths)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {(partial || sameMonths || running) && (
        <p className="flex gap-2 text-[12.5px] text-(--x-ink-2)">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-(--x-muted)" />
          <span>
            {sameMonths && `${facts.year} natamamdır (${focusRange}): hər ilin altındakı «${focusRange}» məbləği və zolağın sol hissəsi həmin aylardır — müqayisə onunla aparılır. `}
            {partial && !sameMonths && 'Kəsik xətt: il natamamdır, yalnız göstərilən ayları var — tam illə tutuşdurulmur. '}
            {running && `${monthName(running)} ${facts.year} davam edir: məbləğ arta bilər.`}
          </span>
        </p>
      )}
    </section>
  )
}
