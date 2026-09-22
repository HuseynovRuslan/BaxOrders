import { Info } from 'lucide-react'
import { useId, useState } from 'react'

interface InfoHintProps {
  label: string
  children: string
}

/**
 * A short explanation kept off the screen until it is asked for. The text is a real element rather than a
 * `title` attribute, so it is reachable by keyboard and by a screen reader instead of hover only.
 */
export function InfoHint({ label, children }: InfoHintProps) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        onBlur={() => setOpen(false)}
        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>

      <span
        id={id}
        role="note"
        hidden={!open}
        className="absolute top-6 left-0 z-20 w-64 rounded-md border border-slate-200 bg-white p-2 text-xs leading-relaxed font-normal text-slate-600 shadow-lg"
      >
        {children}
      </span>
    </span>
  )
}
