import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { fetchMonthlyReport, type MonthlyReport } from '../api/reports'
import { ApiError } from '../api/client'
import { EmptyState, ErrorState, LoadingRows } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { amountIncompleteLabel, missingPriceShortLabel } from '../pricing/labels'
import { SummaryMetric } from '../components/SummaryMetric'
import { formatCount, formatMoney } from '../components/analytics/format'
import { MonthlyReportTable, MonthlyReportYearList } from '../components/reports/MonthlyReportTable'
import { useScrollMemory } from '../navigation/useScrollMemory'
import {
  combinedSpendLabel,
  monthlyAmountLabel,
  outsideMonthlyAmountLabel,
  unclassifiedOutsideAnalyticsNote,
} from '../orderLines/lineType'

/**
 * What the company actually spent: the monthly money, the one-off money and the lines nobody classified added
 * together. Unknown money stays unknown — a year with nothing priced at all has no total, not a zero.
 */
function combined(report: MonthlyReport): number | null {
  const parts = [report.knownAmount, report.outsideMonthlyKnownAmount, report.unclassifiedKnownAmount]
  return parts.every((part) => part === null) ? null : parts.reduce<number>((sum, part) => sum + (part ?? 0), 0)
}

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

  // The key discards a stale answer; it never skips the request. Guarding the fetch itself would deadlock
  // under StrictMode, whose second pass would see the key already set and never ask for anything.
  const lastKey = useRef('')

  useEffect(() => {
    const key = `${year ?? ''}|${search}`
    lastKey.current = key
    const controller = new AbortController()
    setState({ status: 'loading' })

    fetchMonthlyReport({ year, search: search || undefined }, controller.signal)
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
  }, [year, search])

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

        {data && data.filteredLocationCount !== data.locationCount && (
          <p className="ml-auto text-xs text-slate-500">
            {formatCount(data.filteredLocationCount)} / {formatCount(data.locationCount)} obyekt
          </p>
        )}
      </div>

      {state.status === 'error' && <ErrorState message={state.message} />}

      {data && (
        <>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="group" aria-label="İlin xülasəsi">
          {/* The month-on-month grid below reads monthly lines alone, so the headline says which money it is.
              The one-off spend sits beside it as its own fact, and the factual total is offered once so nobody
              has to add the two in their head. */}
          <SummaryMetric label={monthlyAmountLabel} value={formatMoney(data.knownAmount)} size="lg" />
          <SummaryMetric
            label={outsideMonthlyAmountLabel}
            value={formatMoney(data.outsideMonthlyKnownAmount)}
            note={data.outsideMonthlyItemCount > 0 ? `${formatCount(data.outsideMonthlyItemCount)} sətir` : undefined}
          />
          <SummaryMetric label={combinedSpendLabel} value={formatMoney(combined(data))} />
          <SummaryMetric label="Sifariş" value={formatCount(data.requestCount)} />
          <SummaryMetric label="Obyekt" value={formatCount(data.locationCount)} />
          <SummaryMetric
            label={missingPriceShortLabel}
            value={formatCount(data.missingPriceItemCount)}
            noteAttention={data.missingPriceItemCount > 0}
            note={data.missingPriceItemCount > 0 ? amountIncompleteLabel : undefined}
          />
        </div>

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
