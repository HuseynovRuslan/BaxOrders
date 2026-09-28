import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { fetchLocationOrders, type LocationOrderList, type LocationOrderSort } from '../api/orders'
import { PageHeader } from '../components/PageHeader'
import { missingPriceCount } from '../pricing/labels'
import { SummaryMetric } from '../components/SummaryMetric'
import { OrderStatusBadge } from '../components/workflow/OrderStatusBadge'
import { DirectionWord } from '../components/analytics/DirectionWord'
import { noPreviousMonthNote } from '../components/decisions/labels'
import {
  costDirectionToneClass,
  describeBasisCaption,
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatMonth,
  formatPercent,
  unknownValue,
} from '../components/analytics/format'
import { outsideMonthlyBesideLabel } from '../orderLines/lineType'

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
          <SummaryMetric label="Obyekt" value={formatCount(data.locationCount)} />
          <SummaryMetric label="Sifarişi olan" value={formatCount(data.locationsWithOrders)} />
          <SummaryMetric label="Sifariş" value={formatCount(data.orderRequestCount)} />
          <SummaryMetric
            label="Əhatə olunan dövr"
            value={
              data.earliestPeriod && data.latestPeriod
                ? `${formatMonth(data.earliestPeriod)} – ${formatMonth(data.latestPeriod)}`
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
          placeholder="Obyekt adı…"
          className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
        />
      </form>

      {/* `relative` so the screen-reader-only text inside the rows positions against this box. Absolutely
          positioned children with no positioned ancestor lay themselves out against the page instead, and
          then they widen it — the table scrolls inside its box, but the page scrolled 227 pixels sideways on
          a phone because of a handful of invisible spans. */}
      <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-4 py-3">
                <SortButton label="Obyekt" active={sort === 'Name'} descending={descending} onClick={() => reorder('Name')} />
              </th>
              <th className="px-4 py-3">
                <SortButton
                  label="Son sifariş"
                  active={sort === 'LatestPeriod'}
                  descending={descending}
                  onClick={() => reorder('LatestPeriod')}
                />
              </th>
              <th className="px-4 py-3 text-right">Məbləğ</th>
              {/*
                The list has no basis of its own to follow: its figure is always each object's latest order
                against the calendar month before it, and the heading says so rather than leaving it to be guessed.
              */}
              <th className="px-4 py-3 text-right">
                Dəyişmə
                <span className="block font-normal text-slate-400">{describeBasisCaption('PreviousMonth', [])}</span>
              </th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"><span className="sr-only">Bax</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.status === 'loading' && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Yüklənir…
                </td>
              </tr>
            )}
            {state.status === 'error' && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-600">
                  Obyektlər yüklənmədi: {state.message}
                </td>
              </tr>
            )}
            {data?.locations.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  {search ? 'Axtarışa uyğun obyekt tapılmadı.' : 'Obyekt yoxdur.'}
                </td>
              </tr>
            )}

            {data?.locations.items.map((location) => (
              <tr key={location.locationId} className="hover:bg-slate-50">
                <th scope="row" className="px-4 py-2.5 text-left font-normal">
                  <Link to={`/locations/${location.locationId}`} className="font-medium text-slate-900 hover:underline">
                    {location.name}
                  </Link>
                </th>

                <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">
                  {location.latestPeriod ? formatMonth(location.latestPeriod) : <span className="text-slate-400">{unknownValue}</span>}
                </td>

                <td className="px-4 py-2.5 text-right">
                  <p className="whitespace-nowrap font-medium text-slate-900">{formatMoney(location.latestKnownAmount)}</p>
                  {/* The figure above and the difference beside it are the month's monthly money. What was
                      bought outside the plan is a fact about the month, so it is said here rather than folded
                      into a number a comparison reads. */}
                  {location.latestOutsideMonthlyItemCount > 0 && (
                    <p className="text-xs text-slate-500">
                      {outsideMonthlyBesideLabel} {formatMoney(location.latestOutsideMonthlyKnownAmount)}
                    </p>
                  )}
                  {location.latestMissingPriceItemCount > 0 && (
                    <p className="text-xs text-amber-800">
                      {missingPriceCount(location.latestMissingPriceItemCount)}
                    </p>
                  )}
                </td>

                <td className="px-4 py-2.5 text-right">
                  {location.knownAmountDelta === null ? (
                    // No previous month to compare with. Saying "0" or "+100%" would both be inventions, so the
                    // dash says why it is a dash.
                    <span className="text-xs text-slate-400" title={noPreviousMonthNote}>
                      {unknownValue}
                      <span className="sr-only">{noPreviousMonthNote}</span>
                    </span>
                  ) : (
                    <>
                      {/* Red up, green down (9.1), with the direction in words for a screen reader. */}
                      <p className={`whitespace-nowrap ${costDirectionToneClass(location.knownAmountDelta)}`}>
                        {formatMoneyDelta(location.knownAmountDelta)}
                        <DirectionWord value={location.knownAmountDelta} />
                      </p>
                      <p className={`whitespace-nowrap text-xs ${costDirectionToneClass(location.knownAmountDelta)}`}>
                        {formatPercent(location.knownAmountPercentChange)}
                      </p>
                    </>
                  )}
                </td>

                <td className="px-4 py-2.5">
                  {location.latestRequestStatus ? (
                    <OrderStatusBadge
                      status={location.latestRequestStatus}
                      isHistoricalImport={location.latestRequestIsHistoricalImport}
                      size="sm"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">sifariş yoxdur</span>
                  )}
                </td>

                <td className="px-4 py-2.5 text-right">
                  {location.orderRequestCount > 0 && (
                    <Link
                      to={`/locations/${location.locationId}`}
                      aria-label={`${location.name} obyektinə bax`}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Bax
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
            Səhifə {data.locations.page} / {totalPages} · {formatCount(data.locations.totalCount)} obyekt
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

      {data && data.locations.items.some((location) => location.latestMissingPriceItemCount > 0) && (
        <p className="mt-3 text-xs text-slate-500">
          Məbləğ son sifariş üzrədir və yalnız qiyməti məlum olan sətirləri əhatə edir.
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
