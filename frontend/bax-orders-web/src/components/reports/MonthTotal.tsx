import type { MonthlyReportMonth } from '../../api/reports'
import { missingPriceCount } from '../../pricing/labels'
import { futureMonthNote } from '../../terminology/terms'
import { formatMoney, formatMonth, unknownValue } from '../analytics/format'
import { MissingPriceMark } from './MissingPriceMark'
import { futureMonthClass } from './reportGrid'

/**
 * The company's month under its column (owner decision 8.1): the amount and nothing about how it moved — no
 * percentage, no change, no direction colour, and at the weight of the months above it (DK-07). A total with an
 * unpriced line says so, as a cell does, so a partial figure is never presented as the whole month.
 */
export function MonthTotal({ month, future }: { month: MonthlyReportMonth; future: boolean }) {
  const name = formatMonth(month.period)

  if (month.locationsWithRequest === 0) {
    return future ? (
      <span
        className={`block min-h-7 rounded ${futureMonthClass}`}
        title={futureMonthNote(name)}
        aria-label={futureMonthNote(name)}
      />
    ) : (
      <span className="block text-body-sm leading-[18px] text-on-surface-variant" title={`${name}: sifariş yoxdur`}>
        {unknownValue}
      </span>
    )
  }

  return (
    <>
      <span className="block whitespace-nowrap font-metric-val text-body-sm leading-[18px] font-normal tabular text-on-surface">
        {formatMoney(month.knownAmount)}
      </span>
      {!month.amountIsComplete && (
        <span className="mt-0.5 block whitespace-nowrap text-body-sm leading-4" title={missingPriceCount(month.missingPriceItemCount)}>
          <MissingPriceMark count={month.missingPriceItemCount} />
          <span className="sr-only">{missingPriceCount(month.missingPriceItemCount)}</span>
        </span>
      )}
    </>
  )
}
