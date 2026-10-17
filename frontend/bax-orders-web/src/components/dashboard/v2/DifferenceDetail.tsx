import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { LocationDashboardRow, ManagementDashboardSummary } from '../../../api/dashboard'
import { locationLink, type BasisSelection } from '../../../analytics/basisParams'
import { currentOnlyNote, memberNote, portfolioGroupLabels } from '../../../coverage/labels'
import { DirectionWord } from '../../analytics/DirectionWord'
import { costDirectionTintClass, costDirectionToneClass, formatCount, formatMoney, formatMoneyDelta } from '../../analytics/format'
import { ErrorState, LoadingRows } from '../../EmptyState'
import { causeHeadline, noComparisonCause } from '../labels'
import { MissingPriceMark } from '../MissingPriceMark'
import { ObjectChangeBreakdown } from '../ObjectChangeBreakdown'
import { ExpandableList } from './ExpandableList'

/** The list «Fərq» and «Məbləğ dəyişiklikləri» both read: every compared object, largest change first. */
export type ChangesState =
  | { status: 'loading'; rows: LocationDashboardRow[] | null }
  | { status: 'error'; message: string; rows: LocationDashboardRow[] | null }
  | { status: 'success'; rows: LocationDashboardRow[] }

/**
 * Where the month's difference came from (01-audit §7.5, §7.6; AC-06).
 *
 * The difference on the card is the sum of the objects below — the server says so and checks it; nothing is added
 * up here. They are listed in the server's own order, by the size of their change whichever way it went, in the
 * groups a manager reads them in: whose cost rose, whose fell, whose did not move. A group says how many it holds
 * and no total of its own (S-3). Then the objects the comparison could not reach, by name.
 *
 * An object's row opens in place — one at a time, no drawer — onto the same breakdown «Ətraflı baxış» shows beside
 * its page, and from there to the order.
 */
