import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { fetchProductHistory, type ProductHistory } from '../api/productHistory'
import { EmptyState, ErrorState, LoadingRows } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { SummaryMetric } from '../components/SummaryMetric'
import { OrderLineTypeBadge } from '../components/orders/OrderLineTypeBadge'
import { formatCount, formatMoney, formatMonth, unknownValue } from '../components/analytics/format'
import { formatNumber } from '../components/imports/labels'
import { monthlyOrdersLabel, outsideMonthlyOrdersLabel } from '../orderLines/lineType'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: ProductHistory }

/**
 * What one product has cost the company, month by month.
 *
 * The question this page answers is "do we order this every month, and is it moving". So the figures at the
 * top — how many months, the average quantity — are about planned material alone: a thing bought once when
 * something broke is not a habit, and counting it would say the company orders something it does not. What was
 * bought outside the plan is not hidden for that: it has its own figure, its own months and its own rows.
 */
export function ProductHistoryPage() {
  const { productId } = useParams()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const id = Number(productId)
    if (!Number.isFinite(id)) {
      setState({ status: 'error', message: 'Məhsul tapılmadı.' })
      return
    }

    const controller = new AbortController()
    setState({ status: 'loading' })
    fetchProductHistory(id, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((problem) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: problem instanceof ApiError ? problem.message : 'Məhsul tarixçəsi yüklənmədi.',
        })
      })
    return () => controller.abort()
  }, [productId])

  const data = state.status === 'success' ? state.data : null

  return (
    <>
      <PageHeader
        title={data ? data.name : 'Məhsul tarixçəsi'}
        description={data ? `${data.code} · bu məhsulun aylar üzrə sifariş tarixçəsi` : undefined}
      />

      {state.status === 'loading' && <LoadingRows label="Tarixçə yüklənir" />}
      {state.status === 'error' && <ErrorState message={state.message} />}

      {data && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Məhsulun xülasəsi">
            {/* «Neçə ay» and the average are about planned material, because that is what "do we order this
                every month" means. The one-off spend stands beside them rather than inside them. */}
            <SummaryMetric label="Sifariş olunan ay" value={formatCount(data.monthsOrdered)} size="lg" />
            <SummaryMetric
              label="Ayda orta miqdar"
              value={data.averageMonthlyQuantity === null ? unknownValue : formatNumber(data.averageMonthlyQuantity)}
            />
            <SummaryMetric label={monthlyOrdersLabel} value={formatMoney(data.monthlyKnownAmountTotal)} />
            <SummaryMetric
              label={outsideMonthlyOrdersLabel}
              value={formatMoney(data.outsideMonthlyKnownAmountTotal)}
              note={data.outsideMonthlyLineCount > 0 ? `${formatCount(data.outsideMonthlyLineCount)} dəfə` : undefined}
            />
            <SummaryMetric
              label="Son sifariş"
              value={data.lastOrderedPeriod === null ? unknownValue : formatMonth(data.lastOrderedPeriod)}
            />
          </div>

          {data.months.length === 0 ? (
            <EmptyState>Bu məhsul heç vaxt sifariş olunmayıb — kataloqda var, amma heç bir sifariş sətrində yoxdur.</EmptyState>
          ) : (
            <>
              <section className="mb-4 relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <caption className="sr-only">Aylar üzrə sifariş miqdarı və məbləği</caption>
                  <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Ay</th>
                      <th className="px-4 py-3 text-right">Aylıq miqdar</th>
                      <th className="px-4 py-3 text-right">Aylıq məbləğ</th>
                      <th className="px-4 py-3 text-right">Aylıqdan kənar</th>
                      <th className="px-4 py-3 text-right">Obyekt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.months.map((month) => (
                      <tr key={month.period}>
                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-900">{formatMonth(month.period)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {month.monthlyLineCount === 0 ? (
                            <span className="text-slate-400">{unknownValue}</span>
                          ) : (
                            formatNumber(month.monthlyQuantity)
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{formatMoney(month.monthlyKnownAmount)}</td>
                        <td className="px-4 py-2.5 text-right">
                          {month.outsideMonthlyLineCount === 0 ? (
                            <span className="text-slate-400">{unknownValue}</span>
                          ) : (
                            <>
                              <span className="text-slate-700">{formatMoney(month.outsideMonthlyKnownAmount)}</span>
                              <span className="block text-xs text-slate-500">
                                {formatNumber(month.outsideMonthlyQuantity)} ədəd · {formatCount(month.outsideMonthlyLineCount)} sətir
                              </span>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-500">{formatCount(month.locationCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <caption className="sr-only">Bu məhsulun sifariş sətirləri</caption>
                  <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Ay</th>
                      <th className="px-4 py-3">Obyekt</th>
                      <th className="px-4 py-3">Variant</th>
                      <th className="px-4 py-3 text-right">Miqdar</th>
                      <th className="px-4 py-3 text-right">Məbləğ</th>
                      <th className="px-4 py-3">Növ</th>
                      <th className="px-4 py-3">Cavabdeh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.lines.map((line) => (
                      <tr key={line.orderRequestItemId}>
                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">{formatMonth(line.period)}</td>
                        <td className="px-4 py-2.5">
                          <Link to={`/orders/${line.orderRequestId}`} className="font-medium text-slate-900 hover:underline">
                            {line.locationName}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{line.variantLabel}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{formatNumber(line.quantity)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{formatMoney(line.knownAmount)}</td>
                        <td className="px-4 py-2.5"><OrderLineTypeBadge type={line.orderLineType} /></td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {line.responsiblePersonName ?? <span className="text-slate-400">{unknownValue}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </>
      )}
    </>
  )
}
