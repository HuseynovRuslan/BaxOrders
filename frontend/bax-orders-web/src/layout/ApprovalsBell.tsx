import { Bell } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { usePendingApprovalCount } from './usePendingApprovalCount'

/**
 * The one thing in this product that is genuinely waiting for somebody.
 *
 * The approved design puts a bell with a red dot in this corner. This product has no notification centre, and a
 * bell that opened nothing would be the kind of control a reader learns to distrust — so the slot carries the
 * approval queue instead: a real count, a real destination, and a name that says which.
 *
 * The dot appears only when the queue is not empty, and it is never the only carrier: the link's accessible
 * name says how many orders are waiting.
 */
export function ApprovalsBell() {
  const { user } = useAuth()
  const pending = usePendingApprovalCount(user.canViewApprovals)

  if (!user.canViewApprovals) {
    return null
  }

  const waiting = pending !== null && pending > 0

  return (
    <Link
      to="/approvals"
      aria-label={waiting ? `${pending} sifariş təsdiq gözləyir` : 'Təsdiq gözləyən sifariş yoxdur'}
      title={waiting ? `${pending} sifariş təsdiq gözləyir` : 'Təsdiq gözləyən sifariş yoxdur'}
      className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
    >
      <Bell className="size-5" aria-hidden="true" />
      {waiting && (
        <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-red-500 ring-2 ring-slate-100" aria-hidden="true" />
      )}
    </Link>
  )
}
