import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import {
  ArrowDown, ArrowLeft, ArrowLeftRight, BarChart3, Check, ChevronDown, CircleAlert, Clock3, Hourglass, Info, Maximize2, Minimize2, Search, SlidersHorizontal, Table2, X,
} from 'lucide-react'
import { approvalDrift, approvalOf } from '../data/analysis'
import { LAST_MONTH_WITH_DATA, monthsWithData, TODAY, YEAR, YEARS } from '../data/model'
import { money, moneyParts, monthDative, monthName, monthNames, monthRange, monthYear, percent, price, quantity, quantityParts, signedMoney } from '../lib/format'
import {
  categoryDim, cellOf, computePivot, dimLabels, dimOrder, dimSingular, facetOptions, foldColumns, labelOf, presetMatches, presets,
  useAnalysis, type AnalysisReading, type Dim, type FacetKey, type FacetOption, type Pivot, type PivotColumn, type PivotRow, type Preset, type ProductFigures, type Sort,
} from '../lib/pivot'
import { basisReference, kindNames, rounded, signedRounded, updatedText, type Change } from '../lib/year'
import { packageWords } from '../ui/kinds'
import { Select } from '../ui/Select'
import { Tip, useTipTrigger } from '../ui/tip'
import { YearNotFound } from './NotFound'
import { BasisSelect, KindNav, YearSelect } from './YearControls'
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

  if (year !== YEAR) return <YearNotFound />

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
 * The filters behind one button, closed when the page opens (owner, 2026-11-20: the chart and the table come first):
 * the period and six lists, each a search and ticks, each choice with what it amounts to under the other filters.
 * Beside the button, what is chosen as chips, each with its own ×, and one reset for all of them — or, with nothing
 * chosen, what the figures cover.
 */
