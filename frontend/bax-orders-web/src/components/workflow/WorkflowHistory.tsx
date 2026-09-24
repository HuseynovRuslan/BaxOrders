import { systemActorLabel } from '../../auth/labels'
import type { WorkflowEvent } from '../../api/workflow'
import { missingPriceCount } from '../../pricing/labels'
import { formatWorkflowMoment, workflowActionClass, workflowActionLabels } from './labels'

/**
 * Everything that has been done to this request, oldest first: who sent it, who decided, and why.
 * <para>
 * Kept apart from the edit history on purpose. This one answers "how far through approval is it"; the other
 * answers "what was changed in the lines". A screen may show them side by side; they remain two records.
 * </para>
 */
export function WorkflowHistory({ entries }: { entries: WorkflowEvent[] }) {
  if (entries.length === 0) {
    return <p className="py-4 text-sm text-slate-500">Bu sifariş hələ təsdiq prosesinə göndərilməyib.</p>
  }

  return (
    <ol className="space-y-2.5">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3 text-sm">
          <span
            className={`mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${workflowActionClass[entry.action]}`}
          >
            {workflowActionLabels[entry.action]}
          </span>
          <div className="min-w-0">
            <p className="text-slate-900">
              {actorOf(entry)}
              <span className="ml-2 text-xs text-slate-500">{formatWorkflowMoment(entry.occurredAtUtc)}</span>
            </p>
            {entry.comment && (
              <p className="text-xs text-slate-600">
                {entry.action === 'ReturnedForCorrection' ? <>Səbəb: {entry.comment}</> : entry.comment}
              </p>
            )}
            {entry.missingPricesAcknowledged && (
              <p className="text-xs text-amber-800">
                Təsdiq zamanı qeyd edilib: {missingPriceCount(entry.missingPriceItemCount)}.
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

/**
 * The name recorded at the time, shown exactly as it was recorded. Nothing is looked up: if the person has
 * since been renamed or disabled, the history still says who acted then. Events with no user behind them —
 * anything from before sign-in existed — read as the system.
 */
function actorOf(entry: WorkflowEvent): string {
  return entry.actorDisplayName.trim().length > 0 ? entry.actorDisplayName : systemActorLabel
}
