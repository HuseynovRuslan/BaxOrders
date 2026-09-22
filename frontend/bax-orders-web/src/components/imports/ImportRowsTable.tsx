import { useEffect, useState } from 'react'
import { fetchImportRows, type ImportRow, type IssueType, type PagedResult, type RowStatus } from '../../api/imports'
import { IssueBadge } from './IssueBadge'
import { formatNumber, formatPeriod, issueTypeLabels, rowStatusLabels } from './labels'

const pageSize = 50

const statusFilters: { label: string; value: RowStatus | undefined }[] = [
  { label: 'Hamısı', value: undefined },
  { label: 'Düzgün', value: 'Valid' },
  { label: 'Xəbərdarlıq', value: 'NeedsReview' },
  { label: 'Xəta', value: 'Invalid' },
]

const rowStatusStyles: Record<RowStatus, string> = {
  Pending: 'text-slate-500',
  Valid: 'text-emerald-700',
  NeedsReview: 'text-amber-700',
  Invalid: 'text-red-700',
}

type RowsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: PagedResult<ImportRow> }

interface ImportRowsTableProps {
  importId: number
  issueTypes: IssueType[]
}

export function ImportRowsTable({ importId, issueTypes }: ImportRowsTableProps) {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<RowStatus | undefined>(undefined)
  const [issueType, setIssueType] = useState<IssueType | undefined>(undefined)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<RowsState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    setRows({ status: 'loading' })
    fetchImportRows(importId, { page, pageSize, status, issueType, search: search || undefined }, controller.signal)
      .then((data) => setRows({ status: 'success', data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setRows({ status: 'error', message: error instanceof Error ? error.message : 'Naməlum xəta' })
        }
      })
    return () => controller.abort()
  }, [importId, page, status, issueType, search])

  const totalPages = rows.status === 'success' ? Math.max(1, Math.ceil(rows.data.totalCount / pageSize)) : 1

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="mr-auto text-sm font-medium text-slate-900">Sətirlərin önizləməsi</h2>

        <div className="flex rounded-md border border-slate-200 p-0.5">
          {statusFilters.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => {
                setStatus(filter.value)
                setPage(1)
              }}
              className={`rounded px-3 py-1 text-xs font-medium ${
                status === filter.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <select
          value={issueType ?? ''}
          onChange={(event) => {
            setIssueType((event.target.value || undefined) as IssueType | undefined)
            setPage(1)
          }}
          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
        >
          <option value="">Bütün problemlər</option>
          {issueTypes.map((type) => (
            <option key={type} value={type}>
              {issueTypeLabels[type]}
            </option>
          ))}
        </select>

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
            placeholder="Məhsul adı ilə axtar…"
            className="w-48 rounded-md border border-slate-200 px-2 py-1 text-xs"
          />
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Sətir</th>
              <th className="px-3 py-2">Məhsul</th>
              <th className="px-3 py-2 text-right">Miqdar</th>
              <th className="px-3 py-2">Ö/v</th>
              <th className="px-3 py-2 text-right">Qiymət</th>
              <th className="px-3 py-2">Təchizatçı</th>
              <th className="px-3 py-2">Obyekt</th>
              <th className="px-3 py-2">Dövr</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Problemlər</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {rows.status === 'loading' && <MessageRow text="Yüklənir…" />}
            {rows.status === 'error' && <MessageRow text={`Sətirlər yüklənmədi: ${rows.message}`} tone="text-red-600" />}
            {rows.status === 'success' && rows.data.items.length === 0 && <MessageRow text="Seçilmiş filtrə uyğun sətir yoxdur." />}
            {rows.status === 'success' &&
              rows.data.items.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 tabular-nums text-slate-500">{row.rowNumber}</td>
                  <td className="px-3 py-2 text-slate-900">
                    {row.productName ?? <Missing />}
                    {(row.specificationValue || row.specificationUnit) && (
                      <span className="block text-xs text-slate-500">
                        {row.specificationValue} {row.specificationUnit}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.parsedQuantity !== null ? formatNumber(row.parsedQuantity) : <Raw value={row.quantity} />}
                  </td>
                  <td className="px-3 py-2">{row.orderUnit ?? <Missing />}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.parsedUnitPrice !== null ? formatNumber(row.parsedUnitPrice) : <Raw value={row.unitPrice} />}
                  </td>
                  <td className="px-3 py-2">{row.supplierName ?? <Missing />}</td>
                  <td className="px-3 py-2">{row.locationName ?? <Missing />}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.parsedRequestPeriod ? formatPeriod(row.parsedRequestPeriod) : <Raw value={row.requestDate} />}
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap text-xs font-medium ${rowStatusStyles[row.validationStatus]}`}>
                    {rowStatusLabels[row.validationStatus]}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {row.issues.map((issue, index) => (
                        <IssueBadge
                          key={index}
                          issueType={issue.issueType}
                          severity={issue.severity}
                          title={issue.fieldName ? `${issue.fieldName}: ${issue.message}` : issue.message}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
        <span>
          {rows.status === 'success'
            ? `Səhifə ${rows.data.page} / ${totalPages} · ${rows.data.totalCount} sətir`
            : ' '}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || rows.status === 'loading'}
            onClick={() => setPage((current) => current - 1)}
            className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
          >
            Əvvəlki
          </button>
          <button
            type="button"
            disabled={page >= totalPages || rows.status === 'loading'}
            onClick={() => setPage((current) => current + 1)}
            className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
          >
            Növbəti
          </button>
        </div>
      </div>
    </section>
  )
}

function MessageRow({ text, tone = 'text-slate-500' }: { text: string; tone?: string }) {
  return (
    <tr>
      <td colSpan={10} className={`px-4 py-6 text-center ${tone}`}>
        {text}
      </td>
    </tr>
  )
}

function Missing() {
  return <span className="text-slate-400">—</span>
}

/** Source text that could not be parsed, shown as written in Excel. */
function Raw({ value }: { value: string | null }) {
  return value ? <span className="text-red-700">{value}</span> : <Missing />
}
