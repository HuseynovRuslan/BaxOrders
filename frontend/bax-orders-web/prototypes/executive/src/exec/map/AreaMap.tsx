import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Minus, Plus, RefreshCw, Scan, TriangleAlert } from 'lucide-react'
import { clusterPoints } from './cluster'

/*
 * The areas on a map: Leaflet with OpenStreetMap's own tiles — no key, no account; another tile service is one setting
 * away (VITE_MAP_TILES, VITE_MAP_ATTRIBUTION). The tiles follow the theme by a filter (exec.css); pins and clusters are
 * drawn in the frame's colours. Every pin stands at its record's own coordinates. Pins that would overlap at the current
 * zoom gather into a numbered circle (`cluster.ts`) — only on screen: each record stays its own. A click on a circle
 * zooms to its pins; where zooming cannot part them (the deepest zoom, the same spot) it lists them to choose from. The
 * chosen pin is never hidden in a circle. Every pin and circle can be reached with Tab and opened with Enter.
 *
 * What a pin or a circle is shows in a card of the page's own (`MapTip`), not in Leaflet's tooltip: a card sized for a
 * long official name (it wraps at ~340 px instead of squeezing every word onto its own line), in the theme's surface and
 * line, kept inside the map on every side, and never in the way of a click. It opens for a mouse that hovers and for the
 * keyboard's focus, not for a tap — a tap opens the area itself. A screen reader hears the same words once, from the
 * pin's own label; the card is hidden from it.
 */

export interface MapPoint {
  id: string
  name: string
  /** «Ərazi rəhbəri», or null when the source has none. */
  manager: string | null
  lat: number
  lng: number
  /** Linked to its figures and ordering in the period, linked but quiet, or with no confirmed figures. */
  tone: 'active' | 'quiet' | 'unlinked'
  /** The source asks for its coordinates to be checked (NEEDS_REVIEW, POSSIBLE_DUPLICATE). */
  review: boolean
  /** The source's review status in words, when it is not «verified». */
  note: string | null
  /** What the card says under the name: the period's amount, or why there is none. */
  detail: string
  /** Larger first when pins gather. */
  weight: number
}

export interface MapControl {
  /** Frames the given points, or every point when none are given. */
  fitAll: (ids?: readonly string[]) => void
  /** Brings a point into view, close enough to tell it from its neighbours. */
  focusOn: (id: string) => void
}

const TILES = import.meta.env.VITE_MAP_TILES || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> töhfəçiləri'
/** Baku: where the map opens before it has anything to frame. */
const HOME: L.LatLngTuple = [40.4093, 49.8671]
const CLUSTER_RADIUS = 40
const MAX_ZOOM = 19
/** A pin's height above its point, and the card's gap from it. */
const PIN_HEIGHT = 38
const TIP_GAP = 10
/** The card's least distance from the map's edges. */
const TIP_MARGIN = 8

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)

function pinHtml(point: MapPoint, selected: boolean): string {
  const label = selected ? `<span class="x-pin-label">${escapeHtml(point.name)}</span>` : ''
  // A record whose coordinates the source asks to check carries a «!» instead of the dot: a shape, not only a colour.
  const centre = point.review
    ? '<text x="15" y="19.5" text-anchor="middle" class="x-pin-glyph">!</text>'
    : '<circle cx="15" cy="15" r="5"/>'
  return `${label}<svg viewBox="0 0 30 40" aria-hidden="true" class="x-pin-shape"><path d="M15 38.5S27.5 25.6 27.5 15A12.5 12.5 0 0 0 2.5 15c0 10.6 12.5 23.5 12.5 23.5z"/>${centre}</svg>`
}

const spoken = (point: MapPoint) => `${point.name}. Ərazi rəhbəri: ${point.manager ?? 'məlumat yoxdur'}. ${point.detail}${point.note ? `. ${point.note}` : ''}`

/** A mouse that can hover; a finger cannot — a tap opens the area, with no card left standing over the map. */
const canHover = () => window.matchMedia?.('(hover: hover)')?.matches ?? true

/** What the card is about, and where on the map (in the map's own pixels) it points to. */
type Tip =
  | { kind: 'pin'; point: MapPoint; x: number; y: number; via: 'pointer' | 'focus' }
  | { kind: 'cluster'; members: MapPoint[]; x: number; y: number; size: number; via: 'pointer' | 'focus' }

