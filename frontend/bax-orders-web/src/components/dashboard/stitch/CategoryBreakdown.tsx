import { ChartPie } from 'lucide-react'
import type { AnalyticsScope, DashboardCategory } from '../../../api/dashboard'
import { scopeAmountLabels } from '../../../analytics/scope'
import { formatCount, formatMoney } from '../../analytics/format'

/**
 * The colours the segments and their swatches share, in order. Six, because the breakdown is at most four
 * named categories, a remainder and the unfiled row — and the last two always take the last two, so the
 * colour of «Digər» and «Kateqoriyasız» never depends on how many categories the month happened to touch.
 */
const paints = [
  'bg-primary',
  'bg-secondary',
  'bg-tertiary-fixed-dim',
  'bg-primary-fixed-dim',
]
const otherPaint = 'bg-surface-container-highest'
const unfiledPaint = 'bg-outline-variant'

/**
 * What the month's money went on, by the catalogue's own top categories.
 *
 * One stacked bar for the proportions and a list for the figures. The bar is the point: a manager who wants to
 * know whether this was a planting month or a cleaning month gets it from the widths, and reads no further.
 *
 * The rows are the backend's, already folded to a readable few and already in order. Nothing is recomputed
 * here beyond the share, which is each row against the month — so the shares sum to a hundred and the reader
 * can check them against the amounts beside them.
 */
export function CategoryBreakdown({ categories, scope }: {
  categories: readonly DashboardCategory[]
  scope: AnalyticsScope
}) {
  const total = categories.reduce((sum, row) => sum + (row.knownAmount ?? 0), 0)

  if (categories.length === 0 || total <= 0) {
    return null
  }

  const painted = categories.map((row, index) => ({
    row,
    paint: row.kind === 'Other' ? otherPaint : row.kind === 'Uncategorised' ? unfiledPaint : paints[index % paints.length],
    // A category with money in it keeps a visible segment however little: a bar of no width reads as nothing.
    share: row.knownAmount === null || row.knownAmount <= 0 ? 0 : Math.max(1, Math.round((row.knownAmount / total) * 100)),
  }))

  return (
    <section
      className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-space-lg shadow-sm lg:col-span-5"
      aria-label="Sifarişlərin kateqoriya bölgüsü"
    >
      <div>
        <div className="mb-space-sm flex items-center justify-between gap-space-sm border-b border-surface-container-high/60 pb-space-sm">
          <div className="min-w-0">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Sifarişlərin kateqoriya bölgüsü</h2>
            <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
              {scopeAmountLabels[scope]} — material təyinatı üzrə
            </p>
          </div>
          <ChartPie className="size-5 shrink-0 text-outline" aria-hidden="true" />
        </div>

        <div className="my-space-md flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-container-low" aria-hidden="true">
          {painted.map(({ row, paint, share }) => (
            <span key={row.kind + row.name} className={`h-full ${paint}`} style={{ width: `${share}%` }} data-share={share} />
          ))}
        </div>

        <ul className="mt-4 space-y-2">
          {painted.map(({ row, paint, share }) => (
            <li
              key={row.kind + row.name}
              className="flex items-center justify-between gap-space-sm rounded-lg bg-surface-container-low/50 p-2.5"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className={`size-3.5 shrink-0 rounded-md ${paint}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate font-label-md text-label-md font-semibold text-on-surface">{row.name}</span>
                  <span className="block truncate font-body-sm text-body-sm text-on-surface-variant">{subtitle(row)}</span>
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="tabular block font-headline-sm text-headline-sm font-bold text-on-surface">
                  {formatMoney(row.knownAmount)}
                </span>
                <span className="block font-label-sm text-label-sm font-medium text-secondary">{share}% pay</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-space-md font-label-sm text-label-sm text-on-surface-variant">
        Cəmi {formatCount(categories.reduce((sum, row) => sum + row.itemCount, 0))} sifariş sətri
      </p>
    </section>
  )
}

/**
 * The line under a category's name. A real category says how many lines it carries; the two rows that are not
 * categories say what they are instead, because that is the thing a reader needs to know about them.
 */
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
