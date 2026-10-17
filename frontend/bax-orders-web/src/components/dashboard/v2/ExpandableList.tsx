import { useEffect, useState, type ReactNode } from 'react'
import { formatCount } from '../../analytics/format'

/** How many rows a list in a card's detail shows before «Hamısını göstər» (01-audit §7.4). */
export const initialRows = 8

/**
 * A long list inside a card's detail: the first rows, then «Hamısını göstər (N)», opened in place (01-audit §7.4;
 * AC-10). Never a box with its own scrollbar — on a phone a scroll inside a scroll catches the thumb and hides
 * rows from the browser's own search — so the page's scroll is the only one.
 *
 * The button stays at the list's foot whichever way it reads, so it does not jump from under the finger. Whether
 * the list is open is not in the address: it is a moment's choice, and it is forgotten when the card changes.
 */
export function ExpandableList<T>({ items, keyOf, render, label, reveal = -1, className = '' }: {
  items: readonly T[]
  keyOf: (item: T) => string | number
  render: (item: T) => ReactNode
  /** What the list is, for the button's name: «Hamısını göstər (14)» needs to say of what to a screen reader. */
  label: string
  /** An index that must be visible — the object «Ətraflı» opened — so a long list opens itself to show it. */
  reveal?: number
  className?: string
}) {
  const mustShow = reveal >= initialRows
  const [expanded, setExpanded] = useState(mustShow)

  // A row asked for later (another object opened from «Ətraflı») opens the list again; the reader can still close it.
  useEffect(() => {
    if (mustShow) {
      setExpanded(true)
    }
  }, [mustShow, reveal])

  const shown = expanded ? items : items.slice(0, initialRows)
  const hidden = items.length - initialRows

  return (
    <>
      <ul className={className}>
        {shown.map((item) => (
          <li key={keyOf(item)}>{render(item)}</li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? `${label}: daha az göstər` : `${label}: hamısını göstər (${formatCount(items.length)})`}
          onClick={() => setExpanded(!expanded)}
          className="mt-2 min-h-11 rounded-md px-2 text-sm font-medium text-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-8"
        >
          {expanded ? 'Daha az göstər' : `Hamısını göstər (${formatCount(items.length)})`}
        </button>
      )}
    </>
  )
}
