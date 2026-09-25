import { useEffect, useState } from 'react'
import { fetchOrderItemSource, type OrderItemProvenance } from '../../api/orders'
import { formatAmount, formatDate, orderStatusLabels } from '../imports/labels'
import { Modal } from '../imports/review/Modal'
import { manualItemSourceNote } from './revision/labels'

interface ItemSourceDrawerProps {
  orderRequestItemId: number
  productName: string
  onClose: () => void
}

/**
 * Where one permanent line came from.
 * <para>
 * For an imported line, three readings of the same row side by side: what Excel contained, what the import
 * works with after the operator's corrections, and which catalog record each value was resolved to. For a
 * line copied into a correction, the versions it came through are shown first, ending at the row that started
 * it — and a line somebody added by hand says so plainly instead of reading as unaccounted for.
 * </para>
 * <para>
 * It is a window, never an editor: import corrections belong to the review centre.
 * </para>
 */
export function ItemSourceDrawer({ orderRequestItemId, productName, onClose }: ItemSourceDrawerProps) {
  const [provenance, setProvenance] = useState<OrderItemProvenance | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchOrderItemSource(orderRequestItemId, controller.signal)
      .then(setProvenance)
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
        }
      })
    return () => controller.abort()
  }, [orderRequestItemId])

  const source = provenance?.source ?? null
  const manuallyAdded = provenance?.origin === 'ManuallyAdded'

  return (
    // Read, never written in: a press on the background may close it (17.2).
    <Modal title="Mənbə" subtitle={productName} onClose={onClose} width="wide" dismissOnBackdrop>
      {provenance === null && !error && <p className="py-6 text-center text-sm text-slate-500">Yüklənir…</p>}

      {provenance && provenance.lineage.length > 1 && <Lineage provenance={provenance} />}

      {manuallyAdded && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p>{manualItemSourceNote}</p>
          <p className="mt-1 text-xs text-slate-500">
            Bu sətir düzəliş versiyasında əl ilə əlavə edilib; onun arxasında Excel sətri yoxdur. Kimin əlavə
            etdiyi düzəliş tarixçəsində yazılıb.
          </p>
        </div>
      )}

      {source && (
        <div className="mt-3 space-y-4 text-sm">
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

/**
 * The versions this line was copied through, newest first, ending where it started.
 * <para>
 * Shown only when there is a chain to show: a line imported straight into the version being read has none,
 * and a single step would be a diagram of nothing.
 * </para>
 */
function Lineage({ provenance }: { provenance: OrderItemProvenance }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-xs font-medium text-slate-500">Sətrin keçdiyi versiyalar</h3>
      <ol className="mt-2 space-y-1 text-sm">
        {provenance.lineage.map((step, index) => (
          <li key={step.orderRequestItemId} className="flex flex-wrap items-baseline gap-x-2">
            <span aria-hidden="true" className="text-slate-400">
              {index === 0 ? '•' : '←'}
            </span>
            <span className="text-slate-900">
              {index === 0 ? 'Cari sətir' : `Versiya ${step.version}`}
              {index === 0 && <span className="text-slate-500"> (versiya {step.version})</span>}
            </span>
            <span className="text-xs text-slate-500">{orderStatusLabels[step.status] ?? step.status}</span>
            {step.isImported && <span className="text-xs text-slate-500">· Excel sətri</span>}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-slate-500">
        Kopyalanmış sətir üçün yeni Excel qeydi yaradılmır: mənbə zəncir boyu geri izlənir.
      </p>
    </div>
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
