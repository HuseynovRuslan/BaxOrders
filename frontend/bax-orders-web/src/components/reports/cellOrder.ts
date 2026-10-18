import { useEffect, useState } from 'react'
import { ApiError } from '../../api/client'
import { fetchOrder, type OrderRequestDetail } from '../../api/orders'

/** As many lines a page as the order's own page shows (03 §3.3). */
export const cellOrderPageSize = 50

export type CellOrderState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; order: OrderRequestDetail }

export interface CellOrder {
  state: CellOrderState
  page: number
  /** The lines asked for: every line, the priced ones, or the ones without a price (03 §6.9.6). */
  hasPrice: boolean | undefined
  setPage: (page: number) => void
  setHasPrice: (hasPrice: boolean | undefined) => void
}

interface Asked {
  orderRequestId: number | null
  page: number
  hasPrice: boolean | undefined
}

/**
 * The order an open month is, with a page of its lines — asked once for the page, whichever layout shows the details
 * (`GET /api/v1/orders/{id}`, the existing endpoint and its existing filters; nothing is added up here). Another month
 * starts again at the first page of all its lines; a late answer for an abandoned question never lands.
 */
export function useCellOrder(orderRequestId: number | null): CellOrder {
  const [asked, setAsked] = useState<Asked>({ orderRequestId, page: 1, hasPrice: undefined })
  // An answer is kept with the question it answers: shown only while that is still the question.
  const [answer, setAnswer] = useState<{ key: string; state: CellOrderState } | null>(null)

  // Another month: its own first page, every line. Adjusted while rendering, so no answer for the old one is shown.
  const current = asked.orderRequestId === orderRequestId ? asked : { orderRequestId, page: 1, hasPrice: undefined }
  if (current !== asked) {
    setAsked(current)
  }

  const key = `${current.orderRequestId}|${current.page}|${current.hasPrice}`

  useEffect(() => {
    if (current.orderRequestId === null) {
      return
    }

    const controller = new AbortController()
    fetchOrder(
      current.orderRequestId,
      { page: current.page, pageSize: cellOrderPageSize, hasPrice: current.hasPrice },
      controller.signal,
    ).then(
      (order) => {
        if (!controller.signal.aborted) {
          setAnswer({ key, state: { status: 'success', order } })
        }
      },
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setAnswer({ key, state: { status: 'error', message: reason instanceof ApiError ? reason.message : 'Naməlum xəta' } })
        }
      },
    )

    return () => controller.abort()
  }, [key, current.orderRequestId, current.page, current.hasPrice])

  return {
    state: answer !== null && answer.key === key ? answer.state : { status: 'loading' },
    page: current.page,
    hasPrice: current.hasPrice,
    setPage: (page) => setAsked({ ...current, page }),
    setHasPrice: (hasPrice) => setAsked({ ...current, page: 1, hasPrice }),
  }
}
