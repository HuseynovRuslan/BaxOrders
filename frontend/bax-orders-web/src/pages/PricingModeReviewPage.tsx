import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { orderLink, parseBasis, type BasisSelection } from '../analytics/basisParams'
import { ApiError } from '../api/client'
import type { PricingMode } from '../api/orders'
import {
  fetchPricingModeReview,
  setPricingMode,
  type PricingModeReview,
  type PricingModeReviewRow,
} from '../api/pricing'
import { useAuth } from '../auth/AuthProvider'
import { readOnlyNote } from '../auth/labels'
import { EmptyState, ErrorState, LoadingRows } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { InfoHint } from '../components/analytics/InfoHint'
import { formatCount, formatMonth, formatQuantity, toMonthKey } from '../components/analytics/format'
import { internalSupplyHint } from '../components/analytics/labels'
import { formatOrderUnit } from '../components/imports/labels'
import { Modal } from '../components/imports/review/Modal'

const pageSize = 50

/** What each state of a line is called here, where the whole screen is about telling them apart. */
const modeLabels: Record<PricingMode, string> = {
  Unresolved: 'Təsnif edilməyib',
  PriceRequired: 'Alış qiyməti tələb olunur',
  InternalFreeSupply: 'Ödənişsiz daxili təminat',
}

const modeToneClass: Record<PricingMode, string> = {
  Unresolved: 'bg-amber-50 text-amber-900 ring-amber-200',
  PriceRequired: 'bg-slate-100 text-slate-700 ring-slate-300',
  InternalFreeSupply: 'bg-sky-50 text-sky-900 ring-sky-200',
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: PricingModeReview }

/**
 * The unpriced lines nobody has classified, and the one decision that empties the queue.
 *
 * This screen exists because one source can be both. Qala anbar buys some material through Cleanfix MMC and
 * issues the rest free from the same store, and nothing in the data separates the two — so no rule could
 * split them without guessing, and the rows were left for a person. Deciding is line by line on purpose:
 * there is no "mark every line of this supplier" here, because that is exactly the mistake this undoes.
 *
 * Everybody signed in may read it — how much of the missing money is a real gap and how much is merely
 * unclassified is the context behind every warning on the dashboard. Only the catalogue policy may decide,
 * and the server refuses whatever this screen offers, so the hidden button is a courtesy and not the control.
 *
 * A Rəhbər does not find it in the menu. They open it from an order's price warning (14.1), and it is then that
 * order's unpriced lines — `?order=` — with the way back to the order and the basis they left it with.
 */
export function PricingModeReviewPage() {
  const [params] = useSearchParams()
  const order = orderScope(params.get('order'))

  // Opening or leaving an order's lines starts the page afresh: its own filter, its own search, its own page.
  return <PricingModeReview key={order ?? 'all'} order={order} basis={parseBasis(params)} />
}

