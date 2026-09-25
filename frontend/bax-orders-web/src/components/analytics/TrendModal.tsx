import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import {
  fetchVariantTrend,
  type VariantIdentity,
  type VariantOrderFrequency,
  type VariantTrend,
  type VariantTrendPoint,
} from '../../api/analytics'
import type { DecisionDriver } from '../../api/decisions'
import { productHistoryLabel } from '../../terminology/terms'
import { MissingPriceMark } from '../dashboard/MissingPriceMark'
import { formatNumber, formatOrderUnit } from '../imports/labels'
import { Modal } from '../imports/review/Modal'
import { DirectionWord } from './DirectionWord'
import { InfoHint } from './InfoHint'
import { costDirectionToneClass, formatMoneyDelta, formatPercent } from './format'
import {
  describeVariant,
  formatAnalyticsAmount,
  formatAnalyticsPeriod,
  formatPrice,
  internalSupplyLabel,
  unknownValue,
  weightedPriceHint,
} from './labels'
import {
  frequencySentence,
  metricLabels,
  monthsBetween,
  quantityRatioLine,
  supplierLine,
  type QuantityRatioInput,
  type TrendMetric,
  type TrendSlot,
} from './trend'

// Charting is only downloaded when somebody actually opens a trend.
const TrendChart = lazy(() => import('./TrendChart').then((module) => ({ default: module.TrendChart })))

interface TrendModalProps {
  locationId: number
  variant: VariantIdentity
  isService: boolean
  to: string
  /** Earliest month to show. Omitted means the whole history the location has. */
  from?: string
  /**
   * The comparison this product was opened from, when it was opened from one. It carries the before-and-after
   * figures the driver row deliberately leaves out, which is what makes that row a summary rather than a table.
   */
  driver?: DecisionDriver | null
  /**
   * This month's quantity against the basis quantity, as the page that opened the window compares them — its
   * basis and its row's own two figures. Null or omitted when there is no basis to compare with.
   */
  quantityRatio?: QuantityRatioInput | null
  onClose: () => void
}

/**
 * One product at one object, over time.
 *
 * Read in the order a manager asks: who supplies it, what changed this month and whether that is an ordinary
 * month for it, how often the thing is ordered at all, and then the whole history as a chart and as a table. The
 * table is the figures a manager thinks in — month, quantity, price, amount, supplier — and the technical record of
 * which request and which version each month came from is folded away underneath, because it answers a different
 * question from a different job.
 */
