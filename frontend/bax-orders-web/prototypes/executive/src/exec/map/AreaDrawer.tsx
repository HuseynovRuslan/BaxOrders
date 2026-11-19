import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BarChart3, Building2, CircleAlert, FileText, Layers, MapPinOff, Package, Wrench, X } from 'lucide-react'
import type { Kind } from '../../data/analysis'
import { money, monthName, percent, quantity, shortMonthNames, signedMoney } from '../../lib/format'
import { kindNames } from '../../lib/year'
import { overviewLinks } from '../../overview/links'
import { longRange } from '../../overview/metrics'
import type { Area, AreaFigures } from '../../overview/areas'
import { ChangeChip, Swatch } from '../ui'

/*
 * One area's figures for the map's period — everything from that object's own lines, nothing from its neighbours. Three
 * tabs as in the reference: «İcmal» (the period against the same months a year before, approval, the year month by month,
 * the largest categories), «Sifarişlər» (the monthly order and each outside-monthly request of the period, each opening
 * its page) and «Məhsullar». A zero is said as «sifariş verilməyib», a month without figures as «məlumat yoxdur», a running
 * month as «davam edir» — never one for another.
 */

type Tab = 'icmal' | 'sifarisler' | 'mehsullar'
const tabs: { id: Tab; label: string }[] = [
  { id: 'icmal', label: 'İcmal' },
  { id: 'sifarisler', label: 'Sifarişlər' },
  { id: 'mehsullar', label: 'Məhsullar' },
]

