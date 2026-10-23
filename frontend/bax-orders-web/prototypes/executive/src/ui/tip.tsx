import { useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/*
 * A tip bound to one bar or cell: opened by a mouse or the keyboard, drawn in a portal, placed against its anchor in the
 * viewport (above it first, then beside it, below it last) and kept inside the screen's edges.
 */

/**
 * Opens a column's tip for a mouse or the keyboard, and closes it on leaving, on blur and on Escape. A tap does not open
 * it: on a touch screen the tap goes straight to the month.
 */
export function useTipTrigger() {
  const [open, setOpen] = useState(false)
  const handlers = {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => { if (event.pointerType !== 'touch') setOpen(true) },
    onPointerLeave: () => setOpen(false),
    onFocus: (event: FocusEvent<HTMLElement>) => { if (event.currentTarget.matches(':focus-visible')) setOpen(true) },
    onBlur: () => setOpen(false),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => { if (event.key === 'Escape') setOpen(false) },
  }
  return { open, handlers }
}

export type TipSide = 'top' | 'right' | 'left' | 'bottom'
export interface TipPlace { side: TipSide; top: number; left: number; arrow: number }

/**
 * A tip bound to one bar. It is drawn in a portal on `document.body` with a fixed position, so no container's overflow,
 * transform or stacking can cut it or carry it off, and it is placed against its bar in the viewport by `placeTip` —
 * measured before the browser paints (an open tip never shows in its old place), again on every scroll and resize.
 * Kept in the page while closed, so `aria-describedby` always has its text.
 */
export function Tip({ id, anchor, open, width = 'w-56', surface = 'bg-ink text-stone', arrow = 'bg-ink', children }: {
  id?: string
  anchor: () => Element | null
  open: boolean
  width?: string
  /** The box's background, text, border and shadow; the default is the year screen's dark tip. */
  surface?: string
  /** The arrow's background, the same colour as the box. */
  arrow?: string
  children: ReactNode
}) {
  const tip = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<TipPlace | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const bar = anchor()
      if (bar && tip.current) setPlace(placeTip(bar.getBoundingClientRect(), tip.current.offsetWidth, tip.current.offsetHeight))
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchor])

  const shown = open && place !== null
  return createPortal(
    <div
      ref={tip}
      id={id}
      role="tooltip"
      data-side={place?.side}
      style={{ top: place?.top ?? 0, left: place?.left ?? 0 }}
      className={`pointer-events-none fixed z-50 max-w-[calc(100vw-1rem)] rounded-md px-3 py-2 text-left shadow-lg transition-opacity duration-150 motion-reduce:transition-none ${surface} ${width} ${
        shown ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
    >
      {/* The arrow, on the side that faces the bar and level with it, under the text. */}
      {place && <span aria-hidden="true" className={`absolute size-2.5 rotate-45 ${arrow}`} style={arrowAt(place)} />}
      <div className="relative">{children}</div>
    </div>,
    document.body,
  )
}

/** How far the tip stands from its bar (the arrow's length and a little air), and from the viewport's edges. */
const TIP_OFFSET = 10
const TIP_EDGE = 8

/** The order the sides are tried in: above the bar first, then beside it, below it last. */
const tipSides: readonly TipSide[] = ['top', 'right', 'left', 'bottom']

/**
 * Where a tip goes in the viewport — the three steps of Floating UI's `offset`, `flip` and `shift`, which is all this
 * one tip needs. Offset: it stands `TIP_OFFSET` from its bar. Flip: on the first side in `tipSides` where it fits whole;
 * where none has room for all of it, on the side with the most. Shift: along that side it is centred on the part of the
 * bar in view, then pushed back inside the viewport's edges, so no part of it is ever off the screen — and its arrow
 * still points at the bar.
 */
export function placeTip(bar: DOMRect, width: number, height: number): TipPlace {
  const screenWidth = document.documentElement.clientWidth
  const screenHeight = document.documentElement.clientHeight
  const room: Record<TipSide, number> = {
    top: bar.top - TIP_OFFSET - TIP_EDGE,
    right: screenWidth - bar.right - TIP_OFFSET - TIP_EDGE,
    left: bar.left - TIP_OFFSET - TIP_EDGE,
    bottom: screenHeight - bar.bottom - TIP_OFFSET - TIP_EDGE,
  }
  const need = (side: TipSide) => (side === 'top' || side === 'bottom' ? height : width)
  const side = tipSides.find((item) => room[item] >= need(item))
    ?? tipSides.reduce((best, item) => (room[item] / need(item) > room[best] / need(best) ? item : best))

  const inside = (start: number, size: number, screen: number) => Math.max(TIP_EDGE, Math.min(start, screen - size - TIP_EDGE))
  const pointAt = (at: number, size: number) => Math.max(12, Math.min(at, size - 12))
  const centreX = (Math.max(bar.left, 0) + Math.min(bar.right, screenWidth)) / 2
  const centreY = (Math.max(bar.top, 0) + Math.min(bar.bottom, screenHeight)) / 2

  if (side === 'top' || side === 'bottom') {
    const left = inside(centreX - width / 2, width, screenWidth)
    const top = inside(side === 'top' ? bar.top - TIP_OFFSET - height : bar.bottom + TIP_OFFSET, height, screenHeight)
    return { side, top, left, arrow: pointAt(centreX - left, width) }
  }
  const top = inside(centreY - height / 2, height, screenHeight)
  const left = inside(side === 'right' ? bar.right + TIP_OFFSET : bar.left - TIP_OFFSET - width, width, screenWidth)
  return { side, top, left, arrow: pointAt(centreY - top, height) }
}

/** The arrow's square, half out of the tip's edge that faces the bar. */
function arrowAt({ side, arrow }: TipPlace): CSSProperties {
  switch (side) {
    case 'top': return { bottom: -5, left: arrow - 5 }
    case 'bottom': return { top: -5, left: arrow - 5 }
    case 'right': return { left: -5, top: arrow - 5 }
    case 'left': return { right: -5, top: arrow - 5 }
  }
}
