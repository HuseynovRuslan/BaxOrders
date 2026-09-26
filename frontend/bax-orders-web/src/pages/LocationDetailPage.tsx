import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { basisParams, basisRequest, orderLink, type BasisSelection } from '../analytics/basisParams'
import { useBasis } from '../analytics/useBasis'
import { fetchDecisionContext, type OrderDecisionContext } from '../api/decisions'
import { fetchLocationHistory, type LocationOrderHistory, type LocationOrderHistoryEntry } from '../api/orders'
import { formatMonthRange } from '../components/analytics/format'
import { comparablePriorMonths } from '../components/decisions/labels'
import {
  interactiveRowClass,
  interactiveTextClass,
  openSurfaceLink,
  rowLinkClass,
  surfaceLinkAttribute,
} from '../components/interaction'
import { LocationTrend } from '../components/locations/LocationTrend'
import { PageHeader } from '../components/PageHeader'
import {
  internalSupplyCount,
  internalSupplyShortLabel,
  internalToneClass,
  missingPriceCount,
  missingPriceShortLabel,
  warningToneClass,
} from '../pricing/labels'
import { supersededOrderNote, wholeHistoryLead } from '../terminology/terms'
import { OrderStatusBadge } from '../components/workflow/OrderStatusBadge'
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
  const [params, setParams] = useSearchParams()

  // The basis is the one thing that travels (Task 1): a manager who chose "Son 3 ay" on the dashboard and came
  // here for an object with no order this month keeps reading against it, and takes it on to every order they
  // open from here. The filters and the page are this screen's own business and stay out of the URL.
  const selection = useBasis(params, setParams)
  const basisKey = `${selection.basis}|${selection.from ?? ''}|${selection.to ?? ''}`

  function selectBasis(next: BasisSelection) {
    const search = new URLSearchParams(params)
    for (const [name, value] of Object.entries(basisParams(next))) {
      if (value === undefined) {
        search.delete(name)
      } else {
        search.set(name, value)
      }
    }

    setParams(search)
  }

  const [year, setYear] = useState<number | undefined>(undefined)
  const [month, setMonth] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [comparison, setComparison] = useState<OrderDecisionContext | null>(null)
  const [comparisonPending, setComparisonPending] = useState(false)

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

  const data = state.status === 'success' ? state.data : null

  // Only the unfiltered first page begins with the object's latest order. Anywhere else the first row is just
  // the first row, so there is no "Son sifariş" card to show, and the latest order is one "Filtri təmizlə" or the
  // first page away.
  const latest = data && !year && !month && page === 1 ? (data.requests.items[0] ?? null) : null
  const latestId = latest?.orderRequestId ?? null

  // The comparison is the order page's own, from its own endpoint, so the object page and the order page give
  // one answer for one order and one basis. It qualifies the card rather than producing it: a failure only
  // drops the comparison line. While another basis loads the previous answer is kept but not shown — the card
  // shows a placeholder — so the hand-picked range keeps its months while the reader is still choosing them.
  useEffect(() => {
    if (latestId === null) {
      setComparison(null)
      setComparisonPending(false)
      return
    }

    const controller = new AbortController()
    setComparisonPending(true)
    fetchDecisionContext(latestId, basisRequest(selection), controller.signal)
      .then(setComparison)
      .catch(() => {
        if (!controller.signal.aborted) {
          setComparison(null)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setComparisonPending(false)
        }
      })
    return () => controller.abort()
    // The basis is flattened into a key: a new object every render would re-fetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestId, basisKey])

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

  const totalPages = data ? Math.max(1, Math.ceil(data.requests.totalCount / pageSize)) : 1
  const superseded = supersededRequests(data?.requests.items ?? [])

  return (
    <>
      <PageHeader
        title={data?.name ?? 'Obyekt'}
        description={data && !data.isActive ? 'Deaktiv' : undefined}
        actions={
          <Link to="/locations" className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Obyektlərə qayıt
          </Link>
        }
      />

      {/*
        What this object ordered last, compared against the reader's basis, then the year behind it. Only where
        the first row really is the latest order — see `latest` above.
      */}
      {data && latest && (
        <LocationTrend
          entries={data.requests.items}
          comparison={comparison}
          comparisonPending={comparisonPending}
          selection={selection}
          onSelectBasis={selectBasis}
          priorMonths={comparablePriorMonths(comparison)}
        />
      )}

      {/*
        The lifetime counts, as one quiet line that names its period. Without it Heydər Əliyev's "15" unpriced
        lines read as this month's; they are every order the object has, and the lead says so.
      */}
      {data && (
        <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-xs text-slate-500">
          <p className="font-medium text-slate-600">
            {wholeHistoryLead(formatMonthRange(
              data.earliestPeriod && data.latestPeriod ? [data.earliestPeriod, data.latestPeriod] : [],
            ))}
          </p>
          <dl className="flex flex-wrap gap-x-6 gap-y-1">
            <Fact label="Dövrlər" value={formatNumber(data.distinctPeriodCount)} />
            <Fact label="Sifarişlər" value={formatNumber(data.orderRequestCount)} />
            <Fact label={knownAmountLabel} value={formatAmount(data.knownAmountTotal)} />
            {data.missingPriceItemCount > 0 && (
              <Fact
                label={missingPriceShortLabel}
                value={formatNumber(data.missingPriceItemCount)}
                toneClass={warningToneClass}
              />
            )}
            {/* Slate, never amber: material from the company's own store is not something anybody owes. */}
            {data.internalSupplyItemCount > 0 && (
              <Fact
                label={internalSupplyShortLabel}
                value={formatNumber(data.internalSupplyItemCount)}
                toneClass={internalToneClass}
              />
            )}
          </dl>
        </div>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.status === 'loading' && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  Yüklənir…
                </td>
              </tr>
            )}
            {data?.requests.items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  {year || month ? 'Seçilmiş dövrdə sifariş yoxdur.' : 'Bu obyektin hələ sifarişi yoxdur.'}
                </td>
              </tr>
            )}

            {data?.requests.items.map((request) => (
              /*
                One way into this order (24.1): its period. The whole row opens it (20.2) — a click anywhere on the row
                is handed to that link — so the reader never aims at one word at the far left. An older version opens
                as itself; its page says a newer one exists.
              */
              <tr key={request.orderRequestId} onClick={openSurfaceLink} className={interactiveRowClass}>
                <td className="px-4 py-2.5">
                  <Link
                    {...surfaceLinkAttribute}
                    to={orderLink(request.orderRequestId, selection)}
                    className={`${rowLinkClass} ${interactiveTextClass} font-medium text-slate-900`}
                  >
                    {formatPeriod(request.requestPeriod)}
                  </Link>
                  {superseded.has(request.orderRequestId) && (
                    <p className="text-xs text-slate-500">{supersededOrderNote}</p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <p className="whitespace-nowrap text-slate-900">{formatAmount(request.knownAmountTotal)}</p>
                  {/* The row is its own period, so its counts need no label. */}
                  {request.missingPriceItemCount > 0 && (
                    <p className={`whitespace-nowrap text-xs ${warningToneClass}`}>
                      {missingPriceCount(request.missingPriceItemCount)}
                    </p>
                  )}
                  {request.internalSupplyItemCount > 0 && (
                    <p className={`whitespace-nowrap text-xs ${internalToneClass}`}>
                      {internalSupplyCount(request.internalSupplyItemCount)}
                    </p>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <OrderStatusBadge status={request.status} isHistoricalImport={request.isHistoricalImport} size="sm" />
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

/** One of the record's own counts, said once and quietly, under the period the line names. */
function Fact({ label, value, toneClass = 'text-slate-700' }: { label: string; value: string; toneClass?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}</dt>
      <dd className={`font-medium ${toneClass}`}>{value}</dd>
    </div>
  )
}
