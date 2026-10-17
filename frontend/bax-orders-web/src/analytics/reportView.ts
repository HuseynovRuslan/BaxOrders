/**
 * How much of each month the monthly report's grid says (owner decision D-50 №6, UI V2 03 §3.2).
 *
 * «Yığcam» — the amount and its marks — is what the report opens on; «Standart» adds the change against the month
 * before. Two depths of one table, as the dashboard has two depths of one screen: neither asks the server anything,
 * and the figures behind both are the same.
 */
export type ReportView = 'Compact' | 'Standard'

export const reportViewOrder: readonly ReportView[] = ['Compact', 'Standard']

export const reportViewLabels: Record<ReportView, string> = {
  Compact: 'Yığcam',
  Standard: 'Standart',
}

/** What the address calls the view that is not the default: in Azerbaijani and ASCII, as the dashboard's are. */
const standardParam = 'standart'

export function reportViewParam(view: ReportView): string | undefined {
  // The default travels as nothing at all: an ordinary link stays short.
  return view === 'Standard' ? standardParam : undefined
}

/** Anything the address says that is not a known view opens the default, as an unknown scope does. */
export function readReportView(value: string | null): ReportView {
  return value === standardParam ? 'Standard' : 'Compact'
}
