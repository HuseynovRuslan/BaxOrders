import { useState } from 'react'
import { Link } from 'react-router'
import type { ApprovalInboxRow } from '../../api/approvals'
import { ApiError } from '../../api/client'
import { approveOrder, fetchWorkflow, returnForCorrection, type OrderWorkflow } from '../../api/workflow'
import { formatMonth, formatMoney } from '../analytics/format'
import { previousOrderLinkLabel } from '../../terminology/terms'
import { WorkflowDialog, type WorkflowDialogKind } from '../workflow/WorkflowDialog'
import { approveLabel, formatWorkflowMoment, missingAuthorityNote, returnLabel, workflowErrors } from '../workflow/labels'
import {
  missingPriceRowNote,
  originalLabel,
  ownContributionBlockedRowNote,
  revisionLabel,
  selfApprovalBlockedRowNote,
} from './labels'

interface ApprovalRowsProps {
  rows: ApprovalInboxRow[]
  /** Called after a row actually changed state — approved, returned, or found stale by a conflict. */
  onChanged: () => void
}

type ActionState =
  | { status: 'idle' }
  | { status: 'loading'; orderRequestId: number }
  | { status: 'ready'; orderRequestId: number; kind: WorkflowDialogKind; workflow: OrderWorkflow }
  | { status: 'error'; orderRequestId: number; message: string }

/**
 * The queue's rows, as a table on a wide screen and as cards on a narrow one — the same data either way.
 * <para>
 * Deciding a row opens the very dialog the order detail page already uses: this component fetches the full
 * workflow state for that one request on demand and hands it to <see cref="WorkflowDialog"/>, rather than
 * inventing a second approve/return flow with its own rules.
 * </para>
 */
export function ApprovalRows({ rows, onChanged }: ApprovalRowsProps) {
  const [action, setAction] = useState<ActionState>({ status: 'idle' })
  const [notice, setNotice] = useState<string | null>(null)

  async function start(row: ApprovalInboxRow, kind: WorkflowDialogKind) {
    setNotice(null)
    setAction({ status: 'loading', orderRequestId: row.orderRequestId })
    try {
      const workflow = await fetchWorkflow(row.orderRequestId)
      setAction({ status: 'ready', orderRequestId: row.orderRequestId, kind, workflow })
    } catch (problem: unknown) {
      setAction({
        status: 'error',
        orderRequestId: row.orderRequestId,
        message: problem instanceof Error ? problem.message : workflowErrors.unknown,
      })
    }
  }

  async function confirm(input: { comment: string; acknowledge: boolean }) {
    if (action.status !== 'ready') {
      return
    }

    const { orderRequestId, kind } = action
    try {
      if (kind === 'approve') {
        await approveOrder(orderRequestId, { comment: input.comment || undefined, acknowledgeMissingPrices: input.acknowledge })
      } else if (kind === 'return') {
        await returnForCorrection(orderRequestId, { reason: input.comment })
      }

      setAction({ status: 'idle' })
      onChanged()
    } catch (problem: unknown) {
      // Somebody else decided or edited it first: the row the dialog was built from is stale. Rather than
      // let the dialog argue with a request that has already moved on, the queue is simply read again.
      if (problem instanceof ApiError && problem.status === 409) {
        setAction({ status: 'idle' })
        setNotice(workflowErrors.conflict)
        onChanged()
        return
      }

      throw problem
    }
  }

  return (
    <>
      {notice && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          {notice}
        </p>
      )}

      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <caption className="sr-only">Təsdiq gözləyən sifarişlər</caption>
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">Obyekt</th>
              <th scope="col" className="px-3 py-3">Dövr</th>
              <th scope="col" className="px-3 py-3">Göndərən</th>
              <th scope="col" className="px-3 py-3 text-right">Məbləğ</th>
              <th scope="col" className="px-3 py-3">Status / İcazə</th>
              <th scope="col" className="px-3 py-3"><span className="sr-only">Əməliyyat</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.orderRequestId} className="hover:bg-slate-50">
                <th scope="row" className="px-4 py-2.5 text-left font-normal">
                  <p className="font-medium text-slate-900">{row.locationName}</p>
                </th>
                <td className="px-3 py-2.5 text-slate-700">
                  <p>{formatMonth(row.requestPeriod)}</p>
                  <RevisionBadge row={row} />
                </td>
                <td className="px-3 py-2.5 text-slate-700">
                  <p>{row.submittedByDisplayName}</p>
                  <p className="text-xs text-slate-500">{formatWorkflowMoment(row.submittedAtUtc)}</p>
                </td>
                <td className="px-3 py-2.5 text-right"><Amount row={row} /></td>
                <td className="px-3 py-2.5"><Status row={row} /></td>
                <td className="px-3 py-2.5">
                  <Actions row={row} action={action} onStart={start} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 lg:hidden">
        {rows.map((row) => (
          <li key={row.orderRequestId} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{row.locationName}</p>
                <p className="text-xs text-slate-500">{formatMonth(row.requestPeriod)}</p>
              </div>
              <RevisionBadge row={row} />
            </div>

            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Göndərən</dt>
                <dd className="text-slate-900">{row.submittedByDisplayName}</dd>
                <dd className="text-xs text-slate-500">{formatWorkflowMoment(row.submittedAtUtc)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Məbləğ</dt>
                <dd><Amount row={row} /></dd>
              </div>
            </dl>

            <div className="mt-2"><Status row={row} /></div>

            <div className="mt-3 border-t border-slate-100 pt-2">
              <Actions row={row} action={action} onStart={start} />
            </div>
          </li>
        ))}
      </ul>

      {action.status === 'ready' && (
        <WorkflowDialog
          kind={action.kind}
          workflow={action.workflow}
          onClose={() => setAction({ status: 'idle' })}
          onConfirm={confirm}
        />
      )}
    </>
  )
}

