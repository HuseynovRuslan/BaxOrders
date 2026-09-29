import { Menu } from 'lucide-react'
import { fetchHealth } from '../api/health'
import { useApiResource } from '../hooks/useApiResource'
import { CurrentUserMenu } from './CurrentUserMenu'

interface HeaderProps {
  onMenuClick: () => void
}

/**
 * The utility bar: where you are, and who you are. Nothing else.
 *
 * The approved handoff also shows a ⌘K search field and a notification bell. Neither has anything behind it
 * in this product, and a control that looks live and does nothing is worse than no control — so they are not
 * drawn. When search and notifications exist, they belong here, in that order.
 */
export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-space-sm border-b border-outline-variant/60 bg-surface/80 px-space-md backdrop-blur-xl sm:gap-space-md sm:px-space-lg lg:px-space-xl">
      <button
        type="button"
        className="shrink-0 rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface lg:hidden"
        onClick={onMenuClick}
        aria-label="Menyunu aç"
      >
        <Menu className="size-5" />
      </button>

      {/* One line on every width: a smaller size lets the whole name fit a phone, and the ellipsis is only for a
          screen narrower still — never a second line. The title is the one thing in the bar that gives way. */}
      <p className="min-w-0 truncate font-label-md text-label-md text-on-surface sm:font-headline-sm sm:text-headline-sm">
        Material sifarişlərinin idarə edilməsi
      </p>

      <div className="ml-auto flex shrink-0 items-center gap-space-md">
        <ApiStatus />
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
      className="inline-flex items-center gap-space-sm rounded-full border border-error-container bg-error-container/50 px-space-md py-1 font-label-sm text-label-sm text-on-error-container"
      role="status"
    >
      <span className="size-2 rounded-full bg-error" aria-hidden="true" />
      Server əlçatan deyil
    </span>
  )
}
