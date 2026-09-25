import type { MouseEvent } from 'react'

/*
  One rule for every screen (20.3): what can be clicked changes under the cursor and under the keyboard's focus,
  and what cannot be clicked never does. The classes below are the only hover, focus and cursor states a card or a
  row may carry; their resting colours are the ones they already had.
*/

/** Marks the one link a card or row opens. The surface finds it by this attribute, and so does the focus ring. */
export const surfaceLinkAttribute = { 'data-surface-link': '' } as const

/** A click on one of these means that element's own behaviour — a link, a button, an open note — not the surface's. */
const ownBehaviourSelector = 'a, button, input, select, textarea, label, summary, [role="button"], [role="note"]'

/**
 * A card or a row that opens what its one link opens. It forwards a plain click anywhere on it to that link, so the
 * link — never the surface — navigates, and Back's scroll memory sees a click on an <a> (useScrollMemory).
 * It ignores:
 * - a click the page already handled (`defaultPrevented`);
 * - any button but the main one, and any click with Ctrl, Meta, Shift or Alt;
 * - a click inside a, button, input, select, textarea, label, summary, [role="button"] or [role="note"], because
 *   that element's own behaviour wins;
 * - a click that ends a text selection inside the surface.
 */
export function openSurfaceLink(event: MouseEvent<HTMLElement>): void {
  if (event.defaultPrevented || event.button !== 0) {
    return
  }

  // A modifier on the body does nothing: a new tab or a new window is the link's to open, from the link itself.
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return
  }

  const surface = event.currentTarget
  const own = event.target instanceof Element ? event.target.closest(ownBehaviourSelector) : null
  if (own !== null && surface.contains(own)) {
    return
  }

  // A reader who drags across a figure to copy it has not asked to leave the page.
  if (endsSelectionIn(surface)) {
    return
  }

  surface.querySelector<HTMLAnchorElement>('a[data-surface-link]')?.click()
}

function endsSelectionIn(surface: HTMLElement): boolean {
  const selection = window.getSelection()
  if (selection === null || selection.isCollapsed) {
    return false
  }

  return [selection.anchorNode, selection.focusNode].some((node) => node !== null && surface.contains(node))
}

/** Card-shaped surface (bordered): the attention card and the phone row. */
export const interactiveSurfaceClass =
  'cursor-pointer hover:border-slate-300 hover:bg-slate-50 '
  + 'has-[[data-surface-link]:focus-visible]:outline-2 has-[[data-surface-link]:focus-visible]:outline-offset-2 '
  + 'has-[[data-surface-link]:focus-visible]:outline-slate-900'

/** Table-row surface. Outlines on <tr> are unreliable, so the row changes background and the link wears the ring. */
export const interactiveRowClass = 'group cursor-pointer hover:bg-slate-50 has-[[data-surface-link]:focus-visible]:bg-slate-50'

/** The link inside a card surface: no ring of its own, because the card wears it. */
export const surfaceLinkClass = 'focus-visible:outline-hidden'

/** The link inside a table row: its own ring. */
export const rowLinkClass = 'rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900'

/** The visible handle of a surface or a button — the name — underlines when its surface is hovered or focused. */
export const interactiveTextClass = 'underline-offset-2 group-hover:underline group-focus-visible:underline'
