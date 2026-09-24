import { Link } from 'react-router'
import type { DashboardPartitionMember, ManagementDashboardSummary } from '../../api/dashboard'
import { locationLink, type BasisSelection } from '../../analytics/basisParams'
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
  comparedAmountLine,
  coverageHeading,
  coverageTotalNote,
  excludedFromComparisonLine,
  exceptionsHeading,
  memberNote,
  missingPriceChipLabel,
  missingPriceLocationsNote,
  ordersThisMonthCaption,
  ordersThisMonthDetails,
  ordersThisMonthLine,
  partialHistoryChipLabel,
  portfolioGroups,
  type PortfolioGroupView,
} from '../../coverage/labels'
import { monthAmountHeading, ordersThisMonthLabel } from './labels'

interface DashboardSummaryProps {
  summary: ManagementDashboardSummary
  /** Carried into every object link, so a name here opens the comparison the reader is looking at. */
  selection: BasisSelection
}

/**
 * The company's month in about three seconds, read top to bottom in the order a decision needs it: how much,
 * which way it moved, over which objects, how much of the company that covers, and only then anything wrong
 * with the records.
 *
 * Everything below the first number is deliberately quieter than it. The earlier version gave the amount, the
 * baseline and the difference three cards of equal weight, which made the reader do the ranking themselves.
 *
 * The rule this screen exists to respect: the difference is over a cohort, and the cohort is named. The
 * month's own total and the compared total are different figures whenever an object ordered with nothing to
 * be set against, and showing only one of them would let a reader take a difference between two sets of
 * objects for a change in what the company spent.
 */
export function DashboardSummary({ summary, selection }: DashboardSummaryProps) {
  // The rule and the months it landed on. "Son 3 ayın ortalaması" is a rule; which three months it covers
  // is the thing a reader needs, because some of them may be months an object never ordered in.
  const basisText = describeBasisWithRange(summary.basis, summary.baselinePeriods)
  const direction = describeDirection(summary.basis, summary.baselinePeriods, summary.knownAmountDelta)

  const partition = summary.partition
  const compared = partition.compared.length

  // Shown only when the month holds money the comparison could not take in — that is, only when an object
  // ordered this month with no baseline behind it.
  const partiallyCompared = partition.noBaseline.length > 0

  return (
    <div className="mb-5 space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          {/* 1. The month, whole, named by its own month so nobody has to look up which month this is. */}
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

          {/*
            3. What that difference was computed from. When every object that ordered could be compared, the
            baseline alone says it. When one could not, the compared amount is named first, so the subtraction
            in front of the reader is one they can actually do.
          */}
          <p className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
            <span>
              {partiallyCompared && (
                <>
                  <span className="font-medium text-slate-700">
                    {comparedAmountLine(compared, summary.comparedCurrent.knownAmount)}
                  </span>
                  <span className="text-slate-400"> · </span>
                </>
              )}
              {basisText}: <span className="font-medium text-slate-700">{formatMoney(summary.baseline.knownAmount)}</span>
            </span>
            <InfoHint label="Müqayisə bazası nədir?">{basisHints[summary.basis]}</InfoHint>
          </p>

          {/* 4. And who was left out of it, by name — a fact about the window, not about the object. */}
          {partiallyCompared && (
            <p className="mt-1 text-xs text-slate-500">
              {excludedFromComparisonLine(partition.noBaseline, summary.basis)}
            </p>
          )}

          {/* 5. One short line, and only when a price somebody owes is actually missing. */}
          {summary.locationsWithMissingPrices > 0 && (
            <p className="mt-2 text-xs text-amber-800">
              {missingPriceLocationsNote(summary.locationsWithMissingPrices)}
            </p>
          )}
        </section>

        {/*
          6. How much of the company the number above covers. A count, with no reason attached to it.

          Out of every object of the month — the same number the chips, the table, the monthly report and the
          Obyektlər page count — and the rest of the sentence says where the others are: some did not order
          this month, and some have never ordered at all. Nothing is left for the reader to reconcile.
        */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-xs text-slate-500">{ordersThisMonthLabel}</h2>
          <p className="mt-1 whitespace-nowrap text-3xl font-semibold text-slate-900" aria-hidden="true">
            {formatCount(summary.locationsWithCurrentRequest)}
            <span className="text-xl font-normal text-slate-400"> / {formatCount(partition.locationCount)}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500" aria-hidden="true">
            {[ordersThisMonthCaption, ...ordersThisMonthDetails(partition.noOrderThisMonth.length, partition.noHistory.length)]
              .join(' · ')}
          </p>
          <p className="sr-only">
            {ordersThisMonthLine(
              summary.locationsWithCurrentRequest,
              partition.locationCount,
              partition.noOrderThisMonth.length,
              partition.noHistory.length,
            )}
          </p>
        </section>
      </div>

      {/* On a phone these come straight after the headline, which is where the grid above leaves them. */}
      <Exceptions summary={summary} selection={selection} />
      <DataCoverage summary={summary} />
    </div>
  )
}

/**
 * What the dashboard can and cannot speak about, as counts that add up to every object of the month.
 *
 * The chips used to be five overlapping facts — an object could be in three of them — so nothing could be
 * checked against anything. The groups before the total are mutually exclusive, they include the objects that
 * have never ordered, and the line ends by saying what they come to — the same number the table has rows for.
 * The two after the divider are quality flags: they describe objects already counted above, and they say what
 * they count so nobody adds them in.
 */
function DataCoverage({ summary }: { summary: ManagementDashboardSummary }) {
  const groups = portfolioGroups(summary.partition).filter(
    (group) => group.group === 'Compared' || group.count > 0)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <h2 className="flex items-center gap-1 text-xs font-medium text-slate-500">
        {coverageHeading}
        <InfoHint label="Tarixçə nə deməkdir?">{historyHint}</InfoHint>
      </h2>

      <dl className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm">
        {groups.map((group) => (
          <div key={group.group} className={chipClass(group)}>
            <dt className={`flex items-center gap-1 ${toneOf(group)}`}>
              {group.chipLabel}
              <InfoHint label={`${group.label} nə deməkdir?`}>{group.hint}</InfoHint>
            </dt>
            <dd className={`font-medium ${isPlain(group) ? 'text-slate-900' : 'text-amber-900'}`}>
              {formatCount(group.count)}
            </dd>
          </div>
        ))}

        <div className="flex items-baseline gap-1.5 text-slate-500">
          <dt className="sr-only">Cəmi</dt>
          <dd>{coverageTotalNote(summary.partition.locationCount)}</dd>
        </div>

        {/*
          Quality flags, after a divider and deliberately not part of the arithmetic to their left: these
          describe objects that are already counted in one of the groups above.
        */}
        {summary.locationsWithPartialHistory > 0 && (
          <div className="flex items-baseline gap-1.5 border-l border-slate-200 pl-4">
            <dt className="text-slate-500">{partialHistoryChipLabel}</dt>
            <dd className="font-medium text-slate-900">{formatCount(summary.locationsWithPartialHistory)}</dd>
          </div>
        )}

        {summary.locationsWithMissingPrices > 0 && (
          <div className="flex items-baseline gap-1.5 rounded-md bg-amber-50 px-2 py-1 ring-1 ring-inset ring-amber-200">
            <dt className="font-medium text-amber-900">
              {missingPriceChipLabel(summary.locationsWithMissingPrices)}
            </dt>
          </div>
        )}
      </dl>
    </section>
  )
}

