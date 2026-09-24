import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Dialogs that show a table need more room than the default form width. */
  width?: 'default' | 'wide'
}

/**
 * The one dialog every screen uses. While it is open the page behind it stays where it is: scrolling the dialog
 * used to scroll the page too, so a reader who closed the product history found themselves somewhere else.
 */
export function Modal({ title, subtitle, onClose, children, footer, width = 'default' }: ModalProps) {
  useEffect(() => {
    // What this dialog found, put back as it found it: a dialog opened over another, or straight after one,
    // must not leave the page locked or unlock the dialog still beneath it.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    // overscroll-contain: a scroll that reaches the dialog's end stops there instead of carrying on to the page.
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={subtitle ? `${title} — ${subtitle}` : title}
        className={`mt-10 w-full rounded-lg border border-slate-200 bg-white shadow-lg ${
          width === 'wide' ? 'max-w-3xl' : 'max-w-lg'
        }`}
      >
        <div className="flex items-start gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-medium text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>}
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

        <div className="px-4 py-4">{children}</div>

        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">{footer}</div>}
      </div>
    </div>
  )
}
