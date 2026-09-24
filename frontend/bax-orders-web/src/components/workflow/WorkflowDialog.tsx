import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import type { OrderWorkflow } from '../../api/workflow'
import { missingPriceShortLabel } from '../../pricing/labels'
import { pricedLinesTotalLabel } from '../../terminology/terms'
import { ApiError } from '../../api/client'
import { formatMoney, formatMonth } from '../analytics/format'
import { Modal } from '../imports/review/Modal'
import {
  acknowledgeMissingPricesLabel,
  approveLabel,
  decisionFactLabels,
  missingPriceNote,
  missingPriceWarning,
  returnLabel,
  submissionCountLabel,
  submitLabel,
  workflowErrors,
} from './labels'

export type WorkflowDialogKind = 'submit' | 'approve' | 'return'

interface WorkflowDialogProps {
  kind: WorkflowDialogKind
  workflow: OrderWorkflow
  onClose: () => void
  onConfirm: (input: { comment: string; acknowledge: boolean }) => Promise<void>
}

const titles: Record<WorkflowDialogKind, string> = {
  submit: submitLabel,
  approve: approveLabel,
  return: returnLabel,
}

/**
 * The one place a workflow action is taken. It shows what is about to be acted on before it is acted on —
 * which month, which time it has been sent, how many lines and how much money — because approving an order is
 * a decision about those things and not about a button.
 * <para>
 * Nobody says who they are here. The signed-in session answers that, and the server records it.
 * </para>
 */
export function WorkflowDialog({ kind, workflow, onClose, onConfirm }: WorkflowDialogProps) {
  const [comment, setComment] = useState('')
  const [acknowledge, setAcknowledge] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const missing = workflow.missingPriceItemCount
  const needsAcknowledgement = kind === 'approve' && workflow.requiresMissingPriceAcknowledgement
  const reasonRequired = kind === 'return'

  // Which time it was sent, in words, where it has been sent: that is what a decision is about. A request
  // about to be sent has no count of its own yet.
  const facts = workflow.decisionFacts
  const submission = facts.submissionNumber > 0
    ? submissionCountLabel(facts.submissionNumber, facts.previousReturn !== null)
    : null

  const reasonMissing = reasonRequired && comment.trim().length === 0
  const blocked = reasonMissing || (needsAcknowledgement && !acknowledge)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm({ comment: comment.trim(), acknowledge })
    } catch (problem: unknown) {
      // The server is the authority; its message is shown when it has one.
      setError(problem instanceof ApiError ? problem.message : workflowErrors.unknown)
      setBusy(false)
    }
  }

  return (
    <Modal
      title={titles[kind]}
      subtitle={[workflow.locationName, formatMonth(workflow.requestPeriod), submission].filter(Boolean).join(' · ')}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            İmtina
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={blocked || busy}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {busy ? 'Gözləyin…' : titles[kind]}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
          <Fact label="Obyekt" value={workflow.locationName} />
          <Fact label="Dövr" value={formatMonth(workflow.requestPeriod)} />
          {submission && <Fact label={decisionFactLabels.submission} value={submission} />}
          <Fact
            label={workflow.amountIsComplete ? 'Məbləğ' : pricedLinesTotalLabel}
            value={formatMoney(workflow.knownAmountTotal)}
          />
          <Fact label={missingPriceShortLabel} value={String(missing)} />
        </dl>

        {missing > 0 && (
          <p className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900" role="status">
            <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span>{kind === 'approve' ? missingPriceWarning(missing) : missingPriceNote(missing)}</span>
          </p>
        )}

        <label className="block">
          <span className="text-xs text-slate-600">
            {reasonRequired ? 'Səbəb' : 'Qeyd (məcburi deyil)'}
          </span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            placeholder={reasonRequired ? 'Nəyin düzəldilməli olduğunu yazın' : ''}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          />
          {reasonMissing && <span className="mt-1 block text-xs text-amber-800">{workflowErrors.reasonRequired}</span>}
        </label>

        {needsAcknowledgement && (
          <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2">
            <input
              type="checkbox"
              checked={acknowledge}
              onChange={(event) => setAcknowledge(event.target.checked)}
              className="mt-0.5"
            />
            <span className="text-xs text-amber-900">{acknowledgeMissingPricesLabel}</span>
          </label>
        )}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
