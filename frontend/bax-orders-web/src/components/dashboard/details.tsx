import { ArrowRight } from 'lucide-react'
import type { LocationDashboardRow } from '../../api/dashboard'
import { locationLink, orderLink, type BasisSelection } from '../../analytics/basisParams'
import { detailsLabel } from './labels'

/**
 * Where a card or a row opens: straight to the order this month's figures came from, which is the screen that
 * answers the next question. An object with no request this month has nothing to open, so it offers its own
 * history instead. The basis is carried either way, so the page the reader lands on answers about the same
 * comparison.
 */
export function detailsTarget(row: LocationDashboardRow, selection: BasisSelection): string {
  return row.currentRequestId === null
    ? locationLink(row.locationId, selection)
    : orderLink(row.currentRequestId, selection)
}

/** The name a screen reader hears for a card's or a row's one link: the object, and what following it does. */
export function detailsName(row: LocationDashboardRow): string {
  return `${row.locationName} · ${detailsLabel}`
}

/**
 * "Detallara bax →" at the foot of a card: not a link, only a sign that the card opens (20.1). The whole card is the
 * target and its one link is the object's name, so this is hidden from a screen reader, which already hears the
 * link's name, and it takes no focus.
 */
export function DetailsCue({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      // One line, always, as the link it replaces was: "Detallara bax" broken over two lines doubled a row's height.
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 font-medium text-slate-700 group-hover:border-slate-300 ${
        compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      }`}
    >
      {detailsLabel}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </span>
  )
}
