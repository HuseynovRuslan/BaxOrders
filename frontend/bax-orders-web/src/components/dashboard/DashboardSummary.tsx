import type { ManagementDashboardSummary } from '../../api/dashboard'
import { InfoHint } from '../analytics/InfoHint'
import {
  basisHints,
  describeBasisWithRange,
  describeDirection,
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatPercent,
  historyHint,
  knownAmountHint,
  signedToneClass,
} from '../analytics/format'
import {
  coverageExceptionLabels,
  coverageNormalLabel,
  incompletePriceDataNote,
  locationsWithoutRequestNote,
  monthAmountHeading,
  ordersThisMonthLabel,
} from './labels'

interface DashboardSummaryProps {
  summary: ManagementDashboardSummary
}

/**
 * The company's month in about three seconds, read top to bottom in the order a decision needs it: how much,
 * which way it moved, how much of the company that covers, and only then anything wrong with the records.
 *
 * Everything below the first number is deliberately quieter than it. The earlier version gave the amount, the
 * baseline and the difference three cards of equal weight, which made the reader do the ranking themselves.
 */
export function DashboardSummary({ summary }: DashboardSummaryProps) {
  // The rule and the months it landed on. "Son 3 ayın ortalaması" is a rule; which three months it covers
  // is the thing a reader needs, because some of them may be months an object never ordered in.
  const basisText = describeBasisWithRange(summary.basis, summary.baselinePeriods)
  const direction = describeDirection(summary.basis, summary.baselinePeriods, summary.knownAmountDelta)

  // Only a price somebody owes is a gap. Material the company supplies itself is complete as it stands and
  // never reaches this line — the backend counts the two apart, and so does the wording.
  const incompleteLocations = summary.locationsWithMissingPrices

  return (
    <div className="mb-5 space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          {/* 1. The amount, named by its own month so nobody has to look up which month this is. */}
          <h2 className="flex items-center gap-1 text-xs text-slate-500">
            {monthAmountHeading(summary.selectedPeriod)}
            <InfoHint label="Məbləğ necə hesablanır?">{knownAmountHint}</InfoHint>
          </h2>
          <p className="mt-1 whitespace-nowrap text-3xl font-semibold text-slate-900">
            {formatMoney(summary.current.knownAmount)}
          </p>

          {/* 2. Which way it moved, and against what. Colour carries direction only, never a verdict. */}
          <p className={`mt-1 whitespace-nowrap text-base font-semibold ${signedToneClass(summary.knownAmountDelta)}`}>
            {formatMoneyDelta(summary.knownAmountDelta)}
            <span className="text-slate-400"> · </span>
            {formatPercent(summary.knownAmountPercentChange)}
          </p>
          {direction && <p className="mt-0.5 text-sm text-slate-600">{direction}</p>}

          <p className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
            <span>
              Müqayisə bazası: <span className="font-medium text-slate-700">{formatMoney(summary.baseline.knownAmount)}</span>
              <span className="text-slate-400"> · </span>
              {basisText}
            </span>
            <InfoHint label="Müqayisə bazası nədir?">{basisHints[summary.basis]}</InfoHint>
          </p>

          {/* 4. One short line, and only when a price somebody owes is actually missing. */}
          {incompleteLocations > 0 && (
            <p className="mt-2 text-xs text-amber-800">{incompletePriceDataNote(incompleteLocations)}</p>
          )}
        </section>

        {/* 3. How much of the company the number above covers. A count, with no reason attached to it. */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-xs text-slate-500">{ordersThisMonthLabel}</h2>
          <p className="mt-1 whitespace-nowrap text-3xl font-semibold text-slate-900">
            {formatCount(summary.locationsWithCurrentRequest)}
            <span className="text-xl font-normal text-slate-400"> / {formatCount(summary.locationCount)}</span>
          </p>
          {summary.locationsWithoutCurrentRequest > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {locationsWithoutRequestNote(summary.locationsWithoutCurrentRequest)}
            </p>
          )}
        </section>
      </div>

      <DataCoverage summary={summary} />
    </div>
  )
}

/**
 * What the dashboard can and cannot speak about. Counts of facts, not a grade: there is no data-quality score
 * here, because a score would hide which objects are actually affected.
 *
 * The ordinary case is written plainly and the exceptions are chipped, so a healthy month is one quiet line.
 * Boxing all five equally taught the reader to skip the row, which is how the real ones got skipped too.
 */
function DataCoverage({ summary }: { summary: ManagementDashboardSummary }) {
  const exceptions: { label: string; value: number }[] = [
    { label: coverageExceptionLabels.noHistory, value: summary.locationsWithNoBaselineHistory },
    { label: coverageExceptionLabels.partialHistory, value: summary.locationsWithPartialHistory },
    { label: coverageExceptionLabels.missingPrice, value: summary.locationsWithMissingPrices },
    { label: coverageExceptionLabels.noRequest, value: summary.locationsWithoutCurrentRequest },
  ].filter((item) => item.value > 0)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <h2 className="flex items-center gap-1 text-xs font-medium text-slate-500">
        Məlumatın əhatəsi
        <InfoHint label="Tarixçə nə deməkdir?">{historyHint}</InfoHint>
      </h2>

      <dl className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm">
        <div className="flex items-baseline gap-1.5">
          <dt className="text-slate-500">{coverageNormalLabel}</dt>
          <dd className="font-medium text-slate-900">{formatCount(summary.locationsWithCompleteHistory)}</dd>
        </div>

        {exceptions.map((item) => (
          <div
            key={item.label}
            className="flex items-baseline gap-1.5 rounded-md bg-amber-50 px-2 py-1 ring-1 ring-inset ring-amber-200"
          >
            <dt className="font-medium text-amber-900">{item.label}</dt>
            <dd className="font-medium text-amber-900">{formatCount(item.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
