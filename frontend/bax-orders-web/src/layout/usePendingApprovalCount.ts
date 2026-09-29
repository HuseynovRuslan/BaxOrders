import { useEffect, useState } from 'react'
import { fetchApprovalInbox } from '../api/approvals'

/**
 * How many orders are waiting for a decision, for the badge beside «Təsdiq gözləyənlər».
 *
 * The queue's own summary describes the whole queue whatever the paging, so one row is asked for and the
 * figure read off the summary beside it. Null while it is unknown — and null, not zero, if the request
 * fails: a badge is a convenience, and a navigation that breaks because a count could not be fetched would
 * be a worse product than one that quietly shows no badge.
 *
 * @param enabled false where the reader may not see the queue at all, so nothing is requested.
 */
export function usePendingApprovalCount(enabled: boolean): number | null {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      setCount(null)
      return
    }

    const controller = new AbortController()
    fetchApprovalInbox({ page: 1, pageSize: 1 }, controller.signal)
      .then((inbox) => setCount(inbox.summary.pendingCount))
      .catch(() => {
        // Deliberately silent: the queue itself reports its own failures on its own page.
      })

    return () => controller.abort()
  }, [enabled])

  return count
}
