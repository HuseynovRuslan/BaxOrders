import type { MonthlyReport } from '../../api/reports'
import type { ReportView } from '../../analytics/reportView'
import { isFutureMonth } from '../analytics/format'

/** January first, in the short form a twelve-column header has room for. */
export const shortMonths = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn',
  'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek',
]

/** The report's twelve months, January first, in the `yyyy-MM` form the cells' periods start with. */
export function reportPeriods(year: number): string[] {
  return shortMonths.map((_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
}

/** Which of the year's twelve months have not begun on the reader's calendar. */
export function futureMonths(year: number, today: Date): boolean[] {
  return reportPeriods(year).map((period) => isFutureMonth(period, today))
}

/**
 * A month that has not begun: a hatch of `outline` lines on the quiet surface (DK-14 — the lines are 4:1 against it),
 * with no word in it, so the whole of it reads as "not yet" rather than as a month somebody skipped. The legend, the
 * phone's strip and the month's header draw the same hatch.
 */
export const futureMonthClass =
  'bg-surface-container-low bg-[image:repeating-linear-gradient(135deg,transparent_0_6px,var(--color-outline)_6px_7px)]'

/**
 * The same hatch as a 4-pixel bar under a month's name (03 §6.2.6), so a header says "not begun" on the screen and not
 * only in its tooltip. Drawn by the element's `::after`; the element must be positioned.
 */
export const futureMonthMarkerClass =
  'after:absolute after:inset-x-1 after:bottom-0.5 after:h-1 after:rounded-sm '
  + 'after:bg-[image:repeating-linear-gradient(135deg,transparent_0_6px,var(--color-outline)_6px_7px)]'

/**
 * The table's minimum width, by view (D-51, S-2b = 12 px): the object 120, twelve months of 74 (Yığcam) or 106
 * (Standart) — a five-figure sum at 12 px and at least 6 pixels before its neighbour — and the year 88.
 * 120 + 12 × 74 + 88 = 1096; 120 + 12 × 106 + 88 = 1480.
 */
export function tableMinWidthClass(view: ReportView): string {
  return view === 'Standard' ? 'min-w-[1480px]' : 'min-w-[1096px]'
}

/** The latest month any object ordered in, January = 0; −1 for a year with none. */
export function latestOrderedMonth(report: MonthlyReport): number {
  for (let index = report.months.length - 1; index >= 0; index -= 1) {
    if (report.months[index].locationsWithRequest > 0) {
      return index
    }
  }

  return -1
}
