import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Minus, Plus } from 'lucide-react'
import { money } from '../../lib/format'
import { clusterPoints } from './cluster'

/*
 * The areas on a map (Variant A: pins, no district shapes). Leaflet with OpenStreetMap's own tiles — no key, no account;
 * another tile service is one setting away (VITE_MAP_TILES, VITE_MAP_ATTRIBUTION), for when the site grows past OSM's
 * fair use. The tiles follow the theme by a filter (exec.css); the pins and clusters are drawn in the frame's colours.
 * Pins that would overlap gather into a numbered circle (`cluster.ts`); a click on one zooms to its pins. Every pin can
 * be reached with Tab and opened with Enter.
 */

export interface MapPoint {
  id: string
  name: string
  lat: number
  lng: number
  amount: number
  /** Orders in the period: a pin without them is drawn quieter. */
  active: boolean
}

export interface MapControl {
  fitAll: () => void
}

const TILES = import.meta.env.VITE_MAP_TILES || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> töhfəçiləri'
/** Baku: where the map opens before there is anything to show. */
const HOME: L.LatLngTuple = [40.4093, 49.8671]
const CLUSTER_RADIUS = 46

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)

function pinHtml(point: MapPoint, selected: boolean): string {
  const label = selected ? `<span class="x-pin-label">${escapeHtml(point.name)}</span>` : ''
  return `${label}<svg viewBox="0 0 30 40" aria-hidden="true" class="x-pin-shape"><path d="M15 38.5S27.5 25.6 27.5 15A12.5 12.5 0 0 0 2.5 15c0 10.6 12.5 23.5 12.5 23.5z"/><circle cx="15" cy="15" r="5"/></svg>`
}

