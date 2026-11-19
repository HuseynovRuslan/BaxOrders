import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  CalendarDays, ChevronRight, Expand, Filter, Info, List, Map as MapIcon, MapPin, MapPinOff, Minimize, Scan, Search, TrendingUp,
} from 'lucide-react'
import { kindOptions, readKind } from '../../data/analysis'
import { monthsWithDataIn, YEARS } from '../../data/model'
import { money, monthName } from '../../lib/format'
import { kindParam, overviewLinks } from '../../overview/links'
import { areaFigures, areaRows, resolveAreas, unknownLocationIds, type AreaRow } from '../../overview/areas'
import { isInProgress, latestYear, longRange, shortRange } from '../../overview/metrics'
import { ChangeChip, EmptyNote, FilterSelect, type SelectOption } from '../ui'
import { AreaDrawer } from './AreaDrawer'
import { AreaMap, type MapControl, type MapPoint } from './AreaMap'
import { sampleEnabled, sampleLocations } from './devSample'

/*
 * «Ərazilər xəritəsi» (Variant A): every operational area as a pin, the chosen one's figures in a panel on the right. The
 * year, the month (or the year to date), the comparison and the kind of order live in the address with the chosen area,
 * so a link opens the same view. Areas without coordinates are never placed anywhere: they are listed — «Koordinat
 * gözləyənlər» — and open the same panel. Until the owner sends coordinates, that is all 36 of them.
 */

const params = { year: 'il', month: 'ay', comparison: 'muq', area: 'erazi', view: 'gorunus', missing: 'yer' } as const

