import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import {
  CalendarDays, Expand, Filter, Info, Link2Off, List, Map as MapIcon, Minimize, Scan, Search, TrendingUp, TriangleAlert, UserRound, X,
} from 'lucide-react'
import { kindOptions, readKind } from '../../data/analysis'
import { AREA_LOCATIONS, LOCATION_SOURCE, REJECTED_LOCATIONS } from '../../data/areaLocations'
import { HIDDEN_LOCATIONS, hiddenBehind, shownIdOf, VISIBILITY_PROBLEMS } from '../../data/locationVisibility'
import { monthsWithDataIn } from '../../data/model'
import { money } from '../../lib/format'
import { kindParam } from '../../overview/links'
import { areaFigures, areaRows, linkCoverage, periodCoverage, resolveMapAreas, siteOf, type AreaRow } from '../../overview/areas'
import { modeLabel, rangeLabel, spanOf, type CompareMode } from '../../overview/compare'
import { hasMonth, periodOptions, previousYearOf, reportingYears } from '../../overview/metrics'
import { ChangeChip, EmptyNote, FilterSelect, type SelectOption } from '../ui'
import { AreaMap, type MapControl, type MapPoint } from './AreaMap'
import { LocationPanel, statusWords, type PanelTab } from './LocationPanel'
import { MapOverview } from './MapOverview'

/*
 * «Ərazilər xəritəsi», a page of its own beside the overview and the year screens (no «Müdiriyyət» above it): the owner's
 * location records as pins at their own coordinates — every one but a duplicate the owner had hidden
 * (data/locationVisibility) — and the chosen one's analysis on the right («Ərazi analitikası»). The year, the period, the comparison, the kind of order, the manager filter, the chosen location,
 * its tab and an opened month all live in the address, so a link opens the same view and Back undoes a step. A location
 * shows money only through a confirmed link to its financial object (overview/areas); every other one keeps its pin, its
 * manager and its map link and says that its figures are not matched yet.
 */

const params = {
  year: 'il', period: 'dovr', legacyMonth: 'ay', comparison: 'muq', area: 'erazi', view: 'gorunus', manager: 'rehber', tab: 'bolme', drill: 'sifay',
} as const

const readTab = (value: string | null): PanelTab => (value === 'sifarisler' || value === 'mehsullar' ? value : 'icmal')
const readDrill = (value: string | null): number | null => {
  const month = Number(value)
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null
}
/** The period in the address: `dovr` (ytd, q1–q4, m1–m12), or the older `ay` (il, 1–12) of links made before it. */
function readPeriod(search: URLSearchParams): string | null {
  const period = search.get(params.period)
  if (period) return period
  const month = search.get(params.legacyMonth)
  if (month === 'il') return 'ytd'
  return month && /^\d{1,2}$/.test(month) ? `m${month}` : null
}

const fold = (text: string) => text.toLocaleLowerCase('az').normalize('NFC')

