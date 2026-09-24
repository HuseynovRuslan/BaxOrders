import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { PriceCoverageState } from '../api/analytics'
import {
  fetchDashboard,
  fetchDashboardPeriods,
  type DashboardPeriods,
  type DashboardSort,
  type HistoryCoverageState,
  type ManagementDashboard,
} from '../api/dashboard'
import { EmptyState, ErrorState, LoadingRows } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { AttentionSection } from '../components/dashboard/AttentionSection'
import { DashboardSummary } from '../components/dashboard/DashboardSummary'
import { LocationRows } from '../components/dashboard/LocationRows'
import {
  isHistoryCoverage,
  isPriceCoverage,
  isSort,
} from '../components/dashboard/labels'
import { formatCount, formatMonth, toMonthKey } from '../components/analytics/format'
import { BasisPicker } from '../components/analytics/BasisPicker'
import { basisParams, basisRequest, parseBasis, type BasisSelection } from '../analytics/basisParams'

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
  // The whole reading lives in the query string, so Back, Forward, a reload and a pasted link all restore
  // the same comparison — and a card can hand it on to the order it opens. Anything unrecognised falls back
  // to last month rather than breaking the screen.
  const selection = parseBasis(params)
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

  // Oldest first, and never the selected month itself.
  const priorMonths = useMemo(
    () =>
      available
        .map((item) => toMonthKey(item.period))
        .filter((month) => period !== null && month < period)
        .sort(),
    [available, period],
  )

  // The two months travel only with the basis that uses them; the API refuses them with any other. An
  // unfinished range asks for last month rather than asking for nothing, so the page never goes blank.
  const request = basisRequest(selection)
  const basisKey = `${request.basis}|${request.customStart ?? ''}|${request.customEnd ?? ''}`
  const query = useMemo(
    () => ({
      ...request,
      search: search || undefined,
      historyCoverage,
      priceCoverage,
      hasCurrentRequest,
      sort,
      descending,
      page,
      pageSize,
    }) as const,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [basisKey, search, historyCoverage, priceCoverage, hasCurrentRequest, sort, descending, page],
  )

  // One request per selection; the key keeps a re-render from repeating a fetch already in flight.
  // The three separate filters the read model offers, behind one question a manager would actually ask.
  const dataIssue = priceCoverage ? 'missing-price'
    : historyCoverage === 'Unavailable' ? 'no-history'
      : hasCurrentRequest === false ? 'no-request'
        : ''

  function dataIssueParams(choice: string): Record<string, string | undefined> {
    const cleared = { priceCoverage: undefined, historyCoverage: undefined, hasCurrentRequest: undefined }
    switch (choice) {
      case 'missing-price':
        return { ...cleared, priceCoverage: 'Partial' }
      case 'no-history':
        return { ...cleared, historyCoverage: 'Unavailable' }
      case 'no-request':
        return { ...cleared, hasCurrentRequest: 'false' }
      default:
        return cleared
    }
  }

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

        {period !== null && (
          <BasisPicker
            selection={selection}
            onSelect={(next: BasisSelection) => update(basisParams(next))}
            months={priorMonths}
            currentPeriod={period}
          />
        )}
      </div>

      {periods.status === 'error' && <ErrorState message={periods.message} />}
      {dashboard.status === 'error' && <ErrorState message={dashboard.message} />}

      {periods.status === 'success' && available.length === 0 && (
        <EmptyState>Hələ heç bir dövr üzrə daimi sifariş məlumatı yoxdur.</EmptyState>
      )}

      {data && <DashboardSummary summary={data.summary} />}

      {/* Meaning first: which objects to read, and why. The full table follows and hides nothing. */}
      {data && <AttentionSection attention={data.attention} summary={data.summary} selection={selection} />}

      {data && <h2 className="mb-2 text-sm font-semibold text-slate-900">Bütün obyektlər</h2>}

      {data && (
        <div className="mb-3 space-y-2">
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

            {/*
              One control for data problems, in the reader's words. The three states underneath are separate
              concepts in the read model, and a manager has no reason to learn that; what they want is the
              rows where something is wrong with the records.
            */}
            <label className="text-sm">
              <span className="sr-only">Məlumat vəziyyətinə görə süz</span>
              <select
                value={dataIssue}
                onChange={(event) => update(dataIssueParams(event.target.value))}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="">Məlumat vəziyyəti: hamısı</option>
                <option value="missing-price">Qiymət məlumatı çatışmır</option>
                <option value="no-history">Əvvəlki ay məlumatı yoxdur</option>
                <option value="no-request">Bu ay sifariş yoxdur</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="sr-only">Sıralama</span>
              <select
                value={sort}
                onChange={(event) => update({ sort: event.target.value, descending: event.target.value === 'LocationName' ? undefined : 'true' })}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="LocationName">Obyekt adı üzrə</option>
                <option value="KnownAmountDelta">Ən çox dəyişən</option>
                <option value="CurrentKnownAmount">Bu ayın məbləği üzrə</option>
              </select>
            </label>

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

      {dashboard.status === 'loading' && period !== null && <LoadingRows label="Panel yüklənir" />}

      {data && data.rows.items.length === 0 && (
        <EmptyState>{filtered ? 'Bu filtrə uyğun obyekt tapılmadı.' : 'Bu dövr üzrə sifariş məlumatı yoxdur.'}</EmptyState>
      )}

      {data && data.rows.items.length > 0 && (
        <LocationRows rows={data.rows.items} summary={data.summary} selection={selection} />
      )}

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


function message(problem: unknown, fallback: string): string {
  return problem instanceof Error && problem.message ? problem.message : fallback
}
