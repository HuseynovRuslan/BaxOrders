import { useState } from 'react'
import { ApiError } from '../../../api/client'
import { undoProductMatch, type ProductMatchDecision } from '../../../api/productMatches'
import { Modal } from '../../imports/review/Modal'
import { kindLabels, outcomeLabels, reasonMaxLength, undoLabel, undoQuestion } from './labels'

interface UndoDecisionDialogProps {
  decision: ProductMatchDecision
  onClose: () => void
  onUndone: () => void
  /** Called after the server refused, so the list can be read again: somebody may have undone it already. */
  onRefused: () => void
}

/** Taking one decision back, after saying what that does. The record stays, with who undid it and why. */
export function UndoDecisionDialog({ decision, onClose, onUndone, onRefused }: UndoDecisionDialogProps) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await undoProductMatch(decision.id, reason.trim() || undefined)
      onUndone()
    } catch (problem: unknown) {
      setError(problem instanceof ApiError ? problem.message : 'Geri alınmadı.')
      setBusy(false)
      onRefused()
    }
  }

  return (
    <Modal
      title={undoLabel}
      subtitle={`${kindLabels[decision.kind]} · ${outcomeLabels[decision.outcome]}`}
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
            disabled={busy}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {busy ? 'Gözləyin…' : undoLabel}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="font-medium text-slate-900">
          «{decision.sourceProductName}» / «{decision.targetProductName}»
        </p>
        <p className="text-slate-600">{undoQuestion}</p>
        <label className="block">
          <span className="text-xs text-slate-600">Səbəb (məcburi deyil)</span>
          <textarea
            value={reason}
            maxLength={reasonMaxLength}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          />
        </label>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
