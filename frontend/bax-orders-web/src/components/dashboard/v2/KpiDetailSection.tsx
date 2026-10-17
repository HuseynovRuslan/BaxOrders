import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { kpiDetailRegionId } from './KpiRow'

/** How long the region takes to open and close (01-audit §7.3.4). Nothing moves for a reader who asked for less. */
const openingMs = 150

function prefersMotion(): boolean {
  return typeof window.matchMedia === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * The one region the four cards open, directly under them and as wide as the row (01-audit §7.2; AC-01).
 *
 * It takes no room at all while it is closed — `hidden`, not an empty box — so nothing between the cards and the
 * next block changes until a card is opened (AC-03), and its height is always its content's own: no fixed minimum.
 * It lies after the cards, so opening it never moves them (AC-02); only what is below it moves, and only down.
 *
 * Opening and closing slide its height for 150 ms (`grid-template-rows` 0fr ↔ 1fr), switching from one card to
 * another does not animate at all, and a reader who asked the system for less motion gets none.
 */
export function KpiDetailSection({ title, figure, open, busy = false, focusKey, scrollOnOpen = true, actions, onClose, children }: {
  /** The card's own name, so the region says which question it answers. */
  title: string
  /** The card's own figure, as the card shows it, repeated so a phone reader who scrolled here knows what this is. */
  figure: ReactNode
  open: boolean
  /** The page is reading a new answer: the region stays, marked busy, until it arrives (§7.8). */
  busy?: boolean
  /**
   * Changes each time the reader opens or switches a card. Focus moves to the region's heading then — not when the
   * page is loaded with a detail already open, where taking the focus would be a surprise.
   */
  focusKey: number
  /**
   * Whether opening brings the region's top into view. Off when the reader asked for one object's row — «Ətraflı» —
   * which then brings that row into view itself.
   */
  scrollOnOpen?: boolean
  /** The region's way on, at its foot: «Bütün obyektlər cədvəli» and the like. */
  actions?: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  // Rendered (not hidden) and expanded are two states, so closing can slide shut before it disappears.
  const [rendered, setRendered] = useState(open)
  const [expanded, setExpanded] = useState(open)
  const region = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => {
    if (open) {
      setRendered(true)
      if (!prefersMotion()) {
        setExpanded(true)
        return
      }

      // One frame at 0fr, so the browser has a height to slide from.
      const frame = requestAnimationFrame(() => setExpanded(true))
      return () => cancelAnimationFrame(frame)
    }

    setExpanded(false)
    if (!prefersMotion()) {
      setRendered(false)
      return
    }

    // `transitionend` is the signal; the timer only makes sure a missed one cannot leave an empty box behind.
    const timer = window.setTimeout(() => setRendered(false), openingMs + 100)
    return () => window.clearTimeout(timer)
  }, [open])

  // The reader's own opening or switching: the heading takes the focus, and the region comes into view if it is not —
  // which on a phone it usually is not, two rows of cards above it. Switching cards never scrolls.
  //
  // Both wait for `rendered`: in the commit that opens the region it is still `hidden`, and a hidden heading takes no
  // focus and a hidden region has no position to scroll to. jsdom does not lay out, so only a browser shows this.
  const lastFocusKey = useRef(focusKey)
  const wasOpen = useRef(open)
  const pendingScroll = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) {
      pendingScroll.current = true
    }

    if (!open) {
      pendingScroll.current = false
    }

    wasOpen.current = open
    // The key can change a render before the address opens the region; it is kept until there is a region to focus.
    if (!open || !rendered || focusKey === lastFocusKey.current) {
      return
    }

    lastFocusKey.current = focusKey
    // Opened on one object's row («Ətraflı»): that row takes the focus itself, so the heading does not (D-2).
    if (scrollOnOpen) {
      heading.current?.focus({ preventScroll: true })
    }
    if (pendingScroll.current && scrollOnOpen) {
      bringIntoView(region.current)
    }

    pendingScroll.current = false
  }, [open, rendered, focusKey, scrollOnOpen])

  // Opened by a link: no focus to take, but a region below the first screen is brought up once.
  useEffect(() => {
    if (open && scrollOnOpen) {
      bringIntoView(region.current)
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      id={kpiDetailRegionId}
      ref={region}
      hidden={!rendered}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && !open) {
          setRendered(false)
        }
      }}
      className="grid scroll-mt-20 transition-[grid-template-rows] ease-out motion-reduce:transition-none"
      style={{ gridTemplateRows: expanded ? '1fr' : '0fr', transitionDuration: `${openingMs}ms` }}
    >
      {/* `relative` keeps every `sr-only` word inside the box that clips it, so none can widen the page. */}
      <div className="relative min-h-0 overflow-hidden">
        <section
          aria-labelledby={`${kpiDetailRegionId}-title`}
          aria-busy={busy}
          className={`mt-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 transition-opacity sm:mt-4 sm:p-6 ${busy ? 'opacity-60' : ''}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id={`${kpiDetailRegionId}-title`}
                ref={heading}
                tabIndex={-1}
                className="font-headline-sm text-headline-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {title}
              </h2>
              <p className="tabular mt-0.5 font-metric-val text-headline-sm font-semibold">{figure}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Detalları bağla"
              className="-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4">{children}</div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-3">
            <div className="flex flex-wrap gap-3">{actions}</div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md border border-outline-variant px-4 text-sm font-medium text-on-surface hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-9"
            >
              Bağla
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

/** Scrolls the region's top into view only when it is not already in the upper part of the screen (§7.3.5). */
function bringIntoView(element: HTMLElement | null) {
  if (element === null || typeof element.scrollIntoView !== 'function') {
    return
  }

  const top = element.getBoundingClientRect().top
  const visible = top >= 0 && top <= window.innerHeight * (2 / 3)
  if (!visible) {
    element.scrollIntoView({ block: 'start', behavior: prefersMotion() ? 'smooth' : 'auto' })
  }
}
