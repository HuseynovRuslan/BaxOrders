import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../../../api/client'
import type { ImportPreview } from '../../../api/imports'
import {
  fetchImportPricing,
  setImportPricing,
  type ImportPricingResult,
  type ImportPricingReview,
  type ImportPricingRow,
} from '../../../api/importPricing'
import type { PricingMode } from '../../../api/orders'
import {
  importPricingActionLabels,
  importPricingIntro,
  importPricingNoneLeft,
  importPricingNoneMatching,
  importPricingNoUnpricedRows,
  importPricingReadOnlyNote,
  importPricingSavedNotice,
  internalSupplyHint,
  pricingModeChipClass,
  pricingModeLabels,
  pricingReviewLinkLabel,
  pricingReviewPath,
} from '../../../pricing/labels'
import { InfoHint } from '../../analytics/InfoHint'
import { formatCount, formatQuantity } from '../../analytics/format'
import { formatPeriod } from '../labels'
import { Modal } from './Modal'

const pageSize = 50

type Filter = PricingMode | 'All'

const filters: Filter[] = ['Unresolved', 'PriceRequired', 'InternalFreeSupply', 'All']

/** The order the buttons stand in. Clearing is last: it undoes, it does not decide. */
const actions: PricingMode[] = ['PriceRequired', 'InternalFreeSupply', 'Unresolved']

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: ImportPricingReview }

interface PricingClassificationTabProps {
  importId: number
  /** False once the batch has left review: the rows stay readable, and they are changed on Qiymət təsnifatı. */
  canClassify: boolean
  /** Every classification returns the refreshed preview of the batch, as every other review decision does. */
  onChanged: (result: { preview: ImportPreview }) => void
}

/**
 * Brief (Task 16), 16.1: the unpriced rows of this import, classified before they become order lines.
 *
 * The same decision as Qiymət təsnifatı, in the same words, made one row at a time. There is no "select all",
 * no selection by supplier, by the workbook's supplier text, by object, product or category, and nothing is
 * pre-chosen: Qala baza both buys and issues free, so a rule by source would be wrong ("Mənbəyə görə avtomatik
 * təsnifat olmur"). A person ticks the rows and names the state.
 */