export function AreaMap({ points, selectedId, onSelect, control, label = 'Ərazilər xəritəsi' }: {
  points: readonly MapPoint[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Filled in with the map's own actions, for the buttons outside it. */
  control?: { current: MapControl | null }
  label?: string
}) {
  const frame = useRef<HTMLDivElement>(null)
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const tiles = useRef<L.TileLayer | null>(null)
  const [tileProblem, setTileProblem] = useState(false)
  const [tip, setTip] = useState<Tip | null>(null)
  // The latest props, for Leaflet's own events.
  const latest = useRef({ points, selectedId, onSelect })
  latest.current = { points, selectedId, onSelect }

  /** Leaflet cannot frame anything in a box with no size (a hidden tab, a test page). */
  const hasSize = () => {
    const box = map.current?.getSize()
    return Boolean(box && box.x > 0 && box.y > 0)
  }

  function fitAll(ids?: readonly string[]) {
    const current = map.current
    const all = ids ? latest.current.points.filter((point) => ids.includes(point.id)) : latest.current.points
    if (!current || all.length === 0 || !hasSize()) return
    if (all.length === 1) current.setView([all[0].lat, all[0].lng], 15)
    else current.fitBounds(L.latLngBounds(all.map((point) => [point.lat, point.lng] as L.LatLngTuple)), { padding: [40, 40], maxZoom: 15 })
  }

  function focusOn(id: string) {
    const current = map.current
    const point = latest.current.points.find((item) => item.id === id)
    if (!current || !point || !hasSize()) return
    current.setView([point.lat, point.lng], Math.max(current.getZoom(), 15))
  }

  /** The pins a circle holds, to choose one where zooming cannot part them. */
  function chooser(members: readonly MapPoint[], at: L.LatLng) {
    const current = map.current
    if (!current) return
    setTip(null)
    const box = document.createElement('div')
    box.className = 'x-cluster-list'
    const heading = document.createElement('p')
    heading.className = 'x-cluster-list-title'
    heading.textContent = `Bu yerdə ${members.length} ərazi`
    box.append(heading)
    const list = document.createElement('ul')
    for (const point of members) {
      const item = document.createElement('li')
      const button = document.createElement('button')
      button.type = 'button'
      button.innerHTML = `<span class="x-cluster-list-name">${escapeHtml(point.name)}</span><span class="x-cluster-list-meta">${escapeHtml(point.id)} · ${escapeHtml(point.manager ?? 'rəhbər: məlumat yoxdur')}</span>`
      button.addEventListener('click', () => {
        current.closePopup()
        latest.current.onSelect(point.id)
      })
      item.append(button)
      list.append(item)
    }
    box.append(list)
    box.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        current.closePopup()
      }
    })
    L.popup({ className: 'x-cluster-popup', maxWidth: 320, minWidth: 240, autoPanPadding: [24, 24] }).setLatLng(at).setContent(box).openOn(current)
    box.querySelector('button')?.focus()
  }

  /** The card for a pin or a circle, opened by a hovering mouse (not by a tap) or by the keyboard's focus. */
  function bindTip(marker: L.Marker, icon: HTMLElement | undefined, about: (via: Tip['via']) => Tip) {
    marker.on('mouseover', () => { if (canHover()) setTip(about('pointer')) })
    marker.on('mouseout', () => setTip(null))
    icon?.addEventListener('focus', () => setTip(about('focus')))
    icon?.addEventListener('blur', () => setTip(null))
  }

  function draw() {
    const current = map.current
    const group = layer.current
    if (!current || !group) return
    // Pins are drawn anew: a card standing for one of the old ones would point at nothing.
    setTip(null)
    group.clearLayers()
    const { points: all, selectedId: selected, onSelect: select } = latest.current
    const zoom = current.getZoom()
    const clusters = clusterPoints(all.map((point) => {
      const pixel = current.project([point.lat, point.lng], zoom)
      return { id: point.id, x: pixel.x, y: pixel.y, weight: point.weight, item: point }
    }), CLUSTER_RADIUS, selected)

    for (const cluster of clusters) {
      if (cluster.members.length === 1) {
        const point = cluster.members[0].item
        const isSelected = point.id === selected
        const marker = L.marker([point.lat, point.lng], {
          icon: L.divIcon({
            className: `x-marker is-${point.tone}${point.review ? ' is-review' : ''}${isSelected ? ' is-selected' : ''}`,
            html: pinHtml(point, isSelected),
            iconSize: isSelected ? [38, 50] : [28, PIN_HEIGHT],
            iconAnchor: isSelected ? [19, 48] : [14, PIN_HEIGHT - 1],
          }),
          keyboard: true,
          riseOnHover: true,
          zIndexOffset: isSelected ? 1000 : point.tone === 'active' ? 100 : 0,
        })
        marker.on('click', () => {
          setTip(null)
          select(point.id)
        })
        marker.addTo(group)
        const icon = marker.getElement()
        icon?.setAttribute('role', 'button')
        icon?.setAttribute('aria-label', spoken(point))
        icon?.setAttribute('data-location', point.id)
        icon?.setAttribute('aria-pressed', isSelected ? 'true' : 'false')
        // The chosen pin carries its name on a plate already: no card over it.
        if (!isSelected) {
          bindTip(marker, icon, (via) => {
            const at = current.latLngToContainerPoint([point.lat, point.lng])
            return { kind: 'pin', point, x: at.x, y: at.y, via }
          })
        }
      } else {
        const members = cluster.members.map((member) => member.item)
        const centre = current.unproject([cluster.x, cluster.y], zoom)
        const size = members.length >= 10 ? 48 : 40
        const anyActive = members.some((point) => point.tone === 'active')
        const marker = L.marker(centre, {
          icon: L.divIcon({
            className: `x-cluster${anyActive ? '' : ' is-quiet'}`,
            html: `<span>${members.length}</span>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
          keyboard: true,
          zIndexOffset: 500,
        })
        marker.on('click', () => {
          setTip(null)
          const bounds = L.latLngBounds(members.map((point) => [point.lat, point.lng] as L.LatLngTuple))
          const target = hasSize() ? current.getBoundsZoom(bounds, false, L.point(64, 64)) : current.getZoom()
          // Zooming in parts them only while there is zoom left; otherwise they are listed.
          if (current.getZoom() < MAX_ZOOM - 1 && target > current.getZoom()) current.fitBounds(bounds, { padding: [64, 64], maxZoom: MAX_ZOOM })
          else chooser(members, centre)
        })
        marker.on('contextmenu', () => chooser(members, centre))
        marker.addTo(group)
        const icon = marker.getElement()
        icon?.setAttribute('role', 'button')
        icon?.setAttribute('data-cluster', String(members.length))
        icon?.setAttribute('aria-label', `${members.length} ərazi bir yerdə: ${namesOf(members).map(({ name, count }) => (count > 1 ? `${name} (${count} qeyd)` : name)).join(', ')}. Yaxınlaşdırın və ya seçin`)
        bindTip(marker, icon, (via) => {
          const at = current.latLngToContainerPoint(centre)
          return { kind: 'cluster', members, x: at.x, y: at.y, size, via }
        })
      }
    }
  }

  // The map is made once; Leaflet keeps it, React keeps only the box it lives in.
  useEffect(() => {
    if (!element.current) return
    const created = L.map(element.current, { zoomControl: false, attributionControl: true, minZoom: 7, maxZoom: MAX_ZOOM, worldCopyJump: false })
    created.setView(HOME, 11)
    const tileLayer = L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: MAX_ZOOM, crossOrigin: true })
    // A basemap that does not load is said, not hidden: the pins still stand at their coordinates.
    let errors = 0
    let loaded = 0
    tileLayer.on('loading', () => { errors = 0; loaded = 0 })
    tileLayer.on('tileerror', () => { errors++ })
    tileLayer.on('tileload', () => { loaded++ })
    tileLayer.on('load', () => setTileProblem(errors > 0 && loaded === 0))
    tileLayer.addTo(created)
    tiles.current = tileLayer
    created.attributionControl.setPrefix(false)
    L.control.scale({ imperial: false, position: 'bottomright', maxWidth: 110 }).addTo(created)
    layer.current = L.layerGroup().addTo(created)
    map.current = created
    created.on('zoomend', draw)
    // A card points at a spot on the screen: when the map moves under it, it goes.
    created.on('movestart zoomstart', () => setTip(null))
    // Where the browser has no ResizeObserver (an old one, a test page) the map keeps its first size.
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => created.invalidateSize())
    resize?.observe(element.current)
    if (control) control.current = { fitAll, focusOn }
    const chosen = latest.current.points.find((point) => point.id === latest.current.selectedId)
    if (chosen && hasSize()) created.setView([chosen.lat, chosen.lng], 15)
    else fitAll()
    draw()
    return () => {
      resize?.disconnect()
      created.remove()
      map.current = null
      layer.current = null
      tiles.current = null
      if (control) control.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // New pins (another period, a filter): drawn again.
  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points])

  // A newly chosen area comes into view if it is off the map.
  useEffect(() => {
    draw()
    const current = map.current
    const point = points.find((item) => item.id === selectedId)
    if (current && point && hasSize() && !current.getBounds().pad(-0.12).contains([point.lat, point.lng])) current.panTo([point.lat, point.lng])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // Escape puts the card away first (content shown on hover must be dismissible where it stands); the next Escape is the
  // page's — it closes the chosen area.
  useEffect(() => {
    if (!tip) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setTip(null)
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [tip])

  const controlButton = 'grid size-10 place-items-center hover:bg-(--x-band) focus-visible:outline-offset-[-2px]'
  return (
    <div ref={frame} className="x-map relative h-full w-full">
      <div ref={element} className="absolute inset-0 z-0" role="region" aria-label={label} />
      {tip && <MapTip tip={tip} frame={frame} />}
      <div data-map-control className="absolute right-3 top-3 z-[500] flex flex-col overflow-hidden rounded-lg border border-(--x-line-2) bg-(--x-surface) shadow-(--x-shadow)">
        <button type="button" onClick={() => map.current?.zoomIn()} aria-label="Yaxınlaşdır" title="Yaxınlaşdır" className={controlButton}>
          <Plus aria-hidden="true" className="size-5" />
        </button>
        <span aria-hidden="true" className="h-px bg-(--x-line)" />
        <button type="button" onClick={() => map.current?.zoomOut()} aria-label="Uzaqlaşdır" title="Uzaqlaşdır" className={controlButton}>
          <Minus aria-hidden="true" className="size-5" />
        </button>
        <span aria-hidden="true" className="h-px bg-(--x-line)" />
        <button type="button" onClick={() => fitAll()} aria-label="Bütün nöqtələri göstər" title="Bütün nöqtələri göstər" className={controlButton}>
          <Scan aria-hidden="true" className="size-5" />
        </button>
      </div>
      {tileProblem && (
        <div role="status" className="absolute inset-x-3 top-3 z-[600] mr-14 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-(--x-line-2) bg-(--x-surface) px-3.5 py-2.5 text-sm shadow-(--x-shadow) sm:right-auto sm:max-w-md">
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-(--x-ink-2)" />
          <span className="min-w-0 flex-1">Xəritə altlığı yüklənmədi. Nöqtələr öz koordinatlarındadır; «Siyahı» görünüşü tam işləyir.</span>
          <button type="button" onClick={() => { setTileProblem(false); tiles.current?.redraw() }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-(--x-line-2) px-2.5 font-semibold hover:bg-(--x-band)">
            <RefreshCw aria-hidden="true" className="size-4" />Yenidən
          </button>
        </div>
      )}
    </div>
  )
}

/** A circle's names, each once: two records of one name are one line with their count. */
function namesOf(members: readonly MapPoint[]): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const point of members) counts.set(point.name, (counts.get(point.name) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count }))
}

const LISTED = 5

/**
 * The card over a pin or a circle. Placed above its point and centred on it; moved in from the map's left and right
 * edges, put under the point where there is no room above, and kept clear of the map's buttons (`data-map-control`).
 * It takes no clicks: the pin under it stays clickable.
 */
function MapTip({ tip, frame }: { tip: Tip; frame: { current: HTMLDivElement | null } }) {
  const card = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<{ left: number; top: number; arrow: number; below: boolean } | null>(null)

  useLayoutEffect(() => {
    const box = card.current
    const map = frame.current
    if (!box || !map) return
    const width = box.offsetWidth
    const height = box.offsetHeight
    const room = { width: map.clientWidth, height: map.clientHeight }
    const rise = tip.kind === 'pin' ? PIN_HEIGHT : tip.size / 2
    const drop = tip.kind === 'pin' ? 2 : tip.size / 2
    let top = tip.y - rise - TIP_GAP - height
    const below = top < TIP_MARGIN
    if (below) top = Math.min(tip.y + drop + TIP_GAP, Math.max(TIP_MARGIN, room.height - height - TIP_MARGIN))
    let left = Math.min(Math.max(tip.x - width / 2, TIP_MARGIN), Math.max(TIP_MARGIN, room.width - width - TIP_MARGIN))
    // The map's own buttons (zoom, fit, full screen) stay in sight: a card that would run under them moves to their left.
    const origin = map.getBoundingClientRect()
    const controls = [...(map.parentElement ?? map).querySelectorAll('[data-map-control]')].map((item) => item.getBoundingClientRect())
    if (controls.length > 0) {
      const guard = {
        left: Math.min(...controls.map((item) => item.left)) - origin.left - TIP_GAP,
        bottom: Math.max(...controls.map((item) => item.bottom)) - origin.top + TIP_GAP,
      }
      if (top < guard.bottom && left + width > guard.left) left = Math.max(TIP_MARGIN, guard.left - width)
    }
    setPlace({ left, top, arrow: Math.min(Math.max(tip.x - left, 14), Math.max(14, width - 14)), below })
  }, [tip, frame])

  const help = tip.via === 'focus'
    ? (tip.kind === 'pin' ? 'Ətraflı baxmaq üçün Enter basın' : 'Yaxınlaşdırmaq və ya seçmək üçün Enter basın')
    : (tip.kind === 'pin' ? 'Ətraflı baxmaq üçün klikləyin' : 'Yaxınlaşdırmaq və ya seçmək üçün klikləyin')

  return (
    <div
      ref={card}
      aria-hidden="true"
      data-map-tip={tip.kind}
      className={`x-tip-card${place?.below ? ' is-below' : ''}`}
      style={place ? { left: place.left, top: place.top, '--x-tip-arrow': `${place.arrow}px` } as CSSProperties : { left: 0, top: 0, visibility: 'hidden' }}
    >
      {tip.kind === 'pin' ? (
        <>
          <div className="x-tip-head">
            <TipGlyph tone={tip.point.tone} review={tip.point.review} />
            <p className="x-tip-name">{tip.point.name}</p>
          </div>
          <p className="x-tip-line"><span className="x-tip-label">Ərazi rəhbəri:</span> {tip.point.manager ?? 'məlumat yoxdur'}</p>
          <p className="x-tip-line x-tip-detail">{tip.point.detail}</p>
          {tip.point.note && <p className="x-tip-line x-tip-note"><TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />{tip.point.note}</p>}
        </>
      ) : (
        <>
          <div className="x-tip-head">
            <span className="x-tip-count">{tip.members.length}</span>
            <p className="x-tip-name">{tip.members.length} ərazi bu yerdə</p>
          </div>
          <ul className="x-tip-list">
            {namesOf(tip.members).slice(0, LISTED).map(({ name, count }) => (
              <li key={name}>{name}{count > 1 && <span className="x-tip-label"> · {count} qeyd</span>}</li>
            ))}
          </ul>
          {namesOf(tip.members).length > LISTED && <p className="x-tip-line x-tip-label">və daha {namesOf(tip.members).length - LISTED} ərazi</p>}
        </>
      )}
      <p className="x-tip-help">{help}</p>
    </div>
  )
}

function TipGlyph({ tone, review }: { tone: MapPoint['tone']; review: boolean }) {
  return (
    <svg viewBox="0 0 30 40" aria-hidden="true" className={`x-legend-pin x-tip-pin is-${tone}${review ? ' is-review' : ''}`}>
      <path d="M15 38.5S27.5 25.6 27.5 15A12.5 12.5 0 0 0 2.5 15c0 10.6 12.5 23.5 12.5 23.5z" />
      {review ? <text x="15" y="19.5" textAnchor="middle" className="x-pin-glyph">!</text> : <circle cx="15" cy="15" r="5" />}
    </svg>
  )
}
