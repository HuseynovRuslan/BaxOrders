import type { DecisionWindow, OrderDecisionContext } from '../../api/decisions'
import { basisLabels, formatCount, formatMoney, formatMoneyDelta, formatMonth, formatPercent, unknownValue } from '../analytics/format'
import { internalSupplyLabel } from '../analytics/labels'
import { noPreviousMonthNote } from './labels'

/**
 * The first thing on a decision screen: what this order costs, and how that compares with the month before it.
 *
 * Everything else on the page qualifies this block. The amount is the only thing set large; the comparison
 * sits directly under it because "is this normal?" is the question a decision actually turns on, and the
 * longer windows sit quietly beside it as context rather than competing for the same attention.
 */
export function DecisionHeadline({ context }: { context: OrderDecisionContext }) {
  const { current, previousMonth } = context

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
      aria-label="Sifarişin məbləği və müqayisəsi"
    >
      <p className="text-xs text-slate-500">{formatMonth(context.requestPeriod)} · Məbləğ</p>
      <p className="mt-1 whitespace-nowrap text-3xl font-semibold text-slate-900 sm:text-4xl">
        {formatMoney(current.knownAmount)}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {formatCount(current.itemCount)} sətir
        {/* Only prices somebody owes are a shortfall. */}
        {current.missingPriceItemCount > 0 && (
          <span className="text-amber-800">
            {' · '}
            {formatCount(current.missingPriceItemCount)} məhsulun qiyməti yoxdur
          </span>
        )}
        {/* Material from our own store has no purchase price and never had one: context, not a problem. */}
        {current.priceNotRequiredItemCount > 0 && (
          <span>
            {' · '}
            {internalSupplyLabel}: {formatCount(current.priceNotRequiredItemCount)} sətir
          </span>
        )}
      </p>

      <div className="mt-4 border-t border-slate-100 pt-3">
        {previousMonth.available ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-sm text-slate-500">{formatMonth(previousMonth.period)}</p>
            <p className="whitespace-nowrap text-sm text-slate-700">{formatMoney(previousMonth.amount?.knownAmount)}</p>
            <p className="whitespace-nowrap text-lg font-semibold text-slate-900">
              {formatMoneyDelta(previousMonth.deltaAmount)}
            </p>
            <p className="whitespace-nowrap text-sm text-slate-500">{formatPercent(previousMonth.deltaPercent)}</p>
          </div>
        ) : (
          // Nothing to compare with. The products of this month are not new — they are simply uncompared, and
          // saying so is the only honest thing the screen can do here.
          <p className="text-sm text-slate-600">{noPreviousMonthNote}</p>
        )}

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <Window window={context.threeMonth} />
          <Window window={context.sixMonth} />
        </dl>
      </div>
    </section>
  )
}

/**
 * A longer run of months, kept deliberately small: it is context for the comparison above, never a second
 * verdict. What it rests on is written next to it, because an average of two months out of six is not the
 * same claim as an average of six.
 */
function Window({ window }: { window: DecisionWindow }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-slate-500">{basisLabels[window.basis]}</dt>
      <dd className="whitespace-nowrap text-slate-700">
        {window.availablePeriodCount === 0 ? (
          <span className="text-slate-400">{unknownValue}</span>
        ) : (
          <>
            {formatMoney(window.averageKnownAmount)}
            <span className="ml-1.5 text-slate-500">{formatMoneyDelta(window.deltaAmount)}</span>
            <span className="ml-1 text-slate-400">
              ({window.availablePeriodCount}/{window.expectedPeriodCount} ay)
            </span>
          </>
        )}
      </dd>
    </div>
  )
}
