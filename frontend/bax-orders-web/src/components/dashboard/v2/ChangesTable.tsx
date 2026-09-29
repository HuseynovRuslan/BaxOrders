import { MapPin } from 'lucide-react'
import type { DashboardAttention, ManagementDashboardSummary } from '../../../api/dashboard'
import { DirectionWord } from '../../analytics/DirectionWord'
import { describeBasisCaption, formatMoneyDelta } from '../../analytics/format'
import { causeHeadline, noComparisonCause } from '../labels'

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
 */
export function ChangesTable({ attention, summary, onOpenDetail, onOpenAll }: {
  attention: readonly DashboardAttention[]
  summary: ManagementDashboardSummary
  /** Opens the object's decomposition beside the page. */
  onOpenDetail: (item: DashboardAttention) => void
  /** Brings the full object table into view. */
  onOpenAll?: () => void
}) {
  const moved = attention
    .filter((item) => item.location.knownAmountDelta !== null)
    .sort((left, right) => Math.abs(right.location.knownAmountDelta!) - Math.abs(left.location.knownAmountDelta!))
    .slice(0, rows)

  if (moved.length === 0) {
    return null
  }

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
            {moved.map((item) => {
              const row = item.location
              const delta = row.knownAmountDelta!
              const rising = delta > 0

              return (
                <tr key={row.locationId} id={`attention-${row.locationId}`} className="border-b border-slate-100">
                  <th scope="row" className="px-4 py-3.5 text-left">
                    <span className="flex items-center gap-3">
                      <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                      <span className="min-w-0 truncate text-sm font-semibold text-slate-800">{row.locationName}</span>
                    </span>
                  </th>

                  <td className="px-4 py-3.5">
                    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                      rising ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                    }`}>
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
                      onClick={() => onOpenDetail(item)}
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
    </section>
  )
}
