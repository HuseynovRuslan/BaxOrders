import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthRange } from '../analytics/format'
import { buttonClass } from '../buttonClass'
import { nextMonthsLabel, previousMonthsLabel } from './labels'
import type { BoxScroll } from './reportScroll'

const jumpClass = `scroll-mt-18 ${buttonClass({ variant: 'ghost', size: 'sm', iconOnly: true })}`

/**
 * «‹ Əvvəlki aylar · Fevral–Oktyabr 2026 · Sonrakı aylar ›» above the table (UI V2 03 §4.3, §6.6; UX-04): which months
 * are in sight while the table scrolls in its box, and a page of months either way. Only when the box really scrolls —
 * otherwise every month is in sight and there is nothing to move to. At either end its button says it can go no
 * further but keeps the keyboard's focus, so pressing it there does nothing rather than losing the reader's place.
 */
export function ReportMonthJump({
  scroll,
  periods,
  onPage,
}: {
  scroll: BoxScroll
  /** The year's twelve months, January first, `yyyy-MM`. */
  periods: readonly string[]
  onPage: (direction: 1 | -1) => void
}) {
  if (!scroll.scrolls) {
    return null
  }

  const range = scroll.first !== null && scroll.last !== null
    ? formatMonthRange([periods[scroll.first], periods[scroll.last]])
    : null

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={previousMonthsLabel}
        aria-disabled={scroll.atStart || undefined}
        onClick={() => {
          if (!scroll.atStart) {
            onPage(-1)
          }
        }}
        className={jumpClass}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </button>
      {range !== null && (
        <span className="min-w-36 text-center text-body-sm leading-[18px] text-on-surface-variant tabular">{range}</span>
      )}
      <button
        type="button"
        aria-label={nextMonthsLabel}
        aria-disabled={scroll.atEnd || undefined}
        onClick={() => {
          if (!scroll.atEnd) {
            onPage(1)
          }
        }}
        className={jumpClass}
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
