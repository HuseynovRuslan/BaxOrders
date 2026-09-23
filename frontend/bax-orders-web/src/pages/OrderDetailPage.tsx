import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { fetchOrder, type OrderRequestDetail, type OrderRequestItem } from '../api/orders'
import { fetchRevision, type OrderRevision } from '../api/revisions'
import { PageHeader } from '../components/PageHeader'
import { SectionHeader } from '../components/SectionHeader'
import { StatusBadge } from '../components/StatusBadge'
import { ItemSourceDrawer } from '../components/orders/ItemSourceDrawer'
import { AddLineDialog } from '../components/orders/revision/AddLineDialog'
import { EditLineDialog } from '../components/orders/revision/EditLineDialog'
import { HistoryTabs } from '../components/orders/revision/HistoryTabs'
import { RemoveLineDialog } from '../components/orders/revision/RemoveLineDialog'
import { RevisionPanel } from '../components/orders/revision/RevisionPanel'
import { addLineLabel, editLineLabel, removeLineLabel, staleDataMessage } from '../components/orders/revision/labels'
import { WorkflowPanel } from '../components/workflow/WorkflowPanel'
import { workflowStatusClass, workflowStatusLabels, workflowStatusSign } from '../components/workflow/labels'
import {
  formatAmount,
  formatItemSpecification,
  formatNumber,
  formatOrderUnit,
  formatPeriod,
  formatQuantity,
  knownAmountLabel,
  noPriceLabel,
  unknownSupplierLabel,
} from '../components/imports/labels'

const pageSize = 50

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: OrderRequestDetail }

type Dialog =
  | { kind: 'edit'; item: OrderRequestItem }
  | { kind: 'remove'; item: OrderRequestItem }
  | { kind: 'add' }

