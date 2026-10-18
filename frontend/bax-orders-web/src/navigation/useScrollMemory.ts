import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router'

/** Where a page was left: how far down, and the card or row whose link was followed. */
interface ScrollEntry {
  y: number
  anchor: string | null
}

const storagePrefix = 'bax.scroll.'

/** The elements a reader opens something from. Their ids name the object, so they are the same on return. */
const anchorSelector = '[id^="attention-"], [id^="row-"]'

/**
 * Something opened from a row but drawn outside it — the monthly report's open month, a table row of its own under its
 * object's — names the row it belongs to, so Back brings that row into view (24.3).
 */
const namedAnchorAttribute = 'data-scroll-anchor'

/**
 * Brings a reader back to where they were when they return with the browser's Back button.
 *
 * The dashboard loads its figures after it mounts, so the browser's own restoration ran against a page with
 * nothing on it yet and landed at the top — the reader lost the card they had opened. This remembers, per
 * history entry, how far down the page was and which card or row the reader followed a link from; on a return
 * it waits until the page has its data (`ready`) and then brings that card back into view, or failing that the
 * same offset. Arriving any other way — a menu click, a new link — starts at the top, as it always has.
 *
 * Returns the ref to put on the page's root element; clicks inside it are what name the anchor.
 */
export function useScrollMemory<T extends HTMLElement>(ready: boolean): RefObject<T | null> {
  const root = useRef<T>(null)
  const key = useLocation().key
  const navigationType = useNavigationType()

  // Read once, on arrival: only a return through history restores anything.
  const [saved] = useState(() => (navigationType === 'POP' ? read(key) : null))
  const restored = useRef(false)

  // The browser must not restore on its own while the page does: the two would fight over the same scroll.
  useEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  // How far down, on every scroll, written at most once a frame. A layout effect, so the listener is gone
  // before the next page is painted: the browser clamping the scroll to a shorter page is not the reader.
  useLayoutEffect(() => {
    let frame: number | null = null
    let latest = window.scrollY

    const flush = () => {
      frame = null
      write(key, { y: latest, anchor: read(key)?.anchor ?? null })
    }

    const onScroll = () => {
      latest = window.scrollY
      if (frame === null) {
        frame = window.requestAnimationFrame(flush)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame !== null) {
        window.cancelAnimationFrame(frame)
        flush()
      }
    }
  }, [key])

  // Which card or row a link was followed from — recorded before the link navigates, since this listener is
  // on the page and React's own is on the document root above it.
  useEffect(() => {
    const element = root.current
    if (element === null) {
      return
    }

    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null
      if (link === null || !element.contains(link)) {
        return
      }

      const named = link.closest(`[${namedAnchorAttribute}]`)?.getAttribute(namedAnchorAttribute)
      write(key, { y: window.scrollY, anchor: named ?? link.closest(anchorSelector)?.id ?? null })
    }

    element.addEventListener('click', onClick)
    return () => element.removeEventListener('click', onClick)
  }, [key])

  // Once, when the figures are on the page: the card itself if it is there, the offset otherwise.
  useEffect(() => {
    if (!ready || saved === null || restored.current) {
      return
    }

    restored.current = true
    const anchor = saved.anchor === null ? null : document.getElementById(saved.anchor)
    if (anchor !== null) {
      anchor.scrollIntoView?.({ block: 'center' })
    } else {
      window.scrollTo(0, saved.y)
    }
  }, [ready, saved])

  return root
}

function read(key: string): ScrollEntry | null {
  try {
    const value = window.sessionStorage.getItem(storagePrefix + key)
    return value === null ? null : (JSON.parse(value) as ScrollEntry)
  } catch {
    // Storage switched off or a value that is not ours: nothing to restore, and nothing breaks.
    return null
  }
}

function write(key: string, entry: ScrollEntry) {
  try {
    window.sessionStorage.setItem(storagePrefix + key, JSON.stringify(entry))
  } catch {
    // A full or disabled storage costs the reader their place, not the page.
  }
}
