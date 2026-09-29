import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Link } from 'react-router'
import type { DashboardCategory } from '../../../api/dashboard'
import { formatCount, formatMoney } from '../../analytics/format'

/**
 * A colour per row, in order. The two rows that are not a category always take the last two, so the shade of
 * «Digər» and «Kateqoriyasız» never depends on how many categories the month happened to touch.
 */
const paints = ['#1a56db', '#0891b2', '#059669', '#7c3aed']
const otherPaint = '#9ca3af'
const unfiledPaint = '#d1d5db'

function paintOf(row: DashboardCategory, index: number): string {
  return row.kind === 'Other' ? otherPaint : row.kind === 'Uncategorised' ? unfiledPaint : paints[index % paints.length]
}

/**
 * What the month's money went on, as the Figma handoff draws it: a ring for the proportions and a list for
 * the figures.
 *
 * The ring answers "was this a planting month or a cleaning month" without a number being read. The list is
 * for the reader who then wants the amounts, and the share beside each is that row against the month — so
 * the shares add to a hundred and can be checked against the money next to them.
 */
export function CategoryDonut({ categories }: { categories: readonly DashboardCategory[] }) {
  const total = categories.reduce((sum, row) => sum + (row.knownAmount ?? 0), 0)

  if (categories.length === 0 || total <= 0) {
    return null
  }

  const painted = categories.map((row, index) => ({
    row,
    paint: paintOf(row, index),
    share: row.knownAmount === null || row.knownAmount <= 0 ? 0 : Math.max(1, Math.round((row.knownAmount / total) * 100)),
  }))

  const slices = painted.map(({ row, paint }) => ({
    name: row.name,
    value: row.knownAmount ?? 0,
    fill: paint,
  }))

  return (
    <section
      className="rounded-xl border border-simple-line bg-simple-card px-6 py-5"
      aria-label="Sifarişlərin kateqoriya bölgüsü"
    >
      <h2 className="text-[15px] font-bold text-simple-ink">Sifarişlərin kateqoriya bölgüsü</h2>
      <p className="mb-3 text-xs text-simple-ink-faint">Material təyinatı üzrə paylanma</p>

      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie data={slices} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2} isAnimationActive={false}>
            {slices.map((slice) => <Cell key={slice.name} fill={slice.fill} />)}
          </Pie>
          <Tooltip formatter={(value) => formatMoney(typeof value === 'number' ? value : null)} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="mt-2 flex flex-col gap-2">
        {painted.map(({ row, paint, share }) => (
          <li key={row.kind + row.name} className="flex items-center justify-between gap-2 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              <span className="inline-block size-2.5 shrink-0 rounded-sm" style={{ background: paint }} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate font-medium text-simple-ink">{row.name}</span>
                <span className="block truncate text-[11px] text-simple-ink-faint">{subtitle(row)}</span>
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-figures text-[13px] font-bold text-simple-ink">{formatMoney(row.knownAmount)}</span>
              <span className="block text-[11px] font-semibold" style={{ color: paint }}>{share}% pay</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-center justify-between gap-2 border-t border-simple-line-soft pt-2.5 text-xs">
        <span className="text-simple-ink-faint">
          Cəmi {formatCount(categories.reduce((sum, row) => sum + row.itemCount, 0))} sifariş sətri
        </span>
        <Link to="/products" className="shrink-0 font-medium text-simple-accent hover:underline">
          Bütün məhsullar →
        </Link>
      </p>
    </section>
  )
}

/** A real category says how many lines it carries; the two that are not categories say what they are. */
function subtitle(row: DashboardCategory): string {
  switch (row.kind) {
    case 'Other':
      return `${formatCount(row.categoryCount)} kateqoriya birlikdə`
    case 'Uncategorised':
      return 'Kateqoriyaya aid edilməyən məhsullar'
    default:
      return `${formatCount(row.itemCount)} sifariş sətri`
  }
}
