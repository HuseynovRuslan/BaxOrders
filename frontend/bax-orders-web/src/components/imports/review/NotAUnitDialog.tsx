import { useState } from 'react'
import { markNotAUnit, type ResolutionKind, type ResolutionResult, type UnresolvedValue } from '../../../api/review'
import { Modal } from './Modal'

interface NotAUnitDialogProps {
  importId: number
  kind: ResolutionKind
  value: UnresolvedValue
  onClose: () => void
  onResolved: (result: ResolutionResult) => void
}

/**
 * Records that a word standing in a unit column is not a unit of measure. Nothing is created: no unit, no
 * alias, and the workbook keeps the value it always had.
 */
export function NotAUnitDialog({ importId, kind, value, onClose, onResolved }: NotAUnitDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSpecification = kind === 'SpecificationUnit'

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      onResolved(await markNotAUnit(importId, { kind, sourceKey: value.sourceKey }))
    } catch (problem) {
      // A 409 means the value is already a real unit in the catalog; its message explains which.
      setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Bu vahid deyil"
      subtitle={value.displayValue}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm">
            Ləğv et
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Təsdiqlə
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-slate-700">
          {isSpecification
            ? 'Bu dəyər ölçü vahidi kimi yox, məhsul spesifikasiyasının təsviri kimi saxlanacaq.'
            : 'Bu dəyər ölçü vahidi sayılmayacaq; bu sətirlər vahidsiz qəbul ediləcək.'}
        </p>

        {isSpecification && (
          <p className="text-slate-600">
            Məsələn: <span className="font-medium text-slate-800">diş</span>,{' '}
            <span className="font-medium text-slate-800">qat</span>,{' '}
            <span className="font-medium text-slate-800">yarpaq</span>,{' '}
            <span className="font-medium text-slate-800">lik</span>. «28» + «diş» variantda «28 diş» kimi qalır və
            sadəcə «28»-dən fərqlənir.
          </p>
        )}

        <p className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
          Yeni ölçü vahidi yaradılmır, alias yazılmır və Excel dəyəri dəyişmir. Qərar yalnız bu importa aiddir:
          növbəti fayl öz sətirləri ilə yenidən qərar verir.
        </p>

        <p className="text-xs text-slate-500">{value.affectedRowCount} sətrə təsir edir.</p>

        {error && <p className="rounded-md border border-red-200 bg-red-50 p-2 text-red-700">{error}</p>}
      </div>
    </Modal>
  )
}
