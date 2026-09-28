import { Link } from 'react-router'
import type { DashboardAttention, ManagementDashboardSummary } from '../../api/dashboard'
import type { BasisSelection } from '../../analytics/basisParams'
import { DirectionWord } from '../analytics/DirectionWord'
import { costDirectionToneClass, describeBasisCaption, formatMoneyDelta } from '../analytics/format'
import { interactiveTextClass, surfaceLinkClass } from '../interaction'
import { causeHeadline, noComparisonCause } from './labels'
import { detailsName, detailsTarget } from './details'

/** Three is a reading order. A fourth turns it back into the list this replaces. */
const shown = 3

export const whatChangedTitle = 'Nə dəyişdi?'

/**
 * The three objects that moved the most money, in one line each.
 *
 * The detailed view's cards carry the whole story of every object worth reading — title, rank, both figures,
 * the coverage, the primary cause, its product and two more causes. A manager opening the screen wants none of
 * that yet; they want to know where the month went, and then to open one of them.
 *
 * So: direction, object, difference, reason, and a bar for the relative size. Nothing here is a new fact — each
 * line is its object's own row, and the cards, the table and the object's page all say the same thing. What is
 * missing from the line is one click away, and the section says so rather than implying these are the only
 * objects that moved.
 */
export function WhatChangedList({ attention, summary, selection, onOpenDetail }: {
  attention: DashboardAttention[]
  summary: ManagementDashboardSummary
  selection: BasisSelection
  /** Opens the full decomposition beside the page. Without it the object's name still opens its own page. */
  onOpenDetail?: (item: DashboardAttention) => void
}) {
  // Ranked by the money itself, so the order the reader sees is the order the figures are in. A percentage card
  // can be first in the cards below on a small baseline; here it competes on the same scale as everything else.
  const moved = attention
    .filter((item) => item.location.knownAmountDelta !== null)
    .sort((left, right) => Math.abs(right.location.knownAmountDelta!) - Math.abs(left.location.knownAmountDelta!))
    .slice(0, shown)

  if (moved.length === 0) {
    return null
  }

  const largest = Math.abs(moved[0].location.knownAmountDelta!)
  const outsideComparison = summary.locationCount - summary.locationsWithComparison

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white" aria-label={whatChangedTitle}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-slate-100 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-900">{whatChangedTitle}</h2>
        <p className="text-xs text-slate-500">{describeBasisCaption(summary.basis, summary.baselinePeriods)}</p>
      </div>

      <ul>
        {moved.map((item) => (
          <Row key={item.location.locationId} item={item} largest={largest} selection={selection} onOpenDetail={onOpenDetail} />
        ))}
      </ul>

      {/*
        Two facts the reader would otherwise have to take on trust: these three are not the only objects that
        moved, and the comparison above them is not over every object. The detailed view names which ones and
        why; here it is a count, because a count is enough to stop a wrong conclusion.
      */}
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        Bütün obyektlər aşağıdakı cədvəldədir.{outsideComparison > 0 && ` ${outsideComparison} obyekt müqayisəyə daxil deyil.`}
      </p>
    </section>
  )
}

function Row({ item, largest, selection, onOpenDetail }: {
  item: DashboardAttention
  largest: number
  selection: BasisSelection
  onOpenDetail?: (item: DashboardAttention) => void
}) {
  const row = item.location
  const delta = row.knownAmountDelta!
  const tone = costDirectionToneClass(delta)
  // Against the largest of the three, so the three bars are one scale and the first is always full.
  const share = largest === 0 ? 0 : Math.max(2, Math.round((Math.abs(delta) / largest) * 100))

  // The cause the object's own row already carries. Never recomputed here: the card, the table and the object's
  // page read the same decomposition, and a fourth wording of it would be a fourth chance to disagree.
  const reason = row.primaryCause === null || row.primaryCauseAmount === null
    ? noComparisonCause
    : causeHeadline(row.primaryCause, row.primaryCauseAmount)

  return (
    <li
      id={`changed-${row.locationId}`}
      className="flex items-center gap-3 border-b border-slate-50 px-4 py-2 last:border-b-0"
    >
      {/* The arrow is the first thing read and the colour is never alone in saying it. */}
      <span className={`w-3 shrink-0 text-center text-sm ${tone}`} aria-hidden="true">
        {delta > 0 ? '↑' : delta < 0 ? '↓' : '·'}
      </span>

      <span className="min-w-0 flex-1">
        <Link
          to={detailsTarget(row, selection)}
          aria-label={detailsName(row)}
          className={`block truncate text-sm font-medium text-slate-900 ${surfaceLinkClass} ${interactiveTextClass}`}
        >
          {row.locationName}
        </Link>
        <span className="block truncate text-xs text-slate-500">{reason}</span>
      </span>

      <span className="hidden h-1.5 w-20 shrink-0 rounded-full bg-slate-100 sm:block">
        <span
          className={`block h-1.5 rounded-full ${delta > 0 ? 'bg-rose-300' : 'bg-emerald-300'}`}
          style={{ width: `${share}%` }}
          data-share={share}
        />
      </span>

      <span className={`w-24 shrink-0 whitespace-nowrap text-right text-sm font-semibold sm:w-28 ${tone}`}>
        {formatMoneyDelta(delta)}
        <DirectionWord value={delta} />
      </span>

      {onOpenDetail && (
        <button
          type="button"
          onClick={() => onOpenDetail(item)}
          aria-label={`${row.locationName} — təfərrüat`}
          className="shrink-0 rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-700"
        >
          ⌄
        </button>
      )}
    </li>
  )
}
