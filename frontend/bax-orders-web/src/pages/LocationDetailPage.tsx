import { TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { fetchLocationHistory, type LocationOrderHistory } from '../api/orders'
import { PageHeader } from '../components/PageHeader'
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

  return (
    <>
      <PageHeader
        title={data?.name ?? 'Obyekt'}
        description={data ? `${data.code}${data.isActive ? '' : ' · deaktiv'}` : undefined}
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

      {data && (
        <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-5">
          <Fact label="Dövrlər" value={formatNumber(data.distinctPeriodCount)} />
          <Fact label="Sifarişlər" value={formatNumber(data.orderRequestCount)} />
          <Fact label="Sətirlər" value={formatNumber(data.totalItemCount)} />
          <Fact label={`${knownAmountLabel} məbləğ`} value={formatAmount(data.knownAmountTotal)} />
          <Fact
            label="Qiymətsiz sətirlər"
            value={formatNumber(data.missingPriceItemCount)}
            warn={data.missingPriceItemCount > 0}
          />
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
              <th className="px-4 py-3">Versiya</th>
              <th className="px-4 py-3 text-right">Sətir sayı</th>
              <th className="px-4 py-3 text-right">{knownAmountLabel}</th>
              <th className="px-4 py-3 text-right">Qiymətsiz</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.status === 'loading' && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Yüklənir…
                </td>
              </tr>
            )}
            {data?.requests.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
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
                </td>
                <td className="px-4 py-2.5 text-slate-700">Versiya {request.version}</td>
                <td className="px-4 py-2.5 text-right text-slate-700">{formatNumber(request.itemCount)}</td>
                <td className="px-4 py-2.5 text-right text-slate-900">{formatAmount(request.knownAmountTotal)}</td>
                <td className="px-4 py-2.5 text-right">
                  {request.missingPriceItemCount > 0 ? (
                    <span className="text-amber-800">{formatNumber(request.missingPriceItemCount)}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
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

function Fact({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`text-sm font-medium ${warn ? 'text-amber-800' : 'text-slate-900'}`}>{value}</dd>
    </div>
  )
}
