import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

/** The application's header is sticky and 72 pixels tall (`Header.tsx`). */
const applicationHeaderHeight = 72

/** The copy's own height: the 40-pixel header row and the 12-pixel bar under it. */
const floatingHeaderHeight = 52

export interface FloatingHeader {
  /** Whether the copy is shown. */
  floating: boolean
  /** The copy's scrolling area, moved with the box. */
  copy: RefObject<HTMLDivElement | null>
  /** The thin bar under it, which moves the box. */
  bar: RefObject<HTMLDivElement | null>
}

/**
 * When the floating header shows, and keeping it in step with the table's box.
 *
 * Called by the table itself rather than inside the copy: the copy comes before the box in the page, and React attaches
 * the box's ref only after the copy's own effects have run, so effects in the copy would find no box on the first
 * render. The table's effects run after everything in it is in place.
 */
export function useFloatingHeader({
  box,
  head,
  table,
  scrolls,
}: {
  /** The table's scrolling box. */
  box: RefObject<HTMLDivElement | null>
  /** The table's own header. */
  head: RefObject<HTMLTableSectionElement | null>
  table: RefObject<HTMLTableElement | null>
  /** Whether the box scrolls at all: only then is there a bar. */
  scrolls: boolean
}): FloatingHeader {
  const [floating, setFloating] = useState(false)
  const copy = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)

  // Shown while the real header is (even partly) above the 72-pixel line and the table's rows still reach below the
  // copy. A sort button the keyboard comes back to is scrolled to 84 pixels (DK-26), below the line: the copy then goes.
  useEffect(() => {
    const header = head.current
    const rows = table.current
    if (header === null || rows === null || typeof IntersectionObserver === 'undefined') {
      return
    }

    let above = false
    let reaching = false
    const update = () => setFloating(above && reaching)

    const headerWatch = new IntersectionObserver(([entry]) => {
      above = entry.boundingClientRect.top < applicationHeaderHeight
      update()
    }, { rootMargin: `-${applicationHeaderHeight}px 0px 0px 0px`, threshold: [0, 1] })

    const rowsWatch = new IntersectionObserver(([entry]) => {
      reaching = entry.isIntersecting
      update()
    }, { rootMargin: `-${applicationHeaderHeight + floatingHeaderHeight}px 0px 0px 0px`, threshold: 0 })

    headerWatch.observe(header)
    rowsWatch.observe(rows)
    return () => {
      headerWatch.disconnect()
      rowsWatch.disconnect()
    }
  }, [head, table])

  // In step with the box, both ways: the box moves the copy and the bar; the bar, dragged, moves the box. Again when the
  // copy appears — a hidden element has no scroll position to keep — and when the bar comes or goes.
  useLayoutEffect(() => {
    const element = box.current
    if (element === null) {
      return
    }

    const follow = () => {
      for (const other of [copy.current, bar.current]) {
        if (other !== null && Math.abs(other.scrollLeft - element.scrollLeft) > 0.5) {
          other.scrollLeft = element.scrollLeft
        }
      }
    }

    const lead = () => {
      const strip = bar.current
      if (strip !== null && Math.abs(element.scrollLeft - strip.scrollLeft) > 0.5) {
        element.scrollLeft = strip.scrollLeft
      }
    }

    follow()
    const strip = bar.current
    element.addEventListener('scroll', follow, { passive: true })
    strip?.addEventListener('scroll', lead, { passive: true })
    return () => {
      element.removeEventListener('scroll', follow)
      strip?.removeEventListener('scroll', lead)
    }
  }, [box, floating, scrolls])

  return { floating, copy, bar }
}

/**
 * The months' names, kept in sight while the reader scrolls down the table (UI V2 03 §4.3, §6.3; D-51, S-2a = A).
 *
 * The table scrolls sideways inside its box, and a box that scrolls cannot hold a header that sticks to the page —
 * that is what broke the header at 1280 pixels before (B-07). So the table's own header stays where it is, for its
 * meaning and for the keyboard, and this is a drawn copy of it: shown under the application's header only while the
 * real one has gone above that line and rows are still under it (`useFloatingHeader`), moved sideways with the box, and
 * the same width and columns as the table, so every name stands over its own month. Under it, a thin bar scrolls the
 * months in step with the box, for a reader in the middle of the table whose box's own scrollbar is far below (DK-02).
 *
 * It is a picture of the header, not a second one: hidden from screen readers, out of the keyboard's way (its bar too,
 * DK-27), and a click on one of its buttons is passed to the real one, so the keyboard's focus never lands in it.
 */
export function ReportFloatingHeader({
  header,
  scrolls,
  trackWidth,
  minWidthClass,
  children,
}: {
  header: FloatingHeader
  /** Whether the box scrolls at all: only then is there a bar. */
  scrolls: boolean
  /** How wide the months are together, for the bar's scroll range. */
  trackWidth: number
  minWidthClass: string
  /** The `colgroup` and `thead` of the copy. */
  children: ReactNode
}) {
  return (
    <div data-floating-header="" aria-hidden="true" hidden={!header.floating} className="sticky top-18 z-10 h-0">
      <div className="border-b border-outline-variant bg-surface-container-low shadow-sm">
        <div ref={header.copy} className="overflow-x-hidden">
          <table className={`w-full table-fixed border-separate border-spacing-0 ${minWidthClass}`}>{children}</table>
        </div>
        {scrolls && (
          <div
            ref={header.bar}
            tabIndex={-1}
            className="ml-30 mr-22 h-3 overflow-x-auto overflow-y-hidden [scrollbar-color:var(--color-outline)_transparent] [scrollbar-width:thin]"
          >
            <div className="h-px" style={{ width: trackWidth }} />
          </div>
        )}
      </div>
    </div>
  )
}
