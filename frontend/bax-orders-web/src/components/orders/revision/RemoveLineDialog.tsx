import { useState } from 'react'
import { ApiError } from '../../../api/client'
import type { OrderRequestItem } from '../../../api/orders'
import { removeOrderItem } from '../../../api/revisions'
import { formatAmount, formatQuantity, noPriceLabel } from '../../imports/labels'
import { Modal } from '../../imports/review/Modal'
import { removeLineExplanation, removeLineLabel, revisionErrors } from './labels'

interface RemoveLineDialogProps {
  orderRequestId: number
  item: OrderRequestItem
  rowVersion: string
  onClose: () => void
  onSaved: () => void
  onStale: () => void
}

/** Takes a line out of a correction draft, after saying exactly how far the removal reaches. */
export function RemoveLineDialog({
  orderRequestId,
  item,
  rowVersion,
  onClose,
  onSaved,
  onStale,
}: RemoveLineDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await removeOrderItem(orderRequestId, item.orderRequestItemId, rowVersion)
      onSaved()
    } catch (problem: unknown) {
      if (problem instanceof ApiError && problem.status === 409) {
        onStale()
        return
      }

      setError(problem instanceof ApiError ? problem.message : revisionErrors.unknown)
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Sətri sil"
      subtitle={item.productName}
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
            className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-40"
          >
            {busy ? 'Silinir…' : removeLineLabel}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-slate-700">{removeLineExplanation}</p>

        <dl className="grid grid-cols-3 gap-x-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
          <div>
            <dt className="text-slate-500">Miqdar</dt>
            <dd className="font-medium text-slate-900">{formatQuantity(item.quantity)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Qiymət</dt>
            <dd className="font-medium text-slate-900">
              {item.unitPrice === null ? noPriceLabel : formatAmount(item.unitPrice)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Cəmi</dt>
            <dd className="font-medium text-slate-900">{formatAmount(item.lineTotal)}</dd>
          </div>
        </dl>

        <p className="text-xs text-slate-500">Silinən sətir düzəliş tarixçəsində olduğu kimi qeyd olunur.</p>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
