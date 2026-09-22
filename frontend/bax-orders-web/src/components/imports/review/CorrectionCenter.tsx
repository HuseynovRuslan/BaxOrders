import { useEffect, useState } from 'react'
import type { IssueType } from '../../../api/imports'
import { fetchCandidates, type PagedCandidates, type RowCorrectionResult } from '../../../api/rows'
import { formatPeriod, issueTypeLabels, rowStatusLabels } from '../labels'
import { RowDetailDialog } from './RowDetailDialog'

const pageSize = 10

/** Problems that belong to one row, so no distinct-value decision can settle them. */
const rowIssueFilters: IssueType[] = [
  'InvalidQuantity',
  'InvalidDate',
  'MissingRequiredValue',
  'AmbiguousMatch',
  'InvalidPrice',
  'LineTotalMismatch',
  'Other',
]

interface CorrectionCenterProps {
  importId: number
  initialIssueType?: IssueType | null
  onChanged: (result: RowCorrectionResult) => void
}

export function CorrectionCenter({ importId, initialIssueType, onChanged }: CorrectionCenterProps) {
  const [issueType, setIssueType] = useState<IssueType | null>(initialIssueType ?? null)
  const [excluded, setExcluded] = useState<boolean | undefined>(undefined)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PagedCandidates | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openRow, setOpenRow] = useState<number | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => setIssueType(initialIssueType ?? null), [initialIssueType])

  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    fetchCandidates(
      importId,
      { issueType: issueType ?? undefined, excluded, search: search || undefined, page, pageSize },
      controller.signal,
    )
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
        }
      })
    return () => controller.abort()
  }, [importId, issueType, excluded, search, page, version])

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / pageSize)) : 1

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Bu sətirlərin problemi bir xanadadır: onu ya düzəltmək, ya da sətri importdan çıxarmaq lazımdır. Excel
        dəyəri heç vaxt dəyişmir — düzəliş yalnız «bu xana nə demək istəyirdi» sualına cavab verir.
      </p>

      <div className="flex flex-wrap items-center gap-2">
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
            placeholder="Mal, obyekt və ya şirkət üzrə axtar…"
            className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-64"
          />
        </form>

        <select
          value={issueType ?? ''}
          onChange={(event) => {
            setIssueType((event.target.value || null) as IssueType | null)
            setPage(1)
          }}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        >
          <option value="">Bütün sətir problemləri</option>
          {rowIssueFilters.map((type) => (
            <option key={type} value={type}>
              {issueTypeLabels[type]}
            </option>
          ))}
        </select>

        <select
          value={excluded === undefined ? '' : String(excluded)}
          onChange={(event) => {
            setExcluded(event.target.value === '' ? undefined : event.target.value === 'true')
            setPage(1)
          }}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        >
          <option value="">Hamısı</option>
          <option value="false">Importda qalanlar</option>
          <option value="true">Importdan çıxarılanlar</option>
        </select>
      </div>

      {error && <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {data === null && !error && <p className="py-6 text-center text-sm text-slate-500">Yüklənir…</p>}
      {data?.items.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Uyğun sətir tapılmadı.</p>}

      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Sətir</th>
                <th className="px-3 py-2 font-medium">Mal</th>
                <th className="px-3 py-2 font-medium">Obyekt</th>
                <th className="px-3 py-2 font-medium">Dövr</th>
                <th className="px-3 py-2 font-medium">Problemlər</th>
                <th className="px-3 py-2 font-medium">Düzəliş</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((candidate) => (
                <tr
                  key={candidate.rowId}
                  onClick={() => setOpenRow(candidate.rowId)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-3 py-2 text-slate-600">{candidate.rowNumber}</td>
                  <td className="px-3 py-2">{candidate.productName ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{candidate.locationName ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{candidate.period ? formatPeriod(candidate.period) : '—'}</td>
                  <td className="px-3 py-2">
                    <span className="flex flex-wrap gap-1">
                      {candidate.issues.slice(0, 3).map((issue, index) => (
                        <span
                          key={`${issue.issueType}-${index}`}
                          className={`rounded px-1.5 py-0.5 text-[11px] ${
                            issue.severity === 'Error'
                              ? 'bg-red-50 text-red-800'
                              : issue.severity === 'Warning'
                                ? 'bg-amber-50 text-amber-900'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {issueTypeLabels[issue.issueType]}
                        </span>
                      ))}
                      {candidate.issues.length > 3 && <span className="text-[11px] text-slate-500">+{candidate.issues.length - 3}</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{candidate.correctionCount > 0 ? candidate.correctionCount : '—'}</td>
                  <td className="px-3 py-2">
                    {candidate.isExcluded ? (
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-700">Importdan çıxarılıb</span>
                    ) : (
                      <span className="text-xs text-slate-600">{rowStatusLabels[candidate.status]}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalCount > pageSize && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            Səhifə {data.page} / {totalPages} · {data.totalCount} sətir
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

      {openRow !== null && (
        <RowDetailDialog
          importId={importId}
          rowId={openRow}
          onClose={() => setOpenRow(null)}
          onChanged={(result) => {
            setVersion((current) => current + 1)
            onChanged(result)
          }}
        />
      )}
    </div>
  )
}