/** A group nobody has to act on is written plainly; only the ones somebody may act on are amber. */
function isPlain(group: PortfolioGroupView): boolean {
  return group.group === 'Compared' || group.count === 0
}

function toneOf(group: PortfolioGroupView): string {
  return isPlain(group) ? 'text-slate-500' : 'font-medium text-amber-900'
}

function chipClass(group: PortfolioGroupView): string {
  return isPlain(group)
    ? 'flex items-baseline gap-1.5'
    : 'flex items-baseline gap-1.5 rounded-md bg-amber-50 px-2 py-1 ring-1 ring-inset ring-amber-200'
}

/**
 * The objects the headline left out, by name.
 *
 * A count says how many were left out; a name says which, and the next question — "when did that one last
 * order, and for how much?" — is answered in the same line rather than three clicks away. Every name opens
 * the object, carrying the comparison the reader is currently looking at.
 *
 * Nothing here says why an object has no order. The system does not know, and a screen that guessed would be
 * read as if it did.
 */
function Exceptions({ summary, selection }: DashboardSummaryProps) {
  // Every group but the compared one, each under its own heading — an object that has never ordered included.
  const groups = portfolioGroups(summary.partition)
    .filter((group) => group.group !== 'Compared' && group.count > 0)

  if (groups.length === 0) {
    return null
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <h2 className="text-xs font-medium text-slate-500">{exceptionsHeading}</h2>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.group}>
            <h3 className="flex items-center gap-1 text-xs font-medium text-slate-700">
              {group.label} ({formatCount(group.count)})
              <InfoHint label={`${group.label} nə deməkdir?`}>{group.hint}</InfoHint>
            </h3>
            <ul className="mt-1 space-y-1">
              {group.members.map((member) => (
                <li key={member.locationId} className="text-xs">
                  <Link
                    to={locationLink(member.locationId, selection)}
                    className="text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
                  >
                    {member.locationName}
                  </Link>
                  <Note group={group} member={member} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function Note({ group, member }: { group: PortfolioGroupView; member: DashboardPartitionMember }) {
  const note = memberNote(group.group, member)
  return note === null ? null : <span className="text-slate-500"> — {note}</span>
}
