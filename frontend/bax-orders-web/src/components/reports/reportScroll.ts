import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react'

/**
 * How the table's box scrolls sideways (UI V2 03 §4.1–§4.3, §6.3; D-51, S-2a = A).
 *
 * The page never scrolls sideways: at every desktop width the table scrolls inside its own box, with the object and the
 * year pinned either side. These are the measurements that follow from that — where the months are in the box, which of
 * them are wholly in sight, where a page of months forward or back is, and where the box opens — kept as plain functions
 * of the geometry so they can be checked without a browser, and one hook that reads the geometry from the page.
 */

/** A month column in the box's content coordinates: 0 is the table's left edge, before any scrolling. */
export interface MonthColumn {
  left: number
  width: number
}

export interface BoxGeometry {
  months: readonly MonthColumn[]
  /** The pinned columns' widths: the months pass under them. */
  objectWidth: number
  yearWidth: number
  clientWidth: number
  scrollWidth: number
  scrollLeft: number
}

export interface BoxScroll {
  /** Whether the table is wider than its box: only then are there months to move to. */
  scrolls: boolean
  atStart: boolean
  atEnd: boolean
  /** The first and last month wholly between the pinned columns, January = 0. */
  first: number | null
  last: number | null
  /** How wide the months are together, for the thin bar that scrolls them under the floating header. */
  trackWidth: number
}

/** Half a pixel: what a browser's rounding of a scroll position or a column edge may be off by. */
const tolerance = 0.5

export const unscrolled: BoxScroll = { scrolls: false, atStart: true, atEnd: true, first: null, last: null, trackWidth: 0 }

export function maxScrollLeft(geometry: BoxGeometry): number {
  return Math.max(0, geometry.scrollWidth - geometry.clientWidth)
}

/** The months wholly in sight between the pinned columns, or null when not one of them fits. */
export function visibleMonths(geometry: BoxGeometry): { first: number; last: number } | null {
  const from = geometry.scrollLeft + geometry.objectWidth - tolerance
  const to = geometry.scrollLeft + geometry.clientWidth - geometry.yearWidth + tolerance
  let first = -1
  let last = -1

  for (let index = 0; index < geometry.months.length; index += 1) {
    const month = geometry.months[index]
    if (month.left >= from && month.left + month.width <= to) {
      if (first === -1) {
        first = index
      }

      last = index
    }
  }

  return first === -1 ? null : { first, last }
}

export function describeBoxScroll(geometry: BoxGeometry): BoxScroll {
  const max = maxScrollLeft(geometry)
  const visible = visibleMonths(geometry)

  return {
    scrolls: max > 1,
    atStart: geometry.scrollLeft <= tolerance,
    atEnd: geometry.scrollLeft >= max - tolerance,
    first: visible?.first ?? null,
    last: visible?.last ?? null,
    trackWidth: Math.max(0, geometry.scrollWidth - geometry.objectWidth - geometry.yearWidth),
  }
}

/** The scroll position that puts month `index`'s left edge against the pinned object column. */
function monthStart(geometry: BoxGeometry, index: number): number {
  return geometry.months[index].left - geometry.objectWidth
}

/**
 * Where the box opens (03 §4.1): month `index` — the latest any object ordered in — wholly in sight at the right, next
 * to the year, and a month's own edge at the left rather than half a month. When everything up to it fits without
 * scrolling, the box stays at the start.
 */
export function openingScrollLeft(geometry: BoxGeometry, index: number): number {
  const month = geometry.months[index]
  if (month === undefined) {
    return 0
  }

  const room = geometry.clientWidth - geometry.objectWidth - geometry.yearWidth
  const needed = month.left + month.width - geometry.objectWidth - room
  if (needed <= tolerance) {
    return 0
  }

  // The first month edge at or past what is needed: that month starts the view, and month `index` still ends inside it.
  const start = geometry.months.findIndex((_, candidate) => monthStart(geometry, candidate) >= needed - tolerance)
  const left = start === -1 ? needed : monthStart(geometry, start)
  return Math.min(left, maxScrollLeft(geometry))
}

/**
 * A page of months forward or back (03 §4.3, UX-04): as many months as are in sight now, from a month's edge — so
 * «Sonrakı aylar» from February–October goes on to the end of the year, and «Əvvəlki aylar» back to January.
 */
export function pageScrollLeft(geometry: BoxGeometry, direction: 1 | -1): number {
  const visible = visibleMonths(geometry)
  const max = maxScrollLeft(geometry)

  if (visible === null) {
    const step = Math.max(1, geometry.clientWidth - geometry.objectWidth - geometry.yearWidth)
    return Math.min(max, Math.max(0, geometry.scrollLeft + direction * step))
  }

  const count = visible.last - visible.first + 1
  const target = Math.min(geometry.months.length - 1, Math.max(0, visible.first + direction * count))
  return Math.min(max, Math.max(0, monthStart(geometry, target)))
}

