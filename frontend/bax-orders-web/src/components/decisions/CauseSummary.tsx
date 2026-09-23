import type { DecisionDecomposition } from '../../api/decisions'
import { formatCount, formatMoneyDelta } from '../analytics/format'
import { InfoHint } from '../analytics/InfoHint'
import { WarningNote } from '../WarningNote'
import { causeHints, causeLabels, causeToneClass, incompleteExplanationNote } from './labels'

/**
 * "Niyə dəyişib?" — the month's difference broken into the causes that add up to it.
 *
 * Every bar is a share of the same total, so their widths can be compared with each other directly. A cause
 * that moved nothing is left out rather than drawn as an empty row: six labelled zeros would be six things to
 * read past before reaching the one that matters.
 */
export function CauseSummary({ decomposition }: { decomposition: DecisionDecomposition }) {
  const moved = decomposition.categories.filter((category) => category.amount !== 0)
  const largest = Math.max(...moved.map((category) => Math.abs(category.amount)), 0)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4" aria-label="Dəyişikliyin səbəbləri">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Niyə dəyişib?</h2>
        <p className="whitespace-nowrap text-sm text-slate-700">
          Cəmi <span className="font-semibold">{formatMoneyDelta(decomposition.totalAmountImpact)}</span>
        </p>
      </div>

      {moved.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          Keçən aya görə məbləğ dəyişməyib.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {moved.map((category) => (
            <li key={category.category}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="flex items-center gap-1 text-sm text-slate-700">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${causeToneClass[category.category]}`}
                  >
                    {causeLabels[category.category]}
                  </span>
                  <InfoHint label={`${causeLabels[category.category]} nədir?`}>
                    {causeHints[category.category]}
                  </InfoHint>
                  <span className="text-xs text-slate-400">{formatCount(category.variantCount)} mövqe</span>
                </p>
                <p className="whitespace-nowrap text-sm font-medium text-slate-900">
                  {formatMoneyDelta(category.amount)}
                </p>
              </div>

              {/* Width is share of the largest cause, so the bars compare with one another and with nothing else. */}
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${barToneClass[category.category]}`}
                  style={{ width: `${largest === 0 ? 0 : (Math.abs(category.amount) / largest) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!decomposition.explanationIsComplete && (
        <div className="mt-3">
          <WarningNote>{incompleteExplanationNote}</WarningNote>
        </div>
      )}
    </section>
  )
}

/** The bar fills, matching the badge beside them. Direction is carried by the sign, never by the colour. */
const barToneClass: Record<string, string> = {
  NewOrders: 'bg-sky-400',
  QuantityChange: 'bg-indigo-400',
  PriceChange: 'bg-violet-400',
  NoLongerOrdered: 'bg-slate-400',
  Services: 'bg-slate-300',
  UnattributedDueToMissingPrice: 'bg-amber-400',
}
