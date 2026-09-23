import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import {
  applySafeProductCategories,
  type ApplySafeCategoriesResult,
  type ProductCategorySummary,
} from '../../api/productCategories'
import { formatCount } from '../analytics/format'
import { Modal } from '../imports/review/Modal'
import { applySafeLabel } from './labels'

interface ApplySafeDialogProps {
  /** What the server last said the catalogue looks like. Shown as the preview, never sent back to it. */
  summary: ProductCategorySummary
  onClose: () => void
  onApplied: (result: ApplySafeCategoriesResult) => void
}

/**
 * What a safe application is about to do, before it does it.
 * <para>
 * The counts here are the server's own reading of the catalogue, shown so nobody presses this blind. They are
 * not what gets written: the request carries nothing, and the server works out which products qualify when it
 * arrives. If something changed in between, the server's answer is the one that counts, not this screen's.
 * </para>
 */
export function ApplySafeDialog({ summary, onClose, onApplied }: ApplySafeDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      onApplied(await applySafeProductCategories())
    } catch (problem: unknown) {
      setError(problem instanceof ApiError ? problem.message : 'Əməliyyat yerinə yetirilmədi.')
      setBusy(false)
    }
  }

  return (
    <Modal
      title={applySafeLabel}
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
            disabled={busy || summary.uniqueEvidenceCount === 0}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {busy ? 'Gözləyin…' : 'Tətbiq et'}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <dl className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
          <Fact
            label="məhsula kateqoriya təyin ediləcək"
            value={summary.uniqueEvidenceCount}
            tone="text-slate-900"
          />
          <Fact
            label="ziddiyyətli məhsula toxunulmayacaq"
            value={summary.ambiguousCount}
            tone="text-amber-900"
          />
          <Fact
            label="məlumatsız məhsula toxunulmayacaq"
            value={summary.noEvidenceCount}
            tone="text-slate-600"
          />
          <Fact
            label="artıq kateqoriyası olan məhsula toxunulmayacaq"
            value={summary.assignedCount}
            tone="text-slate-600"
          />
        </dl>

        <p className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900" role="status">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Yalnız Excel tarixçəsi bir yeganə kateqoriya göstərən məhsullar doldurulur. Mövcud kateqoriyaların
            heç biri əvəzlənmir və Excel tarixçəsi dəyişmir.
          </span>
        </p>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

function Fact({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className={`font-semibold ${tone}`}>{formatCount(value)}</dt>
      <dd className="text-slate-600">{label}</dd>
    </div>
  )
}
