import { useState } from 'react'
import { ApiError } from '../../../api/client'
import { approveProductMatch, type ProductMatchSide, type ProductMatchSuggestion } from '../../../api/productMatches'
import { sameItemExplanation, spellingDifferenceLabels, variantExplanation } from '../../../terminology/terms'
import { Modal } from '../../imports/review/Modal'
import {
  approveLabel,
  describeSide,
  describeSideUsage,
  keepWhichQuestion,
  kindLabels,
  reasonMaxLength,
  variantLabelMaxLength,
} from './labels'

interface ApproveMatchDialogProps {
  suggestion: ProductMatchSuggestion
  onClose: () => void
  /** Called after the server approved it. */
  onApproved: () => void
  /** Called after the server refused it, so the list can be read again: the pair may no longer be a suggestion. */
  onRefused: () => void
}

/**
 * Approving one suggested pair, after saying what approving it means.
 * <para>
 * For a spelling pair the administrator chooses which spelling is kept — the one every report will name — and the
 * suggestion's own choice is only preselected. For a variant link the label it will be shown under can be edited,
 * and the dialog repeats that the two products are not merged (13.1). Nothing is sent until "Təsdiqlə" is pressed,
 * and a refusal is shown as the server said it, never retried.
 * </para>
 */
export function ApproveMatchDialog({ suggestion, onClose, onApproved, onRefused }: ApproveMatchDialogProps) {
  const isSpelling = suggestion.kind === 'SameItem'
  const [keep, setKeep] = useState<'target' | 'source'>('target')
  const [label, setLabel] = useState(suggestion.proposedLabel ?? '')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    const trimmedLabel = label.trim()
    if (!isSpelling && (trimmedLabel.length === 0 || trimmedLabel.length > variantLabelMaxLength)) {
      setError(`Variantın adı 1–${variantLabelMaxLength} simvol olmalıdır.`)
      return
    }

    const kept = keep === 'target' ? suggestion.target : suggestion.source
    const folded = keep === 'target' ? suggestion.source : suggestion.target

    setBusy(true)
    setError(null)
    try {
      await approveProductMatch({
        kind: suggestion.kind,
        sourceId: isSpelling ? folded.variantId! : suggestion.source.productId,
        targetId: isSpelling ? kept.variantId! : suggestion.target.productId,
        ...(isSpelling ? {} : { variantLabel: trimmedLabel }),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      })
      onApproved()
    } catch (problem: unknown) {
      setError(problem instanceof ApiError ? problem.message : 'Təsdiq alınmadı.')
      setBusy(false)
      onRefused()
    }
  }

  return (
    <Modal
      title={`${approveLabel} — ${kindLabels[suggestion.kind]}`}
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
            {busy ? 'Gözləyin…' : approveLabel}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        {isSpelling ? (
          <>
            <p className="text-slate-600">{sameItemExplanation}</p>
            {suggestion.difference && (
              <p className="text-xs text-slate-500">{spellingDifferenceLabels[suggestion.difference]}</p>
            )}
            <fieldset>
              <legend className="font-medium text-slate-900">{keepWhichQuestion}</legend>
              <div className="mt-2 space-y-2">
                <KeepOption side={suggestion.target} checked={keep === 'target'} onChange={() => setKeep('target')} />
                <KeepOption side={suggestion.source} checked={keep === 'source'} onChange={() => setKeep('source')} />
              </div>
            </fieldset>
          </>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Əsas məhsul</dt>
                <dd className="font-medium text-slate-900">{suggestion.target.productName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Variant</dt>
                <dd className="font-medium text-slate-900">{suggestion.source.productName}</dd>
              </div>
            </dl>
            <p className="text-slate-600">{variantExplanation}</p>
            <label className="block">
              <span className="text-xs text-slate-600">Variantın adı</span>
              <input
                type="text"
                value={label}
                maxLength={variantLabelMaxLength}
                onChange={(event) => setLabel(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
              />
            </label>
          </>
        )}

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

function KeepOption({ side, checked, onChange }: { side: ProductMatchSide; checked: boolean; onChange: () => void }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 ${checked ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}>
      <input type="radio" name="keep" checked={checked} onChange={onChange} className="mt-1" />
      <span className="min-w-0">
        <span className="block font-medium text-slate-900">{side.productName}</span>
        <span className="block text-xs text-slate-500">{describeSide(side)}</span>
        <span className="block text-xs text-slate-500">{describeSideUsage(side)}</span>
      </span>
    </label>
  )
}
