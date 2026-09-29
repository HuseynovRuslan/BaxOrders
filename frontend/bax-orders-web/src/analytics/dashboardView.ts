/**
 * How much of the dashboard the reader wants.
 *
 * Not two dashboards: one screen with two depths. «Sadə baxış» answers the five questions a manager opens the
 * page with — what did the month cost, is that more or less, how much of the company is in it, what is planned
 * against what is not, and which objects moved. «Ətraflı baxış» keeps everything the screen has ever had, for
 * the reader who is now asking a sixth question.
 *
 * Nothing is deleted by the simple view. Complexity moves one level deeper, which is the whole point.
 */
export type DashboardView = 'Simple' | 'Detailed'

export const dashboardViewOrder: readonly DashboardView[] = ['Simple', 'Detailed']

export const dashboardViewLabels: Record<DashboardView, string> = {
  Simple: 'Sadə baxış',
  Detailed: 'Ətraflı baxış',
}

/**
 * The same two, for a toggle that has to sit beside three other controls on one row. The full label stays the
 * control's accessible name, so what a screen reader announces does not change with the width it is drawn at.
 */
export const dashboardViewShortLabels: Record<DashboardView, string> = {
  Simple: 'Sadə',
  Detailed: 'Ətraflı',
}

/** What the address calls it, so a link reads as something a person wrote. */
const params: Record<DashboardView, string> = { Simple: 'sade', Detailed: 'etrafli' }

export function viewParam(view: DashboardView): string | undefined {
  // The default travels as nothing at all: an ordinary link stays short.
  return view === 'Simple' ? undefined : params[view]
}

export function readView(value: string | null): DashboardView {
  return value === params.Detailed ? 'Detailed' : 'Simple'
}
