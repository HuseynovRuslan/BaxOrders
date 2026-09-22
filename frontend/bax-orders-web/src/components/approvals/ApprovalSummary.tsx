import type { ApprovalInboxSummary } from '../../api/approvals'
import { formatCount } from '../analytics/format'

interface ApprovalSummaryProps {
  summary: ApprovalInboxSummary
}

/**
 * The whole queue in a glance, whatever the search or filters below currently narrow the rows to — this is
 * why every figure here comes straight off the summary the server computed over the complete queue, and
 * never off the rows actually on the screen.
 */
export function ApprovalSummary({ summary }: ApprovalSummaryProps) {
  return (
    <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Fact label="Gözləyən sifarişlər" value={formatCount(summary.pendingCount)} />
      <Fact label="Qərar verə bilərəm" value={formatCount(summary.actionableByCurrentUserCount)} />
      <Fact
        label="Mənim üçün bloklanıb"
        value={formatCount(summary.blockedForCurrentUserCount)}
        warn={summary.blockedForCurrentUserCount > 0}
      />
      <Fact
        label="Qiymətsiz sifarişlər"
        value={formatCount(summary.missingPriceRequestCount)}
        warn={summary.missingPriceRequestCount > 0}
      />
      <Fact
        label="Qiymətsiz sətirlər"
        value={formatCount(summary.missingPriceItemCount)}
        warn={summary.missingPriceItemCount > 0}
      />
      <Fact label="Düzəliş versiyaları" value={formatCount(summary.revisionCount)} />
    </dl>
  )
}

function Fact({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border bg-white p-3 ${warn ? 'border-amber-200' : 'border-slate-200'}`}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-xl font-semibold ${warn ? 'text-amber-900' : 'text-slate-900'}`}>{value}</dd>
    </div>
  )
}