export function MapPage() {
  const [search, setSearch] = useSearchParams()
  const [query, setQuery] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const control = useRef<MapControl | null>(null)

  // The years with a monthly package, from the figures themselves: 2025 and 2026 today, more once older years come in.
  const years = reportingYears()
  const askedYear = Number(search.get(params.year))
  const year = years.includes(askedYear) ? askedYear : years.at(-1) ?? 0
  const previousYear = previousYearOf(year)
  const available = monthsWithDataIn(year)
  const lastMonth = available.at(-1) ?? 0
  const options = periodOptions(year)
  const asked = readPeriod(search)
  // Without a period in the address the year opens whole: «Bütün il» for a finished year, «İlin əvvəlindən» for the
  // running one. A single month is one choice away, and never read without its year («İllər üzrə» in the panel).
  const period = options.find((option) => option.id === asked) ?? options[0] ?? null
  const span = useMemo(() => (period ? spanOf(year, period.span, lastMonth) : []), [period?.id, year, lastMonth]) // eslint-disable-line react-hooks/exhaustive-deps
  const months = useMemo(() => (period ? period.months.filter((month) => hasMonth(year, month)) : []), [period?.id, year]) // eslint-disable-line react-hooks/exhaustive-deps
  const kind = readKind(search.get(kindParam))
  const mode: CompareMode = search.get(params.comparison) === 'evvelki' ? 'previous' : 'yoy'
  const single = span.length === 1
  const listView = search.get(params.view) === 'siyahi'
  const manager = search.get(params.manager)
  const tab = readTab(search.get(params.tab))
  const drill = readDrill(search.get(params.drill))

  const areas = useMemo(() => resolveMapAreas(), [])
  const links = useMemo(() => linkCoverage(areas), [areas])
  const rows = useMemo(() => areaRows(areas, span, mode, kind), [areas, span, mode, kind])
  const coverage = useMemo(() => periodCoverage(areas, span, kind), [areas, span, kind])
  // A link to a hidden duplicate opens the record shown for its place.
  const askedArea = search.get(params.area)
  const shownArea = askedArea ? shownIdOf(askedArea) : null
  const selected = rows.find((row) => row.area.location.id === shownArea) ?? null
  const selectedSite = selected ? siteOf(selected.area) : null
  const figures = useMemo(() => (selectedSite ? areaFigures(selectedSite, year, months, kind) : null), [selectedSite, year, months, kind])

  const managers = useMemo(() => [...new Set(areas.flatMap((area) => area.location.managers))].sort((a, b) => a.localeCompare(b, 'az')), [areas])
  const needle = fold(query.trim())
  const byManager = (row: AreaRow) => !manager || row.area.location.managers.includes(manager)
  const byQuery = (row: AreaRow) => !needle
    || fold(row.area.location.name).includes(needle)
    || fold(row.area.location.manager ?? '').includes(needle)
    || fold(row.area.location.id).includes(needle)
    // The id of a hidden duplicate finds the record shown for its place.
    || hiddenBehind(row.area.location.id).some((item) => fold(item.location.id).includes(needle))
  const filtered = rows.filter(byManager)
  const visible = filtered.filter(byQuery)
  const visibleKey = visible.map((row) => row.area.location.id).join(',')

  const points: MapPoint[] = useMemo(() => {
    const shown = selected && !visible.includes(selected) ? [...visible, selected] : visible
    return shown.map((row) => ({
      id: row.area.location.id,
      name: row.area.location.name,
      manager: row.area.location.manager,
      lat: row.area.location.lat,
      lng: row.area.location.lng,
      tone: row.area.finance.state !== 'linked' ? 'unlinked' : row.amount ? 'active' : 'quiet',
      review: row.area.location.status !== 'VERIFIED',
      note: row.area.location.status !== 'VERIFIED' ? statusWords[row.area.location.status] : null,
      detail: pinDetail(row, rangeLabel(span)),
      weight: row.amount ?? 0,
    }))
  }, [visibleKey, rows, selected?.area.location.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function write(changes: Record<string, string | null>) {
    const next = new URLSearchParams(search)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearch(next, { replace: true, preventScrollReset: true })
  }
  const select = (id: string | null) => write({ [params.area]: id, [params.drill]: null })
  /** Another year, the same view: its period opens whole, as the year filter does. */
  const chooseYear = (value: number) => write({ [params.year]: value === years.at(-1) ? null : String(value), [params.period]: null, [params.legacyMonth]: null, [params.drill]: null })

  // The address names the record on screen: an older link to a hidden duplicate is rewritten to the one shown.
  useEffect(() => {
    if (askedArea && shownArea && shownArea !== askedArea) write({ [params.area]: shownArea })
  }, [askedArea, shownArea]) // eslint-disable-line react-hooks/exhaustive-deps
  const chooseFromList = (id: string) => {
    select(id)
    control.current?.focusOn(id)
  }
  const showAll = () => {
    setQuery('')
    write({ [params.manager]: null })
    requestAnimationFrame(() => control.current?.fitAll())
  }

  // Escape closes the analysis, unless the keyboard is busy in a field or a list.
  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if ((event.target as HTMLElement).closest('input, textarea, [role="combobox"], [role="listbox"], .leaflet-popup')) return
      if (document.fullscreenElement) return
      select(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // On a narrow screen the analysis is under the map: bring it into view when a location is chosen.
  useEffect(() => {
    if (!selected || window.matchMedia?.('(min-width: 1280px)').matches) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    panel.current?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [selected?.area.location.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stage.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void stage.current?.requestFullscreen?.()
  }

  if (years.length === 0 || !period) {
    return (
      <>
        <Heading />
        <EmptyNote title="Məlumat yoxdur">Excel kitabı yüklənəndən sonra ərazilərin məbləğləri burada görünəcək.</EmptyNote>
      </>
    )
  }

  const periodChoices: SelectOption[] = options.map((option) => ({
    value: option.id,
    label: option.label,
    display: option.label.replace(/ \(.*\)$/, ''),
    group: option.group === 'quarter' ? 'Rüb' : option.group === 'month' ? 'Ay' : undefined,
  }))
  const managerChoices: SelectOption[] = [
    { value: '', label: 'Hamısı' },
    ...managers.map((name) => ({ value: name, label: `${name} (${areas.filter((area) => area.location.managers.includes(name)).length})`, display: name })),
  ]
  const shownList = [...visible].sort((left, right) => (right.amount ?? -1) - (left.amount ?? -1) || left.area.location.name.localeCompare(right.area.location.name, 'az'))
  const related = selected
    ? {
      duplicates: selected.area.location.duplicateGroup ? areas.filter((area) => area.location.duplicateGroup === selected.area.location.duplicateGroup && area.location.id !== selected.area.location.id) : [],
      hidden: hiddenBehind(selected.area.location.id),
      shared: selected.area.finance.state === 'linked' ? areas.filter((area) => (selected.area.finance.state === 'linked' && selected.area.finance.sharedWith.includes(area.location.id))) : [],
    }
    : { duplicates: [], hidden: [], shared: [] }
  const count = visible.length === rows.length ? `${rows.length} lokasiya` : `${visible.length} / ${rows.length} lokasiya`
  // The count is of places on the map; the source's records — the hidden duplicates among them — are said beside it.
  const sourceNote = HIDDEN_LOCATIONS.length > 0
    ? `Mənbədə ${AREA_LOCATIONS.length} qeyd; ${HIDDEN_LOCATIONS.length} təkrar qeyd ayrıca göstərilmir (${HIDDEN_LOCATIONS.map((item) => `${item.location.id} → ${item.shownAs.id}`).join(', ')})`
    : `Mənbədə ${AREA_LOCATIONS.length} qeyd`

  return (
    <>
      <Heading
        filters={(
          <>
            <FilterSelect icon={CalendarDays} label="İl" value={String(year)} options={[...years].reverse().map((item) => ({ value: String(item), label: String(item) }))} onChange={(value) => chooseYear(Number(value))} />
            <FilterSelect icon={CalendarDays} label="Dövr" value={period.id} options={periodChoices} onChange={(value) => write({ [params.period]: value, [params.legacyMonth]: null, [params.drill]: null })} />
            <FilterSelect
              icon={TrendingUp}
              label="Müqayisə"
              value={mode}
              options={[
                { value: 'yoy', label: modeLabel('yoy', single) },
                { value: 'previous', label: modeLabel('previous', single) },
              ]}
              onChange={(value) => write({ [params.comparison]: value === 'previous' ? 'evvelki' : null })}
            />
            <FilterSelect icon={Filter} label="Növ" value={kind} options={kindOptions.map((option) => ({ value: option.value, label: option.label }))} onChange={(value) => write({ [kindParam]: kindOptions.find((option) => option.value === value)?.param || null })} />
          </>
        )}
      />

      {VISIBILITY_PROBLEMS.length > 0 && (
        <p role="note" className="flex items-start gap-3 rounded-xl border border-dashed border-(--x-line-2) px-4 py-3 text-[14px]">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>Təkrar qeydin gizlədilməsi tətbiq edilmədi: {VISIBILITY_PROBLEMS.join('; ')}.</span>
        </p>
      )}

      {REJECTED_LOCATIONS.length > 0 && (
        <p role="note" className="flex items-start gap-3 rounded-xl border border-dashed border-(--x-line-2) px-4 py-3 text-[14px]">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>{REJECTED_LOCATIONS.length} lokasiya qeydi xəritədə göstərilmir: {REJECTED_LOCATIONS.map((item) => `${item.id}${item.name ? ` (${item.name})` : ''} — ${item.problem}`).join('; ')}.</span>
        </p>
      )}

      <div
        ref={stage}
        className={`grid items-start gap-5 xl:grid-cols-[minmax(0,13fr)_minmax(420px,12fr)] ${fullscreen ? 'h-dvh overflow-y-auto bg-(--x-bg) p-4' : ''}`}
      >
        <section aria-label="Ərazilər" className="x-card flex min-w-0 flex-col overflow-hidden xl:sticky xl:top-5">
          <div className="flex flex-wrap items-center gap-2 border-b border-(--x-line) p-3">
            <label className="relative flex min-h-11 min-w-[min(100%,220px)] flex-1 items-center">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 size-5 text-(--x-muted)" />
              <span className="sr-only">Ərazi, rəhbər və ya ID axtar</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && query) {
                    event.preventDefault()
                    setQuery('')
                  }
                  if (event.key !== 'Enter') return
                  const first = shownList[0]
                  if (first) chooseFromList(first.area.location.id)
                }}
                placeholder="Ərazi və ya rəhbər axtar…"
                className="h-11 w-full rounded-[10px] border border-(--x-line-2) bg-(--x-surface-2) pl-10 pr-3 text-[15px] text-(--x-ink) placeholder:text-(--x-muted) focus:border-(--x-focus) focus:outline-none"
              />
            </label>
            <FilterSelect
              icon={UserRound}
              label="Ərazi rəhbəri"
              value={manager ?? ''}
              options={managerChoices}
              className="max-w-full"
              onChange={(value) => write({
                [params.manager]: value || null,
                // A chosen location the new filter leaves out is let go, so the map and the analysis agree.
                ...(selected && value && !selected.area.location.managers.includes(value) ? { [params.area]: null, [params.drill]: null } : {}),
              })}
            />
            <div role="group" aria-label="Görünüş" className="flex rounded-[10px] border border-(--x-line-2) p-1">
              <button type="button" aria-pressed={!listView} onClick={() => write({ [params.view]: null })} className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${!listView ? 'bg-(--x-band) text-(--x-ink)' : 'text-(--x-ink-2) hover:text-(--x-ink)'}`}>
                <MapIcon aria-hidden="true" className="size-4" />Xəritə
              </button>
              <button type="button" aria-pressed={listView} onClick={() => write({ [params.view]: 'siyahi' })} className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${listView ? 'bg-(--x-band) text-(--x-ink)' : 'text-(--x-ink-2) hover:text-(--x-ink)'}`}>
                <List aria-hidden="true" className="size-4" />Siyahı
              </button>
            </div>
            <p className="ml-auto whitespace-nowrap px-1 text-sm font-semibold text-(--x-ink-2)" aria-live="polite" title={sourceNote}>{count}</p>
          </div>

          {(manager || query) && (
            <div className="flex flex-wrap items-center gap-2 border-b border-(--x-line) px-3 py-2 text-[13px]">
              <span className="text-(--x-ink-2)">Aktiv filtrlər:</span>
              {manager && <Chip onRemove={() => write({ [params.manager]: null })} label={`Ərazi rəhbəri: ${manager}`} />}
              {query && <Chip onRemove={() => setQuery('')} label={`Axtarış: «${query}»`} />}
              <button type="button" onClick={showAll} className="ml-auto inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 font-semibold text-(--x-link) hover:bg-(--x-band)">
                <Scan aria-hidden="true" className="size-4" />Hamısını göstər
              </button>
            </div>
          )}

          {listView ? (
            <AreaList rows={shownList} selectedId={selected?.area.location.id ?? null} onSelect={(id) => select(id)} total={rows.length} />
          ) : (
            <div className={`relative ${fullscreen ? 'h-[calc(100dvh-160px)]' : 'h-[clamp(360px,62dvh,560px)] xl:h-[clamp(520px,calc(100dvh-250px),820px)]'}`}>
              <AreaMap points={points} selectedId={selected?.area.location.id ?? null} onSelect={(id) => select(id)} control={control} />
              <button
                type="button"
                onClick={toggleFullscreen}
                data-map-control
                aria-label={fullscreen ? 'Tam ekrandan çıx' : 'Tam ekran'}
                title={fullscreen ? 'Tam ekrandan çıx' : 'Tam ekran'}
                className="absolute right-3 top-[146px] z-[500] grid size-10 place-items-center rounded-lg border border-(--x-line-2) bg-(--x-surface) shadow-(--x-shadow) hover:bg-(--x-band)"
              >
                {fullscreen ? <Minimize aria-hidden="true" className="size-5" /> : <Expand aria-hidden="true" className="size-5" />}
              </button>
              {visible.length === 0 && (
                <p className="absolute left-1/2 top-4 z-[500] -translate-x-1/2 rounded-lg bg-(--x-surface) px-3 py-2 text-sm shadow-(--x-shadow)">Filtrə uyğun ərazi tapılmadı</p>
              )}
            </div>
          )}

          <Legend />
        </section>

        <div ref={panel} className="min-w-0 scroll-mt-20">
          {selected ? (
            <LocationPanel
              key={selected.area.location.id}
              row={selected}
              figures={figures}
              context={{ year, previousYear, span, months, kind, mode }}
              tab={tab}
              drill={drill}
              onView={(view) => write({
                ...(view.tab ? { [params.tab]: view.tab === 'icmal' ? null : view.tab } : {}),
                ...(view.drill !== undefined ? { [params.drill]: view.drill === null ? null : String(view.drill) } : {}),
              })}
              onYear={chooseYear}
              onClose={() => select(null)}
              onSelect={(id) => chooseFromList(id)}
              related={related}
            />
          ) : (
            <MapOverview rows={filtered} coverage={coverage} links={links} span={span} kind={kind} mode={mode} manager={manager} year={year} sourceNote={sourceNote} onSelect={chooseFromList} />
          )}
        </div>
      </div>
    </>
  )
}

/** What a pin's card says under the name and the manager. */
function pinDetail(row: AreaRow, period: string): string {
  if (row.area.finance.state !== 'linked') return 'Maliyyə məlumatları hələ uyğunlaşdırılmayıb'
  if (row.amount === null) return `${period}: məlumat yoxdur`
  if (row.amount === 0) return `${period}: sifariş verilməyib`
  return `${period}: ${money(row.amount)}`
}

/** The page's own title. The map is a top-level page of the sidebar, as the overview is: no trail of parents above it. */
function Heading({ filters }: { filters?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4">
      <div className="min-w-0">
        <h1 id="page-title" tabIndex={-1} className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.025em] outline-none sm:text-[40px]">Ərazilər xəritəsi</h1>
        <p className="mt-1.5 text-lg text-(--x-ink-2)">Ərazini seçin, sifariş və xərcləri müqayisə edin</p>
      </div>
      {filters && <div className="flex flex-wrap items-center gap-2.5">{filters}</div>}
    </header>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border border-(--x-line-2) bg-(--x-surface-2) pl-3 pr-1 font-semibold">
      <span className="truncate">{label}</span>
      <button type="button" onClick={onRemove} aria-label={`Filtri sil: ${label}`} className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-(--x-band)">
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </span>
  )
}

