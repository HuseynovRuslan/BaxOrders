import type { AnalyticsComparisonBasis } from '../../api/analytics'
import type { LocationDashboardRow } from '../../api/dashboard'
import type { BasisSelection } from '../../analytics/basisParams'
import { describeBasisCaption } from '../analytics/format'
import { Drawer } from '../imports/review/Drawer'
import { ObjectChangeBreakdown } from './ObjectChangeBreakdown'

/**
 * One object's month, opened beside the page rather than instead of it — on «Ətraflı baxış», which keeps its own
 * composition (S-4). «Sadə baxış» opens the same breakdown in place, under its cards, and no longer uses this.
 *
 * The content is `ObjectChangeBreakdown`, shared with that view, so the two cannot drift apart.
 */
export function ChangeDetailDrawer({ row, basis, baselinePeriods, selection, onClose }: {
  row: LocationDashboardRow
  basis: AnalyticsComparisonBasis
  baselinePeriods: readonly string[]
  selection: BasisSelection
  onClose: () => void
}) {
  return (
    <Drawer title={row.locationName} subtitle={describeBasisCaption(basis, baselinePeriods)} onClose={onClose} dismissOnBackdrop>
      <ObjectChangeBreakdown row={row} basis={basis} baselinePeriods={baselinePeriods} selection={selection} />
    </Drawer>
  )
}
