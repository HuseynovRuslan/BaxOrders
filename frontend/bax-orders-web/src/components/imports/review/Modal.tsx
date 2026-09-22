import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Dialogs that show a table need more room than the default form width. */
  width?: 'default' | 'wide'
}

export function Modal({ title, subtitle, onClose, children, footer, width = 'default' }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4">
      <div
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