/** The order an address is narrowed to, or null when it names none a reader could have been sent to. */
function orderScope(raw: string | null): number | null {
  const value = raw !== null && /^\d+$/.test(raw) ? Number(raw) : NaN
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

function PricingModeReview({ order, basis }: { order: number | null; basis: BasisSelection }) {
  const { user } = useAuth()
  // One order's lines are listed whatever their state: the warning counted them all, not only the unclassified.
  const [mode, setMode] = useState<PricingMode | 'All'>(order === null ? 'Unresolved' : 'All')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [deciding, setDeciding] = useState<PricingMode | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  // The order's object and month, kept once seen, so a filter that leaves no row still says whose lines these are.
  const [scope, setScope] = useState<{ locationName: string; requestPeriod: string } | null>(null)

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })

    fetchPricingModeReview(
      {
        mode: mode === 'All' ? undefined : mode,
        search: search || undefined,
        page,
        pageSize,
        ...(order === null ? {} : { orderRequestId: order }),
      },
      controller.signal,
    )
      .then((data) => {
        setState({ status: 'success', data })
        if (order !== null && data.rows.length > 0) {
          setScope({ locationName: data.rows[0].locationName, requestPeriod: data.rows[0].requestPeriod })
        }
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: message(problem, 'Sətirlər yüklənmədi') })
        }
      })

    return () => controller.abort()
  }, [order, mode, search, page, reloadToken])

  // A selection belongs to the rows it was made on; changing the filter or the page leaves it behind.
  useEffect(() => setSelected(new Set()), [mode, search, page, reloadToken])

  const data = state.status === 'success' ? state.data : null
  const rows = data?.rows ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / pageSize)) : 1
  const canDecide = user?.canManageCatalog ?? false
  // The order has no unpriced line at all: the scope line says so, and the empty table does not say it again.
  const orderIsClear = order !== null && data !== null
    && data.unresolved + data.missingRequiredPrice + data.internalFreeSupply === 0

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current)
      if (!next.delete(id)) {
        next.add(id)
      }

      return next
    })
  }

  return (
    <>
      <PageHeader
        title="Qiymət təsnifatı"
        description={canDecide
          ? 'Qiyməti olmayan sətirlərin alınan, yoxsa şirkətdaxili təmin olunan material olduğunu qeyd edin'
          // An instruction to somebody who may not follow it reads as a fault; a reader is told what is here.
          : 'Qiyməti olmayan sətirlər və onların təsnifatı'}
      />

      {!canDecide && (
        <p className="mb-3 rounded-md border border-sky-200 bg-sky-50 p-2 text-sm text-sky-900" role="note">
          {readOnlyNote}
        </p>
      )}

      {notice && (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>
      )}

      {order !== null && (data !== null || scope !== null) && (
        <div
          className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-slate-200 bg-white p-3 text-sm"
          aria-label="Sifarişin qiyməti olmayan sətirləri"
        >
          <p className="font-medium text-slate-900">
            {orderIsClear
              ? 'Bu sifarişdə qiyməti olmayan sətir yoxdur.'
              : scope
                ? `${scope.locationName} · ${formatMonth(toMonthKey(scope.requestPeriod))} sifarişinin qiyməti olmayan sətirləri`
                : 'Bu sifarişin qiyməti olmayan sətirləri'}
          </p>
          <div className="flex gap-3 text-slate-600">
            {/* Back with the basis the reader left the order with (Task 1). */}
            <Link to={orderLink(order, basis)} className="underline hover:text-slate-900">
              Sifarişə qayıt
            </Link>
            <Link to="/pricing-modes" className="underline hover:text-slate-900">
              Bütün sətirlər
            </Link>
          </div>
        </div>
      )}

      {data && (
        <dl className="mb-4 flex flex-wrap gap-2 text-sm" aria-label="Qiyməti olmayan sətirlərin sayı">
          <Total label={modeLabels.Unresolved} value={data.unresolved} attention />
          <Total label={modeLabels.PriceRequired} value={data.missingRequiredPrice} />
          <Total label={modeLabels.InternalFreeSupply} value={data.internalFreeSupply} />
        </dl>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Təsnifata görə süz">
          {(['Unresolved', 'PriceRequired', 'InternalFreeSupply', 'All'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => {
                setMode(option)
                setPage(1)
              }}
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium ${
                mode === option ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {option === 'All' ? 'Hamısı' : modeLabels[option]}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            setSearch(searchInput.trim())
            setPage(1)
          }}
        >
          <label className="sr-only" htmlFor="pricing-search">Məhsul, kod və ya obyekt üzrə axtar</label>
          <input
            id="pricing-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Məhsul, kod və ya obyekt…"
            className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
          />
        </form>

        {canDecide && selected.size > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">{formatCount(selected.size)} sətir seçilib</span>
            <button
              type="button"
              onClick={() => setDeciding('InternalFreeSupply')}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Şirkətdaxili təminat kimi qeyd et
            </button>
            <button
              type="button"
              onClick={() => setDeciding('PriceRequired')}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Alış qiyməti tələb olunur
            </button>
          </div>
        )}
      </div>

      {state.status === 'loading' && <LoadingRows label="Sətirlər yüklənir" />}
      {state.status === 'error' && <ErrorState message={state.message} />}

      {data && rows.length === 0 && !orderIsClear && (
        <EmptyState>
          {mode === 'Unresolved'
            ? 'Təsnif edilməmiş sətir qalmayıb.'
            : 'Bu filtrə uyğun sətir tapılmadı.'}
        </EmptyState>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <caption className="sr-only">Qiyməti olmayan sətirlər və onların mənbəyi</caption>
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                {canDecide && <th scope="col" className="w-10 px-3 py-2"><span className="sr-only">Seç</span></th>}
                <th scope="col" className="px-3 py-2">Məhsul</th>
                <th scope="col" className="px-3 py-2">Obyekt</th>
                <th scope="col" className="px-3 py-2">Dövr</th>
                <th scope="col" className="px-3 py-2 text-right">Miqdar</th>
                <th scope="col" className="px-3 py-2">Mənbə</th>
                <th scope="col" className="px-3 py-2">Vəziyyət</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.orderRequestItemId} className="hover:bg-slate-50">
                  {canDecide && (
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(row.orderRequestItemId)}
                        onChange={() => toggle(row.orderRequestItemId)}
                        aria-label={`${row.productName} · ${row.locationName} · ${formatMonth(toMonthKey(row.requestPeriod))}`}
                        className="size-4 rounded border-slate-300"
                      />
                    </td>
                  )}

                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <p className="font-medium text-slate-900">{row.productName}</p>
                    <p className="text-xs text-slate-400">{describeVariant(row)}</p>
                  </th>

                  <td className="px-3 py-2">
                    <Link to={`/locations/${row.locationId}`} className="text-slate-700 hover:underline">
                      {row.locationName}
                    </Link>
                  </td>

                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    <Link to={`/orders/${row.orderRequestId}`} className="hover:underline">
                      {formatMonth(toMonthKey(row.requestPeriod))}
                    </Link>
                  </td>

                  <td className="whitespace-nowrap px-3 py-2 text-right text-slate-900">
                    {formatQuantity(row.quantity)} {formatOrderUnit(row.orderUnitCode)}
                  </td>

                  {/* The catalogue supplier where there is one, and the workbook cell where there is not:
                      the lines that came in as "Azpetrol baza" never matched a supplier at all, and that
                      cell is the only record of where they came from. */}
                  <td className="px-3 py-2">
                    <p className="text-slate-700">{row.supplierName ?? <span className="text-slate-400">—</span>}</p>
                    {row.workbookSupplierName && (
                      <p className="text-xs text-slate-500" title="Excel faylındakı təchizatçı xanası">
                        «{row.workbookSupplierName}»
                        {row.sheetName && row.rowNumber !== null && (
                          <span className="text-slate-400"> · {row.sheetName}:{row.rowNumber}</span>
                        )}
                      </p>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${modeToneClass[row.pricingMode]}`}
                    >
                      {modeLabels[row.pricingMode]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalCount > pageSize && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>Səhifə {page} / {totalPages} · {formatCount(data.totalCount)} sətir</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">
              Əvvəlki
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">
              Növbəti
            </button>
          </div>
        </div>
      )}

      {deciding && (
        <DecideDialog
          mode={deciding}
          rows={rows.filter((row) => selected.has(row.orderRequestItemId))}
          onClose={() => setDeciding(null)}
          onDone={(changed) => {
            setDeciding(null)
            setNotice(`${formatCount(changed)} sətir «${modeLabels[deciding]}» kimi qeyd edildi.`)
            reload()
          }}
        />
      )}
    </>
  )
}

function Total({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return (
    <div
      className={`flex items-baseline gap-2 rounded-md px-3 py-2 ring-1 ring-inset ${
        attention && value > 0 ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-white text-slate-700 ring-slate-200'
      }`}
    >
      <dt className="text-xs">{label}</dt>
      <dd className="font-semibold">{formatCount(value)}</dd>
    </div>
  )
}

/**
 * The last step before a line's records change, with the lines named one by one.
 *
 * The list is the whole safeguard. Nobody should be able to reclassify ninety-four lines without reading what
 * they are, so the decision is confirmed against the actual rows rather than against a count.
 */
function DecideDialog({
  mode,
  rows,
  onClose,
  onDone,
}: {
  mode: PricingMode
  rows: PricingModeReviewRow[]
  onClose: () => void
  onDone: (changed: number) => void
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const result = await setPricingMode({
        orderRequestItemIds: rows.map((row) => row.orderRequestItemId),
        pricingMode: mode,
        reason: reason.trim() || undefined,
      })
      onDone(result.changed)
    } catch (problem) {
      setError(message(problem, 'Qeyd edilmədi'))
      setSaving(false)
    }
  }

  return (
    <Modal title={modeLabels[mode]} subtitle={`${formatCount(rows.length)} sətir`} onClose={onClose}>
      <div className="space-y-3">
        {mode === 'InternalFreeSupply' && (
          <p className="flex items-start gap-1 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <span>
              Bu sətirlər üçün alış qiyməti tələb olunmayacaq və onlar qiymət xəbərdarlıqlarında görünməyəcək.
              Sətrin miqdarı, mənbəyi və məbləği dəyişmir.
            </span>
            <InfoHint label="Daxili təminat nədir?">{internalSupplyHint}</InfoHint>
          </p>
        )}

        <ul className="max-h-60 overflow-y-auto rounded-md border border-slate-200 text-sm">
          {rows.map((row) => (
            <li key={row.orderRequestItemId} className="border-b border-slate-100 px-3 py-2 last:border-b-0">
              <p className="font-medium text-slate-900">{row.productName}</p>
              <p className="text-xs text-slate-500">
                {row.locationName} · {formatMonth(toMonthKey(row.requestPeriod))} ·{' '}
                {formatQuantity(row.quantity)} {formatOrderUnit(row.orderUnitCode)}
                {row.workbookSupplierName && ` · «${row.workbookSupplierName}»`}
              </p>
            </li>
          ))}
        </ul>

        <label className="block text-sm">
          <span className="text-slate-700">Səbəb (könüllü)</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Məsələn: obyekt təsdiqlədi ki, bu material anbardan ödənişsiz verilir."
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm">
            İmtina
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || rows.length === 0}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Qeyd edilir…' : 'Qeyd et'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function describeVariant(row: PricingModeReviewRow): string {
  const parts = [row.productCode, row.specificationValue?.trim(), row.specificationDescriptor?.trim()]
  return parts.filter((part): part is string => Boolean(part)).join(' · ')
}

function message(problem: unknown, fallback: string): string {
  if (problem instanceof ApiError && problem.message) {
    return problem.message
  }

  return problem instanceof Error && problem.message ? problem.message : fallback
}

export { modeLabels as pricingModeLabels }
