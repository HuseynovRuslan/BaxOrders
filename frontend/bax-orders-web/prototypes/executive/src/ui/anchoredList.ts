import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'

/*
 * Where an open list lives and where it stands — shared by the app's dropdown (Select) and its field with suggestions
 * (SuggestField). The list is drawn over the body, or inside the modal dialog its control sits in (everything outside an
 * open dialog is out of reach), fixed to the control: measured hidden first, then put under it — or over it, where the
 * room is — and kept inside the window as the page scrolls or resizes. A press outside the control and the list closes
 * it.
 */

const LIST_HEIGHT = 340
const EDGE = 8
const GAP = 6

interface Place { left: number; top?: number; bottom?: number; minWidth: number; maxHeight: number }

export function useAnchoredList(open: boolean, anchor: RefObject<HTMLElement | null>, list: RefObject<HTMLElement | null>, onOutside: () => void) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  // The control's typeface: the list sits outside the screen that sets it.
  const [font, setFont] = useState('')
  const [place, setPlace] = useState<Place | null>(null)
  const outside = useRef(onOutside)
  outside.current = onOutside

  useLayoutEffect(() => {
    if (!open) {
      setPlace(null)
      return
    }
    const element = anchor.current
    if (!element) return
    setHost(element.closest('dialog') ?? document.body)
    setFont(getComputedStyle(element).fontFamily)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const control = anchor.current
      const menu = list.current
      if (!control || !menu) return
      const rect = control.getBoundingClientRect()
      const width = document.documentElement.clientWidth
      const height = window.innerHeight
      const below = height - rect.bottom - GAP - EDGE
      const above = rect.top - GAP - EDGE
      const upwards = below < Math.min(menu.scrollHeight, 220) && above > below
      const menuWidth = Math.min(Math.max(menu.offsetWidth, rect.width), width - 2 * EDGE)
      setPlace({
        left: Math.max(EDGE, Math.min(rect.left, width - EDGE - menuWidth)),
        top: upwards ? undefined : rect.bottom + GAP,
        bottom: upwards ? height - rect.top + GAP : undefined,
        minWidth: Math.min(rect.width, width - 2 * EDGE),
        maxHeight: Math.max(96, Math.min(LIST_HEIGHT, upwards ? above : below)),
      })
    }
    update()
    let frame = 0
    const follow = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update) }
    window.addEventListener('resize', follow)
    document.addEventListener('scroll', follow, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', follow)
      document.removeEventListener('scroll', follow, true)
    }
  }, [open, host]) // eslint-disable-line react-hooks/exhaustive-deps

  // Placed, the list may have grown (a scroll bar appears once its height is capped): it is kept inside the window —
  // moved once, and only when it can move.
  useLayoutEffect(() => {
    const menu = list.current
    if (!open || !place || !menu) return
    const right = menu.getBoundingClientRect().right
    const limit = document.documentElement.clientWidth - EDGE
    const left = Math.max(EDGE, place.left - (right - limit))
    if (right > limit + 0.5 && Math.abs(left - place.left) > 0.5) setPlace({ ...place, left })
  }, [open, place]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const press = (event: PointerEvent) => {
      const target = event.target as Node
      if (!anchor.current?.contains(target) && !list.current?.contains(target)) outside.current()
    }
    document.addEventListener('pointerdown', press, true)
    return () => document.removeEventListener('pointerdown', press, true)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const style: CSSProperties = place
    ? { left: place.left, top: place.top, bottom: place.bottom, minWidth: place.minWidth, maxHeight: place.maxHeight, fontFamily: font || undefined }
    : { left: 0, top: 0, fontFamily: font || undefined }
  return { host: open ? host : null, placed: place !== null, style }
}

/** Ids of the app's own, never React's useId: a new one there would renumber the year screens' ids. */
let made = 0
export const newListId = (prefix: string) => `${prefix}-${++made}`