/** The pins' kinds, said in words beside their shapes: no colour speaks alone. */
function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-(--x-line) px-3.5 py-2.5 text-[12.5px] text-(--x-ink-2)">
      <span className="flex items-center gap-1.5"><PinGlyph tone="active" />Dövrdə sifariş var</span>
      <span className="flex items-center gap-1.5"><PinGlyph tone="quiet" />Sifariş yoxdur</span>
      <span className="flex items-center gap-1.5"><PinGlyph tone="unlinked" />Maliyyə uyğunlaşdırılmayıb</span>
      <span className="flex items-center gap-1.5"><PinGlyph tone="active" review />Koordinat yoxlanılmalı</span>
      <span className="ml-auto flex items-center gap-1.5 text-(--x-muted)" title={`${LOCATION_SOURCE.workbook} · ${LOCATION_SOURCE.worksheet}`}><Info aria-hidden="true" className="size-3.5" />Mənbə: «{LOCATION_SOURCE.worksheet}» cədvəli</span>
    </div>
  )
}

function PinGlyph({ tone, review = false }: { tone: MapPoint['tone']; review?: boolean }) {
  return (
    <svg viewBox="0 0 30 40" aria-hidden="true" className={`x-legend-pin is-${tone}${review ? ' is-review' : ''}`}>
      <path d="M15 38.5S27.5 25.6 27.5 15A12.5 12.5 0 0 0 2.5 15c0 10.6 12.5 23.5 12.5 23.5z" />
      {review ? <text x="15" y="19.5" textAnchor="middle" className="x-pin-glyph">!</text> : <circle cx="15" cy="15" r="5" />}
    </svg>
  )
}

