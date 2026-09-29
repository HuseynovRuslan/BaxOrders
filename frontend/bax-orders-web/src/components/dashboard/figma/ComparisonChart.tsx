import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { LocationDashboardRow, ManagementDashboardSummary } from '../../../api/dashboard'
import { describeBasisCaption, formatCount, formatMoney, formatMonth } from '../../analytics/format'

/** How many objects are drawn by name before the rest becomes one bar. */
const named = 3

interface Column {
  name: string
  baseline: number
  current: number
  /** The folded remainder: many objects moving both ways, so it is never coloured as a direction. */
  aggregate?: boolean
}

/**
 * The month against its basis, object by object, as the Figma handoff draws it.
 *
 * Two bars per object on one axis: the basis in grey and this month in colour. The named few are the month's
 * **biggest spenders**, which is what the handoff calls them — «əsas xərc daşıyıcıları» — and what makes the
 * chart readable: ranked by how far each moved instead, three small objects would stand beside a remainder
 * twenty times their height and the picture would say nothing. Which objects moved most is the question the
 * cards below answer, and they are ranked that way.
 *
 * The rest are one bar, so the picture still adds up to the company and a reader can see how much of the
 * month the named few actually are.
 *
 * Colour carries this product's meaning, not the mock's: a bar that grew is red because the cost went up.
 */
export function ComparisonChart({ summary, rows, onOpenAll }: {
  summary: ManagementDashboardSummary
  rows: readonly LocationDashboardRow[]
  onOpenAll?: () => void
}) {
  const comparable = rows
    .filter((row) => row.knownAmountDelta !== null)
    .sort((left, right) => (right.current.knownAmount ?? 0) - (left.current.knownAmount ?? 0))

  if (comparable.length === 0) {
    return null
  }

  const rest = comparable.slice(named)
  const columns: Column[] = comparable.slice(0, named).map((row) => ({
    name: row.locationName,
    baseline: row.baseline.knownAmount ?? 0,
    current: row.current.knownAmount ?? 0,
  }))

  if (rest.length > 0) {
    columns.push({
      name: `Digər ${formatCount(rest.length)} obyekt`,
      baseline: rest.reduce((sum, row) => sum + (row.baseline.knownAmount ?? 0), 0),
      current: rest.reduce((sum, row) => sum + (row.current.knownAmount ?? 0), 0),
      aggregate: true,
    })
  }

  const caption = describeBasisCaption(summary.basis, summary.baselinePeriods)
  const thisMonth = formatMonth(summary.selectedPeriod)

  // How much of the month's whole movement one object accounts for — the one that moved most, which is not
  // necessarily the one that spends most, so it is found rather than assumed to be first in the chart.
  const movement = comparable.reduce((sum, row) => sum + Math.abs(row.knownAmountDelta!), 0)
  const mover = comparable.reduce(
    (largest, row) => Math.abs(row.knownAmountDelta!) > Math.abs(largest.knownAmountDelta!) ? row : largest)
  const leadShare = movement === 0 ? null : Math.round((Math.abs(mover.knownAmountDelta!) / movement) * 100)

  return (
    <section
      className="rounded-xl border border-simple-line bg-simple-card px-6 py-5"
      aria-label="Aylıq xərc dinamikası və müqayisə"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-simple-ink">Aylıq xərc dinamikası və müqayisə</h2>
          <p className="mt-0.5 text-xs text-simple-ink-faint">
            Əsas xərc daşıyıcıları: müqayisəli balans
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-simple-ink-faint">
          <span className="flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-sm bg-simple-neutral-bar" aria-hidden="true" /> {caption}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-sm bg-simple-accent" aria-hidden="true" /> {thisMonth}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={columns} barGap={4} barCategoryGap="30%">
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
          />
          <Tooltip content={<ChartTooltip caption={caption} thisMonth={thisMonth} />} cursor={{ fill: '#f3f4f6' }} />
          <Bar dataKey="baseline" name={caption} radius={[4, 4, 0, 0]} fill="#e5e7eb" isAnimationActive={false} />
          <Bar dataKey="current" name={thisMonth} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {columns.map((column) => (
              <Cell
                key={column.name}
                fill={column.aggregate
                  ? '#1a56db'
                  : column.current > column.baseline ? '#be2c2c' : '#0d7c4c'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/*
        The figures themselves, for a reader who is not reading the picture. A chart drawn in SVG says nothing
        to a screen reader, and this is tabular data — so it is offered as a table, a column at a time.
      */}
      <table className="sr-only">
        <caption>{`Obyektlər üzrə ${caption} və ${thisMonth} müqayisəsi`}</caption>
        <thead>
          <tr><th scope="col">Obyekt</th><th scope="col">{caption}</th><th scope="col">{thisMonth}</th></tr>
        </thead>
        <tbody>
          {columns.map((column) => (
            <tr key={column.name}>
              <th scope="row">{column.name}</th>
              <td>{formatMoney(column.baseline)}</td>
              <td>{formatMoney(column.current)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-simple-ink-faint">
        {leadShare === null
          ? 'Bu ay heç bir obyektin məbləği dəyişməyib'
          : `Dəyişmənin ${leadShare}%-i ${mover.locationName} obyektinin payına düşür`}
        {onOpenAll && (
          <>
            {' · '}
            <button type="button" onClick={onOpenAll} className="font-medium text-simple-accent hover:underline">
              Tam cədvələ bax
            </button>
          </>
        )}
      </p>
    </section>
  )
}

/** The handoff's dark tooltip, naming the two months rather than the series keys. */
function ChartTooltip({ active, payload, label, caption, thisMonth }: {
  active?: boolean
  payload?: { dataKey?: string | number, value?: number, fill?: string }[]
  label?: string
  caption: string
  thisMonth: string
}) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-lg bg-simple-ink px-3.5 py-2.5 text-xs text-white">
      <p className="mb-1.5 font-semibold">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="mb-0.5 flex items-center gap-2">
          <span className="inline-block size-2 rounded-sm" style={{ background: entry.fill }} aria-hidden="true" />
          <span className="text-simple-ink-faint">{entry.dataKey === 'baseline' ? caption : thisMonth}:</span>
          <span className="font-figures font-semibold">{formatMoney(entry.value ?? null)}</span>
        </p>
      ))}
    </div>
  )
}
