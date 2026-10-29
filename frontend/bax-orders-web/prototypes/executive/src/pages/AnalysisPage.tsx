import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ArrowDown, ArrowLeft, ArrowLeftRight, BarChart3, Check, ChevronDown, Hourglass, Search, SlidersHorizontal, Table2, X } from 'lucide-react'
import { approvalOf } from '../data/analysis'
import { LAST_MONTH_WITH_DATA, monthsWithData, YEAR } from '../data/model'
import { money, moneyParts, monthName, monthNames, monthRange, percent, price, quantity, quantityParts, signedMoney } from '../lib/format'
import {
  categoryDim, cellOf, computePivot, dimLabels, dimOrder, dimSingular, facetOptions, foldColumns, labelOf, presetMatches, presets,
  useAnalysis, type AnalysisReading, type Dim, type FacetKey, type FacetOption, type Pivot, type PivotRow, type Preset, type ProductFigures, type Sort,
} from '../lib/pivot'
import { basisReference, kindNames, rounded, signedRounded, updatedText, type Change } from '../lib/year'
import { packageWords } from '../ui/kinds'
import { Tip, useTipTrigger } from '../ui/tip'
import { NotFound } from './NotFound'
import { BasisSelect, KindNav } from './YearControls'
import { Chip, NoChange } from './YearKpi'
import { axisLabel, niceScale } from './YearPage'
import './year.css'

/**
 * The analysis screen (owner, 2026-10-19 — «Turbo.az / Tap.az kimi»): the year's orders narrowed by any mix of
 * filters — a period, several objects, categories at the three levels, products, each list searchable and each showing
 * what is left under the others — and read by two directions at once, rows by columns, on one screen. Ready-made
 * directions for the usual questions; any other pair from two lists. The same pivot as a chart — columns for a few
 * items, ranked bars for many or long names, a shaded matrix for two directions — or as a table with its totals.
 *
 * The year screen stays the simple start; this is one step from it, its filters carried over. The amount is the
 * measure everywhere; a product's quantity and price only for that product, in its own unit. Approval stays the
 * month's: nothing here is approved on its own because a filter shows it apart.
 */
export function AnalysisPage() {
  const year = Number(useParams().year)
  const reading = useAnalysis()
  const { search } = useLocation()
  const { analysis, kind, basis } = reading
  // Everything on the screen reads the address; it is worked out once for each address.
  const options = useMemo(() => facetOptions(analysis, kind), [search]) // eslint-disable-line react-hooks/exhaustive-deps
  const pivot = useMemo(() => computePivot(analysis, kind, basis), [search]) // eslint-disable-line react-hooks/exhaustive-deps

  if (year !== YEAR) return <NotFound message={`Demo yalnız ${YEAR} ilini göstərir.`} />

  const withData = monthsWithData.filter((month) => month >= analysis.from && month <= analysis.to)
  const period = withData.length ? monthRange(withData, YEAR) : `${monthName(analysis.from)}–${monthName(analysis.to)} ${YEAR}`

  return (
    <div className="year-view flex flex-col gap-4 lg:-mt-2">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Link to={reading.yearHref()} className="inline-flex min-h-8 items-center gap-1.5 rounded-md text-sm font-semibold text-(--y-ink-2) hover:text-(--y-bar)">
            <ArrowLeft aria-hidden="true" className="size-4" />
            İllik icmal
          </Link>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h1 id="page-title" tabIndex={-1} className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] outline-none">Ətraflı analiz</h1>
            <p className="text-sm text-(--y-muted)">Yenilənib {updatedText}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center lg:shrink-0 lg:flex-nowrap">
          <KindNav kind={kind} hrefOf={reading.kindHref} />
          <BasisSelect basis={basis} onChange={reading.setBasis} />
        </div>
      </div>

      <FilterPanel reading={reading} options={options} />

      <section aria-labelledby="result-title" className="rounded-xl border border-(--y-line) bg-(--y-surface)">
        <h2 id="result-title" className="sr-only">
          {dimLabels[analysis.rows]}{analysis.cols ? ` × ${dimLabels[analysis.cols]}` : ''} · {period} · {kindNames[kind]}
        </h2>
        <Toolbar reading={reading} />
        {pivot.rows.length === 0 ? (
          <Empty reading={reading} period={period} />
        ) : (
          <>
            <Summary pivot={pivot} reading={reading} period={period} />
            <div className="px-3 pb-3 sm:px-5 sm:pb-4">
              <Result key={`${analysis.rows}-${analysis.cols}-${analysis.view}`} pivot={pivot} reading={reading} />
            </div>
          </>
        )}
      </section>

      <Notes pivot={pivot} reading={reading} />
    </div>
  )
}

/* ---- Filters ------------------------------------------------------------------------------------------------------------ */

const facetMeta: readonly { key: FacetKey; label: string; one: string; dim: Dim; empty: string }[] = [
  { key: 'sites', label: 'Obyektlər', one: 'Obyekt', dim: 'obyekt', empty: 'Bu filtrlərdə obyekt yoxdur.' },
  { key: 'suppliers', label: 'Şirkətlər', one: 'Şirkət', dim: 'sirket', empty: 'Bu filtrlərdə şirkət yoxdur.' },
  { key: 'roots', label: 'Ana kateqoriya', one: 'Ana', dim: 'ana', empty: 'Bu filtrlərdə kateqoriya yoxdur.' },
  { key: 'mids', label: 'Orta kateqoriya', one: 'Orta', dim: 'orta', empty: 'Seçilmiş ana kateqoriyalarda orta kateqoriya yoxdur.' },
  { key: 'leaves', label: 'Alt kateqoriya', one: 'Alt', dim: 'alt', empty: 'Seçilmiş kateqoriyalarda alt kateqoriya yoxdur.' },
  { key: 'products', label: 'Məhsul', one: 'Məhsul', dim: 'mehsul', empty: 'Bu filtrlərdə məhsul yoxdur.' },
]

/**
 * The filters, open on a desktop from the start (a toggle on a phone): the period and six lists, each a search and
 * ticks, each choice with what it amounts to under the other filters. Under them, what is chosen as chips, each with
 * its own ×, and one reset for all of them.
 */
