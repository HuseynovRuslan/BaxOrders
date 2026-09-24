import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import {
  fetchAnalyticsPeriods,
  fetchComparison,
  type AnalyticsKind,
  type ComparisonState,
  type AnalyticsPeriods,
  type LocationComparison,
  type VariantComparison,
} from '../api/analytics'
import { PageHeader } from '../components/PageHeader'
import { AnalyticsSummary } from '../components/analytics/AnalyticsSummary'
import { MaterialRows, ServiceRows } from '../components/analytics/ComparisonRows'
import { TrendModal } from '../components/analytics/TrendModal'
import { BasisPicker } from '../components/analytics/BasisPicker'
import { basisParams, basisRequest, type BasisSelection } from '../analytics/basisParams'
import { useBasis } from '../analytics/useBasis'
import {
  formatAnalyticsPeriod,
  isState,
  kindLabels,
  materialStates,
  stateLabels,
} from '../components/analytics/labels'
import { formatNumber } from '../components/imports/labels'

const pageSize = 50

type Loaded<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: T }

/**
 * One location's month against its own history. Everything the page shows comes from the analytics API as it
 * is: no percentage, average or total is worked out here, only written down.
 */
export function LocationAnalyticsPage() {
  const { locationId } = useParams()
  const id = Number(locationId)
  const [params, setParams] = useSearchParams()

  const [periods, setPeriods] = useState<Loaded<AnalyticsPeriods>>({ status: 'loading' })
  const [comparison, setComparison] = useState<Loaded<LocationComparison>>({ status: 'loading' })
  const [trendRow, setTrendRow] = useState<VariantComparison | null>(null)

  // The view lives in the URL, so a refresh, a shared link and the browser's Back button all agree.
  const stateParam = params.get('state')
  // The same query-string vocabulary the dashboard and the order screen use, so a link from either of them
  // keeps its comparison when it lands here.
  const selection = useBasis(params, setParams)
  const kind: AnalyticsKind = params.get('kind') === 'AmountOrientedService' ? 'AmountOrientedService' : 'QuantityComparable'
  const state: ComparisonState | undefined = isState(stateParam) ? stateParam : undefined
  const search = params.get('search') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)


  const [searchInput, setSearchInput] = useState(search)
  useEffect(() => setSearchInput(search), [search])

  useEffect(() => {
    const controller = new AbortController()
    setPeriods({ status: 'loading' })
    fetchAnalyticsPeriods(id, controller.signal)
      .then((data) => setPeriods({ status: 'success', data }))
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setPeriods({ status: 'error', message: message(problem, 'Obyektin dövrləri yüklənmədi') })
        }
      })
    return () => controller.abort()
  }, [id])

  const available = periods.status === 'success' ? periods.data.periods : []
  const requested = params.get('period')
  // Only a month the location really has; the latest one otherwise. Nothing is invented from today's date.
  const period = available.some((item) => item.period.slice(0, 7) === requested)
    ? requested!
    : (available[0]?.period.slice(0, 7) ?? null)

  // Oldest first, and never the selected month itself: a window that reached it would compare it with itself.
  const priorMonths = useMemo(
    () =>
      available
        .map((item) => item.period.slice(0, 7))
        .filter((month) => period !== null && month < period)
        .sort(),
    [available, period],
  )


  const request = basisRequest(selection)
  const basisKey = `${request.basis}|${request.customStart ?? ''}|${request.customEnd ?? ''}`
  const query = useMemo(
    () => ({
      ...request,
      kind,
      state,
      search: search || undefined,
      page,
      pageSize,
    }) as const,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [basisKey, kind, state, search, page],
  )

  // One request per selection. The key stops a re-render from repeating a fetch that is already in flight.
  const lastKey = useRef<string>('')
  useEffect(() => {
    if (period === null) {
      return
    }

    const key = `${id}|${period}|${JSON.stringify(query)}`
    lastKey.current = key
    const controller = new AbortController()
    setComparison({ status: 'loading' })

    fetchComparison(id, period, query, controller.signal)
      .then((data) => {
        if (lastKey.current === key) {
          setComparison({ status: 'success', data })
        }
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setComparison({ status: 'error', message: message(problem, 'Müqayisə yüklənmədi') })
        }
      })

    return () => controller.abort()
  }, [id, period, query])

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

  if (periods.status === 'error') {
    return <Failure title="Analitika" message={periods.message} />
  }

  const data = comparison.status === 'success' ? comparison.data : null
  const summary = data?.summary
  const hasServices = (summary?.amountOrientedServiceCount ?? 0) > 0
  const totalPages = data ? Math.max(1, Math.ceil(data.rows.totalCount / pageSize)) : 1
  const locationName = periods.status === 'success' ? periods.data.locationName : undefined

  return (
    <>
      <nav aria-label="Naviqasiya" className="mb-2 text-xs text-slate-500">
        <Link to="/locations" className="hover:text-slate-900 hover:underline">Obyektlər</Link>
        <span className="px-1" aria-hidden="true">›</span>
        <Link to={`/locations/${id}`} className="hover:text-slate-900 hover:underline">
          {locationName ?? 'Obyekt'}
        </Link>
        <span className="px-1" aria-hidden="true">›</span>
        <span className="text-slate-700">Müqayisə</span>
      </nav>

      <PageHeader
        title={locationName ?? 'Obyekt'}
        description="Sifariş müqayisəsi"
        actions={
          <Link
            to={`/locations/${id}`}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Sifarişlərə bax
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-500">
          Dövr
          <select
            value={period ?? ''}
            onChange={(event) => update({ period: event.target.value })}
            disabled={available.length === 0}
            className="mt-1 block rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-900 disabled:opacity-50"
          >
            {available.map((item) => (
              <option key={item.orderRequestId} value={item.period.slice(0, 7)}>
                {formatAnalyticsPeriod(item.period)} ({formatNumber(item.itemCount)} sətir)
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

      {periods.status === 'success' && available.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Bu obyektin hələ sifarişi yoxdur, ona görə müqayisə edilə bilməz.
        </p>
      )}

      {comparison.status === 'error' && <Failure title="" message={comparison.message} inline />}

      {summary && <AnalyticsSummary summary={summary} />}

      {summary && (
        <>
          {hasServices && (
            <div className="mb-3 flex gap-1 border-b border-slate-200" role="tablist" aria-label="Sətir növü">
              <Tab
                label={kindLabels.QuantityComparable}
                count={summary.quantityComparableVariantCount}
                active={kind === 'QuantityComparable'}
                onClick={() => update({ kind: undefined })}
              />
              <Tab
                label={kindLabels.AmountOrientedService}
                count={summary.amountOrientedServiceCount}
                active={kind === 'AmountOrientedService'}
                onClick={() => update({ kind: 'AmountOrientedService' })}
              />
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                update({ search: searchInput.trim() })
              }}
            >
              <label className="sr-only" htmlFor="analytics-search">Məhsul, kod və ya model üzrə axtar</label>
              <input
                id="analytics-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Məhsul, kod və ya model üzrə axtar"
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-80"
              />
            </form>

            {kind === 'QuantityComparable' && (
              <label className="text-sm">
                <span className="sr-only">Statusa görə süz</span>
                <select
                  value={state ?? ''}
                  onChange={(event) => update({ state: event.target.value || undefined })}
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">Hamısı</option>
                  {materialStates.map((option) => (
                    <option key={option} value={option}>
                      {stateLabels[option]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {(search || state) && (
              <button
                type="button"
                onClick={() => update({ search: undefined, state: undefined })}
                className="text-sm text-slate-500 underline hover:text-slate-800"
              >
                Filtri təmizlə
              </button>
            )}

            <span className="ml-auto text-xs text-slate-500">
              {formatNumber(data?.rows.totalCount ?? 0)} mövqe
            </span>
          </div>
        </>
      )}

      {comparison.status === 'loading' && (
        <div className="space-y-2" aria-busy="true" aria-live="polite">
          <span className="sr-only">Müqayisə yüklənir</span>
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      )}

      {data && summary && data.rows.items.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          {search || state ? 'Bu filtrə uyğun məhsul tapılmadı.' : 'Bu bölmədə göstəriləcək mövqe yoxdur.'}
        </p>
      )}

      {data && summary && data.rows.items.length > 0 && (
        kind === 'AmountOrientedService' ? (
          <ServiceRows rows={data.rows.items} summary={summary} onTrend={setTrendRow} />
        ) : (
          <MaterialRows rows={data.rows.items} summary={summary} onTrend={setTrendRow} />
        )
      )}

      {data && data.rows.totalCount > pageSize && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>
            Səhifə {data.rows.page} / {totalPages} · {formatNumber(data.rows.totalCount)} mövqe
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => update({ page: String(page - 1) }, false)}
              className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Əvvəlki
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => update({ page: String(page + 1) }, false)}
              className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Növbəti
            </button>
          </div>
        </div>
      )}

      {trendRow && period && (
        <TrendModal
          locationId={id}
          variant={trendRow.variant}
          isService={trendRow.analyticsKind === 'AmountOrientedService'}
          to={period}
          onClose={() => setTrendRow(null)}
        />
      )}
    </>
  )
}

function Tab({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {label}
      <span className="ml-1.5 text-xs text-slate-400">{formatNumber(count)}</span>
    </button>
  )
}

function Failure({ title, message, inline = false }: { title: string; message: string; inline?: boolean }) {
  return (
    <>
      {!inline && <PageHeader title={title} />}
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
        {message}
      </p>
      {!inline && (
        <Link to="/locations" className="mt-3 inline-block text-sm text-slate-600 underline">
          Obyektlərə qayıt
        </Link>
      )}
    </>
  )
}

function message(problem: unknown, fallback: string): string {
  return problem instanceof Error && problem.message ? problem.message : fallback
}