export function DifferenceDetail({ summary, changes, objectId, onSelectObject, onRetry, selection }: {
  summary: ManagementDashboardSummary
  changes: ChangesState
  /** The object whose row is open. */
  objectId: number | null
  onSelectObject: (objectId: number | null) => void
  onRetry: () => void
  selection: BasisSelection
}) {
  const rows = changes.rows
  const rising = rows?.filter((row) => row.knownAmountDelta !== null && row.knownAmountDelta > 0) ?? []
  const falling = rows?.filter((row) => row.knownAmountDelta !== null && row.knownAmountDelta < 0) ?? []
  const still = rows?.filter((row) => row.knownAmountDelta === 0) ?? []
  // An unknown difference (nothing priced on a side) is not «unchanged»: unknown is never shown as zero (D-4).
  const unknown = rows?.filter((row) => row.knownAmountDelta === null) ?? []
  const compared = summary.partition.compared.length

  // The objects of this month the comparison could not reach: ordered now, but nothing to set them against.
  const noBaseline = summary.partition.noBaseline
  const firstOrders = summary.partition.noHistory.filter((member) => member.currentKnownAmount !== null)

  const group = (title: string, members: LocationDashboardRow[]) => members.length > 0 && (
    <section aria-label={title} className="mt-4 first:mt-0">
      <h3 className="font-label-md text-label-md text-on-surface-variant">{title} ({formatCount(members.length)})</h3>
      <ExpandableList
        items={members}
        keyOf={(row) => row.locationId}
        label={title}
        reveal={objectId === null ? -1 : members.findIndex((row) => row.locationId === objectId)}
        className="mt-1 divide-y divide-outline-variant border-y border-outline-variant"
        render={(row) => (
          <ObjectRow
            row={row}
            open={row.locationId === objectId}
            onToggle={() => onSelectObject(row.locationId === objectId ? null : row.locationId)}
            summary={summary}
            selection={selection}
          />
        )}
      />
    </section>
  )

  return (
    <div
      onKeyDown={(event) => {
        // The innermost open thing closes first: an open row before the whole detail (01-audit §7.7).
        if (event.key === 'Escape' && objectId !== null) {
          event.preventDefault()
          onSelectObject(null)
        }
      }}
    >
      <p className="text-sm text-on-surface">
        Fərq aşağıdakı {formatCount(compared)} obyektin fərqlərindən ibarətdir.
      </p>
      <p className="tabular mt-1 text-xs text-on-surface-variant">
        Müqayisə olunan obyektlər üzrə bu ay {formatMoney(summary.comparedCurrent.knownAmount)} · müqayisə dövrü {formatMoney(summary.baseline.knownAmount)}
      </p>

      <div className="mt-4">
        {changes.status === 'error' && (
          <div>
            <ErrorState message={changes.message} />
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 min-h-11 rounded-md border border-outline-variant px-4 text-sm font-medium hover:bg-surface-container-low sm:min-h-9"
            >
              Yenidən cəhd et
            </button>
          </div>
        )}
        {rows === null && changes.status === 'loading' && <LoadingRows label="Obyektlər yüklənir" />}
        {rows !== null && rows.length === 0 && (
          <p className="text-sm text-on-surface-variant">Bu ay müqayisə ediləcək obyekt yoxdur.</p>
        )}
        {group('Xərci artan obyektlər', rising)}
        {group('Xərci azalan obyektlər', falling)}
        {group('Dəyişməyən', still)}
        {group('Fərqi bilinməyən', unknown)}
      </div>

      {(noBaseline.length > 0 || firstOrders.length > 0) && (
        <section aria-label="Müqayisəyə daxil deyil" className="mt-5">
          <h3 className="font-label-md text-label-md text-on-surface-variant">
            Müqayisəyə daxil deyil ({formatCount(noBaseline.length + firstOrders.length)})
          </h3>
          <ul className="mt-1 space-y-1 text-sm">
            {noBaseline.map((member) => (
              <li key={member.locationId} className="flex min-h-11 flex-wrap items-center sm:block sm:min-h-0">
                <Link to={locationLink(member.locationId, selection)} className="inline-flex min-h-11 items-center text-on-surface underline decoration-outline-variant underline-offset-2 hover:decoration-on-surface sm:inline sm:min-h-0">
                  {member.locationName}
                </Link>
                <span className="text-on-surface-variant"> — {portfolioGroupLabels.NoBaseline.toLowerCase()}{noteOf('NoBaseline', member)}</span>
              </li>
            ))}
            {firstOrders.map((member) => (
              <li key={member.locationId} className="flex min-h-11 flex-wrap items-center sm:block sm:min-h-0">
                <Link to={locationLink(member.locationId, selection)} className="inline-flex min-h-11 items-center text-on-surface underline decoration-outline-variant underline-offset-2 hover:decoration-on-surface sm:inline sm:min-h-0">
                  {member.locationName}
                </Link>
                <span className="tabular text-on-surface-variant"> — ilk sifarişi bu aydır · {currentOnlyNote(member)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function noteOf(group: 'NoBaseline', member: Parameters<typeof memberNote>[1]): string {
  const note = memberNote(group, member)
  return note === null ? '' : ` · ${note}`
}

/**
 * One object: a button that opens its breakdown under it. The button is the whole row, at least 44 pixels high on a
 * touch screen; the figure carries the cost colour and says its direction in words.
 */
function ObjectRow({ row, open, onToggle, summary, selection }: {
  row: LocationDashboardRow
  open: boolean
  onToggle: () => void
  summary: ManagementDashboardSummary
  selection: BasisSelection
}) {
  const panelId = `ferq-obyekt-${row.locationId}`
  const button = useRef<HTMLButtonElement>(null)

  // Opened from «Ətraflı» or a link: the row comes into view, if it is not already. After the region has opened
  // (150 ms), because until then it is collapsed or still hidden and the row has no place on the screen yet.
  useEffect(() => {
    if (!open) {
      return
    }

    const timer = window.setTimeout(() => {
      const element = button.current
      // The reader lands where they asked to go (D-2); for a row they clicked, the focus is already here.
      element?.focus({ preventScroll: true })
      if (element && typeof element.scrollIntoView === 'function') {
        const top = element.getBoundingClientRect().top
        if (top < 0 || top > window.innerHeight * 0.8) {
          element.scrollIntoView({ block: 'center' })
        }
      }
    }, 220)
    return () => window.clearTimeout(timer)
  }, [open])

  const cause = row.primaryCause === null || row.primaryCauseAmount === null
    ? noComparisonCause
    : causeHeadline(row.primaryCause, row.primaryCauseAmount)

  return (
    <div id={`ferq-row-${row.locationId}`}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={`flex min-h-11 w-full flex-wrap items-center gap-x-3 gap-y-0.5 px-1 py-2 text-left hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:grid sm:grid-cols-[minmax(10rem,1fr)_auto_minmax(0,14rem)_auto] ${
          open ? 'bg-surface-container-low' : ''
        }`}
      >
        {/* At least 10rem — measured in rem, so a larger text claims more — and the figure wraps under it rather than
            squeezing the name to a letter a line (D-1, 200 % text on a phone). */}
        <span className="min-w-[min(100%,10rem)] flex-1 break-words text-sm font-semibold text-on-surface">
          {row.locationName}
          <MissingPriceMark count={row.current.missingPriceItemCount} explanationIsComplete={row.explanationIsComplete} />
        </span>
        <span className={`tabular justify-self-end whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${costDirectionTintClass(row.knownAmountDelta)} ${costDirectionToneClass(row.knownAmountDelta)}`}>
          {row.knownAmountDelta === null ? '—' : formatMoneyDelta(row.knownAmountDelta)}
          <DirectionWord value={row.knownAmountDelta} />
        </span>
        <span className="basis-full text-xs text-on-surface-variant sm:basis-auto">{cause}</span>
        <span aria-hidden="true" className="hidden text-on-surface-variant sm:block">
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>

      {open && (
        <div id={panelId} className="border-t border-outline-variant px-1 pb-4 pt-3">
          <ObjectChangeBreakdown row={row} basis={summary.basis} baselinePeriods={summary.baselinePeriods} selection={selection} touchLinks />
          <Link
            to={locationLink(row.locationId, selection)}
            className="ml-4 mt-1 inline-flex min-h-11 items-center text-sm font-medium text-on-surface underline decoration-outline-variant underline-offset-2 hover:decoration-on-surface sm:inline-block sm:min-h-0"
          >
            Obyektin səhifəsi
          </Link>
        </div>
      )}
    </div>
  )
}
