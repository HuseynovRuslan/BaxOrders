import { useEffect, useState } from 'react'
import type { OrderEditEvent } from '../../../api/revisions'
import { fetchWorkflow, type WorkflowEvent } from '../../../api/workflow'
import { WorkflowHistory } from '../../workflow/WorkflowHistory'
import { EditHistory } from './EditHistory'
import { editHistoryTitle, workflowHistoryTitle } from './labels'

interface HistoryTabsProps {
  orderRequestId: number
  editHistory: OrderEditEvent[]
  /** Bumped by the page after every change, so the workflow side is re-read too. */
  reloadToken: number
}

type Tab = 'edits' | 'workflow'

/**
 * The two histories of one request, side by side but not merged.
 * <para>
 * They answer different questions — what was changed in the lines, and how far through approval it is — and
 * their entries are not interleaved into one story. Putting them in one place is a convenience for the
 * reader; pretending they are one sequence would invent a chronology neither record claims.
 * </para>
 */
export function HistoryTabs({ orderRequestId, editHistory, reloadToken }: HistoryTabsProps) {
  const [tab, setTab] = useState<Tab>(editHistory.length > 0 ? 'edits' : 'workflow')
  const [workflow, setWorkflow] = useState<WorkflowEvent[]>([])

  useEffect(() => {
    const controller = new AbortController()
    fetchWorkflow(orderRequestId, controller.signal)
      .then((state) => setWorkflow(state.history))
      .catch(() => undefined)
    return () => controller.abort()
  }, [orderRequestId, reloadToken])

  return (
    <section className="mt-4 rounded-lg border border-slate-200 bg-white">
      <div className="flex gap-1 border-b border-slate-200 px-3 pt-2" role="tablist" aria-label="Tarixçə">
        <TabButton current={tab} value="edits" onSelect={setTab} count={editHistory.length}>
          {editHistoryTitle}
        </TabButton>
        <TabButton current={tab} value="workflow" onSelect={setTab} count={workflow.length}>
          {workflowHistoryTitle}
        </TabButton>
      </div>

      <div className="px-4 py-3" role="tabpanel">
        {tab === 'edits' ? <EditHistory entries={editHistory} /> : <WorkflowHistory entries={workflow} />}
      </div>
    </section>
  )
}

function TabButton({
  current,
  value,
  onSelect,
  count,
  children,
}: {
  current: Tab
  value: Tab
  onSelect: (tab: Tab) => void
  count: number
  children: string
}) {
  const active = current === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(value)}
      className={`rounded-t-md border-b-2 px-3 py-1.5 text-sm font-medium ${
        active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
      <span className="ml-1.5 text-xs text-slate-400">{count}</span>
    </button>
  )
}
