import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { VariantTrendPoint } from '../../api/analytics'
import { formatNumber } from '../imports/labels'
import { formatAnalyticsPeriod } from './labels'
import { formatTrendValue, metricLabels, trendValueOf, type TrendMetric, type TrendSlot } from './trend'

interface TrendChartProps {
  slots: TrendSlot[]
  metric: TrendMetric
}

/**
 * The months of one variant at one location.
 * <para>
 * A month the location did not order in is a break in the line, never a zero and never a straight line drawn
 * across it. A month it did order in without this product is a real zero and is drawn as one.
 * </para>
 */
export function TrendChart({ slots, metric }: TrendChartProps) {
  const data = slots.map((slot) => ({
    period: slot.period,
    label: formatAnalyticsPeriod(slot.period),
    value: trendValueOf(slot.point, metric),
    point: slot.point,
  }))

  return (
    <div className="h-64 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickMargin={8} stroke="#cbd5e1" />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            width={70}
            stroke="#cbd5e1"
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <Tooltip
            content={(props) => <TrendTooltip active={props.active} payload={props.payload} metric={metric} />}
          />
          <Line
            type="monotone"
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
          <Row label="Sətir" value={formatNumber(row.point.itemCount)} />
          {row.point.missingRequiredPriceItemCount > 0 && (
            <Row label="Qiymətsiz sətir" value={formatNumber(row.point.missingRequiredPriceItemCount)} warn />
          )}
          {row.point.priceNotRequiredItemCount > 0 && (
            <Row label="Daxili təminat" value={formatNumber(row.point.priceNotRequiredItemCount)} />
          )}
          <Row label="Versiya" value={String(row.point.version)} />
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
