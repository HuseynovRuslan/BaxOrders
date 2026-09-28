import type { ManagementDashboardSummary } from '../../api/dashboard'
import { formatMoney } from '../analytics/format'
import { monthlyOrdersLabel, outsideMonthlyOrdersLabel, unclassifiedLinesNote } from '../../orderLines/lineType'

/** What the whole month was made of — every line type, whatever the reader has the page scoped to. */
const title = 'Bu ayın faktiki xərci'

/**
 * The month's shape, seen rather than read.
 *
 * The proportion is the message: a month where a quarter of the money went outside the plan is a different
 * month from one where a fiftieth did, and a bar says that before any number is read. The amounts and shares
 * stay small beside it, because the eye is meant to get the answer from the length.
 *
 * It shows the whole month on purpose, not the selected scope — this is the one place on the simple view that
 * says what the scope selector above is selecting *from*, so it must not move with it.
 *
 * Two rows and not three: unclassified lines are counted in the total and named only when they exist, because
 * on a clean month there is nothing to say and a permanent third row would be permanent noise.
 */
export function SpendSplitBar({ summary, onShowOutsideMonthly }: {
  summary: ManagementDashboardSummary
  /** Opens the month's off-plan lines. Left out, the figures still show; they just do not open. */
  onShowOutsideMonthly?: () => void
}) {
  const { monthly, outsideMonthly, unclassified, unclassifiedItemCount } = summary.lineTypes
  const total = (monthly.knownAmount ?? 0) + (outsideMonthly.knownAmount ?? 0) + (unclassified.knownAmount ?? 0)

  // One kind of line, or no priced money at all: a bar of a single colour says less than no bar.
  if (total <= 0 || outsideMonthly.itemCount === 0) {
    return null
  }

  return (
    <section className="mb-3 rounded-lg border border-slate-200 bg-white px-4 py-3" aria-label={title}>
      <h2 className="mb-2 text-xs text-slate-500">{title}</h2>

      <Row
        label={monthlyOrdersLabel}
        amount={monthly.knownAmount}
        total={total}
        barClass="bg-slate-700"
      />
      <Row
        label={outsideMonthlyOrdersLabel}
        amount={outsideMonthly.knownAmount}
        total={total}
        barClass="bg-slate-400"
        onOpen={onShowOutsideMonthly}
      />

      {unclassifiedItemCount > 0 && (
        <p className="mt-2 text-xs text-slate-500">{unclassifiedLinesNote(unclassifiedItemCount)}</p>
      )}
    </section>
  )
}

function Row({ label, amount, total, barClass, onOpen }: {
  label: string
  amount: number | null
  total: number
  barClass: string
  onOpen?: () => void
}) {
  // A share that rounds to nothing still had money in it, so it keeps a sliver: an empty track would read as
  // "none", which is a different fact.
  const share = amount === null || amount <= 0 ? 0 : Math.max(1, Math.round((amount / total) * 100))

  return (
    <div className="flex items-center gap-3 py-0.5">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="w-32 shrink-0 truncate text-left text-xs text-slate-600 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600 sm:w-44"
        >
          {label}
        </button>
      ) : (
        <span className="w-32 shrink-0 truncate text-xs text-slate-600 sm:w-44">{label}</span>
      )}

      <span className="h-2 min-w-0 flex-1 rounded-full bg-slate-100">
        <span className={`block h-2 rounded-full ${barClass}`} style={{ width: `${share}%` }} />
      </span>

      <span className="w-28 shrink-0 whitespace-nowrap text-right text-xs sm:w-36">
        <span className="font-medium text-slate-800">{formatMoney(amount)}</span>
        <span className="text-slate-400"> · {share}%</span>
      </span>
    </div>
  )
}