/**
 * The money, and — only when it is not the whole of it — how many lines it leaves out. That line already says
 * the amount is incomplete, so nothing above it repeats the fact under another name.
 */
function Amount({ row }: { row: ApprovalInboxRow }) {
  return (
    <>
      <p className="whitespace-nowrap font-medium text-slate-900">{formatMoney(row.knownAmount)}</p>
      {row.missingPriceItemCount > 0 && (
        <p className="text-xs font-medium text-amber-800">{missingPriceRowNote(row.missingPriceItemCount)}</p>
      )}
    </>
  )
}

/**
 * Whether the row is a first submission or a corrected order. A corrected order links to the order it was made
 * from; which version number either of them carries is not the manager's business and is not shown.
 */
function RevisionBadge({ row }: { row: ApprovalInboxRow }) {
  if (!row.isRevision) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
        {originalLabel}
      </span>
    )
  }

  const badge = (
    <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-900 ring-1 ring-inset ring-sky-200">
      {revisionLabel}
    </span>
  )

  return row.sourceOrderRequestId !== null
    ? (
      <Link to={`/orders/${row.sourceOrderRequestId}`} title={previousOrderLinkLabel} className="hover:opacity-80">
        {badge}
      </Link>
    )
    : badge
}

function Status({ row }: { row: ApprovalInboxRow }) {
  // No approval authority comes first: it is the reason for every row, whoever sent it.
  if (row.blockedByMissingAuthority) {
    return (
      <p className="text-xs text-slate-600" role="status">{missingAuthorityNote}</p>
    )
  }

  if (row.blockedBySelfApproval) {
    return (
      <p className="text-xs text-slate-600" role="status">{selfApprovalBlockedRowNote}</p>
    )
  }

  if (row.blockedByOwnContribution) {
    return (
      <p className="text-xs text-slate-600" role="status">{ownContributionBlockedRowNote}</p>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-sky-800">
      <span aria-hidden="true">⏳</span> Qərar gözləyir
    </span>
  )
}

function Actions({
  row,
  action,
  onStart,
}: {
  row: ApprovalInboxRow
  action: ActionState
  onStart: (row: ApprovalInboxRow, kind: WorkflowDialogKind) => void
}) {
  const busy = action.status === 'loading' && action.orderRequestId === row.orderRequestId

  return (
    <div className="flex flex-wrap items-center gap-2">
      {row.canApprove && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onStart(row, 'approve')}
          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {approveLabel}
        </button>
      )}
      {row.canReturn && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onStart(row, 'return')}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {returnLabel}
        </button>
      )}
      <Link
        to={`/orders/${row.orderRequestId}`}
        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Sifarişə bax
      </Link>
      {action.status === 'error' && action.orderRequestId === row.orderRequestId && (
        <span className="text-xs text-red-700">{action.message}</span>
      )}
    </div>
  )
}
