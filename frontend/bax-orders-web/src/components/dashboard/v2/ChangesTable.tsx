import type { ReactNode } from 'react'
import { MapPin } from 'lucide-react'
import type { LocationDashboardRow, ManagementDashboardSummary } from '../../../api/dashboard'
import { DirectionWord } from '../../analytics/DirectionWord'
import { costDirectionTintClass, costDirectionToneClass, describeBasisCaption, formatMoneyDelta } from '../../analytics/format'
import { ErrorState, LoadingRows } from '../../EmptyState'
import { causeHeadline, noComparisonCause } from '../labels'
import type { ChangesState } from './DifferenceDetail'

/** How many rows the approved design shows. A shortlist, not a second table. */
const rows = 5

/**
 * The objects whose money moved most, as the approved design tables them: where, how much, why, and a way in.
 *
 * Ranked by the money moved, whichever way it moved, so the order the reader sees is the order the figures are
 * in. The pill carries this product's meaning — a cost that rose is red, a cost that fell is green — and the
 * direction is said in words to a screen reader, so the colour is never reading alone.
 *
 * Nothing here is computed: the difference and the cause are the object's own row, the same decomposition the
 * detailed view and the order page read.
 *
 * The five are the first five of every compared object in the server's order (S-6; 01-audit §7.9; AC-07) — the same
 * list the «Fərq» detail opens — never a shortlist of a shortlist, and never narrowed by the table's search or
 * filters. The order is kept as it came (a stable re-sort by the same key changes nothing in it).
 *
 * That list is a request of its own, so it can be slow or fail while the rest of the page has its figures (Q-1). The
 * section stays and says which: placeholder rows while it is read, and a failure as a failure — with the server's
 * words and a way to ask again — never as an empty list or a zero. Only a month in which no compared object moved
 * draws nothing, as before.
 */
export function ChangesTable({ changes, summary, onOpenDetail, onOpenAll, onRetry }: {
  /** Every compared object, largest change first, as the page read it. */
  changes: ChangesState
  summary: ManagementDashboardSummary
  /** Opens «Fərq» under the cards, on this object's row (O-1). */
  onOpenDetail: (row: LocationDashboardRow) => void
  /** Brings the full object table into view. */
  onOpenAll?: () => void
  /** Asks for the list again after it failed. */
  onRetry?: () => void
}) {
  if (changes.status === 'error') {
    return (
      <Frame summary={summary} onOpenAll={onOpenAll}>
        <ErrorState message={changes.message} />
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 w-fit rounded-md border border-outline-variant px-4 text-sm font-medium text-on-surface hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-9"
          >
            Yenidən cəhd et
          </button>
        )}
      </Frame>
    )
  }

  if (changes.rows === null) {
    return (
      <Frame summary={summary} onOpenAll={onOpenAll}>
        <LoadingRows count={rows} label="Məbləğ dəyişiklikləri yüklənir" />
      </Frame>
    )
  }

  const moved = changes.rows
    .filter((row) => row.knownAmountDelta !== null)
    .sort((left, right) => Math.abs(right.knownAmountDelta!) - Math.abs(left.knownAmountDelta!))
    .slice(0, rows)

  if (moved.length === 0) {
    return null
  }

  return (
    <Frame summary={summary} onOpenAll={onOpenAll}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <caption className="sr-only">
            Ən böyük məbləğ dəyişikliyi olan {moved.length} obyekt
          </caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <th scope="col" className="px-4 py-3">Obyekt adı</th>
              <th scope="col" className="w-[180px] px-4 py-3">Dəyişiklik</th>
              <th scope="col" className="w-[180px] px-4 py-3">Səbəb</th>
              <th scope="col" className="w-[100px] px-4 py-3 text-right">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {moved.map((row) => {
              const delta = row.knownAmountDelta!

              return (
                <tr key={row.locationId} id={`attention-${row.locationId}`} className="border-b border-slate-100">
                  <th scope="row" className="px-4 py-3.5 text-left">
                    <span className="flex items-center gap-3">
                      <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                      <span className="min-w-0 truncate text-sm font-semibold text-slate-800">{row.locationName}</span>
                    </span>
                  </th>

                  <td className="px-4 py-3.5">
                    {/* `relative`: the direction word is `sr-only`, absolutely placed — without a box of its own to sit in it escaped
                        the table's scroll box and widened the whole page on a narrow phone. */}
                    <span className={`tabular relative inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${costDirectionTintClass(delta)} ${costDirectionToneClass(delta)}`}>
                      {formatMoneyDelta(delta)}
                      <DirectionWord value={delta} />
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-sm font-semibold text-slate-600">
                    {row.primaryCause === null || row.primaryCauseAmount === null
                      ? noComparisonCause
                      : causeHeadline(row.primaryCause, row.primaryCauseAmount)}
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(row)}
                      aria-label={`${row.locationName} — ətraflı`}
                      className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-slate-200"
                    >
                      Ətraflı
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Frame>
  )
}

/** The section's own frame and heading, the same whether it holds the five, their placeholders or a failure. */
function Frame({ summary, onOpenAll, children }: {
  summary: ManagementDashboardSummary
  onOpenAll?: () => void
  children: ReactNode
}) {
  return (
    <section
      className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6"
      aria-label="Məbləğ dəyişiklikləri"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">Məbləğ dəyişiklikləri</h2>
          <p className="text-xs text-slate-500">
            {describeBasisCaption(summary.basis, summary.baselinePeriods)} ən böyük məbləğ dəyişiklikləri
          </p>
        </div>
        {onOpenAll && (
          <button
            type="button"
            onClick={onOpenAll}
            className="shrink-0 rounded-md border border-slate-300 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Hamısına bax
          </button>
        )}
      </div>

      {children}
    </section>
  )
}
