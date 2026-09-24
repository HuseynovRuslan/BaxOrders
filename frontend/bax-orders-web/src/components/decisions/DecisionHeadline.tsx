import type { DecisionComparison, OrderDecisionContext } from '../../api/decisions'
import type { BasisSelection } from '../../analytics/basisParams'
import { BasisPicker } from '../analytics/BasisPicker'
import { InfoHint } from '../analytics/InfoHint'
import {
  basisHints,
  costDirectionToneClass,
  describeBasis,
  describeBasisWithRange,
  formatMoney,
  formatMoneyDelta,
  formatMonth,
  formatPercent,
  unknownValue,
} from '../analytics/format'
import {
  internalSupplyCount,
  internalToneClass,
  missingPriceCount,
  warningToneClass,
} from '../../pricing/labels'
import { limitedComparisonDataLabel } from '../../terminology/terms'
import { averagingHint, emptyWindowNote, coverageHint } from './labels'

interface DecisionHeadlineProps {
  context: OrderDecisionContext
  selection: BasisSelection
  onSelect: (selection: BasisSelection) => void
  /** Months this object could be compared against, oldest first — for the hand-picked range. */
  priorMonths: string[]
}

/**
 * The first thing on a decision screen: what this order costs, and how that compares with whatever the reader
 * chose to compare it against.
 *
 * The basis is the reader's, not the page's. A manager who picked "Son 3 ayın ortalaması" on the dashboard and
 * followed a card here sees the three-month figure in the headline and the three-month reason under it — the
 * page used to answer about last month instead, which gave them two numbers for one question. The other bases
 * stay on screen underneath, small, so the context is never lost by choosing.
 */
export function DecisionHeadline({ context, selection, onSelect, priorMonths }: DecisionHeadlineProps) {
  const { current, primary } = context

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
      aria-label="Sifarişin məbləği və müqayisəsi"
    >
      <p className="text-xs text-slate-500">{formatMonth(context.requestPeriod)} · Məbləğ</p>
      <p className="mt-1 whitespace-nowrap text-3xl font-semibold text-slate-900 sm:text-4xl">
        {formatMoney(current.knownAmount)}
      </p>

      {/*
        Only what the lines say about the money. The line count used to lead this line, which made it read
        "40 sətir · 2 sətirdə qiymət yoxdur" — "sətir" twice for two different things.
      */}
      {(current.missingPriceItemCount > 0 || current.priceNotRequiredItemCount > 0) && (
        <p className="mt-1 text-xs text-slate-500">
          {/* Only prices somebody owes are a shortfall. */}
          {current.missingPriceItemCount > 0 && (
            <span className={warningToneClass}>{missingPriceCount(current.missingPriceItemCount)}</span>
          )}
          {current.missingPriceItemCount > 0 && current.priceNotRequiredItemCount > 0 && ' · '}
          {/* Material from our own store has no purchase price and never had one: context, not a problem,
              and never amber. */}
          {current.priceNotRequiredItemCount > 0 && (
            <span className={internalToneClass}>{internalSupplyCount(current.priceNotRequiredItemCount)}</span>
          )}
        </p>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3">
        <BasisPicker
          selection={selection}
          onSelect={onSelect}
          months={priorMonths}
          currentPeriod={context.requestPeriod}
        />

        <div className="mt-3">
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
            <span>Müqayisə: {describeBasisWithRange(primary.basis, primary.windowPeriods)}</span>
            <InfoHint label="Müqayisə bazası nədir?">{`${basisHints[primary.basis]} ${averagingHint}`}</InfoHint>
          </p>

          {primary.available ? (
            <>
              {/*
                Each figure says what it is. A bare amount beside a large coloured one left the reader to work out
                which was the basis; the difference is coloured by the direction of the cost (9.1).
              */}
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="text-xs text-slate-500">Baza</span>
                  <span className="text-sm text-slate-700">{formatMoney(primary.baselineKnownAmount)}</span>
                </p>
                <p className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="text-xs text-slate-500">Fərq</span>
                  <span className={`text-lg font-semibold ${costDirectionToneClass(primary.deltaAmount)}`}>
                    {formatMoneyDelta(primary.deltaAmount)}
                  </span>
                  <span className={`text-sm ${costDirectionToneClass(primary.deltaAmount)}`}>
                    {formatPercent(primary.deltaPercent)}
                  </span>
                </p>
              </div>
              <Coverage comparison={primary} />
            </>
          ) : (
            // Nothing in the window. Never a silent comparison against zero and never a quiet fall back to
            // another basis: the products of this month are not new, they are simply uncompared.
            <p className="mt-1 text-sm text-slate-600">{emptyWindowNote}</p>
          )}
        </div>

        {context.secondary.length > 0 && (
          <dl
            aria-label="Digər müqayisə bazaları"
            className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-2 text-xs"
          >
            {context.secondary.map((comparison) => (
              <Secondary key={comparison.basis} comparison={comparison} onSelect={onSelect} />
            ))}
          </dl>
        )}
      </div>
    </section>
  )
}

/** "(2/3 ay)" — what the average actually rests on, said where the average is. */
function Coverage({ comparison }: { comparison: DecisionComparison }) {
  if (comparison.availablePeriodCount >= comparison.expectedPeriodCount) {
    return null
  }

  return (
    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
      <span>
        ({comparison.availablePeriodCount}/{comparison.expectedPeriodCount} ay)
      </span>
      <InfoHint label={`${limitedComparisonDataLabel} — bu nə deməkdir?`}>{coverageHint}</InfoHint>
    </p>
  )
}

/**
 * Another basis, kept deliberately small: it is context for the comparison above, never a second verdict.
 * Clicking it makes it the comparison, which is the whole point of having it in view.
 */
function Secondary({
  comparison,
  onSelect,
}: {
  comparison: DecisionComparison
  onSelect: (selection: BasisSelection) => void
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-slate-500">{describeBasis(comparison.basis, comparison.windowPeriods)}</dt>
      <dd className="whitespace-nowrap text-slate-700">
        {comparison.available ? (
          <button
            type="button"
            onClick={() => onSelect({ basis: comparison.basis, from: null, to: null })}
            className="rounded hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
          >
            {formatMoney(comparison.baselineKnownAmount)}
            <span className={`ml-1.5 ${costDirectionToneClass(comparison.deltaAmount)}`}>
              {formatMoneyDelta(comparison.deltaAmount)}
            </span>
            {comparison.availablePeriodCount < comparison.expectedPeriodCount && (
              <span className="ml-1 text-slate-400">
                ({comparison.availablePeriodCount}/{comparison.expectedPeriodCount} ay)
              </span>
            )}
          </button>
        ) : (
          <span className="text-slate-400">{unknownValue}</span>
        )}
      </dd>
    </div>
  )
}
