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
import {
  approveLabel,
  formatWorkflowMoment,
  missingPriceNote,
  resubmitLabel,
  returnLabel,
  submitLabel,
  workflowActionClass,
  workflowActionLabels,
  workflowStatusClass,
  workflowStatusLabels,
  workflowStatusSign,
} from './labels'

interface WorkflowPanelProps {
  orderRequestId: number
  onStatusChanged?: (workflow: OrderWorkflow) => void
}

/**
 * Where a request stands, what may be done to it now, and everything that has been done to it.
 * <para>
 * Which buttons appear is the server's answer, not this component's opinion: the state decides, and the
 * server checks again when the action is taken. Nothing here edits an order — a returned request says that
 * correction is needed, and correcting it is not yet built.
 * </para>
 */
export function WorkflowPanel({ orderRequestId, onStatusChanged }: WorkflowPanelProps) {
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

  async function run(
    kind: WorkflowDialogKind,
    input: { actorDisplayName: string; comment: string; acknowledge: boolean },
  ) {
    const comment = input.comment.length > 0 ? input.comment : undefined
    const updated =
      kind === 'submit'
        ? await submitForApproval(orderRequestId, { actorDisplayName: input.actorDisplayName, comment })
        : kind === 'approve'
          ? await approveOrder(orderRequestId, {
              actorDisplayName: input.actorDisplayName,
              comment,
              acknowledgeMissingPrices: input.acknowledge,
            })
          : await returnForCorrection(orderRequestId, {
              actorDisplayName: input.actorDisplayName,
              reason: input.comment,
            })

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

      {workflow.status === 'ReturnedForCorrection' && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          Bu sifariş düzəliş üçün qaytarılıb. Sətirlərin redaktəsi hələ sistemdə yoxdur — düzəliş Excel
          idxalından yeni versiya kimi gəlir.
        </p>
      )}

      {workflow.history.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <h3 className="text-xs font-medium text-slate-500">Əməliyyat tarixçəsi</h3>
          <ol className="mt-2 space-y-2.5">
            {workflow.history.map((entry) => (
              <li key={entry.id} className="flex gap-3 text-sm">
                <span
                  className={`mt-0.5 h-fit rounded px-1.5 py-0.5 text-xs font-medium ${workflowActionClass[entry.action]}`}
                >
                  {workflowActionLabels[entry.action]}
                </span>
                <div className="min-w-0">
                  <p className="text-slate-900">
                    {entry.actorDisplayName}
                    <span className="ml-2 text-xs text-slate-500">{formatWorkflowMoment(entry.occurredAtUtc)}</span>
                  </p>
                  {entry.comment && (
                    <p className="text-xs text-slate-600">
                      {entry.action === 'ReturnedForCorrection' ? <>Səbəb: {entry.comment}</> : entry.comment}
                    </p>
                  )}
                  {entry.missingPricesAcknowledged && (
                    <p className="text-xs text-amber-800">
                      {formatCount(entry.missingPriceItemCount)} qiymətsiz sətir təsdiq zamanı qeyd edilib.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
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