export function TrendModal({
  locationId,
  variant,
  isService,
  to,
  from,
  driver,
  quantityRatio,
  onClose,
}: TrendModalProps) {
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
          setError(problem instanceof Error ? problem.message : `${productHistoryLabel} yüklənmədi`)
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
  const unit = formatOrderUnit(variant.orderUnitCode, variant.orderUnitName)
  // A service has no quantity to divide, so it has no ratio either.
  const ratio = !isService && quantityRatio ? quantityRatioLine(quantityRatio, unit) : null

  return (
    <Modal
      title={productHistoryLabel}
      subtitle={`${variant.productName} · ${describeVariant(variant)}`}
      onClose={onClose}
      width="wide"
      // Read, never written in: a press on the background may close it (17.2).
      dismissOnBackdrop
    >
      {trend === null && error === null && <p className="py-8 text-center text-sm text-slate-500">Yüklənir…</p>}

      {error !== null && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {trend !== null && slots.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">Bu məhsul üzrə göstəriləcək dövr yoxdur.</p>
      )}

      {trend !== null && slots.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">{supplierLine(slots)}</p>

          {driver
            ? <ComparisonDetail driver={driver} isService={isService} unit={unit} ratio={ratio} />
            : ratio && <p className="text-sm font-medium text-slate-900">{ratio}</p>}

          <Frequency frequency={trend.frequency} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {formatAnalyticsPeriod(slots[0].period)} – {formatAnalyticsPeriod(slots[slots.length - 1].period)}
              {' · '}
              {formatNumber(trend.points.length)} dövr
            </p>

            <div className="flex items-center gap-1" role="group" aria-label="Göstərici">
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
              <InfoHint label="Orta qiymət necə hesablanır?">{weightedPriceHint}</InfoHint>
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

          {/* The same history as figures, in the four a manager reads. Present always, not behind a summary:
              the numbers are the point of the screen, and the chart is one way of looking at them. */}
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <caption className="sr-only">
                {variant.productName} üzrə aylıq miqdar, qiymət, məbləğ və təchizatçı
              </caption>
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-1.5 font-medium">Ay</th>
                  <th scope="col" className="px-3 py-1.5 text-right font-medium">Miqdar</th>
                  <th scope="col" className="px-3 py-1.5 text-right font-medium">Qiymət</th>
                  <th scope="col" className="px-3 py-1.5 text-right font-medium">Məbləğ</th>
                  <th scope="col" className="px-3 py-1.5 font-medium">Təchizatçı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slots.map((slot) => (
                  <tr key={slot.period} className={slot.point === null ? 'text-slate-400' : 'text-slate-700'}>
                    <th scope="row" className="px-3 py-1.5 font-normal">{formatAnalyticsPeriod(slot.period)}</th>

                    {slot.point === null ? (
                      // No request that month at all. Not an order of nothing — one note, not four zeros.
                      <td className="px-3 py-1.5 text-slate-400" colSpan={4}>
                        sifariş yoxdur
                      </td>
                    ) : (
                      <>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right">
                          {slot.point.quantity === null
                            ? unknownValue
                            : `${formatNumber(slot.point.quantity)}${unit ? ` ${unit}` : ''}`}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right">
                          <PriceCell point={slot.point} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right">
                          {/* Never a fabricated 0 ₼: a month with no purchase price has no amount to show. */}
                          {slot.point.knownAmount === null ? unknownValue : formatAnalyticsAmount(slot.point.knownAmount)}
                        </td>
                        <td className="px-3 py-1.5">
                          {slot.point.supplierNames.length === 0 ? unknownValue : slot.point.supplierNames.join(' · ')}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Which request each month came from. A different job's question, so it is folded away. */}
          <details className="rounded-md border border-slate-200">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700">
              Mənbə və versiya məlumatı
            </summary>
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-1.5 font-medium">Ay</th>
                    <th scope="col" className="px-3 py-1.5 font-medium">Sətir</th>
                    <th scope="col" className="px-3 py-1.5 font-medium">Versiya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slots.map((slot) => (
                    <tr key={slot.period} className={slot.point === null ? 'text-slate-400' : 'text-slate-700'}>
                      <th scope="row" className="px-3 py-1.5 font-normal">{formatAnalyticsPeriod(slot.period)}</th>
                      <td className="px-3 py-1.5">{slot.point === null ? unknownValue : formatNumber(slot.point.itemCount)}</td>
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

/**
 * The price a month actually carried.
 *
 * Three different months look alike in the data and must not look alike here: one that was bought and priced,
 * one the company supplied itself — which owes no price and is therefore complete — and one somebody still has
 * to price. Only the last of the three is a gap: its price is "—", as an unpriced line is everywhere (Task 2),
 * and the short amber mark beside it says how many lines owe one, the way the dashboard says it.
 */
function PriceCell({ point }: { point: VariantTrendPoint }) {
  if (point.weightedUnitPrice !== null) {
    return <span>{formatPrice(point.weightedUnitPrice)}</span>
  }

  if (point.priceNotRequiredItemCount > 0) {
    return <span className="text-slate-500">{internalSupplyLabel}</span>
  }

  if (point.missingRequiredPriceItemCount > 0) {
    return (
      <span className="inline-flex items-baseline gap-1.5">
        <span className="text-slate-400">{unknownValue}</span>
        <MissingPriceMark count={point.missingRequiredPriceItemCount} explanationIsComplete />
      </span>
    )
  }

  return <span className="text-slate-400">{unknownValue}</span>
}

/**
 * How often this object orders this product, from counted months only.
 *
 * A month the object has no request for is in none of these counts. It is not a month the product was skipped
 * — nobody recorded anything about it — and turning it into a skipped month would be the same mistake as
 * turning it into a zero.
 */
function Frequency({ frequency }: { frequency: VariantOrderFrequency }) {
  if (frequency.availableMonthCount === 0) {
    return null
  }

  const facts: string[] = []
  if (frequency.firstOrderedPeriod) {
    facts.push(`İlk sifariş: ${formatAnalyticsPeriod(frequency.firstOrderedPeriod)}`)
  }

  if (frequency.lastOrderedPeriod) {
    facts.push(`Son sifariş: ${formatAnalyticsPeriod(frequency.lastOrderedPeriod)}`)
  }

  if (frequency.monthsSinceLastOrder !== null && frequency.monthsSinceLastOrder > 0) {
    facts.push(`Son sifarişdən sonra ${formatNumber(frequency.monthsSinceLastOrder)} ay keçib`)
  }

  const interval = describeInterval(frequency)
  if (interval) {
    facts.push(interval)
  }

  return (
    <section className="rounded-md border border-slate-200 bg-slate-50 p-3" aria-label="Sifariş tezliyi">
      <p className="text-sm font-medium text-slate-900">{frequencySentence(frequency)}</p>
      {facts.length > 0 && <p className="mt-0.5 text-xs text-slate-600">{facts.join(' · ')}</p>}
    </section>
  )
}

/** "Tipik interval: 1–2 ay" — a median with its range, and nothing at all until there is a median to give. */
function describeInterval(frequency: VariantOrderFrequency): string | null {
  if (frequency.typicalIntervalMonths === null) {
    return null
  }

  const { shortestIntervalMonths: shortest, longestIntervalMonths: longest } = frequency
  if (shortest !== null && longest !== null && shortest !== longest) {
    return `Tipik interval: ${formatNumber(shortest)}–${formatNumber(longest)} ay`
  }

  return `Tipik interval: ${formatNumber(frequency.typicalIntervalMonths)} ay`
}

/**
 * The comparison the product was opened from, in full.
 *
 * This is the other half of progressive disclosure: the driver row says what changed and what it did to the
 * money, and everything it left out is here — this month's quantity as a multiple of the basis, both sides of
 * every figure, and the split of the difference into the part quantity accounts for and the part price accounts
 * for, each in the colour of its cost's direction (9.1).
 */
function ComparisonDetail({
  driver,
  isService,
  unit,
  ratio,
}: {
  driver: DecisionDriver
  isService: boolean
  unit: string
  ratio: string | null
}) {
  return (
    <section className="rounded-md border border-slate-200 p-3" aria-label="Bu ayın müqayisəsi">
      {ratio && <p className="mb-2 text-sm font-medium text-slate-900">{ratio}</p>}
      <div className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
        {!isService && (
          <Pair
            label="Miqdar"
            baseline={driver.baselineQuantity === null ? unknownValue : `${formatNumber(driver.baselineQuantity)}${unit ? ` ${unit}` : ''}`}
            current={driver.currentQuantity === null ? unknownValue : `${formatNumber(driver.currentQuantity)}${unit ? ` ${unit}` : ''}`}
            note={driver.quantityPercentChange === null ? null : formatPercent(driver.quantityPercentChange)}
          />
        )}
        <Pair
          label="Qiymət"
          baseline={driver.baselineUnitPrice === null ? unknownValue : formatPrice(driver.baselineUnitPrice)}
          current={driver.currentUnitPrice === null ? unknownValue : formatPrice(driver.currentUnitPrice)}
          note={driver.unitPricePercentChange === null ? null : formatPercent(driver.unitPricePercentChange)}
        />
        <Pair
          label="Məbləğ"
          baseline={driver.baselineKnownAmount === null ? unknownValue : formatAnalyticsAmount(driver.baselineKnownAmount)}
          current={driver.currentKnownAmount === null ? unknownValue : formatAnalyticsAmount(driver.currentKnownAmount)}
          note={null}
        />
      </div>

      {(driver.quantityImpact !== null || driver.priceImpact !== null) && (
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-2 text-xs">
          {driver.quantityImpact !== null && (
            <div className="flex items-baseline gap-1.5">
              <dt className="text-slate-500">Miqdar təsiri</dt>
              <dd className={`font-medium ${costDirectionToneClass(driver.quantityImpact)}`}>
                {formatMoneyDelta(driver.quantityImpact)}
                <DirectionWord value={driver.quantityImpact} />
              </dd>
            </div>
          )}
          {driver.priceImpact !== null && (
            <div className="flex items-baseline gap-1.5">
              <dt className="text-slate-500">Qiymət təsiri</dt>
              <dd className={`font-medium ${costDirectionToneClass(driver.priceImpact)}`}>
                {formatMoneyDelta(driver.priceImpact)}
                <DirectionWord value={driver.priceImpact} />
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  )
}

/** "Keçən ay → bu ay", with the percentage underneath where there is one. */
function Pair({
  label,
  baseline,
  current,
  note,
}: {
  label: string
  baseline: string
  current: string
  note: string | null
}) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="whitespace-nowrap font-medium text-slate-900">
        {baseline} <span className="text-slate-400">→</span> {current}
      </p>
      {note && <p className="text-slate-500">{note}</p>}
    </div>
  )
}
