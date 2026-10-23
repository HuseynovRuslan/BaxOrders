import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ArrowUpRight, Check, ChevronDown, Hourglass, SlidersHorizontal, Table2, X } from 'lucide-react'
import { hasData, type Kind, type MonthTile } from '../data/analysis'
import { YEAR } from '../data/model'
import { money, monthName, monthNames, monthRange, percent, shortMonthNames, signedMoney } from '../lib/format'
import { paths } from '../lib/links'
import {
  arrowOf, basisReference, changeOf, filterOptions, groupings, groupRows, isCurrent, kindNames, rounded, scopeSplit, signedRounded,
  statusOf, updatedText, useYearReading, type Change, type GroupRow, type Option, type YearReading, type YearScope,
} from '../lib/year'
import { Tip, useTipTrigger } from '../ui/tip'
import { NotFound } from './NotFound'
import { Chip, KpiStrip, NoChange, useKpiPanel } from './YearKpi'
import { BasisSelect, KindNav } from './YearControls'
import { analysisSearch } from '../lib/pivot'
import './year.css'

/**
 * Screen 1 — the year, in the «Modern Analytics» style chosen from the three concepts (owner, 2026-10-19): the year's
 * figures in one strip — each a way into its detail (see `YearKpi`) — then the twelve months as an analyst's chart — a value axis, each month's bar and, under it,
 * its figure and its change on the comparison (per cent and manats), and one approval track along the year. The bars are
 * the amounts only: the comparison is read in the labels and the tip, never drawn over a bar. Below 1024 px the same
 * months lie down as rows.
 *
 * The Rəhbər can narrow and regroup it here, without leaving the screen (owner, 2026-10-19): a range of months, an
 * object, a category at any of its three levels (Ana → Orta → Alt), and the chart by month, by object or by a level of
 * the catalogue. Everything on the screen reads the one filtered scope; approval stays the month's.
 *
 * The figures are about one kind of order at a time (owner, 2026-10-18): the monthly orders by default, whose approval
 * is the month's; the outside-monthly requests on their own, each with its separate consent; or «Hamısı», the
 * company's spending, never an amount to approve. Every month is compared whole, with the month before or — by the
 * «Müqayisə üçün» choice — with the monthly average of the months before it that have orders.
 */
