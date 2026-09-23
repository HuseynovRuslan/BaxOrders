import { useEffect, useState } from 'react'
import {
  approveOrder,
  fetchWorkflow,
  returnForCorrection,
  submitForApproval,
  type OrderWorkflow,
} from '../../api/workflow'
import { formatCount, formatMoney, unknownValue } from '../analytics/format'
import { WorkflowDialog, type WorkflowDialogKind } from './WorkflowDialog'
import { WorkflowHistory } from './WorkflowHistory'
import {
  approveLabel,
  formatWorkflowMoment,
  missingPriceNote,
  ownContributionBlockedNote,
  resubmitLabel,
  returnLabel,
  selfApprovalBlockedNote,
  submitLabel,
  workflowStatusClass,
  workflowStatusLabels,
  workflowStatusSign,
} from './labels'

interface WorkflowPanelProps {
  orderRequestId: number
  onStatusChanged?: (workflow: OrderWorkflow) => void
  /** False where the page shows the history itself, so it is not on the screen twice. */
  showHistory?: boolean
}

/**
 * Where a request stands, what may be done to it now, and everything that has been done to it.
 * <para>
 * Which buttons appear is the server's answer, not this component's opinion: the state, the signed-in
 * person's role and whether this is their own submission all fold into <c>allowedActions</c>, and the
 * endpoint checks the same rules again when the action is taken. Nothing here edits an order: a returned
 * request is put right by creating its correction version, which the revision panel offers.
 * </para>
 */
export function WorkflowPanel({ orderRequestId, onStatusChanged, showHistory = true }: WorkflowPanelProps) {
  const [workflow, setWorkflow] = useState<OrderWorkflow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<WorkflowDialogKind | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchWorkflow(orderRequestId, controller.signal)
      .then(setWorkflow)
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'İş axını yüklənmədi')
        }
      })
    return () => controller.abort()
  }, [orderRequestId])

  async function run(kind: WorkflowDialogKind, input: { comment: string; acknowledge: boolean }) {
    const comment = input.comment.length > 0 ? input.comment : undefined
    const updated =
      kind === 'submit'
        ? await submitForApproval(orderRequestId, { comment })
        : kind === 'approve'
          ? await approveOrder(orderRequestId, { comment, acknowledgeMissingPrices: input.acknowledge })
          : await returnForCorrection(orderRequestId, { reason: input.comment })

    setWorkflow(updated)
    setDialog(null)
    onStatusChanged?.(updated)
  }

  if (error) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
        {error}
      </section>
    )
  }

  if (!workflow) {
    return <div className="h-24 animate-pulse rounded-lg bg-slate-100" aria-busy="true" />
  }

  const { allowedActions: allowed } = workflow

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${workflowStatusClass[workflow.status]}`}
        >
          <span aria-hidden="true">{workflowStatusSign[workflow.status]}</span>
          {workflowStatusLabels[workflow.status]}
        </span>

        {workflow.missingPriceItemCount > 0 && (
          <span className="text-xs text-amber-800">{missingPriceNote(workflow.missingPriceItemCount)}</span>
        )}

        <span className="ml-auto flex flex-wrap gap-2">
          {allowed.canSubmit && (
            <button
              type="button"
              onClick={() => setDialog('submit')}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              {workflow.status === 'ReturnedForCorrection' ? resubmitLabel : submitLabel}
            </button>
          )}
          {allowed.canApprove && (
            <button
              type="button"
              onClick={() => setDialog('approve')}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              {approveLabel}
            </button>
          )}
          {allowed.canReturn && (
            <button
              type="button"
              onClick={() => setDialog('return')}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {returnLabel}
            </button>
          )}
        </span>
      </div>

      {allowed.blockedBySelfApproval && (
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" role="status">
          {selfApprovalBlockedNote}
        </p>
      )}

      {allowed.blockedByOwnContribution && (
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" role="status">
          {ownContributionBlockedNote}
        </p>
      )}

      {workflow.status === 'ReturnedForCorrection' && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          Bu sifariş üçün düzəliş tələb olunur. Düzəliş bu versiyada aparılmır: yeni versiya yaradılır.
        </p>
      )}

      {showHistory && workflow.history.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <h3 className="text-xs font-medium text-slate-500">Əməliyyat tarixçəsi</h3>
          <div className="mt-2">
            <WorkflowHistory entries={workflow.history} />
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        {workflow.amountIsComplete ? 'Məbləğ' : 'Məlum qiymətlər üzrə məbləğ'}:{' '}
        {formatMoney(workflow.knownAmountTotal)} · {formatCount(workflow.itemCount)} sətir
        {workflow.submittedAtUtc && <> · Təqdim: {formatWorkflowMoment(workflow.submittedAtUtc)}</>}
        {workflow.approvedAtUtc && <> · Təsdiq: {formatWorkflowMoment(workflow.approvedAtUtc)}</>}
        {!workflow.submittedAtUtc && !workflow.approvedAtUtc && <> · Hələ təqdim olunmayıb {unknownValue}</>}
      </p>

      {dialog && (
        <WorkflowDialog
          kind={dialog}
          workflow={workflow}
          onClose={() => setDialog(null)}
          onConfirm={(input) => run(dialog, input)}
        />
      )}
    </section>
  )
}
