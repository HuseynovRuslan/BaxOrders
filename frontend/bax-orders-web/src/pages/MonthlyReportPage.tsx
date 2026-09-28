import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { fetchMonthlyReport, type MonthlyReport } from '../api/reports'
import type { AnalyticsScope } from '../api/dashboard'
import { isScope } from '../analytics/scope'
import { ScopeSelector } from '../components/analytics/ScopeSelector'
import { ApiError } from '../api/client'
import { EmptyState, ErrorState, LoadingRows } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { formatCount, formatMoney } from '../components/analytics/format'
import { MonthlyReportTable, MonthlyReportYearList } from '../components/reports/MonthlyReportTable'
import { ReportHeadline } from '../components/reports/ReportHeadline'
import { useScrollMemory } from '../navigation/useScrollMemory'
import { unclassifiedOutsideAnalyticsNote } from '../orderLines/lineType'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: MonthlyReport }

/**
 * The year at a glance: every object against every month, with the money as the only heavy thing on the page.
 *
 * Its state lives in the URL, like the dashboard's and the comparison screen's, so a month worth talking about
 * can be sent to somebody as a link.
 */
export function MonthlyReportPage() {
  const [params, setParams] = useSearchParams()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [searchInput, setSearchInput] = useState(params.get('search') ?? '')

  const year = Number(params.get('year')) || undefined
  const search = params.get('search') ?? ''
  // The same three questions the dashboard asks, in the same words, so a reader moving between the two screens
  // does not have to work out whether they mean the same thing.
  const scopeParam = params.get('scope')
  const scope: AnalyticsScope = isScope(scopeParam) ? scopeParam : 'Monthly'

  // The key discards a stale answer; it never skips the request. Guarding the fetch itself would deadlock
  // under StrictMode, whose second pass would see the key already set and never ask for anything.
  const lastKey = useRef('')

  useEffect(() => {
    const key = `${year ?? ''}|${search}|${scope}`
    lastKey.current = key
    const controller = new AbortController()
    setState({ status: 'loading' })

    fetchMonthlyReport({ year, search: search || undefined, scope }, controller.signal)
      .then((data) => {
        if (lastKey.current === key) {
          setState({ status: 'success', data })
        }
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: problem instanceof ApiError ? problem.message : 'Naməlum xəta',
          })
        }
      })

    return () => controller.abort()
  }, [year, search, scope])

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) {
      if (value === undefined || value === '') {
        next.delete(name)
      } else {
        next.set(name, value)
      }
    }

    setParams(next, { replace: true })
  }

  const data = state.status === 'success' ? state.data : null

  // Back from an order brings the reader to the row — or, on a phone, the card — whose month they opened, once the
  // matrix for the returned-to address is on the page (24.3). The rows carry the ids the memory looks for.
  const root = useScrollMemory<HTMLDivElement>(state.status === 'success')

  return (
    <div ref={root}>
      <PageHeader title="Aylıq hesabat" description="Obyektlərin bir il ərzindəki sifariş məbləğləri" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span>İl</span>
          <select
            value={String(data?.year ?? '')}
            onChange={(event) => update({ year: event.target.value })}
            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm"
          >
            {data?.availableYears.map((option) => (
              <option key={option} value={String(option)}>
                {option}
              </option>
            ))}
            {!data && <option value="">Yüklənir…</option>}
          </select>
        </label>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            update({ search: searchInput.trim() })
          }}
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Obyekt adı…"
            aria-label="Obyekt axtar"
            className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-64"
          />
        </form>

        <ScopeSelector
          value={scope}
          onChange={(next) => update({ scope: next === 'Monthly' ? undefined : next })}
        />

        {data && data.filteredLocationCount !== data.locationCount && (
          <p className="ml-auto text-xs text-slate-500">
            {formatCount(data.filteredLocationCount)} / {formatCount(data.locationCount)} obyekt
          </p>
        )}
      </div>

      {state.status === 'error' && <ErrorState message={state.message} />}

      {data && (
        <>
        <ReportHeadline report={data} scope={scope} />

        {data.unclassifiedItemCount > 0 && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            {unclassifiedOutsideAnalyticsNote(data.unclassifiedItemCount, formatMoney(data.unclassifiedKnownAmount))}
          </p>
        )}
        </>
      )}

      {state.status === 'loading' && <LoadingRows label="Hesabat yüklənir" />}

      {data && data.rows.length === 0 && (
        <EmptyState>Axtarışa uyğun obyekt tapılmadı.</EmptyState>
      )}

      {data && data.rows.length > 0 && (
        <>
          <MonthlyReportTable report={data} />
          <MonthlyReportYearList report={data} />
        </>
      )}
    </div>
  )
}
