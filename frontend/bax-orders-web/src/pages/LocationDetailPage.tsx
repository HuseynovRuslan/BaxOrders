import { TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { fetchLocationHistory, type LocationOrderHistory, type LocationOrderHistoryEntry } from '../api/orders'
import { LocationTrend } from '../components/locations/LocationTrend'
import { PageHeader } from '../components/PageHeader'
import { missingPriceCount, missingPriceShortLabel } from '../pricing/labels'
import { supersededOrderNote } from '../terminology/terms'
import { StatusBadge } from '../components/StatusBadge'
import { workflowStatusClass, workflowStatusLabels, workflowStatusSign } from '../components/workflow/labels'
import {
  formatAmount,
  formatNumber,
  formatPeriod,
  knownAmountLabel,
} from '../components/imports/labels'

const pageSize = 24
const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: LocationOrderHistory }

/** One object and every monthly request it has, newest first. */
export function LocationDetailPage() {
  const { locationId } = useParams()
  const id = Number(locationId)
  const [year, setYear] = useState<number | undefined>(undefined)
  const [month, setMonth] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetchLocationHistory(id, { year, month, page, pageSize }, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: problem instanceof Error ? problem.message : 'Naməlum xəta' })
        }
      })
    return () => controller.abort()
  }, [id, year, month, page])

  if (state.status === 'error') {
    return (
      <>
        <PageHeader title="Obyekt" />
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{state.message}</p>
        <Link to="/locations" className="mt-3 inline-block text-sm text-slate-600 underline">
          Obyektlərə qayıt
        </Link>
      </>
    )
  }

  const data = state.status === 'success' ? state.data : null
  const totalPages = data ? Math.max(1, Math.ceil(data.requests.totalCount / pageSize)) : 1
  const superseded = supersededRequests(data?.requests.items ?? [])

  return (
    <>
      <PageHeader
        title={data?.name ?? 'Obyekt'}
        description={data && !data.isActive ? 'Deaktiv' : undefined}
        actions={
          <>
            {data && data.orderRequestCount > 0 && (
              <Link
                to={`/locations/${id}/analytics`}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                <TrendingUp className="size-4" aria-hidden="true" />
                Müqayisə et
              </Link>
            )}
            <Link to="/locations" className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              Obyektlərə qayıt
            </Link>
          </>
        }
      />

      {/*
        What this object ordered last, then the year behind it. The lifetime counts follow as one quiet line:
        they describe the record rather than the object, and nobody decides anything with them.
      */}
      {data && !year && !month && <LocationTrend entries={data.requests.items} />}

      {data && (
        <dl className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <Fact label="Dövrlər" value={formatNumber(data.distinctPeriodCount)} />
          <Fact label="Sifarişlər" value={formatNumber(data.orderRequestCount)} />
          <Fact label={knownAmountLabel} value={formatAmount(data.knownAmountTotal)} />
          {data.missingPriceItemCount > 0 && (
            <Fact label={missingPriceShortLabel} value={formatNumber(data.missingPriceItemCount)} warn />
          )}
        </dl>
      )}

      {data && data.years.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <select
            value={year ?? ''}
            onChange={(event) => {
              setYear(event.target.value ? Number(event.target.value) : undefined)
              setPage(1)
            }}
            className="rounded-md border border-slate-200 px-2 py-1.5"
          >
            <option value="">Bütün illər</option>
            {data.years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <select
            value={month ?? ''}
            onChange={(event) => {
              setMonth(event.target.value ? Number(event.target.value) : undefined)
              setPage(1)
            }}
            className="rounded-md border border-slate-200 px-2 py-1.5"
          >
            <option value="">Bütün aylar</option>
            {months.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>

          {(year || month) && (
            <button
              type="button"
              onClick={() => {
                setYear(undefined)
                setMonth(undefined)
                setPage(1)
              }}
              className="text-slate-500 underline"
            >
              Filtri təmizlə
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-4 py-3">Dövr</th>
              {/* The unpriced products are said beside the money they affect, not counted in a column of their own. */}
              <th className="px-4 py-3 text-right">Məbləğ</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.status === 'loading' && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Yüklənir…
                </td>
              </tr>
            )}
            {data?.requests.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  {year || month ? 'Seçilmiş dövrdə sifariş yoxdur.' : 'Bu obyektin hələ sifarişi yoxdur.'}
                </td>
              </tr>
            )}

            {data?.requests.items.map((request) => (
              <tr key={request.orderRequestId} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link to={`/orders/${request.orderRequestId}`} className="font-medium text-slate-900 hover:underline">
                    {formatPeriod(request.requestPeriod)}
                  </Link>
                  {superseded.has(request.orderRequestId) && (
                    <p className="text-xs text-slate-500">{supersededOrderNote}</p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <p className="whitespace-nowrap text-slate-900">{formatAmount(request.knownAmountTotal)}</p>
                  {request.missingPriceItemCount > 0 && (
                    <p className="whitespace-nowrap text-xs text-amber-800">
                      {missingPriceCount(request.missingPriceItemCount)}
                    </p>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge
                    label={workflowStatusLabels[request.status] ?? request.status}
                    sign={workflowStatusSign[request.status]}
                    toneClass={workflowStatusClass[request.status]}
                    size="sm"
                  />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    <Link
                      to={`/orders/${request.orderRequestId}`}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Sifarişə bax
                    </Link>
                    <Link
                      to={`/locations/${id}/analytics?period=${request.requestPeriod.slice(0, 7)}`}
                      aria-label={`${formatPeriod(request.requestPeriod)} dövrünü müqayisə et`}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Müqayisə
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.requests.totalCount > pageSize && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>
            Səhifə {data.requests.page} / {totalPages} · {formatNumber(data.requests.totalCount)} sifariş
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
    </>
  )
}

/**
 * The requests on this page that a later request of the same month replaced.
 *
 * A month can hold more than one request — a correction, or a second import — and with no version number on the
 * screen the rows would read alike. The newest of each month is shown as it is; every older one says so. Rows of
 * one month split across two pages are an accepted edge: the history is newest first, so the newest comes first.
 */
function supersededRequests(entries: LocationOrderHistoryEntry[]): Set<number> {
  const newest = new Map<string, number>()
  for (const entry of entries) {
    const month = entry.requestPeriod.slice(0, 7)
    newest.set(month, Math.max(newest.get(month) ?? entry.version, entry.version))
  }

  return new Set(entries
    .filter((entry) => entry.version < (newest.get(entry.requestPeriod.slice(0, 7)) ?? entry.version))
    .map((entry) => entry.orderRequestId))
}

/** One of the record's own counts, said once and quietly — these describe the file, not the object. */
function Fact({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}</dt>
      <dd className={warn ? 'font-medium text-amber-800' : 'font-medium text-slate-700'}>{value}</dd>
    </div>
  )
}
