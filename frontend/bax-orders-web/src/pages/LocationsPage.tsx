import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { fetchLocationOrders, type LocationOrderList, type LocationOrderSort } from '../api/orders'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { SummaryMetric } from '../components/SummaryMetric'
import { workflowStatusClass, workflowStatusLabels, workflowStatusSign } from '../components/workflow/labels'
import {
  formatAmount,
  formatNumber,
  formatPeriod,
  knownAmountLabel,
} from '../components/imports/labels'

const pageSize = 25

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: LocationOrderList }

/**
 * The entry point of the permanent-order browser: which objects ordered, over which months, and how much of
 * that is money the system can actually account for.
 */
export function LocationsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<LocationOrderSort>('Name')
  const [descending, setDescending] = useState(false)
  const [page, setPage] = useState(1)
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetchLocationOrders({ search: search || undefined, sort, descending, page, pageSize }, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: problem instanceof Error ? problem.message : 'Naməlum xəta' })
        }
      })
    return () => controller.abort()
  }, [search, sort, descending, page])

  const data = state.status === 'success' ? state.data : null
  const totalPages = data ? Math.max(1, Math.ceil(data.locations.totalCount / pageSize)) : 1

  function reorder(next: LocationOrderSort) {
    setPage(1)
    if (next === sort) {
      setDescending((current) => !current)
      return
    }

    setSort(next)
    setDescending(next !== 'Name')
  }

  return (
    <>
      <PageHeader title="Obyektlər" description="Material sorğusu göndərən obyektlər və onların sifariş tarixçəsi" />

      {data && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Obyektlərin xülasəsi">
          <SummaryMetric label="Obyekt" value={formatNumber(data.locationCount)} />
          <SummaryMetric label="Sifarişi olan" value={formatNumber(data.locationsWithOrders)} />
          <SummaryMetric label="Sifariş" value={formatNumber(data.orderRequestCount)} />
          <SummaryMetric
            label="Əhatə olunan dövr"
            value={
              data.earliestPeriod && data.latestPeriod
                ? `${formatPeriod(data.earliestPeriod)} – ${formatPeriod(data.latestPeriod)}`
                : '—'
            }
          />
        </div>
      )}

      <form
        className="mb-3"
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
          placeholder="Obyekt adı və ya kodu…"
          className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
        />
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-4 py-3">
                <SortButton label="Obyekt" active={sort === 'Name'} descending={descending} onClick={() => reorder('Name')} />
              </th>
              <th className="px-4 py-3 text-right">
                <SortButton
                  label="Sifariş"
                  active={sort === 'OrderRequestCount'}
                  descending={descending}
                  onClick={() => reorder('OrderRequestCount')}
                />
              </th>
              <th className="px-4 py-3 text-right">Dövr</th>
              <th className="px-4 py-3 text-right">Sətir</th>
              <th className="px-4 py-3 text-right">{knownAmountLabel}</th>
              <th className="px-4 py-3 text-right">Qiymətsiz</th>
              <th className="px-4 py-3">
                <SortButton
                  label="Son dövr"
                  active={sort === 'LatestPeriod'}
                  descending={descending}
                  onClick={() => reorder('LatestPeriod')}
                />
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.status === 'loading' && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  Yüklənir…
                </td>
              </tr>
            )}
            {state.status === 'error' && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-red-600">
                  Obyektlər yüklənmədi: {state.message}
                </td>
              </tr>
            )}
            {data?.locations.items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  {search ? 'Axtarışa uyğun obyekt tapılmadı.' : 'Obyekt yoxdur.'}
                </td>
              </tr>
            )}

            {data?.locations.items.map((location) => (
              <tr key={location.locationId} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link to={`/locations/${location.locationId}`} className="font-medium text-slate-900 hover:underline">
                    {location.name}
                  </Link>
                  <p className="text-xs text-slate-500">{location.code}</p>
                </td>
                <td className="px-4 py-2.5 text-right text-slate-700">{formatNumber(location.orderRequestCount)}</td>
                <td className="px-4 py-2.5 text-right text-slate-700">{formatNumber(location.distinctPeriodCount)}</td>
                <td className="px-4 py-2.5 text-right text-slate-700">{formatNumber(location.totalItemCount)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-900">{formatAmount(location.knownAmountTotal)}</td>
                <td className="px-4 py-2.5 text-right">
                  {location.missingPriceItemCount > 0 ? (
                    <span className="text-amber-800">{formatNumber(location.missingPriceItemCount)}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-700">
                  {location.latestPeriod ? (
                    <div className="flex items-center gap-2">
                      {formatPeriod(location.latestPeriod)}
                      {location.latestRequestStatus && (
                        <StatusBadge
                          label={workflowStatusLabels[location.latestRequestStatus] ?? location.latestRequestStatus}
                          sign={workflowStatusSign[location.latestRequestStatus]}
                          toneClass={workflowStatusClass[location.latestRequestStatus]}
                          size="sm"
                        />
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">sifariş yoxdur</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {location.orderRequestCount > 0 && (
                    <Link
                      to={`/locations/${location.locationId}`}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Sifarişlərə bax
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.locations.totalCount > pageSize && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>
            Səhifə {data.locations.page} / {totalPages} · {formatNumber(data.locations.totalCount)} obyekt
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

      {data && data.locations.items.some((location) => location.missingPriceItemCount > 0) && (
        <p className="mt-3 text-xs text-slate-500">
          Məbləğ yalnız qiyməti məlum olan sətirlər üzrədir; qiymətsiz sətirlər ayrıca göstərilir.
        </p>
      )}
    </>
  )
}

function SortButton({
  label,
  active,
  descending,
  onClick,
}: {
  label: string
  active: boolean
  descending: boolean
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={active ? 'font-semibold text-slate-900' : 'hover:text-slate-700'}>
      {label}
      {active && <span className="ml-1">{descending ? '↓' : '↑'}</span>}
    </button>
  )
}