export function YearPage() {
  const year = Number(useParams().year)
  const reading = useYearReading()
  const kpi = useKpiPanel(reading.kind)
  // The bars rise once when the screen opens; after that they move only when the figures do.
  const [risen, setRisen] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRisen(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  if (year !== YEAR) {
    return <NotFound message={`Demo yalnız ${YEAR} ilini göstərir.`} />
  }

  const { kind, basis, setBasis, tiles, largest, filters } = reading
  const scale = niceScale(largest)
  const grouped = filters.group !== 'aylar'
  const rows = grouped ? groupRows(filters, kind, basis, reading.latest?.month ?? null) : []
  // As many columns as the range has months: one month gets the width of twelve, never a stretched bar.
  const columns = { gridTemplateColumns: `3.25rem repeat(${tiles.length}, minmax(0, 1fr))` }
  const groupLabel = groupings.find((item) => item.value === filters.group)!.label
  // The heading says what the screen is about: the year, or the one month or the months the period narrows it to.
  const heading = filters.from === 1 && filters.to === 12
    ? `İllik icmal ${YEAR}`
    : `${filters.from === filters.to ? monthName(filters.from) : `${monthName(filters.from)}–${monthName(filters.to)}`} ${YEAR} üzrə analiz`

  return (
    // Tighter than the page's own rhythm, so the year — figures, months, approvals — fits a desktop's first screen.
    <div className="year-view flex flex-col gap-3 lg:-mt-2">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h1 id="page-title" tabIndex={-1} className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] outline-none">
            {heading}
          </h1>
          <p className="text-sm text-(--y-muted)">Yenilənib {updatedText}</p>
        </div>
        {/* On a desktop the two controls keep one line: a longer heading wraps on its side instead. */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center lg:shrink-0 lg:flex-nowrap">
          <KindNav kind={kind} hrefOf={reading.kindHref} />
          <BasisSelect basis={basis} onChange={setBasis} />
        </div>
      </div>

      <FilterBar reading={reading} />

      <KpiStrip reading={reading} kpi={kpi} />

      {!reading.hasOrders ? (
        <section aria-labelledby="empty-title" className="rounded-xl border border-dashed border-(--y-line) bg-(--y-surface) px-6 py-10 text-center">
          <h2 id="empty-title" className="text-base font-bold">{reading.notStarted ? 'Seçilmiş dövr hələ başlamayıb' : 'Seçilmiş filtrlərdə sifariş yoxdur'}</h2>
          <p className="mx-auto mt-1 max-w-xl text-sm text-(--y-muted)">
            {reading.notStarted
              ? `${reading.period} üzrə hələ heç bir sifariş yoxdur.`
              : `${reading.period} · ${kindNames[kind]}: bu obyekt, kateqoriya və dövr birləşməsində sifariş qeydə alınmayıb. Məbləğ sıfır kimi göstərilmir — filtrlərdən birini dəyişin və ya hamısını sıfırlayın.`}
          </p>
          <button type="button" onClick={reading.resetFilters} className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-(--y-line) px-4 text-sm font-semibold hover:bg-(--y-band)">
            Hamısını sıfırla
          </button>
        </section>
      ) : grouped ? (
        <section aria-labelledby="group-title" className="rounded-xl border border-(--y-line) bg-(--y-surface) px-3 pb-3 pt-3 sm:px-5 sm:pt-4">
          <h2 id="group-title" className="sr-only">{groupLabel} üzrə · {kindNames[kind]}</h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <GroupingSwitch reading={reading} />
            <p className="text-xs text-(--y-ink-2)">{reading.period} · {kindNames[kind]}</p>
          </div>
          <GroupChart key={`${filters.group}-${reading.scope.siteId}-${reading.scope.categoryId}`} rows={rows} reading={reading} />
        </section>
      ) : (
        <>
          {/* From 1024 px: the chart. */}
          <section aria-labelledby="chart-title" className="hidden rounded-xl border border-(--y-line) bg-(--y-surface) px-5 pb-4 pt-4 lg:block">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="chart-title" className="sr-only">Aylar üzrə · {kindNames[kind]}</h2>
              <GroupingSwitch reading={reading} />
              <ChartKey />
            </div>

            <div className="relative mt-3 grid" style={columns}>
              {/* The value axis and its gridlines, behind the months. */}
              <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 ${plotHeight}`}>
                {scale.ticks.map((value) => (
                  <div
                    key={value}
                    className={`absolute inset-x-0 border-t ${value === 0 ? 'border-(--y-line)' : 'border-dashed border-(--y-grid)'}`}
                    style={{ bottom: `${(value / scale.top) * 100}%` }}
                  >
                    <span className="tnum absolute -top-2 left-0 w-11 text-right text-[11px] leading-4 text-(--y-muted)">{axisLabel(value)}</span>
                  </div>
                ))}
              </div>
              <div />
              {tiles.map((tile, index) => (
                tile.state === 'data'
                  ? <MonthBar key={tile.month} tile={tile} kind={kind} scope={reading.scope} scoped={reading.scoped} top={scale.top} to={reading.monthHref(tile.month)} risen={risen} order={index} />
                  : <FutureBar key={tile.month} tile={tile} />
              ))}
            </div>

            {kind !== 'all' && (
              <div className="mt-2 grid items-center border-t border-(--y-line) pt-2.5" style={columns}>
                <span className="text-[11px] font-semibold text-(--y-muted)" title={reading.scoped ? 'Ayın təsdiqi — bütün aylıq sifarişlər üçün bir dəfə' : undefined}>{kind === 'monthly' ? 'Təsdiq' : 'Sifariş'}</span>
                {tiles.map((tile) => <TrackCell key={tile.month} tile={tile} kind={kind} />)}
              </div>
            )}
          </section>

          {/* Below 1024 px: the same months as rows. */}
          <section aria-labelledby="rows-title" className="rounded-xl border border-(--y-line) bg-(--y-surface) p-2 lg:hidden">
            <div className="flex flex-col gap-2 px-3 pb-1 pt-2">
              <h2 id="rows-title" className="sr-only">Aylar üzrə · {kindNames[kind]}</h2>
              <GroupingSwitch reading={reading} />
              <ChartKey />
            </div>
            <ol>
              {tiles.map((tile) => (
                <li key={tile.month}>
                  {tile.state === 'data'
                    ? <MonthRow tile={tile} kind={kind} scope={reading.scope} scoped={reading.scoped} top={scale.top} to={reading.monthHref(tile.month)} />
                    : <FutureRow tile={tile} />}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      <p className="-mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-(--y-muted)">
        {kind === 'monthly' && !grouped && reading.hasOrders && (
          <>
            <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-4 rounded-full bg-(--y-ok)" />Sifarişlər təsdiqlənib</span>
            <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="track-pending h-1.5 w-4 rounded-full" />Sifarişlər təsdiq gözləyir</span>
          </>
        )}
        {kind === 'monthly' && reading.scoped && <span>Təsdiq ay üzrə vahiddir: ayın bütün aylıq sifarişləri bir dəfə təsdiqlənir, seçilmiş obyekt və ya kateqoriya ayrıca təsdiqlənmir.</span>}
        {reading.hasOrders && (grouped
          ? <span>Fərq: {reading.latest ? `${monthName(reading.latest.month)}, ${basisReference[basis]}` : '—'}. Sətrə klikləyin: filtr kimi tətbiq olunur və bir səviyyə aşağı açılır.</span>
          : <span>Fərqlər {basisReference[basis]}. Aya klikləyin, həmin ayın təhlili açılır.</span>)}
      </p>
    </div>
  )
}

/**
 * The scope's filters, in a line above the cards. The period in one list — the whole year, one month, or a range (and
 * then its two ends) — always in sight; the object and the three levels of the catalogue behind «Əlavə filtrlər», each
 * list narrowed by the others (a middle level only under a chosen top one, a bottom level only under a middle one).
 * What differs from the default — the period, the object, the categories — stays in sight as a chip with its own ×,
 * open panel or not, and all of it clears at once. The order kind has no chip: its switch above already shows it.
 * The extra filters open as one compact line, so the chart keeps its room.
 */
function FilterBar({ reading }: { reading: YearReading }) {
  const { filters, kind } = reading
  const [params] = useSearchParams()
  const [open, setOpen] = useState(false)
  const whole = filters.from === 1 && filters.to === 12
  const single = filters.from === filters.to
  // «Aralıq seç…» shows the two ends even before they make a range; a range in the address shows them anyway.
  const [ranging, setRanging] = useState(!whole && !single)
  const period = ranging || (!whole && !single) ? 'range' : whole ? 'year' : `m${filters.from}`
  const options = filterOptions(filters, kind)
  const set = reading.setFilters
  const extra = [filters.site, filters.root, filters.mid, filters.leaf].filter(Boolean).length
  const nameIn = (list: Option[], id?: string) => list.find((item) => item.id === id)?.name ?? ''
  const resetAll = () => { setRanging(false); reading.resetFilters() }

  const chips: { label: string; clear: () => void }[] = []
  if (!whole) chips.push({ label: single ? `Ay: ${monthName(filters.from)}` : `Dövr: ${monthName(filters.from)}–${monthName(filters.to)}`, clear: () => { setRanging(false); set({ from: null, to: null }) } })
  if (filters.site) chips.push({ label: `Obyekt: ${nameIn(options.sites, filters.site)}`, clear: () => set({ site: null }) })
  if (filters.root) chips.push({ label: `Ana: ${nameIn(options.roots, filters.root)}`, clear: () => set({ root: null, mid: null, leaf: null }) })
  if (filters.mid) chips.push({ label: `Orta: ${nameIn(options.mids, filters.mid)}`, clear: () => set({ mid: null, leaf: null }) })
  if (filters.leaf) chips.push({ label: `Alt: ${nameIn(options.leaves, filters.leaf)}`, clear: () => set({ leaf: null }) })

  const months = (from: number, to: number) => set({ from: from === 1 ? null : String(from), to: to === 12 ? null : String(to) })
  const choosePeriod = (value: string) => {
    if (value === 'range') { setRanging(true); return }
    setRanging(false)
    if (value === 'year') months(1, 12)
    else months(Number(value.slice(1)), Number(value.slice(1)))
  }
  const setEnd = (which: 'from' | 'to', month: number) => {
    // The range never turns over: moving one end past the other brings the other along.
    months(which === 'from' ? month : Math.min(filters.from, month), which === 'to' ? month : Math.max(filters.to, month))
  }
  const endSelect = (which: 'from' | 'to') => (
    <select
      aria-label={which === 'from' ? 'Başlanğıc ay' : 'Son ay'}
      value={filters[which]}
      onChange={(event) => setEnd(which, Number(event.target.value))}
      className="h-9 rounded-md bg-transparent pl-1 pr-6 font-semibold text-(--y-ink)"
    >
      {monthNames.map((name, index) => <option key={name} value={index + 1} className="bg-(--y-surface)">{name}</option>)}
    </select>
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Dövr" className="flex min-h-10 flex-wrap items-center gap-1 rounded-lg border border-(--y-line) bg-(--y-surface) py-0.5 pl-3 pr-1 text-sm">
          <span className="text-(--y-muted)">Dövr</span>
          <span className="px-1 font-semibold" title="Demo yalnız 2026-nı göstərir">{YEAR}</span>
          <select
            aria-label="Dövr: bütün il, bir ay və ya aralıq"
            value={period}
            onChange={(event) => choosePeriod(event.target.value)}
            className="h-9 rounded-md bg-transparent pl-1 pr-6 font-semibold text-(--y-ink)"
          >
            <option value="year" className="bg-(--y-surface)">Bütün il</option>
            <optgroup label="Bir ay" className="bg-(--y-surface)">
              {monthNames.map((name, index) => (
                <option key={name} value={`m${index + 1}`} disabled={!hasData(index + 1)} className="bg-(--y-surface)">
                  {name}{hasData(index + 1) ? '' : ' — hələ başlamayıb'}
                </option>
              ))}
            </optgroup>
            <optgroup label="Bir neçə ay" className="bg-(--y-surface)">
              <option value="range" className="bg-(--y-surface)">Aralıq seç…</option>
            </optgroup>
          </select>
          {period === 'range' && (
            <>
              {endSelect('from')}
              <span aria-hidden="true" className="text-(--y-muted)">–</span>
              {endSelect('to')}
            </>
          )}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="more-filters"
          onClick={() => setOpen(!open)}
          className="group inline-flex min-h-10 items-center gap-2 rounded-lg border border-(--y-line) bg-(--y-surface) px-3 text-sm font-semibold transition-colors hover:bg-(--y-band) aria-expanded:bg-(--y-band)"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Əlavə filtrlər
          {extra > 0 && <span className="tnum rounded-full bg-(--y-bar) px-1.5 text-xs text-white">{extra}</span>}
          <ChevronDown aria-hidden="true" className="size-4 text-(--y-muted) transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none" />
        </button>
        {chips.length > 0 && (
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
            <button type="button" onClick={resetAll} className="min-h-9 rounded-md px-2 text-sm font-semibold text-(--y-bar) underline-offset-4 hover:underline">
              Hamısını sıfırla
            </button>
          </>
        )}
        {/* The full analysis — several objects and categories at once, rows by columns — on its own screen, so this one stays simple. */}
        <Link
          to={`/${YEAR}/analiz?${analysisSearch(params, filters.group === 'aylar' ? 'obyekt' : filters.group, 'ay')}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-(--y-line) bg-(--y-surface) px-3 text-sm font-semibold text-(--y-bar) transition-colors hover:bg-(--y-band) sm:ml-auto"
        >
          <Table2 aria-hidden="true" className="size-4" />
          Ətraflı analiz
        </Link>
      </div>
      {open && (
        <div id="more-filters" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <FilterSelect label="Obyekt" all="Bütün obyektlər" value={filters.site} options={options.sites} onChange={(value) => set({ site: value })} />
          <FilterSelect label="Ana kateqoriya" all="Bütün ana kateqoriyalar" value={filters.root} options={options.roots} onChange={(value) => set({ root: value, mid: null, leaf: null })} />
          <FilterSelect label="Orta kateqoriya" all={filters.root ? 'Bütün orta kateqoriyalar' : 'Əvvəlcə ana kateqoriya'} value={filters.mid} options={options.mids} disabled={!filters.root} onChange={(value) => set({ mid: value, leaf: null })} />
          <FilterSelect label="Alt kateqoriya" all={filters.mid ? 'Bütün alt kateqoriyalar' : 'Əvvəlcə orta kateqoriya'} value={filters.leaf} options={options.leaves} disabled={!filters.mid} onChange={(value) => set({ leaf: value })} />
        </div>
      )}
    </div>
  )
}

/** One filter: a list with its label inside, «all» first, each choice with its amount in the current scope. */
function FilterSelect({ label, all, value, options, disabled = false, onChange }: {
  label: string
  all: string
  value?: string
  options: Option[]
  disabled?: boolean
  onChange: (value: string | null) => void
}) {
  return (
    <label className={`flex min-h-10 min-w-0 items-center gap-1 rounded-lg border border-(--y-line) bg-(--y-surface) py-0.5 pl-3 pr-1 text-sm ${disabled ? 'opacity-50' : ''}`}>
      <span className="whitespace-nowrap text-(--y-muted)">{label}</span>
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || null)}
        className="h-9 min-w-0 flex-1 rounded-md bg-transparent pl-1 pr-6 font-semibold text-(--y-ink) sm:max-w-56"
      >
        <option value="" className="bg-(--y-surface)">{all}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id} className="bg-(--y-surface)">{option.name} · {option.amount ? rounded(option.amount) : 'bu filtrdə yoxdur'}</option>
        ))}
      </select>
    </label>
  )
}

