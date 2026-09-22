import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { AnalyticsComparisonBasis, PriceCoverageState } from '../api/analytics'
import {
  fetchDashboard,
  fetchDashboardPeriods,
  type DashboardPeriods,
  type DashboardSort,
  type HistoryCoverageState,
  type ManagementDashboard,
} from '../api/dashboard'
import { PageHeader } from '../components/PageHeader'
import { DashboardSummary } from '../components/dashboard/DashboardSummary'
import { LocationRows } from '../components/dashboard/LocationRows'
import {
  historyCoverageLabels,
  historyCoverageOrder,
  isHistoryCoverage,
  isPriceCoverage,
  isSort,
  priceCoverageLabels,
  priceCoverageOrder,
  sortLabels,
  sortOrder,
} from '../components/dashboard/labels'
import { basisLabels, basisOrder, formatCount, formatMonth, isBasis, toMonthKey } from '../components/analytics/format'

const pageSize = 25

type Loaded<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: T }

/**
 * The company's month, object by object. Every figure comes from the dashboard API as it is: nothing here
 * adds up money, works out a percentage or decides whether an object's history is complete, and no object is
 * ranked as doing well or badly.
 */
export function ManagementDashboardPage() {
  const [params, setParams] = useSearchParams()
  const [periods, setPeriods] = useState<Loaded<DashboardPeriods>>({ status: 'loading' })
  const [dashboard, setDashboard] = useState<Loaded<ManagementDashboard>>({ status: 'loading' })

  // The whole view lives in the URL, so a refresh, a shared link and Back all show the same thing.
  const basis: AnalyticsComparisonBasis = isBasis(params.get('basis')) ? (params.get('basis') as AnalyticsComparisonBasis) : 'PreviousMonth'
  const historyCoverage: HistoryCoverageState | undefined = isHistoryCoverage(params.get('historyCoverage'))
    ? (params.get('historyCoverage') as HistoryCoverageState)
    : undefined
  const priceCoverage: PriceCoverageState | undefined = isPriceCoverage(params.get('priceCoverage'))
    ? (params.get('priceCoverage') as PriceCoverageState)
    : undefined
  const sort: DashboardSort = isSort(params.get('sort')) ? (params.get('sort') as DashboardSort) : 'LocationName'
  const descending = params.get('descending') === 'true'
  const hasCurrentRequest = params.get('hasCurrentRequest') === 'false'
    ? false
    : params.get('hasCurrentRequest') === 'true'
      ? true
      : undefined
  const search = params.get('search') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)

  const [searchInput, setSearchInput] = useState(search)
  useEffect(() => setSearchInput(search), [search])

  useEffect(() => {
    const controller = new AbortController()
    setPeriods({ status: 'loading' })
    fetchDashboardPeriods(controller.signal)
      .then((data) => setPeriods({ status: 'success', data }))
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setPeriods({ status: 'error', message: message(problem, 'Dövrlər yüklənmədi') })
        }
      })
    return () => controller.abort()
  }, [])

  const available = periods.status === 'success' ? periods.data.periods : []
  const requested = params.get('period')
  // Only a month the company really ordered in; the latest one otherwise.
  const period = available.some((item) => toMonthKey(item.period) === requested)
    ? requested!
    : (available[0] ? toMonthKey(available[0].period) : null)

  const query = useMemo(
    () => ({ basis, search: search || undefined, historyCoverage, priceCoverage, hasCurrentRequest, sort, descending, page, pageSize }) as const,
    [basis, search, historyCoverage, priceCoverage, hasCurrentRequest, sort, descending, page],
  )

  // One request per selection; the key keeps a re-render from repeating a fetch already in flight.
  const lastKey = useRef('')
  useEffect(() => {
    if (period === null) {
      return
    }

    const key = `${period}|${JSON.stringify(query)}`
    lastKey.current = key
    const controller = new AbortController()
    setDashboard({ status: 'loading' })

    fetchDashboard(period, query, controller.signal)
      .then((data) => {
        if (lastKey.current === key) {
          setDashboard({ status: 'success', data })
        }
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setDashboard({ status: 'error', message: message(problem, 'Panel yüklənmədi') })
        }
      })

    return () => controller.abort()
  }, [period, query])

  function update(changes: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) {
      if (value === undefined || value === '') {
        next.delete(name)
      } else {
        next.set(name, value)
      }
    }

    if (resetPage) {
      next.delete('page')
    }

    setParams(next)
  }

  const data = dashboard.status === 'success' ? dashboard.data : null
  const totalPages = data ? Math.max(1, Math.ceil(data.rows.totalCount / pageSize)) : 1
  const filtered = Boolean(search || historyCoverage || priceCoverage || hasCurrentRequest !== undefined)

  return (
    <>
      <PageHeader title="İdarəetmə paneli" description="Sifarişlərin obyektlər üzrə ümumi görünüşü" />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-500">
          Dövr
          <select
            value={period ?? ''}
            onChange={(event) => update({ period: event.target.value })}
            disabled={available.length === 0}
            className="mt-1 block rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-900 disabled:opacity-50"
          >
            {periods.status === 'loading' && <option value="">Yüklənir…</option>}
            {available.map((item) => (
              <option key={item.period} value={toMonthKey(item.period)}>
                {formatMonth(item.period)} ({formatCount(item.locationCount)} obyekt)
              </option>
            ))}
          </select>
        </label>

        <div className="text-xs text-slate-500">
          <span id="basis-label">Müqayisə</span>
          <div className="mt-1 flex flex-wrap gap-1" role="group" aria-labelledby="basis-label">
            {basisOrder.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={basis === option}
                onClick={() => update({ basis: option })}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  basis === option ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {basisLabels[option]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {periods.status === 'error' && <Failure message={periods.message} />}
      {dashboard.status === 'error' && <Failure message={dashboard.message} />}

      {periods.status === 'success' && available.length === 0 && (
        <Empty>Hələ heç bir dövr üzrə daimi sifariş məlumatı yoxdur.</Empty>
      )}

      {data && <DashboardSummary summary={data.summary} />}

      {data && (
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tarixçəyə görə süz">
            <Chip label="Hamısı" active={!historyCoverage && hasCurrentRequest === undefined} onClick={() => update({ historyCoverage: undefined, hasCurrentRequest: undefined })} />
            {historyCoverageOrder.map((option) => (
              <Chip
                key={option}
                label={historyCoverageLabels[option]}
                count={
                  option === 'Complete' ? data.summary.locationsWithCompleteHistory
                    : option === 'Partial' ? data.summary.locationsWithPartialHistory
                      : data.summary.locationsWithNoBaselineHistory
                }
                active={historyCoverage === option}
                onClick={() => update({ historyCoverage: historyCoverage === option ? undefined : option, hasCurrentRequest: undefined })}
              />
            ))}
            <Chip
              label="Sifariş olmayan obyektlər"
              count={data.summary.locationsWithoutCurrentRequest}
              active={hasCurrentRequest === false}
              onClick={() => update({ hasCurrentRequest: hasCurrentRequest === false ? undefined : 'false', historyCoverage: undefined })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={(event) => { event.preventDefault(); update({ search: searchInput.trim() }) }}>
              <label className="sr-only" htmlFor="dashboard-search">Obyekt adı və ya kodu üzrə axtar</label>
              <input
                id="dashboard-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Obyekt adı və ya kodu üzrə axtar"
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
              />
            </form>

            <label className="text-sm">
              <span className="sr-only">Qiymət məlumatına görə süz</span>
              <select
                value={priceCoverage ?? ''}
                onChange={(event) => update({ priceCoverage: event.target.value || undefined })}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="">Qiymət məlumatı: hamısı</option>
                {priceCoverageOrder.map((option) => (
                  <option key={option} value={option}>{priceCoverageLabels[option]}</option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="sr-only">Sıralama</span>
              <select
                value={sort}
                onChange={(event) => update({ sort: event.target.value })}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                {sortOrder.map((option) => (
                  <option key={option} value={option}>{sortLabels[option]}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              aria-pressed={descending}
              onClick={() => update({ descending: descending ? undefined : 'true' })}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              {descending ? 'Azalan ↓' : 'Artan ↑'}
            </button>

            {filtered && (
              <button
                type="button"
                onClick={() => update({ search: undefined, historyCoverage: undefined, priceCoverage: undefined, hasCurrentRequest: undefined })}
                className="text-sm text-slate-500 underline hover:text-slate-800"
              >
                Filtri təmizlə
              </button>
            )}

            <span className="ml-auto text-xs text-slate-500">
              {formatCount(data.filteredLocationCount)} obyekt göstərilir
              {data.filteredLocationCount !== data.summary.locationCount && <> ({formatCount(data.summary.locationCount)} obyektdən)</>}
            </span>
          </div>
        </div>
      )}

      {dashboard.status === 'loading' && period !== null && (
        <div className="space-y-2" aria-busy="true" aria-live="polite">
          <span className="sr-only">Panel yüklənir</span>
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      )}

      {data && data.rows.items.length === 0 && (
        <Empty>{filtered ? 'Bu filtrə uyğun obyekt tapılmadı.' : 'Bu dövr üzrə sifariş məlumatı yoxdur.'}</Empty>
      )}

      {data && data.rows.items.length > 0 && <LocationRows rows={data.rows.items} summary={data.summary} />}

      {data && data.rows.totalCount > pageSize && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>Səhifə {data.rows.page} / {totalPages} · {formatCount(data.rows.totalCount)} obyekt</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)} className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">
              Əvvəlki
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) }, false)} className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">
              Növbəti
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Chip({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
        active ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
      {count !== undefined && <span className={`ml-1.5 ${active ? 'text-slate-300' : 'text-slate-400'}`}>{formatCount(count)}</span>}
    </button>
  )
}

function Empty({ children }: { children: string }) {
  return <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">{children}</p>
}

function Failure({ message }: { message: string }) {
  return (
    <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
      {message}
    </p>
  )
}

function message(problem: unknown, fallback: string): string {
  return problem instanceof Error && problem.message ? problem.message : fallback
}
