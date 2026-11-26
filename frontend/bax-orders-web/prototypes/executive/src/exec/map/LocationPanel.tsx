import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router'
import {
  ArrowLeft, ArrowRight, BarChart3, Building2, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, ExternalLink, FileText, Layers,
  Link2, Link2Off, List, MapPin, Package, TriangleAlert, UserRound, Wrench, X, type LucideIcon,
} from 'lucide-react'
import type { Kind } from '../../data/analysis'
import { mapLinkOf, type AreaLocation } from '../../data/areaLocations'
import type { HiddenLocation } from '../../data/locationVisibility'
import { money, monthName, percent, quantity, signedMoney } from '../../lib/format'
import { kindNames } from '../../lib/year'
import { overviewLinks } from '../../overview/links'
import { approvalDrifts, hasMonth, isInProgress } from '../../overview/metrics'
import { areaYearFacts, areaYears, ordersOf, type AreaFigures, type AreaOrder, type AreaRow, type MapArea } from '../../overview/areas'
import { comparePeriod, isFuture, modeLabel, monthLabel, rangeLabel, type CompareMode, type PeriodComparison, type YearMonth } from '../../overview/compare'
import { ChangeChip, FilterSelect } from '../ui'
import { AreaMonthChart } from './AreaMonthChart'
import { AreaYears } from './AreaYears'

/*
 * «Ərazi analitikası» for one location. The head is the record itself — its name, id, «Ərazi rəhbəri», coordinates, the
 * source's review status and the way to open it on a map. The money comes only from the financial object the location is
 * linked to (overview/areas): without a confirmed link the panel says so and shows no figure. Three tabs: «İcmal» (the
 * period against its comparison, the twelve months, the categories), «Sifarişlər» (the period's orders, or one month's:
 * a click on a month of the chart opens it here) and «Məhsullar». «İcmal» opens on the object's years («İllər üzrə»), so the
 * period on screen is always read against its whole year and the years before it.
 */

export type PanelTab = 'icmal' | 'sifarisler' | 'mehsullar'
const tabs: { id: PanelTab; label: string; icon: LucideIcon }[] = [
  { id: 'icmal', label: 'İcmal', icon: BarChart3 },
  { id: 'sifarisler', label: 'Sifarişlər', icon: List },
  { id: 'mehsullar', label: 'Məhsullar', icon: Layers },
]

export const statusWords: Record<AreaLocation['status'], string> = {
  VERIFIED: 'Yoxlanılıb',
  NEEDS_REVIEW: 'Koordinat yoxlanılmalıdır',
  POSSIBLE_DUPLICATE: 'Ehtimal olunan dublikat',
}
const confidenceWords = { HIGH: 'yüksək', MEDIUM: 'orta', LOW: 'aşağı' } as const
const basisWords = { business: 'sahibin təsdiqi', data: 'məlumatla əsaslandırılıb', 'same-name': 'hər iki faylda eyni ad' } as const

export interface Related {
  duplicates: MapArea[]
  hidden: HiddenLocation[]
  shared: MapArea[]
}

export interface PanelContext {
  year: number
  previousYear: number | null
  /** The period's calendar months (none in the future). */
  span: YearMonth[]
  /** The focus year's months of the period that have figures. */
  months: number[]
  kind: Kind
  mode: CompareMode
}

