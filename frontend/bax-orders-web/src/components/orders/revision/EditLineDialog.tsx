import { useState } from 'react'
import { ApiError } from '../../../api/client'
import type { OrderRequestItem } from '../../../api/orders'
import { editOrderItem, type EditOrderItemCommand } from '../../../api/revisions'
import {
  formatItemSpecification,
  formatOrderUnit,
  noPriceLabel,
  unknownSupplierLabel,
} from '../../imports/labels'
import { Modal } from '../../imports/review/Modal'
import { SupplierPicker } from './SupplierPicker'
import { revisionErrors } from './labels'

interface EditLineDialogProps {
  orderRequestId: number
  item: OrderRequestItem
  rowVersion: string
  onClose: () => void
  onSaved: () => void
  onStale: () => void
}

/**
 * Changes one line of a correction draft.
 * <para>
 * A field the person did not touch is not sent at all, so it cannot be overwritten by a round trip through a
 * form. Clearing a price or a supplier is a separate, deliberate choice, and is sent as such — the two are
 * different things to the server, and a cleared price is never a price of zero.
 * </para>
 */
export function EditLineDialog({
  orderRequestId,
  item,
  rowVersion,
  onClose,
  onSaved,
  onStale,
}: EditLineDialogProps) {
  const [quantity, setQuantity] = useState(String(item.quantity))
  const [price, setPrice] = useState(item.unitPrice === null ? '' : String(item.unitPrice))
  const [priceKnown, setPriceKnown] = useState(item.unitPrice !== null)
  const [supplierId, setSupplierId] = useState<number | null>(item.supplierId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedQuantity = Number(quantity.replace(',', '.'))
  const quantityValid = quantity.trim() !== '' && Number.isFinite(parsedQuantity) && parsedQuantity > 0

  const parsedPrice = Number(price.replace(',', '.'))
  const priceValid = !priceKnown || (price.trim() !== '' && Number.isFinite(parsedPrice) && parsedPrice >= 0)

  const nextPrice = priceKnown ? parsedPrice : null
  const changedQuantity = quantityValid && parsedQuantity !== item.quantity
  const changedPrice = priceValid && nextPrice !== item.unitPrice
  const changedSupplier = supplierId !== item.supplierId
  const changedAnything = changedQuantity || changedPrice || changedSupplier

  async function save() {
    setBusy(true)
    setError(null)

    // Only what actually changed travels. An untouched field has no entry at all, which is how the server
    // tells "leave it alone" from "make it empty".
    const command: EditOrderItemCommand = { rowVersion }
    if (changedQuantity) command.quantity = { value: parsedQuantity }
    if (changedPrice) command.unitPrice = { value: nextPrice }
    if (changedSupplier) command.supplierId = { value: supplierId }

    try {
      await editOrderItem(orderRequestId, item.orderRequestItemId, command)
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
      title="Sətri redaktə et"
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
            onClick={save}
            disabled={busy || !changedAnything || !quantityValid || !priceValid}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {busy ? 'Yadda saxlanılır…' : 'Yadda saxla'}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        {/* The product is what the line is; changing it would make it a different line. */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
          <div>
            <dt className="text-slate-500">Məhsul</dt>
            <dd className="font-medium text-slate-900">{item.productName}</dd>
            <dd className="text-slate-500">{item.productCode}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Variant</dt>
            <dd className="text-slate-900">{formatItemSpecification(item) ?? '—'}</dd>
            <dd className="text-slate-500">{formatOrderUnit(item.orderUnitCode)}</dd>
          </div>
        </dl>
        <p className="text-xs text-slate-500">
          Məhsul dəyişdirilmir. Başqa məhsul lazımdırsa, bu sətri silib yenisini əlavə edin.
        </p>

        <label className="block">
          <span className="text-xs text-slate-600">Miqdar</span>
          <input
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5"
          />
          {!quantityValid && <span className="mt-1 block text-xs text-amber-800">{revisionErrors.quantityRequired}</span>}
        </label>

        <fieldset>
          <legend className="text-xs text-slate-600">Qiymət</legend>
          <label className="mt-1 flex items-center gap-2">
            <input
              type="checkbox"
              checked={!priceKnown}
              onChange={(event) => setPriceKnown(!event.target.checked)}
            />
            <span className="text-sm text-slate-700">{noPriceLabel}</span>
          </label>
          {priceKnown && (
            <>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                aria-label="Qiymət"
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-1.5"
              />
              {!priceValid && <span className="mt-1 block text-xs text-amber-800">{revisionErrors.priceNegative}</span>}
            </>
          )}
          <span className="mt-1 block text-xs text-slate-500">
            «{noPriceLabel}» sıfır demək deyil: qiymətin bilinmədiyini bildirir.
          </span>
        </fieldset>

        <SupplierPicker
          value={supplierId}
          currentName={item.supplierName}
          onChange={setSupplierId}
          emptyLabel={unknownSupplierLabel}
        />

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
