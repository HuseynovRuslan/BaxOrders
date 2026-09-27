import { useEffect, useState } from 'react'
import { ApiError } from '../../../api/client'
import { addOrderItem } from '../../../api/revisions'
import { searchProductVariants, searchReference, type ReferenceOption } from '../../../api/review'
import { noPriceLabel, unknownSupplierLabel } from '../../imports/labels'
import { Modal } from '../../imports/review/Modal'
import { SupplierPicker } from './SupplierPicker'
import { ResponsiblePersonPicker } from './ResponsiblePersonPicker'
import { addLineLabel, revisionErrors } from './labels'

interface AddLineDialogProps {
  orderRequestId: number
  rowVersion: string
  onClose: () => void
  onSaved: () => void
  onStale: () => void
}

/**
 * Adds a line to a correction draft.
 * <para>
 * The product is chosen from the catalog in two steps — the product, then one of its variants — because a
 * variant is what an order line actually is, and a variant of another product is never a candidate. Typed
 * text is a search and nothing else: no product is created here.
 * </para>
 */
export function AddLineDialog({ orderRequestId, rowVersion, onClose, onSaved, onStale }: AddLineDialogProps) {
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState<ReferenceOption[]>([])
  const [product, setProduct] = useState<ReferenceOption | null>(null)
  const [variants, setVariants] = useState<ReferenceOption[]>([])
  const [variantId, setVariantId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [priceKnown, setPriceKnown] = useState(false)
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [personId, setPersonId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchReference('Product', productSearch.trim(), controller.signal)
        .then(setProducts)
        .catch(() => undefined)
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [productSearch])

  useEffect(() => {
    if (product === null) {
      setVariants([])
      return
    }

    const controller = new AbortController()
    searchProductVariants(product.id, '', controller.signal)
      .then(setVariants)
      .catch(() => undefined)
    return () => controller.abort()
  }, [product])

  const parsedQuantity = Number(quantity.replace(',', '.'))
  const quantityValid = quantity.trim() !== '' && Number.isFinite(parsedQuantity) && parsedQuantity > 0
  const parsedPrice = Number(price.replace(',', '.'))
  const priceValid = !priceKnown || (price.trim() !== '' && Number.isFinite(parsedPrice) && parsedPrice >= 0)

  async function save() {
    if (variantId === null) {
      setError(revisionErrors.variantRequired)
      return
    }

    setBusy(true)
    setError(null)
    try {
      await addOrderItem(orderRequestId, {
        rowVersion,
        productVariantId: variantId,
        quantity: parsedQuantity,
        // Left out rather than sent as zero: a new line may legitimately have no price yet.
        unitPrice: priceKnown ? parsedPrice : null,
        supplierId,
        // Left out rather than guessed when nobody was chosen: a line with no responsible person is a
        // truthful line, and picking one for it would put a name on somebody else's request.
        responsiblePersonId: personId,
      })
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
      title={addLineLabel}
      onClose={onClose}
      width="wide"
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
            disabled={busy || variantId === null || !quantityValid || !priceValid}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {busy ? 'Əlavə edilir…' : 'Əlavə et'}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block">
              <span className="text-xs text-slate-600">Məhsul</span>
              <input
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Ad, kod və ya model…"
                aria-label="Məhsul axtar"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5"
              />
            </label>

            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-slate-200">
              {products.length === 0 && <p className="px-3 py-1.5 text-xs text-slate-500">Uyğun məhsul tapılmadı.</p>}
              {products.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setProduct(option)
                    setVariantId(null)
                  }}
                  className={`flex w-full flex-col px-3 py-1.5 text-left hover:bg-slate-50 ${
                    product?.id === option.id ? 'bg-slate-100 font-medium' : ''
                  }`}
                >
                  <span className="text-slate-900">{option.label}</span>
                  {option.secondary && <span className="text-xs text-slate-500">{option.secondary}</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-600">Variant</span>
            <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200">
              {product === null && <p className="px-3 py-1.5 text-xs text-slate-500">Əvvəlcə məhsul seçin.</p>}
              {product !== null && variants.length === 0 && (
                <p className="px-3 py-1.5 text-xs text-slate-500">Bu məhsulun variantı yoxdur.</p>
              )}
              {variants.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setVariantId(option.id)}
                  className={`flex w-full flex-col px-3 py-1.5 text-left hover:bg-slate-50 ${
                    variantId === option.id ? 'bg-slate-100 font-medium' : ''
                  }`}
                >
                  <span className="text-slate-900">{option.label}</span>
                  {option.secondary && <span className="text-xs text-slate-500">{option.secondary}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="block">
          <span className="text-xs text-slate-600">Miqdar</span>
          <input
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5"
          />
          {quantity.trim() !== '' && !quantityValid && (
            <span className="mt-1 block text-xs text-amber-800">{revisionErrors.quantityRequired}</span>
          )}
        </label>

        <fieldset>
          <legend className="text-xs text-slate-600">Qiymət</legend>
          <label className="mt-1 flex items-center gap-2">
            <input type="checkbox" checked={!priceKnown} onChange={(event) => setPriceKnown(!event.target.checked)} />
            <span className="text-sm text-slate-700">{noPriceLabel}</span>
          </label>
          {priceKnown && (
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              aria-label="Qiymət"
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-1.5"
            />
          )}
        </fieldset>

        <SupplierPicker
          value={supplierId}
          currentName={null}
          onChange={setSupplierId}
          emptyLabel={unknownSupplierLabel}
        />

        <ResponsiblePersonPicker value={personId} currentName={null} onChange={setPersonId} />

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
