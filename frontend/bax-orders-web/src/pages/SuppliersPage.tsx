import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import {
  changeSupplierPriceRequirement,
  fetchSuppliers,
  type SupplierList,
  type SupplierListItem,
} from '../api/suppliers'
import type { SupplierPriceRequirement } from '../api/orders'
import { useAuth } from '../auth/AuthProvider'
import { readOnlyNote } from '../auth/labels'
import { EmptyState, ErrorState, LoadingRows } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { SummaryMetric } from '../components/SummaryMetric'
import { formatCount } from '../components/analytics/format'
import { InfoHint } from '../components/analytics/InfoHint'
import { internalSupplyHint } from '../components/analytics/labels'
import { Modal } from '../components/imports/review/Modal'

const requirementLabels: Record<SupplierPriceRequirement, string> = {
  Required: 'Alış qiyməti tələb olunur',
  NotRequired: 'Qiymət tələb olunmur — daxili anbar',
}

const requirementToneClass: Record<SupplierPriceRequirement, string> = {
  Required: 'bg-slate-100 text-slate-700 ring-slate-300',
  NotRequired: 'bg-sky-50 text-sky-900 ring-sky-200',
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: SupplierList }

/**
 * The supplier catalogue, and the one decision about it that changes what the whole system calls a missing
 * price.
 *
 * Everybody signed in may read this — knowing which suppliers are the company's own stores explains a lot of
 * what the other screens say. Only the catalogue policy may change it, and the server refuses whatever this
 * screen offers, so the button is hidden as a courtesy rather than as the control.
 */
