import { useEffect, useState } from 'react'
import { fetchOrderItemSource, type OrderItemSource } from '../../api/orders'
import { formatAmount, formatDate } from '../imports/labels'
import { Modal } from '../imports/review/Modal'

interface ItemSourceDrawerProps {
  orderRequestItemId: number
  productName: string
  onClose: () => void
}

/**
 * Where one permanent line came from. Three readings of the same row side by side: what Excel contained, what
 * the import works with after the operator's corrections, and which catalog record each value was resolved to.
 * It is a window, never an editor — import corrections belong to the review centre.
 */
export function ItemSourceDrawer({ orderRequestItemId, productName, onClose }: ItemSourceDrawerProps) {
  const [source, setSource] = useState<OrderItemSource | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchOrderItemSource(orderRequestItemId, controller.signal)
      .then(setSource)
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
        }
      })
    return () => controller.abort()
  }, [orderRequestItemId])

  return (
    <Modal title="Mənbə" subtitle={productName} onClose={onClose} width="wide">
      {source === null && !error && <p className="py-6 text-center text-sm text-slate-500">Yüklənir…</p>}

      {source && (
        <div className="space-y-4 text-sm">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-slate-200 bg-slate-50 p-3">
            <Fact label="Fayl" value={source.importFileName} />
            <Fact label="İdxal" value={`#${source.importBatchId} · ${source.importStatus}`} />
            <Fact label="Vərəq" value={source.sheetName} />
            <Fact label="Excel sətri" value={String(source.rowNumber)} />
            <Fact label="Excel cəmi" value={source.originalLineTotal ?? '—'} />
            <Fact label="Hesablanmış cəm" value={formatAmount(source.calculatedLineTotal)} />
            <Fact label="Sifarişə yazılıb" value={formatDate(source.materializedAtUtc.slice(0, 10))} />
          </dl>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-1 font-medium">Sahə</th>
                  <th className="pb-1 font-medium">Mənbə dəyəri (Excel-də)</th>
                  <th className="pb-1 font-medium">Effektiv dəyər (sistem qəbul edir)</th>
                  <th className="pb-1 font-medium">Kanonik qeyd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {source.fields.map((field) => (
                  <tr key={field.column} className="align-top">
                    <td className="py-1.5 pr-2 text-slate-600">{field.column}</td>
                    <td className="py-1.5 pr-2 break-words text-slate-500">{field.sourceValue || '—'}</td>
                    <td className="py-1.5 pr-2 break-words">
                      <span className={field.isCorrected ? 'text-emerald-800' : 'text-slate-700'}>
                        {field.isIntentionallyEmpty ? 'qəsdən boş' : field.effectiveValue || '—'}
                      </span>
                      {field.isCorrected && !field.isIntentionallyEmpty && (
                        <span className="ml-1 rounded bg-emerald-50 px-1 text-[10px] text-emerald-800">düzəliş</span>
                      )}
                    </td>
                    <td className="py-1.5 break-words text-slate-900">{field.canonicalValue || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
            Excel dəyərləri dəyişdirilmir. Düzəliş yalnız xananın nə demək istədiyini qeyd edir; kanonik qeyd isə
            sistemdə həmin dəyərin bağlandığı kataloq yazısıdır. Düzəlişlər idxal baxış mərkəzində edilir.
          </p>
        </div>
      )}

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    </Modal>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="break-words text-slate-900">{value}</dd>
    </div>
  )
}