function FilterPanel({ reading, options }: { reading: AnalysisReading; options: Record<FacetKey, FacetOption[]> }) {
  const { analysis } = reading
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 1024px)').matches)
  const whole = analysis.from === 1 && analysis.to === 12

  const chips: { label: string; clear: () => void }[] = []
  if (!whole) {
    chips.push({
      label: analysis.from === analysis.to ? `Ay: ${monthName(analysis.from)}` : `Dövr: ${monthName(analysis.from)}–${monthName(analysis.to)}`,
      clear: () => reading.write({ from: null, to: null }),
    })
  }
  for (const meta of facetMeta) {
    const ids = analysis.facets[meta.key]
    // A long choice reads as its count; its × clears that one filter.
    if (ids.length > 3) chips.push({ label: `${meta.label}: ${ids.length} seçilib`, clear: () => reading.setFacet(meta.key, []) })
    else for (const id of ids) chips.push({ label: `${meta.one}: ${labelOf(meta.dim, id).name}`, clear: () => reading.setFacet(meta.key, ids.filter((item) => item !== id)) })
  }

  return (
    <section aria-labelledby="filters-title" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="filters-title" className="sr-only">Filtrlər</h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="filter-fields"
          onClick={() => setOpen(!open)}
          className="group inline-flex min-h-10 items-center gap-2 rounded-lg border border-(--y-line) bg-(--y-surface) px-3 text-sm font-semibold transition-colors hover:bg-(--y-band) aria-expanded:bg-(--y-band)"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filtrlər
          {chips.length > 0 && <span className="tnum rounded-full bg-(--y-bar) px-1.5 text-xs text-white">{chips.length}</span>}
          <ChevronDown aria-hidden="true" className="size-4 text-(--y-muted) transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none" />
        </button>
        {chips.length > 0 ? (
          <>
            <ul aria-label="Aktiv filtrlər" className="flex flex-wrap items-center gap-1.5">
              {chips.map((chip) => (
                <li key={chip.label} className="inline-flex items-center gap-1 rounded-full border border-(--y-bar)/30 bg-(--y-band) py-0.5 pl-2.5 pr-1 text-xs font-semibold text-(--y-ink)">
                  {chip.label}
                  <button type="button" aria-label={`${chip.label} filtrini sil`} onClick={chip.clear} className="grid size-6 place-items-center rounded-full text-(--y-muted) hover:bg-(--y-surface) hover:text-(--y-ink)">
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={reading.resetFilters} className="min-h-9 rounded-md px-2 text-sm font-semibold text-(--y-bar) underline-offset-4 hover:underline">
              Filtrləri sıfırla
            </button>
          </>
        ) : (
          <span className="text-sm text-(--y-muted)">Bütün il, bütün obyekt və kateqoriyalar</span>
        )}
      </div>
      {open && (
        <div id="filter-fields" className="grid grid-cols-1 gap-x-3 gap-y-2.5 rounded-xl border border-(--y-line) bg-(--y-surface) p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
          <PeriodField reading={reading} />
          {facetMeta.map((meta, index) => (
            <FacetField
              key={meta.key}
              label={meta.label}
              options={options[meta.key]}
              selected={analysis.facets[meta.key]}
              empty={meta.empty}
              align={index % 2 === 0 ? 'right' : 'left'}
              onChange={(ids) => reading.setFacet(meta.key, ids)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function PeriodField({ reading }: { reading: AnalysisReading }) {
  const { from, to } = reading.analysis
  const set = (first: number, last: number) => reading.write({ from: first === 1 ? null : String(first), to: last === 12 ? null : String(last) })
  const months = monthNames.map((name, index) => (
    <option key={name} value={index + 1} className="bg-(--y-surface)">{name}</option>
  ))
  return (
    <div className="min-w-0">
      <span id="period-label" className="mb-1 block text-[11px] font-semibold text-(--y-muted)">Dövr · {YEAR}</span>
      <div role="group" aria-labelledby="period-label" className="flex min-h-10 items-center gap-0.5 rounded-lg border border-(--y-line) bg-(--y-surface) px-1 text-sm">
        {/* The range never turns over: moving one end past the other brings the other along. */}
        <select aria-label="Başlanğıc ay" value={from} onChange={(event) => { const month = Number(event.target.value); set(month, Math.max(month, to)) }} className="h-9 min-w-0 flex-1 rounded-md bg-transparent px-1 font-semibold text-(--y-ink)">
          {months}
        </select>
        <span aria-hidden="true" className="text-(--y-muted)">–</span>
        <select aria-label="Son ay" value={to} onChange={(event) => { const month = Number(event.target.value); set(Math.min(from, month), month) }} className="h-9 min-w-0 flex-1 rounded-md bg-transparent px-1 font-semibold text-(--y-ink)">
          {months}
        </select>
      </div>
    </div>
  )
}

/**
 * One filter as a catalogue keeps it: a field that says what is chosen — «Hamısı», a name, or how many — and opens a
 * list with a search and ticks, each choice with its amount under the other filters. What was chosen when the list
 * opened stays at its top; a tick applies at once.
 */
function FacetField({ label, options, selected, empty, align, onChange }: {
  label: string
  options: FacetOption[]
  selected: string[]
  empty: string
  align: 'left' | 'right'
  onChange: (ids: string[]) => void
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pinned, setPinned] = useState<string[]>([])
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    panel.current?.querySelector<HTMLElement>('input')?.focus()
    const away = (event: PointerEvent) => { if (!wrap.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  const show = () => { setPinned(selected); setQuery(''); setOpen(true) }
  const close = () => { setOpen(false); button.current?.focus() }
  const nameOf = (item: string) => options.find((option) => option.id === item)?.name ?? ''
  const value = selected.length === 0 ? 'Hamısı' : selected.length === 1 ? nameOf(selected[0]) : `${selected.length} seçilib`
  const needle = query.trim().toLocaleLowerCase('az')
  const shown = options
    .filter((option) => !needle || option.name.toLocaleLowerCase('az').includes(needle) || option.parent?.toLocaleLowerCase('az').includes(needle))
    .sort((left, right) => Number(pinned.includes(right.id)) - Number(pinned.includes(left.id)))
  const toggle = (item: string) => onChange(selected.includes(item) ? selected.filter((other) => other !== item) : [...selected, item])

  return (
    <div
      ref={wrap}
      className="relative min-w-0"
      onKeyDown={(event) => { if (event.key === 'Escape' && open) { event.stopPropagation(); close() } }}
    >
      <span id={`${id}-label`} className="mb-1 block text-[11px] font-semibold text-(--y-muted)">{label}</span>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? setOpen(false) : show())}
        className="group flex min-h-10 w-full items-center gap-2 rounded-lg border border-(--y-line) bg-(--y-surface) px-3 text-left text-sm transition-colors hover:bg-(--y-band) aria-expanded:border-(--y-bar)"
      >
        <span id={`${id}-value`} title={selected.length === 1 ? value : undefined} className={`min-w-0 flex-1 truncate ${selected.length ? 'font-semibold text-(--y-ink)' : 'text-(--y-ink-2)'}`}>{value}</span>
        {selected.length > 1 && <span className="tnum rounded-full bg-(--y-bar) px-1.5 text-xs font-semibold text-white">{selected.length}</span>}
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-(--y-muted) transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none" />
      </button>
      {open && (
        <div
          ref={panel}
          id={`${id}-panel`}
          role="dialog"
          aria-label={`${label}: seçim`}
          className={`absolute top-full z-30 mt-1 flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-xl border border-(--y-line) bg-(--y-surface) p-2 shadow-[0_16px_40px_-16px_rgba(15,23,42,0.45)] ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {options.length > 6 && (
            <label className="flex items-center gap-2 rounded-lg border border-(--y-line) px-2.5 focus-within:border-(--y-bar)">
              <Search aria-hidden="true" className="size-4 shrink-0 text-(--y-muted)" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Axtar…"
                aria-label={`${label} üzrə axtar`}
                className="h-9 min-w-0 flex-1 bg-transparent text-sm text-(--y-ink) outline-none placeholder:text-(--y-muted)"
              />
            </label>
          )}
          <ul aria-label={label} className="mt-1 max-h-72 overflow-y-auto overscroll-contain">
            {shown.map((option) => (
              <li key={option.id}>
                <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1 hover:bg-(--y-band)">
                  <input type="checkbox" checked={selected.includes(option.id)} onChange={() => toggle(option.id)} className="size-4 shrink-0 accent-(--y-bar)" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-(--y-ink)" title={option.name}>{option.name}</span>
                    {option.parent && <span className="block truncate text-[11px] text-(--y-muted)">{option.parent}</span>}
                  </span>
                  <span className="tnum shrink-0 text-xs text-(--y-muted)">{option.amount ? rounded(option.amount) : 'yoxdur'}</span>
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="px-2 py-3 text-sm text-(--y-muted)">{needle ? `«${query.trim()}» tapılmadı.` : empty}</li>}
          </ul>
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-(--y-line) pt-2">
            <span className="text-xs text-(--y-muted)">{selected.length ? `${selected.length} seçilib` : 'Hamısı daxildir'}</span>
            <span className="flex gap-1">
              <button type="button" disabled={!selected.length} onClick={() => onChange([])} className="min-h-9 rounded-md px-2.5 text-sm font-semibold text-(--y-ink-2) hover:bg-(--y-band) disabled:opacity-40">
                Təmizlə
              </button>
              <button type="button" onClick={close} className="min-h-9 rounded-md bg-(--y-ink) px-3 text-sm font-semibold text-(--y-surface)">
                Hazır
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---- Directions, view, order ------------------------------------------------------------------------------------------ */

function Toolbar({ reading }: { reading: AnalysisReading }) {
  const { analysis } = reading
  const resolve = (dim: Preset['rows'] | null) => (dim === 'kat' ? categoryDim(analysis.facets) : dim)
  const apply = (preset: Preset) => reading.setDirections(resolve(preset.rows)!, resolve(preset.cols), preset.view)
  const setRows = (rows: Dim) => reading.setDirections(rows, analysis.cols === rows ? analysis.rows : analysis.cols)
  const swap = () => analysis.cols && reading.setDirections(analysis.cols, analysis.rows)
  const select = 'h-10 min-w-0 rounded-lg border border-(--y-line) bg-(--y-surface) pl-2.5 pr-8 text-sm font-semibold text-(--y-ink)'
  const sorts: { value: Sort; label: string }[] = [
    { value: 'mebleg', label: 'Məbləğ' },
    { value: 'ferq', label: 'Fərq' },
    { value: 'ad', label: analysis.rows === 'ay' ? 'Xronoloji' : 'Ad' },
  ]

  return (
    <div className="flex flex-col gap-3 border-b border-(--y-line) px-3 py-3 sm:px-5 sm:py-4">
      <div role="group" aria-label="Hazır analizlər" className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-(--y-muted)">Hazır analizlər</span>
        {presets.map((preset) => {
          const active = presetMatches(preset, analysis)
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => apply(preset)}
              className={`min-h-8 rounded-full border px-3 text-xs font-semibold transition-colors ${
                active ? 'border-(--y-ink) bg-(--y-ink) text-(--y-surface)' : 'border-(--y-line) text-(--y-ink-2) hover:bg-(--y-band)'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div className="flex min-w-0 items-end gap-1.5">
          <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-(--y-muted)">
            Sətirlər
            <select value={analysis.rows} onChange={(event) => setRows(event.target.value as Dim)} className={select}>
              {dimOrder.map((dim) => <option key={dim} value={dim} className="bg-(--y-surface)">{dimLabels[dim]}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={swap}
            disabled={!analysis.cols}
            aria-label="Sətirlərlə sütunların yerini dəyiş"
            title="Sətirlərlə sütunların yerini dəyiş"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-(--y-line) text-(--y-ink-2) hover:bg-(--y-band) disabled:opacity-40"
          >
            <ArrowLeftRight aria-hidden="true" className="size-4" />
          </button>
          <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-(--y-muted)">
            Sütunlar
            <select value={analysis.cols ?? 'yox'} onChange={(event) => reading.setDirections(analysis.rows, event.target.value === 'yox' ? null : event.target.value as Dim)} className={select}>
              <option value="yox" className="bg-(--y-surface)">Yoxdur — sıralı siyahı</option>
              {dimOrder.filter((dim) => dim !== analysis.rows).map((dim) => <option key={dim} value={dim} className="bg-(--y-surface)">{dimLabels[dim]}</option>)}
            </select>
          </label>
        </div>
        <Segmented label="Görünüş">
          {(['qrafik', 'cedvel'] as const).map((view) => (
            <button
              key={view}
              type="button"
              aria-pressed={analysis.view === view}
              onClick={() => reading.write({ view: view === 'qrafik' ? null : view })}
              className={segment(analysis.view === view)}
            >
              {view === 'qrafik' ? <BarChart3 aria-hidden="true" className="size-4" /> : <Table2 aria-hidden="true" className="size-4" />}
              {view === 'qrafik' ? 'Qrafik' : 'Cədvəl'}
            </button>
          ))}
        </Segmented>
        <Segmented label="Sırala">
          {sorts.map((item) => (
            <button key={item.value} type="button" aria-pressed={analysis.sort === item.value} onClick={() => reading.write({ sort: item.value })} className={segment(analysis.sort === item.value)}>
              {item.label}
            </button>
          ))}
        </Segmented>
      </div>
    </div>
  )
}

function Segmented({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <span id={id} className="text-[11px] font-semibold text-(--y-muted)">{label}</span>
      <div role="group" aria-labelledby={id} className="flex rounded-lg border border-(--y-line) p-0.5">{children}</div>
    </div>
  )
}

const segment = (active: boolean) =>
  `inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors ${active ? 'bg-(--y-ink) text-(--y-surface)' : 'text-(--y-ink-2) hover:bg-(--y-band)'}`

/* ---- The figures above the result ------------------------------------------------------------------------------------- */

const countWords: Record<Dim, string> = { ay: 'ay', obyekt: 'obyekt', sirket: 'şirkət', ana: 'ana kateqoriya', orta: 'orta kateqoriya', alt: 'alt kateqoriya', mehsul: 'məhsul' }

function Summary({ pivot, reading, period }: { pivot: Pivot; reading: AnalysisReading; period: string }) {
  const { analysis, kind, basis } = reading
  const change = pivot.change
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 px-3 py-3 sm:grid-cols-3 sm:px-5 sm:py-4">
      <div className="min-w-0">
        <dt className="text-xs text-(--y-muted)">Cəmi · {period}</dt>
        <dd data-figure="total" className="tnum text-[22px] font-extrabold leading-tight tracking-[-0.01em]">{money(pivot.total)}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-xs text-(--y-muted)">{pivot.latest ? `${monthName(pivot.latest)} · son ay` : 'Son ay'}</dt>
        <dd className="flex flex-wrap items-center gap-x-2">
          <span data-figure="latest" className="tnum text-[22px] font-extrabold leading-tight tracking-[-0.01em]">{pivot.latestAmount ? money(pivot.latestAmount) : '—'}</span>
          {change.kind === 'value' ? <Chip change={change} /> : null}
        </dd>
        <dd className="text-xs text-(--y-muted)">{change.kind === 'value' ? `${signedMoney(change.delta)} ${basisReference[basis]}` : change.detail}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-xs text-(--y-muted)">Kəsişmə</dt>
        <dd data-figure="shape" className="text-[15px] font-bold leading-tight">
          {pivot.rows.length} {countWords[analysis.rows]}{analysis.cols ? ` × ${pivot.cols.length} ${countWords[analysis.cols]}` : ''}
        </dd>
        <dd className="text-xs text-(--y-muted)">{kindNames[kind]}{kind === 'all' ? ' — ümumi xərc, təsdiq ediləcək məbləğ deyil' : ''}</dd>
      </div>
    </dl>
  )
}

function Empty({ reading, period }: { reading: AnalysisReading; period: string }) {
  const notStarted = reading.analysis.from > LAST_MONTH_WITH_DATA
  return (
    <div className="px-6 py-10 text-center">
      <h3 id="empty-title" className="text-base font-bold">{notStarted ? 'Seçilmiş dövr hələ başlamayıb' : 'Seçilmiş filtrlərdə sifariş yoxdur'}</h3>
      <p className="mx-auto mt-1 max-w-xl text-sm text-(--y-muted)">
        {notStarted
          ? `${period} üzrə hələ heç bir sifariş yoxdur.`
          : `${period} · ${kindNames[reading.kind]}: bu birləşmədə sifariş qeydə alınmayıb. Məbləğ sıfır kimi göstərilmir — filtrlərdən birini dəyişin və ya hamısını sıfırlayın.`}
      </p>
      <button type="button" onClick={reading.resetFilters} className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-(--y-line) px-4 text-sm font-semibold hover:bg-(--y-band)">
        Filtrləri sıfırla
      </button>
    </div>
  )
}

/* ---- The result ---------------------------------------------------------------------------------------------------------- */

const ROW_LIMIT = 30

function Result({ pivot, reading }: { pivot: Pivot; reading: AnalysisReading }) {
  const { analysis } = reading
  if (analysis.cols) return <PivotMatrix pivot={pivot} reading={reading} exact={analysis.view === 'cedvel'} />
  if (analysis.view === 'cedvel') return <ListTable pivot={pivot} reading={reading} />
  // One direction: columns for the months or a few short names, ranked bars for many or long ones — and on a phone.
  const columns = analysis.rows === 'ay' || (pivot.rows.length <= 10 && pivot.rows.every((row) => row.short.length <= 16) && !pivot.withProduct)
  return columns ? (
    <>
      <div className="hidden md:block"><ColumnChart pivot={pivot} reading={reading} /></div>
      <div className="md:hidden"><BarList pivot={pivot} reading={reading} /></div>
    </>
  ) : <BarList pivot={pivot} reading={reading} />
}

/** A whole manat for a chart or a matrix cell: «12.345»; the exact figure is in the table and the cell's title. */
const whole = (value: number) => (value > 0 && value < 0.5 ? '<1' : moneyParts(Math.round(value)).whole)
/** The exact figure without the sign, for a dense table whose heading says «₼». */
const exactNumber = (value: number) => { const parts = moneyParts(value); return `${parts.whole},${parts.cents}` }

function MoreRows({ count, all, onToggle }: { count: number; all: boolean; onToggle: () => void }) {
  if (count <= ROW_LIMIT) return null
  return (
    <button type="button" onClick={onToggle} className="mt-1 w-full rounded-lg py-2 text-sm font-semibold text-(--y-bar) hover:bg-(--y-band)">
      {all ? 'Daha az göstər' : `Hamısını göstər (${count})`}
    </button>
  )
}

/** The month's approval beside its name, where the monthly orders are in view: the month's, never the filter's. */
function ApprovalMark({ month }: { month: number }) {
  const approval = approvalOf(month)
  if (!approval) return null
  const words = `Ay üzrə: ${packageWords(approval).toLocaleLowerCase('az')}`
  return approval.state === 'approved'
    ? <span title={words} className="inline-flex text-(--y-ok)"><Check aria-hidden="true" className="size-3.5" strokeWidth={2.75} /><span className="sr-only">{words}</span></span>
    : <span title={words} className="inline-flex text-(--y-amber)"><Hourglass aria-hidden="true" className="size-3.5" strokeWidth={2.25} /><span className="sr-only">{words}</span></span>
}

function ChangeCell({ change }: { change: Change }) {
  return change.kind === 'value'
    ? <span className="inline-flex items-center justify-end gap-1.5"><span className="tnum whitespace-nowrap text-[11px] font-semibold text-(--y-muted)">{signedRounded(change.delta)}</span><Chip change={change} /></span>
    : change.text === 'yeni'
      ? <span className="rounded-full bg-(--y-band) px-1.5 py-0.5 text-[11px] font-bold text-(--y-bar)" title={change.detail}>yeni</span>
      : <span title={change.detail}><NoChange change={change} /></span>
}

function SortHead({ reading, sort, children, className = '' }: { reading: AnalysisReading; sort: Sort; children: ReactNode; className?: string }) {
  const active = reading.analysis.sort === sort
  return (
    <th scope="col" aria-sort={active ? (sort === 'ad' ? 'ascending' : 'descending') : undefined} className={className}>
      <button type="button" onClick={() => reading.write({ sort })} className={`inline-flex items-center gap-1 rounded hover:text-(--y-bar) ${active ? 'text-(--y-ink)' : ''}`}>
        {children}
        {active && <ArrowDown aria-hidden="true" className="size-3" />}
      </button>
    </th>
  )
}

/**
 * Two directions as one matrix: a row per item of the one, a column per item of the other, the totals of both and the
 * whole. As a chart, each cell is shaded by its amount, the column totals stand over the columns and the row totals
 * lie beside the rows; as a table, the exact figures and each row's change. Many columns read as the largest and a
 * «Digər» that adds the rest, until asked for all; a name opens its row one level down.
 */
function PivotMatrix({ pivot, reading, exact }: { pivot: Pivot; reading: AnalysisReading; exact: boolean }) {
  const { analysis, kind } = reading
  const [allRows, setAllRows] = useState(false)
  const [allCols, setAllCols] = useState(false)
  const folded = allCols ? { cols: pivot.cols, folded: 0 } : foldColumns(pivot, analysis.cols)
  const cols = folded.cols
  const rows = allRows ? pivot.rows : pivot.rows.slice(0, ROW_LIMIT)
  const cellMax = Math.max(...pivot.rows.flatMap((row) => cols.filter((col) => !col.folded).map((col) => cellOf(row, col))), 1)
  const colMax = Math.max(...cols.map((col) => col.total), 1)
  const rowMax = Math.max(...pivot.rows.map((row) => row.total), 1)
  const format = exact ? exactNumber : whole
  const monthly = kind === 'monthly'
  const shade = (value: number) => `color-mix(in oklab, var(--y-bar) ${Math.round(6 + 40 * Math.sqrt(value / cellMax))}%, transparent)`
  const sticky = 'sticky left-0 z-[1] bg-(--y-surface)'
  // On a desktop the totals — and, in the table, the change — stay at the right edge while the columns scroll under them.
  const edge = 'bg-(--y-surface) md:sticky md:z-[1]'
  const totalAt = `${exact ? 'md:right-[9.5rem]' : 'md:right-0'} md:shadow-[-12px_0_12px_-12px_rgba(15,23,42,0.28)]`
  const changeAt = 'md:right-0 md:w-[9.5rem] md:min-w-[9.5rem]'

  return (
    <div className="flex flex-col gap-1">
      <div role="region" aria-labelledby="matrix-caption" tabIndex={0} className="relative -mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 focus-visible:outline-2 focus-visible:outline-(--y-bar)">
        <table data-matrix={exact ? 'exact' : 'heat'} className="w-full border-separate border-spacing-0 text-[13px]">
          <caption id="matrix-caption" className="sr-only">
            {dimLabels[analysis.rows]} × {dimLabels[analysis.cols!]} · {kindNames[kind]} · məbləğ, manatla
          </caption>
          <thead>
            {!exact && (
              <tr aria-hidden="true">
                <td className={sticky} />
                {cols.map((col) => (
                  <td key={col.key} className="h-12 px-1 align-bottom">
                    <span className={`mx-auto block w-1/2 max-w-7 rounded-t-[3px] ${col.folded ? 'bg-(--y-grid)' : 'bg-(--y-bar)/75'}`} style={{ height: `${Math.max(4, (col.total / colMax) * 100)}%` }} />
                  </td>
                ))}
                <td className={`${edge} ${totalAt}`} />
              </tr>
            )}
            <tr>
              <SortHead reading={reading} sort="ad" className={`${sticky} z-[2] whitespace-nowrap border-b border-(--y-line) px-3 py-2 text-left align-bottom text-[11px] font-semibold text-(--y-muted)`}>
                {dimSingular[analysis.rows]} <span aria-hidden="true">\</span> {dimSingular[analysis.cols!]}
              </SortHead>
              {cols.map((col) => (
                <th key={col.key} scope="col" title={col.folded ? `${col.folded.length} ${countWords[analysis.cols!]} birlikdə` : col.parent ? `${col.name} (${col.parent})` : col.name} className="min-w-[4.75rem] max-w-[7rem] border-b border-(--y-line) px-2 py-2 text-right align-bottom text-[11px] font-semibold leading-tight text-(--y-ink-2)">
                  <span className="flex items-end justify-end gap-1">
                    <span className="line-clamp-2 break-words">{col.short}</span>
                    {analysis.cols === 'ay' && monthly && <ApprovalMark month={Number(col.key)} />}
                  </span>
                </th>
              ))}
              <SortHead reading={reading} sort="mebleg" className={`${edge} ${totalAt} border-b border-(--y-line) px-3 py-2 text-right align-bottom text-[11px] font-semibold text-(--y-ink-2)`}>Cəmi</SortHead>
              {exact && (
                <SortHead reading={reading} sort="ferq" className={`${edge} ${changeAt} border-b border-(--y-line) px-3 py-2 text-right align-bottom text-[11px] font-semibold text-(--y-ink-2)`}>
                  {analysis.rows === 'ay' ? 'Fərq' : pivot.latest ? `${monthName(pivot.latest)}, fərq` : 'Fərq'}
                </SortHead>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} data-row={row.key} className="group">
                <th scope="row" className={`${sticky} max-w-[15rem] border-b border-(--y-line) px-3 py-1.5 text-left font-semibold group-hover:bg-(--y-band)`}>
                  <span className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => reading.drill(analysis.rows, row.key)}
                      title={`${row.name}: filtr kimi tətbiq et və bir səviyyə aşağı aç`}
                      className="min-w-0 truncate text-left hover:text-(--y-bar) focus-visible:outline-2 focus-visible:outline-(--y-bar)"
                    >
                      {row.name}
                    </button>
                    {analysis.rows === 'ay' && monthly && <ApprovalMark month={Number(row.key)} />}
                  </span>
                  {row.parent && <span className="block truncate text-[11px] font-normal text-(--y-muted)">{row.parent}</span>}
                </th>
                {cols.map((col) => {
                  const value = cellOf(row, col)
                  return (
                    <td
                      key={col.key}
                      data-col={col.key}
                      data-amount={value}
                      title={`${row.name} · ${col.name}: ${value ? money(value) : 'sifariş yoxdur'}`}
                      className="tnum whitespace-nowrap border-b border-(--y-line) px-2 py-1.5 text-right"
                      style={!exact && value ? { backgroundColor: col.folded ? 'var(--y-grid)' : shade(value) } : undefined}
                    >
                      {value ? format(value) : <span className="text-(--y-muted)">—</span>}
                    </td>
                  )
                })}
                <td data-col="total" data-amount={row.total} className={`${edge} ${totalAt} tnum whitespace-nowrap border-b border-(--y-line) px-3 py-1.5 text-right font-bold`}>
                  {exact ? format(row.total) : (
                    <span className="flex items-center justify-end gap-2">
                      <span aria-hidden="true" className="hidden h-1.5 w-14 rounded-full bg-(--y-grid) sm:block">
                        <span className="block h-full rounded-full bg-(--y-bar)" style={{ width: `${Math.max(2, (row.total / rowMax) * 100)}%` }} />
                      </span>
                      {format(row.total)}
                    </span>
                  )}
                </td>
                {exact && <td className={`${edge} ${changeAt} whitespace-nowrap border-b border-(--y-line) px-3 py-1.5 text-right`}><ChangeCell change={row.change} /></td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr data-row="total">
              <th scope="row" className={`${sticky} border-t-2 border-(--y-line) px-3 py-2 text-left font-extrabold`}>
                Cəmi{rows.length < pivot.rows.length ? <span className="ml-1 text-[11px] font-semibold text-(--y-muted)">(bütün {pivot.rows.length})</span> : null}
              </th>
              {cols.map((col) => (
                <td key={col.key} data-col={col.key} data-amount={col.total} className="tnum whitespace-nowrap border-t-2 border-(--y-line) px-2 py-2 text-right font-bold">{format(col.total)}</td>
              ))}
              <td data-col="total" data-amount={pivot.total} className={`${edge} ${totalAt} tnum whitespace-nowrap border-t-2 border-(--y-line) px-3 py-2 text-right font-extrabold`}>{format(pivot.total)}</td>
              {exact && <td className={`${edge} ${changeAt} whitespace-nowrap border-t-2 border-(--y-line) px-3 py-2 text-right`}><ChangeCell change={pivot.change} /></td>}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!exact && (
          <p aria-hidden="true" className="flex items-center gap-2 text-[11px] text-(--y-muted)">
            az
            <span className="h-2 w-24 rounded-full" style={{ background: 'linear-gradient(90deg, color-mix(in oklab, var(--y-bar) 6%, transparent), color-mix(in oklab, var(--y-bar) 46%, transparent))' }} />
            çox · xananın məbləği, ₼
          </p>
        )}
        {exact && <p className="text-[11px] text-(--y-muted)">Məbləğlər manatla.</p>}
        {(folded.folded > 0 || allCols) && (
          <button type="button" onClick={() => setAllCols(!allCols)} className="min-h-9 rounded-md px-2 text-sm font-semibold text-(--y-bar) hover:bg-(--y-band)">
            {allCols ? 'Kiçik sütunları «Digər»də birləşdir' : `Bütün sütunları göstər (${pivot.cols.length})`}
          </button>
        )}
      </div>
      <MoreRows count={pivot.rows.length} all={allRows} onToggle={() => setAllRows(!allRows)} />
    </div>
  )
}

/** One direction, a few short items: columns on a value axis, each with its amount and its change. */
function ColumnChart({ pivot, reading }: { pivot: Pivot; reading: AnalysisReading }) {
  const largest = Math.max(...pivot.rows.map((row) => row.total))
  const scale = niceScale(largest)
  const columns = { gridTemplateColumns: `3.25rem repeat(${pivot.rows.length}, minmax(0, 1fr))` }
  return (
    <div className="relative mt-2 grid" style={columns} data-chart="columns">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-56">
        {scale.ticks.map((value) => (
          <div key={value} className={`absolute inset-x-0 border-t ${value === 0 ? 'border-(--y-line)' : 'border-dashed border-(--y-grid)'}`} style={{ bottom: `${(value / scale.top) * 100}%` }}>
            <span className="tnum absolute -top-2 left-0 w-11 text-right text-[11px] leading-4 text-(--y-muted)">{axisLabel(value)}</span>
          </div>
        ))}
      </div>
      <div />
      {pivot.rows.map((row) => <Column key={row.key} row={row} top={scale.top} pivot={pivot} reading={reading} />)}
    </div>
  )
}

function Column({ row, top, pivot, reading }: { row: PivotRow; top: number; pivot: Pivot; reading: AnalysisReading }) {
  const { analysis, kind } = reading
  const { open, handlers } = useTipTrigger()
  const bar = useRef<HTMLSpanElement>(null)
  const anchor = useCallback(() => bar.current, [])
  const tipId = `column-tip-${row.key}`
  const months = analysis.rows === 'ay'
  return (
    <>
      <button
        type="button"
        data-row={row.key}
        aria-describedby={tipId}
        aria-label={`${row.name}: ${money(row.total)}. Filtr kimi tətbiq et`}
        onClick={() => reading.drill(analysis.rows, row.key)}
        {...handlers}
        className="group relative flex min-w-0 flex-col items-center rounded-lg pb-1"
      >
        <span aria-hidden="true" className="absolute inset-x-0.5 top-0 h-56 rounded-md transition-colors group-hover:bg-(--y-band)" />
        <span aria-hidden="true" className="relative block h-56 w-full">
          <span ref={bar} className="absolute bottom-0 left-1/2 w-[46%] max-w-10 -translate-x-1/2 rounded-t-[5px] bg-(--y-bar) transition-colors group-hover:bg-(--y-bar-hover)" style={{ height: `${Math.max(1.5, (row.total / top) * 100)}%` }} />
        </span>
        <span className="mt-2 flex max-w-full items-center gap-1 px-0.5 text-xs font-semibold text-(--y-ink-2)">
          <span className="line-clamp-2 break-words text-center">{row.short}</span>
          {months && kind === 'monthly' && <ApprovalMark month={Number(row.key)} />}
        </span>
        <span className="tnum mt-1 whitespace-nowrap text-[14px] font-extrabold leading-5">{rounded(row.total)}</span>
        <span className="mt-1 flex h-5 items-center">{row.change.kind === 'value' ? <Chip change={row.change} /> : <NoChange change={row.change} />}</span>
        <span className="tnum mt-0.5 h-4 whitespace-nowrap text-[11px] font-semibold leading-4 text-(--y-muted)">{row.change.kind === 'value' ? signedRounded(row.change.delta) : ''}</span>
      </button>
      <RowTip id={tipId} row={row} pivot={pivot} reading={reading} anchor={anchor} open={open} />
    </>
  )
}

/** A column's figures on hover or focus: the amount over the period, its share, and its change with what it is against. */
function RowTip({ id, row, pivot, reading, anchor, open }: { id: string; row: PivotRow; pivot: Pivot; reading: AnalysisReading; anchor: () => Element | null; open: boolean }) {
  const months = reading.analysis.rows === 'ay'
  const month = months ? Number(row.key) : pivot.latest
  return (
    <Tip id={id} anchor={anchor} open={open} width="w-60">
      <p className="text-xs opacity-75">{row.name}{row.parent ? ` · ${row.parent}` : ''}</p>
      <p className="tnum text-lg font-extrabold leading-snug">{money(row.total)}</p>
      <p className="text-xs opacity-75">{percent(pivot.total ? row.total / pivot.total : 0, false)} · {kindNames[reading.kind]}</p>
      <dl className="mt-1.5 flex flex-col gap-0.5 border-t border-current/20 pt-1.5 text-xs">
        {!months && month && <div className="flex justify-between gap-3"><dt className="opacity-75">{monthName(month)}</dt><dd className="tnum font-semibold">{money(row.current)}</dd></div>}
        {row.change.kind === 'value' ? (
          <>
            <div className="flex justify-between gap-3"><dt className="opacity-75">Müqayisə</dt><dd className="tnum font-semibold">{money(row.comparison)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="opacity-75">Fərq</dt><dd className="tnum font-semibold">{signedMoney(row.change.delta)} · {row.change.text}</dd></div>
            <div className="opacity-60">{basisReference[reading.basis]}</div>
          </>
        ) : <div className="opacity-80">{row.change.detail}</div>}
        {months && reading.kind === 'monthly' && approvalOf(Number(row.key)) && (
          <div className="opacity-75">Ay üzrə: {packageWords(approvalOf(Number(row.key))).toLocaleLowerCase('az')}</div>
        )}
      </dl>
    </Tip>
  )
}

/** A product's quantity and weighted price, in its own unit(s): never units added together. */
function quantityText(figure: ProductFigures['range']) {
  if (figure.mixedUnits) return quantityParts(figure.parts)
  return quantity(figure.qty, figure.unit)
}

/**
 * One direction, many items or long names: ranked bars, the name whole on the left (its parent under it), the amount,
 * its share and its change. A product row adds its quantity and weighted price. A name opens its row one level down.
 */
function BarList({ pivot, reading }: { pivot: Pivot; reading: AnalysisReading }) {
  const { analysis, kind } = reading
  const [all, setAll] = useState(false)
  const rows = all ? pivot.rows : pivot.rows.slice(0, ROW_LIMIT)
  const largest = Math.max(...pivot.rows.map((row) => row.total), 1)
  const grid = 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 md:grid-cols-[minmax(10rem,17rem)_minmax(0,1fr)_7.5rem_3.5rem_8.5rem] md:items-center md:gap-x-4'
  return (
    <div className="mt-1" data-chart="bars">
      <div aria-hidden="true" className={`hidden px-2 pb-1.5 text-[11px] font-semibold text-(--y-muted) md:grid ${grid}`}>
        <span>{dimSingular[analysis.rows]}</span>
        <span />
        <span className="text-right">Məbləğ</span>
        <span className="text-right">Pay</span>
        <span className="text-right">{analysis.rows === 'ay' ? 'Fərq' : pivot.latest ? `${monthName(pivot.latest)}, fərq` : 'Fərq'}</span>
      </div>
      <ol>
        {rows.map((row) => (
          <li key={row.key} data-row={row.key} className={`group relative rounded-lg border-t border-(--y-line) px-2 py-2 first:border-t-0 hover:bg-(--y-band) ${grid}`}>
            <button
              type="button"
              onClick={() => reading.drill(analysis.rows, row.key)}
              aria-label={`${row.name}${row.parent ? ` (${row.parent})` : ''}: ${money(row.total)}. Filtr kimi tətbiq et`}
              className="stretched min-w-0 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--y-bar) md:order-1"
            >
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold group-hover:text-(--y-bar)" title={row.name}>{row.name}</span>
                {analysis.rows === 'ay' && kind === 'monthly' && <ApprovalMark month={Number(row.key)} />}
              </span>
              {row.product
                ? <span className="block truncate text-[11px] text-(--y-muted)">{quantityText(row.product.range)} · {row.product.range.price !== null ? price(row.product.range.price, row.product.range.unit) : 'fərqli vahidlər'}</span>
                : row.parent && <span className="block truncate text-[11px] text-(--y-muted)">{row.parent}</span>}
            </button>
            <span data-amount={row.total} className="tnum text-right text-sm font-bold md:order-3">{rounded(row.total)}</span>
            <span aria-hidden="true" className="col-span-2 block h-2.5 rounded-full bg-(--y-grid) md:order-2 md:col-span-1">
              <span className="block h-full rounded-full bg-(--y-bar) group-hover:bg-(--y-bar-hover)" style={{ width: `${Math.max(1, (row.total / largest) * 100)}%` }} />
            </span>
            <span className="tnum hidden text-right text-xs text-(--y-muted) md:order-4 md:block">{percent(pivot.total ? row.total / pivot.total : 0, false)}</span>
            <span className="col-span-2 flex items-center justify-end gap-1.5 md:order-5 md:col-span-1">
              <span className="tnum mr-auto text-xs text-(--y-muted) md:hidden">{percent(pivot.total ? row.total / pivot.total : 0, false)}</span>
              <ChangeCell change={row.change} />
            </span>
          </li>
        ))}
      </ol>
      <MoreRows count={pivot.rows.length} all={all} onToggle={() => setAll(!all)} />
    </div>
  )
}

/** A per cent change in its colour and in words, or a dash with the reason. */
function PctCell({ value, reason }: { value: number | null; reason: string }) {
  if (value === null) return <span className="text-(--y-muted)" title={reason}>—</span>
  const way = Math.abs(value) < 0.0005 ? 'flat' : value > 0 ? 'up' : 'down'
  return <Chip change={{ kind: 'value', way, pct: value, delta: value, text: percent(value) }} />
}

/**
 * One direction as a table: the exact amount with its share under it, the latest month and its comparison, the
 * change. A product — or one product's months — adds its quantity and weighted price over the period and how both
 * moved; the total adds quantities only for one product, never across products or units.
 */
function ListTable({ pivot, reading }: { pivot: Pivot; reading: AnalysisReading }) {
  const { analysis, kind } = reading
  const [all, setAll] = useState(false)
  const rows = all ? pivot.rows : pivot.rows.slice(0, ROW_LIMIT)
  const months = analysis.rows === 'ay'
  const product = pivot.withProduct
  const head = 'border-b border-(--y-line) px-3 py-2 text-right align-bottom text-[11px] font-semibold leading-tight text-(--y-ink-2)'
  const cell = 'tnum whitespace-nowrap border-b border-(--y-line) px-3 py-2 text-right'
  const foot = 'tnum whitespace-nowrap border-t-2 border-(--y-line) px-3 py-2 text-right font-bold'
  // On a desktop the change stays at the right edge, should the table be wider than the screen.
  const edge = 'bg-(--y-surface) md:sticky md:right-0 md:z-[1] md:shadow-[-12px_0_12px_-12px_rgba(15,23,42,0.28)]'
  const reason = 'Müqayisə üçün eyni vahiddə məlumat yoxdur və ya müqayisə dövrü natamamdır.'
  const total = pivot.productTotal
  const share = (value: number) => percent(pivot.total ? value / pivot.total : 0, false)
  const sub = 'block text-[11px] font-normal text-(--y-muted)'
  return (
    <div className="flex flex-col gap-1">
      <div role="region" aria-labelledby="list-caption" tabIndex={0} className="relative -mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 focus-visible:outline-2 focus-visible:outline-(--y-bar)">
        <table data-table="list" className="w-full border-separate border-spacing-0 text-[13px]">
          <caption id="list-caption" className="sr-only">{dimLabels[analysis.rows]} · {kindNames[kind]}</caption>
          <thead>
            <tr>
              <SortHead reading={reading} sort="ad" className="sticky left-0 z-[2] border-b border-(--y-line) bg-(--y-surface) px-3 py-2 text-left align-bottom text-[11px] font-semibold text-(--y-ink-2)">
                {dimSingular[analysis.rows]}
              </SortHead>
              {product && <th scope="col" className={head}>Miqdar · orta qiymət</th>}
              <SortHead reading={reading} sort="mebleg" className={head}>Məbləğ · pay</SortHead>
              {!months && <th scope="col" className={head}>{pivot.latest ? monthName(pivot.latest) : 'Son ay'}</th>}
              <th scope="col" className={head}>Müqayisə</th>
              {product && <th scope="col" className={head}>Miqdar dəyişməsi</th>}
              {product && <th scope="col" className={head}>Qiymət dəyişməsi</th>}
              <SortHead reading={reading} sort="ferq" className={`${head} ${edge}`}>Fərq</SortHead>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} data-row={row.key} className="group">
                <th scope="row" className="sticky left-0 z-[1] max-w-[18rem] border-b border-(--y-line) bg-(--y-surface) px-3 py-2 text-left font-semibold group-hover:bg-(--y-band)">
                  <span className="flex items-center gap-1.5">
                    <button type="button" onClick={() => reading.drill(analysis.rows, row.key)} title={`${row.name}: filtr kimi tətbiq et və bir səviyyə aşağı aç`} className="min-w-0 truncate text-left hover:text-(--y-bar)">
                      {row.name}
                    </button>
                    {months && kind === 'monthly' && <ApprovalMark month={Number(row.key)} />}
                  </span>
                  {row.parent && <span className="block truncate text-[11px] font-normal text-(--y-muted)">{row.parent}</span>}
                </th>
                {product && (
                  <td className={cell}>
                    <span className="block">{row.product ? quantityText(row.product.range) : '—'}</span>
                    <span className={sub}>{row.product?.range.price != null ? price(row.product.range.price, row.product.range.unit) : 'fərqli vahidlər'}</span>
                  </td>
                )}
                <td data-amount={row.total} className={cell}>
                  <span className="block font-bold">{money(row.total)}</span>
                  <span className={sub}>{share(row.total)}</span>
                </td>
                {!months && <td className={cell}>{row.current ? money(row.current) : <span className="text-(--y-muted)">—</span>}</td>}
                <td className={`${cell} text-(--y-ink-2)`}>{row.comparison !== null ? money(row.comparison) : <span className="text-(--y-muted)">—</span>}</td>
                {product && <td className={cell}><PctCell value={row.product?.qtyPct ?? null} reason={reason} /></td>}
                {product && <td className={cell}><PctCell value={row.product?.pricePct ?? null} reason={reason} /></td>}
                <td className={`${cell} ${edge}`}><ChangeCell change={row.change} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr data-row="total">
              <th scope="row" className="sticky left-0 z-[1] border-t-2 border-(--y-line) bg-(--y-surface) px-3 py-2 text-left font-extrabold">
                Cəmi{rows.length < pivot.rows.length ? <span className="ml-1 text-[11px] font-semibold text-(--y-muted)">(bütün {pivot.rows.length})</span> : null}
              </th>
              {product && (
                <td className={foot}>
                  {total
                    ? <><span className="block">{quantityText(total)}</span><span className={sub}>{total.price != null ? price(total.price, total.unit) : 'fərqli vahidlər'}</span></>
                    : <span className="font-normal text-(--y-muted)" title="Fərqli məhsulların miqdarı toplanmır">—</span>}
                </td>
              )}
              <td data-amount={pivot.total} className={foot}>
                <span className="block font-extrabold">{money(pivot.total)}</span>
                <span className={sub}>100%</span>
              </td>
              {!months && <td className={foot}>{pivot.latestAmount ? money(pivot.latestAmount) : '—'}</td>}
              <td className={`${foot} font-normal text-(--y-ink-2)`}>{!months && pivot.comparisonAmount !== null ? money(pivot.comparisonAmount) : ''}</td>
              {product && <td className={foot} />}
              {product && <td className={foot} />}
              <td className={`${foot} ${edge}`}>{months ? null : <ChangeCell change={pivot.change} />}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <MoreRows count={pivot.rows.length} all={all} onToggle={() => setAll(!all)} />
    </div>
  )
}

/* ---- What the figures are -------------------------------------------------------------------------------------------- */

function Notes({ pivot, reading }: { pivot: Pivot; reading: AnalysisReading }) {
  const { analysis, kind, basis } = reading
  const products = analysis.rows === 'mehsul' || analysis.cols === 'mehsul' || pivot.withProduct
  const future = analysis.to > LAST_MONTH_WITH_DATA
  return (
    <ul className="-mt-1 flex flex-col gap-1 text-xs text-(--y-muted)">
      {kind === 'monthly' && <li>Təsdiq ay üzrə vahiddir: ayın bütün aylıq sifarişləri bir dəfə təsdiqlənir. Seçilmiş obyekt, kateqoriya və ya məhsul ayrıca təsdiqlənmir; ✓ və ⌛ ayın öz təsdiqidir.</li>}
      {kind === 'outside' && <li>Aylıqdan kənar sifarişlərin hər biri ayrıca razılıqla verilir; burada yalnız məbləğlər göstərilir.</li>}
      {kind === 'all' && <li>«Hamısı» — ümumi xərcdir, təsdiq ediləcək məbləğ deyil.</li>}
      {pivot.rows.length > 0 && (
        <li>
          {analysis.rows === 'ay'
            ? `Hər ay ${basisReference[basis]} müqayisə olunur.`
            : `Fərq: ${pivot.latest ? monthName(pivot.latest) : 'son ay'}, ${basisReference[basis]}.`}{' '}
          Ada klikləyin: filtr kimi tətbiq olunur və bir səviyyə aşağı açılır.
        </li>
      )}
      {products && <li>Miqdar və orta qiymət yalnız bir məhsul üçün, öz vahidində göstərilir; fərqli məhsulların və vahidlərin miqdarı toplanmır. Orta qiymət çəkili ortadır: məbləğ ÷ miqdar.</li>}
      {future && <li>{monthName(LAST_MONTH_WITH_DATA + 1)}{analysis.to > LAST_MONTH_WITH_DATA + 1 ? `–${monthName(analysis.to)}` : ''} hələ başlamayıb: həmin aylar boş göstərilmir, sıfır kimi sayılmır.</li>}
    </ul>
  )
}
