import { useRef } from 'react'
import { useLocation, useNavigate, type SetURLSearchParams } from 'react-router'
import { readReportCell, reportCellParam, reportCellParamName, sameReportCell, type ReportCellRef } from './reportCell'

/** Marks a history entry the page itself added by opening a month, so closing it can step back over it. */
interface CellEntryState {
  reportCell?: true
}

export interface ReportCellState {
  /** The month the address names, or null. Whether the answer on the screen has it is the page's question. */
  cell: ReportCellRef | null
  /**
   * Opens a month's details. `year` is written as well when the address names none: a link passed on later must not
   * open another year's month (03 §3.2).
   */
  open: (cell: ReportCellRef, year?: number) => void
  /** The month's own click: opens it, or closes it when it is the one already open. */
  toggle: (cell: ReportCellRef, year?: number) => void
  close: () => void
}

/**
 * The open month in the address, with the history rules of 03 §3.2 and §3.4 — the dashboard's rules for its cards
 * (`useDashboardDetail`):
 *
 * - opening from nothing **pushes** an entry, so the browser's Back closes the details rather than leaving the report;
 * - moving to another month, in the same row or another, **replaces** it — Back does not walk through every month;
 * - closing steps back over the entry the page added; on an entry somebody arrived at by a link or a reload it removes
 *   the key in place instead, so closing never takes the reader off the page.
 */
export function useReportCell(params: URLSearchParams, setParams: SetURLSearchParams): ReportCellState {
  const location = useLocation()
  const navigate = useNavigate()
  const ours = (location.state as CellEntryState | null)?.reportCell === true
  const cell = readReportCell(params.get(reportCellParamName))
  // One close per entry: a second Esc before Back has landed would step back off the report (03 §3.4 №2).
  const closing = useRef<string | null>(null)

  function write(next: ReportCellRef | null, year?: number) {
    const changed = new URLSearchParams(params)
    if (next === null) {
      changed.delete(reportCellParamName)
    } else {
      if (year !== undefined && !changed.has('year')) {
        changed.set('year', String(year))
      }
      changed.set(reportCellParamName, reportCellParam(next))
    }

    return changed
  }

  function open(next: ReportCellRef, year?: number) {
    if (cell === null) {
      const state: CellEntryState = { ...(location.state as object | null ?? {}), reportCell: true }
      setParams(write(next, year), { state })
    } else {
      setParams(write(next, year), { replace: true, state: location.state })
    }
  }

  function close() {
    if (cell === null || closing.current === location.key) {
      return
    }

    closing.current = location.key
    if (ours) {
      navigate(-1)
    } else {
      setParams(write(null), { replace: true, state: location.state })
    }
  }

  return {
    cell,
    open,
    toggle: (next, year) => (sameReportCell(next, cell) ? close() : open(next, year)),
    close,
  }
}
