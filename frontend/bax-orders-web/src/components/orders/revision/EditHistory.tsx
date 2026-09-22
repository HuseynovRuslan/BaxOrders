import type { OrderEditEvent } from '../../../api/revisions'
import {
  describeEdit,
  editActionClass,
  editActionLabels,
  formatEditMoment,
} from './labels'

/**
 * Every change made to this correction, oldest first.
 * <para>
 * What each entry says was written when it happened and is shown exactly as stored — nothing is worked out
 * from what the line says now. That is the point of keeping it: a quantity changed twice has two entries, and
 * a line that has since been removed still has its own.
 * </para>
 */
export function EditHistory({ entries }: { entries: OrderEditEvent[] }) {
  if (entries.length === 0) {
    return <p className="py-4 text-sm text-slate-500">Bu versiyada hələ düzəliş edilməyib.</p>
  }

  return (
    <ol className="space-y-2.5">
      {entries.map((entry) => {
        const change = describeEdit(entry)

        return (
          <li key={entry.id} className="flex gap-3 text-sm">
            <span
              className={`mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${editActionClass[entry.action]}`}
            >
              {editActionLabels[entry.action]}
            </span>
            <div className="min-w-0">
              {entry.productName && (
                <p className="text-slate-900">
                  {entry.productName}
                  {entry.productCode && <span className="ml-2 text-xs text-slate-500">{entry.productCode}</span>}
                </p>
              )}
              {change && <p className="text-sm text-slate-700">{change}</p>}
              <p className="text-xs text-slate-500">
                {entry.actorDisplayName} · {formatEditMoment(entry.occurredAtUtc)}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
