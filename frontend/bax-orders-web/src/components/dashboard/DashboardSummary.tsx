import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { DashboardPartitionMember, ManagementDashboardSummary } from '../../api/dashboard'
import { locationLink, type BasisSelection } from '../../analytics/basisParams'
import { costDirectionSentence } from '../../terminology/terms'
import { InfoHint } from '../analytics/InfoHint'
import {
  basisHints,
  costDirectionToneClass,
  describeBasisCaption,
  describeBasisWithRange,
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatPercent,
  historyHint,
  knownAmountHint,
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
  type PortfolioGroup,
  type PortfolioGroupView,
} from '../../coverage/labels'
import { monthAmountHeading, ordersThisMonthLabel } from './labels'

/**
 * The company's month in about three seconds, read top to bottom in the order a decision needs it: how much,
 * which way it moved, over which objects, and how much of the company that covers.
 *
 * Everything below the first number is deliberately quieter than it. The earlier version gave the amount, the
 * baseline and the difference three cards of equal weight, which made the reader do the ranking themselves.
 *
 * The rule this screen exists to respect: the difference is over a cohort, and the cohort is named. The
 * month's own total and the compared total are different figures whenever an object ordered with nothing to
 * be set against, and then the difference is written beside the amount it is the difference of — as the
 * subtraction it is — rather than under a total it cannot be subtracted from.
 *
 * It is one of three parts the page places separately (the objects left out, and the chips, are the others),
 * so the attention cards can sit directly under it on the first screen.
 */
