import { Link } from 'react-router'
import type { AnalyticsScope, DashboardPartitionMember, ManagementDashboardSummary } from '../../../api/dashboard'
import { locationLink, type BasisSelection } from '../../../analytics/basisParams'
import { currentOnlyNote, lastOrderNote, portfolioGroupLabels } from '../../../coverage/labels'
import { monthlyOrdersLabel, outsideMonthlyOrdersLabel, unclassifiedLineTypeShortLabel } from '../../../orderLines/lineType'
import { limitedComparisonDataLabel } from '../../../terminology/terms'
import { describeBasisCaption, formatCount, formatMoney, formatMonthRange } from '../../analytics/format'
import { EmptyState } from '../../EmptyState'
import { OutsideMonthlyLines, useOutsideMonthly } from '../OutsideMonthlyPanel'
import { ExpandableList } from './ExpandableList'

/**
 * The details of the other three cards (01-audit §7.5; AC-14). Every figure is the dashboard answer's own; an order
 * of objects is the server's figures sorted, never a figure worked out here.
 */

/** «Bu pul hara gedib?» — the month's money by kind, by category, and by object. */
export function AmountDetail({ summary, scope, selection }: {
  summary: ManagementDashboardSummary
  scope: AnalyticsScope
  selection: BasisSelection
}) {
  if (scope === 'OutsideMonthly') {
    return <OutsideMonthlyAmount period={summary.selectedPeriod.slice(0, 7)} />
  }

  const { monthly, outsideMonthly, unclassified, unclassifiedItemCount } = summary.lineTypes
  // Three lines and no total: the card above is the figure, and these say what the month was made of.
  const kinds = [
    { label: monthlyOrdersLabel, amount: monthly.knownAmount, active: scope === 'Monthly' },
    { label: outsideMonthlyOrdersLabel, amount: outsideMonthly.knownAmount, active: false },
    ...(unclassifiedItemCount > 0 || unclassified.knownAmount !== null
      ? [{ label: unclassifiedLineTypeShortLabel, amount: unclassified.knownAmount, active: false }]
      : []),
  ]

  const ordered = [
    ...summary.partition.compared,
    ...summary.partition.noBaseline,
    ...summary.partition.noHistory,
  ]
    .filter((member) => member.currentKnownAmount !== null)
    .sort((left, right) => right.currentKnownAmount! - left.currentKnownAmount!)

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section aria-label="Növ tərkibi">
        <h3 className="font-label-md text-label-md text-on-surface-variant">Növ tərkibi</h3>
        <dl className="mt-1 divide-y divide-outline-variant">
          {kinds.map((kind) => (
            <div key={kind.label} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <dt className={kind.active ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}>{kind.label}</dt>
              <dd className={`tabular whitespace-nowrap ${kind.active ? 'font-semibold text-on-surface' : 'text-on-surface'}`}>{formatMoney(kind.amount)}</dd>
            </div>
          ))}
        </dl>

        {summary.categories.length > 0 && (
          <>
            <h3 className="mt-4 font-label-md text-label-md text-on-surface-variant">Kateqoriyalar</h3>
            <dl className="mt-1 divide-y divide-outline-variant">
              {summary.categories.map((category) => (
                <div key={`${category.kind}-${category.categoryId ?? category.name}`} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                  <dt className="min-w-0 break-words text-on-surface">{category.name}</dt>
                  <dd className="tabular whitespace-nowrap text-on-surface">{formatMoney(category.knownAmount)}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>

      <section aria-label="Obyektlər bu ayın məbləğinə görə">
        <h3 className="font-label-md text-label-md text-on-surface-variant">
          Obyektlər bu ayın məbləğinə görə ({formatCount(ordered.length)})
        </h3>
        <MemberList members={ordered} selection={selection} label="Obyektlər" note={(member) => formatMoney(member.currentKnownAmount)} />
      </section>
    </div>
  )
}

function OutsideMonthlyAmount({ period }: { period: string }) {
  const answer = useOutsideMonthly(period)
  return <OutsideMonthlyLines answer={answer} />
}

/** «Nə ilə müqayisə edirik, ədalətlidirmi?» — the rule, its months, and who it was measured over. */
export function BaselineDetail({ summary, selection }: {
  summary: ManagementDashboardSummary
  selection: BasisSelection
}) {
  const months = formatMonthRange(summary.baselinePeriods)
  // Every compared object, so the list holds the number the sentence above says (D-4); one whose baseline is not a
  // known amount is listed last with the unknown mark, never dropped and never as zero.
  const compared = [...summary.partition.compared]
    .sort((left, right) => left.baselineKnownAmount === null
      ? (right.baselineKnownAmount === null ? 0 : 1)
      : right.baselineKnownAmount === null ? -1 : right.baselineKnownAmount - left.baselineKnownAmount)

  return (
    <div>
      <p className="text-sm text-on-surface">
        {describeBasisCaption(summary.basis, summary.baselinePeriods)}
        {months && <span className="text-on-surface-variant"> · {months}</span>}
      </p>
      <p className="mt-1 text-sm text-on-surface-variant">
        {formatCount(summary.partition.compared.length)} obyekt müqayisədədir.
        {summary.locationsWithPartialHistory > 0 && (
          <> {formatCount(summary.locationsWithPartialHistory)} obyekt üzrə: {limitedComparisonDataLabel.toLowerCase()}.</>
        )}
      </p>

      <section aria-label="Obyektlərin müqayisə dövrü məbləği" className="mt-4">
        <h3 className="font-label-md text-label-md text-on-surface-variant">Obyektlərin müqayisə dövrü məbləği</h3>
        <MemberList members={compared} selection={selection} label="Obyektlər" note={(member) => formatMoney(member.baselineKnownAmount)} />
      </section>
    </div>
  )
}

/** «Kim sifariş verməyib?» — every object of the company, in the group the month put it in, by name. */
export function LocationsDetail({ summary, selection }: {
  summary: ManagementDashboardSummary
  selection: BasisSelection
}) {
  const { partition } = summary
  const ordered = [...partition.compared, ...partition.noBaseline, ...partition.noHistory.filter((member) => member.currentKnownAmount !== null)]
  const notOrdered = partition.noOrderThisMonth
  const never = partition.noHistory.filter((member) => member.currentKnownAmount === null)

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section aria-label={portfolioGroupLabels.NoOrderThisMonth}>
        <h3 className="font-label-md text-label-md text-on-surface-variant">
          {portfolioGroupLabels.NoOrderThisMonth} ({formatCount(notOrdered.length)})
        </h3>
        {notOrdered.length === 0
          ? <EmptyState>Bütün obyektlər bu ay sifariş verib.</EmptyState>
          : <MemberList members={notOrdered} selection={selection} label={portfolioGroupLabels.NoOrderThisMonth} note={lastOrderNote} />}

        {never.length > 0 && (
          <>
            <h3 className="mt-4 font-label-md text-label-md text-on-surface-variant">
              {portfolioGroupLabels.NoHistory} ({formatCount(never.length)})
            </h3>
            <MemberList members={never} selection={selection} label={portfolioGroupLabels.NoHistory} note={() => null} />
          </>
        )}
      </section>

      <section aria-label="Bu ay sifariş verənlər">
        <h3 className="font-label-md text-label-md text-on-surface-variant">Bu ay sifariş verənlər ({formatCount(ordered.length)})</h3>
        <MemberList members={ordered} selection={selection} label="Bu ay sifariş verənlər" note={currentOnlyNote} />
      </section>
    </div>
  )
}

/** Objects by name, each its own link, with the one fact worth carrying beside it. */
function MemberList({ members, selection, label, note }: {
  members: readonly DashboardPartitionMember[]
  selection: BasisSelection
  label: string
  note: (member: DashboardPartitionMember) => string | null
}) {
  return (
    <ExpandableList
      items={members}
      keyOf={(member) => member.locationId}
      label={label}
      className="mt-1 divide-y divide-outline-variant"
      render={(member) => {
        const fact = note(member)
        return (
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 py-1.5 text-sm sm:min-h-0">
            <Link
              to={locationLink(member.locationId, selection)}
              className="inline-flex min-h-11 min-w-0 items-center break-words text-on-surface underline decoration-outline-variant underline-offset-2 hover:decoration-on-surface sm:inline sm:min-h-0"
            >
              {member.locationName}
            </Link>
            {fact && <span className="tabular whitespace-nowrap text-on-surface-variant">{fact}</span>}
          </div>
        )
      }}
    />
  )
}
