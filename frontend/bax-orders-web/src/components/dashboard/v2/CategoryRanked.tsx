import { Link } from 'react-router'
import type { DashboardCategory } from '../../../api/dashboard'
import { formatMoney } from '../../analytics/format'

/** How many rows the approved design shows. Past this the tail becomes one «Digər». */
const rows = 5

interface Row {
  key: string
  name: string
  amount: number
}

/**
 * What the month's money went on, as the approved design draws it: a name, an amount, and a bar.
 *
 * No percentage column — the bar is the proportion, and a figure beside a bar saying the same thing twice is
 * the kind of density this view exists to avoid. The bar is each row against the largest, so the first is
 * always full and the rest are read against it.
 *
 * Five rows, because that is what was approved. The backend hands back a few named categories, a folded
 * remainder and whatever nobody has filed; where that comes to more than five, the tail is folded again here
 * into one «Digər» so the rows still add up to the month.
 */
export function CategoryRanked({ categories }: { categories: readonly DashboardCategory[] }) {
  const total = categories.reduce((sum, row) => sum + (row.knownAmount ?? 0), 0)

  if (categories.length === 0 || total <= 0) {
    return null
  }

  const shown = fold(categories)
  const largest = Math.max(...shown.map((row) => row.amount))

  return (
    <section
      className="flex w-full shrink-0 flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6 xl:w-[420px]"
      aria-label="Kateqoriya üzrə bölgü"
    >
      <h2 className="text-base font-bold text-slate-900">Kateqoriya üzrə bölgü</h2>

      <ul className="flex flex-col gap-4">
        {shown.map((row) => {
          // A category with money in it keeps a visible bar however little: a bar of no width reads as none.
          const share = largest <= 0 ? 0 : Math.max(2, Math.round((row.amount / largest) * 100))
          return (
            <li key={row.key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate text-slate-600">{row.name}</span>
                <span className="shrink-0 font-semibold text-slate-900">{formatMoney(row.amount)}</span>
              </div>
              <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <span className="block h-full rounded-full bg-blue-500" style={{ width: `${share}%` }} data-share={share} />
              </span>
            </li>
          )
        })}
      </ul>

      <Link to="/products/categories" className="text-xs font-medium text-blue-600 hover:underline">
        Bütün kateqoriyalara bax →
      </Link>
    </section>
  )
}

/**
 * At most five rows, with the tail folded into one.
 *
 * «Digər» here means "everything else" rather than "other categories", because what it folds may include the
 * products nobody has filed. The detailed view keeps those apart — this is the executive one, and five rows is
 * what was approved for it.
 */
function fold(categories: readonly DashboardCategory[]): Row[] {
  const all: Row[] = categories.map((row) => ({
    key: row.kind + row.name,
    name: row.name,
    amount: row.knownAmount ?? 0,
  }))

  if (all.length <= rows) {
    return all
  }

  const head = all.slice(0, rows - 1)
  const tail = all.slice(rows - 1)
  return [...head, {
    key: 'folded',
    name: 'Digər',
    amount: tail.reduce((sum, row) => sum + row.amount, 0),
  }]
}
