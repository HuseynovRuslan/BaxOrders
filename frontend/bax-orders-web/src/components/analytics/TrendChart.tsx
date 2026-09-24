import { internalSupplyShortLabel, missingPriceShortLabel } from '../../pricing/labels'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { VariantTrendPoint } from '../../api/analytics'
import { formatNumber } from '../imports/labels'
import { formatAnalyticsPeriod } from './labels'
import {
  allWhole,
  formatTrendValue,
  metricLabels,
  monthTickLabel,
  trendValueOf,
  valueAxis,
  type TrendMetric,
  type TrendSlot,
} from './trend'

interface TrendChartProps {
  slots: TrendSlot[]
  metric: TrendMetric
}

/** Beyond this many months the names are tilted, so a year of them fits the window's width without skipping any. */
const uprightTickLimit = 8

/**
 * The months of one variant at one location.
 * <para>
 * Straight lines from month to month: a monthly figure has no value between two months, and a curve drew one.
 * A month the location did not order in is a break in the line, never a zero and never a line drawn across it. A
 * month it did order in without this product is a real zero and is drawn as one.
 * </para>
 * <para>
 * Every month is named on the axis. The value axis starts at zero, ends on a round number above the data so no
 * line lies on the top edge, and counts in whole numbers when every quantity is whole. The rules are in
 * `./trend`; this only applies them.
 * </para>
 */
export function TrendChart({ slots, metric }: TrendChartProps) {
  const data = slots.map((slot) => ({
    period: slot.period,
    label: formatAnalyticsPeriod(slot.period),
    value: trendValueOf(slot.point, metric),
    point: slot.point,
  }))

  const values = data.map((row) => row.value)
  // Only a quantity is ever forced to whole numbers; a price or an amount keeps its qəpik.
  const wholeNumbers = metric === 'quantity' && allWhole(values)
  const axis = valueAxis(values, wholeNumbers)
  const tilted = slots.length > uprightTickLimit
  const first = slots[0]?.period

  return (
    <div className="h-64 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="period"
            interval={0}
            tickFormatter={(period: string) => monthTickLabel(period, period === first)}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickMargin={8}
            stroke="#cbd5e1"
            angle={tilted ? -35 : 0}
            textAnchor={tilted ? 'end' : 'middle'}
            height={tilted ? 56 : 30}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            width={70}
            stroke="#cbd5e1"
            domain={axis.domain}
            ticks={axis.ticks}
            allowDecimals={!wholeNumbers}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <Tooltip
            content={(props) => <TrendTooltip active={props.active} payload={props.payload} metric={metric} />}
          />
          <Line
            type="linear"
            dataKey="value"
            name={metricLabels[metric]}
            stroke="#4f46e5"
            strokeWidth={2}
            dot={{ r: 3, fill: '#4f46e5' }}
            activeDot={{ r: 5 }}
            // A missing month breaks the line instead of being bridged: the data simply is not there.
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

type TooltipPayload = { period: string; label: string; value: number | null; point: VariantTrendPoint | null }

/** Only the parts of the chart's tooltip props this needs, so the chart library's generics stay out of it. */
interface TooltipShape {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  metric: TrendMetric
}

function TrendTooltip({ active, payload, metric }: TooltipShape) {
  if (!active || !payload?.length) {
    return null
  }

  const row = payload[0]?.payload as TooltipPayload | undefined
  if (!row) {
    return null
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-2 text-xs shadow-lg">
      <p className="font-medium text-slate-900">{row.label}</p>
      {row.point === null ? (
        // Nothing is invented for a month that has no request; the tooltip says so.
        <p className="mt-0.5 text-slate-500">Bu ay üzrə sifariş yoxdur</p>
      ) : (
        <dl className="mt-1 space-y-0.5 text-slate-600">
          <Row label={metricLabels[metric]} value={formatTrendValue(row.value, metric)} />
          {row.point.missingRequiredPriceItemCount > 0 && (
            <Row label={missingPriceShortLabel} value={formatNumber(row.point.missingRequiredPriceItemCount)} warn />
          )}
          {row.point.priceNotRequiredItemCount > 0 && (
            <Row label={internalSupplyShortLabel} value={formatNumber(row.point.priceNotRequiredItemCount)} />
          )}
        </dl>
      )}
    </div>
  )
}

function Row({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`ml-auto ${warn ? 'text-amber-800' : 'text-slate-900'}`}>{value}</dd>
    </div>
  )
}