export function AreaDrawer({ area, figures, year, months, kind, comparisonMode, onClose }: {
  area: Area
  figures: AreaFigures
  year: number
  months: readonly number[]
  kind: Kind
  comparisonMode: 'yoy' | 'previous'
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('icmal')
  const heading = useRef<HTMLHeadingElement>(null)
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([])

  // A new area takes the focus to its name, so a keyboard user hears what opened.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [area.id])

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : null
    if (next === null) return
    event.preventDefault()
    const target = (next + tabs.length) % tabs.length
    setTab(tabs[target].id)
    tabButtons.current[target]?.focus()
  }

  const single = months.length === 1
  const period = single ? `${monthName(months[0])} ${year}` : `${longRange(months)} ${year}`

  return (
    <section aria-labelledby="area-title" className="x-card x-slide-in flex min-w-0 flex-col px-5 pb-5 pt-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 id="area-title" ref={heading} tabIndex={-1} className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] outline-none">{area.name}</h2>
            <LocationBadge area={area} />
          </div>
          <p className="mt-0.5 text-[15px] text-(--x-ink-2)">{period} · {kindNames[kind]}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Ərazini bağla" title="Bağla (Esc)" className="grid size-10 shrink-0 place-items-center rounded-lg text-(--x-ink-2) hover:bg-(--x-band) hover:text-(--x-ink)">
          <X aria-hidden="true" className="size-5" />
        </button>
      </header>

      <div role="tablist" aria-label="Ərazinin bölmələri" className="mt-3 flex gap-1 border-b border-(--x-line)">
        {tabs.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => { tabButtons.current[index] = element }}
            id={`area-tab-${item.id}`}
            role="tab"
            type="button"
            aria-selected={tab === item.id}
            aria-controls={`area-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => onTabKey(event, index)}
            className={`relative min-h-11 px-4 text-[16px] font-semibold transition-colors ${tab === item.id ? 'text-(--x-ink)' : 'text-(--x-ink-2) hover:text-(--x-ink)'}`}
          >
            {item.label}
            {tab === item.id && <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-(--x-prev)" />}
          </button>
        ))}
      </div>

      <div id={`area-panel-${tab}`} role="tabpanel" aria-labelledby={`area-tab-${tab}`} className="mt-4 flex flex-col gap-3">
        {figures.state === 'missing' ? (
          <Note icon={CircleAlert} title="Məlumat yoxdur">{period}: bu dövr üçün fiqurlar hələ yüklənməyib.</Note>
        ) : tab === 'icmal' ? (
          <Summary area={area} figures={figures} year={year} months={months} kind={kind} single={single} comparisonMode={comparisonMode} />
        ) : tab === 'sifarisler' ? (
          <Orders area={area} figures={figures} year={year} kind={kind} />
        ) : (
          <Products area={area} figures={figures} year={year} kind={kind} />
        )}
      </div>

      <Link
        to={single && figures.state === 'orders' ? overviewLinks.siteMonth(year, months[0], area.id, kind) : overviewLinks.siteYear(year, area.id, kind)}
        className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-(--x-prev) px-5 text-[16px] font-bold text-[#06231f] transition-[filter] hover:brightness-110"
      >
        Ərazinin ətraflı analizinə keç
        <ArrowRight aria-hidden="true" className="size-5" />
      </Link>
    </section>
  )
}

function LocationBadge({ area }: { area: Area }) {
  if (!area.location) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-(--x-line-2) px-2.5 py-0.5 text-[13px] font-semibold text-(--x-ink-2)" title={area.locationIssue ?? 'Koordinat hələ daxil edilməyib'}>
        <MapPinOff aria-hidden="true" className="size-3.5" />
        {area.locationIssue ? 'Koordinat yanlışdır' : 'Koordinat yoxdur'}
      </span>
    )
  }
  if (area.location.source === 'sample') {
    return <span className="rounded-full border border-(--x-focus-year) bg-(--x-focus-year-soft) px-2.5 py-0.5 text-[13px] font-semibold text-(--x-focus-year-ink)" title="Yalnız inkişaf rejimi: nöqtə real yer deyil">Nümunə koordinat</span>
  }
  return null
}

function Note({ icon: Icon, title, children }: { icon: typeof X; title: string; children?: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-dashed border-(--x-line-2) px-4 py-4">
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-(--x-muted)" />
      <div>
        <p className="font-bold">{title}</p>
        {children && <p className="mt-0.5 text-sm text-(--x-ink-2)">{children}</p>}
      </div>
    </div>
  )
}

/* ---- İcmal ---------------------------------------------------------------------------------------------------------- */

function Summary({ area, figures, year, months, kind, single, comparisonMode }: {
  area: Area
  figures: AreaFigures
  year: number
  months: readonly number[]
  kind: Kind
  single: boolean
  comparisonMode: 'yoy' | 'previous'
}) {
  const { comparison, previousMonth } = figures
  const against = comparisonMode === 'previous' && single
    ? previousMonth && { label: `${monthName(previousMonth.month)} ${previousMonth.year}`, amount: previousMonth.amount, delta: previousMonth.delta, pct: previousMonth.pct }
    : comparison.previous !== null && { label: single ? 'Ötən ilin eyni ayı' : 'Ötən ilin eyni dövrü', amount: comparison.previous, delta: comparison.delta, pct: comparison.pct }
  const noComparison = comparisonMode === 'previous' && single
    ? 'Əvvəlki ay üçün məlumat yoxdur'
    : comparison.previousYear === null ? `${year - 1} üçün məlumat yoxdur` : 'Ötən ildə bu aylar yoxdur'
  return (
    <>
      <dl className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)] divide-x divide-(--x-line) rounded-xl border border-(--x-line) bg-(--x-surface-2) py-3">
        <div className="min-w-0 px-3.5">
          <dt className="text-[13px] leading-tight text-(--x-ink-2)">{single ? 'Ayın sifariş məbləği' : 'Dövrün sifariş məbləği'}</dt>
          <dd className="tnum mt-1 whitespace-nowrap text-[clamp(20px,2vw,26px)] font-extrabold leading-none tracking-[-0.02em]">{money(comparison.current)}</dd>
          {figures.state === 'zero' && <dd className="mt-1 text-xs text-(--x-muted)">sifariş verilməyib</dd>}
          {figures.inProgress && <dd className="mt-1 text-xs text-(--x-muted)">ay davam edir</dd>}
        </div>
        <div className="min-w-0 px-3.5">
          <dt className="text-[13px] leading-tight text-(--x-ink-2)">{against ? against.label : 'Müqayisə'}</dt>
          <dd className="tnum mt-1.5 whitespace-nowrap text-[clamp(16px,1.5vw,20px)] font-extrabold leading-none">{against ? money(against.amount) : '—'}</dd>
          {!against && <dd className="mt-1 text-xs text-(--x-muted)">{noComparison}</dd>}
        </div>
        <div className="min-w-0 px-3.5">
          <dt className="text-[13px] text-(--x-ink-2)">Fərq</dt>
          <dd className="mt-1.5">
            {against
              ? against.pct === null && against.delta !== null && against.delta > 0
                ? <span className="text-sm font-semibold text-(--x-ink-2)">yeni: əvvəl sifariş yox idi</span>
                : <ChangeChip pct={against.pct} delta={against.delta} />
              : <span className="text-(--x-muted)">—</span>}
          </dd>
          {against && against.delta !== null && <dd className="tnum mt-1 text-xs text-(--x-muted)">{signedMoney(against.delta)}</dd>}
        </div>
      </dl>

      {kind === 'all' || kind === 'monthly' ? (
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-(--x-line) bg-(--x-surface-2) px-4 py-3 text-[15px]">
          <div className="flex items-center gap-2"><Swatch tone="ok" /><dt>Təsdiqlənib</dt><dd className="tnum ml-2 font-extrabold">{money(figures.approval.approved)}</dd></div>
          <span aria-hidden="true" className="hidden h-5 w-px bg-(--x-line) sm:block" />
          <div className="flex items-center gap-2"><Swatch tone="amber" /><dt>Təsdiq gözləyir</dt><dd className="tnum ml-2 font-extrabold">{money(figures.approval.pending)}</dd></div>
          {kind === 'all' && <p className="w-full text-xs text-(--x-muted)">Yalnız aylıq sifarişlər təsdiqlənir; aylıqdan kənar sifarişlərin təsdiq qeydi yoxdur.</p>}
        </dl>
      ) : (
        <p className="rounded-xl border border-(--x-line) bg-(--x-surface-2) px-4 py-3 text-sm text-(--x-ink-2)">Aylıqdan kənar sifarişlər hər biri ayrıca razılıqla verilir; sistemdə təsdiq qeydi yoxdur.</p>
      )}

      <MiniChart figures={figures} year={year} months={months} area={area} />

      <section aria-labelledby="area-categories" className="rounded-xl border border-(--x-line) px-4 pb-2 pt-3">
        <h3 id="area-categories" className="flex items-center gap-2.5 text-[16px] font-extrabold"><Layers aria-hidden="true" className="size-5" />Əsas xərc kateqoriyaları</h3>
        {figures.categories.length === 0 ? <p className="py-3 text-sm text-(--x-muted)">Bu dövrdə xərc yoxdur.</p> : (
          <ul className="mt-1.5">
            {topWithRest(figures.categories, 3).map((row) => (
              <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto_3.75rem] items-center gap-x-3 border-t border-(--x-line) py-2 first:border-t-0">
                <span className="truncate text-[15px]" title={row.name}>{row.name}</span>
                <span className="tnum text-right text-[15px] font-bold">{money(row.amount)}</span>
                <span className="tnum text-right text-sm text-(--x-ink-2)">{percent(row.share, false)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

/** The largest rows and the rest as «Digər», so the shares still add up to the whole. */
function topWithRest<T extends { id: string; name: string; amount: number; share: number }>(rows: readonly T[], count: number) {
  if (rows.length <= count + 1) return rows.map((row) => ({ id: row.id, name: row.name, amount: row.amount, share: row.share }))
  const rest = rows.slice(count)
  return [
    ...rows.slice(0, count).map((row) => ({ id: row.id, name: row.name, amount: row.amount, share: row.share })),
    { id: 'diger', name: `Digər (${rest.length})`, amount: Math.round(rest.reduce((sum, row) => sum + row.amount, 0) * 100) / 100, share: rest.reduce((sum, row) => sum + row.share, 0) },
  ]
}

/** The area's year beside the year before, month by month; the period's months stand out. */
function MiniChart({ figures, year, months, area }: { figures: AreaFigures; year: number; months: readonly number[]; area: Area }) {
  const pairs = figures.months
  const previousYear = figures.comparison.previousYear
  const peak = Math.max(0, ...pairs.flatMap((pair) => [pair.current ?? 0, pair.previous ?? 0]))
  const height = (value: number | null) => (value === null || peak === 0 ? 0 : Math.max(value > 0 ? 2 : 0, (value / peak) * 100))
  return (
    <section aria-labelledby="area-months" className="rounded-xl border border-(--x-line) px-4 pb-3 pt-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="area-months" className="flex items-center gap-2.5 text-[16px] font-extrabold"><BarChart3 aria-hidden="true" className="size-5" />Aylıq müqayisə</h3>
          <p className="text-[13px] text-(--x-ink-2)">{longRange(pairs.map((pair) => pair.month))}</p>
        </div>
        <p className="flex items-center gap-3 text-[13px] font-semibold">
          {previousYear !== null && <span className="flex items-center gap-1.5"><Swatch tone="prev" />{previousYear}</span>}
          <span className="flex items-center gap-1.5"><Swatch tone="focus" />{year}</span>
        </p>
      </div>
      {peak === 0 ? <p className="py-6 text-center text-sm text-(--x-muted)">Bu ərazinin {year} ilində sifarişi yoxdur.</p> : (
        <ol aria-label={`${area.name}: aylar üzrə`} className="mt-3 grid h-32 items-end gap-0.5" style={{ gridTemplateColumns: `repeat(${pairs.length}, minmax(0, 1fr))` }}>
          {pairs.map((pair) => {
            const inPeriod = months.includes(pair.month)
            const text = `${monthName(pair.month)}: ${previousYear !== null ? `${previousYear} — ${pair.previous === null ? 'məlumat yoxdur' : money(pair.previous)}, ` : ''}${year} — ${pair.current === null ? 'məlumat yoxdur' : money(pair.current)}`
            return (
              <li key={pair.month} title={text} className={`flex h-full flex-col items-center justify-end rounded-sm ${inPeriod ? 'bg-(--x-band)' : ''}`}>
                <span className="sr-only">{text}</span>
                <span aria-hidden="true" className="flex h-full w-full items-end justify-center gap-px px-px">
                  {previousYear !== null && <span className="w-1/2 max-w-2.5 rounded-t-[2px] bg-(--x-prev)" style={{ height: `${height(pair.previous)}%` }} />}
                  <span className={`w-1/2 max-w-2.5 rounded-t-[2px] bg-(--x-focus-year) ${pair.currentStatus === 'pending' ? 'x-hatch' : ''}`} style={{ height: `${height(pair.current)}%` }} />
                </span>
                <span aria-hidden="true" className={`mt-1 text-[11px] ${inPeriod ? 'font-bold text-(--x-ink)' : 'text-(--x-muted)'}`}>{shortMonthNames[pair.month - 1]}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

/* ---- Sifarişlər ------------------------------------------------------------------------------------------------------ */

function Orders({ area, figures, year, kind }: { area: Area; figures: AreaFigures; year: number; kind: Kind }) {
  if (figures.orders.length === 0) {
    return <Note icon={FileText} title="Sifariş verilməyib">{figures.everOrdered ? `${kindNames[kind]}: bu ərazi seçilmiş dövrdə sifariş verməyib.` : 'Bu ərazinin heç bir ildə sifarişi yoxdur.'}</Note>
  }
  return (
    <ol className="flex flex-col divide-y divide-(--x-line) rounded-xl border border-(--x-line)">
      {figures.orders.map((order) => (
        <li key={order.key}>
          <Link to={overviewLinks.order(year, order.month, area.id, kind)} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 hover:bg-(--x-band)">
            {order.type === 'monthly' ? <FileText aria-hidden="true" className="size-5 text-(--x-ink-2)" /> : <Wrench aria-hidden="true" className="size-5 text-(--x-ink-2)" />}
            <span className="min-w-0">
              <span className="block font-semibold">{order.type === 'monthly' ? `Aylıq sifariş · ${monthName(order.month)}` : `Aylıqdan kənar · ${order.day ? `${order.day} ` : ''}${monthName(order.month)}`}</span>
              <span className="block text-[13px] text-(--x-ink-2)">
                {quantity(order.lines)} sətir
                {order.approval === 'approved' && ' · təsdiqlənib'}
                {order.approval === 'pending' && <span className="text-(--x-amber)"> · təsdiq gözləyir</span>}
                {order.type === 'outside' && ' · ayrıca razılıqla'}
              </span>
            </span>
            <span className="tnum text-right font-bold">{money(order.amount)}</span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

/* ---- Məhsullar ------------------------------------------------------------------------------------------------------- */

function Products({ area, figures, year, kind }: { area: Area; figures: AreaFigures; year: number; kind: Kind }) {
  if (figures.products.length === 0) return <Note icon={Package} title="Məhsul yoxdur">Seçilmiş dövrdə bu ərazidə ödənişli məhsul sifariş olunmayıb.</Note>
  return (
    <>
      <ol className="flex flex-col divide-y divide-(--x-line) rounded-xl border border-(--x-line)">
        {figures.products.map((row) => (
          <li key={row.id}>
            <Link to={overviewLinks.product(year, row.lastMonth, row.id, area.id, kind)} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5 hover:bg-(--x-band)">
              <span className="min-w-0">
                <span className="block truncate font-semibold" title={row.name}>{row.name}</span>
                <span className="block text-[13px] text-(--x-ink-2)">{row.qty !== null ? quantity(row.qty, row.unit) : 'vahidlər fərqlidir'} · {row.lines} sətir</span>
              </span>
              <span className="text-right">
                <span className="tnum block font-bold">{money(row.amount)}</span>
                <span className="tnum block text-[13px] text-(--x-ink-2)">{percent(row.share, false)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {figures.suppliers.length > 0 && (
        <section aria-labelledby="area-suppliers" className="rounded-xl border border-(--x-line) px-4 py-3">
          <h3 id="area-suppliers" className="flex items-center gap-2 text-[15px] font-extrabold"><Building2 aria-hidden="true" className="size-4" />Əsas şirkətlər</h3>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm">
            {figures.suppliers.map((row) => (
              <li key={row.name} className="flex justify-between gap-3"><span className="truncate">{row.name}</span><span className="tnum font-semibold">{money(row.amount)}</span></li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