/** One monthly request with its lines, in the order the sheet had them. */
export function OrderDetailPage() {
  const { orderRequestId } = useParams()
  const id = Number(orderRequestId)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [hasPrice, setHasPrice] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [revision, setRevision] = useState<OrderRevision | null>(null)
  const [source, setSource] = useState<{ id: number; name: string } | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Bumped after every change, so the lines, the correction state and both histories are re-read together
  // rather than each drifting on its own copy.
  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetchOrder(id, { search: search || undefined, hasPrice, page, pageSize }, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: problem instanceof Error ? problem.message : 'Naməlum xəta' })
        }
      })
    return () => controller.abort()
  }, [id, search, hasPrice, page, reloadToken])

  useEffect(() => {
    const controller = new AbortController()
    fetchRevision(id, controller.signal)
      .then(setRevision)
      .catch(() => undefined)
    return () => controller.abort()
  }, [id, reloadToken])

  /** What every dialog does when it succeeds, and what a 409 does: read everything again. */
  const afterChange = useCallback(
    (message: string | null) => {
      setDialog(null)
      setNotice(message)
      reload()
    },
    [reload],
  )

  if (state.status === 'error') {
    return (
      <>
        <PageHeader title="Sifariş" />
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{state.message}</p>
        <Link to="/locations" className="mt-3 inline-block text-sm text-slate-600 underline">
          Obyektlərə qayıt
        </Link>
      </>
    )
  }

  const data = state.status === 'success' ? state.data : null
  const totalPages = data ? Math.max(1, Math.ceil(data.items.totalCount / pageSize)) : 1

  // Whether the lines may be changed is the server's answer and nothing else: not the status, not the role,
  // and never worked out here.
  const editable = revision?.canEditRevision === true

  return (
    <>
      <PageHeader
        title={data?.locationName ?? 'Sifariş'}
        description={data ? `${formatPeriod(data.requestPeriod)} · Versiya ${data.version}` : undefined}
        actions={
          data && (
            <>
              <StatusBadge
                label={workflowStatusLabels[data.status] ?? data.status}
                sign={workflowStatusSign[data.status]}
                toneClass={workflowStatusClass[data.status]}
              />
              <Link
                to={`/locations/${data.locationId}`}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Obyektin sifarişləri
              </Link>
            </>
          )
        }
      />

      {notice && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900" role="status">
          {notice}
        </p>
      )}

      {/* A. Sifariş xülasəsi: one number, and what qualifies it. */}
      {data && (
        <section
          className="mt-4 mb-4 rounded-lg border border-slate-200 bg-white p-4"
          aria-label="Sifariş xülasəsi"
        >
          <h2 className="text-xs text-slate-500">
            {data.missingPriceItemCount === 0 ? 'Məbləğ' : `${knownAmountLabel} məbləği`}
          </h2>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatAmount(data.knownAmountTotal)}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatNumber(data.itemCount)} sətir
            {data.missingPriceItemCount > 0 && (
              <span className="text-amber-800"> · {formatNumber(data.missingPriceItemCount)} qiymətsiz</span>
            )}
          </p>
        </section>
      )}

      {/* B. Əməliyyatlar: deciding the request and correcting it, kept apart from the summary and the lines. */}
      {(data || revision) && (
        <div className="mb-4 space-y-3">
          <SectionHeader title="Əməliyyatlar" />
          {data && (
            <WorkflowPanel
              key={reloadToken}
              orderRequestId={data.orderRequestId}
              onStatusChanged={reload}
              showHistory={false}
            />
          )}
          {revision && <RevisionPanel revision={revision} onChanged={reload} />}
        </div>
      )}

      {/* C. Sətirlər */}
      <SectionHeader title="Sətirlər" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setSearch(searchInput.trim())
            setPage(1)
          }}
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Məhsul adı, kodu və ya model…"
            className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
          />
        </form>

        <select
          value={hasPrice === undefined ? '' : String(hasPrice)}
          onChange={(event) => {
            setHasPrice(event.target.value === '' ? undefined : event.target.value === 'true')
            setPage(1)
          }}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        >
          <option value="">Bütün sətirlər</option>
          <option value="true">Yalnız qiyməti olanlar</option>
          <option value="false">Yalnız qiymətsizlər</option>
        </select>

        {/* Offered only where the server says this version may be edited; the endpoint checks again. */}
        {editable && (
          <button
            type="button"
            onClick={() => setDialog({ kind: 'add' })}
            className="ml-auto rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            {addLineLabel}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Məhsul</th>
              <th className="px-3 py-3">Spesifikasiya</th>
              <th className="px-3 py-3 text-right">Miqdar</th>
              <th className="px-3 py-3">Ö/v</th>
              <th className="px-3 py-3 text-right">Qiymət</th>
              <th className="px-3 py-3 text-right">Cəmi</th>
              <th className="px-3 py-3">Təchizatçı</th>
              <th className="px-3 py-3">Kateqoriya</th>
              <th className="px-3 py-3">Mənbə</th>
              {editable && (
                <th className="px-3 py-3">
                  <span className="sr-only">Əməliyyatlar</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.status === 'loading' && (
              <tr>
                <td colSpan={editable ? 11 : 10} className="px-4 py-6 text-center text-slate-500">
                  Yüklənir…
                </td>
              </tr>
            )}
            {data?.items.items.length === 0 && (
              <tr>
                <td colSpan={editable ? 11 : 10} className="px-4 py-6 text-center text-slate-500">
                  {search || hasPrice !== undefined ? 'Axtarışa uyğun sətir tapılmadı.' : 'Bu sifarişdə sətir yoxdur.'}
                </td>
              </tr>
            )}

            {data?.items.items.map((item, index) => (
              <tr key={item.orderRequestItemId} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-xs text-slate-400">{(data.items.page - 1) * data.items.pageSize + index + 1}</td>
                <td className="px-3 py-2">
                  <p className="font-medium text-slate-900">{item.productName}</p>
                  <p className="text-xs text-slate-500">{item.productCode}</p>
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {formatItemSpecification(item) ?? <span className="text-slate-400">—</span>}
                  {item.modelCode && <p className="text-xs text-slate-500">model {item.modelCode}</p>}
                </td>
                <td className="px-3 py-2 text-right text-slate-900">{formatQuantity(item.quantity)}</td>
                <td className="px-3 py-2 text-slate-700">
                  {item.orderUnitCode ? (
                    <span title={item.orderUnitName ?? undefined}>{formatOrderUnit(item.orderUnitCode)}</span>
                  ) : (
                    <span className="text-slate-500">{formatOrderUnit(null)}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {item.unitPrice === null ? (
                    <span className="text-amber-800">{noPriceLabel}</span>
                  ) : (
                    <span className="text-slate-900">{formatAmount(item.unitPrice)}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-slate-900">
                  {item.lineTotal === null ? <span className="text-slate-400">—</span> : formatAmount(item.lineTotal)}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {item.supplierName ?? <span className="text-slate-500">{unknownSupplierLabel}</span>}
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {item.categoryPath.length > 0 ? item.categoryPath.join(' › ') : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2">
                  {/* Secondary next to Redaktə et / Sil: provenance is looked up, not acted on. */}
                  <button
                    type="button"
                    onClick={() => setSource({ id: item.orderRequestItemId, name: item.productName })}
                    className="text-xs text-slate-500 underline hover:text-slate-800"
                  >
                    Mənbəyə bax
                  </button>
                </td>
                {editable && (
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'edit', item })}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {editLineLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'remove', item })}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        {removeLineLabel}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.items.totalCount > pageSize && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>
            Səhifə {data.items.page} / {totalPages} · {formatNumber(data.items.totalCount)} sətir
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Əvvəlki
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Növbəti
            </button>
          </div>
        </div>
      )}

      {revision && <HistoryTabs orderRequestId={id} editHistory={revision.editHistory} reloadToken={reloadToken} />}

      {source && (
        <ItemSourceDrawer
          orderRequestItemId={source.id}
          productName={source.name}
          onClose={() => setSource(null)}
        />
      )}

      {/* Every dialog sends the row version it was opened with, and answers a 409 by reloading. */}
      {dialog?.kind === 'edit' && revision && (
        <EditLineDialog
          orderRequestId={id}
          item={dialog.item}
          rowVersion={revision.rowVersion}
          onClose={() => setDialog(null)}
          onSaved={() => afterChange(null)}
          onStale={() => afterChange(staleDataMessage)}
        />
      )}

      {dialog?.kind === 'remove' && revision && (
        <RemoveLineDialog
          orderRequestId={id}
          item={dialog.item}
          rowVersion={revision.rowVersion}
          onClose={() => setDialog(null)}
          onSaved={() => afterChange(null)}
          onStale={() => afterChange(staleDataMessage)}
        />
      )}

      {dialog?.kind === 'add' && revision && (
        <AddLineDialog
          orderRequestId={id}
          rowVersion={revision.rowVersion}
          onClose={() => setDialog(null)}
          onSaved={() => afterChange(null)}
          onStale={() => afterChange(staleDataMessage)}
        />
      )}
    </>
  )
}