export function AreaMap({ points, selectedId, onSelect, control }: {
  points: readonly MapPoint[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Filled in with the map's own actions, for the buttons outside it. */
  control?: { current: MapControl | null }
}) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  // The latest props, for Leaflet's own events.
  const latest = useRef({ points, selectedId, onSelect })
  latest.current = { points, selectedId, onSelect }

  function fitAll() {
    const current = map.current
    const all = latest.current.points
    if (!current || all.length === 0) return
    if (all.length === 1) current.setView([all[0].lat, all[0].lng], 14)
    else current.fitBounds(L.latLngBounds(all.map((point) => [point.lat, point.lng] as L.LatLngTuple)), { padding: [48, 48], maxZoom: 15 })
  }

  function draw() {
    const current = map.current
    const group = layer.current
    if (!current || !group) return
    group.clearLayers()
    const { points: all, selectedId: selected, onSelect: select } = latest.current
    const zoom = current.getZoom()
    const clusters = clusterPoints(all.map((point) => {
      const pixel = current.project([point.lat, point.lng], zoom)
      return { id: point.id, x: pixel.x, y: pixel.y, weight: point.amount, item: point }
    }), CLUSTER_RADIUS, selected)

    for (const cluster of clusters) {
      if (cluster.members.length === 1) {
        const point = cluster.members[0].item
        const isSelected = point.id === selected
        const marker = L.marker([point.lat, point.lng], {
          icon: L.divIcon({
            className: `x-marker${isSelected ? ' is-selected' : ''}${point.active ? '' : ' is-quiet'}`,
            html: pinHtml(point, isSelected),
            iconSize: isSelected ? [40, 52] : [30, 40],
            iconAnchor: isSelected ? [20, 50] : [15, 39],
          }),
          keyboard: true,
          riseOnHover: true,
          zIndexOffset: isSelected ? 1000 : 0,
        })
        marker.on('click', () => select(point.id))
        if (!isSelected) marker.bindTooltip(`<strong>${escapeHtml(point.name)}</strong><br>${point.active ? money(point.amount) : 'bu dövrdə sifariş yoxdur'}`, { direction: 'top', offset: [0, -36], className: 'x-map-tip' })
        marker.addTo(group)
        const icon = marker.getElement()
        icon?.setAttribute('role', 'button')
        icon?.setAttribute('aria-label', `${point.name}: ${point.active ? money(point.amount) : 'bu dövrdə sifariş yoxdur'}`)
        if (isSelected) icon?.setAttribute('aria-pressed', 'true')
      } else {
        const members = cluster.members.map((member) => member.item)
        const centre = current.unproject([cluster.x, cluster.y], zoom)
        const size = members.length >= 10 ? 52 : 44
        const marker = L.marker(centre, {
          icon: L.divIcon({ className: 'x-cluster', html: `<span>${members.length}</span>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
          keyboard: true,
        })
        marker.on('click', () => {
          const bounds = L.latLngBounds(members.map((point) => [point.lat, point.lng] as L.LatLngTuple))
          if (current.getZoom() >= current.getMaxZoom() - 1 || bounds.getNorthEast().equals(bounds.getSouthWest())) current.setView(bounds.getCenter(), current.getMaxZoom())
          else current.fitBounds(bounds, { padding: [64, 64] })
        })
        marker.bindTooltip(members.slice(0, 6).map((point) => escapeHtml(point.name)).join('<br>') + (members.length > 6 ? `<br>+${members.length - 6}` : ''), { direction: 'top', offset: [0, -size / 2], className: 'x-map-tip' })
        marker.addTo(group)
        const icon = marker.getElement()
        icon?.setAttribute('role', 'button')
        icon?.setAttribute('aria-label', `${members.length} ərazi bir yerdə: ${members.map((point) => point.name).join(', ')}. Yaxınlaşdır`)
      }
    }
  }

  // The map is made once; Leaflet keeps it, React keeps only the box it lives in.
  useEffect(() => {
    if (!element.current) return
    const created = L.map(element.current, { zoomControl: false, attributionControl: true, minZoom: 6, maxZoom: 18, worldCopyJump: false })
    created.setView(HOME, 11)
    L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19, crossOrigin: true }).addTo(created)
    created.attributionControl.setPrefix(false)
    layer.current = L.layerGroup().addTo(created)
    map.current = created
    created.on('zoomend', draw)
    const resize = new ResizeObserver(() => created.invalidateSize())
    resize.observe(element.current)
    if (control) control.current = { fitAll }
    if (latest.current.points.length) fitAll()
    draw()
    return () => {
      resize.disconnect()
      created.remove()
      map.current = null
      layer.current = null
      if (control) control.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // New pins (another period, a search): drawn again; the first time there are any, the map frames them.
  const framed = useRef(points.length > 0)
  useEffect(() => {
    if (!framed.current && points.length) {
      framed.current = true
      fitAll()
    }
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points])

  // A newly chosen area comes into view if it is off the map.
  useEffect(() => {
    draw()
    const current = map.current
    const point = points.find((item) => item.id === selectedId)
    if (current && point && !current.getBounds().pad(-0.1).contains([point.lat, point.lng])) current.panTo([point.lat, point.lng])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  return (
    <div className="x-map relative h-full min-h-[360px] w-full">
      <div ref={element} className="absolute inset-0 z-0" role="region" aria-label="Ərazilər xəritəsi" />
      <div className="absolute right-3 top-3 z-[500] flex flex-col overflow-hidden rounded-lg border border-(--x-line-2) bg-(--x-surface) shadow-(--x-shadow)">
        <button type="button" onClick={() => map.current?.zoomIn()} aria-label="Yaxınlaşdır" className="grid size-10 place-items-center hover:bg-(--x-band)">
          <Plus aria-hidden="true" className="size-5" />
        </button>
        <span aria-hidden="true" className="h-px bg-(--x-line)" />
        <button type="button" onClick={() => map.current?.zoomOut()} aria-label="Uzaqlaşdır" className="grid size-10 place-items-center hover:bg-(--x-band)">
          <Minus aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  )
}