export function LocationPanel({ row, figures, context, tab, drill, onView, onYear, onClose, onSelect, related }: {
  row: AreaRow
  /** The linked object's figures over the period; null without a confirmed link. */
  figures: AreaFigures | null
  context: PanelContext
  tab: PanelTab
  drill: number | null
  /** Shows a tab and/or a month's orders (null: the whole period's), in one step. */
  onView: (view: { tab?: PanelTab; drill?: number | null }) => void
  /** Opens another year for the same location. */
  onYear: (year: number) => void
  onClose: () => void
  onSelect: (id: string) => void
  /**
   * The other records on the map in the same duplicate group, the duplicates hidden behind this one, and the locations
   * on the same financial object.
   */
  related: Related
}) {
  const { location, finance } = row.area
  const heading = useRef<HTMLHeadingElement>(null)
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([])

  // A new area takes the focus to its name, so a keyboard user hears what opened.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [location.id])

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    const target = (moves[event.key] + tabs.length) % tabs.length
    onView({ tab: tabs[target].id })
    tabButtons.current[target]?.focus()
  }

  const linked = finance.state === 'linked' && figures !== null && row.comparison !== null
  return (
    <section aria-labelledby="area-title" className="x-card x-slide-in @container flex min-w-0 flex-col gap-4 p-4 sm:p-5">
      <Header location={location} finance={finance} heading={heading} onClose={onClose} />

      {linked ? (
        <>
          <div role="tablist" aria-label="Ərazinin bölmələri" className="grid grid-cols-3 gap-1 rounded-xl border border-(--x-line) bg-(--x-surface-2) p-1">
            {tabs.map((item, index) => {
              const Icon = item.icon
              const selected = tab === item.id
              return (
                <button
                  key={item.id}
                  ref={(element) => { tabButtons.current[index] = element }}
                  id={`area-tab-${item.id}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls="area-tabpanel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onView({ tab: item.id })}
                  onKeyDown={(event) => onTabKey(event, index)}
                  className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-lg px-2 text-[15px] font-semibold transition-colors ${selected ? 'bg-(--x-prev) text-(--x-on-accent) shadow-sm' : 'text-(--x-ink-2) hover:bg-(--x-band) hover:text-(--x-ink)'}`}
                >
                  <Icon aria-hidden="true" className="hidden size-4 shrink-0 min-[440px]:block" />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
          <Context context={context} comparison={row.comparison!} drill={tab === 'sifarisler' ? drill : null} />
          <div id="area-tabpanel" role="tabpanel" aria-labelledby={`area-tab-${tab}`} className="flex min-w-0 flex-col gap-3">
            {tab === 'icmal' && <Summary row={row} figures={figures} context={context} drill={drill} onDrill={(month) => onView({ tab: 'sifarisler', drill: month })} onOrders={() => onView({ tab: 'sifarisler', drill: null })} onYear={onYear} />}
            {tab === 'sifarisler' && <Orders row={row} figures={figures} context={context} drill={drill} onDrill={(month) => onView({ drill: month })} onBack={() => onView({ tab: 'icmal', drill: null })} />}
            {tab === 'mehsullar' && <Products row={row} figures={figures} context={context} />}
          </div>
          {finance.state === 'linked' && finance.sharedWith.length > 0 && (
            <Note icon={Link2} title="Bir maliyyə obyekti, bir neçə nöqtə">
              «{finance.siteName}» obyektinin məbləğləri bu nöqtəyə və {related.shared.map((area) => area.location.name).join(', ')} nöqtəsinə birlikdə aiddir: nöqtələr arasında bölünmür, cəmlərdə bir dəfə sayılır.
            </Note>
          )}
        </>
      ) : (
        <Unlinked area={row.area} />
      )}

      <Record area={row.area} related={related} onSelect={onSelect} />
    </section>
  )
}

/* ---- Head ---------------------------------------------------------------------------------------------------------- */

function Header({ location, finance, heading, onClose }: { location: AreaLocation; finance: MapArea['finance']; heading: RefObject<HTMLHeadingElement | null>; onClose: () => void }) {
  const exact = `${location.lat}, ${location.lng}`
  return (
    <header className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <h2 id="area-title" ref={heading} tabIndex={-1} className="min-w-0 break-words text-[24px] font-extrabold leading-tight tracking-[-0.02em] outline-none sm:text-[26px]">{location.name}</h2>
        <button type="button" onClick={onClose} aria-label="Ərazini bağla" title="Bağla (Esc)" className="-mr-1 -mt-1 grid size-10 shrink-0 place-items-center rounded-lg text-(--x-ink-2) hover:bg-(--x-band) hover:text-(--x-ink)">
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="tnum rounded-md border border-(--x-line-2) px-2 py-0.5 font-mono text-[12.5px] font-semibold text-(--x-ink-2)" title="Lokasiya qeydinin ID-si (Excel, «Areas»)">{location.id}</span>
        {location.status !== 'VERIFIED' && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-(--x-ink-2) px-2.5 py-0.5 text-[12.5px] font-semibold text-(--x-ink)">
            <TriangleAlert aria-hidden="true" className="size-3.5" />{statusWords[location.status]}{location.duplicateGroup ? ` · ${location.duplicateGroup}` : ''}
          </span>
        )}
        {finance.state === 'linked' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--x-prev-soft) px-2.5 py-0.5 text-[12.5px] font-semibold text-(--x-prev-ink)" title={`Excel obyekti «${finance.siteName}» · ${basisWords[finance.link.basis]}${finance.link.ref ? ` (${finance.link.ref})` : ''}`}>
            <Link2 aria-hidden="true" className="size-3.5" />Maliyyə: «{finance.siteName}»
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-(--x-line-2) px-2.5 py-0.5 text-[12.5px] font-semibold text-(--x-ink-2)">
            <Link2Off aria-hidden="true" className="size-3.5" />Maliyyə uyğunlaşdırılmayıb
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2.5">
        <dl className="flex min-w-0 flex-col gap-1 text-[15px]">
          <div className="flex items-start gap-2">
            <UserRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-(--x-muted)" />
            <dt className="shrink-0 whitespace-nowrap text-(--x-ink-2)">Ərazi rəhbəri:</dt>
            <dd className="min-w-0 font-semibold">{location.managers.length ? location.managers.join(', ') : 'Məlumat yoxdur'}</dd>
          </div>
          <div className="flex items-start gap-2">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-(--x-muted)" />
            <dt className="sr-only">Koordinatlar</dt>
            <dd className="tnum text-(--x-ink-2)" title={`Mənbədəki dəqiq dəyər: ${exact}`}>{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</dd>
          </div>
        </dl>
        <a
          href={mapLinkOf(location)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-(--x-prev) px-3.5 text-[14px] font-bold text-(--x-prev-ink) hover:bg-(--x-prev-soft)"
        >
          <ExternalLink aria-hidden="true" className="size-4" />Xəritədə aç<span className="sr-only"> (yeni pəncərədə)</span>
        </a>
      </div>
    </header>
  )
}

/** The period, the kind, the comparison and what the figures cover — said once, above every tab. */
function Context({ context, comparison, drill }: { context: PanelContext; comparison: PeriodComparison; drill: number | null }) {
  const single = context.span.length === 1
  const base = comparison.baselineSpan
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-(--x-ink-2)">
      <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
      <span><span className="font-semibold text-(--x-ink)">{drill ? `${monthName(drill)} ${context.year}` : rangeLabel(context.span)}</span> · {kindNames[context.kind]}</span>
      {!drill && <span className="w-full pl-6">Müqayisə: {modeLabel(context.mode, single).toLocaleLowerCase('az')} ({rangeLabel(base)})</span>}
    </p>
  )
}

/* ---- İcmal -------------------------------------------------------------------------------------------------------- */

function Summary({ row, figures, context, drill, onDrill, onOrders, onYear }: {
  row: AreaRow
  figures: AreaFigures | null
  context: PanelContext
  drill: number | null
  onDrill: (month: number) => void
  onOrders: () => void
  onYear: (year: number) => void
}) {
  const comparison = row.comparison!
  const siteId = row.area.finance.state === 'linked' ? row.area.finance.siteId : null
  const years = useMemo(() => (siteId ? areaYears(siteId, context.kind, context.year) : []), [siteId, context.kind, context.year])
  const facts = useMemo(() => (siteId ? areaYearFacts(siteId, context.year, context.kind) : null), [siteId, context.year, context.kind])
  if (!figures) return null
  const single = context.span.length === 1
  // The period chosen above, when it is only part of its year: where it stands in the year.
  const part = facts && comparison.amount !== null && context.months.length > 0 && context.months.length < facts.months.length
    ? { label: rangeLabel(context.span), amount: comparison.amount }
    : null
  return (
    <>
      {facts && <AreaYears years={years} facts={facts} kind={context.kind} period={part} onYear={onYear} />}
      <Kpis comparison={comparison} context={context} single={single} />
      <ComparisonNotes comparison={comparison} context={context} />
      <AreaMonthChart
        pairs={figures.months}
        focusYear={context.year}
        previousYear={context.previousYear}
        kind={context.kind}
        period={context.span.map((at) => at.month)}
        baseline={comparison.baselineSpan}
        mode={context.mode}
        drill={drill}
        onDrill={onDrill}
        areaName={row.area.location.name}
      />
      <div className="grid gap-3 @md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Categories figures={figures} />
        <PeriodOrders figures={figures} context={context} onOrders={onOrders} />
      </div>
    </>
  )
}

function Kpis({ comparison, context, single }: { comparison: PeriodComparison; context: PanelContext; single: boolean }) {
  const { amount, baseline, delta, pct, aligned, baselineSpan } = comparison
  const partial = aligned.length > 0 && aligned.length < comparison.pairs.length
  const baseLabel = rangeLabel(baselineSpan)
  const noBase = amount === null
    ? 'Dövr üçün məlumat yoxdur'
    : `${rangeLabel(baselineSpan)} üçün məlumat yoxdur`
  return (
    <dl className="grid grid-cols-2 gap-2.5 @md:grid-cols-3">
      <Kpi icon={CalendarDays} label={rangeLabel(context.span)} className="col-span-2 @md:col-span-1">
        <dd className="tnum whitespace-nowrap text-[clamp(20px,1.6vw,24px)] font-extrabold leading-none tracking-[-0.02em]">{amount === null ? '—' : money(amount)}</dd>
        <dd className="mt-1.5 text-xs text-(--x-muted)">
          {amount === null ? 'məlumat yoxdur' : comparison.inProgress ? (single ? 'ay davam edir' : 'son ay davam edir') : amount === 0 ? 'sifariş verilməyib' : single ? 'ayın məbləği' : 'dövrün məbləği'}
        </dd>
      </Kpi>
      <Kpi icon={CalendarDays} label={baseLabel}>
        <dd className="tnum whitespace-nowrap text-[clamp(20px,1.6vw,24px)] font-extrabold leading-none tracking-[-0.02em]">{baseline === null ? '—' : money(baseline)}</dd>
        <dd className="mt-1.5 text-xs text-(--x-muted)">{modeLabel(context.mode, single)}{baseline === null ? ` · ${noBase}` : partial ? ` · yalnız uyğun ${aligned.length} ay` : baseline === 0 ? ' · sifariş yox idi' : ''}</dd>
      </Kpi>
      <Kpi icon={BarChart3} label="Fərq">
        <dd className="mt-0.5">
          {delta === null
            ? <span className="text-[22px] font-extrabold text-(--x-muted)">—</span>
            : <ChangeChip pct={pct} delta={delta} size="lg" reason="müqayisə yoxdur" />}
        </dd>
        <dd className="tnum mt-1.5 text-xs text-(--x-muted)">{delta === null ? 'müqayisə mümkün deyil' : pct === null && delta > 0 ? `${signedMoney(delta)} · əvvəl sifariş yox idi` : signedMoney(delta)}</dd>
      </Kpi>
    </dl>
  )
}

function Kpi({ icon: Icon, label, children, className = '' }: { icon: LucideIcon; label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-xl border border-(--x-line) bg-(--x-surface-2) px-3.5 py-3 ${className}`}>
      <dt className="flex items-center gap-1.5 text-[13px] leading-tight text-(--x-ink-2)">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 truncate" title={label}>{label}</span>
      </dt>
      <div className="mt-2">{children}</div>
    </div>
  )
}

/** What the difference stands on: the months left out, an approval that differs, a running month. */
function ComparisonNotes({ comparison, context }: { comparison: PeriodComparison; context: PanelContext }) {
  const notes: string[] = []
  const { aligned, left, currentAligned, baseline } = comparison
  if (aligned.length > 0 && left.length > 0) {
    notes.push(`Fərq yalnız hər iki tərəfdə məlumatı olan ${aligned.length} ay üzrədir: ${money(baseline)} → ${money(currentAligned)}.`)
    notes.push(`Müqayisədən kənar: ${left.map((pair) => (pair.missing === 'current' ? `${monthLabel(pair.current)} — məlumat yoxdur` : `${monthLabel(pair.baseline)} — məlumat yoxdur`)).join('; ')}.`)
  }
  if (comparison.approvalDiffers) {
    const pending = aligned.filter((pair) => pair.currentStatus === 'pending').map((pair) => monthLabel(pair.current))
    const base = aligned.filter((pair) => pair.baselineStatus === 'pending').map((pair) => monthLabel(pair.baseline))
    notes.push(`Fərq qəti deyil: ${[...pending, ...base].join(', ')} aylıq sifarişləri hələ təsdiq gözləyir, müqayisə tərəfi isə təsdiqlənib.`)
  }
  const running = context.span.find((at) => isInProgress(at.year, at.month))
  if (running) notes.push(`${monthLabel(running)} davam edir: sifarişlər hələ əlavə oluna bilər, məbləğ arta bilər.`)
  if (notes.length === 0) return null
  return (
    <ul className="flex flex-col gap-1 rounded-xl border border-(--x-line) px-3.5 py-2.5 text-[13px] text-(--x-ink-2)">
      {notes.map((note) => <li key={note} className="flex gap-2"><CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-(--x-muted)" />{note}</li>)}
    </ul>
  )
}

/** The largest categories and the rest as «Digər», so the shares still add up to the whole. */
function topWithRest<T extends { id: string; name: string; amount: number; share: number }>(rows: readonly T[], count: number) {
  if (rows.length <= count + 1) return rows.map((row) => ({ id: row.id, name: row.name, amount: row.amount, share: row.share }))
  const rest = rows.slice(count)
  return [
    ...rows.slice(0, count).map((row) => ({ id: row.id, name: row.name, amount: row.amount, share: row.share })),
    { id: 'diger', name: `Digər (${rest.length})`, amount: Math.round(rest.reduce((sum, row) => sum + row.amount, 0) * 100) / 100, share: rest.reduce((sum, row) => sum + row.share, 0) },
  ]
}

function Categories({ figures, all = false }: { figures: AreaFigures; all?: boolean }) {
  const rows = all ? figures.categories : topWithRest(figures.categories, 3)
  return (
    <section aria-labelledby={all ? 'area-categories-all' : 'area-categories'} className="min-w-0 rounded-xl border border-(--x-line) px-3.5 pb-2.5 pt-3">
      <h3 id={all ? 'area-categories-all' : 'area-categories'} className="flex items-center gap-2 text-[15px] font-extrabold"><Layers aria-hidden="true" className="size-4" />Xərc kateqoriyaları</h3>
      {rows.length === 0 ? <p className="py-3 text-sm text-(--x-muted)">Bu dövrdə xərc yoxdur.</p> : (
        <ul className="mt-2 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
              <span className="truncate text-[14px]" title={row.name}>{row.name}</span>
              <span className="tnum text-right text-[14px] font-bold">{money(row.amount)} <span className="font-medium text-(--x-ink-2)">· {percent(row.share, false)}</span></span>
              <span aria-hidden="true" className="col-span-2 h-1.5 overflow-hidden rounded-full bg-(--x-band)">
                <span className="block h-full rounded-full bg-(--x-prev)" style={{ width: `${Math.max(1, row.share * 100)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** The period's orders in a few words: how many, of which kind, and where their approval stands. */
function PeriodOrders({ figures, context, onOrders }: { figures: AreaFigures; context: PanelContext; onOrders: () => void }) {
  const monthly = figures.orders.filter((order) => order.type === 'monthly').length
  const outside = figures.orders.filter((order) => order.type === 'outside').length
  const { approval } = figures
  // An approval stands for the amount it was given for; a month whose package moved since is said (the skill, rule 5).
  const drifts = context.kind === 'outside' ? [] : approvalDrifts(context.year, approval.approvedMonths)
  return (
    <section aria-labelledby="area-period-orders" className="flex min-w-0 flex-col rounded-xl border border-(--x-line) px-3.5 pb-3 pt-3">
      <h3 id="area-period-orders" className="flex items-center gap-2 text-[15px] font-extrabold"><CalendarDays aria-hidden="true" className="size-4" />{rangeLabel(context.span)}</h3>
      <dl className="mt-2 flex flex-col gap-1.5 text-[14px]">
        <div className="flex items-center gap-2"><FileText aria-hidden="true" className="size-4 text-(--x-muted)" /><dt>Sifarişlər:</dt><dd className="tnum font-bold">{figures.orders.length}</dd></div>
        {context.kind !== 'monthly' && <div className="pl-6 text-[13px] text-(--x-ink-2)">{monthly} aylıq · {outside} aylıqdan kənar</div>}
        {context.kind !== 'outside' ? (
          <>
            <div className="flex flex-wrap items-center gap-x-2"><Check aria-hidden="true" className="size-4 text-(--x-ok)" /><dt>Təsdiqlənib:</dt><dd className="tnum whitespace-nowrap font-bold">{approval.approvedMonths.length ? money(approval.approved) : 'yoxdur'}</dd></div>
            <div className="flex flex-wrap items-center gap-x-2"><Clock3 aria-hidden="true" className="size-4 text-(--x-amber)" /><dt>Təsdiq gözləyir:</dt><dd className="tnum whitespace-nowrap font-bold">{approval.pendingMonths.length ? money(approval.pending) : 'yoxdur'}</dd></div>
            {context.kind === 'all' && <p className="text-xs text-(--x-muted)">Təsdiq yalnız aylıq sifarişlərə aiddir.</p>}
            {drifts.map((drift) => (
              <p key={drift.month} className="text-xs text-(--x-ink-2)">
                {monthName(drift.month)} {context.year} təsdiqdən sonra dəyişib (bütün obyektlərin aylıq paketi): {money(drift.approved)} → {money(drift.now)}.
              </p>
            ))}
          </>
        ) : <p className="text-xs text-(--x-muted)">Aylıqdan kənar sifarişlərin sistemdə təsdiq qeydi yoxdur.</p>}
      </dl>
      <div className="mt-auto pt-3">
        <button type="button" onClick={onOrders} className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-(--x-prev) px-3 text-[14px] font-semibold text-(--x-prev-ink) hover:bg-(--x-prev-soft)">
          Bütün sifarişlərə bax<ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </section>
  )
}

/* ---- Sifarişlər --------------------------------------------------------------------------------------------------- */

function Orders({ row, figures, context, drill, onDrill, onBack }: {
  row: AreaRow
  figures: AreaFigures | null
  context: PanelContext
  drill: number | null
  onDrill: (month: number | null) => void
  onBack: () => void
}) {
  const siteId = row.area.finance.state === 'linked' ? row.area.finance.siteId : ''
  const { year, kind, mode } = context
  const month = drill
  const orders: AreaOrder[] = useMemo(
    () => (month === null ? figures?.orders ?? [] : ordersOf(siteId, year, [month], kind)),
    [month, figures, siteId, year, kind],
  )
  const monthComparison = useMemo(() => (month === null ? null : comparePeriod([{ year, month }], mode, kind, [siteId])), [month, year, mode, kind, siteId])
  if (!figures) return null
  const at = month === null ? null : { year, month }
  const state = at === null
    ? (figures.state === 'missing' ? 'missing' : orders.length ? 'orders' : 'zero')
    : isFuture(at) ? 'future' : !hasMonth(year, at.month) ? 'missing' : orders.length ? 'orders' : 'zero'
  const title = at ? monthLabel(at) : rangeLabel(context.span)
  const total = Math.round(orders.reduce((sum, order) => sum + order.amount, 0) * 100) / 100
  const choices = [
    { value: 'dovr', label: `Bütün dövr (${rangeLabel(context.span)})`, display: 'Bütün dövr' },
    ...Array.from({ length: 12 }, (_, index) => index + 1).map((item) => ({
      value: String(item),
      label: isFuture({ year, month: item }) ? `${monthName(item)} — hələ gəlməyib` : hasMonth(year, item) ? monthName(item) : `${monthName(item)} — məlumat yoxdur`,
      display: monthName(item),
      disabled: isFuture({ year, month: item }),
      group: String(year),
    })),
  ]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-[14px] font-semibold text-(--x-link) hover:bg-(--x-band)">
          <ArrowLeft aria-hidden="true" className="size-4" />İcmala qayıt
        </button>
        <FilterSelect icon={CalendarDays} label="Ay" value={month === null ? 'dovr' : String(month)} options={choices} onChange={(value) => onDrill(value === 'dovr' ? null : Number(value))} />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[17px] font-extrabold">Sifarişlər · {title}</h3>
        {state === 'orders' && <p className="tnum text-[14px] text-(--x-ink-2)">{orders.length} sifariş · <span className="font-bold text-(--x-ink)">{money(total)}</span></p>}
      </div>
      {monthComparison && state === 'orders' && (
        <p className="text-[13px] text-(--x-ink-2)">
          {modeLabel(mode, true)} ({rangeLabel(monthComparison.baselineSpan)}): {monthComparison.baseline === null ? 'məlumat yoxdur' : <>{money(monthComparison.baseline)} · <ChangeChip pct={monthComparison.pct} delta={monthComparison.delta} reason="müqayisə yoxdur" /></>}
        </p>
      )}

      {state === 'future' && <Note icon={Clock3} title={`${title} hələ gəlməyib`}>Bu ay üçün sifariş ola bilməz.</Note>}
      {state === 'missing' && <Note icon={CircleAlert} title="Məlumat yoxdur">{title}: mənbədə bu ay üçün sifariş məlumatı (aylıq paket) yüklənməyib. Bu, «sifariş verilməyib» demək deyil.</Note>}
      {state === 'zero' && <Note icon={FileText} title="Sifariş verilməyib">{kindNames[kind]}: «{row.area.finance.state === 'linked' ? row.area.finance.siteName : ''}» obyekti {title} dövründə sifariş verməyib (məbləğ 0 ₼).</Note>}
      {state === 'orders' && (
        <div className="overflow-hidden rounded-xl border border-(--x-line)">
          <table className="w-full text-left text-[14px]">
            <caption className="sr-only">{row.area.location.name}: sifarişlər, {title}, {kindNames[kind]}</caption>
            <thead className="bg-(--x-surface-2) text-[12.5px] text-(--x-ink-2)">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Ay</th>
                <th scope="col" className="px-3 py-2 font-semibold">Sifariş</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Məbləğ</th>
                <th scope="col" className="hidden px-3 py-2 font-semibold min-[520px]:table-cell">Status</th>
                <th scope="col" className="w-10 px-2 py-2"><span className="sr-only">Aç</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--x-line)">
              {orders.map((order) => (
                <tr key={order.key} className="hover:bg-(--x-band)/60">
                  <td className="whitespace-nowrap px-3 py-2.5 align-top">{monthName(order.month)}{order.day ? ` ${order.day}` : ''}</td>
                  <td className="px-3 py-2.5 align-top">
                    <span className="flex items-center gap-1.5 font-semibold">
                      {order.type === 'monthly' ? <FileText aria-hidden="true" className="size-4 shrink-0 text-(--x-muted)" /> : <Wrench aria-hidden="true" className="size-4 shrink-0 text-(--x-muted)" />}
                      {order.type === 'monthly' ? 'Aylıq sifariş' : 'Aylıqdan kənar'}
                    </span>
                    <span className="block text-[12.5px] text-(--x-ink-2)">{order.reason ? `${order.reason} · ` : ''}{quantity(order.lines)} sətir</span>
                    <span className="block text-[12.5px] min-[520px]:hidden"><OrderStatus order={order} /></span>
                  </td>
                  <td className="tnum whitespace-nowrap px-3 py-2.5 text-right align-top font-bold">{money(order.amount)}</td>
                  <td className="hidden px-3 py-2.5 align-top text-[13px] min-[520px]:table-cell"><OrderStatus order={order} /></td>
                  <td className="px-2 py-2 align-top">
                    <Link
                      to={overviewLinks.order(order.year, order.month, siteId, kind)}
                      aria-label={`${order.type === 'monthly' ? 'Aylıq sifariş' : 'Aylıqdan kənar sifariş'}, ${monthName(order.month)} ${order.year}: aç`}
                      className="grid size-8 place-items-center rounded-md text-(--x-ink-2) hover:bg-(--x-band) hover:text-(--x-ink)"
                    >
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {state === 'orders' && approvalDrifts(year, [...new Set(orders.filter((order) => order.approval === 'approved').map((order) => order.month))]).map((drift) => (
        <p key={drift.month} className="text-xs text-(--x-ink-2)">
          {monthName(drift.month)} {year} təsdiqdən sonra dəyişib (bütün obyektlərin aylıq paketi): {money(drift.approved)} → {money(drift.now)}.
        </p>
      ))}
      {kind !== 'outside' && <p className="text-xs text-(--x-muted)">Təsdiq aylıq paketə aiddir: bir ayın bütün obyektləri birlikdə təsdiqlənir.</p>}
    </>
  )
}

function OrderStatus({ order }: { order: AreaOrder }) {
  if (order.type === 'outside') return <span className="text-(--x-ink-2)">Ayrıca razılıqla</span>
  if (order.approval === 'approved') return <span className="inline-flex items-center gap-1 font-semibold text-(--x-ok-ink)"><Check aria-hidden="true" className="size-3.5" />Təsdiqlənib</span>
  if (order.approval === 'pending') return <span className="inline-flex items-center gap-1 font-semibold text-(--x-amber)"><Clock3 aria-hidden="true" className="size-3.5" />Təsdiq gözləyir</span>
  return <span className="text-(--x-muted)">—</span>
}

/* ---- Məhsullar ---------------------------------------------------------------------------------------------------- */

function Products({ row, figures, context }: { row: AreaRow; figures: AreaFigures | null; context: PanelContext }) {
  const [all, setAll] = useState(false)
  if (!figures) return null
  const siteId = row.area.finance.state === 'linked' ? row.area.finance.siteId : ''
  const total = Math.round(figures.products.reduce((sum, product) => sum + product.amount, 0) * 100) / 100
  const shown = all ? figures.products : figures.products.slice(0, 12)
  if (figures.state === 'missing') return <Note icon={CircleAlert} title="Məlumat yoxdur">{rangeLabel(context.span)}: mənbədə bu dövr üçün sifariş məlumatı yoxdur.</Note>
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[17px] font-extrabold">Məhsullar · {rangeLabel(context.span)}</h3>
        {figures.products.length > 0 && <p className="tnum text-[14px] text-(--x-ink-2)">{figures.products.length} məhsul · <span className="font-bold text-(--x-ink)">{money(total)}</span></p>}
      </div>
      {figures.products.length === 0 ? (
        <Note icon={Package} title="Məhsul yoxdur">{kindNames[context.kind]}: seçilmiş dövrdə bu obyektə ödənişli məhsul sifariş olunmayıb.</Note>
      ) : (
        <ol className="flex flex-col divide-y divide-(--x-line) rounded-xl border border-(--x-line)">
          {shown.map((product) => (
            <li key={product.id}>
              <Link to={overviewLinks.product(context.year, product.lastMonth, product.id, siteId, context.kind)} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3.5 py-2.5 hover:bg-(--x-band)/60">
                <span className="min-w-0">
                  <span className="block truncate font-semibold" title={product.name}>{product.name}</span>
                  <span className="block text-[12.5px] text-(--x-ink-2)">{product.qty !== null ? quantity(product.qty, product.unit) : 'vahidlər fərqlidir — miqdar toplanmır'} · {quantity(product.lines)} sətir</span>
                </span>
                <span className="text-right">
                  <span className="tnum block font-bold">{money(product.amount)}</span>
                  <span className="tnum block text-[12.5px] text-(--x-ink-2)">{percent(product.share, false)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      {figures.products.length > 12 && (
        <button type="button" onClick={() => setAll((value) => !value)} aria-expanded={all} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-(--x-line-2) px-3 text-[14px] font-semibold hover:bg-(--x-band)">
          {all ? 'Daha az göstər' : `Hamısını göstər (${figures.products.length})`}
        </button>
      )}
      <Categories figures={figures} all />
      {figures.suppliers.length > 0 && (
        <section aria-labelledby="area-suppliers" className="rounded-xl border border-(--x-line) px-3.5 py-3">
          <h3 id="area-suppliers" className="flex items-center gap-2 text-[15px] font-extrabold"><Building2 aria-hidden="true" className="size-4" />Əsas şirkətlər</h3>
          <ul className="mt-1.5 flex flex-col gap-1 text-[14px]">
            {figures.suppliers.map((supplier) => (
              <li key={supplier.name} className="flex justify-between gap-3"><span className="truncate">{supplier.name}</span><span className="tnum font-semibold">{money(supplier.amount)}</span></li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

/* ---- No confirmed figures ----------------------------------------------------------------------------------------- */

function Unlinked({ area }: { area: MapArea }) {
  const finance = area.finance
  if (finance.state !== 'unlinked') return null
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-(--x-line-2) bg-(--x-surface-2) px-4 py-4">
      <p className="flex items-start gap-2.5 text-[16px] font-extrabold">
        <Link2Off aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-(--x-muted)" />
        Maliyyə məlumatları hələ uyğunlaşdırılmayıb
      </p>
      <p className="text-[14px] text-(--x-ink-2)">
        Bu nöqtə sifariş Excel-indəki heç bir obyektə təsdiqlənmiş şəkildə bağlanmayıb. Ona görə burada məbləğ, müqayisə, sifariş və məhsul göstərilmir — boş yer sıfır məbləğ demək deyil.
      </p>
      {finance.reason === 'candidate' && finance.candidate && (
        <p className="rounded-lg border border-(--x-line) bg-(--x-surface) px-3 py-2.5 text-[13.5px]">
          <span className="font-semibold">Yoxlanılacaq ehtimal:</span> Excel-dəki «{finance.candidate.sourceName}» obyekti. {finance.candidate.question}
        </p>
      )}
      {finance.reason === 'unknown-site' && (
        <p className="rounded-lg border border-(--x-line) bg-(--x-surface) px-3 py-2.5 text-[13.5px]">
          Bağlantı «{finance.missingSiteId}» obyektinə yazılıb, amma bu obyekt cari sifariş məlumatında yoxdur.
        </p>
      )}
    </div>
  )
}

/* ---- The record ----------------------------------------------------------------------------------------------------- */

/** «19 noyabr 2026» from «2026-11-19». */
function longDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return year && month && day ? `${day} ${monthName(month).toLocaleLowerCase('az')} ${year}` : iso
}

/** The location record as the source has it: its status, its review notes, its duplicate group and its link. */
function Record({ area, related, onSelect }: { area: MapArea; related: Related; onSelect: (id: string) => void }) {
  const { location, finance } = area
  return (
    <details className="group rounded-xl border border-(--x-line) px-3.5 py-2.5 text-[13.5px]" open={location.status !== 'VERIFIED' || undefined}>
      <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 font-semibold">
        Qeyd və mənbə
        <ChevronRight aria-hidden="true" className="size-4 transition-transform group-open:rotate-90" />
      </summary>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5">
        <dt className="text-(--x-ink-2)">Qeyd ID</dt><dd className="font-mono">{location.id}</dd>
        <dt className="text-(--x-ink-2)">Status</dt>
        <dd className="flex items-center gap-1.5">{location.status !== 'VERIFIED' && <TriangleAlert aria-hidden="true" className="size-3.5" />}{statusWords[location.status]}</dd>
        {location.confidence && <><dt className="text-(--x-ink-2)">Etibarlılıq</dt><dd>{confidenceWords[location.confidence]}</dd></>}
        {location.reviewIssues.length > 0 && <><dt className="text-(--x-ink-2)">Yoxlama qeydləri</dt><dd className="font-mono">{location.reviewIssues.join(', ')}</dd></>}
        {location.duplicateGroup && (
          <>
            <dt className="text-(--x-ink-2)">Dublikat qrupu</dt>
            <dd className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono">{location.duplicateGroup}</span>
              {related.duplicates.length === 0 && related.hidden.length === 0 && <span className="text-(--x-muted)">— qrupda başqa qeyd yoxdur</span>}
              {related.duplicates.map((other) => (
                <button key={other.location.id} type="button" onClick={() => onSelect(other.location.id)} className="rounded-md border border-(--x-line-2) px-2 py-0.5 font-semibold hover:bg-(--x-band)">
                  {other.location.id}
                </button>
              ))}
            </dd>
          </>
        )}
        {related.hidden.map(({ location: twin, entry }) => (
          <div key={twin.id} className="contents">
            <dt className="text-(--x-ink-2)">Təkrar qeyd</dt>
            <dd>
              <span className="font-mono">{twin.id}</span> — eyni ərazinin ikinci qeydi; xəritədə ayrıca göstərilmir (sahibin qərarı, {longDate(entry.decided)}). Mənbədə qalır, koordinatı: <span className="tnum">{twin.lat}, {twin.lng}</span>.
            </dd>
          </div>
        ))}
        <dt className="text-(--x-ink-2)">Maliyyə</dt>
        <dd>
          {finance.state === 'linked'
            ? <>Excel obyekti «{finance.siteName}» · {basisWords[finance.link.basis]}{finance.link.ref ? ` (${finance.link.ref})` : ''}</>
            : 'uyğunlaşdırılmayıb'}
        </dd>
      </dl>
      {location.status !== 'VERIFIED' && (
        <p className="mt-2 text-xs text-(--x-muted)">Nöqtə mənbədəki koordinatda göstərilir, amma mənbə onun yoxlanılmasını istəyir: dəqiqliyi təsdiqlənməyib.</p>
      )}
    </details>
  )
}

function Note({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-dashed border-(--x-line-2) px-4 py-3.5">
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-(--x-muted)" />
      <div className="min-w-0">
        <p className="font-bold">{title}</p>
        {children && <p className="mt-0.5 text-[13.5px] text-(--x-ink-2)">{children}</p>}
      </div>
    </div>
  )
}
