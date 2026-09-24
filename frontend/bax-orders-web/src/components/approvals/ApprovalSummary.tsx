import type { ApprovalInboxSummary } from '../../api/approvals'
import { missingPriceCount } from '../../pricing/labels'
import { SummaryMetric } from '../SummaryMetric'
import { formatCount } from '../analytics/format'

interface ApprovalSummaryProps {
  summary: ApprovalInboxSummary
}

/**
 * The whole queue in a glance, whatever the search or filters below currently narrow the rows to — this is
 * why every figure here comes straight off the summary the server computed over the complete queue, and
 * never off the rows actually on the screen. Three things, not six: how big the queue is and how much of it
 * is actually this reader's to decide, what is blocked for them specifically, and what is short a price.
 * Which rows are revisions is said on the rows themselves.
 */
export function ApprovalSummary({ summary }: ApprovalSummaryProps) {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3" role="group" aria-label="Növbənin xülasəsi">
      <SummaryMetric
        label="Gözləyən sifarişlər"
        value={formatCount(summary.pendingCount)}
        note={`${formatCount(summary.actionableByCurrentUserCount)} qərar verə bilərəm`}
        size="lg"
      />
      <SummaryMetric
        label="Mənim üçün bloklanıb"
        value={formatCount(summary.blockedForCurrentUserCount)}
        warn={summary.blockedForCurrentUserCount > 0}
      />
      <SummaryMetric
        label="Qiyməti olmayan sətiri olan sifarişlər"
        value={formatCount(summary.missingPriceRequestCount)}
        note={summary.missingPriceItemCount > 0 ? missingPriceCount(summary.missingPriceItemCount) : undefined}
        warn={summary.missingPriceRequestCount > 0}
      />
    </div>
  )
}