export function MapPage() {
  const [search, setSearch] = useSearchParams()
  const [query, setQuery] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const drawer = useRef<HTMLDivElement>(null)
  const control = useRef<MapControl | null>(null)

  const askedYear = Number(search.get(params.year))
  const year = YEARS.includes(askedYear) ? askedYear : latestYear()
  const available = monthsWithDataIn(year)
  const askedMonth = search.get(params.month)
  const month = askedMonth === 'il' ? null : available.includes(Number(askedMonth)) ? Number(askedMonth) : available.at(-1) ?? null
  const months = month === null ? available.slice() : [month]
  const kind = readKind(search.get(kindParam))
  const comparisonMode = search.get(params.comparison) === 'evvelki' && month !== null ? 'previous' : 'yoy'
  const listView = search.get(params.view) === 'siyahi'
  const onlyMissing = search.get(params.missing) === 'yox'
  const sample = sampleEnabled(search)

  const areas = useMemo(() => {
    const plain = resolveAreas()
    return sample && sampleLocations ? resolveAreas(undefined, sampleLocations(plain.map((area) => area.id))) : plain
  }, [sample])
  const rows = useMemo(() => areaRows(areas, year, months, kind), [areas, year, months.join(','), kind]) // eslint-disable-line react-hooks/exhaustive-deps
  const selected = areas.find((area) => area.id === search.get(params.area)) ?? null
  const figures = useMemo(() => (selected ? areaFigures(selected.id, year, months, kind) : null), [selected, year, months.join(','), kind]) // eslint-disable-line react-hooks/exhaustive-deps

  const located = areas.filter((area) => area.location)
  const missing = areas.filter((area) => !area.location)
  const unknown = unknownLocationIds()
  const needle = query.trim().toLocaleLowerCase('az')
  const matches = (row: AreaRow) => !needle || row.area.name.toLocaleLowerCase('az').includes(needle)
  const points: MapPoint[] = useMemo(() => rows
    .filter((row) => row.area.location && matches(row))
    .map((row) => ({ id: row.area.id, name: row.area.name, lat: row.area.location!.lat, lng: row.area.location!.lng, amount: row.amount, active: row.amount > 0 })),
  [rows, needle]) // eslint-disable-line react-hooks/exhaustive-deps

  function write(changes: Record<string, string | null>) {
    const next = new URLSearchParams(search)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearch(next, { replace: true, preventScrollReset: true })
  }
  const select = (id: string | null) => write({ [params.area]: id })

  // Escape closes the panel, unless the keyboard is busy in a field.
  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || (event.target as HTMLElement).closest('input, select, textarea')) return
      if (document.fullscreenElement) return
      select(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // On a narrow screen the panel is under the map: bring it into view when an area is chosen.
  useEffect(() => {
    if (!selected || window.matchMedia('(min-width: 1280px)').matches) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    drawer.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stage.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void stage.current?.requestFullscreen?.()
  }

  if (YEARS.length === 0) {
    return (
      <>
        <Heading />
        <EmptyNote title="Məlumat yoxdur">Excel kitabı yüklənəndən sonra ərazilər burada görünəcək.</EmptyNote>
      </>
    )
  }

  const monthChoices: SelectOption[] = [
    { value: 'il', label: `İlin əvvəlindən (${shortRange(available)})`, display: shortRange(available) },
    ...available.map((item) => ({ value: String(item), label: monthName(item), group: 'Ay' })),
  ]
  const period = month === null ? `${longRange(months)} ${year}` : `${monthName(month)} ${year}`
  const shown = rows.filter(matches).filter((row) => !onlyMissing || !row.area.location).sort((left, right) => right.amount - left.amount || left.area.name.localeCompare(right.area.name, 'az'))

  return (
    <>
      <Heading
        filters={(
          <>
            <FilterSelect icon={CalendarDays} label="İl" value={String(year)} options={YEARS.map((item) => ({ value: String(item), label: String(item) }))} onChange={(value) => write({ [params.year]: value === String(latestYear()) ? null : value, [params.month]: null })} />
            <FilterSelect icon={CalendarDays} label="Ay" value={month === null ? 'il' : String(month)} options={monthChoices} onChange={(value) => write({ [params.month]: value, ...(value === 'il' ? { [params.comparison]: null } : {}) })} />
            <FilterSelect
              icon={TrendingUp}
              label="Müqayisə"
              value={comparisonMode}
              options={[
                { value: 'yoy', label: month === null ? 'Ötən ilin eyni dövrü' : 'Ötən ilin eyni ayı' },
                { value: 'previous', label: 'Əvvəlki ay', disabled: month === null },
              ]}
              onChange={(value) => write({ [params.comparison]: value === 'previous' ? 'evvelki' : null })}
            />
            <FilterSelect icon={Filter} label="Növ" value={kind} options={kindOptions.map((option) => ({ value: option.value, label: option.label }))} onChange={(value) => write({ [kindParam]: kindOptions.find((option) => option.value === value)?.param || null })} />
          </>
        )}
      />

      <Banner sample={sample} located={located.length} total={areas.length} invalid={areas.filter((area) => area.locationIssue).length} unknown={unknown} />

      <div
        ref={stage}
        className={`grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(380px,1fr)] ${fullscreen ? 'h-dvh overflow-y-auto bg-(--x-bg) p-4' : ''}`}
      >
        <section aria-label="Ərazilər" className="x-card flex min-w-0 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-(--x-line) p-3">
            <label className="relative flex min-h-11 min-w-[200px] flex-1 items-center">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 size-5 text-(--x-muted)" />
              <span className="sr-only">Ərazi axtar</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  const first = shown[0]
                  if (first) select(first.area.id)
                }}
                placeholder="Ərazi axtar…"
                className="h-11 w-full rounded-[10px] border border-(--x-line-2) bg-(--x-surface-2) pl-10 pr-3 text-[15px] text-(--x-ink) placeholder:text-(--x-muted) focus:border-(--x-focus) focus:outline-none"
              />
            </label>
            <div role="group" aria-label="Görünüş" className="flex rounded-[10px] border border-(--x-line-2) p-1">
              <button type="button" aria-pressed={!listView} onClick={() => write({ [params.view]: null })} className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${!listView ? 'bg-(--x-band) text-(--x-ink)' : 'text-(--x-ink-2) hover:text-(--x-ink)'}`}>
                <MapIcon aria-hidden="true" className="size-4" />Xəritə
              </button>
              <button type="button" aria-pressed={listView} onClick={() => write({ [params.view]: 'siyahi' })} className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${listView ? 'bg-(--x-band) text-(--x-ink)' : 'text-(--x-ink-2) hover:text-(--x-ink)'}`}>
                <List aria-hidden="true" className="size-4" />Siyahı
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setQuery(''); write({ [params.missing]: null }); control.current?.fitAll() }}
              disabled={listView ? !query && !onlyMissing : located.length === 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-(--x-line-2) px-3 text-sm font-semibold hover:bg-(--x-band) disabled:opacity-50"
            >
              <Scan aria-hidden="true" className="size-4" />Hamısını göstər
            </button>
          </div>

          {listView ? (
            <AreaList rows={shown} selectedId={selected?.id ?? null} onSelect={select} onlyMissing={onlyMissing} total={rows.length} />
          ) : (
            <div className="relative h-[clamp(380px,62dvh,680px)]">
              <AreaMap points={points} selectedId={selected?.id ?? null} onSelect={select} control={control} />
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={fullscreen ? 'Tam ekrandan çıx' : 'Tam ekran'}
                title={fullscreen ? 'Tam ekrandan çıx' : 'Tam ekran'}
                className="absolute right-3 top-[104px] z-[500] grid size-10 place-items-center rounded-lg border border-(--x-line-2) bg-(--x-surface) shadow-(--x-shadow) hover:bg-(--x-band)"
              >
                {fullscreen ? <Minimize aria-hidden="true" className="size-5" /> : <Expand aria-hidden="true" className="size-5" />}
              </button>
              {located.length === 0 && (
                <div className="absolute inset-x-4 top-1/2 z-[500] mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-(--x-line-2) bg-(--x-surface)/95 p-5 text-center shadow-xl backdrop-blur">
                  <MapPinOff aria-hidden="true" className="mx-auto size-8 text-(--x-muted)" />
                  <p className="mt-2 text-lg font-extrabold">Koordinatlar hələ daxil edilməyib</p>
                  <p className="mt-1 text-sm text-(--x-ink-2)">{areas.length} ərazinin hamısı siyahıdadır və təfərrüatları açılır. Koordinat əlavə edildikcə nöqtələr xəritədə görünəcək.</p>
                  <button type="button" onClick={() => write({ [params.view]: 'siyahi' })} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-(--x-prev) px-4 text-sm font-bold text-[#06231f] hover:brightness-110">
                    <List aria-hidden="true" className="size-4" />Siyahını aç
                  </button>
                </div>
              )}
              {query && points.length === 0 && located.length > 0 && (
                <p className="absolute left-1/2 top-4 z-[500] -translate-x-1/2 rounded-lg bg-(--x-surface) px-3 py-2 text-sm shadow-(--x-shadow)">Xəritədə «{query}» tapılmadı</p>
              )}
              <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] flex flex-wrap items-end justify-between gap-2">
                {missing.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => write({ [params.view]: 'siyahi', [params.missing]: 'yox' })}
                    className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-(--x-line-2) bg-(--x-surface) px-3.5 text-sm font-semibold shadow-(--x-shadow) hover:bg-(--x-band)"
                  >
                    <MapPinOff aria-hidden="true" className="size-4" />
                    Koordinat gözləyənlər ({missing.length})
                    <ChevronRight aria-hidden="true" className="size-4" />
                  </button>
                ) : <span />}
                <span className="rounded-md bg-(--x-surface)/85 px-2 py-1 text-xs italic text-(--x-ink-2)">{located.length} / {areas.length} ərazi xəritədə</span>
              </div>
            </div>
          )}
        </section>

        <div ref={drawer} className="min-w-0 scroll-mt-20">
          {selected && figures ? (
            <AreaDrawer key={selected.id} area={selected} figures={figures} year={year} months={months} kind={kind} comparisonMode={comparisonMode} onClose={() => select(null)} />
          ) : (
            <Overview rows={rows} period={period} running={months.some((item) => isInProgress(year, item))} located={located.length} total={areas.length} onSelect={select} onShowMissing={() => write({ [params.view]: 'siyahi', [params.missing]: 'yox' })} missing={missing.length} />
          )}
        </div>
      </div>
    </>
  )
}

