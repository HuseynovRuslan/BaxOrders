import { X } from 'lucide-react'
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { useDialogLayer } from './dialogStack'

export interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Dialogs that show a table need more room than the default form width. */
  width?: 'default' | 'wide'
  /**
   * Whether a press on the dark background closes the dialog. Only a dialog that is read, never written in, may
   * (owner decision 17.2): a form or a confirmation closed by a stray click would lose what was typed into it.
   */
  dismissOnBackdrop?: boolean
  /**
   * Where the dialog sits. `'right'` is a panel against the right edge, full height, over a light scrim, so the page
   * it was opened from stays readable beside it (owner decision 19.1); below `sm` it fills the screen. Only the
   * layout differs: closing, the keyboard and the focus are the same dialog either way. Use `Drawer` for it.
   */
  placement?: 'center' | 'right'
}

/**
 * The one dialog every screen uses. While it is open the page behind it stays where it is: scrolling the dialog
 * used to scroll the page too, so a reader who closed the product history found themselves somewhere else.
 *
 * Every dialog also closes the same way (owner decisions 17.1, 17.3). `Escape` does what «Bağla» does and nothing
 * more, the keyboard stays inside the dialog while it is open, and closing gives the focus back to whatever opened
 * it. Closing is always refusing: no dialog's action runs because the dialog was closed.
 */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 'default',
  dismissOnBackdrop = false,
  placement = 'center',
}: ModalProps) {
  const titleId = useId()
  const subtitleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const isTopmost = useDialogLayer()
  // Read at the first render, not in an effect: by the time an effect runs, a field with `autoFocus` inside the
  // dialog already holds the focus, and that field is not what opened the dialog.
  const [opener] = useState(() => document.activeElement)
  // Read through a ref, so a new `onClose` on every render does not register the key listener again.
  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })
  const pressOnBackdrop = useRef(false)

  useEffect(() => {
    // What this dialog found, put back as it found it: a dialog opened over another, or straight after one,
    // must not leave the page locked or unlock the dialog still beneath it.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    // A field that focused itself keeps the focus. Otherwise the first stop is «Bağla», which comes before every
    // body and footer, so a destructive button is never what the focus lands on.
    if (!dialog.contains(document.activeElement)) {
      const first = tabStops(dialog)[0] ?? dialog
      first.focus({ preventScroll: true })
    }

    return () => {
      // StrictMode's rehearsal unmount leaves the dialog on the page, and something the page focused on purpose
      // keeps the focus: only a focus that went away with the dialog is given back.
      const current = document.activeElement
      const focusWasLost = current === null || current === document.body || !current.isConnected
      if (dialog.isConnected || !focusWasLost) {
        return
      }

      // preventScroll: a plain focus() would scroll the opener into view, and the page would not stay where it was.
      if (opener instanceof HTMLElement && opener !== document.body && opener.isConnected) {
        opener.focus({ preventScroll: true })
      }
    }
  }, [opener])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Something inside — an open ⓘ note — has already used this key, or another dialog is above this one.
      if (event.defaultPrevented || !isTopmost()) {
        return
      }

      if (event.key === 'Escape' && !event.isComposing) {
        // Marked as used before closing. In a browser, React can take the upper dialog away between two listeners
        // of the same key, and the dialog beneath would then find itself on top and close as well.
        event.preventDefault()
        onCloseRef.current()
      } else if (event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey && dialogRef.current) {
        keepTabInside(event, dialogRef.current)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isTopmost])

  // A press counts only when it starts and ends on the background itself. A drag that starts inside the dialog
  // and is let go over the background is reported by the browser as a click on the background, too.
  function onBackdropPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    pressOnBackdrop.current = dismissOnBackdrop && event.target === event.currentTarget && !isOnScrollbar(event)
  }

  function onBackdropPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      pressOnBackdrop.current = false
    }
  }

  function onBackdropClick(event: ReactMouseEvent<HTMLDivElement>) {
    const closes = dismissOnBackdrop && pressOnBackdrop.current && event.target === event.currentTarget
    pressOnBackdrop.current = false
    if (closes) {
      onClose()
    }
  }

  const right = placement === 'right'

  return (
    // overscroll-contain: a scroll that reaches the dialog's end stops there instead of carrying on to the page.
    // On the right, the background does not scroll at all — the panel's body does — and it stays the panel's direct
    // parent, so a press on it is judged exactly as it is in the centre. Nothing here or below is transformed: a
    // transform would become the box an ⓘ note's `position: fixed` is measured from, and the note would be misplaced.
    <div
      className={right
        ? 'fixed inset-0 z-50 flex justify-end bg-slate-900/20'
        : 'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4'}
      onPointerDown={onBackdropPointerDown}
      onPointerUp={onBackdropPointerUp}
      onClick={onBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className={right
          ? 'flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-lg sm:w-[560px]'
          : `mt-10 w-full rounded-lg border border-slate-200 bg-white shadow-lg ${
            width === 'wide' ? 'max-w-3xl' : 'max-w-lg'
          }`}
      >
        <div className="flex items-start gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="font-medium text-slate-900">{title}</h2>
            {subtitle && <p id={subtitleId} className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Bağla"
            className="ml-auto rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* On the right the header stays put and only the body scrolls, inside the panel. */}
        <div className={right ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4' : 'px-4 py-4'}>
          {children}
        </div>

        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">{footer}</div>}
      </div>
    </div>
  )
}

/**
 * `Tab` from the last stop goes round to the first, and `Shift+Tab` from the first to the last; between them the
 * browser moves the focus as it always does. A focus outside the dialog — a press on the background leaves it on
 * the page — comes back in at the end the key points to.
 */
function keepTabInside(event: KeyboardEvent, dialog: HTMLElement) {
  const stops = tabStops(dialog)
  const active = document.activeElement
  const inside = active instanceof HTMLElement && active !== dialog && dialog.contains(active)
  const first = stops[0]
  const last = stops[stops.length - 1]

  let next: HTMLElement | null = null
  if (stops.length === 0) {
    next = dialog
  } else if (!inside) {
    next = event.shiftKey ? last : first
  } else if (event.shiftKey && !stops.some((stop) => comesBefore(stop, active))) {
    next = last
  } else if (!event.shiftKey && !stops.some((stop) => comesBefore(active, stop))) {
    next = first
  }

  if (next !== null) {
    event.preventDefault()
    next.focus()
  }
}

function comesBefore(a: Node, b: Node): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

const reachable = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  // The product history folds its technical record into a <details>.
  'summary',
  'iframe',
  '[tabindex]',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ')

/**
 * What `Tab` can reach inside the dialog now, in page order. Worked out at every press, because a dialog's content
 * arrives after it opens.
 */
function tabStops(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(reachable)).filter(
    (element) =>
      !element.matches(':disabled') &&
      !(Number(element.getAttribute('tabindex')) < 0) &&
      element.closest('[hidden], [inert]') === null &&
      !isInClosedDetails(element) &&
      isRadioStop(element, dialog) &&
      // What CSS hides. jsdom lays nothing out and has no checkVisibility, so there everything counts as shown.
      (element.checkVisibility?.() ?? true),
  )
}

/** Inside a closed <details> only its <summary> can be reached. */
function isInClosedDetails(element: HTMLElement): boolean {
  for (let details = element.closest('details'); details; details = details.parentElement?.closest('details') ?? null) {
    const summary = Array.from(details.children).find((child) => child.tagName === 'SUMMARY')
    if (!details.open && !summary?.contains(element)) {
      return true
    }
  }
  return false
}

/** A group of radio buttons is one stop: the checked one, or the first when none is checked. */
function isRadioStop(element: HTMLElement, dialog: HTMLElement): boolean {
  if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || element.name === '') {
    return true
  }

  const group = Array.from(dialog.querySelectorAll<HTMLInputElement>('input[type="radio"]')).filter(
    (radio) => radio.name === element.name && radio.form === element.form,
  )
  return element.checked || (!group.some((radio) => radio.checked) && group[0] === element)
}

/**
 * The background is what scrolls, so its scrollbar belongs to it, and dragging that scrollbar is not asking to
 * close. jsdom lays nothing out and every size there is 0, so no press there is on a scrollbar.
 */
function isOnScrollbar(event: ReactPointerEvent<HTMLElement>): boolean {
  const backdrop = event.currentTarget
  const box = backdrop.getBoundingClientRect()
  const barWidth = backdrop.offsetWidth - backdrop.clientWidth
  const barHeight = backdrop.offsetHeight - backdrop.clientHeight
  return (barWidth > 0 && event.clientX >= box.right - barWidth) || (barHeight > 0 && event.clientY >= box.bottom - barHeight)
}