/** The geometry as the browser has laid it out, from the table's header cells: object, twelve months, year. */
export function readBoxGeometry(box: HTMLElement | null, table: HTMLTableElement | null): BoxGeometry | null {
  const cells = table?.tHead?.rows[0]?.cells
  if (box === null || cells === undefined || cells.length < 14) {
    return null
  }

  const origin = box.getBoundingClientRect().left + box.clientLeft
  const months = Array.from({ length: 12 }, (_, index) => {
    const rect = cells[index + 1].getBoundingClientRect()
    return { left: rect.left - origin + box.scrollLeft, width: rect.width }
  })

  return {
    months,
    objectWidth: cells[0].getBoundingClientRect().width,
    yearWidth: cells[13].getBoundingClientRect().width,
    clientWidth: box.clientWidth,
    scrollWidth: box.scrollWidth,
    scrollLeft: box.scrollLeft,
  }
}

function same(a: BoxScroll, b: BoxScroll): boolean {
  return a.scrolls === b.scrolls
    && a.atStart === b.atStart
    && a.atEnd === b.atEnd
    && a.first === b.first
    && a.last === b.last
    && Math.abs(a.trackWidth - b.trackWidth) < 1
}

/**
 * The box's scroll, kept current: on every scroll of the box (once a frame), when the box or the table changes size —
 * the window, the sidebar, a scrollbar that comes and goes — and on a new year or view (`resetKey`), when the box is
 * also moved to where it opens. `page` moves a page of months; without motion when the reader asked for less of it.
 */
export function useBoxScroll({
  box,
  table,
  resetKey,
  latest,
}: {
  box: RefObject<HTMLDivElement | null>
  table: RefObject<HTMLTableElement | null>
  resetKey: string
  /** The latest month any object ordered in, January = 0, or −1. */
  latest: number
}): { scroll: BoxScroll; page: (direction: 1 | -1) => void } {
  const [scroll, setScroll] = useState<BoxScroll>(unscrolled)

  const measure = useCallback(() => {
    const geometry = readBoxGeometry(box.current, table.current)
    if (geometry === null) {
      return
    }

    const next = describeBoxScroll(geometry)
    setScroll((previous) => (same(previous, next) ? previous : next))
  }, [box, table])

  // Where the box opens, before the browser paints it, for each year and view — not when a search or a scope changes
  // the rows, which leaves the reader's months where they were.
  useLayoutEffect(() => {
    const element = box.current
    const geometry = readBoxGeometry(element, table.current)
    if (element !== null && geometry !== null && maxScrollLeft(geometry) > 1 && latest >= 0) {
      element.scrollLeft = openingScrollLeft(geometry, latest)
    }

    measure()
  }, [box, table, measure, resetKey, latest])

  useEffect(() => {
    const element = box.current
    if (element === null) {
      return
    }

    let frame: number | null = null
    const schedule = () => {
      if (frame === null) {
        frame = window.requestAnimationFrame(() => {
          frame = null
          measure()
        })
      }
    }

    element.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    observer?.observe(element)
    if (table.current !== null) {
      observer?.observe(table.current)
    }

    return () => {
      element.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer?.disconnect()
      if (frame !== null) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [box, table, measure])

  const page = useCallback((direction: 1 | -1) => {
    const element = box.current
    const geometry = readBoxGeometry(element, table.current)
    if (element === null || geometry === null) {
      return
    }

    const left = pageScrollLeft(geometry, direction)
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true
    if (typeof element.scrollTo === 'function') {
      element.scrollTo({ left, behavior: still ? 'auto' : 'smooth' })
    } else {
      element.scrollLeft = left
    }

    measure()
  }, [box, table, measure])

  return { scroll, page }
}

/**
 * How wide the box is in sight, kept current with it: a month's details, drawn as a row under its object's row, are
 * exactly this wide and pinned to the box's left edge, so they are whole wherever the months are scrolled to and never
 * widen the table (03a §10, Q-1). Zero until there is a box to measure — jsdom never has one — and the details then
 * take the table's own width.
 */
export function useBoxWidth(box: RefObject<HTMLDivElement | null>, enabled: boolean): number {
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const element = box.current
    if (!enabled || element === null) {
      return
    }

    const measure = () => setWidth(element.clientWidth)
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(element)
    return () => observer?.disconnect()
  }, [box, enabled])

  return width
}
