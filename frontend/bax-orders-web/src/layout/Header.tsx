import { Menu } from 'lucide-react'
import { fetchHealth } from '../api/health'
import { useApiResource } from '../hooks/useApiResource'
import { ApprovalsBell } from './ApprovalsBell'
import { CurrentUserMenu } from './CurrentUserMenu'

interface HeaderProps {
  onMenuClick: () => void
}

/**
 * The utility bar, as the approved design draws it: where you are on the left, who you are on the right.
 *
 * The design's bell is given the one thing in this product that is genuinely waiting for somebody — the
 * approval queue — rather than a notification centre that does not exist. It is a link, and it says in words
 * what its dot means.
 */
export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          onClick={onMenuClick}
          aria-label="Menyunu aç"
        >
          <Menu className="size-5" />
        </button>

        {/* One line each on every width: the organisation above, the product below. */}
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-xs font-medium leading-none text-slate-500">Bakı Abadlıq Xidməti</p>
          <p className="truncate text-base font-bold leading-none text-slate-900">Sifariş sistemi</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-6">
        <ApiStatus />
        <ApprovalsBell />
        <CurrentUserMenu />
      </div>
    </header>
  )
}

/**
 * Said only when the server cannot be reached. A badge that reads "working" on every page is one a reader learns
 * to skip, and then skips on the day it says something else — so while checking and while healthy it says
 * nothing at all.
 */
export function ApiStatus() {
  const health = useApiResource(fetchHealth)

  if (health.status !== 'error') {
    return null
  }

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700"
      role="status"
    >
      <span className="size-2 rounded-full bg-red-500" aria-hidden="true" />
      Server əlçatan deyil
    </span>
  )
}