function Heading({ filters }: { filters?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
      <div className="min-w-0">
        <nav aria-label="Yol" className="flex items-center gap-2 text-[15px] text-(--x-ink-2)">
          <Link to={overviewLinks.year(latestYear())} className="hover:text-(--x-ink) hover:underline">Müdiriyyət</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Ərazilər xəritəsi</span>
        </nav>
        <h1 id="page-title" tabIndex={-1} className="mt-1 text-[32px] font-extrabold leading-[1.1] tracking-[-0.025em] outline-none sm:text-[40px]">Ərazilər xəritəsi</h1>
        <p className="mt-1.5 text-lg text-(--x-ink-2)">Ərazini seçin, sifariş və xərcləri müqayisə edin</p>
      </div>
      {filters && <div className="flex flex-wrap items-center gap-2.5 2xl:justify-end">{filters}</div>}
    </header>
  )
}

/** What the map can and cannot show: a demonstration, coordinates still to come, pairs that were refused. */
function Banner({ sample, located, total, invalid, unknown }: { sample: boolean; located: number; total: number; invalid: number; unknown: string[] }) {
  const lines: string[] = []
  if (sample) lines.push('Vizual nümunə — lokasiyalar demonstrasiya üçündür: nöqtələr nizamlı şəbəkədə düzülüb, real yerləri göstərmir (yalnız inkişaf rejimi).')
  else if (located === 0) lines.push(`Ərazilərin koordinatları hələ daxil edilməyib. ${total} ərazinin hamısı siyahıda işləyir; real koordinatlar əlavə edildikcə xəritədə görünəcək.`)
  else if (located < total) lines.push(`${total} ərazidən ${total - located}-nin koordinatı yoxdur — onlar «Koordinat gözləyənlər» siyahısındadır.`)
  if (invalid) lines.push(`${invalid} ərazinin verilmiş koordinatı Azərbaycan ərazisindən kənardır və göstərilmir.`)
  if (unknown.length) lines.push(`Konfiqurasiyada məlumatda olmayan ərazi var: ${unknown.join(', ')}.`)
  if (lines.length === 0) return null
  return (
    <div role="note" className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-[15px] ${sample ? 'border-(--x-focus-year) bg-(--x-focus-year-soft)' : 'border-(--x-focus)/50 bg-(--x-band)'}`}>
      <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-0.5">{lines.map((line) => <p key={line}>{line}</p>)}</div>
    </div>
  )
}

/** The areas as a list, largest first: the way in for every area, pin or not. */
function AreaList({ rows, selectedId, onSelect, onlyMissing, total }: { rows: AreaRow[]; selectedId: string | null; onSelect: (id: string) => void; onlyMissing: boolean; total: number }) {
  return (
    <div className="flex min-h-[380px] flex-col">
      <p className="border-b border-(--x-line) px-4 py-2 text-sm text-(--x-ink-2)">
        {onlyMissing ? `Koordinatı olmayan ərazilər: ${rows.length}` : `${rows.length} / ${total} ərazi`}, məbləğə görə
      </p>
      {rows.length === 0 ? <p className="p-8 text-center text-sm text-(--x-muted)">Axtarışa uyğun ərazi yoxdur.</p> : (
        <ol className="relative max-h-[clamp(380px,62dvh,680px)] overflow-y-auto">
          {rows.map((row) => (
            <li key={row.area.id} className="border-b border-(--x-line) last:border-b-0">
              <button
                type="button"
                aria-pressed={row.area.id === selectedId}
                onClick={() => onSelect(row.area.id)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto_5rem] items-center gap-x-3 px-4 py-2.5 text-left hover:bg-(--x-band) aria-pressed:bg-(--x-band)"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold" title={row.area.name}>{row.area.name}</span>
                  <span className="flex items-center gap-1 text-[13px] text-(--x-muted)">
                    {row.area.location ? <><MapPin aria-hidden="true" className="size-3.5" />{row.area.location.source === 'sample' ? 'nümunə nöqtə' : 'xəritədə'}</> : <><MapPinOff aria-hidden="true" className="size-3.5" />{row.area.locationIssue ? 'koordinat yanlışdır' : 'koordinat daxil edilməyib'}</>}
                  </span>
                </span>
                <span className={`tnum text-right font-bold ${row.amount ? '' : 'text-(--x-muted)'}`}>{row.amount ? money(row.amount) : 'sifariş yoxdur'}</span>
                <span className="flex justify-end"><ChangeChip pct={row.pct} delta={row.delta} reason="müqayisə yoxdur" /></span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** Before an area is chosen: how many there are, how many are placed, and the largest of the period. */
function Overview({ rows, period, running, located, total, missing, onSelect, onShowMissing }: {
  rows: AreaRow[]
  period: string
  /** The period has a month still running. */
  running: boolean
  located: number
  total: number
  missing: number
  onSelect: (id: string) => void
  onShowMissing: () => void
}) {
  const top = [...rows].filter((row) => row.amount > 0).sort((left, right) => right.amount - left.amount).slice(0, 6)
  const active = rows.filter((row) => row.amount > 0).length
  return (
    <section aria-labelledby="map-overview" className="x-card flex flex-col px-5 pb-5 pt-5">
      <h2 id="map-overview" className="text-[22px] font-extrabold tracking-[-0.01em]">Ərazi seçin</h2>
      <p className="mt-1 text-[15px] text-(--x-ink-2)">Xəritədə nöqtəyə və ya siyahıda sətrə klikləyin: ərazinin sifarişləri, təsdiqi və müqayisəsi burada açılır.</p>
      <dl className="mt-4 grid grid-cols-3 divide-x divide-(--x-line) rounded-xl border border-(--x-line) bg-(--x-surface-2) py-3 text-center">
        <div><dt className="text-[13px] text-(--x-ink-2)">Ərazi</dt><dd className="tnum text-[22px] font-extrabold">{total}</dd></div>
        <div><dt className="text-[13px] text-(--x-ink-2)">Sifarişli</dt><dd className="tnum text-[22px] font-extrabold">{active}</dd></div>
        <div><dt className="text-[13px] text-(--x-ink-2)">Xəritədə</dt><dd className="tnum text-[22px] font-extrabold">{located}</dd></div>
      </dl>
      <h3 className="mt-5 text-[16px] font-extrabold">Ən çox xərc · {period}</h3>
      {top.length === 0 ? <p className="mt-2 text-sm text-(--x-muted)">Bu dövrdə sifariş yoxdur.</p> : (
        <ol className="mt-2 flex flex-col">
          {top.map((row) => (
            <li key={row.area.id} className="border-t border-(--x-line) first:border-t-0">
              <button type="button" onClick={() => onSelect(row.area.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto_4.75rem] items-center gap-x-3 rounded-lg px-2 py-2.5 text-left hover:bg-(--x-band)">
                <span className="truncate font-semibold" title={row.area.name}>{row.area.name}</span>
                <span className="tnum font-bold">{money(row.amount)}</span>
                <span className="flex justify-end"><ChangeChip pct={row.pct} delta={row.delta} reason="müqayisə yoxdur" /></span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {missing > 0 && (
        <button type="button" onClick={onShowMissing} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-(--x-line-2) px-4 text-sm font-semibold hover:bg-(--x-band)">
          <MapPinOff aria-hidden="true" className="size-4" />Koordinat gözləyən {missing} ərazi
        </button>
      )}
      <p className="mt-4 text-xs text-(--x-muted)">Fərq: ötən ilin eyni aylarına görə.{running ? ' Cari ay davam edir: məbləğ hələ arta bilər.' : ''}</p>
    </section>
  )
}
