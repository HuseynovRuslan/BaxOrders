import type { MonthlyReport } from '../../api/reports'
import { resultCountLabel } from './labels'

/**
 * How much of the catalogue a search left: "1 / 27 obyekt" (UI V2, 03 §6.6; DK-03, DK-23).
 *
 * One live region under the filters, outside both the table and the cards, so it is seen at every width. It is always
 * in the page and only its words change — a region that appears with its words in it is often not announced — so the
 * reader hears the count after pressing Enter. Without a search it says nothing and takes no room.
 *
 * Its words are the answer on the screen and the search that answer was asked with; while the next answer is on its
 * way it is dimmed with the rest of that answer.
 */
export function ReportResultCount({
  report,
  search,
  stale = false,
}: {
  report: MonthlyReport | null
  /** The search the answer on the screen was asked with. */
  search: string
  stale?: boolean
}) {
  const text = report !== null && search !== ''
    ? resultCountLabel(report.filteredLocationCount, report.locationCount)
    : null

  return (
    <p
      role="status"
      className={`mt-2 text-body-sm leading-[18px] text-on-surface-variant tabular empty:mt-0 ${stale ? 'opacity-60' : ''}`}
    >
      {text}
    </p>
  )
}
