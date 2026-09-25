import { ChevronDown, ChevronRight } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import type { DecisionComparison, OrderDecisionContext } from '../../api/decisions'
import { orderLink, pricingReviewLink, type BasisSelection } from '../../analytics/basisParams'
import { BasisPicker } from '../analytics/BasisPicker'
import { InfoHint } from '../analytics/InfoHint'
import { WarningNote } from '../WarningNote'
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
  pricingReviewLinkLabel,
  warningToneClass,
} from '../../pricing/labels'
import { limitedComparisonDataLabel } from '../../terminology/terms'
import {
  averagingHint,
  bothSidesOwePricesNote,
  coverageHint,
  emptyWindowNote,
  openOrderLabel,
  partialCoverageLine,
  windowMonthsLabel,
  windowMonthWithoutOrder,
} from './labels'

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
 *
 * It also says what the window is made of, which the separate comparison page used to say and this page is now
 * the only place for (11.1): the months the object has no order for, by name; every month of the window with the
 * order behind it; and, when both sides owe prices, that neither amount is whole.
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
          {/* The lines behind the count, on Qiymət təsnifatı — read-only for a Rəhbər, who has it from here
              rather than from the menu (14.1). The basis travels along, so the way back keeps it. */}
          {current.missingPriceItemCount > 0 && (
            <>
              {' · '}
              <Link
                to={pricingReviewLink(context.orderRequestId, selection)}
                className="underline hover:text-slate-900"
              >
                {pricingReviewLinkLabel}
              </Link>
            </>
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
              {current.missingPriceItemCount > 0 && primary.baselineMissingPriceItemCount > 0 && (
                <div className="mt-2">
                  <WarningNote>{bothSidesOwePricesNote(primary.baselineMissingPriceItemCount)}</WarningNote>
                </div>
              )}
            </>
          ) : (
            // Nothing in the window. Never a silent comparison against zero and never a quiet fall back to
            // another basis: the products of this month are not new, they are simply uncompared.
            <p className="mt-1 text-sm text-slate-600">{emptyWindowNote}</p>
          )}

          <WindowMonths comparison={primary} selection={selection} />
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

/** "(2/3 ay · Çatışmayan: Aprel 2026)" — what the average actually rests on, said where the average is. */
function Coverage({ comparison }: { comparison: DecisionComparison }) {
  if (comparison.availablePeriodCount >= comparison.expectedPeriodCount) {
    return null
  }

  return (
    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
      <span>
        {partialCoverageLine(
          comparison.availablePeriodCount,
          comparison.expectedPeriodCount,
          comparison.missingPeriods,
        )}
      </span>
      <InfoHint label={`${limitedComparisonDataLabel} — bu nə deməkdir?`}>{coverageHint}</InfoHint>
    </p>
  )
}

/**
 * Every month of the chosen window, oldest first: the order behind each month that has one — opened with the
 * reader's basis — and the plain fact of each month that has none. Closed until asked for; it is evidence behind
 * the figures, not a figure.
 */
function WindowMonths({ comparison, selection }: { comparison: DecisionComparison; selection: BasisSelection }) {
  const [open, setOpen] = useState(false)

  if (comparison.windowPeriods.length === 0) {
    return null
  }

  const orders = new Map(comparison.periods.map((period) => [period.period.slice(0, 7), period.orderRequestId]))

  return (
    <div className="mt-2 text-xs text-slate-500">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-slate-50 hover:text-slate-900"
      >
        {open ? <ChevronDown className="size-3.5" aria-hidden="true" /> : <ChevronRight className="size-3.5" aria-hidden="true" />}
        {windowMonthsLabel}
      </button>

      {open && (
        <ul className="mt-1 space-y-1 border-t border-slate-100 pt-2 text-slate-700">
          {comparison.windowPeriods.map((period) => {
            const orderRequestId = orders.get(period.slice(0, 7))
            // A month with no order is a gap in the window, not a missing price: amber words, no warning icon.
            return orderRequestId === undefined ? (
              <li key={period} className="text-amber-900">{windowMonthWithoutOrder(period)}</li>
            ) : (
              <li key={period}>
                {formatMonth(period)}
                {' · '}
                <Link to={orderLink(orderRequestId, selection)} className="underline hover:text-slate-900">
                  {openOrderLabel}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/**
 * Another basis, kept deliberately small: it is context for the comparison above, never a second verdict.
 * Clicking it makes it the comparison, which is the whole point of having it in view.
 *
 * It looks like what it is (Task 20): an available basis sits in a button's box, and the whole line — its name as
 * well as its figure — is the button, through a layer the button draws over the box. A screen reader hears the
 * line as one name. A basis with nothing in its window has nothing to select, so it has no box.
 */
function Secondary({
  comparison,
  onSelect,
}: {
  comparison: DecisionComparison
  onSelect: (selection: BasisSelection) => void
}) {
  const termId = useId()
  const buttonId = useId()

  return (
    <div
      className={comparison.available
        ? 'relative flex cursor-pointer items-baseline gap-1.5 rounded-md border border-slate-200 px-2 py-0.5 hover:border-slate-300 hover:bg-slate-50'
        : 'flex items-baseline gap-1.5'}
    >
      <dt id={termId} className="text-slate-500">{describeBasis(comparison.basis, comparison.windowPeriods)}</dt>
      <dd className="whitespace-nowrap text-slate-700">
        {comparison.available ? (
          <button
            id={buttonId}
            type="button"
            aria-labelledby={`${termId} ${buttonId}`}
            onClick={() => onSelect({ basis: comparison.basis, from: null, to: null })}
            className="rounded hover:underline after:absolute after:inset-0 after:rounded-md focus-visible:outline-hidden focus-visible:after:outline-2 focus-visible:after:outline-offset-1 focus-visible:after:outline-slate-900"
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
