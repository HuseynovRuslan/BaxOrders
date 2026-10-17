import type { DashboardView } from './dashboardView'

/**
 * Which of the four cards on «Sadə baxış» has its detail open under the cards, and — in «Fərq» — which object's
 * row is open in it (01-audit §7.7; AC-04).
 *
 * In the address like every other reading on the page, so Back closes the detail, a reload keeps it, and a pasted
 * link opens the same card on the same object. One card at a time: the address has room for one.
 */
export type DashboardDetail = 'Amount' | 'Baseline' | 'Difference' | 'Locations'

export const dashboardDetailOrder: readonly DashboardDetail[] = ['Amount', 'Baseline', 'Difference', 'Locations']

export const detailParamName = 'detal'
export const detailObjectParamName = 'obyekt'

/** What the address calls each card, so a link reads as something a person wrote (as `view=etrafli` does). */
const params: Record<DashboardDetail, string> = {
  Amount: 'mebleg',
  Baseline: 'baza',
  Difference: 'ferq',
  Locations: 'obyektler',
}

export function detailParam(detail: DashboardDetail): string {
  return params[detail]
}

export function readDetail(value: string | null): DashboardDetail | null {
  return dashboardDetailOrder.find((detail) => params[detail] === value) ?? null
}

/** An object's id as the address carries it: a whole number above zero, or nothing. */
export function readDetailObject(value: string | null): number | null {
  if (value === null || !/^[1-9]\d{0,9}$/.test(value)) {
    return null
  }

  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

/**
 * The address with anything the page cannot open taken out, or null when there is nothing to take out.
 *
 * A card name nobody wrote, an object without «Fərq» to open it in, or a detail on «Ətraflı baxış» — which keeps
 * its own composition (S-4) — is removed rather than left to puzzle the next reader of the link.
 */
export function cleanDetailParams(current: URLSearchParams, view: DashboardView): URLSearchParams | null {
  const detailValue = current.get(detailParamName)
  const objectValue = current.get(detailObjectParamName)
  if (detailValue === null && objectValue === null) {
    return null
  }

  const detail = view === 'Simple' ? readDetail(detailValue) : null
  const keepObject = detail === 'Difference' && readDetailObject(objectValue) !== null

  const next = new URLSearchParams(current)
  if (detail === null) {
    next.delete(detailParamName)
  }

  if (!keepObject) {
    next.delete(detailObjectParamName)
  }

  return next.toString() === current.toString() ? null : next
}
