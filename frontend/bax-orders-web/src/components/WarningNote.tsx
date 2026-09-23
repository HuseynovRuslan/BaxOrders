import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

interface WarningNoteProps {
  children: ReactNode
  /** Amber for something to notice; red only for an actual error a person must resolve. */
  tone?: 'amber' | 'red'
  /** False when the surrounding element already carries `role="status"`/`role="alert"`. */
  announce?: boolean
}

const toneClass: Record<'amber' | 'red', string> = {
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  red: 'border-red-200 bg-red-50 text-red-800',
}

/**
 * One quiet line for the one thing on a screen that needs a look — never a block of prose, and never
 * repeated once already said. Used for coverage gaps, missing prices, blocked decisions and the like: facts
 * to notice, not alarms.
 */
export function WarningNote({ children, tone = 'amber', announce = true }: WarningNoteProps) {
  return (
    <p
      className={`flex gap-2 rounded-md border p-2 text-xs ${toneClass[tone]}`}
      role={announce ? 'status' : undefined}
    >
      <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