/** How the chart groups the scope: buttons where there is room, a list on a phone. */
function GroupingSwitch({ reading }: { reading: YearReading }) {
  const current = reading.filters.group
  const choose = (value: string) => reading.setFilters({ group: value === 'aylar' ? null : value })
  return (
    <>
      <div role="group" aria-label="Qruplaşdırma" className="hidden flex-wrap rounded-lg border border-(--y-line) p-0.5 text-xs font-semibold md:flex">
        {groupings.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={current === item.value}
            onClick={() => choose(item.value)}
            className={`rounded-md px-2.5 py-1.5 transition-colors ${current === item.value ? 'bg-(--y-ink) text-(--y-surface)' : 'text-(--y-ink-2) hover:bg-(--y-band)'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm md:hidden">
        <span className="text-(--y-muted)">Qruplaşdır</span>
        <select value={current} onChange={(event) => choose(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-(--y-line) bg-(--y-surface) px-2 font-semibold text-(--y-ink)">
          {groupings.map((item) => <option key={item.value} value={item.value} className="bg-(--y-surface)">{item.label}</option>)}
        </select>
      </label>
    </>
  )
}

/**
 * The scope grouped by object or by a level of the catalogue: one ranked bar per part, the long names left and whole,
 * the amount over the range, its share, and the latest month's change on the comparison. A click on a part applies it
 * as a filter and opens the level under it (an object opens its categories, a sub-category its months); the arrow opens
 * the part's own page for the latest month — the way to its categories, products, prices and quantities. Fifteen parts
 * first, every one of them a click away.
 */
function GroupChart({ rows, reading }: { rows: GroupRow[]; reading: YearReading }) {
  const [all, setAll] = useState(false)
  if (rows.length === 0) return <p className="px-2 py-8 text-center text-sm text-(--y-muted)">Seçilmiş filtrlərdə sifariş yoxdur.</p>
  const shown = all ? rows : rows.slice(0, 15)
  const largest = rows[0].amount
  const latest = reading.latest?.month ?? null
  const scope = reading.scope
  const pageOf = (row: GroupRow) => {
    if (!latest) return null
    if (row.filter === 'site') return reading.href(scope.categoryId ? paths.category(YEAR, latest, scope.categoryId, row.id) : paths.site(YEAR, latest, row.id))
    return reading.href(paths.category(YEAR, latest, row.id, scope.siteId))
  }
  const grid = 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 md:grid-cols-[minmax(9rem,15rem)_minmax(0,1fr)_7.5rem_3.5rem_8.5rem_2rem] md:items-center md:gap-x-4'
  return (
    <div className="mt-3">
      <div aria-hidden="true" className={`hidden px-2 pb-1.5 text-[11px] font-semibold text-(--y-muted) md:grid ${grid}`}>
        <span>{groupings.find((item) => item.value === reading.filters.group)!.label.replace(/(lar|lər)$/, '')}</span>
        <span />
        <span className="text-right">Məbləğ</span>
        <span className="text-right">Pay</span>
        <span className="text-right">{latest ? `${monthName(latest)}, fərq` : 'Fərq'}</span>
        <span />
      </div>
      <ol>
        {shown.map((row) => {
          const page = pageOf(row)
          return (
            <li key={row.id} className={`group relative rounded-lg border-t border-(--y-line) px-2 py-2 first:border-t-0 hover:bg-(--y-band) ${grid}`}>
              <button
                type="button"
                onClick={() => reading.setFilters({ [row.filter]: row.id, group: row.next === 'aylar' ? null : row.next })}
                aria-label={`${row.name}${row.parent ? ` (${row.parent})` : ''}: ${money(row.amount)}. Filtr kimi tətbiq et`}
                className="stretched min-w-0 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--y-bar) md:order-1"
              >
                <span className="block truncate text-sm font-semibold group-hover:text-(--y-bar)" title={row.name}>{row.name}</span>
                {row.parent && <span className="block truncate text-[11px] text-(--y-muted)">{row.parent}</span>}
              </button>
              <span className="tnum text-right text-sm font-bold md:order-3">{rounded(row.amount)}</span>
              <span aria-hidden="true" className="col-span-2 block h-2.5 rounded-full bg-(--y-grid) md:order-2 md:col-span-1">
                <span className="block h-full rounded-full bg-(--y-bar) group-hover:bg-(--y-bar-hover)" style={{ width: `${largest ? Math.max(1, (row.amount / largest) * 100) : 0}%` }} />
              </span>
              <span className="tnum hidden text-right text-xs text-(--y-muted) md:order-4 md:block">{percent(row.share, false)}</span>
              <span className="col-span-2 flex items-center justify-end gap-1.5 md:order-5 md:col-span-1">
                <span className="tnum mr-auto text-xs text-(--y-muted) md:hidden">{percent(row.share, false)}</span>
                {row.change.kind === 'value'
                  ? <><span className="tnum whitespace-nowrap text-[11px] font-semibold text-(--y-muted)">{signedRounded(row.change.delta)}</span><Chip change={row.change} /></>
                  : <span className="text-xs text-(--y-muted)" title={row.change.detail}>{row.change.text === 'yeni' ? 'yeni' : '—'}</span>}
              </span>
              {page ? (
                <Link to={page} aria-label={`${row.name}: ${monthName(latest!)} ayının səhifəsi`} title={`${monthName(latest!)} ayının səhifəsi`} className="relative z-10 hidden size-8 place-items-center justify-self-end rounded-md text-(--y-muted) hover:bg-(--y-surface) hover:text-(--y-bar) md:order-6 md:grid">
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              ) : <span className="hidden md:order-6 md:block" />}
            </li>
          )
        })}
      </ol>
      {rows.length > 15 && (
        <button type="button" onClick={() => setAll(!all)} className="mt-1 w-full rounded-lg py-2 text-sm font-semibold text-(--y-bar) hover:bg-(--y-band)">
          {all ? 'Daha az göstər' : `Hamısını göstər (${rows.length})`}
        </button>
      )}
    </div>
  )
}

/** What the bars are, said once beside the chart. */
function ChartKey() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--y-ink-2)">
      <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-2.5 rounded-sm bg-(--y-bar)" />Ayın məbləği</span>
    </p>
  )
}

/**
 * How tall the chart may stand: as much of the screen as is left once the header, the figures strip and the rows under
 * the bars are counted — the filters' line among them — (more between 1024 and 1280 px, where the header wraps), between
 * 8.5 rem and 16 rem — so a desktop, a 768-pixel laptop included, shows the whole year at once, and a shorter window
 * scrolls rather than squeezing the bars flat.
 */
const plotHeight = 'h-[clamp(8.5rem,calc(100dvh-36rem),16rem)] xl:h-[clamp(8.5rem,calc(100dvh-33rem),16rem)]'

function MonthBar({ tile, kind, scope, scoped, top, to, risen, order }: { tile: MonthTile; kind: Kind; scope: YearScope; scoped: boolean; top: number; to: string; risen: boolean; order: number }) {
  const change = changeOf(tile)
  const { open, handlers } = useTipTrigger()
  const bar = useRef<HTMLSpanElement>(null)
  const anchor = useCallback(() => bar.current, [])
  const height = top > 0 ? Math.max(tile.amount ? 1.5 : 0, ((tile.amount ?? 0) / top) * 100) : 0
  const pending = kind === 'monthly' && tile.approval?.state === 'pending'
  const current = isCurrent(tile)
  const tipId = `month-tip-${tile.month}`

  return (
    <>
      <Link
        to={to}
        aria-describedby={tipId}
        aria-current={current ? 'date' : undefined}
        aria-label={`${monthName(tile.month)} ${YEAR}, ${kindNames[kind].toLocaleLowerCase('az')}: ${money(tile.amount)}`}
        {...handlers}
        className="group relative flex min-w-0 flex-col items-center rounded-lg pb-1"
      >
        {/* The month's band, the full height of the plot: always on the current month, on any month under the pointer. */}
        <span aria-hidden="true" className={`absolute inset-x-0.5 top-0 rounded-md transition-colors ${plotHeight} ${current ? 'bg-(--y-band)/60' : ''} group-hover:bg-(--y-band)`} />
        <span aria-hidden="true" className={`relative block w-full ${plotHeight}`}>
          <span
            ref={bar}
            className={`absolute bottom-0 left-1/2 w-[46%] max-w-9 origin-bottom rounded-t-[5px] transition-[height,transform,background-color] duration-500 ease-out motion-reduce:transition-none ${
              pending ? 'bg-(--y-bar-pending)' : 'bg-(--y-bar) group-hover:bg-(--y-bar-hover)'
            }`}
            style={{ height: `${height}%`, transform: `translateX(-50%) scaleY(${risen ? 1 : 0})`, transitionDelay: risen ? `${order * 35}ms` : '0ms' }}
          />
        </span>
        <span className={`mt-2 text-xs font-semibold ${current ? 'text-(--y-bar)' : 'text-(--y-ink-2)'}`}>{shortMonthNames[tile.month - 1]}</span>
        <span className={`tnum mt-1 whitespace-nowrap text-[14px] font-extrabold leading-5 tracking-[-0.01em] xl:text-[15px] ${tile.amount ? '' : 'text-(--y-muted)'}`}>{tile.amount ? rounded(tile.amount) : '—'}</span>
        <span className="mt-1 flex h-5 items-center">{change.kind === 'value' ? <Chip change={change} /> : <NoChange change={change} />}</span>
        <span className="tnum mt-0.5 h-4 whitespace-nowrap text-[11px] font-semibold leading-4 text-(--y-muted)">{change.kind === 'value' ? signedRounded(change.delta) : ''}</span>
      </Link>
      <MonthTip id={tipId} tile={tile} kind={kind} scope={scope} scoped={scoped} change={change} anchor={anchor} open={open} />
    </>
  )
}

/** A month on a narrow screen: name and approval, the bar lying down, the figure and its change in per cent and manats. */
function MonthRow({ tile, kind, scope, scoped, top, to }: { tile: MonthTile; kind: Kind; scope: YearScope; scoped: boolean; top: number; to: string }) {
  const change = changeOf(tile)
  const status = statusOf(tile, kind)
  const { open, handlers } = useTipTrigger()
  const bar = useRef<HTMLSpanElement>(null)
  const anchor = useCallback(() => bar.current, [])
  const width = top > 0 ? Math.max(tile.amount ? 1.5 : 0, ((tile.amount ?? 0) / top) * 100) : 0
  const pending = kind === 'monthly' && tile.approval?.state === 'pending'
  const current = isCurrent(tile)
  const tipId = `month-row-tip-${tile.month}`

  return (
    <>
      <Link
        to={to}
        aria-describedby={tipId}
        aria-current={current ? 'date' : undefined}
        aria-label={`${monthName(tile.month)} ${YEAR}, ${kindNames[kind].toLocaleLowerCase('az')}: ${money(tile.amount)}`}
        {...handlers}
        className={`grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-(--y-band) sm:grid-cols-[9rem_minmax(0,1fr)_auto] ${current ? 'bg-(--y-band)/60' : ''}`}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-bold leading-tight">
            {monthName(tile.month)}{current && <span className="ml-1.5 text-[11px] font-semibold text-(--y-bar)">cari ay</span>}
          </span>
          <StatusLine status={status} />
        </span>
        <span aria-hidden="true" className="relative block h-2.5 rounded-full bg-(--y-grid)">
          <span ref={bar} className={`absolute inset-y-0 left-0 rounded-full ${pending ? 'bg-(--y-bar-pending)' : 'bg-(--y-bar)'}`} style={{ width: `${width}%` }} />
        </span>
        <span className="flex flex-col items-end gap-1">
          <span className={`tnum whitespace-nowrap text-[15px] font-extrabold leading-tight ${tile.amount ? '' : 'text-(--y-muted)'}`}>{tile.amount ? rounded(tile.amount) : '—'}</span>
          {change.kind === 'value'
            ? <span className="flex items-center gap-1.5"><span className="tnum whitespace-nowrap text-[11px] font-semibold text-(--y-muted)">{signedRounded(change.delta)}</span><Chip change={change} /></span>
            : <NoChange change={change} />}
        </span>
      </Link>
      <MonthTip id={tipId} tile={tile} kind={kind} scope={scope} scoped={scoped} change={change} anchor={anchor} open={open} />
    </>
  )
}

function StatusLine({ status }: { status: ReturnType<typeof statusOf> }) {
  if (status.tone === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-(--y-ok)" title={status.long}>
        <Check aria-hidden="true" className="size-3.5" strokeWidth={2.75} />{status.short}
      </span>
    )
  }
  if (status.tone === 'pending') {
    return (
      <span className="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full bg-(--y-amber-soft) px-1.5 py-0.5 text-[11px] font-semibold text-(--y-amber)" title={status.long}>
        <Hourglass aria-hidden="true" className="size-3" strokeWidth={2.25} />{status.short}
      </span>
    )
  }
  if (status.tone === 'count') return <span className="text-[11px] font-semibold text-(--y-ink-2)">{status.short}</span>
  return null
}

/**
 * The month in brief, on hover or keyboard focus, set against its bar (above it first; see `placeTip`): the figure for
 * the kind in view, what it is compared with, the difference in manats and in per cent, then the month split by kind — the monthly orders with
 * their approval, the urgent requests with their count.
 */
function MonthTip({ id, tile, kind, scope, scoped, change, anchor, open }: {
  id: string
  tile: MonthTile
  kind: Kind
  scope: YearScope
  scoped: boolean
  change: Change
  anchor: () => Element | null
  open: boolean
}) {
  const split = scopeSplit(tile.month, scope)
  return (
    <Tip id={id} anchor={anchor} open={open} width="w-60">
      <p className="text-xs opacity-75">{monthName(tile.month)} {YEAR} · {kindNames[kind]}</p>
      <p className="tnum text-lg font-extrabold leading-snug">{tile.amount ? money(tile.amount) : 'Sifariş yoxdur'}</p>
      <dl className="mt-1.5 flex flex-col gap-0.5 text-xs">
        {change.kind === 'value' ? (
          <>
            <div className="flex justify-between gap-3">
              <dt className="opacity-75">{tile.period?.isAverage ? 'Ortalama' : `Əvvəlki ay · ${monthName(tile.month - 1)}`}</dt>
              <dd className="tnum font-semibold">{money(tile.comparison)}</dd>
            </div>
            {tile.period?.isAverage && <div className="-mt-0.5 opacity-60">{monthRange(tile.period.months, YEAR)}</div>}
            <div className="flex justify-between gap-3">
              <dt className="opacity-75">Fərq</dt>
              <dd className="tnum font-semibold">{signedMoney(change.delta)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="opacity-75">Fərq %</dt>
              <dd className="tnum font-semibold">{arrowOf(change.way)} {change.text}</dd>
            </div>
          </>
        ) : <div className="opacity-80">{change.detail}</div>}
      </dl>
      <dl className="mt-2 flex flex-col gap-0.5 border-t border-current/20 pt-2 text-xs">
        <div className="flex justify-between gap-3"><dt className="opacity-75">Aylıq sifarişlər</dt><dd className="tnum">{money(split.monthly)}</dd></div>
        {tile.approval && <div className="opacity-75">{scoped ? `Ay üzrə: ${statusOf(tile, 'monthly').long.toLocaleLowerCase('az')}` : statusOf(tile, 'monthly').long}</div>}
        <div className="flex justify-between gap-3"><dt className="opacity-75">Aylıqdan kənar ({split.outsideCount})</dt><dd className="tnum">{money(split.outside)}</dd></div>
        {kind === 'all' && <div className="mt-0.5 opacity-75">«Hamısı» təsdiq ediləcək məbləğ deyil</div>}
      </dl>
    </Tip>
  )
}

/** A month still to come: an empty dashed column, row for row with the others, and a short tip. */
function FutureBar({ tile }: { tile: MonthTile }) {
  const { open, handlers } = useTipTrigger()
  const placeholder = useRef<HTMLSpanElement>(null)
  const anchor = useCallback(() => placeholder.current, [])
  return (
    <>
      <div
        aria-label={`${monthName(tile.month)} ${YEAR}: hələ başlamayıb`}
        onPointerEnter={handlers.onPointerEnter}
        onPointerLeave={handlers.onPointerLeave}
        className="flex min-w-0 flex-col items-center pb-1 text-(--y-muted)"
      >
        <span aria-hidden="true" className={`relative block w-full ${plotHeight}`}>
          <span ref={placeholder} className="absolute inset-y-0 left-1/2 w-[46%] max-w-9 -translate-x-1/2 rounded-t-[5px] border border-b-0 border-dashed border-(--y-line)" />
        </span>
        <span className="mt-2 text-xs font-semibold">{shortMonthNames[tile.month - 1]}</span>
        {/* Two short lines, centred: side by side, two of these would run into each other. */}
        <span className="mt-1.5 flex flex-col items-center text-[11px] leading-4">
          {tile.state === 'future' ? <><span>hələ</span><span>başlamayıb</span></> : <><span>məlumat</span><span>yoxdur</span></>}
        </span>
      </div>
      <Tip anchor={anchor} open={open} width="w-48">
        <p className="text-xs opacity-75">{monthName(tile.month)} {YEAR}</p>
        <p className="text-sm font-bold leading-snug">{tile.state === 'future' ? 'Ay hələ başlamayıb' : 'Bu ay sifariş yoxdur'}</p>
      </Tip>
    </>
  )
}

function FutureRow({ tile }: { tile: MonthTile }) {
  return (
    <div
      aria-label={`${monthName(tile.month)} ${YEAR}: hələ başlamayıb`}
      className="grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5 text-(--y-muted) sm:grid-cols-[9rem_minmax(0,1fr)_auto]"
    >
      <span className="text-[15px] font-bold leading-tight">{monthName(tile.month)}</span>
      <span aria-hidden="true" className="block h-2.5 rounded-full border border-dashed border-(--y-line)" />
      <span className="text-xs">{tile.state === 'future' ? 'hələ başlamayıb' : 'məlumat yoxdur'}</span>
    </div>
  )
}

/** One month on the approval track: approved, waiting, or — for the outside-monthly requests — their count. */
function TrackCell({ tile, kind }: { tile: MonthTile; kind: Kind }) {
  if (tile.state !== 'data') return <span aria-hidden="true" className="mx-1 h-1.5 rounded-full border border-dashed border-(--y-line)" />
  if (kind === 'outside') return <span className="tnum text-center text-xs font-semibold text-(--y-ink-2)">{tile.outsideCount}</span>
  const status = statusOf(tile, kind)
  return (
    <span
      role="img"
      aria-label={`${monthName(tile.month)}: ${status.long}`}
      title={status.long}
      className={`mx-1 h-1.5 rounded-full ${status.tone === 'approved' ? 'bg-(--y-ok)' : status.tone === 'pending' ? 'track-pending' : 'bg-(--y-line)'}`}
    />
  )
}

/** A round top for the value axis and four or five steps up to it. */
export function niceScale(max: number): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 1, ticks: [0] }
  const rough = max / 5
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? 10 * power
  const top = Math.ceil(max / step) * step
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step) }
}

export const axisLabel = (value: number) => (value >= 1000 ? `${(value / 1000).toLocaleString('az')} min` : `${value}`)