export function SuppliersPage() {
  const { user } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [state, setState] = useState<State>({ status: 'loading' })
  const [editing, setEditing] = useState<SupplierListItem | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })

    fetchSuppliers({ search: search || undefined }, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: problem instanceof ApiError ? problem.message : 'Naməlum xəta',
          })
        }
      })

    return () => controller.abort()
  }, [search, reloadToken])

  const data = state.status === 'success' ? state.data : null
  const mayManage = user?.canManageCatalog === true

  return (
    <>
      <PageHeader
        title="Təchizatçılar"
        description="Materialların alındığı şirkətlər və hansının qiymət tələb etdiyi"
      />

      {/* A Rəhbər reads this page and changes nothing on it (14.1), and is told so rather than left to find out. */}
      {!mayManage && (
        <p className="mb-3 rounded-md border border-sky-200 bg-sky-50 p-2 text-sm text-sky-900" role="note">
          {readOnlyNote}
        </p>
      )}

      {notice && (
        <p className="mb-3 rounded-md border border-sky-200 bg-sky-50 p-2 text-sm text-sky-900" role="status">
          {notice}
        </p>
      )}

      {data && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-label="Təchizatçıların xülasəsi">
          <SummaryMetric label="Təchizatçı" value={formatCount(data.supplierCount)} />
          <SummaryMetric
            label="Daxili təminat"
            value={formatCount(data.priceNotRequiredCount)}
            note="Qiymət tələb olunmur"
          />
          <SummaryMetric
            label="Qiymətli sətri olmayan"
            value={formatCount(data.suppliers.reduce((sum, supplier) => sum + supplier.unpricedItemCount, 0))}
            note="Bütün təchizatçılar üzrə"
          />
        </div>
      )}

      <form
        className="mb-3"
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(searchInput.trim())
        }}
      >
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Təchizatçı adı və ya kodu…"
          aria-label="Təchizatçı axtar"
          className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
        />
      </form>

      {state.status === 'error' && <ErrorState message={state.message} />}
      {state.status === 'loading' && <LoadingRows label="Təchizatçılar yüklənir" />}

      {data && data.suppliers.length === 0 && <EmptyState>Axtarışa uyğun təchizatçı tapılmadı.</EmptyState>}

      {data && data.suppliers.length > 0 && (
        <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Təchizatçı</th>
                <th scope="col" className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    Qiymət siyasəti
                    <InfoHint label="Qiymət siyasəti nədir?">{internalSupplyHint}</InfoHint>
                  </span>
                </th>
                <th scope="col" className="px-4 py-3 text-right">Sətir</th>
                <th scope="col" className="px-4 py-3 text-right">Qiyməti olmayan</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Dəyiş</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.suppliers.map((supplier) => (
                <tr key={supplier.supplierId} className="hover:bg-slate-50">
                  <th scope="row" className="px-4 py-2.5 text-left font-normal">
                    <p className="font-medium text-slate-900">{supplier.name}</p>
                    {supplier.code && <p className="text-xs text-slate-400">{supplier.code}</p>}
                  </th>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${requirementToneClass[supplier.priceRequirement]}`}
                    >
                      {requirementLabels[supplier.priceRequirement]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{formatCount(supplier.orderLineCount)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {supplier.unpricedItemCount === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      // The same number under either policy; only what it means changes.
                      <span className={supplier.priceRequirement === 'Required' ? 'text-amber-800' : 'text-slate-500'}>
                        {formatCount(supplier.unpricedItemCount)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {mayManage && (
                      <button
                        type="button"
                        onClick={() => setEditing(supplier)}
                        className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Dəyiş
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <PriceRequirementDialog
          supplier={editing}
          onClose={() => setEditing(null)}
          onChanged={(message) => {
            setEditing(null)
            setNotice(message)
            reload()
          }}
        />
      )}
    </>
  )
}

/**
 * Changing what a supplier's lines require. The dialog states the consequence in the same breath as the
 * choice, because this is the kind of setting whose effect is felt on five other screens and nowhere here.
 */
function PriceRequirementDialog({
  supplier,
  onClose,
  onChanged,
}: {
  supplier: SupplierListItem
  onClose: () => void
  onChanged: (message: string) => void
}) {
  const next: SupplierPriceRequirement = supplier.priceRequirement === 'Required' ? 'NotRequired' : 'Required'
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      const result = await changeSupplierPriceRequirement(supplier.supplierId, {
        priceRequirement: next,
        reason: reason.trim() || undefined,
      })
      onChanged(
        result.changed
          ? `${result.name}: ${requirementLabels[result.priceRequirement].toLowerCase()}.`
          : `${result.name} üçün dəyişiklik olmadı.`,
      )
    } catch (problem: unknown) {
      setError(problem instanceof ApiError ? problem.message : 'Əməliyyat yerinə yetirilmədi.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Qiymət siyasəti" subtitle={supplier.name} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-slate-700">
          Hazırda: <span className="font-medium">{requirementLabels[supplier.priceRequirement]}</span>
        </p>
        <p className="text-slate-700">
          Yeni: <span className="font-medium">{requirementLabels[next]}</span>
        </p>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          {next === 'NotRequired' ? (
            <>
              Bu təchizatçının qiyməti olmayan {formatCount(supplier.unpricedItemCount)} sətri artıq
              çatışmayan qiymət kimi sayılmayacaq: xəbərdarlıqlarda görünməyəcək və təsdiq zamanı ayrıca
              təsdiq tələb etməyəcək. Sifariş sətirlərinə toxunulmur — yazılmış qiymətlər qalır, yazılmayanlar
              yazılmamış qalır.
            </>
          ) : (
            <>
              Bu təchizatçının qiyməti olmayan {formatCount(supplier.unpricedItemCount)} sətri yenidən
              çatışmayan qiymət kimi sayılacaq və müvafiq xəbərdarlıqlarda görünəcək. Sifariş sətirlərinə
              toxunulmur.
            </>
          )}
        </div>

        <label className="block">
          <span className="text-xs text-slate-600">Səbəb (məcburi deyil)</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
          >
            İmtina
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={confirm}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Gözləyin…' : 'Təsdiq et'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
