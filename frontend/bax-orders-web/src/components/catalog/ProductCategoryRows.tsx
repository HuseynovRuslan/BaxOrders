import type { ProductCategoryRow } from '../../api/productCategories'
import {
  ambiguousNote,
  assignLabel,
  formatCategoryPath,
  noEvidenceNote,
  occurrenceLabel,
  stateClass,
  stateLabels,
  stateSign,
} from './labels'

interface ProductCategoryRowsProps {
  rows: ProductCategoryRow[]
  /** Whether this person may change what the catalogue says. The server checks again either way. */
  canDecide: boolean
  onAssign: (row: ProductCategoryRow) => void
}

/**
 * The catalogue's products, as a table on a wide screen and as cards on a narrow one.
 * <para>
 * Two columns are deliberately kept apart: what the catalogue now says a product's category is, and what the
 * Excel history said. They are different claims — the second is the evidence the first was or was not decided
 * from — and a screen that merged them would let a guess read as a record.
 * </para>
 */
export function ProductCategoryRows({ rows, canDecide, onAssign }: ProductCategoryRowsProps) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <caption className="sr-only">Məhsulların kanonik kateqoriyaları və Excel tarixçəsi</caption>
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">Məhsul</th>
              <th scope="col" className="px-3 py-3">Mövcud kateqoriya</th>
              <th scope="col" className="px-3 py-3">Excel tarixçəsində görünən kateqoriyalar</th>
              <th scope="col" className="px-3 py-3">Vəziyyət</th>
              <th scope="col" className="px-3 py-3"><span className="sr-only">Əməliyyat</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.productId} className={row.state === 'Ambiguous' ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                <th scope="row" className="px-4 py-2.5 text-left font-normal align-top">
                  <p className="font-medium text-slate-900">{row.productName}</p>
                  <p className="text-xs text-slate-500">{row.productCode}</p>
                </th>
                <td className="px-3 py-2.5 align-top"><Current row={row} /></td>
                <td className="px-3 py-2.5 align-top"><Evidence row={row} /></td>
                <td className="px-3 py-2.5 align-top"><StateBadge row={row} /></td>
                <td className="px-3 py-2.5 text-right align-top">
                  <Action row={row} canDecide={canDecide} onAssign={onAssign} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 lg:hidden">
        {rows.map((row) => (
          <li
            key={row.productId}
            className={`rounded-lg border p-3 ${row.state === 'Ambiguous' ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{row.productName}</p>
                <p className="text-xs text-slate-500">{row.productCode}</p>
              </div>
              <StateBadge row={row} />
            </div>

            <dl className="mt-2 space-y-2">
              <div>
                <dt className="text-xs text-slate-500">Mövcud kateqoriya</dt>
                <dd className="text-sm"><Current row={row} /></dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Excel tarixçəsində görünən kateqoriyalar</dt>
                <dd className="text-sm"><Evidence row={row} /></dd>
              </div>
            </dl>

            <div className="mt-3 border-t border-slate-100 pt-2">
              <Action row={row} canDecide={canDecide} onAssign={onAssign} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function Current({ row }: { row: ProductCategoryRow }) {
  return row.currentCategoryPath.length > 0
    ? <span className="text-slate-900">{formatCategoryPath(row.currentCategoryPath)}</span>
    : <span className="text-slate-400">—</span>
}

/**
 * What the workbooks said, with how often they said it. The counts are never presented as a ranking: where
 * there is more than one, the note says outright that the larger count does not decide.
 */
function Evidence({ row }: { row: ProductCategoryRow }) {
  if (row.evidence.length === 0) {
    return <span className="text-xs text-slate-500">{noEvidenceNote}</span>
  }

  return (
    <>
      <ul className="space-y-0.5">
        {row.evidence.map((entry) => (
          <li key={entry.categoryId} className="flex flex-wrap items-baseline gap-x-2 text-xs">
            <span className="text-slate-700">{formatCategoryPath(entry.path)}</span>
            <span className="text-slate-500">— {occurrenceLabel(entry.occurrences)}</span>
          </li>
        ))}
      </ul>
      {row.state === 'Ambiguous' && <p className="mt-1 text-xs text-amber-900">{ambiguousNote}</p>}
    </>
  )
}

function StateBadge({ row }: { row: ProductCategoryRow }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${stateClass[row.state]}`}
    >
      <span aria-hidden="true">{stateSign[row.state]}</span>
      {stateLabels[row.state]}
    </span>
  )
}

function Action({
  row,
  canDecide,
  onAssign,
}: {
  row: ProductCategoryRow
  canDecide: boolean
  onAssign: (row: ProductCategoryRow) => void
}) {
  if (!canDecide) {
    return <span className="text-xs text-slate-400">Yalnız oxumaq</span>
  }

  return (
    <button
      type="button"
      onClick={() => onAssign(row)}
      aria-label={`${row.productName} üçün kateqoriya seç`}
      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      {row.state === 'Assigned' ? 'Kateqoriyanı dəyiş' : assignLabel}
    </button>
  )
}