export function PricingClassificationTab({ importId, canClassify, onChanged }: PricingClassificationTabProps) {
  const [filter, setFilter] = useState<Filter>('Unresolved')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [deciding, setDeciding] = useState<PricingMode | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })

    fetchImportPricing(
      importId,
      { mode: filter === 'All' ? undefined : filter, search: search || undefined, page, pageSize },
      controller.signal,
    )
      .then((data) => setState({ status: 'success', data }))
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: message(problem, 'Sətirlər yüklənmədi') })
        }
      })

    return () => controller.abort()
  }, [importId, filter, search, page, reloadToken])

  // A selection belongs to the rows it was made on; changing the filter, the search or the page leaves it behind.
  useEffect(() => setSelected(new Set()), [filter, search, page, reloadToken])

  const data = state.status === 'success' ? state.data : null
  const rows = data?.rows ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / pageSize)) : 1
  const noUnpricedRows = data !== null && data.unclassified + data.priceRequired + data.internalFreeSupply === 0

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
    <div className="space-y-3">
      <p className="text-sm text-slate-600">{importPricingIntro}</p>

      {!canClassify && (
        <p className="rounded-md border border-sky-200 bg-sky-50 p-2 text-sm text-sky-900" role="note">
          {importPricingReadOnlyNote}{' '}
          <Link to={pricingReviewPath} className="underline hover:text-sky-950">
            {pricingReviewLinkLabel}
          </Link>
        </p>
      )}

      {notice && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900" role="status">
          {notice}
        </p>
      )}

      {data && (
        <dl className="flex flex-wrap gap-2 text-sm" aria-label="Qiyməti olmayan sətirlərin sayı">
          <Total label={pricingModeLabels.Unresolved} value={data.unclassified} attention />
          <Total label={pricingModeLabels.PriceRequired} value={data.priceRequired} />
          <Total label={pricingModeLabels.InternalFreeSupply} value={data.internalFreeSupply} />
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Təsnifata görə süz">
          {filters.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => {
                setFilter(option)
                setPage(1)
              }}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                filter === option ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {option === 'All' ? 'Hamısı' : pricingModeLabels[option]}
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
          <label className="sr-only" htmlFor="import-pricing-search">Məhsul, obyekt və ya təchizatçı üzrə axtar</label>
          <input
            id="import-pricing-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Məhsul, obyekt və ya təchizatçı…"
            className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
          />
        </form>

        {canClassify && selected.size > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">{formatCount(selected.size)} sətir seçilib</span>
            {actions.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setNotice(null)
                  setDeciding(mode)
                }}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {importPricingActionLabels[mode]}
              </button>
            ))}
          </div>
        )}
      </div>

      {state.status === 'loading' && <p className="py-4 text-center text-sm text-slate-500">Sətirlər yüklənir…</p>}
      {state.status === 'error' && (
        <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{state.message}</p>
      )}

      {data && rows.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-500">
          {noUnpricedRows
            ? importPricingNoUnpricedRows
            : filter === 'Unresolved'
              ? importPricingNoneLeft
              : importPricingNoneMatching}
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <caption className="sr-only">Bu importun qiyməti olmayan sətirləri və onların təsnifatı</caption>
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                {canClassify && <th scope="col" className="w-10 px-3 py-2"><span className="sr-only">Seç</span></th>}
                <th scope="col" className="px-3 py-2">Məhsul</th>
                <th scope="col" className="px-3 py-2">Obyekt</th>
                <th scope="col" className="px-3 py-2">Dövr</th>
                <th scope="col" className="px-3 py-2 text-right">Miqdar</th>
                <th scope="col" className="px-3 py-2">Mənbə</th>
                <th scope="col" className="px-3 py-2">Vəziyyət</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const mode = row.classification ?? 'Unresolved'
                return (
                  <tr key={row.importRowId} className="hover:bg-slate-50">
                    {canClassify && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(row.importRowId)}
                          onChange={() => toggle(row.importRowId)}
                          aria-label={describeRow(row)}
                          className="size-4 rounded border-slate-300"
                        />
                      </td>
                    )}

                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      <p className="font-medium text-slate-900">{row.productName ?? '—'}</p>
                      {row.specificationValue && <p className="text-xs text-slate-400">{row.specificationValue}</p>}
                    </th>

                    <td className="px-3 py-2 text-slate-700">{row.locationName ?? '—'}</td>

                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                      {row.requestPeriod ? formatPeriod(row.requestPeriod) : '—'}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2 text-right text-slate-900">
                      {formatQuantity(row.quantity)} {row.orderUnit ?? ''}
                    </td>

                    {/* The catalogue supplier where there is one, and the workbook cell where there is not: for the
                        rows that never matched a supplier, that cell is the only record of where they came from.
                        The sheet and row number are how a Koordinator finds the row in the workbook. */}
                    <td className="px-3 py-2">
                      <p className="text-slate-700">{row.supplierName ?? <span className="text-slate-400">—</span>}</p>
                      {row.workbookSupplierName && (
                        <p className="text-xs text-slate-500" title="Excel faylındakı təchizatçı xanası">
                          «{row.workbookSupplierName}»
                        </p>
                      )}
                      <p className="text-xs text-slate-400">
                        {row.sheetName}:{row.rowNumber}
                      </p>
                    </td>

                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pricingModeChipClass[mode]}`}
                      >
                        {pricingModeLabels[mode]}
                      </span>
                      {row.classification !== null && row.classifiedByDisplayName && (
                        <p className="mt-0.5 text-xs text-slate-400">{row.classifiedByDisplayName}</p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalCount > pageSize && (
        <div className="flex items-center justify-between text-xs text-slate-600">
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
        <ClassifyDialog
          importId={importId}
          mode={deciding}
          rows={rows.filter((row) => selected.has(row.importRowId))}
          onClose={() => setDeciding(null)}
          onDone={(result) => {
            setDeciding(null)
            setNotice(importPricingSavedNotice(result.changed, deciding))
            reload()
            onChanged({ preview: result.preview })
          }}
        />
      )}
    </div>
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
 * The last step before the rows' classification changes, with the rows named one by one — the same safeguard as
 * Qiymət təsnifatı: nobody classifies a row here without reading what it is.
 */
function ClassifyDialog({
  importId,
  mode,
  rows,
  onClose,
  onDone,
}: {
  importId: number
  mode: PricingMode
  rows: ImportPricingRow[]
  onClose: () => void
  onDone: (result: ImportPricingResult) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const result = await setImportPricing(importId, {
        importRowIds: rows.map((row) => row.importRowId),
        pricingMode: mode,
      })
      onDone(result)
    } catch (problem) {
      setError(message(problem, 'Qeyd edilmədi'))
      setSaving(false)
    }
  }

  return (
    <Modal title={importPricingActionLabels[mode]} subtitle={`${formatCount(rows.length)} sətir`} onClose={onClose}>
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

        <ul className="max-h-60 overflow-y-auto rounded-md border border-slate-200 text-sm" aria-label="Seçilmiş sətirlər">
          {rows.map((row) => (
            <li key={row.importRowId} className="border-b border-slate-100 px-3 py-2 last:border-b-0">
              <p className="font-medium text-slate-900">{row.productName ?? '—'}</p>
              <p className="text-xs text-slate-500">
                {row.locationName ?? '—'} · {row.requestPeriod ? formatPeriod(row.requestPeriod) : '—'} ·{' '}
                {formatQuantity(row.quantity)} {row.orderUnit ?? ''}
                {row.workbookSupplierName && ` · «${row.workbookSupplierName}»`}
              </p>
            </li>
          ))}
        </ul>

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

/** "Sabun · HEM · Mart 2026": what a screen reader hears for a row's checkbox, as on Qiymət təsnifatı. */
function describeRow(row: ImportPricingRow): string {
  return [row.productName ?? '—', row.locationName ?? '—', row.requestPeriod ? formatPeriod(row.requestPeriod) : '—'].join(' · ')
}

function message(problem: unknown, fallback: string): string {
  if (problem instanceof ApiError && problem.message) {
    return problem.message
  }

  return problem instanceof Error && problem.message ? problem.message : fallback
}
