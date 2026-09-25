import { Info } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

interface InfoHintProps {
  label: string
  children: string
}

/** The note's widest (the old `w-64`), and how far it keeps from the screen's edges and from its ⓘ. */
const noteWidth = 256
const screenMargin = 8
const iconGap = 6

/**
 * A short explanation kept off the screen until it is asked for. The text is a real element rather than a
 * `title` attribute, so it is reachable by keyboard and by a screen reader instead of hover only. It opens on a
 * click, a tap or the keyboard — never on hover, where it would vanish on the way to being read.
 *
 * The note stays beside its ⓘ in the page, so `aria-controls` and a screen reader find it there, but it is placed
 * `fixed`, against the screen. Placed `absolute`, it was cut off by any box around it that scrolls — the order
 * lines' table cut off the price column's notes — and from an ⓘ near the right edge of a phone it ran off the
 * screen. A fixed note would drift from its ⓘ when the page moves, so it closes on scroll and on resize instead.
 */
export function InfoHint({ label, children }: InfoHintProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const noteRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    if (open && buttonRef.current && noteRef.current) {
      placeNote(buttonRef.current, noteRef.current)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    function closeOnPointerOutside(event: PointerEvent) {
      const target = event.target as Node
      if (!buttonRef.current?.contains(target) && !noteRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    function close() {
      setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnPointerOutside)
    // Capturing, and the Escape marked as used: the dialog around the ⓘ listens on the same document, and one
    // Escape closes only the note on top of it (17.1).
    document.addEventListener('keydown', closeOnEscape, { capture: true })
    // Capturing, so a box that scrolls inside the page closes it as well as the page itself.
    window.addEventListener('scroll', close, { capture: true })
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerOutside)
      document.removeEventListener('keydown', closeOnEscape, { capture: true })
      window.removeEventListener('scroll', close, { capture: true })
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <span className="relative inline-flex align-middle">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        onBlur={() => setOpen(false)}
        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 pointer-coarse:p-2.5"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>

      <span
        ref={noteRef}
        id={id}
        role="note"
        hidden={!open}
        // Pressing on the note keeps the focus on the ⓘ, so reading it does not count as leaving it.
        onMouseDown={(event) => event.preventDefault()}
        className="z-[60] rounded-md border border-slate-200 bg-white p-2 text-xs leading-relaxed font-normal text-slate-600 shadow-lg"
      >
        {children}
      </span>
    </span>
  )
}

/**
 * Under the ⓘ, as wide as the screen allows and never past its edges; above the ⓘ when it does not fit under it
 * and does fit above.
 */
function placeNote(button: HTMLElement, note: HTMLElement) {
  const icon = button.getBoundingClientRect()
  const width = Math.min(noteWidth, window.innerWidth - 2 * screenMargin)
  const left = Math.max(screenMargin, Math.min(icon.left, window.innerWidth - width - screenMargin))

  note.style.position = 'fixed'
  note.style.width = `${width}px`
  note.style.left = `${left}px`
  note.style.top = `${icon.bottom + iconGap}px`

  // Measured at its final width, since the width decides how many lines it wraps to.
  const height = note.getBoundingClientRect().height
  const below = icon.bottom + iconGap
  const above = icon.top - iconGap - height
  const fitsBelow = below + height <= window.innerHeight - screenMargin
  const fitsAbove = above >= screenMargin
  note.style.top = `${!fitsBelow && fitsAbove ? above : below}px`
}