export function DashboardHeadline({ summary, onShowMissingPrices }: {
  summary: ManagementDashboardSummary
  /** Opens the table on the objects with a missing price — the same filter as the "Qiymət yoxdur" chip. */
  onShowMissingPrices: () => void
}) {
  // The rule and the months it landed on. "Son 3 ayın ortalaması" is a rule; which three months it covers
  // is the thing a reader needs, because some of them may be months an object never ordered in.
  const basisText = describeBasisWithRange(summary.basis, summary.baselinePeriods)
  const direction = costDirectionSentence(
    describeBasisCaption(summary.basis, summary.baselinePeriods), summary.knownAmountDelta)

  const partition = summary.partition

  // Money the comparison could not take in: an object that ordered with no month of the window behind it, or
  // whose first order ever is this one. Then the month's total is not the amount the difference is of.
  const leftOut = partition.noBaseline.length > 0
    || partition.noHistory.some((member) => member.currentKnownAmount !== null)

  // Three quarters of the row for the amount: at 1366 px the subtraction below it keeps to one line.
  return (
    <div className="mb-3 grid gap-3 lg:grid-cols-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-3">
        {/*
          1. The month, whole, named by its own month so nobody has to look up which month this is — and, on the
          same line, the one thing that makes it less than whole: a price somebody owes.
        */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h2 className="flex items-center gap-1 text-xs text-slate-500">
            {monthAmountHeading(summary.selectedPeriod)}
            <InfoHint label="Məbləğ necə hesablanır?">{knownAmountHint}</InfoHint>
          </h2>

          {summary.locationsWithMissingPrices > 0 && (
            <button
              type="button"
              onClick={onShowMissingPrices}
              className="text-left text-xs text-amber-800 underline decoration-amber-300 underline-offset-2 hover:decoration-amber-700"
            >
              {missingPriceLocationsNote(summary.locationsWithMissingPrices)}
            </button>
          )}
        </div>
        <p className="mt-1 whitespace-nowrap text-3xl font-semibold text-slate-900">
          {formatMoney(summary.current.knownAmount)}
        </p>

        {leftOut ? (
          <Subtraction summary={summary} basisText={basisText} direction={direction} />
        ) : (
          <>
            {/* 2. Which way it moved, and against what. Colour carries direction only, never a verdict. */}
            <p className={`mt-1 whitespace-nowrap text-base font-semibold ${costDirectionToneClass(summary.knownAmountDelta)}`}>
              {formatMoneyDelta(summary.knownAmountDelta)}
              <span className="text-slate-400"> · </span>
              {formatPercent(summary.knownAmountPercentChange)}
            </p>
            {direction && <p className="mt-0.5 text-xs text-slate-600">{direction}</p>}

            {/* 3. What that difference was computed from: here the month's total is the compared amount. */}
            <p className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
              <span>
                {basisText}: <span className="font-medium text-slate-700">{formatMoney(summary.baseline.knownAmount)}</span>
              </span>
              <InfoHint label="Müqayisə bazası nədir?">{basisHints[summary.basis]}</InfoHint>
            </p>
          </>
        )}
      </section>

      {/*
        How much of the company the number above covers. A count, with no reason attached to it.

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
  )
}

/**
 * "Müqayisə olunan 23 obyekt: 71.030,25 ₼ − Keçən ay (Avqust 2026): 44.340,78 ₼ = +26.689,47 ₼ · +60,19%"
 *
 * Shown when an object is outside the comparison. The difference used to sit under the month's total, and a
 * reader who subtracted the baseline from that total got a different number. Written as the subtraction it is,
 * every figure is one the reader can check against the others; all three come from the backend as they are.
 */
function Subtraction({ summary, basisText, direction }: {
  summary: ManagementDashboardSummary
  basisText: string
  direction: string | null
}) {
  const partition = summary.partition

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      {/* One sentence with real spaces, so it reads — and copies — as the subtraction it shows. */}
      <p className="text-xs text-slate-500">
        <span className="font-medium text-slate-700">
          {comparedAmountLine(partition.compared.length, summary.comparedCurrent.knownAmount)}
        </span>
        {' − '}
        <span>
          {basisText}: <span className="font-medium text-slate-700">{formatMoney(summary.baseline.knownAmount)}</span>
        </span>
        {' = '}
        <span className={`whitespace-nowrap text-sm font-semibold ${costDirectionToneClass(summary.knownAmountDelta)}`}>
          {formatMoneyDelta(summary.knownAmountDelta)}
          <span className="text-slate-400"> · </span>
          {formatPercent(summary.knownAmountPercentChange)}
        </span>{' '}
        <InfoHint label="Müqayisə bazası nədir?">{basisHints[summary.basis]}</InfoHint>
      </p>
      {direction && <p className="mt-0.5 text-xs text-slate-600">{direction}</p>}

      {/* And who was left out of it, by name — a fact about the window, not about the object. */}
      {partition.noBaseline.length > 0 && (
        <p className="mt-1 text-xs text-slate-500">
          {excludedFromComparisonLine(partition.noBaseline, summary.basis)}
        </p>
      )}
    </div>
  )
}

/** One chip, and the filter behind it. Exactly one can be active. */
export type CoverageChip =
  | { kind: 'group'; group: PortfolioGroup }
  | { kind: 'partialHistory' }
  | { kind: 'missingPrice' }

function sameChip(left: CoverageChip | null, right: CoverageChip): boolean {
  return left !== null && left.kind === right.kind
    && (left.kind !== 'group' || (right.kind === 'group' && left.group === right.group))
}

/**
 * What the dashboard can and cannot speak about, as counts that add up to every object of the month — and each
 * one a button that opens exactly the objects it counts.
 *
 * The groups before the total are mutually exclusive, they include the objects that have never ordered, and
 * the line ends by saying what they come to — the same number the table has rows for. The two after the
 * divider are quality flags: they describe objects already counted above, and they say what they count so
 * nobody adds them in. A chip with nobody in it is not shown; the total still counts the empty groups.
 *
 * Only the price chip is amber: amber means a price somebody owes is missing, and a group is a situation, not
 * something anybody owes.
 */
export function DashboardCoverageChips({ summary, active, onSelect }: {
  summary: ManagementDashboardSummary
  active: CoverageChip | null
  /** Called with the chip that was clicked; the page applies its filter, or clears it if it was active. */
  onSelect: (chip: CoverageChip) => void
}) {
  const groups = portfolioGroups(summary.partition).filter((group) => group.count > 0)

  return (
    <section className="mb-3" aria-label={coverageHeading}>
      <h3 className="flex items-center gap-1 text-xs font-medium text-slate-500">
        {coverageHeading}
        <InfoHint label="Tarixçə nə deməkdir?">{historyHint}</InfoHint>
      </h3>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        {groups.map((group) => (
          <GroupChip
            key={group.group}
            group={group}
            active={sameChip(active, { kind: 'group', group: group.group })}
            onSelect={() => onSelect({ kind: 'group', group: group.group })}
          />
        ))}

        <span className="text-slate-500">{coverageTotalNote(summary.partition.locationCount)}</span>

        {/*
          Quality flags, after a divider and deliberately not part of the arithmetic to their left: these
          describe objects that are already counted in one of the groups above.
        */}
        {(summary.locationsWithPartialHistory > 0 || summary.locationsWithMissingPrices > 0) && (
          <span className="h-5 border-l border-slate-200" aria-hidden="true" />
        )}

        {summary.locationsWithPartialHistory > 0 && (
          <ChipButton
            active={sameChip(active, { kind: 'partialHistory' })}
            onClick={() => onSelect({ kind: 'partialHistory' })}
          >
            <span className="text-slate-600">{partialHistoryChipLabel}</span>
            <span className="font-medium text-slate-900">{formatCount(summary.locationsWithPartialHistory)}</span>
          </ChipButton>
        )}

        {summary.locationsWithMissingPrices > 0 && (
          <ChipButton
            tone="amber"
            active={sameChip(active, { kind: 'missingPrice' })}
            onClick={() => onSelect({ kind: 'missingPrice' })}
          >
            <span className="font-medium text-amber-900">{missingPriceChipLabel(summary.locationsWithMissingPrices)}</span>
          </ChipButton>
        )}
      </div>
    </section>
  )
}

function GroupChip({ group, active, onSelect }: { group: PortfolioGroupView; active: boolean; onSelect: () => void }) {
  return (
    <span className="inline-flex items-center">
      <ChipButton active={active} onClick={onSelect}>
        <span className="text-slate-600">{group.chipLabel}</span>
        <span className="font-medium text-slate-900">{formatCount(group.count)}</span>
      </ChipButton>
      <InfoHint label={`${group.label} nə deməkdir?`}>{group.hint}</InfoHint>
    </span>
  )
}

/** A chip is a button, and a pressed one says so — to the eye with a darker ring, and to a screen reader. */
function ChipButton({ active, onClick, tone = 'slate', children }: {
  active: boolean
  onClick: () => void
  tone?: 'slate' | 'amber'
  children: ReactNode
}) {
  const colours = tone === 'amber'
    ? active ? 'bg-amber-100 ring-2 ring-amber-600' : 'bg-amber-50 ring-1 ring-amber-200 hover:bg-amber-100'
    : active ? 'bg-slate-200 ring-2 ring-slate-600' : 'bg-white ring-1 ring-slate-200 hover:bg-slate-50'

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 ring-inset ${colours}`}
    >
      {children}
    </button>
  )
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
export function DashboardExceptions({ summary, selection }: {
  summary: ManagementDashboardSummary
  /** Carried into every object link, so a name here opens the comparison the reader is looking at. */
  selection: BasisSelection
}) {
  // Every group but the compared one, each under its own heading — an object that has never ordered included.
  const groups = portfolioGroups(summary.partition)
    .filter((group) => group.group !== 'Compared' && group.count > 0)

  if (groups.length === 0) {
    return null
  }

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-3">
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
