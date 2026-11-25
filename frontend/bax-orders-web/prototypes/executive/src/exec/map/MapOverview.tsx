import { Link } from 'react-router'
import { ChevronRight, Link2, Link2Off, MapPin, MousePointerClick, TriangleAlert } from 'lucide-react'
import type { Kind } from '../../data/analysis'
import { money, percent } from '../../lib/format'
import { kindNames } from '../../lib/year'
import { overviewLinks } from '../../overview/links'
import type { AreaRow, LinkCoverage, PeriodCoverage } from '../../overview/areas'
import { modeLabel, rangeLabel, type CompareMode, type YearMonth } from '../../overview/compare'
import { ChangeChip } from '../ui'

/*
 * «Ərazi analitikası» before a location is chosen: how many locations there are, how many have confirmed figures, how
 * much of the period's money stands on the map and how much does not (each object counted once), and the largest
 * linked areas. Nothing is shown for a location without confirmed figures but its existence.
 */

export function MapOverview({ rows, coverage, links, span, kind, mode, manager, year, sourceNote, onSelect }: {
  /** The locations the filters leave. */
  rows: readonly AreaRow[]
  /** How many records the source has, and which of them are not drawn on their own. */
  sourceNote: string
  coverage: PeriodCoverage
  links: LinkCoverage
  span: readonly YearMonth[]
  kind: Kind
  mode: CompareMode
  manager: string | null
  year: number
  onSelect: (id: string) => void
}) {
  const linked = rows.filter((row) => row.area.finance.state === 'linked')
  const review = rows.filter((row) => row.area.location.status !== 'VERIFIED')
  // One row per object: two pins on one bill are one line here.
  const seen = new Set<string>()
  const top = linked
    .filter((row) => row.amount !== null && row.amount > 0)
    .sort((left, right) => (right.amount ?? 0) - (left.amount ?? 0) || left.area.location.name.localeCompare(right.area.location.name, 'az'))
    .filter((row) => {
      const id = row.area.finance.state === 'linked' ? row.area.finance.siteId : ''
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .slice(0, 6)
  const share = coverage.total ? (coverage.linked ?? 0) / coverage.total : null
  const period = rangeLabel(span)

  return (
    <section aria-labelledby="map-overview" className="x-card flex flex-col gap-4 p-4 sm:p-5">
      <div>
        <h2 id="map-overview" className="text-[22px] font-extrabold tracking-[-0.01em]">Ərazi analitikası</h2>
        <p className="mt-1 flex items-start gap-2 text-[15px] text-(--x-ink-2)">
          <MousePointerClick aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Təhlili görmək üçün xəritədən ərazi seçin — və ya siyahıdan.
        </p>
      </div>

      <dl className="grid grid-cols-3 divide-x divide-(--x-line) rounded-xl border border-(--x-line) bg-(--x-surface-2) py-3 text-center">
        <div className="px-2">
          <dt className="text-[12.5px] text-(--x-ink-2)">{manager ? 'Lokasiya (filtr)' : 'Lokasiya'}</dt>
          <dd className="tnum text-[24px] font-extrabold">{rows.length}</dd>
        </div>
        <div className="px-2">
          <dt className="text-[12.5px] text-(--x-ink-2)">Maliyyə ilə bağlı</dt>
          <dd className="tnum text-[24px] font-extrabold">{linked.length}</dd>
        </div>
        <div className="px-2">
          <dt className="text-[12.5px] text-(--x-ink-2)">Yoxlanılmalı</dt>
          <dd className="tnum text-[24px] font-extrabold">{review.length}</dd>
        </div>
      </dl>
      <p className="-mt-2 text-[12.5px] text-(--x-muted)">{sourceNote}.</p>

      <section aria-labelledby="map-coverage" className="rounded-xl border border-(--x-line) px-4 py-3.5">
        <h3 id="map-coverage" className="text-[15px] font-extrabold">Dövrün məbləği · {period}</h3>
        <p className="text-[13px] text-(--x-ink-2)">{kindNames[kind]} · bütün obyektlər, hər biri bir dəfə</p>
        {coverage.total === null ? (
          <p className="mt-2 text-sm text-(--x-muted)">Bu dövr üçün məlumat yoxdur.</p>
        ) : (
          <>
            <p className="tnum mt-2 text-[26px] font-extrabold leading-none tracking-[-0.02em]">{money(coverage.total)}</p>
            <div aria-hidden="true" className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-(--x-band)">
              <span className="h-full bg-(--x-prev)" style={{ width: `${(share ?? 0) * 100}%` }} />
            </div>
            <dl className="mt-2.5 flex flex-col gap-1 text-[13.5px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5"><Link2 aria-hidden="true" className="size-4 text-(--x-prev-ink)" />Xəritədəki {links.linked} nöqtənin obyektləri</dt>
                <dd className="tnum font-bold">{money(coverage.linked)}{share !== null && <span className="font-medium text-(--x-ink-2)"> · {percent(share, false)}</span>}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5"><Link2Off aria-hidden="true" className="size-4 text-(--x-muted)" />Xəritəyə bağlanmayan {links.unlinkedSites.length} obyekt</dt>
                <dd className="tnum font-bold">{money(coverage.unlinked)}</dd>
              </div>
            </dl>
          </>
        )}
      </section>

      <section aria-labelledby="map-top">
        <h3 id="map-top" className="text-[15px] font-extrabold">Ən çox xərc · {period}</h3>
        <p className="text-[13px] text-(--x-ink-2)">Fərq: {modeLabel(mode, span.length === 1).toLocaleLowerCase('az')} ilə{manager ? ` · ${manager}` : ''}</p>
        {top.length === 0 ? <p className="mt-2 text-sm text-(--x-muted)">Bu dövrdə maliyyə ilə bağlı ərazilərdə sifariş yoxdur.</p> : (
          <ol className="mt-1.5 flex flex-col">
            {top.map((row) => (
              <li key={row.area.location.id} className="border-t border-(--x-line) first:border-t-0">
                <button type="button" onClick={() => onSelect(row.area.location.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto_4.75rem] items-center gap-x-3 rounded-lg px-2 py-2 text-left hover:bg-(--x-band)">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold" title={row.area.location.name}>{row.area.location.name}</span>
                    <span className="block truncate text-[12.5px] text-(--x-ink-2)">{row.area.location.manager ?? 'Rəhbər: məlumat yoxdur'}</span>
                  </span>
                  <span className="tnum font-bold">{money(row.amount)}</span>
                  <span className="flex justify-end"><ChangeChip pct={row.comparison?.pct ?? null} delta={row.comparison?.delta ?? null} reason="müqayisə yoxdur" /></span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {coverage.unlinkedSites.length > 0 && (
        <details className="group rounded-xl border border-(--x-line) px-4 py-2.5">
          <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-[14px] font-semibold">
            <span className="flex items-center gap-2"><Link2Off aria-hidden="true" className="size-4 text-(--x-muted)" />Xəritəyə bağlanmayan maliyyə obyektləri ({coverage.unlinkedSites.length})</span>
            <ChevronRight aria-hidden="true" className="size-4 transition-transform group-open:rotate-90" />
          </summary>
          <p className="mt-1 text-[12.5px] text-(--x-muted)">Bu obyektlərin hələ təsdiqlənmiş nöqtəsi yoxdur. Məbləğləri ümumi cəmdədir, xəritədə göstərilmir.</p>
          <ul className="mt-2 flex flex-col">
            {coverage.unlinkedSites.map((site) => (
              <li key={site.id} className="border-t border-(--x-line) first:border-t-0">
                <Link to={overviewLinks.siteYear(year, site.id, kind)} className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5 text-[13.5px] hover:bg-(--x-band)">
                  <span className="truncate">{site.name}</span>
                  <span className={`tnum shrink-0 ${site.amount ? 'font-semibold' : 'text-(--x-muted)'}`}>{site.amount ? money(site.amount) : 'sifariş yoxdur'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      {(links.unknownSites.length > 0 || links.orphanLinks.length > 0) && (
        <p role="note" className="flex items-start gap-2 rounded-xl border border-dashed border-(--x-line-2) px-3.5 py-2.5 text-[13px] text-(--x-ink-2)">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            {links.unknownSites.length > 0 && <>Uyğunlaşdırma cədvəlində cari məlumatda olmayan obyekt var: {links.unknownSites.map((item) => `${item.locationId} → ${item.siteId}`).join(', ')}. </>}
            {links.orphanLinks.length > 0 && <>Lokasiya faylında olmayan qeyd üçün sətir var: {links.orphanLinks.join(', ')}.</>}
          </span>
        </p>
      )}

      <p className="flex items-start gap-2 text-xs text-(--x-muted)">
        <MapPin aria-hidden="true" className="mt-px size-3.5 shrink-0" />
        Lokasiyalar sahibin «Areas» cədvəlindəndir. Maliyyə yalnız təsdiqlənmiş uyğunluqla göstərilir: uyğunlaşdırılmamış nöqtədə məbləğ göstərilmir, sıfır da yazılmır.
      </p>
    </section>
  )
}