/** The locations as a list, largest first: the way in for every location, pin or not. */
function AreaList({ rows, selectedId, onSelect, total }: { rows: AreaRow[]; selectedId: string | null; onSelect: (id: string) => void; total: number }) {
  return (
    <div className="flex min-h-[360px] flex-col">
      <p className="border-b border-(--x-line) px-4 py-2 text-sm text-(--x-ink-2)">{rows.length} / {total} lokasiya, məbləğə görə</p>
      {rows.length === 0 ? <p className="p-8 text-center text-sm text-(--x-muted)">Filtrə uyğun ərazi yoxdur.</p> : (
        <ol aria-label="Lokasiyalar" className="relative max-h-[clamp(360px,62dvh,760px)] overflow-y-auto">
          {rows.map((row) => {
            const { location, finance } = row.area
            return (
              <li key={location.id} className="border-b border-(--x-line) last:border-b-0">
                <button
                  type="button"
                  aria-pressed={location.id === selectedId}
                  data-location={location.id}
                  onClick={() => onSelect(location.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left hover:bg-(--x-band) aria-pressed:bg-(--x-band) sm:grid-cols-[minmax(0,1fr)_auto_5rem]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold" title={location.name}>{location.name}</span>
                    <span className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-(--x-ink-2)">
                      <span className="font-mono">{location.id}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">Ərazi rəhbəri: {location.manager ?? 'məlumat yoxdur'}</span>
                      {location.status !== 'VERIFIED' && <span className="inline-flex items-center gap-1"><TriangleAlert aria-hidden="true" className="size-3" />{statusWords[location.status]}</span>}
                    </span>
                  </span>
                  {finance.state === 'linked' ? (
                    <span className={`tnum text-right font-bold ${row.amount ? '' : 'text-(--x-muted)'}`}>{row.amount === null ? 'məlumat yoxdur' : row.amount ? money(row.amount) : 'sifariş yoxdur'}</span>
                  ) : (
                    <span className="inline-flex items-center justify-end gap-1 text-right text-[12.5px] text-(--x-muted)"><Link2Off aria-hidden="true" className="size-3.5" />uyğunlaşdırılmayıb</span>
                  )}
                  <span className="hidden justify-end sm:flex">
                    {finance.state === 'linked' ? <ChangeChip pct={row.comparison?.pct ?? null} delta={row.comparison?.delta ?? null} reason="müqayisə yoxdur" /> : <span className="text-(--x-muted)" aria-hidden="true">—</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
