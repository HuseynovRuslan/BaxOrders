import { useEffect } from 'react'
import { useLocation, useNavigate, type SetURLSearchParams } from 'react-router'
import type { DashboardView } from './dashboardView'
import {
  cleanDetailParams,
  detailObjectParamName,
  detailParam,
  detailParamName,
  readDetail,
  readDetailObject,
  type DashboardDetail,
} from './dashboardDetail'

/** Marks a history entry the page itself added by opening a card, so closing it can step back over it. */
interface DetailEntryState {
  dashboardDetail?: true
}

export interface DashboardDetailState {
  /** The open card, or null. Always null on «Ətraflı baxış» (S-4). */
  detail: DashboardDetail | null
  /** The object whose row is open in «Fərq», or null. */
  objectId: number | null
  /** Opens a card — and, for «Fərq», an object's row in it. */
  open: (detail: DashboardDetail, objectId?: number | null) => void
  /** The card's own click: opens it, or closes it when it is the one already open. */
  toggle: (detail: DashboardDetail) => void
  /** Opens or closes an object's row inside the open «Fərq». */
  selectObject: (objectId: number | null) => void
  close: () => void
}

/**
 * The open card in the address, with the history rules of 01-audit §7.7:
 *
 * - opening from nothing **pushes** an entry, so the browser's Back closes the detail rather than leaving the page;
 * - moving to another card, or to another object's row, **replaces** it — Back does not walk through every card;
 * - closing steps back over the entry the page added; on an entry somebody arrived at by a link it removes the
 *   detail in place instead, so closing never takes the reader off the page.
 */
export function useDashboardDetail(
  params: URLSearchParams,
  setParams: SetURLSearchParams,
  view: DashboardView,
): DashboardDetailState {
  const location = useLocation()
  const navigate = useNavigate()
  const ours = (location.state as DetailEntryState | null)?.dashboardDetail === true

  // A link that names something the page cannot open is put right where it is, without a new entry.
  useEffect(() => {
    const cleaned = cleanDetailParams(params, view)
    if (cleaned !== null) {
      setParams(cleaned, { replace: true, state: location.state })
    }
  }, [params, view, setParams, location.state])

  const detail = view === 'Simple' ? readDetail(params.get(detailParamName)) : null
  const objectId = detail === 'Difference' ? readDetailObject(params.get(detailObjectParamName)) : null

  function write(next: DashboardDetail | null, nextObject: number | null) {
    const changed = new URLSearchParams(params)
    if (next === null) {
      changed.delete(detailParamName)
    } else {
      changed.set(detailParamName, detailParam(next))
    }

    if (next === 'Difference' && nextObject !== null) {
      changed.set(detailObjectParamName, String(nextObject))
    } else {
      changed.delete(detailObjectParamName)
    }

    return changed
  }

  function open(next: DashboardDetail, nextObject: number | null = null) {
    if (detail === null) {
      const state: DetailEntryState = { ...(location.state as object | null ?? {}), dashboardDetail: true }
      setParams(write(next, nextObject), { state })
    } else {
      setParams(write(next, nextObject), { replace: true, state: location.state })
    }
  }

  function close() {
    if (detail === null) {
      return
    }

    if (ours) {
      navigate(-1)
    } else {
      setParams(write(null, null), { replace: true, state: location.state })
    }
  }

  return {
    detail,
    objectId,
    open,
    toggle: (next) => (next === detail ? close() : open(next)),
    selectObject: (next) => {
      if (detail === 'Difference') {
        setParams(write('Difference', next), { replace: true, state: location.state })
      }
    },
    close,
  }
}
