import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { fetchVariantTrend, type VariantIdentity, type VariantTrend } from '../../api/analytics'
import { formatNumber } from '../imports/labels'
import { Modal } from '../imports/review/Modal'
import { formatAnalyticsPeriod, formatVariantLine, internalSupplyLabel, unknownValue } from './labels'
import { formatTrendValue, metricLabels, monthsBetween, trendValueOf, type TrendMetric, type TrendSlot } from './trend'

// Charting is only downloaded when somebody actually opens a trend.
const TrendChart = lazy(() => import('./TrendChart').then((module) => ({ default: module.TrendChart })))

interface TrendModalProps {
  locationId: number
  variant: VariantIdentity
  isService: boolean
  to: string
  /** Earliest month to show. Omitted means the whole history the location has. */
  from?: string
  onClose: () => void
}

export function TrendModal({ locationId, variant, isService, to, from, onClose }: TrendModalProps) {
  const [trend, setTrend] = useState<VariantTrend | null>(null)
  const [error, setError] = useState<string | null>(null)
  // A service has no quantity to plot, so its trend opens on money.
  const [metric, setMetric] = useState<TrendMetric>(isService ? 'amount' : 'quantity')

  useEffect(() => {
    const controller = new AbortController()
    fetchVariantTrend(locationId, variant.productVariantId, { from, to }, controller.signal)
      .then(setTrend)
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Trend yüklənmədi')
        }
      })
    return () => controller.abort()
  }, [locationId, variant.productVariantId, from, to])

  const slots = useMemo<TrendSlot[]>(() => {
    if (trend === null || trend.points.length === 0) {
      return []
    }

    const byPeriod = new Map(trend.points.map((point) => [point.period.slice(0, 7), point]))
    const first = trend.points[0].period.slice(0, 7)
    const last = trend.points[trend.points.length - 1].period.slice(0, 7)

    return monthsBetween(first, last).map((period) => ({ period, point: byPeriod.get(period) ?? null }))
  }, [trend])

  const metrics: TrendMetric[] = isService ? ['amount', 'price'] : ['quantity', 'amount', 'price']
  const gaps = slots.filter((slot) => slot.point === null).length

  return (
    <Modal title="Trend" subtitle={`${variant.productName} · ${formatVariantLine(variant)}`} onClose={onClose} width="wide">
      {trend === null && error === null && <p className="py-8 text-center text-sm text-slate-500">Yüklənir…</p>}

      {error !== null && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {trend !== null && slots.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">Bu məhsul üzrə göstəriləcək dövr yoxdur.</p>
      )}

      {trend !== null && slots.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {formatAnalyticsPeriod(slots[0].period)} – {formatAnalyticsPeriod(slots[slots.length - 1].period)}
              {' · '}
              {formatNumber(trend.points.length)} dövr
            </p>

            <div className="flex gap-1" role="group" aria-label="Trend göstəricisi">
              {metrics.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={metric === option}
                  onClick={() => setMetric(option)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    metric === option
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {metricLabels[option]}
                </button>
              ))}
            </div>
          </div>

          <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-slate-100" />}>
            <TrendChart slots={slots} metric={metric} />
          </Suspense>

          {gaps > 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              {formatNumber(gaps)} ay üçün bu obyektin sifarişi yoxdur. Həmin aylar qrafikdə boşluqdur — sıfır kimi
              göstərilmir.
            </p>
          )}

          {/* The same numbers as a table, so the trend is not available only to people who can see the chart. */}
          <details className="rounded-md border border-slate-200">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700">
              Rəqəmlərlə ({formatNumber(slots.length)} ay)
            </summary>
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-1.5 font-medium">Ay</th>
                    <th scope="col" className="px-3 py-1.5 font-medium">{metricLabels[metric]}</th>
                    <th scope="col" className="px-3 py-1.5 font-medium">Sətir</th>
                    <th scope="col" className="px-3 py-1.5 font-medium">Qiymətsiz</th>
                    <th scope="col" className="px-3 py-1.5 font-medium">Versiya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slots.map((slot) => (
                    <tr key={slot.period} className={slot.point === null ? 'text-slate-400' : 'text-slate-700'}>
                      <th scope="row" className="px-3 py-1.5 font-normal">{formatAnalyticsPeriod(slot.period)}</th>
                      <td className="px-3 py-1.5">
                        {slot.point === null ? 'sifariş yoxdur' : formatTrendValue(trendValueOf(slot.point, metric), metric)}
                      </td>
                      <td className="px-3 py-1.5">{slot.point === null ? unknownValue : formatNumber(slot.point.itemCount)}</td>
                      <td className="px-3 py-1.5">
                        {slot.point === null
                          ? unknownValue
                          : slot.point.missingRequiredPriceItemCount > 0
                            ? formatNumber(slot.point.missingRequiredPriceItemCount)
                            // A month supplied from our own store owes no price, so it is described rather
                            // than counted as a shortfall of zero.
                            : slot.point.priceNotRequiredItemCount > 0
                              ? internalSupplyLabel
                              : '0'}
                      </td>
                      <td className="px-3 py-1.5">{slot.point === null ? unknownValue : slot.point.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </Modal>
  )
}