function FilterPanel({ reading, options }: { reading: AnalysisReading; options: Record<FacetKey, FacetOption[]> }) {
  const { analysis } = reading
  const [open, setOpen] = useState(false)
  const whole = analysis.from === 1 && analysis.to === LAST_MONTH_WITH_DATA

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
  // Only the months with data: the next one appears once its workbook is loaded, and no «to» in the address follows it.
  const set = (first: number, last: number) => reading.write({ from: first === 1 ? null : String(first), to: last === LAST_MONTH_WITH_DATA ? null : String(last) })
  const months = monthNames.slice(0, LAST_MONTH_WITH_DATA).map((name, index) => ({ value: String(index + 1), label: name }))
  return (
    <div className="min-w-0">
      <span id="period-label" className="mb-1 block text-[11px] font-semibold text-(--y-muted)">Dövr{YEARS.length < 2 ? ` · ${YEAR}` : ''}</span>
      <div role="group" aria-labelledby="period-label" className="dd-group gap-0.5 px-1 text-sm">
        {YEARS.length > 1 && <><YearSelect className="shrink-0" /><span aria-hidden="true" className="h-5 w-px bg-(--dd-border)" /></>}
        {/* The range never turns over: moving one end past the other brings the other along. */}
        <Select variant="bare" label="Başlanğıc ay" value={String(from)} options={months} onChange={(value) => { const month = Number(value); set(month, Math.max(month, to)) }} className="flex-1" />
        <span aria-hidden="true" className="text-(--y-muted)">–</span>
        <Select variant="bare" label="Son ay" value={String(to)} options={months} onChange={(value) => { const month = Number(value); set(Math.min(from, month), month) }} className="flex-1" />
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
  const select = 'min-w-0 text-sm'
  const sorts: { value: Sort; label: string }[] = [
    { value: 'mebleg', label: 'Məbləğ' },
    { value: 'ferq', label: 'Fərq' },
    { value: 'ad', label: analysis.rows === 'ay' ? 'Xronoloji' : 'Ad' },
  ]

  return (
    <div className="flex flex-col gap-3 border-b border-(--y-line) px-3 py-3 sm:px-5 sm:py-4">
      <PresetRow>
        {presets.map((preset) => {
          const active = presetMatches(preset, analysis)
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => apply(preset)}
              className={`min-h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-colors ${
                active ? 'border-(--y-ink) bg-(--y-ink) text-(--y-surface)' : 'border-(--y-line) text-(--y-ink-2) hover:bg-(--y-band)'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
      </PresetRow>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div className="flex min-w-0 items-end gap-1.5">
          <div className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-(--y-muted)">
            Sətirlər
            <Select label="Sətirlər" value={analysis.rows} options={dimOrder.map((dim) => ({ value: dim, label: dimLabels[dim] }))} onChange={(value) => setRows(value as Dim)} className={select} />
          </div>
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
          <div className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-(--y-muted)">
            Sütunlar
            <Select
              label="Sütunlar"
              value={analysis.cols ?? 'yox'}
              options={[{ value: 'yox', label: 'Yoxdur — sıralı siyahı' }, ...dimOrder.filter((dim) => dim !== analysis.rows).map((dim) => ({ value: dim, label: dimLabels[dim] }))]}
              onChange={(value) => reading.setDirections(analysis.rows, value === 'yox' ? null : value as Dim)}
              className={select}
            />
          </div>
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

/**
 * «Hazır analizlər» on one line: the chips scroll sideways under the label, and the side with chips out of sight fades,
 * so it shows there are more. A chip reached with Tab scrolls itself into view.
 */
function PresetRow({ children }: { children: ReactNode }) {
  const strip = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ before: false, after: false })
  useEffect(() => {
    const element = strip.current
    if (!element) return
    const measure = () => {
      const before = element.scrollLeft > 1
      const after = element.scrollLeft + element.clientWidth < element.scrollWidth - 1
      setMore((current) => (current.before === before && current.after === after ? current : { before, after }))
    }
    measure()
    element.addEventListener('scroll', measure, { passive: true })
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    resize?.observe(element)
    return () => {
      element.removeEventListener('scroll', measure)
      resize?.disconnect()
    }
  }, [])
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span id="presets-label" className="shrink-0 text-xs font-semibold text-(--y-muted)">Hazır analizlər</span>
      <div
        ref={strip}
        role="group"
        aria-labelledby="presets-label"
        data-more-before={more.before || undefined}
        data-more-after={more.after || undefined}
        className="preset-strip flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5"
      >
        {children}
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
  // Outside-monthly orders come in all month long, so the running month's figure can still grow. The monthly package is
  // the month's plan, made and approved once: it is not a part of a month (owner, 2026-11-20).
  const running = kind !== 'monthly' && pivot.latest !== null && pivot.latest === runningMonth()
  // A month the change stands on whose package moved after its approval: said beside the change, the figures as they are.
  const drifts = kind === 'monthly' && pivot.latest !== null
    ? [...new Set([...pivot.comparisonMonths, pivot.latest])].sort((a, b) => a - b).flatMap((month) => {
      const drift = approvalDrift(month)
      return drift ? [{ month, ...drift }] : []
    })
    : []
  const narrowed = Object.values(analysis.facets).some((ids) => ids.length > 0)
  // One month in the range: its total is the latest month's, so the figure is said once, and nothing is compared.
  const single = monthsWithData.filter((month) => month >= analysis.from && month <= analysis.to).length === 1
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 px-3 py-3 sm:grid-cols-3 sm:px-5 sm:py-4">
      <div className="min-w-0">
        <dt className="text-xs text-(--y-muted)">Cəmi · {period}</dt>
        <dd data-figure="total" className="tnum text-[22px] font-extrabold leading-tight tracking-[-0.01em]">{money(pivot.total)}</dd>
        {single && (
          <dd className="mt-1.5 inline-flex items-start gap-1.5 rounded-md border border-(--y-line) bg-(--y-band) px-2 py-1 text-xs font-semibold text-(--y-ink-2)">
            <Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
            Müqayisə üçün dövrə ən azı iki ay daxil edin.
          </dd>
        )}
      </div>
      {!single && <div className="min-w-0">
        <dt className="flex flex-wrap items-center gap-x-1.5 text-xs text-(--y-muted)">
          {pivot.latest ? `${monthName(pivot.latest)} · son ay` : 'Son ay'}
          {running && (
            <span className="inline-flex items-center gap-1 rounded-full border border-(--y-line) bg-(--y-band) px-1.5 py-px text-[11px] font-semibold text-(--y-ink-2)">
              <Clock3 aria-hidden="true" className="size-3" />davam edir
            </span>
          )}
        </dt>
        <dd className="flex flex-wrap items-center gap-x-2">
          <span data-figure="latest" className="tnum text-[22px] font-extrabold leading-tight tracking-[-0.01em]">{pivot.latestAmount ? money(pivot.latestAmount) : '—'}</span>
          {change.kind === 'value' ? <Chip change={change} /> : null}
        </dd>
        <dd className="text-xs text-(--y-muted)">
          {change.kind === 'value' ? `${signedMoney(change.delta)} · müqayisə: ${pivot.comparisonLabel ?? basisReference[basis]}` : change.detail}
        </dd>
        {running && pivot.latest && (
          <dd className="text-xs text-(--y-muted)">{monthName(pivot.latest)} davam edir: rəqəmlər {updatedText} yükləməsinədir{change.kind === 'value' ? ', fərq qəti deyil' : ''}.</dd>
        )}
        {drifts.map((drift) => (
          <dd key={drift.month} data-drift={drift.month} className="tnum mt-0.5 flex items-start gap-1.5 text-xs font-semibold text-(--y-amber)">
            <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
            <span>
              {monthName(drift.month)}: təsdiqdə {money(drift.approved)}, sonra {money(drift.now)}
              <span className="font-normal text-(--y-muted)">{narrowed ? ' · ayın bütün aylıq paketi' : ' · paket təsdiqdən sonra dəyişib'}</span>
            </span>
          </dd>
        ))}
      </div>}
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
  return (
    <div className="px-6 py-10 text-center">
      <h3 id="empty-title" className="text-base font-bold">Seçilmiş filtrlərdə sifariş yoxdur</h3>
      <p className="mx-auto mt-1 max-w-xl text-sm text-(--y-muted)">
        {`${period} · ${kindNames[reading.kind]}: bu birləşmədə sifariş qeydə alınmayıb. Məbləğ sıfır kimi göstərilmir — filtrlərdən birini dəyişin və ya hamısını sıfırlayın.`}
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
/** The table's figure, in whole manats like every amount; the heading says «₼». */
const exactNumber = (value: number) => moneyParts(Math.round(value)).whole

function MoreRows({ count, all, onToggle }: { count: number; all: boolean; onToggle: () => void }) {
  if (count <= ROW_LIMIT) return null
  return (
    <button type="button" onClick={onToggle} className="mt-1 w-full rounded-lg py-2 text-sm font-semibold text-(--y-bar) hover:bg-(--y-band)">
      {all ? 'Daha az göstər' : `Hamısını göstər (${count})`}
    </button>
  )
}

/**
 * The month's approval beside its name, where the monthly orders are in view: the month's, never the filter's. ✓ the
 * package is approved, ⌛ it waits, «!» it was approved and its figures moved after. What the mark means opens in the
 * page's own tip — under the pointer, on keyboard focus, and on a tap — not in a title only a mouse can read. Inside
 * another button (a chart's column, whose own tip says the same) it is a plain mark.
 */
function ApprovalMark({ month, interactive = true }: { month: number; interactive?: boolean }) {
  const approval = approvalOf(month)
  const { open, handlers } = useTipTrigger()
  const [pinned, setPinned] = useState(false)
  const mark = useRef<HTMLButtonElement>(null)
  const anchor = useCallback(() => mark.current, [])
  const tipId = `approval-tip-${useId()}`
  if (!approval) return null
  const drift = approval.state === 'approved' ? approvalDrift(month) : null
  const words = `Ay üzrə: ${packageWords(approval).toLocaleLowerCase('az')}`
  const look = approval.state !== 'approved'
    ? { Icon: Hourglass, tone: 'text-(--y-amber)', stroke: 2.25, title: 'Təsdiq gözləyir' }
    : drift
      ? { Icon: CircleAlert, tone: 'text-(--y-amber)', stroke: 2.25, title: 'Təsdiqlənib' }
      : { Icon: Check, tone: 'text-(--y-ok)', stroke: 2.75, title: 'Təsdiqlənib' }
  const icon = <look.Icon aria-hidden="true" className="size-3.5" strokeWidth={look.stroke} />
  if (!interactive) return <span className={`inline-flex ${look.tone}`}>{icon}<span className="sr-only">{words}</span></span>
  return (
    <>
      <button
        ref={mark}
        type="button"
        aria-label={`${monthName(month)}: aylıq paketin təsdiqi`}
        aria-describedby={tipId}
        aria-expanded={open || pinned}
        {...handlers}
        onBlur={() => { handlers.onBlur(); setPinned(false) }}
        onKeyDown={(event) => { handlers.onKeyDown(event); if (event.key === 'Escape') setPinned(false) }}
        onClick={() => setPinned((value) => !value)}
        className={`-my-1 inline-grid size-6 shrink-0 place-items-center rounded-md hover:bg-(--y-band) focus-visible:outline-2 focus-visible:outline-(--y-bar) ${look.tone}`}
      >
        {icon}
      </button>
      <Tip id={tipId} anchor={anchor} open={open || pinned} width="w-64">
        <p className="text-xs opacity-75">{monthYear(month, YEAR)} · aylıq paket</p>
        <p className="font-bold leading-snug">{look.title}{approval.approvedOn ? `, ${approval.approvedOn.day} ${monthName(approval.approvedOn.month).toLocaleLowerCase('az')}` : ''}{drift ? ' · sonra dəyişib' : ''}</p>
        {drift && <p className="tnum mt-0.5 text-xs">Təsdiqdə {money(drift.approved)}, indi {money(drift.now)}.</p>}
        <p className="mt-1.5 border-t border-current/20 pt-1.5 text-xs opacity-80">
          {approval.state === 'approved'
            ? 'Ayın bütün aylıq sifarişləri bir paket kimi bir dəfə təsdiqlənir; filtrdə seçilən obyekt və ya kateqoriya ayrıca təsdiqlənmir.'
            : 'Rəhbər ayın aylıq sifarişlərini bir dəfə, paket kimi təsdiqləyir; gözləmək gecikmə demək deyil.'}
        </p>
      </Tip>
    </>
  )
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
 * whole. As a chart, each cell is shaded by its amount, the column totals stand over the columns as a chart of their
 * own (`StripRow`) and the row totals lie beside the rows; as a table, the exact figures and each row's change. Many
 * columns read as the largest and a «Digər» that adds the rest, until asked for all; a name opens its row one level down.
 *
 * The table scrolls in its own box both ways, so its head row stays in sight going down and its first column going
 * across; the totals chart is a row of the same table, so every bar stands over its own column whatever the widths.
 * Pointing at a bar lights its column, pointing at a column's head lights its bar.
 */
function PivotMatrix({ pivot, reading, exact }: { pivot: Pivot; reading: AnalysisReading; exact: boolean }) {
  const { analysis, kind } = reading
  const [allRows, setAllRows] = useState(false)
  const [allCols, setAllCols] = useState(false)
  const [hot, setHot] = useState<string | null>(null)
  const [big, setBig] = useState(readStripSize)
  const folded = allCols ? { cols: pivot.cols, folded: 0 } : foldColumns(pivot, analysis.cols)
  const cols = folded.cols
  const rows = allRows ? pivot.rows : pivot.rows.slice(0, ROW_LIMIT)
  const cellMax = Math.max(...pivot.rows.flatMap((row) => cols.filter((col) => !col.folded).map((col) => cellOf(row, col))), 1)
  const rowMax = Math.max(...pivot.rows.map((row) => row.total), 1)
  const format = exact ? exactNumber : whole
  const monthly = kind === 'monthly'
  const shade = (value: number) => `color-mix(in oklab, var(--y-bar) ${Math.round(6 + 40 * Math.sqrt(value / cellMax))}%, transparent)`
  const surface = 'bg-(--y-surface)'
  // Down the left: the row names, the chart's axis and the corner stay while the columns scroll under them; the shadow
  // fills the box's own padding to their left, so nothing scrolling under them shows beside them.
  const stickyLeft = `sticky left-0 z-[1] ${surface} shadow-[-4px_0_0_var(--y-surface)]`
  // Across the top: the head row stays while the rows scroll under it (inside the table's own box).
  const headTop = `sticky top-0 z-[2] ${surface}`
  const corner = `sticky left-0 top-0 z-[4] ${surface} shadow-[-4px_0_0_var(--y-surface)]`
  // On a desktop the totals — and, in the table, the change — stay at the right edge while the columns scroll under them.
  const edge = `${surface} md:sticky md:z-[1]`
  const headEdge = `sticky top-0 z-[2] ${surface} md:z-[3]`
  const totalAt = `${exact ? 'md:right-[9.5rem]' : 'md:right-0'} md:shadow-[-12px_0_12px_-12px_rgba(15,23,42,0.28)]`
  const changeAt = 'md:right-0 md:w-[9.5rem] md:min-w-[9.5rem]'
  const lit = (key: string) => (hot === key ? ' is-hot-col' : '')
  const months = analysis.cols === 'ay'
  const marks = { comparison: months ? pivot.comparisonMonths : [], running: months && !monthly ? runningMonth() : null }

  function toggleSize() {
    const next = !big
    setBig(next)
    try {
      window.localStorage.setItem(STRIP_KEY, next ? 'böyük' : 'adi')
    } catch {
      // Not remembered this time; the choice still holds while the page is open.
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        role="region"
        aria-labelledby="matrix-caption"
        tabIndex={0}
        className="relative -mx-1 max-h-[calc(100dvh-5.5rem)] overflow-auto overscroll-x-contain px-1 pb-1 focus-visible:outline-2 focus-visible:outline-(--y-bar) xl:max-h-[calc(100dvh-2rem)]"
      >
        <table
          data-matrix={exact ? 'exact' : 'heat'}
          className="w-full border-separate border-spacing-0 text-[13px]"
          style={{ '--strip-h': big ? '300px' : 'clamp(160px, 20vh, 220px)' } as CSSProperties}
        >
          <caption id="matrix-caption" className="sr-only">
            {dimLabels[analysis.rows]} × {dimLabels[analysis.cols!]} · {kindNames[kind]} · məbləğ, manatla
          </caption>
          <thead>
            {!exact && (
              <StripRow
                pivot={pivot}
                cols={cols}
                reading={reading}
                hot={hot}
                onHot={setHot}
                marks={marks}
                axisClass={stickyLeft}
                endClass={`${edge} ${totalAt}`}
                big={big}
                onToggleSize={toggleSize}
                onShowAll={() => setAllCols(true)}
              />
            )}
            <tr>
              <SortHead reading={reading} sort="ad" className={`${corner} whitespace-nowrap border-b border-(--y-line) px-3 py-2 text-left align-bottom text-[11px] font-semibold text-(--y-muted)`}>
                {dimSingular[analysis.rows]} <span aria-hidden="true">\</span> {dimSingular[analysis.cols!]} · ₼
              </SortHead>
              {cols.map((col) => {
                const running = marks.running !== null && Number(col.key) === marks.running
                return (
                  <th
                    key={col.key}
                    scope="col"
                    data-col={col.key}
                    title={col.folded ? `${col.folded.length} ${countWords[analysis.cols!]} birlikdə` : col.parent ? `${col.name} (${col.parent})` : col.name}
                    onPointerEnter={() => setHot(col.key)}
                    onPointerLeave={() => setHot(null)}
                    className={`${headTop} min-w-[4.75rem] max-w-[7rem] border-b border-(--y-line) px-2 py-2 text-right align-bottom text-[11px] font-semibold leading-tight text-(--y-ink-2)${lit(col.key)}`}
                  >
                    <span className="flex items-end justify-end gap-1">
                      <span className="line-clamp-2 break-words">{col.short}</span>
                      {months && monthly && <ApprovalMark month={Number(col.key)} />}
                    </span>
                    {running && <span className="mt-0.5 block text-[10px] font-semibold text-(--y-muted)">davam edir</span>}
                  </th>
                )
              })}
              <SortHead reading={reading} sort="mebleg" className={`${headEdge} ${totalAt} border-b border-(--y-line) px-3 py-2 text-right align-bottom text-[11px] font-semibold text-(--y-ink-2)`}>Cəmi</SortHead>
              {exact && (
                <SortHead reading={reading} sort="ferq" className={`${headEdge} ${changeAt} border-b border-(--y-line) px-3 py-2 text-right align-bottom text-[11px] font-semibold text-(--y-ink-2)`}>
                  {analysis.rows === 'ay' ? 'Fərq' : pivot.latest ? `${monthName(pivot.latest)}, fərq` : 'Fərq'}
                </SortHead>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} data-row={row.key} className="group">
                <th scope="row" className={`${stickyLeft} max-w-[15rem] border-b border-(--y-line) px-3 py-1.5 text-left font-semibold group-hover:bg-(--y-band)`}>
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
                      className={`tnum whitespace-nowrap border-b border-(--y-line) px-2 py-1.5 text-right${lit(col.key)}`}
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
              <th scope="row" className={`${stickyLeft} border-t-2 border-(--y-line) px-3 py-2 text-left font-extrabold`}>
                Cəmi{rows.length < pivot.rows.length ? <span className="ml-1 text-[11px] font-semibold text-(--y-muted)">(bütün {pivot.rows.length})</span> : null}
              </th>
              {cols.map((col) => (
                <td key={col.key} data-col={col.key} data-amount={col.total} className={`tnum whitespace-nowrap border-t-2 border-(--y-line) px-2 py-2 text-right font-bold${lit(col.key)}`}>{format(col.total)}</td>
              ))}
              <td data-col="total" data-amount={pivot.total} className={`${edge} ${totalAt} tnum whitespace-nowrap border-t-2 border-(--y-line) px-3 py-2 text-right font-extrabold`}>{format(pivot.total)}</td>
              {exact && <td className={`${edge} ${changeAt} whitespace-nowrap border-t-2 border-(--y-line) px-3 py-2 text-right`}><ChangeCell change={pivot.change} /></td>}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!exact && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-(--y-muted)">
            <p aria-hidden="true" className="flex items-center gap-2">
              az
              <span className="h-2 w-24 rounded-full" style={{ background: 'linear-gradient(90deg, color-mix(in oklab, var(--y-bar) 6%, transparent), color-mix(in oklab, var(--y-bar) 46%, transparent))' }} />
              çox · xananın məbləği, ₼
            </p>
            {marks.comparison.some((month) => cols.some((col) => Number(col.key) === month)) && (
              <p className="flex items-center gap-1.5">
                <span aria-hidden="true" className="strip-key is-comparison" />
                Müqayisə: {pivot.comparisonLabel}
              </p>
            )}
            {marks.running !== null && cols.some((col) => Number(col.key) === marks.running) && (
              <p className="flex items-center gap-1.5">
                <span aria-hidden="true" className="strip-key is-running" />
                {monthName(marks.running)} davam edir — rəqəmlər {updatedText} yükləməsinədir
              </p>
            )}
          </div>
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

/* ---- The column totals over the matrix ---------------------------------------------------------------------------- */

const STRIP_KEY = 'baxorders-analiz-qrafik'

/** The chart's size, as this browser last left it: the usual height or the large one. */
function readStripSize(): boolean {
  try {
    return window.localStorage.getItem(STRIP_KEY) === 'böyük'
  } catch {
    return false
  }
}

/** The month still running in the year on screen, if any: its figures can still grow. */
function runningMonth(): number | null {
  return YEAR === TODAY.year ? TODAY.month : null
}

/**
 * The axis of the totals chart: three or four round steps up to the largest column, which stands at 85 % of the
 * chart's height, the rest kept for its figure.
 */
function stripTicks(max: number): number[] {
  if (max <= 0) return [0]
  const power = 10 ** Math.floor(Math.log10(max))
  const step = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => Math.floor(max / candidate) <= 3) ?? max
  return Array.from({ length: Math.floor(max / step) + 1 }, (_, index) => index * step)
}

/** A column's total, short: «94 min», «624»; the exact figure is in the tip and in the table. */
const shortAmount = (value: number) => (value >= 1000 ? `${Math.round(value / 1000).toLocaleString('az')} min` : whole(value))
/** «213.456 manat», for a screen reader. */
const spokenAmount = (value: number) => `${moneyParts(Math.round(value)).whole} manat`

/**
 * The column totals as a chart, a row of the matrix itself: a bar over each column, the axis in the first column, the
 * size switch over the totals. One stop for Tab, the arrows go from bar to bar; a bar's figures open on focus and under
 * the pointer, and a click takes its column as a filter (as a name does), or opens every column from «Digər».
 */
function StripRow({ pivot, cols, reading, hot, onHot, marks, axisClass, endClass, big, onToggleSize, onShowAll }: {
  pivot: Pivot
  cols: PivotColumn[]
  reading: AnalysisReading
  hot: string | null
  onHot: (key: string | null) => void
  marks: { comparison: number[]; running: number | null }
  axisClass: string
  endClass: string
  big: boolean
  onToggleSize: () => void
  onShowAll: () => void
}) {
  const { analysis } = reading
  const largest = Math.max(...cols.map((col) => col.total), 0)
  const ticks = stripTicks(largest)
  const ratio = (value: number) => (largest > 0 ? value / largest : 0)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const [cursor, setCursor] = useState(0)
  const at = Math.min(cursor, cols.length - 1)

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: cols.length - 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    const next = Math.max(0, Math.min(cols.length - 1, moves[event.key]))
    setCursor(next)
    buttons.current[next]?.focus()
  }

  return (
    <tr data-chart="col-totals">
      <td className={`${axisClass} p-0 align-bottom`}>
        <div className="strip-cell">
          <span className="sr-only">Sütunların cəmi, qrafik: {cols.length} sütun. Oxlarla bir sütundan digərinə keçin.</span>
          {ticks.map((tick) => (
            <span key={tick} aria-hidden="true" className={`strip-tick-label tnum${tick === 0 ? ' is-zero' : ''}`} style={{ '--t': ratio(tick) } as CSSProperties}>
              {axisLabel(tick)}
            </span>
          ))}
        </div>
      </td>
      {cols.map((col, index) => (
        <td key={col.key} data-col={col.key} className={`p-0 align-bottom${hot === col.key ? ' is-hot-col' : ''}`}>
          <StripBar
            col={col}
            index={index}
            ratio={ratio(col.total)}
            ticks={ticks.map(ratio)}
            pivot={pivot}
            reading={reading}
            dim={hot !== null && hot !== col.key}
            comparison={analysis.cols === 'ay' && marks.comparison.includes(Number(col.key))}
            running={marks.running !== null && Number(col.key) === marks.running}
            tabIndex={index === at ? 0 : -1}
            buttonRef={(element) => { buttons.current[index] = element }}
            onKey={move}
            onFocusBar={() => setCursor(index)}
            onHot={onHot}
            onActivate={() => (col.folded ? onShowAll() : reading.drill(analysis.cols!, col.key))}
          />
        </td>
      ))}
      <td className={`${endClass} p-0 align-top`}>
        <div className="flex justify-end p-1.5">
          <button
            type="button"
            onClick={onToggleSize}
            title={big ? 'Qrafiki kiçilt' : 'Qrafiki böyüt'}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-(--y-line) px-2 text-xs font-semibold text-(--y-ink-2) hover:bg-(--y-band) hover:text-(--y-ink)"
          >
            {big ? <Minimize2 aria-hidden="true" className="size-3.5" /> : <Maximize2 aria-hidden="true" className="size-3.5" />}
            {big ? 'Kiçilt' : 'Böyüt'}
          </button>
        </div>
      </td>
    </tr>
  )
}

function StripBar({ col, index, ratio, ticks, pivot, reading, dim, comparison, running, tabIndex, buttonRef, onKey, onFocusBar, onHot, onActivate }: {
  col: PivotColumn
  index: number
  ratio: number
  /** The axis' steps, as shares of the largest column. */
  ticks: number[]
  pivot: Pivot
  reading: AnalysisReading
  /** Another column is pointed at. */
  dim: boolean
  comparison: boolean
  running: boolean
  tabIndex: number
  buttonRef: (element: HTMLButtonElement | null) => void
  onKey: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void
  onFocusBar: () => void
  onHot: (key: string | null) => void
  onActivate: () => void
}) {
  const { open, handlers } = useTipTrigger()
  const bar = useRef<HTMLSpanElement>(null)
  const anchor = useCallback(() => bar.current, [])
  const tipId = `strip-tip-${index}`
  const month = reading.analysis.cols === 'ay' ? Number(col.key) : null
  const name = month ? monthName(month) : col.folded ? `Digər: ${col.folded.length} ${countWords[reading.analysis.cols!]}` : col.name
  const tone = col.folded ? ' is-folded' : running ? ' is-running' : comparison ? ' is-comparison' : ''
  return (
    <div className="strip-cell" style={{ '--r': ratio } as CSSProperties}>
      {ticks.map((tick) => <span key={tick} aria-hidden="true" className={`strip-grid${tick === 0 ? ' is-zero' : ''}`} style={{ '--t': tick } as CSSProperties} />)}
      <button
        ref={buttonRef}
        type="button"
        data-bar={col.key}
        tabIndex={tabIndex}
        aria-label={`${name}: ${spokenAmount(col.total)}${col.folded ? '. Hamısını ayrıca göstər' : '. Filtr kimi tətbiq et'}`}
        aria-describedby={tipId}
        onPointerEnter={(event) => { handlers.onPointerEnter(event); onHot(col.key) }}
        onPointerLeave={() => { handlers.onPointerLeave(); onHot(null) }}
        onFocus={(event) => { handlers.onFocus(event); onFocusBar(); onHot(col.key) }}
        onBlur={() => { handlers.onBlur(); onHot(null) }}
        onKeyDown={(event) => { handlers.onKeyDown(event); onKey(event, index) }}
        onClick={onActivate}
        className="strip-hit"
      >
        <span ref={bar} className={`strip-bar${tone}${dim ? ' is-dim' : ''}`} />
        <span aria-hidden="true" className="strip-label tnum">{shortAmount(col.total)}</span>
      </button>
      <StripTip id={tipId} col={col} name={name} month={month} pivot={pivot} reading={reading} comparison={comparison} running={running} anchor={anchor} open={open} />
    </div>
  )
}

/** A column total's figures: the amount, its share of the whole, and — for a month — the month before and its approval. */
function StripTip({ id, col, name, month, pivot, reading, comparison, running, anchor, open }: {
  id: string
  col: PivotColumn
  name: string
  month: number | null
  pivot: Pivot
  reading: AnalysisReading
  comparison: boolean
  running: boolean
  anchor: () => Element | null
  open: boolean
}) {
  const { analysis, kind } = reading
  const before = month && month > 1 && month - 1 >= analysis.from ? month - 1 : null
  const previous = before ? pivot.cols.find((item) => Number(item.key) === before) : undefined
  let change: ReactNode = null
  if (before && previous) {
    const delta = col.total - previous.total
    change = <>{monthDative(before)} görə: <span className="tnum font-semibold">{percent(delta / previous.total)} ({signedMoney(delta)})</span></>
  } else if (before) {
    change = monthsWithData.includes(before) ? `${monthName(before)} ayında bu filtrdə sifariş yoxdur — faiz hesablanmır` : `${monthName(before)} üçün məlumat yoxdur`
  }
  return (
    <Tip id={id} anchor={anchor} open={open} width="w-64">
      <p className="text-xs opacity-75">{month ? monthYear(month, YEAR) : name}{col.parent ? ` · ${col.parent}` : ''}</p>
      <p className="tnum text-lg font-extrabold leading-snug">{money(col.total)}</p>
      <p className="text-xs opacity-75">Ümumi cəmdə payı: {percent(pivot.total ? col.total / pivot.total : 0, false)} · {kindNames[kind]}</p>
      {(change || running || comparison || col.folded || (month && kind === 'monthly' && approvalOf(month))) && (
        <div className="mt-1.5 flex flex-col gap-0.5 border-t border-current/20 pt-1.5 text-xs">
          {change && <p>{change}</p>}
          {running && <p className="opacity-80">Ay davam edir: rəqəmlər {updatedText} yükləməsinədir və ay bitənə qədər arta bilər{change && previous ? '; fərq qəti deyil' : ''}.</p>}
          {comparison && pivot.latest && <p className="opacity-80">Müqayisə ayı: {monthName(pivot.latest)} bununla müqayisə olunur ({pivot.comparisonLabel}).</p>}
          {col.folded && <p className="opacity-80">{col.folded.length} {countWords[analysis.cols!]} birlikdə. Klikləyin — hamısı ayrıca göstərilsin.</p>}
          {month && kind === 'monthly' && approvalOf(month) && <p className="opacity-75">Ay üzrə: {packageWords(approvalOf(month)).toLocaleLowerCase('az')}</p>}
        </div>
      )}
    </Tip>
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
          {months && kind === 'monthly' && <ApprovalMark month={Number(row.key)} interactive={false} />}
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
              aria-label={`${row.name}${row.parent ? ` (${row.parent})` : ''}: ${money(row.total)}${analysis.rows === 'ay' && kind === 'monthly' && approvalOf(Number(row.key)) ? `. Ay üzrə: ${packageWords(approvalOf(Number(row.key))).toLocaleLowerCase('az')}` : ''}. Filtr kimi tətbiq et`}
              className="stretched min-w-0 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--y-bar) md:order-1"
            >
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold group-hover:text-(--y-bar)" title={row.name}>{row.name}</span>
                {analysis.rows === 'ay' && kind === 'monthly' && <ApprovalMark month={Number(row.key)} interactive={false} />}
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
  // The head row stays in sight while the rows scroll under it (inside the table's own box).
  const head = 'sticky top-0 z-[2] border-b border-(--y-line) bg-(--y-surface) px-3 py-2 text-right align-bottom text-[11px] font-semibold leading-tight text-(--y-ink-2)'
  const cell = 'tnum whitespace-nowrap border-b border-(--y-line) px-3 py-2 text-right'
  const foot = 'tnum whitespace-nowrap border-t-2 border-(--y-line) px-3 py-2 text-right font-bold'
  // On a desktop the change stays at the right edge, should the table be wider than the screen.
  const edge = 'bg-(--y-surface) md:sticky md:right-0 md:z-[1] md:shadow-[-12px_0_12px_-12px_rgba(15,23,42,0.28)]'
  const headEdge = 'md:right-0 md:z-[3] md:shadow-[-12px_0_12px_-12px_rgba(15,23,42,0.28)]'
  const reason = 'Müqayisə üçün eyni vahiddə məlumat yoxdur və ya müqayisə dövrü natamamdır.'
  const total = pivot.productTotal
  const share = (value: number) => percent(pivot.total ? value / pivot.total : 0, false)
  const sub = 'block text-[11px] font-normal text-(--y-muted)'
  return (
    <div className="flex flex-col gap-1">
      <div role="region" aria-labelledby="list-caption" tabIndex={0} className="relative -mx-1 max-h-[calc(100dvh-5.5rem)] overflow-auto overscroll-x-contain px-1 pb-1 focus-visible:outline-2 focus-visible:outline-(--y-bar) xl:max-h-[calc(100dvh-2rem)]">
        <table data-table="list" className="w-full border-separate border-spacing-0 text-[13px]">
          <caption id="list-caption" className="sr-only">{dimLabels[analysis.rows]} · {kindNames[kind]}</caption>
          <thead>
            <tr>
              <SortHead reading={reading} sort="ad" className="sticky left-0 top-0 z-[4] border-b border-(--y-line) bg-(--y-surface) px-3 py-2 text-left align-bottom text-[11px] font-semibold text-(--y-ink-2)">
                {dimSingular[analysis.rows]}
              </SortHead>
              {product && <th scope="col" className={head}>Miqdar · orta qiymət</th>}
              <SortHead reading={reading} sort="mebleg" className={head}>Məbləğ · pay</SortHead>
              {!months && <th scope="col" className={head}>{pivot.latest ? monthName(pivot.latest) : 'Son ay'}</th>}
              <th scope="col" className={head}>Müqayisə</th>
              {product && <th scope="col" className={head}>Miqdar dəyişməsi</th>}
              {product && <th scope="col" className={head}>Qiymət dəyişməsi</th>}
              <SortHead reading={reading} sort="ferq" className={`${head} ${headEdge}`}>Fərq</SortHead>
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
  return (
    <ul className="-mt-1 flex flex-col gap-1 text-xs text-(--y-muted)">
      {kind === 'monthly' && <li>Təsdiq ay üzrə vahiddir: ayın bütün aylıq sifarişləri bir dəfə təsdiqlənir. Seçilmiş obyekt, kateqoriya və ya məhsul ayrıca təsdiqlənmir; ✓ (təsdiqlənib), ⌛ (təsdiq gözləyir) və «!» (təsdiqdən sonra dəyişib) ayın öz təsdiqidir — işarəyə klikləyin və ya üzərinə gəlin, izahı açılır.</li>}
      {kind === 'outside' && <li>Aylıqdan kənar sifarişlərin hər biri ayrıca razılıqla verilir; burada yalnız məbləğlər göstərilir.</li>}
      {kind === 'all' && <li>«Hamısı» — ümumi xərcdir, təsdiq ediləcək məbləğ deyil.</li>}
      {pivot.rows.length > 0 && (
        <li>
          {analysis.rows === 'ay'
            ? `Hər ay ${basisReference[basis]} müqayisə olunur, yalnız seçilmiş dövrün ayları ilə.`
            : pivot.comparisonLabel
              ? `Fərq: ${pivot.latest ? monthName(pivot.latest) : 'son ay'}, müqayisə: ${pivot.comparisonLabel}.`
              : 'Fərq: seçilmiş dövrdə müqayisə üçün əvvəlki ay yoxdur.'}{' '}
          Ada klikləyin: filtr kimi tətbiq olunur və bir səviyyə aşağı açılır.
        </li>
      )}
      {products && <li>Miqdar və orta qiymət yalnız bir məhsul üçün, öz vahidində göstərilir; fərqli məhsulların və vahidlərin miqdarı toplanmır. Orta qiymət çəkili ortadır: məbləğ ÷ miqdar.</li>}
    </ul>
  )
}
