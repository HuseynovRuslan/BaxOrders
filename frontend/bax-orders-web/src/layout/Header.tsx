import { Menu } from 'lucide-react'
import { fetchHealth } from '../api/health'
import { useApiResource } from '../hooks/useApiResource'
import { CurrentUserMenu } from './CurrentUserMenu'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        className="rounded p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
        onClick={onMenuClick}
        aria-label="Menyunu aç"
      >
        <Menu className="size-5" />
      </button>
      <p className="text-sm font-medium text-slate-700">Material sifarişlərinin idarə edilməsi</p>
      <div className="ml-auto flex items-center gap-4">
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
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
      role="status"
    >
      <span className="size-2 rounded-full bg-red-500" aria-hidden="true" />
      Server əlçatan deyil
    </span>
  )
}
